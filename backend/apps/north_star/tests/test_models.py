import pytest
from django.db.utils import IntegrityError
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from core.models import Course
from apps.north_star.models import (
    ScheduledClass,
    Attendance,
    NorthStarAssignment,
    AssignmentSubmission,
    CourseProgress
)

User = get_user_model()

@pytest.mark.django_db
def test_course_creation():
    course = Course.objects.create(
        name="BSc Data Science",
        category="Technology"
    )
    assert str(course) == "BSc Data Science"

@pytest.mark.django_db
def test_scheduled_class_creation():
    course = Course.objects.create(name="BSc DS", category="Tech")
    host = User.objects.create_user(login_id="host1", email="host1@example.com", password="pass")
    
    start = timezone.now()
    end = start + timedelta(hours=1)
    
    scheduled_class = ScheduledClass.objects.create(
        course=course,
        title="Python Basics",
        start_time=start,
        end_time=end,
        zoom_meeting_id="123456789",
        host=host
    )
    assert str(scheduled_class) == "Python Basics (BSc DS)"

@pytest.mark.django_db
def test_attendance_unique_together():
    course = Course.objects.create(name="BSc DS", category="Tech")
    student = User.objects.create_user(login_id="stud1", email="stud1@example.com", password="pass")
    cls = ScheduledClass.objects.create(
        course=course,
        title="Class 1",
        start_time=timezone.now(),
        end_time=timezone.now() + timedelta(hours=1),
        zoom_meeting_id="123"
    )
    
    Attendance.objects.create(scheduled_class=cls, student=student, status="present")
    
    # Second record should trigger IntegrityError
    with pytest.raises(IntegrityError):
        Attendance.objects.create(scheduled_class=cls, student=student, status="absent")

@pytest.mark.django_db
def test_submission_unique_together():
    course = Course.objects.create(name="BSc DS", category="Tech")
    student = User.objects.create_user(login_id="stud1", email="stud1@example.com", password="pass")
    
    asm = NorthStarAssignment.objects.create(
        course=course,
        title="HW 1",
        due_date=timezone.now() + timedelta(days=1),
        max_score=100
    )
    
    AssignmentSubmission.objects.create(assignment=asm, student=student, status="submitted")
    
    with pytest.raises(IntegrityError):
        AssignmentSubmission.objects.create(assignment=asm, student=student, status="graded")
