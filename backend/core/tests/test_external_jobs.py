import pytest
from unittest.mock import patch
from rest_framework import status
from django.utils import timezone
from core.models import User, Student, ExternalClickLog
from apps.jobs.models import Job
from apps.applications.models import Application
from apps.applications.eligibility_engine import check_eligibility
from model_bakery import baker

@pytest.mark.django_db
class TestExternalJobs:
    
    @patch('apps.applications.tasks.send_job_alert_task.delay')
    def test_mark_selected_creates_closed_shadow_job_no_alerts(self, mock_job_alert_delay, auth_client, student_user):
        """
        Test that when an admin marks an outbound click log as selected,
        a shadow Job is created with status='closed' and email_sent=True,
        which avoids triggering the job alert email signal/task.
        """
        student = Student.objects.get(user=student_user)
        
        # Create an ExternalClickLog
        click_log = ExternalClickLog.objects.create(
            user=student_user,
            job_title="Software Developer Intern",
            company_name="Acme Corp",
            external_url="https://acme.jobs/apply/123"
        )
        
        # Call mark-selected
        url = f'/api/v1/admin-ops/external-clicks/{click_log.id}/mark-selected/'
        response = auth_client.post(url, {'package': 8.5, 'listing_type': 'job'}, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify shadow job is created with correct properties
        job = Job.objects.get(external_link="https://acme.jobs/apply/123")
        assert job.status == 'closed'
        assert job.email_sent is True
        assert job.job_type == 'external'
        assert float(job.package) == 8.5
        assert job.listing_type == 'job'
        
        # Verify no job alert background task was dispatched
        mock_job_alert_delay.assert_not_called()
        
        # Verify student application was created with selected status
        app = Application.objects.get(student=student, job=job)
        assert app.status == 'selected'
        assert app.job_snapshot.get('package') == '8.5'
        
        # Verify click log is updated
        click_log.refresh_from_db()
        assert click_log.is_marked_selected is True
        assert click_log.marked_selected_at is not None

    def test_eligibility_engine_applies_criteria_to_external_jobs(self, student_user):
        """
        Test that external jobs undergo eligibility checks normally,
        meaning if the student doesn't meet the academic/attendance criteria,
        they are marked ineligible, rather than automatically bypassed.
        """
        student = Student.objects.get(user=student_user)
        
        # Create an external job with tight eligibility rules
        job = baker.make(
            Job,
            job_type='external',
            category='C',
            status='active',
            eligibility_rules={
                'min_cgpa': 9.0, # Student only has 8.5
                'min_attendance': 85.0
            }
        )
        
        # Student profile should fail cgpa
        eligibility = check_eligibility(student, job)
        assert eligibility['eligible'] is False
        
        # Check failing reasons
        failing_names = [check['check_name'] for check in eligibility['failing_checks']]
        assert 'cgpa' in failing_names

    def test_unique_click_log_with_counter(self, api_client, student_user):
        """
        Test that clicking on an external link multiple times:
        1. Keeps only one row in ExternalClickLog.
        2. Increments click_count by the number of clicks.
        """
        api_client.force_authenticate(user=student_user)
        url = '/api/v1/me/log-click/'
        data = {
            'job_title': 'Staff Engineer',
            'company_name': 'Netflix',
            'external_url': 'https://netflix.jobs/role/456'
        }
        
        # Click 1
        res1 = api_client.post(url, data)
        assert res1.status_code == status.HTTP_201_CREATED
        assert res1.data['click_count'] == 1
        
        # Click 2
        res2 = api_client.post(url, data)
        assert res2.status_code == status.HTTP_200_OK
        assert res2.data['click_count'] == 2
        
        # Click 3
        res3 = api_client.post(url, data)
        assert res3.status_code == status.HTTP_200_OK
        assert res3.data['click_count'] == 3
        
        # Verify exactly 1 click log exists in the DB for this user and URL
        logs = ExternalClickLog.objects.filter(user=student_user, external_url='https://netflix.jobs/role/456')
        assert logs.count() == 1
        
        log = logs.first()
        assert log.click_count == 3
        assert log.company_name == 'Netflix'
        assert log.job_title == 'Staff Engineer'
