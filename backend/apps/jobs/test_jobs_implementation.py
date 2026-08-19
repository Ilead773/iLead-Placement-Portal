import pytest
from rest_framework import status
from rest_framework.test import APIClient
from core.models import User, Student
from apps.jobs.models import Job, JobRound
from apps.applications.models import Application, ApplicationRound
from django.utils import timezone

@pytest.mark.django_db
class TestJobSecurityAndRounds:
    def test_student_cannot_write_jobs(self, api_client, student_user):
        api_client.force_authenticate(user=student_user)
        # Try to create a job
        response = api_client.post('/api/v1/jobs/jobs/', {
            'company_name': 'HackerCorp',
            'role': 'Intruder',
            'description': 'Hacking the mainframe.',
            'package': '10.00',
            'location': 'Remote',
            'application_deadline': (timezone.now() + timezone.timedelta(days=1)).isoformat(),
            'status': 'draft'
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
    def test_unauthorized_coordinator_cannot_write_jobs(self, api_client, coordinator_user):
        coordinator_user.can_manage_placements = False
        coordinator_user.save()
        api_client.force_authenticate(user=coordinator_user)
        
        response = api_client.post('/api/v1/jobs/jobs/', {
            'company_name': 'HackerCorp',
            'role': 'Intruder',
            'description': 'Hacking the mainframe.',
            'package': '10.00',
            'location': 'Remote',
            'application_deadline': (timezone.now() + timezone.timedelta(days=1)).isoformat(),
            'status': 'draft'
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_authorized_coordinator_can_write_jobs(self, api_client, coordinator_user):
        coordinator_user.can_manage_placements = True
        coordinator_user.save()
        api_client.force_authenticate(user=coordinator_user)
        
        response = api_client.post('/api/v1/jobs/jobs/', {
            'company_name': 'PlacementCorp',
            'role': 'Software Developer',
            'description': 'Develop placement software.',
            'package': '12.00',
            'location': 'Bangalore',
            'application_deadline': (timezone.now() + timezone.timedelta(days=1)).isoformat(),
            'status': 'draft',
            'rounds': [
                {'round_number': 1, 'round_name': 'Online Test', 'round_type': 'test'}
            ]
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert Job.objects.filter(company_name='PlacementCorp').exists()

    def test_update_delta_preserves_job_rounds(self, api_client, coordinator_user):
        coordinator_user.can_manage_placements = True
        coordinator_user.save()
        api_client.force_authenticate(user=coordinator_user)
        
        # Create a job with rounds first
        job = Job.objects.create(
            company_name='PlacementCorp',
            role='Software Developer',
            description='Original job description',
            package=12.00,
            location='Bangalore',
            application_deadline=timezone.now() + timezone.timedelta(days=1),
            status='draft'
        )
        r1 = JobRound.objects.create(job=job, round_number=1, round_name='Online Test', round_type='test')
        r2 = JobRound.objects.create(job=job, round_number=2, round_name='Technical Interview', round_type='interview')
        
        # Send PUT to update rounds names and parameters (matching the existing round ids)
        response = api_client.put(f'/api/v1/jobs/jobs/{job.id}/', {
            'company_name': 'PlacementCorp',
            'role': 'Senior Software Developer',
            'description': 'Develop senior placement software.',
            'package': '15.00',
            'location': 'Bangalore',
            'application_deadline': (timezone.now() + timezone.timedelta(days=2)).isoformat(),
            'status': 'draft',
            'rounds': [
                {'id': str(r1.id), 'round_number': 1, 'round_name': 'Online Coding Test', 'round_type': 'test'},
                {'id': str(r2.id), 'round_number': 2, 'round_name': 'Technical Interview Round 1', 'round_type': 'interview'},
                {'round_number': 3, 'round_name': 'HR Round', 'round_type': 'interview'}
            ]
        }, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify database IDs are preserved for r1 and r2
        job.refresh_from_db()
        db_rounds = list(job.rounds.all().order_by('round_number'))
        assert len(db_rounds) == 3
        assert db_rounds[0].id == r1.id
        assert db_rounds[0].round_name == 'Online Coding Test'
        assert db_rounds[1].id == r2.id
        assert db_rounds[1].round_name == 'Technical Interview Round 1'
        assert db_rounds[2].round_name == 'HR Round'

    def test_soft_deletes_round_with_applications(self, api_client, coordinator_user, student_user):
        coordinator_user.can_manage_placements = True
        coordinator_user.save()
        api_client.force_authenticate(user=coordinator_user)
        
        job = Job.objects.create(
            company_name='PlacementCorp',
            role='Software Developer',
            description='Original job description',
            package=12.00,
            location='Bangalore',
            application_deadline=timezone.now() + timezone.timedelta(days=1),
            status='active'
        )
        r1 = JobRound.objects.create(job=job, round_number=1, round_name='Online Test', round_type='test')
        
        # Set up application and application round
        student_profile = student_user.student_profile
        application = Application.objects.create(student=student_profile, job=job, status='applied')
        app_round = ApplicationRound.objects.create(
            application=application,
            job_round=r1,
            round_number=1,
            status='pending'
        )
        
        # Coordinator tries to delete r1 by omitting it from the rounds list
        response = api_client.put(f'/api/v1/jobs/jobs/{job.id}/', {
            'company_name': 'PlacementCorp',
            'role': 'Software Developer',
            'description': 'Original job description',
            'package': '12.00',
            'location': 'Bangalore',
            'application_deadline': (timezone.now() + timezone.timedelta(days=1)).isoformat(),
            'status': 'active',
            'rounds': [] # Deleting r1
        }, format='json')
        
        # Should succeed because we now soft-delete
        assert response.status_code == status.HTTP_200_OK
        
        # Verify r1 still exists in database but marked as deleted
        r1.refresh_from_db()
        assert r1.is_deleted is True
        
        # Verify GET response does not return the soft-deleted round in the active rounds list
        get_response = api_client.get(f'/api/v1/jobs/jobs/{job.id}/')
        assert get_response.status_code == status.HTTP_200_OK
        rounds_in_resp = get_response.data.get('rounds', [])
        assert len(rounds_in_resp) == 0

    def test_hard_deletes_round_without_applications(self, api_client, coordinator_user):
        coordinator_user.can_manage_placements = True
        coordinator_user.save()
        api_client.force_authenticate(user=coordinator_user)
        
        job = Job.objects.create(
            company_name='PlacementCorp',
            role='Software Developer',
            description='Original job description',
            package=12.00,
            location='Bangalore',
            application_deadline=timezone.now() + timezone.timedelta(days=1),
            status='active'
        )
        r1 = JobRound.objects.create(job=job, round_number=1, round_name='Online Test', round_type='test')
        
        # Coordinator tries to delete r1 by omitting it from the rounds list
        response = api_client.put(f'/api/v1/jobs/jobs/{job.id}/', {
            'company_name': 'PlacementCorp',
            'role': 'Software Developer',
            'description': 'Original job description',
            'package': '12.00',
            'location': 'Bangalore',
            'application_deadline': (timezone.now() + timezone.timedelta(days=1)).isoformat(),
            'status': 'active',
            'rounds': [] # Deleting r1
        }, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify r1 is completely deleted from the database
        assert not JobRound.objects.filter(id=r1.id).exists()

    def test_student_cannot_see_confidential_fields(self, api_client, student_user):
        job = Job.objects.create(
            company_name='ConfidentialCorp',
            role='Developer',
            description='Secret work.',
            package=12.00,
            location='Kolkata',
            application_deadline=timezone.now() + timezone.timedelta(days=1),
            status='active',
            category='A',
            hr_email='hr@confidentialcorp.com'
        )
        api_client.force_authenticate(user=student_user)
        
        # Test retrieve
        response = api_client.get(f'/api/v1/jobs/jobs/{job.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert 'hr_email' not in response.data
        assert 'category' not in response.data
        
        # Test list
        response_list = api_client.get('/api/v1/jobs/jobs/')
        assert response_list.status_code == status.HTTP_200_OK
        # Find our job in list
        our_job = next((j for j in response_list.data if j['id'] == str(job.id)), None)
        assert our_job is not None
        assert 'hr_email' not in our_job
        assert 'category' not in our_job

    def test_admin_can_see_confidential_fields(self, api_client, coordinator_user):
        coordinator_user.can_manage_placements = True
        coordinator_user.save()
        
        job = Job.objects.create(
            company_name='ConfidentialCorp',
            role='Developer',
            description='Secret work.',
            package=12.00,
            location='Kolkata',
            application_deadline=timezone.now() + timezone.timedelta(days=1),
            status='active',
            category='A',
            hr_email='hr@confidentialcorp.com'
        )
        api_client.force_authenticate(user=coordinator_user)
        
        # Test retrieve
        response = api_client.get(f'/api/v1/jobs/jobs/{job.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['hr_email'] == 'hr@confidentialcorp.com'
        assert response.data['category'] == 'A'
        
        # Test list
        response_list = api_client.get('/api/v1/jobs/jobs/')
        assert response_list.status_code == status.HTTP_200_OK
        our_job = next((j for j in response_list.data if j['id'] == str(job.id)), None)
        assert our_job is not None
        assert our_job['hr_email'] == 'hr@confidentialcorp.com'
        assert our_job['category'] == 'A'

    def test_job_id_auto_generation_and_override(self, api_client, coordinator_user):
        coordinator_user.can_manage_placements = True
        coordinator_user.save()
        api_client.force_authenticate(user=coordinator_user)
        
        # Test 1: Auto generation when job_id is not provided
        response1 = api_client.post('/api/v1/jobs/jobs/', {
            'company_name': 'TestCorp1',
            'role': 'Developer 1',
            'description': 'Dev 1 description',
            'package': '10.00',
            'location': 'Kolkata',
            'application_deadline': (timezone.now() + timezone.timedelta(days=1)).isoformat(),
            'status': 'draft'
        }, format='json')
        assert response1.status_code == status.HTTP_201_CREATED
        jid1 = response1.data['job_id']
        assert jid1 is not None
        
        # Test 2: Manual override when creating
        response2 = api_client.post('/api/v1/jobs/jobs/', {
            'company_name': 'TestCorp2',
            'role': 'Developer 2',
            'description': 'Dev 2 description',
            'package': '12.00',
            'location': 'Kolkata',
            'application_deadline': (timezone.now() + timezone.timedelta(days=1)).isoformat(),
            'status': 'draft',
            'job_id': 9999
        }, format='json')
        assert response2.status_code == status.HTTP_201_CREATED
        assert response2.data['job_id'] == 9999
        
        # Test 3: Uniqueness validation
        response3 = api_client.post('/api/v1/jobs/jobs/', {
            'company_name': 'TestCorp3',
            'role': 'Developer 3',
            'description': 'Dev 3 description',
            'package': '15.00',
            'location': 'Kolkata',
            'application_deadline': (timezone.now() + timezone.timedelta(days=1)).isoformat(),
            'status': 'draft',
            'job_id': 9999
        }, format='json')
        assert response3.status_code == status.HTTP_400_BAD_REQUEST


