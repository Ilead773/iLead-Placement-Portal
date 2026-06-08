import pytest
from core.models import User, Student
from apps.jobs.models import Job
from apps.applications.models import Application
from model_bakery import baker

@pytest.mark.django_db
class TestVacancyClosingSignal:
    
    def test_job_closes_when_openings_filled_selected(self):
        """
        Test that a job status changes to 'closed' when the count of 'selected'
        applications equals the job's openings_count.
        """
        job = baker.make(Job, status='active', openings_count=2)
        
        student1 = baker.make(Student)
        student2 = baker.make(Student)
        
        app1 = baker.make(Application, job=job, student=student1, status='applied')
        app2 = baker.make(Application, job=job, student=student2, status='applied')
        
        assert job.status == 'active'
        
        # Set app1 status to selected. Job should still be active (1/2 filled)
        app1.status = 'selected'
        app1.save()
        
        job.refresh_from_db()
        assert job.status == 'active'
        
        # Set app2 status to selected. Job should now close (2/2 filled)
        app2.status = 'selected'
        app2.save()
        
        job.refresh_from_db()
        assert job.status == 'closed'

    def test_job_closes_when_openings_filled_accepted(self):
        """
        Test that a job status changes to 'closed' when the count of 'accepted'
        applications equals the job's openings_count.
        """
        job = baker.make(Job, status='active', openings_count=1)
        
        student = baker.make(Student)
        app = baker.make(Application, job=job, student=student, status='applied')
        
        assert job.status == 'active'
        
        # Set app status to accepted. Job should close (1/1 filled)
        app.status = 'accepted'
        app.save()
        
        job.refresh_from_db()
        assert job.status == 'closed'

    def test_job_does_not_close_if_under_openings(self):
        """
        Test that a job status remains active if the number of selected/accepted
        applications is strictly less than the openings_count.
        """
        job = baker.make(Job, status='active', openings_count=3)
        
        student1 = baker.make(Student)
        student2 = baker.make(Student)
        
        app1 = baker.make(Application, job=job, student=student1, status='selected')
        app1.save()
        app2 = baker.make(Application, job=job, student=student2, status='accepted')
        app2.save()
        
        job.refresh_from_db()
        assert job.status == 'active'

    def test_job_reopens_when_selection_deleted(self):
        """
        Test that a closed job status reverts to 'active' when a selected/accepted
        application is deleted, causing the count to fall below openings_count.
        """
        job = baker.make(Job, status='active', openings_count=1)
        student = baker.make(Student)
        app = baker.make(Application, job=job, student=student, status='selected')
        app.save()
        
        job.refresh_from_db()
        assert job.status == 'closed'
        
        # Now delete the application
        app.delete()
        
        job.refresh_from_db()
        assert job.status == 'active'

    def test_job_reopens_when_status_changed_away_from_selection(self):
        """
        Test that a closed job status reverts to 'active' when a selected/accepted
        application's status changes away (e.g. to 'rejected' or 'applied'),
        causing the count to fall below openings_count.
        """
        job = baker.make(Job, status='active', openings_count=1)
        student = baker.make(Student)
        app = baker.make(Application, job=job, student=student, status='selected')
        app.save()
        
        job.refresh_from_db()
        assert job.status == 'closed'
        
        # Change status away from selected
        app.status = 'rejected'
        app.save()
        
        job.refresh_from_db()
        assert job.status == 'active'

    def test_job_reopens_on_soft_delete(self):
        """
        Test that a closed job status reverts to 'active' when a selected/accepted
        application is soft-deleted (is_deleted set to True), causing the non-deleted
        placed count to fall below openings_count.
        """
        job = baker.make(Job, status='active', openings_count=1)
        student = baker.make(Student)
        app = baker.make(Application, job=job, student=student, status='selected', is_deleted=False)
        app.save()
        
        job.refresh_from_db()
        assert job.status == 'closed'
        
        # Soft delete the application
        app.is_deleted = True
        app.save()
        
        job.refresh_from_db()
        assert job.status == 'active'

    def test_job_visibility_excluded_for_soft_deleted_student(self):
        """
        Test that a job is excluded from the student's queryset if the student has a
        soft-deleted application for that job.
        """
        from rest_framework.test import APIRequestFactory, force_authenticate
        from apps.jobs.views import JobViewSet
        from core.views.student_self import StudentSelfViewSet
        
        job = baker.make(Job, status='active', openings_count=2, job_type='internal', listing_type='job')
        student = baker.make(Student)
        user = student.user
        
        # Soft-deleted application for this job
        app = baker.make(Application, job=job, student=student, status='applied', is_deleted=True)
        app.save()
        
        factory = APIRequestFactory()
        
        # 1. Test JobViewSet list
        view = JobViewSet.as_view({'get': 'list'})
        request = factory.get('/api/jobs/jobs/')
        force_authenticate(request, user=user)
        response = view(request)
        
        assert response.status_code == 200
        # The job should be excluded from the listing
        job_ids = [j['id'] for j in response.data]
        assert str(job.id) not in job_ids

        # 2. Test StudentSelfViewSet dashboard/me upcoming jobs
        view_me = StudentSelfViewSet.as_view({'get': 'get_me'})
        request_me = factory.get('/api/me/')
        force_authenticate(request_me, user=user)
        response_me = view_me(request_me)
        
        assert response_me.status_code == 200
        upcoming_ids = [str(j['id']) for j in response_me.data.get('upcoming_jobs', [])]
        assert str(job.id) not in upcoming_ids
