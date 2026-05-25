import pytest
from rest_framework.test import APIClient
from core.models import User, Student
from model_bakery import baker

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        login_id='admin_test',
        email='admin@test.com',
        password='AdminPassword123!',
        name='Admin User'
    )

@pytest.fixture
def coordinator_user(db):
    return User.objects.create_user(
        login_id='coord_test',
        email='coord@test.com',
        password='CoordPassword123!',
        name='Coord User',
        role='coordinator'
    )

@pytest.fixture
def student_user(db):
    user = User.objects.create_user(
        login_id='stu001',
        email='stu001@test.com',
        password='StudentPassword123!',
        name='Student One',
        role='student',
        temp_password_flag=True
    )
    student = Student.objects.create(
        user=user,
        name='Student One',
        registration_number='STU001',
        email='stu001@test.com',
        course='BCA',
        cgpa=8.5
    )
    return user

@pytest.fixture
def auth_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client
