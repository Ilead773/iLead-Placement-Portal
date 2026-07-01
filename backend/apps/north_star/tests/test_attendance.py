import pytest
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from core.models import Course
from apps.north_star.models import (
    ScheduledClass,
    AttendanceEvent,
    Attendance,
    CourseProgress
)
from apps.north_star.tasks import finalize_attendance

User = get_user_model()

@pytest.mark.django_db
@pytest.mark.filterwarnings("ignore:.*DateTimeField.*received a naive datetime.*")
def test_finalize_attendance_aggregation():
    # Setup
    course = Course.objects.create(name="BSc Computer Science", category="Technology")
    student1 = User.objects.create_user(login_id="student1", email="student1@example.com", password="pass")
    
    # 60 minute class
    start = timezone.now() - timedelta(hours=1)
    end = start + timedelta(minutes=60)
    
    scheduled_class = ScheduledClass.objects.create(
        course=course,
        title="Software Engineering Lecture",
        start_time=start,
        end_time=end,
        zoom_meeting_id="999888777"
    )

    # 1. student1 joins at start + 5m, leaves at start + 50m (45 mins active, 75%)
    AttendanceEvent.objects.create(
        scheduled_class=scheduled_class,
        student=student1,
        participant_email=student1.email,
        participant_name="Student One",
        event_type="join",
        timestamp=start + timedelta(minutes=5)
    )
    AttendanceEvent.objects.create(
        scheduled_class=scheduled_class,
        student=student1,
        participant_email=student1.email,
        participant_name="Student One",
        event_type="leave",
        timestamp=start + timedelta(minutes=50)
    )

    # Trigger finalization directly
    finalize_attendance(scheduled_class.id)

    # Verify student1 attendance is present (45 minutes >= 75% of 60m class = 45m)
    att = Attendance.objects.get(scheduled_class=scheduled_class, student=student1)
    assert att.status == 'present'
    assert att.total_duration_minutes == 45
    assert att.join_count == 1

@pytest.mark.django_db
@pytest.mark.filterwarnings("ignore:.*DateTimeField.*received a naive datetime.*")
def test_finalize_attendance_rejoins_and_late():
    course = Course.objects.create(name="BSc Computer Science", category="Technology")
    student2 = User.objects.create_user(login_id="student2", email="student2@example.com", password="pass")
    
    start = timezone.now() - timedelta(hours=1)
    end = start + timedelta(minutes=60)
    
    scheduled_class = ScheduledClass.objects.create(
        course=course,
        title="Class 2",
        start_time=start,
        end_time=end,
        zoom_meeting_id="999888778"
    )

    # 2. student2 joins at start + 10m, leaves at start + 20m (10m)
    #    student2 rejoins at start + 30m, leaves at start + 45m (15m)
    #    Total = 25m (which is 41.6% of 60m class -> should be 'late' (30%-75%))
    AttendanceEvent.objects.create(
        scheduled_class=scheduled_class,
        student=student2,
        participant_email=student2.email,
        participant_name="Student Two",
        event_type="join",
        timestamp=start + timedelta(minutes=10)
    )
    AttendanceEvent.objects.create(
        scheduled_class=scheduled_class,
        student=student2,
        participant_email=student2.email,
        participant_name="Student Two",
        event_type="leave",
        timestamp=start + timedelta(minutes=20)
    )
    AttendanceEvent.objects.create(
        scheduled_class=scheduled_class,
        student=student2,
        participant_email=student2.email,
        participant_name="Student Two",
        event_type="join",
        timestamp=start + timedelta(minutes=30)
    )
    AttendanceEvent.objects.create(
        scheduled_class=scheduled_class,
        student=student2,
        participant_email=student2.email,
        participant_name="Student Two",
        event_type="leave",
        timestamp=start + timedelta(minutes=45)
    )

    finalize_attendance(scheduled_class.id)

    att = Attendance.objects.get(scheduled_class=scheduled_class, student=student2)
    assert att.status == 'late'
    assert att.total_duration_minutes == 25
    assert att.join_count == 2
