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

