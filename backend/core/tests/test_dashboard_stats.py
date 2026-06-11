import pytest
from django.utils import timezone

from core.models import Student, User
from apps.applications.models import Application
from apps.jobs.models import Job


@pytest.mark.django_db
def test_dashboard_counts_off_campus_placements_without_subtracting_on_campus(auth_client):
    admin_user = User.objects.get(login_id='admin_test')
    deadline = timezone.now() + timezone.timedelta(days=30)

    student_one_user = User.objects.create_user(
        login_id='dash_s1',
        email='dash_s1@test.com',
        password='Password123!',
        name='Dash Student One',
        role='student',
    )
    student_one = Student.objects.create(
        user=student_one_user,
        name='Dash Student One',
        registration_number='DASH001',
        email='dash_s1@test.com',
        course='BCA',
        cgpa=8.2,
    )

    student_two_user = User.objects.create_user(
        login_id='dash_s2',
        email='dash_s2@test.com',
        password='Password123!',
        name='Dash Student Two',
        role='student',
    )
    student_two = Student.objects.create(
        user=student_two_user,
        name='Dash Student Two',
        registration_number='DASH002',
        email='dash_s2@test.com',
        course='BCA',
        cgpa=7.8,
    )

    internal_job = Job.objects.create(
        company_name='Campus Co',
        role='Software Engineer',
        description='Internal role',
        package=600000,
        location='Kolkata',
        job_type='internal',
        listing_type='job',
        application_deadline=deadline,
        status='active',
        created_by=admin_user,
    )
    internal_job_two = Job.objects.create(
        company_name='Campus Co Two',
        role='Systems Engineer',
        description='Second internal role',
        package=580000,
        location='Kolkata',
        job_type='internal',
        listing_type='job',
        application_deadline=deadline,
        status='active',
        created_by=admin_user,
    )
    external_job = Job.objects.create(
        company_name='Outside Co',
        role='Data Analyst',
        description='External role',
        package=720000,
        location='Remote',
        job_type='external',
        listing_type='job',
        application_deadline=deadline,
        status='closed',
        external_link='https://outside.example.com/jobs/1',
        created_by=admin_user,
    )
    external_job_two = Job.objects.create(
        company_name='Another Outside Co',
        role='QA Analyst',
        description='Second external role',
        package=650000,
        location='Remote',
        job_type='external',
        listing_type='job',
        application_deadline=deadline,
        status='closed',
        external_link='https://outside.example.com/jobs/2',
        created_by=admin_user,
    )

    Application.objects.create(student=student_one, job=internal_job, status='selected')
    Application.objects.create(student=student_one, job=external_job, status='selected')
    Application.objects.create(student=student_two, job=internal_job_two, status='accepted')
    Application.objects.create(student=student_two, job=external_job_two, status='accepted')

    response = auth_client.get('/api/v1/dashboard/stats/')

    assert response.status_code == 200
    assert response.data['overview']['total_placements'] == 4
    assert response.data['overview']['placed_on_campus'] == 2
    assert response.data['overview']['placed_off_campus'] == 2
    assert response.data['overview']['placed_students'] == 2
