import os
import hmac
import hashlib
import json
import logging
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdminOrCoordinator, IsStudentUser, IsAdminOnly
from core.tasks import async_send_mail
from core.models import Course
from .models import (
    ScheduledClass,
    AttendanceEvent,
    Attendance,
    NorthStarAssignment,
    AssignmentSubmission,
    CourseProgress
)
from .serializers import (
    NorthStarCourseSerializer,
    ScheduledClassSerializer,
    AttendanceEventSerializer,
    AttendanceSerializer,
    NorthStarAssignmentSerializer,
    AssignmentSubmissionSerializer,
    AssignmentGradeSerializer,
    CourseProgressSerializer
)
from .services import ZoomService
from .tasks import finalize_attendance, update_course_progress

logger = logging.getLogger(__name__)
User = get_user_model()

# ==============================================================================
# PHASE 2: ZOOM WEBHOOK RECEIVER
# ==============================================================================

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def zoom_webhook(request):
    """
    Exempt from CSRF/auth. Validates signature and logs join/leave attendance events.
    Handles Zoom URL validation validation handshake.
    """
    zoom_service = ZoomService()

    # ── Cache raw body BEFORE request.data is accessed ──────────────────────
    # DRF reads from the input stream when request.data is first accessed,
    # which marks the stream as consumed. Django then refuses any subsequent
    # access to request.body with RawPostDataException. Reading the underlying
    # Django request's body here caches it in request._request._body so it
    # remains available for HMAC verification later.
    try:
        raw_body = request._request.body  # bytes; safe to call multiple times after this
    except Exception:
        raw_body = b''

    # 1. URL validation handshake (doesn't have standard headers sometimes)
    event_type = request.data.get('event')
    if event_type == 'endpoint.url_validation':
        plain_token = request.data.get('payload', {}).get('plainToken', '')
        webhook_secret = os.environ.get('ZOOM_WEBHOOK_SECRET_TOKEN', '')
        if not webhook_secret:
            logger.error("ZOOM_WEBHOOK_SECRET_TOKEN not set, cannot validate URL validation handshake.")
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        encrypted_token = hmac.new(
            webhook_secret.encode('utf-8'),
            plain_token.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return Response({
            "plainToken": plain_token,
            "encryptedToken": encrypted_token
        }, status=status.HTTP_200_OK)
        
    # 2. Verify webhook signature for event notifications (pass pre-read bytes)
    if not zoom_service.verify_webhook_signature(request, raw_body):
        logger.warning("Zoom webhook signature verification failed.")
        return Response({"detail": "Invalid signature"}, status=status.HTTP_401_UNAUTHORIZED)
    # 3. Handle meeting ended or participant joined/left
    payload = request.data.get('payload', {})
    obj = payload.get('object', {})
    meeting_id = str(obj.get('id'))

    if event_type == 'meeting.ended':
        scheduled_class = ScheduledClass.objects.filter(zoom_meeting_id=meeting_id).first()
        if scheduled_class:
            scheduled_class.end_time = timezone.now()
            scheduled_class.save()
            logger.info(f"Class {scheduled_class.title} ended early via Zoom webhook. Triggering finalization.")
            finalize_attendance.apply_async(args=[scheduled_class.id], countdown=5)
            return Response({"detail": "Meeting ended processed successfully"}, status=status.HTTP_200_OK)
        return Response({"detail": "Meeting not found"}, status=status.HTTP_404_NOT_FOUND)

    participant = obj.get('participant', {})
    email = participant.get('email', '')
    name = participant.get('user_name', '')
    
    if event_type in ['meeting.participant_joined', 'meeting.participant_left']:
        event_name = 'join' if event_type == 'meeting.participant_joined' else 'leave'
        time_str = participant.get('join_time' if event_name == 'join' else 'leave_time')
        
        try:
            timestamp = timezone.now()
            if time_str:
                from datetime import timezone as dt_timezone
                # Parse Zoom ISO-8601 timestamp (e.g. "2026-06-13T12:00:00Z")
                timestamp = datetime.strptime(time_str, '%Y-%m-%dT%H:%M:%SZ')
                timestamp = timezone.make_aware(timestamp, dt_timezone.utc)
        except Exception as e:
            logger.error(f"Failed to parse participant event timestamp: {e}")
            timestamp = timezone.now()

        # Find ScheduledClass
        scheduled_class = ScheduledClass.objects.filter(zoom_meeting_id=meeting_id).first()
        if not scheduled_class:
            logger.warning(f"Zoom webhook received for untracked meeting ID: {meeting_id}")
            return Response({"detail": "Meeting not found"}, status=status.HTTP_404_NOT_FOUND)
            
        # Try to resolve Student
        student_user = User.objects.filter(email__iexact=email).first()

        # Fallback 1: Resolve by email prefix (e.g. registration_number@student.ilead.edu -> registration_number)
        if not student_user and email:
            prefix = email.split('@')[0]
            student_user = User.objects.filter(login_id__iexact=prefix).first()
            if not student_user:
                from core.models import Student
                std_profile = Student.objects.filter(registration_number__iexact=prefix).first()
                if std_profile:
                    student_user = std_profile.user

        # Fallback 2: Check if participant name contains a registration number (e.g. "Jane Smith 28941623072")
        if not student_user and name:
            import re
            digits_match = re.search(r'\b\d{8,12}\b', name)
            if digits_match:
                reg_no = digits_match.group(0)
                from core.models import Student
                std_profile = Student.objects.filter(registration_number__iexact=reg_no).first()
                if std_profile:
                    student_user = std_profile.user

        # Fallback 3: Resolve by student name exact match
        if not student_user and name:
            student_user = User.objects.filter(name__iexact=name.strip(), role='student').first()
            if not student_user:
                from core.models import Student
                std_profile = Student.objects.filter(name__iexact=name.strip()).first()
                if std_profile:
                    student_user = std_profile.user

        
        # Log event
        event = AttendanceEvent.objects.create(
            scheduled_class=scheduled_class,
            student=student_user,
            participant_email=email,
            participant_name=name,
            event_type=event_name,
            timestamp=timestamp,
            raw_payload=request.data
        )
        logger.info(f"Logged AttendanceEvent: {event_name} for {email} in class '{scheduled_class.title}'")
        return Response(status=status.HTTP_201_CREATED)
        
    return Response({"detail": "Event not handled"}, status=status.HTTP_200_OK)

# ==============================================================================
# PHASE 3: ViewSets & View APIs
# ==============================================================================

class NorthStarCourseViewSet(viewsets.ModelViewSet):
    """
    List, retrieve, create, update, delete courses.
    Admin/coordinators write, all authenticated users read.
    """
    queryset = Course.objects.all()
    serializer_class = NorthStarCourseSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminOrCoordinator()]

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrCoordinator])
    def release_certificates(self, request, pk=None):
        """
        POST /courses/{id}/release_certificates/ -> Triggers certificate check for all students in this course
        """
        course = self.get_object()
        from .tasks import check_certificate_eligibility
        
        students = User.objects.filter(
            role='student',
            student_profile__course__iexact=course.name
        )
        
        for student in students:
            check_certificate_eligibility.delay(student.id, course.id)
            
        return Response({
            "detail": f"Certificate generation triggered for {students.count()} students in {course.name}."
        }, status=status.HTTP_202_ACCEPTED)

class ScheduledClassViewSet(viewsets.ModelViewSet):
    """
    Manage scheduled classes.
    """
    queryset = ScheduledClass.objects.all().order_by('-start_time')
    serializer_class = ScheduledClassSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'join']:
            return [IsAuthenticated()]
        return [IsAdminOrCoordinator()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            student_profile = getattr(user, 'student_profile', None)
            student_course = student_profile.course.strip() if (student_profile and student_profile.course) else ""
            # Filter classes by matching course name (case-insensitive)
            from django.db.models import Q
            return self.queryset.filter(
                Q(course__name__iexact=student_course) |
                Q(courses__name__iexact=student_course)
            ).distinct()
        return self.queryset

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        zoom_service = ZoomService()
        title = serializer.validated_data.get('title')
        start_time = serializer.validated_data.get('start_time')
        end_time = serializer.validated_data.get('end_time')
        duration = int((end_time - start_time).total_seconds() / 60)
        
        try:
            meeting_details = zoom_service.create_meeting(
                topic=title,
                start_time=start_time,
                duration_minutes=duration,
                host_email=self.request.user.email
            )
        except Exception as e:
            logger.error(f"Failed to create Zoom meeting, class scheduled without meeting: {e}")
            raise ValidationError({"detail": f"Zoom Integration Error: {e}"})

        scheduled_class = serializer.save(
            host=self.request.user,
            zoom_meeting_id=meeting_details['zoom_meeting_id'],
            zoom_join_url=meeting_details['zoom_join_url'],
            zoom_start_url=meeting_details['zoom_start_url']
        )
        
        countdown_secs = int((end_time - timezone.now()).total_seconds()) + (15 * 60)
        if countdown_secs < 0:
            countdown_secs = 5
            
        finalize_attendance.apply_async(args=[scheduled_class.id], countdown=countdown_secs)
        logger.info(f"Scheduled attendance finalization for class {scheduled_class.id} in {countdown_secs} seconds")

    def perform_update(self, serializer):
        instance = self.get_object()
        old_title = instance.title
        old_start = instance.start_time
        old_end = instance.end_time
        
        scheduled_class = serializer.save()
        
        new_title = scheduled_class.title
        new_start = scheduled_class.start_time
        new_end = scheduled_class.end_time
        
        if (new_title != old_title or new_start != old_start or new_end != old_end) and scheduled_class.zoom_meeting_id:
            duration = int((new_end - new_start).total_seconds() / 60)
            zoom_service = ZoomService()
            try:
                zoom_service.update_meeting(
                    meeting_id=scheduled_class.zoom_meeting_id,
                    topic=new_title,
                    start_time=new_start,
                    duration_minutes=duration
                )
                logger.info(f"Zoom meeting {scheduled_class.zoom_meeting_id} updated successfully.")
            except Exception as e:
                logger.error(f"Failed to update Zoom meeting {scheduled_class.zoom_meeting_id}: {e}")

    def perform_destroy(self, instance):
        if instance.zoom_meeting_id:
            zoom_service = ZoomService()
            try:
                zoom_service.delete_meeting(instance.zoom_meeting_id)
                logger.info(f"Zoom meeting {instance.zoom_meeting_id} deleted successfully.")
            except Exception as e:
                logger.error(f"Failed to delete Zoom meeting {instance.zoom_meeting_id}: {e}")
        instance.delete()

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def join(self, request, pk=None):
        """
        GET /classes/{id}/join/ -> Returns zoom meeting join details
        """
        scheduled_class = self.get_object()
        zoom_service = ZoomService()
        
        # Generate SDK Signature (role=0 is attendee)
        signature = zoom_service.generate_sdk_signature(scheduled_class.zoom_meeting_id, role=0)
        
        return Response({
            'join_url': scheduled_class.zoom_join_url,
            'sdk_signature': signature,
            'meeting_number': scheduled_class.zoom_meeting_id,
            'sdk_key': zoom_service.get_sdk_key(),
            'role': 0
        })

    @action(detail=True, methods=['get'], permission_classes=[IsAdminOrCoordinator])
    def start(self, request, pk=None):
        """
        GET /classes/{id}/start/ -> Returns zoom meeting host details
        """
        scheduled_class = self.get_object()
        zoom_service = ZoomService()
        
        # Return the full Zoom start URL including the ZAK parameter so the host can authenticate
        start_url = scheduled_class.zoom_start_url or ''
            
        role = 1
        signature = zoom_service.generate_sdk_signature(scheduled_class.zoom_meeting_id, role=role)
        
        return Response({
            'start_url': start_url,
            'join_url': scheduled_class.zoom_join_url,
            'sdk_signature': signature,
            'meeting_number': scheduled_class.zoom_meeting_id,
            'sdk_key': zoom_service.get_sdk_key(),
            'role': role
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrCoordinator])
    def end(self, request, pk=None):
        """
        POST /classes/{id}/end/ -> Manually end a live class early and run attendance
        """
        scheduled_class = self.get_object()
        scheduled_class.end_time = timezone.now()
        scheduled_class.save()
        
        # Trigger attendance finalization asynchronously in background
        finalize_attendance.apply_async(args=[scheduled_class.id], countdown=5)
        return Response({"detail": "Class ended successfully and attendance calculation started."})


@api_view(['POST'])
@permission_classes([IsAdminOrCoordinator])
def schedule_class(request):
    """
    POST /schedule-class/
    Body: { course_ids, course_id, title, start_time, end_time }
    Creates ScheduledClass + Zoom meeting.
    Schedules Celery finalize_attendance 15m after end_time.
    """
    course_ids = request.data.get('course_ids', [])
    course_id = request.data.get('course_id')
    
    if not course_ids and course_id:
        course_ids = [course_id]
        
    title = request.data.get('title')
    start_time_str = request.data.get('start_time')
    end_time_str = request.data.get('end_time')
    
    if not course_ids or not title or not start_time_str or not end_time_str:
        return Response({"detail": "Missing fields"}, status=status.HTTP_400_BAD_REQUEST)
        
    courses = Course.objects.filter(id__in=course_ids)
    if not courses.exists():
        return Response({"detail": "No valid courses found"}, status=status.HTTP_404_NOT_FOUND)
        
    primary_course = courses.first()
    
    try:
        # Standard DRF datetime parsing
        start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
        
        # Ensure datetimes are timezone-aware to prevent offset-naive/aware subtraction errors
        if timezone.is_naive(start_time):
            start_time = timezone.make_aware(start_time, timezone.get_current_timezone())
        if timezone.is_naive(end_time):
            end_time = timezone.make_aware(end_time, timezone.get_current_timezone())
    except ValueError:
        return Response({"detail": "Invalid date format"}, status=status.HTTP_400_BAD_REQUEST)
        
    duration = int((end_time - start_time).total_seconds() / 60)
    
    # Create Zoom meeting
    zoom_service = ZoomService()
    try:
        meeting_details = zoom_service.create_meeting(
            topic=title,
            start_time=start_time,
            duration_minutes=duration,
            host_email=request.user.email
        )
    except Exception as e:
        logger.error(f"Failed to create Zoom meeting, class scheduled without meeting: {e}")
        return Response({"detail": f"Zoom Integration Error: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

    scheduled_class = ScheduledClass.objects.create(
        course=primary_course,
        title=title,
        start_time=start_time,
        end_time=end_time,
        host=request.user,
        **meeting_details
    )
    scheduled_class.courses.set(courses)
    
    # Schedule Celery task finalize_attendance
    countdown_secs = int((end_time - timezone.now()).total_seconds()) + (15 * 60)
    if countdown_secs < 0:
        countdown_secs = 5  # Run immediately if class is already in past
        
    finalize_attendance.apply_async(args=[scheduled_class.id], countdown=countdown_secs)
    logger.info(f"Scheduled attendance finalization for class {scheduled_class.id} in {countdown_secs} seconds")
    
    serializer = ScheduledClassSerializer(scheduled_class)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


class AttendanceViewSet(viewsets.ModelViewSet):
    """
    Attendance records ViewSet.
    """
    queryset = Attendance.objects.all().order_by('-scheduled_class__start_time')
    serializer_class = AttendanceSerializer

    def get_permissions(self):
        if self.action in ['me']:
            return [IsStudentUser()]
        return [IsAdminOrCoordinator()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return self.queryset.filter(student=user)
            
        # Admin filters
        course_id = self.request.query_params.get('course')
        class_id = self.request.query_params.get('class')
        student_id = self.request.query_params.get('student')
        
        q = self.queryset
        if course_id:
            from django.db.models import Q
            q = q.filter(
                Q(scheduled_class__course_id=course_id) |
                Q(scheduled_class__courses__id=course_id)
            ).distinct()
        if class_id:
            q = q.filter(scheduled_class_id=class_id)
        if student_id:
            q = q.filter(student_id=student_id)
        return q

    @action(detail=False, methods=['get'], permission_classes=[IsStudentUser])
    def me(self, request):
        """
        GET /attendance/me/ -> Current student's attendance history + percentage
        """
        records = Attendance.objects.filter(student=request.user).order_by('-scheduled_class__start_time')
        
        # Calculate overall attendance percentage for student
        total_classes = records.count()
        attended_classes = records.filter(status__in=['present', 'late']).count()
        
        attendance_percent = (attended_classes * 100.0 / total_classes) if total_classes > 0 else 100.0
        
        serializer = AttendanceSerializer(records, many=True)
        return Response({
            'records': serializer.data,
            'overall_attendance_percent': round(attendance_percent, 2)
        })

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminOrCoordinator])
    def override(self, request, pk=None):
        """
        PATCH /attendance/{id}/override/ -> Manual attendance status override
        """
        record = self.get_object()
        new_status = request.data.get('status')
        if new_status not in [choice[0] for choice in Attendance.STATUS_CHOICES]:
            return Response({"detail": "Invalid status value"}, status=status.HTTP_400_BAD_REQUEST)
            
        record.status = new_status
        record.marked_via = 'manual'
        record.marked_by = request.user
        record.save()
        
        # Trigger CourseProgress update asynchronously
        update_course_progress.delay(record.student.id, record.scheduled_class.course.id)
        
        serializer = AttendanceSerializer(record)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOrCoordinator])
    def reconciliation(self, request):
        """
        GET /attendance/reconciliation/ -> List unmatched AttendanceEvents needing manual student mapping
        """
        events = AttendanceEvent.objects.filter(student__isnull=True).order_by('-timestamp')
        serializer = AttendanceEventSerializer(events, many=True)
        return Response(serializer.data)


class NorthStarAssignmentViewSet(viewsets.ModelViewSet):
    """
    CRUD for NorthStarAssignments.
    Admin write, authenticated student/all read (matching course).
    """
    queryset = NorthStarAssignment.objects.all().order_by('-due_date')
    serializer_class = NorthStarAssignmentSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminOrCoordinator()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            student_profile = getattr(user, 'student_profile', None)
            student_course = student_profile.course.strip() if (student_profile and student_profile.course) else ""
            return self.queryset.filter(course__name__iexact=student_course)
        return self.queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AssignmentSubmissionViewSet(viewsets.ModelViewSet):
    """
    Manage student submissions and grading.
    """
    queryset = AssignmentSubmission.objects.all().order_by('-submitted_at')
    serializer_class = AssignmentSubmissionSerializer

    def get_permissions(self):
        if self.action in ['create', 'my_submissions']:
            return [IsStudentUser()]
        return [IsAdminOrCoordinator()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return self.queryset.filter(student=user)
        return self.queryset

    def create(self, request, *args, **kwargs):
        assignment_id = request.data.get('assignment')
        answers = request.data.get('answers_data', [])
        
        try:
            assignment = NorthStarAssignment.objects.get(id=assignment_id)
        except NorthStarAssignment.DoesNotExist:
            return Response({"detail": "Assignment not found."}, status=404)
            
        questions = {str(q.id): q for q in assignment.questions.all()}
        
        score = 0
        evaluated_answers = []
        
        file_obj = request.FILES.get('file', None)
        
        if questions:
            for ans in answers:
                q_id = str(ans.get('question_id'))
                q = questions.get(q_id)
                if not q:
                    continue
                    
                is_correct = (ans.get('selected_option') == q.correct_option)
                awarded_points = q.points if is_correct else 0
                score += awarded_points
                
                evaluated_answers.append({
                    'question_id': q_id,
                    'selected_option': ans.get('selected_option'),
                    'is_correct': is_correct,
                    'awarded_points': awarded_points,
                    'correct_option': q.correct_option,
                    'prompt': q.prompt
                })
        
        submission_status = 'graded' if questions else 'submitted'
            
        submission, created = AssignmentSubmission.objects.update_or_create(
            assignment=assignment,
            student=request.user,
            defaults={
                'file': file_obj if file_obj else None,
                'submitted_at': timezone.now(),
                'status': submission_status,
                'score': score if questions else None,
                'answers_data': evaluated_answers
            }
        )
        
        # Trigger CourseProgress update
        update_course_progress.delay(request.user.id, assignment.course.id)
        
        return Response(AssignmentSubmissionSerializer(submission).data, status=201)

    @action(detail=False, methods=['get'], permission_classes=[IsStudentUser])
    def my_submissions(self, request):
        """
        GET /submissions/my_submissions/
        """
        submissions = AssignmentSubmission.objects.filter(student=request.user)
        serializer = AssignmentSubmissionSerializer(submissions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminOrCoordinator])
    def grade(self, request, pk=None):
        """
        PATCH /submissions/{id}/grade/ -> Score, feedback and status update
        """
        submission = self.get_object()
        serializer = AssignmentGradeSerializer(submission, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Trigger CourseProgress update
        update_course_progress.delay(submission.student.id, submission.assignment.course.id)
        
        return Response(AssignmentSubmissionSerializer(submission).data)


def ensure_student_progress_records():
    """
    Ensures that all existing students have a corresponding CourseProgress record.
    If a student belongs to a course name that doesn't yet exist as an LMS Course,
    we auto-create the Course object first to keep overall student numbers consistent.
    """
    from core.models import Student
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    existing_pairs = set(CourseProgress.objects.values_list('student_id', 'course_id'))
    students = Student.objects.exclude(course='').exclude(course__isnull=True).exclude(user_id__isnull=True)
    
    # Ensure we only include students whose corresponding User records actually exist
    valid_user_ids = set(User.objects.filter(id__in=students.values_list('user_id', flat=True)).values_list('id', flat=True))
    
    # Auto-create missing Course records
    for student in students:
        if student.course:
            course_name = student.course.strip()
            if course_name:
                Course.objects.get_or_create(name=course_name)
            
    courses = {c.name.lower(): c for c in Course.objects.all()}
    
    missing_progress = []
    for student in students:
        if student.course and student.user_id in valid_user_ids:
            course_obj = courses.get(student.course.strip().lower())
            if course_obj:
                pair = (student.user_id, course_obj.id)
                if pair not in existing_pairs:
                    missing_progress.append(
                        CourseProgress(
                            student_id=student.user_id,
                            course=course_obj,
                            completion_percent=0.0,
                            attendance_percent=0.0
                        )
                    )
                    existing_pairs.add(pair)
                
    if missing_progress:
        CourseProgress.objects.bulk_create(missing_progress)


class CourseProgressViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for CourseProgress.
    """
    queryset = CourseProgress.objects.all().order_by('-last_updated')
    serializer_class = CourseProgressSerializer

    def get_permissions(self):
        if self.action in ['me']:
            return [IsStudentUser()]
        return [IsAdminOrCoordinator()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            # Ensure student progress record exists
            student_profile = getattr(user, 'student_profile', None)
            if student_profile and student_profile.course and student_profile.course.strip():
                course = Course.objects.filter(name__iexact=student_profile.course.strip()).first()
                if course:
                    CourseProgress.objects.get_or_create(student=user, course=course)
            return self.queryset.filter(student=user)
            
        # For admin/coordinator, sync all missing progress records from existing students
        ensure_student_progress_records()
        return self.queryset

    @action(detail=False, methods=['get'], permission_classes=[IsStudentUser])
    def me(self, request):
        """
        GET /progress/me/ -> Returns progress details
        """
        progress_records = CourseProgress.objects.filter(student=request.user)
        serializer = CourseProgressSerializer(progress_records, many=True)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminOrCoordinator])
def generate_certificate(request, student_id, course_id):
    """
    POST /certificates/{student_id}/{course_id}/generate/
    Manual certificate generation trigger.
    """
    from .tasks import check_certificate_eligibility
    # Run the task synchronously to give immediate feedback to the UI
    result = check_certificate_eligibility.apply(args=[student_id, course_id], kwargs={'force': True})
    
    if result.successful():
        return Response({"detail": "Certificate generated successfully."}, status=status.HTTP_200_OK)
    else:
        return Response(
            {"detail": "Failed to generate certificate.", "error": str(result.result)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )



@api_view(['GET'])
@permission_classes([IsStudentUser])
def student_dashboard(request):
    """
    GET /dashboard/student/
    Aggregates upcoming classes, attendance %, pending assignments count, progress %
    """
    user = request.user
    student_profile = getattr(user, 'student_profile', None)
    student_course = student_profile.course.strip() if (student_profile and student_profile.course) else ""
    
    # Auto-initialize progress if missing
    if student_profile and student_course:
        course = Course.objects.filter(name__iexact=student_course).first()
        if course:
            CourseProgress.objects.get_or_create(student=user, course=course)
            
    # Upcoming classes
    from django.db.models import Q
    upcoming_classes = ScheduledClass.objects.filter(
        Q(course__name__iexact=student_course) | Q(courses__name__iexact=student_course),
        end_time__gt=timezone.now()
    ).distinct().order_by('start_time')[:5]
    
    # Attendance %
    progress = CourseProgress.objects.filter(student=user).first()
    if progress:
        attendance_percent = progress.attendance_percent
    else:
        records = Attendance.objects.filter(student=user)
        total_classes = records.count()
        attended_classes = records.filter(status__in=['present', 'late']).count()
        attendance_percent = (attended_classes * 100.0 / total_classes) if total_classes > 0 else 100.0
    
    # Pending assignments count (where no submission exists or submission state is missing)
    assignments = NorthStarAssignment.objects.filter(course__name__iexact=student_course)
    submissions = AssignmentSubmission.objects.filter(student=user, assignment__in=assignments, status__in=['submitted', 'graded'])
    pending_count = assignments.count() - submissions.count()
    
    # Progress records
    progress = CourseProgress.objects.filter(student=user).first()
    progress_percent = progress.completion_percent if progress else 0.0
    
    return Response({
        'upcoming_classes': ScheduledClassSerializer(upcoming_classes, many=True).data,
        'attendance_percent': round(attendance_percent, 2),
        'pending_assignments_count': max(0, pending_count),
        'progress_percent': progress_percent,
        'certificate_unlocked': progress.certificate_unlocked if progress else False,
        'certificate_url': progress.certificate_url if progress else ''
    })


@api_view(['GET'])
@permission_classes([IsAdminOrCoordinator])
def admin_dashboard(request):
    """
    GET /dashboard/admin/
    enrollment stats, attendance trends, completion rates
    """
    ensure_student_progress_records()
    
    courses = Course.objects.all()
    total_students = User.objects.filter(role='student').count()
    
    course_stats = []
    for course in courses:
        enrollments = CourseProgress.objects.filter(course=course).count()
        
        # Avg attendance
        progress_recs = CourseProgress.objects.filter(course=course)
        avg_att = sum(p.attendance_percent for p in progress_recs) / progress_recs.count() if progress_recs.exists() else 0.0
        avg_comp = sum(p.completion_percent for p in progress_recs) / progress_recs.count() if progress_recs.exists() else 0.0
        
        course_stats.append({
            'course_id': course.id,
            'course_name': course.name,
            'enrollments': enrollments,
            'avg_attendance': round(avg_att, 2),
            'avg_completion': round(avg_comp, 2)
        })
        
    return Response({
        'total_enrolled_students': total_students,
        'course_stats': course_stats
    })


@api_view(['POST'])
@permission_classes([IsAdminOrCoordinator])
def send_bulk_email(request):
    """
    POST /send-email/
    Body: { recipient_ids, subject, body, course_id }
    """
    recipient_ids = request.data.get('recipient_ids', [])
    subject = request.data.get('subject')
    body = request.data.get('body')
    course_id = request.data.get('course_id')
    
    if not subject or not body:
        return Response({"detail": "Subject and Body are required."}, status=status.HTTP_400_BAD_REQUEST)
        
    recipients = []
    if course_id:
        # Fetch all students in the course progress records
        progress_records = CourseProgress.objects.filter(course_id=course_id)
        recipients = [p.student.email for p in progress_records if p.student.email]
    elif recipient_ids:
        users = User.objects.filter(id__in=recipient_ids)
        recipients = [u.email for u in users if u.email]
    else:
        # Fetch all students in ANY North Star course
        progress_records = CourseProgress.objects.all().select_related('student')
        recipients = list(set([p.student.email for p in progress_records if p.student.email]))
        
    if not recipients:
        return Response({"detail": "No recipients found."}, status=status.HTTP_400_BAD_REQUEST)
        
    # Send email asynchronously using existing core email task
    async_send_mail.delay(
        subject=subject,
        message=body,
        recipient_list=recipients
    )
    
    return Response({"detail": f"Email queued for {len(recipients)} recipients."}, status=status.HTTP_200_OK)
