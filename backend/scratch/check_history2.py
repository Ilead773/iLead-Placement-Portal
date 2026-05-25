import django, os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '.')
django.setup()

from apps.interviews.models import MockInterviewSession
from apps.interviews.serializers import SessionListSerializer

sessions = MockInterviewSession.objects.filter(
    status='completed'
).select_related('interview_type', 'interview_type__domain').order_by('-created_at')[:10]
completed_count = MockInterviewSession.objects.filter(status='completed').count()
abandoned_count = MockInterviewSession.objects.filter(status='abandoned').count()
pending_count = MockInterviewSession.objects.filter(status='pending_review').count()
print('Completed sessions:', completed_count)
print('Abandoned sessions:', abandoned_count)
print('Pending review sessions:', pending_count)
print()

data = SessionListSerializer(sessions, many=True).data
for s in data:
    score = s['total_score']
    name = s['interview_type_name']
    print(f"  [completed] score={score} | {name}")
