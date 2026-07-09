import os
import django

# Manually load the local .env file
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, val = line.split('=', 1)
                os.environ[key.strip()] = val.strip().strip('"').strip("'")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.north_star.models import AttendanceEvent

print("=== START ATTENDANCE EVENTS DUMP (LIVE DB) ===")
events = AttendanceEvent.objects.all().order_by('-timestamp')[:20]
if not events.exists():
    print("No attendance events found in database.")
else:
    for e in events:
        print(f"Class: {e.scheduled_class.title} | Meeting ID: {e.scheduled_class.zoom_meeting_id}")
        print(f"  Email: {e.participant_email or '[EMPTY_EMAIL]'} | Name: {e.participant_name or '[EMPTY_NAME]'}")
        print(f"  Resolved Student: {e.student.email if e.student else 'None (Unresolved)'}")
        print(f"  Event: {e.event_type} | Time: {e.timestamp}")
        print("-" * 50)
print("=== END ATTENDANCE EVENTS DUMP ===")
