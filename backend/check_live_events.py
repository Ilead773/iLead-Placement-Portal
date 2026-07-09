import os
import django

# Set the production database URL directly to verify live data
os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.north_star.models import AttendanceEvent, ScheduledClass

print("=== START LIVE PRODUCTION ATTENDANCE EVENTS DUMP ===")
events = AttendanceEvent.objects.all().order_by('-timestamp')[:30]
if not events.exists():
    print("No attendance events found in production database.")
else:
    for e in events:
        print(f"Class: {e.scheduled_class.title} | Meeting ID: {e.scheduled_class.zoom_meeting_id}")
        print(f"  Email: {e.participant_email or '[EMPTY_EMAIL]'} | Name: {e.participant_name or '[EMPTY_NAME]'}")
        print(f"  Resolved Student: {e.student.email if e.student else 'None (Unresolved)'}")
        print(f"  Event: {e.event_type} | Time: {e.timestamp}")
        print("-" * 50)
print("=== END LIVE PRODUCTION ATTENDANCE EVENTS DUMP ===")
