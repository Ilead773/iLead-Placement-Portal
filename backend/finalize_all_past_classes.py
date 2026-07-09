import os
import django

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.north_star.models import ScheduledClass, Attendance
from apps.north_star.tasks import finalize_attendance, update_course_progress
from django.utils import timezone
from django.contrib.auth import get_user_model

print("=== FINALIZING ALL PAST CLASSES ===")
past_classes = ScheduledClass.objects.filter(end_time__lte=timezone.now())
print(f"Found {past_classes.count()} past classes. Processing...")

for c in past_classes:
    print(f"Finalizing Class: '{c.title}' (ID: {c.id})")
    try:
        # Run finalization directly
        finalize_attendance(c.id)
    except Exception as e:
        print(f"  Error finalizing class {c.title}: {e}")

print("\n=== TRIGGERING PROGRESS UPDATE FOR ALL BBA STUDENTS ===")
User = get_user_model()
bba_students = User.objects.filter(role='student', student_profile__course__iexact='BBA')
from apps.north_star.models import Course
course = Course.objects.filter(name__iexact='BBA').first()

if course:
    for student in bba_students:
        print(f"Updating BBA progress for {student.email}...")
        try:
            update_course_progress(student.id, course.id)
        except Exception as e:
            print(f"  Error updating progress for {student.email}: {e}")
            
print("=== COMPLETED ===")
