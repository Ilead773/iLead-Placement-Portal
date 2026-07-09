import os
import django
from django.utils import timezone
from django.db.models import Q

# Connect directly to the production database URL to execute the sync
os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.north_star.models import ScheduledClass, Attendance, CourseProgress, Course
from django.contrib.auth import get_user_model

User = get_user_model()

print("=== STARTING FAST ALIGNMENT ===")

# 1. Get all past classes
past_classes = ScheduledClass.objects.filter(end_time__lte=timezone.now())

for c in past_classes:
    # Resolve all students enrolled in any of the courses associated with the scheduled class
    course_names = list(c.courses.values_list('name', flat=True))
    if c.course:
        course_names.append(c.course.name)
    course_names = list(set(course_names))
    
    if course_names:
        query = Q(role='student')
        course_q = Q()
        for name in course_names:
            course_q |= Q(student_profile__course__iexact=name)
        query &= course_q
        enrolled_students = User.objects.filter(query)
        
        for student in enrolled_students:
            # Check if Attendance record already exists
            att, created = Attendance.objects.get_or_create(
                scheduled_class=c,
                student=student,
                defaults={
                    'status': 'absent',
                    'total_duration_minutes': 0,
                    'join_count': 0,
                    'marked_via': 'zoom_auto'
                }
            )
            if created:
                print(f"Created absent attendance record for {student.email} in class '{c.title}'")

# 2. Run Course Progress calculation for all BBA students
bba_students = User.objects.filter(role='student', student_profile__course__iexact='BBA')
course = Course.objects.filter(name__iexact='BBA').first()

if course:
    for student in bba_students:
        total_classes = ScheduledClass.objects.filter(
            Q(course=course) | Q(courses=course),
            end_time__lte=timezone.now()
        ).distinct().count()

        attended_classes = Attendance.objects.filter(
            Q(scheduled_class__course=course) | Q(scheduled_class__courses=course),
            student=student,
            status__in=['present', 'late']
        ).distinct().count()

        attendance_percent = (attended_classes * 100.0 / total_classes) if total_classes > 0 else 100.0
        
        # Calculate completion percent (assignments)
        from apps.north_star.models import NorthStarAssignment, AssignmentSubmission
        assignments = NorthStarAssignment.objects.filter(course=course)
        submissions = AssignmentSubmission.objects.filter(student=student, assignment__in=assignments, status__in=['submitted', 'graded'])
        completion_percent = (submissions.count() * 100.0 / assignments.count()) if assignments.exists() else 100.0

        progress, created = CourseProgress.objects.update_or_create(
            student=student,
            course=course,
            defaults={
                'completion_percent': round(completion_percent, 2),
                'attendance_percent': round(attendance_percent, 2)
            }
        )
        print(f"Synced CourseProgress for {student.email}: Attendance = {progress.attendance_percent}%, Completion = {progress.completion_percent}%")

print("=== FAST ALIGNMENT COMPLETED ===")
