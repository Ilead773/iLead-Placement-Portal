import pytest
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.utils import timezone
from core.models import Course
from apps.north_star.models import CourseProgress
from apps.north_star.tasks import check_certificate_eligibility

User = get_user_model()

@pytest.mark.django_db
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
