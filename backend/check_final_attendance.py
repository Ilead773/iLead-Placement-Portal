import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.north_star.models import ScheduledClass, Attendance

print("=== DEPLOYED ATTENDANCE RECORDS ===")
# Find the class ABD
cls = ScheduledClass.objects.filter(title='ABD').first()
if not cls:
    print("Class 'ABD' not found.")
else:
    print(f"Class: {cls.title} (ID: {cls.id})")
    
    # Query final attendance
    records = Attendance.objects.filter(scheduled_class=cls)
    if not records.exists():
        print("No final attendance records processed yet for this class.")
    else:
        for r in records:
            print(f"Student: {r.student.email} ({r.student.name})")
            print(f"  Status: {r.status} | Duration: {r.total_duration_minutes} mins")
            print(f"  Checked In: {r.check_in_time} | Checked Out: {r.check_out_time}")
            print("-" * 50)
print("=== END ATTENDANCE RECORDS ===")
