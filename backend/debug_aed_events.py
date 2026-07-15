import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.north_star.models import AttendanceEvent, ScheduledClass

cls = ScheduledClass.objects.filter(title='AED').first()
print(f"Class: {cls.title} (ID: {cls.id})")

events = AttendanceEvent.objects.filter(scheduled_class=cls).order_by('timestamp')
for ev in events:
    print(f"Student: {ev.student.email if ev.student else 'None'}")
    print(f"  Event: {ev.event_type} | Time: {ev.timestamp}")
    print(f"  Participant Name: {ev.participant_name} | Email: {ev.participant_email}")
    print("-" * 50)
