import os
import django

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.north_star.models import Attendance, CourseProgress, ScheduledClass
from django.contrib.auth import get_user_model

User = get_user_model()
student = User.objects.filter(email='demo.student@ilead.com').first()

print(f"=== ATTENDANCE RECORDS FOR STUDENT: {student.email} ===")
records = Attendance.objects.filter(student=student).order_by('-scheduled_class__start_time')
print(f"Total attendance records in database: {records.count()}")
for r in records:
    c = r.scheduled_class
    courses = list(c.courses.values_list('name', flat=True))
    if c.course:
        courses.append(c.course.name)
    courses = list(set(courses))
    print(f"Class: {c.title} (ID: {c.id}) | Status: {r.status} | Course(s): {courses}")
    print("-" * 50)

print("\n=== COURSE PROGRESS RECORDS FOR STUDENT ===")
progress_recs = CourseProgress.objects.filter(student=student)
for p in progress_recs:
    print(f"Course: {p.course.name} | Completion: {p.completion_percent}% | Attendance: {p.attendance_percent}%")
print("=== END DUMP ===")
