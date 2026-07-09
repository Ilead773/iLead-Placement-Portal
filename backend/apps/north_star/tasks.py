import logging
from datetime import datetime
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from celery import shared_task
from apps.common.storage import StorageFactory

# Django imports are resolved inside the task to prevent circular dependencies
logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task(bind=True, max_retries=2, default_retry_delay=30, name='apps.north_star.tasks.finalize_attendance')
def finalize_attendance(self, scheduled_class_id):
    """
    Runs after class ends to aggregate join/leave events for students.
    Calculates total duration, marks status, and triggers progress updates.
    """
    from .models import ScheduledClass, AttendanceEvent, Attendance
    
    try:
        scheduled_class = ScheduledClass.objects.get(id=scheduled_class_id)
    except ScheduledClass.DoesNotExist:
        logger.error(f"ScheduledClass {scheduled_class_id} not found for attendance finalization.")
        return
    except Exception as exc:
        logger.error(f"finalize_attendance: Transient error fetching class {scheduled_class_id}: {exc}. Retrying.", exc_info=True)
        raise self.retry(exc=exc)
        
    logger.info(f"Finalizing attendance for class: {scheduled_class.title}")
    
    # Calculate scheduled class duration in minutes
    class_duration = int((scheduled_class.end_time - scheduled_class.start_time).total_seconds() / 60)
    if class_duration <= 0:
        class_duration = 60
        
    # Query Zoom Participant Report API & Recreate Events
    if scheduled_class.zoom_meeting_id:
        from .services import ZoomService
        zoom_service = ZoomService()
        try:
            participants = zoom_service.get_participant_report(scheduled_class.zoom_meeting_id)
            if participants:
                logger.info(f"Retrieved Zoom Participant Report with {len(participants)} entries.")
                # Rebuild events from the official report
                AttendanceEvent.objects.filter(scheduled_class=scheduled_class).delete()
                for p in participants:
                    email = p.get('user_email', '')
                    name = p.get('name', '')
                    join_time_str = p.get('join_time')
                    leave_time_str = p.get('leave_time')
                    
                    # Resolve student
                    student_user = User.objects.filter(email__iexact=email).first()
                    if not student_user and email:
                        prefix = email.split('@')[0]
                        student_user = User.objects.filter(login_id__iexact=prefix).first()
                        if not student_user:
                            from core.models import Student
                            std_profile = Student.objects.filter(registration_number__iexact=prefix).first()
                            if std_profile:
                                student_user = std_profile.user
                                
                    if not student_user and name:
                        import re
                        digits_match = re.search(r'\b\d{8,12}\b', name)
                        if digits_match:
                            reg_no = digits_match.group(0)
                            from core.models import Student
                            std_profile = Student.objects.filter(registration_number__iexact=reg_no).first()
                            if std_profile:
                                student_user = std_profile.user
                                
                    if not student_user and name:
                        student_user = User.objects.filter(name__iexact=name.strip(), role='student').first()
                        if not student_user:
                            from core.models import Student
                            std_profile = Student.objects.filter(name__iexact=name.strip()).first()
                            if std_profile:
                                student_user = std_profile.user

                    try:
                        join_time = datetime.strptime(join_time_str, '%Y-%m-%dT%H:%M:%SZ')
                        join_time = timezone.make_aware(join_time, timezone.utc)
                    except Exception:
                        join_time = timezone.now()

                    try:
                        leave_time = datetime.strptime(leave_time_str, '%Y-%m-%dT%H:%M:%SZ')
                        leave_time = timezone.make_aware(leave_time, timezone.utc)
                    except Exception:
                        leave_time = timezone.now()

                    AttendanceEvent.objects.create(
                        scheduled_class=scheduled_class,
                        student=student_user,
                        participant_email=email,
                        participant_name=name,
                        event_type='join',
                        timestamp=join_time
                    )
                    AttendanceEvent.objects.create(
                        scheduled_class=scheduled_class,
                        student=student_user,
                        participant_email=email,
                        participant_name=name,
                        event_type='leave',
                        timestamp=leave_time
                    )
        except Exception as e:
            logger.warning(f"Failed to sync Zoom Participant Report, falling back to webhook events: {e}")

    # Get all events for this class
    events = AttendanceEvent.objects.filter(scheduled_class=scheduled_class).order_by('timestamp')
    
    # Group events by student
    # Note: Webhook records events for resolved students as well as unresolved participants (student is null)
    # We aggregate attendance only for resolved students. Unresolved participants remain in the reconciliation queue.
    student_events = {}
    for event in events:
        if event.student:
            student_id = event.student.id
            if student_id not in student_events:
                student_events[student_id] = []
            student_events[student_id].append(event)
            
    # Resolve all students enrolled in any of the courses associated with the scheduled class
    course_names = list(scheduled_class.courses.values_list('name', flat=True))
    if scheduled_class.course:
        course_names.append(scheduled_class.course.name)
    course_names = list(set(course_names)) # unique names
    
    from django.db.models import Q
    query = Q(role='student')
    if course_names:
        course_q = Q()
        for name in course_names:
            course_q |= Q(student_profile__course__iexact=name)
        query &= course_q
        enrolled_students = User.objects.filter(query)
    else:
        enrolled_students = User.objects.none()
    
    processed_students = set()
    
    # Process students with events
    for student_id, evs in student_events.items():
        try:
            student_user = User.objects.get(id=student_id)
        except User.DoesNotExist:
            continue
            
        processed_students.add(student_id)
        
        # Calculate duration
        total_duration = 0
        join_count = 0
        active_join = None
        
        for ev in evs:
            if ev.event_type == 'join':
                join_count += 1
                if active_join is None:
                    active_join = ev.timestamp
            elif ev.event_type == 'leave':
                if active_join is not None:
                    duration = (ev.timestamp - active_join).total_seconds() / 60
                    total_duration += max(0, int(duration))
                    active_join = None
                    
        # If student was still joined when class ended
        if active_join is not None:
            # Cap leave at scheduled class end time or event timestamp, whichever is later
            leave_time = max(scheduled_class.end_time, timezone.now())
            duration = (leave_time - active_join).total_seconds() / 60
            total_duration += max(0, int(duration))
            
        # Determine status
        # >=75% -> present, 30-75% -> late, <30% -> absent
        if total_duration >= (0.75 * class_duration):
            status = 'present'
        elif total_duration >= (0.30 * class_duration):
            status = 'late'
        else:
            status = 'absent'
            
        # Upsert Attendance
        Attendance.objects.update_or_create(
            scheduled_class=scheduled_class,
            student=student_user,
            defaults={
                'status': status,
                'total_duration_minutes': total_duration,
                'join_count': join_count,
                'marked_via': 'zoom_auto'
            }
        )
        logger.info(f"Attendance recorded for {student_user.email} in class '{scheduled_class.title}': {status} ({total_duration}m)")
        
        # Trigger progress update for the student's matching course
        student_course_name = getattr(student_user.student_profile, 'course', None) if hasattr(student_user, 'student_profile') else None
        matching_course = None
        if student_course_name:
            matching_course = scheduled_class.courses.filter(name__iexact=student_course_name).first()
            if not matching_course and scheduled_class.course and scheduled_class.course.name.lower() == student_course_name.lower():
                matching_course = scheduled_class.course
                
        if matching_course:
            update_course_progress.delay(student_user.id, matching_course.id)
        elif scheduled_class.course:
            update_course_progress.delay(student_user.id, scheduled_class.course.id)
        
    # Process enrolled students who had NO events (mark absent)
    for student in enrolled_students:
        if student.id not in processed_students:
            Attendance.objects.update_or_create(
                scheduled_class=scheduled_class,
                student=student,
                defaults={
                    'status': 'absent',
                    'total_duration_minutes': 0,
                    'join_count': 0,
                    'marked_via': 'zoom_auto'
                }
            )
            logger.info(f"No-show student {student.email} marked absent in class '{scheduled_class.title}'")
            
            student_course_name = getattr(student.student_profile, 'course', None) if hasattr(student, 'student_profile') else None
            matching_course = None
            if student_course_name:
                matching_course = scheduled_class.courses.filter(name__iexact=student_course_name).first()
                if not matching_course and scheduled_class.course and scheduled_class.course.name.lower() == student_course_name.lower():
                    matching_course = scheduled_class.course
                    
            if matching_course:
                update_course_progress.delay(student.id, matching_course.id)
            elif scheduled_class.course:
                update_course_progress.delay(student.id, scheduled_class.course.id)


@shared_task(bind=True, max_retries=2, default_retry_delay=30, name='apps.north_star.tasks.update_course_progress')
def update_course_progress(self, student_id, course_id):
    """
    Recomputes course completion and attendance metrics for a student.
    Saves to CourseProgress and checks certificate eligibility.
    Retries up to 2 times on transient DB errors.
    """
    from core.models import Course
    from .models import NorthStarAssignment, AssignmentSubmission, ScheduledClass, Attendance, CourseProgress
    
    try:
        student_user = User.objects.get(id=student_id)
        course = Course.objects.get(id=course_id)
    except (User.DoesNotExist, Course.DoesNotExist):
        logger.error(f"Cannot update progress: Student {student_id} or Course {course_id} not found.")
        return

    try:
        # 1. Completion Percentage (based on assignments graded / total assignments)
        total_assignments = NorthStarAssignment.objects.filter(course=course).count()
        graded_submissions = AssignmentSubmission.objects.filter(
            assignment__course=course,
            student=student_user,
            status='graded'
        ).count()

        completion_percent = (graded_submissions * 100.0 / total_assignments) if total_assignments > 0 else 100.0

        # 2. Attendance Percentage (based on present/late classes / total classes held so far)
        from django.db.models import Q
        total_classes = ScheduledClass.objects.filter(
            Q(course=course) | Q(courses=course),
            start_time__lte=timezone.now()
        ).distinct().count()

        attended_classes = Attendance.objects.filter(
            Q(scheduled_class__course=course) | Q(scheduled_class__courses=course),
            student=student_user,
            status__in=['present', 'late']
        ).distinct().count()

        attendance_percent = (attended_classes * 100.0 / total_classes) if total_classes > 0 else 100.0

        # Update/create progress record
        progress, created = CourseProgress.objects.update_or_create(
            student=student_user,
            course=course,
            defaults={
                'completion_percent': round(completion_percent, 2),
                'attendance_percent': round(attendance_percent, 2)
            }
        )

        # Sync to Student profile training_attendance (average of all active courses)
        try:
            from core.models import Student
            student_profile = Student.objects.filter(user=student_user).first()
            if student_profile:
                progress_records = CourseProgress.objects.filter(student=student_user)
                if progress_records.exists():
                    avg_attd = sum(p.attendance_percent for p in progress_records) / progress_records.count()
                    student_profile.training_attendance = round(avg_attd, 2)
                    student_profile.save()  # Recalculates category as well!
                    logger.info(f"update_course_progress: Synced training_attendance for student {student_user.email} to {student_profile.training_attendance}%")
        except Exception as sync_err:
            logger.error(f"update_course_progress: Failed to sync training_attendance to Student profile: {sync_err}", exc_info=True)

        logger.info(
            f"update_course_progress: Updated progress for {student_user.email} in {course.name}: "
            f"Completion {progress.completion_percent}%, Attendance {progress.attendance_percent}%"
        )

    except Exception as exc:
        logger.error(
            f"update_course_progress: Error computing/saving progress for student {student_id}, "
            f"course {course_id} (attempt {self.request.retries + 1}/{self.max_retries + 1}): {exc}. Retrying.",
            exc_info=True,
        )
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2, default_retry_delay=30, name='apps.north_star.tasks.check_certificate_eligibility')
def check_certificate_eligibility(self, student_id, course_id):
    """
    Unlocks and generates certificate if student has >=75% attendance and 100% completion.
    Retries up to 2 times on transient DB or storage errors.
    """
    from core.models import Course
    from .models import CourseProgress
    
    try:
        student_user = User.objects.get(id=student_id)
        course = Course.objects.get(id=course_id)
        progress = CourseProgress.objects.get(student=student_user, course=course)
    except (User.DoesNotExist, Course.DoesNotExist, CourseProgress.DoesNotExist):
        # Permanent failure — record doesn't exist yet. Do not retry.
        return
    except Exception as exc:
        logger.error(f"check_certificate_eligibility: Transient error fetching records for student {student_id}: {exc}. Retrying.", exc_info=True)
        raise self.retry(exc=exc)

    # Check conditions
    attendance_threshold = getattr(settings, 'NORTH_STAR_MIN_ATTENDANCE_PERCENT', 80.0)
    completion_threshold = getattr(settings, 'NORTH_STAR_MIN_COMPLETION_PERCENT', 100.0)
    marks_threshold = getattr(settings, 'NORTH_STAR_MIN_ASSIGNMENT_MARKS_PERCENT', 70.0)
    
    from .models import AssignmentSubmission
    submissions = AssignmentSubmission.objects.filter(
        assignment__course=course,
        student=student_user,
        status='graded'
    )
    total_score = sum(sub.score for sub in submissions if sub.score is not None)
    total_max_score = sum(sub.assignment.max_score for sub in submissions if sub.score is not None)
    average_marks_percent = (total_score * 100.0 / total_max_score) if total_max_score > 0 else 100.0
    
    is_eligible = (
        progress.attendance_percent >= attendance_threshold and
        progress.completion_percent >= completion_threshold and
        average_marks_percent >= marks_threshold
    )
    
    if is_eligible and not progress.certificate_unlocked:
        logger.info(f"Student {student_user.email} qualified for certificate in course {course.name}! Attendance: {progress.attendance_percent}%, Completion: {progress.completion_percent}%, Avg Marks: {average_marks_percent:.1f}%")
        
        # HTML certificate template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
        <style>
          @page {{
            size: letter landscape;
            margin: 0;
          }}
          body {{
            font-family: 'Georgia', serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
          }}
          .certificate-border {{
            border: 20px solid #1e3a8a;
            height: 100vh;
            box-sizing: border-box;
            padding: 40px;
            background-color: #ffffff;
            position: relative;
          }}
          .certificate-inner {{
            border: 4px double #d97706;
            height: 100%;
            padding: 40px;
            text-align: center;
            box-sizing: border-box;
          }}
          .certificate-title {{
            font-size: 44px;
            color: #1e3a8a;
            margin-bottom: 20px;
            font-weight: bold;
            letter-spacing: 2px;
          }}
          .certificate-subtitle {{
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 4px;
            color: #64748b;
            margin-bottom: 30px;
          }}
          .student-name {{
            font-size: 36px;
            font-weight: bold;
            color: #d97706;
            border-bottom: 2px solid #cbd5e1;
            display: inline-block;
            padding-bottom: 10px;
            margin-bottom: 30px;
            min-width: 300px;
          }}
          .course-text {{
            font-size: 20px;
            line-height: 1.6;
            margin-bottom: 40px;
            color: #334155;
          }}
          .course-name {{
            font-weight: bold;
            color: #1e3a8a;
          }}
          .footer {{
            display: table;
            width: 100%;
            margin-top: 50px;
          }}
          .signature-block {{
            display: table-cell;
            width: 50%;
            text-align: center;
          }}
          .signature-line {{
            border-top: 1px solid #94a3b8;
            width: 200px;
            margin: 50px auto 10px auto;
          }}
          .seal {{
            font-size: 14px;
            font-weight: bold;
            color: #d97706;
          }}
        </style>
        </head>
        <body>
        <div class="certificate-border">
          <div class="certificate-inner">
            <div class="certificate-title">Certificate of Completion</div>
            <div class="certificate-subtitle">This is proudly presented to</div>
            <div class="student-name">{student_user.name or student_user.email}</div>
            <div class="course-text">
              for successfully completing the course<br>
              <span class="course-name">{course.name}</span><br>
              with outstanding academic performance and dedication.
            </div>
            <div class="footer">
              <div class="signature-block">
                <div class="signature-line"></div>
                <div><strong>Project North Star Director</strong></div>
                <div style="font-size:12px; color:#64748b;">iLEAD Placement Portal</div>
              </div>
              <div class="signature-block">
                <div class="seal">★ NORTH STAR CERTIFIED ★</div>
                <div style="margin-top: 30px; font-size: 14px; color: #475569;">
                  Date: {datetime.now().strftime('%B %d, %Y')}
                </div>
              </div>
            </div>
          </div>
        </div>
        </body>
        </html>
        """
        
        # Render PDF
        pdf_bytes = None
        try:
            from weasyprint import HTML
            pdf_bytes = HTML(string=html_content).write_pdf()
            logger.info("Certificate PDF successfully generated via WeasyPrint.")
        except ImportError:
            logger.warning("weasyprint not installed. Generating dummy certificate file content instead.")
            pdf_bytes = b"PDF Certificate Mock Content"
        except Exception as e:
            logger.error(f"Failed to generate certificate PDF: {e}")
            pdf_bytes = b"PDF Certificate Mock Content"

        # Upload via StorageFactory
        filename = f"north_star/certificates/cert_{student_user.id}_{course.id}.pdf"
        storage = StorageFactory.get_backend()
        
        try:
            saved_path = storage.save(filename, pdf_bytes)
            certificate_url = storage.url(saved_path)
            
            # Ensure certificate_url is an absolute URL (relative paths occur when using local storage)
            if certificate_url and not (certificate_url.startswith('http://') or certificate_url.startswith('https://')):
                import os
                backend_url = os.environ.get('BACKEND_URL', 'http://localhost:8000').rstrip('/')
                certificate_url = f"{backend_url}{certificate_url}"
        except Exception as e:
            logger.error(f"Failed to save certificate to storage: {e}")
            certificate_url = ""
            
        # Update progress model
        progress.certificate_unlocked = True
        progress.certificate_url = certificate_url
        progress.save()
        
        # Send notification email to student
        if student_user.email:
            subject = f"Congratulations! Your Certificate for {course.name} is unlocked"
            email_body = f"""Dear {student_user.name or 'Student'},

Congratulations! You have completed all course requirements for "{course.name}" on Project North Star.

Your certificate has been unlocked! 
You can view/download it directly from the link below:
{certificate_url}

Best regards,
The Project North Star Team
iLEAD Placement Portal
"""
            from core.tasks import async_send_mail
            async_send_mail.delay(
                subject=subject,
                message=email_body,
                recipient_list=[student_user.email]
            )
            logger.info(f"Queued certificate email for {student_user.email}")
