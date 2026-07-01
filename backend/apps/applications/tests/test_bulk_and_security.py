import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from model_bakery import baker
from core.models import Student
from apps.jobs.models import Job
from apps.applications.models import Application, ApplicationStatusHistory, ResumeEmailLog

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def coordinator_user(db):
    user = User.objects.create_user(
        login_id='coord1',
        email='coord@test.com',
        password='password',
        role='coordinator'
    )
    return user

@pytest.fixture
def student_user(db):
    user = User.objects.create_user(
        login_id='student1',
        email='student@test.com',
        password='password',
        role='student'
    )
    return user

@pytest.mark.django_db
class TestBulkAndSecurityAPI:

    def test_bulk_update_status_success(self, api_client, coordinator_user):
        # Create a job and applications
        job = baker.make(Job, openings_count=5, status='active')
        student1 = baker.make(Student)
        student2 = baker.make(Student)
        
        app1 = baker.make(Application, job=job, student=student1, status='applied', is_deleted=False)
        app2 = baker.make(Application, job=job, student=student2, status='applied', is_deleted=False)
        
        api_client.force_authenticate(user=coordinator_user)
        
        payload = {
            'application_ids': [str(app1.id), str(app2.id)],
            'status': 'shortlisted'
        }
        
        response = api_client.post('/api/v1/applications/admin/applications/bulk-update-status/', payload, format='json')
        
        assert response.status_code == 200
        assert response.data['status'] == 'success'
        assert response.data['updated_count'] == 2
        
        app1.refresh_from_db()
        app2.refresh_from_db()
        assert app1.status == 'shortlisted'
        assert app2.status == 'shortlisted'
        
        # Verify status history was created
        history = ApplicationStatusHistory.objects.filter(new_status='shortlisted')
        assert history.count() == 2

    def test_bulk_update_status_exceeds_capacity_rollback(self, api_client, coordinator_user):
        # Create a job with 1 opening limit
        job = baker.make(Job, openings_count=1, status='active')
        student1 = baker.make(Student)
        student2 = baker.make(Student)
        
        app1 = baker.make(Application, job=job, student=student1, status='applied', is_deleted=False)
        app2 = baker.make(Application, job=job, student=student2, status='applied', is_deleted=False)
        
        api_client.force_authenticate(user=coordinator_user)
        
        # Attempting to place BOTH when only 1 vacancy is available
        payload = {
            'application_ids': [str(app1.id), str(app2.id)],
            'status': 'selected'
        }
        
        response = api_client.post('/api/v1/applications/admin/applications/bulk-update-status/', payload, format='json')
        
        assert response.status_code == 400
        assert 'openings' in response.data['error']
        
        # Verify atomic rollback: neither candidate should be placed
        app1.refresh_from_db()
        app2.refresh_from_db()
        assert app1.status == 'applied'
        assert app2.status == 'applied'

    def test_bulk_delete_success(self, api_client, coordinator_user):
        job = baker.make(Job)
        student1 = baker.make(Student)
        student2 = baker.make(Student)
        
        app1 = baker.make(Application, job=job, student=student1, is_deleted=False)
        app2 = baker.make(Application, job=job, student=student2, is_deleted=False)
        
        api_client.force_authenticate(user=coordinator_user)
        
        payload = {
            'application_ids': [str(app1.id), str(app2.id)]
        }
        
        response = api_client.post('/api/v1/applications/admin/applications/bulk-delete/', payload, format='json')
        
        assert response.status_code == 200
        assert response.data['status'] == 'success'
        assert response.data['deleted_count'] == 2
        
        app1.refresh_from_db()
        app2.refresh_from_db()
        assert app1.is_deleted is True
        assert app2.is_deleted is True

    def test_shared_resume_expiration_not_expired(self, api_client):
        # Create a job, student, application, and ResumeEmailLog
        job = baker.make(Job)
        student = baker.make(Student)
        app = baker.make(Application, job=job, student=student)
        
        # Link not expired: expires in 1 hour
        log = baker.make(
            ResumeEmailLog,
            job=job,
            application_ids=[str(app.id)],
            expires_at=timezone.now() + timedelta(hours=1),
            cc_emails=[]
        )
        
        response = api_client.get(f'/api/v1/applications/shared-resumes/{log.id}/?pin={log.pin_code}')
        
        assert response.status_code == 200
        assert response.data['job']['company_name'] == log.job.company_name
        assert len(response.data['applications']) == 1

    def test_shared_resume_expiration_expired(self, api_client):
        job = baker.make(Job)
        student = baker.make(Student)
        app = baker.make(Application, job=job, student=student)
        
        # Link expired: expired 1 hour ago
        log = baker.make(
            ResumeEmailLog,
            job=job,
            application_ids=[str(app.id)],
            expires_at=timezone.now() - timedelta(hours=1),
            cc_emails=[]
        )
        
        response = api_client.get(f'/api/v1/applications/shared-resumes/{log.id}/')
        
        assert response.status_code == 410
        assert response.data['error'] == 'link_expired'

    def test_shared_resume_pin_verification_success(self, api_client):
        job = baker.make(Job)
        student = baker.make(Student)
        app = baker.make(Application, job=job, student=student)
        
        log = baker.make(
            ResumeEmailLog,
            job=job,
            application_ids=[str(app.id)],
            expires_at=timezone.now() + timedelta(hours=1),
            pin_code='123456',
            cc_emails=[]
        )
        
        # Test success via query parameter
        response = api_client.get(f'/api/v1/applications/shared-resumes/{log.id}/?pin=123456')
        assert response.status_code == 200
        
        # Test success via header
        response_header = api_client.get(
            f'/api/v1/applications/shared-resumes/{log.id}/',
            HTTP_X_SHARED_RESUME_PIN='123456'
        )
        assert response_header.status_code == 200

    def test_shared_resume_pin_verification_failure(self, api_client):
        job = baker.make(Job)
        student = baker.make(Student)
        app = baker.make(Application, job=job, student=student)
        
        log = baker.make(
            ResumeEmailLog,
            job=job,
            application_ids=[str(app.id)],
            expires_at=timezone.now() + timedelta(hours=1),
            pin_code='123456',
            cc_emails=[]
        )
        
        # Test failure with no PIN
        response = api_client.get(f'/api/v1/applications/shared-resumes/{log.id}/')
        assert response.status_code == 403
        assert response.data['error'] == 'invalid_pin'
        
        # Test failure with incorrect PIN
        response_wrong = api_client.get(f'/api/v1/applications/shared-resumes/{log.id}/?pin=000000')
        assert response_wrong.status_code == 403

    def test_offer_letter_upload_security(self, db):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from django.core.exceptions import ValidationError
        import re
        
        job = baker.make(Job)
        student = baker.make(Student)
        app = baker.make(Application, job=job, student=student)
        
        # 1. Valid PDF file (starts with %PDF)
        valid_file = SimpleUploadedFile("offer_letter.pdf", b"%PDF-1.4\nvalid content", content_type="application/pdf")
        app.offer_letter_file = valid_file
        app.save()
        
        # Verify path randomization: should be saved under media, folder with year/month, and a UUID filename
        path = app.offer_letter_file.name
        assert "offer_letters/" in path
        filename = path.split('/')[-1]
        assert re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$', filename)
        
        # Cleanup
        app.offer_letter_file.delete()
        
        # 2. Invalid signature file (rename of an exploit script)
        invalid_file = SimpleUploadedFile("exploit.pdf", b"<?php phpinfo(); ?>", content_type="application/pdf")
        app.offer_letter_file = invalid_file
        
        with pytest.raises(ValidationError) as exc_info:
            app.full_clean()
        assert "Unsupported file type or invalid file contents" in str(exc_info.value)

    def test_offer_letter_security_restricted_fields_student(self, api_client, student_user):
        student = baker.make(Student, user=student_user)
        job = baker.make(Job)
        app = baker.make(Application, job=job, student=student, status='applied', is_deleted=False)

        api_client.force_authenticate(user=student_user)

        # 1. Student attempts to approve their own offer letter by setting offer_letter_status
        payload = {
            'offer_letter_status': 'approved'
        }
        response = api_client.patch(f'/api/v1/applications/applications/{app.id}/', payload, format='json')
        assert response.status_code == 400
        assert 'offer_letter_status' in response.data

        # 2. Student attempts to change application status to something invalid (like selected)
        payload = {
            'status': 'selected'
        }
        response = api_client.patch(f'/api/v1/applications/applications/{app.id}/', payload, format='json')
        assert response.status_code == 400
        assert 'status' in response.data

        # 3. Student withdraws application (should be allowed)
        payload = {
            'status': 'withdrawn'
        }
        response = api_client.patch(f'/api/v1/applications/applications/{app.id}/', payload, format='json')
        assert response.status_code == 200
        app.refresh_from_db()
        assert app.status == 'withdrawn'

    def test_offer_letter_upload_status_constraint(self, api_client, student_user):
        from django.core.files.uploadedfile import SimpleUploadedFile
        student = baker.make(Student, user=student_user)
        job = baker.make(Job)
        app = baker.make(Application, job=job, student=student, status='applied', is_deleted=False)

        api_client.force_authenticate(user=student_user)

        valid_file = SimpleUploadedFile("offer_letter.pdf", b"%PDF-1.4\nvalid content", content_type="application/pdf")
        payload = {
            'offer_letter_file': valid_file
        }
        response = api_client.patch(f'/api/v1/applications/applications/{app.id}/', payload, format='multipart')
        assert response.status_code == 400
        assert 'offer_letter_file' in response.data

        # Now set status to selected and retry
        app.status = 'selected'
        app.save()

        valid_file = SimpleUploadedFile("offer_letter.pdf", b"%PDF-1.4\nvalid content", content_type="application/pdf")
        payload = {
            'offer_letter_file': valid_file
        }
        response = api_client.patch(f'/api/v1/applications/applications/{app.id}/', payload, format='multipart')
        assert response.status_code == 200
        app.refresh_from_db()
        assert app.offer_letter_status == 'pending_verification'

        if app.offer_letter_file:
            app.offer_letter_file.delete()

    def test_offer_letter_status_reset_on_reupload(self, api_client, coordinator_user):
        from django.core.files.uploadedfile import SimpleUploadedFile
        job = baker.make(Job)
        student = baker.make(Student)
        app = baker.make(Application, job=job, student=student, status='selected')

        valid_file1 = SimpleUploadedFile("offer1.pdf", b"%PDF-1.4\ncontent1", content_type="application/pdf")
        app.offer_letter_file = valid_file1
        app.save()

        # Update the status directly simulating admin approval
        app.offer_letter_status = 'approved'
        app.save()
        
        assert app.offer_letter_status == 'approved'

        student_user_obj = student.user
        api_client.force_authenticate(user=student_user_obj)

        valid_file2 = SimpleUploadedFile("offer2.pdf", b"%PDF-1.4\ncontent2", content_type="application/pdf")
        payload = {
            'offer_letter_file': valid_file2
        }
        response = api_client.patch(f'/api/v1/applications/applications/{app.id}/', payload, format='multipart')
        assert response.status_code == 200
        app.refresh_from_db()
        assert app.offer_letter_status == 'pending_verification'

        if app.offer_letter_file:
            app.offer_letter_file.delete()

    def test_offer_letter_notification_triggered(self, api_client, student_user, coordinator_user):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from apps.applications.models import Notification
        
        student = baker.make(Student, user=student_user)
        job = baker.make(Job)
        app = baker.make(Application, job=job, student=student, status='selected', offer_letter_status='pending_upload')

        api_client.force_authenticate(user=student_user)
        Notification.objects.all().delete()

        valid_file = SimpleUploadedFile("offer.pdf", b"%PDF-1.4\ncontent", content_type="application/pdf")
        payload = {
            'offer_letter_file': valid_file
        }
        response = api_client.patch(f'/api/v1/applications/applications/{app.id}/', payload, format='multipart')
        assert response.status_code == 200
        
        notifs = Notification.objects.filter(notification_type='OFFER_LETTER_SUBMITTED')
        assert notifs.filter(user=coordinator_user).exists()

        if app.offer_letter_file:
            app.offer_letter_file.delete()

    def test_offer_letter_size_validation_limit(self, api_client, student_user):
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        student = baker.make(Student, user=student_user)
        job = baker.make(Job)
        app = baker.make(Application, job=job, student=student, status='selected', offer_letter_status='pending_upload')

        api_client.force_authenticate(user=student_user)

        # 1. File size is exactly 2MB (should be allowed)
        size_2mb = 2 * 1024 * 1024
        valid_content_2mb = b"%PDF-1.4\n" + b"0" * (size_2mb - 9)
        file_2mb = SimpleUploadedFile("offer_2mb.pdf", valid_content_2mb, content_type="application/pdf")
        
        payload = {
            'offer_letter_file': file_2mb
        }
        response = api_client.patch(f'/api/v1/applications/applications/{app.id}/', payload, format='multipart')
        assert response.status_code == 200
        
        # Cleanup
        app.refresh_from_db()
        if app.offer_letter_file:
            app.offer_letter_file.delete()

        # 2. File size is 2.1MB (should be blocked)
        size_2_1mb = int(2.1 * 1024 * 1024)
        invalid_content = b"%PDF-1.4\n" + b"0" * (size_2_1mb - 9)
        file_too_large = SimpleUploadedFile("too_large.pdf", invalid_content, content_type="application/pdf")
        
        payload = {
            'offer_letter_file': file_too_large
        }
        response = api_client.patch(f'/api/v1/applications/applications/{app.id}/', payload, format='multipart')
        assert response.status_code == 400
        assert 'offer_letter_file' in response.data
        assert "File size must not exceed 2MB." in str(response.data['offer_letter_file'])

