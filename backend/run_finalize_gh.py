import os
import django

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.north_star.models import ScheduledClass, Attendance
from apps.north_star.tasks import finalize_attendance

# 1. Find class GH
cls = ScheduledClass.objects.filter(title='GH').first()
if not cls:
    print("Class 'GH' not found in database.")
    exit(1)

print(f"Class: {cls.title} (ID: {cls.id})")
class_duration = int((cls.end_time - cls.start_time).total_seconds() / 60)
print(f"Scheduled Start: {cls.start_time}")
print(f"Scheduled End: {cls.end_time}")
print(f"Scheduled Duration: {class_duration} minutes")

# 2. Trigger finalization
print("\n=== RUNNING ATTENDANCE FINALIZATION ===")
finalize_attendance(cls.id)
print("=== FINALIZATION COMPLETE ===")

# 3. Print resulting records
print("\n=== FINAL ATTENDANCE RECORDS FOR GH ===")
records = Attendance.objects.filter(scheduled_class=cls)
if not records.exists():
    print("No attendance records found.")
else:
    for r in records:
        print(f"Student: {r.student.email} ({r.student.name})")
        print(f"  Status: {r.status} | Duration: {r.total_duration_minutes} mins")
        print("-" * 50)
print("=== END ===")
