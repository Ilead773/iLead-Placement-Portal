import os
import django

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.north_star.models import ScheduledClass, Attendance
from django.utils import timezone

print("=== CHECKING MISSING ATTENDANCE ===")
past_classes = ScheduledClass.objects.filter(end_time__lte=timezone.now())
print(f"Total past classes: {past_classes.count()}")

for c in past_classes:
    records_count = Attendance.objects.filter(scheduled_class=c).count()
    print(f"Class: {c.title} (End Time: {c.end_time}) | Attendance Records: {records_count}")
    if records_count == 0:
        print("  --> WARNING: No attendance records found! Needs finalization.")
print("=== END CHECKING ===")
