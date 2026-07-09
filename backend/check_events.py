import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.north_star.models import AttendanceEvent

print("=== START ATTENDANCE EVENTS DUMP ===")
events = AttendanceEvent.objects.all().order_by('-timestamp')
if not events.exists():
    print("No attendance events found in database.")
else:
    for e in events:
        print(f"Class: {e.scheduled_class.title} | Meeting ID: {e.scheduled_class.zoom_meeting_id}")
        print(f"  Email: {e.participant_email} | Name: {e.participant_name}")
        print(f"  Resolved Student: {e.student.email if e.student else 'None (Unresolved)'}")
        print(f"  Event: {e.event_type} | Time: {e.timestamp}")
        print("-" * 50)
print("=== END ATTENDANCE EVENTS DUMP ===")
