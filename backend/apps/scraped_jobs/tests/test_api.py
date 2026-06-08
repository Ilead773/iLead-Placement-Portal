import pytest
from rest_framework.test import APIClient
from apps.scraped_jobs.models import ScrapedJob, CourseJobMapping
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def student_user(db):
    user = User.objects.create_user(login_id='student1', email='student@example.com', password='password')
    from core.models import Student
    from apps.profiles.models import StudentProfile
    student = Student.objects.create(
        user=user, name='Test Student', 
        registration_number='REG123', 
        email='student@example.com',
        course='BSc in Data Science'
    )
    # The API might check student.course or resume_profile.student.course
    StudentProfile.objects.create(student=student)
    return user

@pytest.mark.django_db
def test_job_feed_api(api_client, student_user):
    # Create a job and map it to BSc in Data Science
    job = ScrapedJob.objects.create(
        external_job_id='api_test', source='test', title='Data Scientist',
        company_name='TestCo', dedup_hash='apihash', is_active=True, is_approved=True
    )
    CourseJobMapping.objects.create(course_name='BSc in Data Science', scraped_job=job, relevance_score=1.0)
    
    api_client.force_authenticate(user=student_user)
    response = api_client.get('/api/v1/scraped-jobs/student/job-feed/')
    
    assert response.status_code == 200
    assert response.data['jobs']['count'] >= 1
    assert response.data['jobs']['results'][0]['title'] == 'Data Scientist'

@pytest.mark.django_db
def test_job_feed_filtering(api_client, student_user):
    # Create jobs for two different courses
    ds_job = ScrapedJob.objects.create(
        external_job_id='ds', source='test', title='DS Job',
        company_name='TestCo', dedup_hash='dshash', is_active=True, is_approved=True
    )
    CourseJobMapping.objects.create(course_name='BSc in Data Science', scraped_job=ds_job, relevance_score=1.0)
    
    dm_job = ScrapedJob.objects.create(
        external_job_id='dm', source='test', title='DM Job',
        company_name='TestCo', dedup_hash='dmhash', is_active=True, is_approved=True
    )
    CourseJobMapping.objects.create(course_name='BBA in Digital Marketing (BBA DM)', scraped_job=dm_job, relevance_score=1.0)
    
    api_client.force_authenticate(user=student_user)
    # Feed should only show BSc in Data Science jobs by default for this student
    response = api_client.get('/api/v1/scraped-jobs/student/job-feed/')
    assert response.status_code == 200
    titles = [j['title'] for j in response.data['jobs']['results']]
    assert 'DS Job' in titles
    assert 'DM Job' not in titles
