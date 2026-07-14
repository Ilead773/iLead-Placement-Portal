import pytest
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.utils import timezone
from core.models import Course
from apps.north_star.models import CourseProgress
from apps.north_star.tasks import check_certificate_eligibility

from django.test import override_settings
from apps.north_star.models import NorthStarAssignment, AssignmentSubmission

User = get_user_model()

@pytest.mark.django_db
@override_settings(
    NORTH_STAR_MIN_ATTENDANCE_PERCENT=75.0,
    NORTH_STAR_MIN_COMPLETION_PERCENT=100.0,
    NORTH_STAR_MIN_ASSIGNMENT_MARKS_PERCENT=0.0
)
@patch('apps.north_star.tasks.StorageFactory')
def test_certificate_eligibility_boundary_conditions(mock_storage_factory):
    # Setup mock storage backend
    mock_storage = mock_storage_factory.get_backend.return_value
    mock_storage.save.return_value = "certificates/cert.pdf"
    mock_storage.url.return_value = "http://storage.com/cert.pdf"

    course = Course.objects.create(name="BSc DS", category="Tech")
    student = User.objects.create_user(login_id="student_cert", email="stud_cert@example.com", password="pass")
    
    # 1. Boundary Condition: 74% Attendance, 100% Completion -> Certificate remains LOCKED
    progress = CourseProgress.objects.create(
        student=student,
        course=course,
        attendance_percent=74.0,
        completion_percent=100.0,
        certificate_unlocked=False
    )
    check_certificate_eligibility(student.id, course.id)
    progress.refresh_from_db()
    assert progress.certificate_unlocked is False

    # 2. Boundary Condition: 75% Attendance, 99% Completion -> Certificate remains LOCKED
    progress.attendance_percent = 75.0
    progress.completion_percent = 99.0
    progress.save()
    
    check_certificate_eligibility(student.id, course.id)
    progress.refresh_from_db()
    assert progress.certificate_unlocked is False

    # 3. Boundary Condition: 75% Attendance, 100% Completion -> Certificate is UNLOCKED
    progress.completion_percent = 100.0
    progress.save()
    
    check_certificate_eligibility(student.id, course.id)
    progress.refresh_from_db()
    assert progress.certificate_unlocked is True
    assert progress.certificate_url == "http://storage.com/cert.pdf"

@pytest.mark.django_db
@override_settings(
    NORTH_STAR_MIN_ATTENDANCE_PERCENT=80.0,
    NORTH_STAR_MIN_COMPLETION_PERCENT=100.0,
    NORTH_STAR_MIN_ASSIGNMENT_MARKS_PERCENT=70.0
)
@patch('apps.north_star.tasks.StorageFactory')
def test_certificate_eligibility_new_thresholds(mock_storage_factory):
    mock_storage = mock_storage_factory.get_backend.return_value
    mock_storage.save.return_value = "certificates/cert.pdf"
    mock_storage.url.return_value = "http://storage.com/cert.pdf"

    course = Course.objects.create(name="BSc DS 2", category="Tech")
    student = User.objects.create_user(login_id="student_cert_2", email="stud_cert2@example.com", password="pass")
    
    asm1 = NorthStarAssignment.objects.create(course=course, title="A1", due_date=timezone.now(), max_score=100)
    asm2 = NorthStarAssignment.objects.create(course=course, title="A2", due_date=timezone.now(), max_score=100)
    
    progress = CourseProgress.objects.create(
        student=student,
        course=course,
        attendance_percent=80.0,
        completion_percent=100.0,
        certificate_unlocked=False
    )
    sub1 = AssignmentSubmission.objects.create(assignment=asm1, student=student, score=50, status='graded')
    sub2 = AssignmentSubmission.objects.create(assignment=asm2, student=student, score=80, status='graded')
    
    check_certificate_eligibility(student.id, course.id)
    progress.refresh_from_db()
    assert progress.certificate_unlocked is False

    sub1.score = 70
    sub1.save()
    
    check_certificate_eligibility(student.id, course.id)
    progress.refresh_from_db()
    assert progress.certificate_unlocked is True
    assert progress.certificate_url == "http://storage.com/cert.pdf"

@pytest.mark.django_db
@patch('apps.north_star.tasks.StorageFactory')
def test_force_generate_certificate(mock_storage_factory):
    mock_storage = mock_storage_factory.get_backend.return_value
    mock_storage.save.return_value = "certificates/cert_force.pdf"
    mock_storage.url.return_value = "http://storage.com/cert_force.pdf"

    course = Course.objects.create(name="BSc DS Force", category="Tech")
    student = User.objects.create_user(login_id="student_force", email="stud_force@example.com", password="pass")

    # Below thresholds (0% attendance, 0% completion)
    progress = CourseProgress.objects.create(
        student=student,
        course=course,
        attendance_percent=0.0,
        completion_percent=0.0,
        certificate_unlocked=False
    )
    
    # Run with force=True
    check_certificate_eligibility(student.id, course.id, force=True)
    progress.refresh_from_db()
    
    assert progress.certificate_unlocked is True
    assert progress.certificate_url == "http://storage.com/cert_force.pdf"

