from apps.interviews.models import MockInterviewSession
from apps.interviews.serializers import SessionListSerializer

# Check what list_sessions would return now
sessions = (
    MockInterviewSession.objects.all()
    .exclude(status__in=['in_progress', 'scheduled'])
    .select_related('interview_type', 'interview_type__domain')
    .order_by('-created_at')[:10]
)

total = MockInterviewSession.objects.exclude(status__in=['in_progress', 'scheduled']).count()
print(f'Total non-in_progress sessions: {total}')
print()

data = SessionListSerializer(sessions, many=True).data
for s in data:
    print(f"  [{s['status']}] {s['interview_type_name']} | score={s['total_score']} | voice={s['use_voice']}")
