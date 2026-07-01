import pytest
from unittest.mock import patch
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from core.models import Course
from apps.north_star.models import ScheduledClass, NorthStarAssignment, AssignmentSubmission

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def student_user():
    return User.objects.create_user(login_id="student_user", email="student@example.com", password="password123", role="student")

@pytest.fixture
def admin_user():
    return User.objects.create_user(login_id="admin_user", email="admin@example.com", password="password123", role="admin")

@pytest.mark.django_db
def test_courses_permissions_student(api_client, student_user):
    course = Course.objects.create(name="BBA", category="Business")
    api_client.force_authenticate(user=student_user)
    
    # Students can list courses
    response = api_client.get('/api/v1/north-star/courses/')
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1

    # Students cannot create courses
    response = api_client.post('/api/v1/north-star/courses/', {'name': 'BCA', 'department': 'Tech'})
    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.django_db
def test_courses_permissions_admin(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    
    # Admin can create courses
    response = api_client.post('/api/v1/north-star/courses/', {'name': 'BCA', 'department': 'Technology'})
    assert response.status_code == status.HTTP_201_CREATED
    assert Course.objects.filter(name="BCA").exists()

@pytest.mark.django_db
@pytest.mark.filterwarnings("ignore:.*DateTimeField.*received a naive datetime.*")
@patch('apps.north_star.views.ZoomService.create_meeting')
def test_schedule_class_endpoint(mock_create, api_client, admin_user):
    mock_create.return_value = {
        'zoom_meeting_id': '123456789',
        'zoom_join_url': 'http://join.com',
        'zoom_start_url': 'http://start.com'
    }
    course = Course.objects.create(name="BSc DS", category="Tech")
    api_client.force_authenticate(user=admin_user)
    
    payload = {
        'course_id': str(course.id),
        'title': 'Intro to Pandas',
        'start_time': timezone.now().isoformat(),
        'end_time': (timezone.now() + timedelta(hours=1)).isoformat()
    }
    
    response = api_client.post('/api/v1/north-star/schedule-class/', payload)
    assert response.status_code == status.HTTP_201_CREATED
    assert ScheduledClass.objects.filter(title='Intro to Pandas').exists()

@pytest.mark.django_db
def test_submission_and_grading_flow(api_client, student_user, admin_user):
    course = Course.objects.create(name="BSc DS", category="Tech")
    asm = NorthStarAssignment.objects.create(
        course=course,
        title="SQL Quiz",
        due_date=timezone.now() + timedelta(days=2),
        max_score=100
    )
    
    # Student creates submission
    api_client.force_authenticate(user=student_user)
    response = api_client.post('/api/v1/north-star/submissions/', {
        'assignment': str(asm.id)
    })
    assert response.status_code == status.HTTP_201_CREATED
    submission = AssignmentSubmission.objects.get(assignment=asm, student=student_user)
    assert submission.status == 'submitted'
    
    # Admin grades submission
    api_client.force_authenticate(user=admin_user)
    response = api_client.patch(f'/api/v1/north-star/submissions/{submission.id}/grade/', {
        'score': 85,
        'feedback': 'Good job'
    })
    assert response.status_code == status.HTTP_200_OK
    
    submission.refresh_from_db()
    assert submission.status == 'graded'
    assert submission.score == 85
    assert submission.feedback == 'Good job'

@pytest.mark.django_db
@pytest.mark.filterwarnings("ignore:.*DateTimeField.*received a naive datetime.*")
@patch('apps.north_star.views.ZoomService.create_meeting')
def test_schedule_class_multiple_courses(mock_create, api_client, admin_user):
    mock_create.return_value = {
        'zoom_meeting_id': '123456789',
        'zoom_join_url': 'http://join.com',
        'zoom_start_url': 'http://start.com'
    }
    course1 = Course.objects.create(name="BSc DS", category="Tech")
    course2 = Course.objects.create(name="BBA DM", category="Business")
    api_client.force_authenticate(user=admin_user)
    
    payload = {
        'course_ids': [str(course1.id), str(course2.id)],
        'title': 'Intro to Pandas',
        'start_time': timezone.now().isoformat(),
        'end_time': (timezone.now() + timedelta(hours=1)).isoformat()
    }
    
    response = api_client.post('/api/v1/north-star/schedule-class/', payload, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    
    scheduled_class = ScheduledClass.objects.get(title='Intro to Pandas')
    assert scheduled_class.course in {course1, course2}
    assert set(scheduled_class.courses.all()) == {course1, course2}
