import pytest
from unittest.mock import patch, MagicMock
from django.core import mail
from core.models import User, Student
from apps.jobs.models import Job
from apps.applications.models import Notification
from apps.applications.tasks import send_notification_email, send_job_alert_task, send_email_for_notification_object
from model_bakery import baker
from django.utils import timezone

@pytest.mark.django_db(transaction=True)
class TestNotificationEmailSignals:
    
    @patch('apps.applications.tasks.send_job_alert_task.delay')
    def test_job_active_triggers_signal(self, mock_delay):
        """
        Test that when a Job becomes active, the signal sets email_sent = True
        and calls send_job_alert_task.delay(job_id).
        """
        # Create a draft job
        job = baker.make(Job, status='draft', email_sent=False, package=5.0)
        
        assert not job.email_sent
        assert mock_delay.call_count == 0
        
        # Now activate it
        job.status = 'active'
        job.save()
        
        job.refresh_from_db()
        assert job.email_sent
        mock_delay.assert_called_once_with(job.id)

    @patch('apps.applications.tasks.send_job_alert_task.delay')
    def test_job_active_already_sent_does_not_retrigger(self, mock_delay):
        """
        Test that if a Job is already marked as active or email_sent = True,
        saving it again does not trigger the job alert task again.
        """
        job = baker.make(Job, status='active', email_sent=True, package=5.0)
        mock_delay.reset_mock()
        
        job.role = "Updated Role Name"
        job.save()
        
        assert mock_delay.call_count == 0

    @patch('apps.applications.tasks.send_notification_email.delay')
    def test_notification_creation_triggers_email_task(self, mock_delay):
        """
        Test that creating a Notification triggers the send_notification_email task.
        """
        user = baker.make(User, role='student')
        
        assert mock_delay.call_count == 0
        
        notification = Notification.objects.create(
            user=user,
            notification_type='TEST_ALERT',
            title='Test Title',
            message='Test message content'
        )
        
        mock_delay.assert_called_once_with(notification.id)


@pytest.mark.django_db
class TestNotificationTasks:
    
    def test_send_email_for_notification_object(self):
        """
        Test that the core helper function sends a beautifully styled HTML + Text email.
        """
        user = baker.make(User, email='student@test.com', name='John Doe')
        notification = baker.make(
            Notification,
            user=user,
            title='Special Briefing',
            message='A critical announcement was posted.',
            action_url='/student/announcements'
        )
        
        mail.outbox = [] # Clear outbox
        
        result = send_email_for_notification_object(notification)
        
        assert result is True
        assert len(mail.outbox) == 1
        sent_mail = mail.outbox[0]
        
        assert sent_mail.subject == "iLEAD Portal Alert: Special Briefing"
        assert "student@test.com" in sent_mail.to
        assert "John Doe" in sent_mail.body or "student" in sent_mail.body
        assert "A critical announcement was posted." in sent_mail.body
        assert "/student/announcements" in sent_mail.body
        assert sent_mail.alternatives # HTML message exists
        html_content = sent_mail.alternatives[0][0]
        assert "iLEAD Placement Portal" in html_content
        assert "Special Briefing" in html_content

    @patch('apps.applications.tasks.send_email_for_notification_object')
    def test_send_notification_email_task_success(self, mock_send_email):
        """
        Test the celery task to fetch a notification and call send_email_for_notification_object.
        """
        user = baker.make(User, email='test@test.com')
        notification = baker.make(Notification, user=user)
        mock_send_email.reset_mock()
        
        # Test directly calling the Celery task function
        send_notification_email.run(notification.id)
        
        mock_send_email.assert_called_once_with(notification)

    @patch('apps.applications.tasks.send_bulk_notification_emails.delay')
    def test_send_job_alert_task(self, mock_bulk_send_delay):
        """
        Test the bulk job alert sender celery task.
        """
        # Create a few active students with email addresses
        student_user1 = baker.make(User, role='student', email='student1@test.com', is_active=True)
        student_user2 = baker.make(User, role='student', email='student2@test.com', is_active=True)
        # Inactive student
        inactive_student = baker.make(User, role='student', email='inactive@test.com', is_active=False)
        # Non-student user
        admin_user = baker.make(User, role='admin', email='admin@test.com', is_active=True)
        
        job = baker.make(
            Job,
            company_name='Acme Corp',
            role='Frontend Engineer',
            package=6.5,
            location='Remote',
            job_type='internal',
            listing_type='job',
            application_deadline=timezone.now() + timezone.timedelta(days=7),
            status='active'
        )
        
        # Clear out notifications first
        Notification.objects.all().delete()
        mock_bulk_send_delay.reset_mock()
        
        send_job_alert_task(job.id)
        
        # Should have created in-app notification for active students only
        notifications = Notification.objects.filter(notification_type='JOB_ALERT')
        assert notifications.count() == 2
        
        notified_user_ids = set(notifications.values_list('user_id', flat=True))
        assert student_user1.id in notified_user_ids
        assert student_user2.id in notified_user_ids
        assert inactive_student.id not in notified_user_ids
        assert admin_user.id not in notified_user_ids
        
        # Verify message details
        notif = notifications.first()
        assert "Acme Corp" in notif.title
        assert "Frontend Engineer" in notif.message
        assert "6.5" in notif.message
        
        # Verify bulk send was queued once with the list of notification IDs
        assert mock_bulk_send_delay.call_count == 1
        called_args = mock_bulk_send_delay.call_args[0][0]
        notification_ids = list(notifications.values_list('id', flat=True))
        assert set(str(nid) for nid in notification_ids) == set(called_args)


@pytest.mark.django_db
class TestApplicationStatusChangeNotifications:
    
    def test_notification_on_revert_placement(self):
        """
        Test that changing status from selected -> interviewing sends a revert notification.
        """
        from rest_framework.test import APIRequestFactory, force_authenticate
        from apps.applications.views import ApplicationViewSet
        from apps.applications.models import Application
        
        admin = baker.make(User, role='admin')
        student = baker.make(Student)
        job = baker.make(Job, company_name='Google', role='SWE')
        
        # Start placed
        app = baker.make(Application, student=student, job=job, status='selected')
        
        # Clear out other notifications if any
        Notification.objects.filter(user=student.user).delete()
        
        # Patch status to interviewing
        factory = APIRequestFactory()
        view = ApplicationViewSet.as_view({'patch': 'partial_update'})
        request = factory.patch(f'/api/applications/{app.id}/', {'status': 'interviewing'}, format='json')
        force_authenticate(request, user=admin)
        response = view(request, pk=app.id)
        
        assert response.status_code == 200
        
        # Verify notification was sent
        notifications = Notification.objects.filter(user=student.user, notification_type='APPLICATION_UPDATE')
        assert notifications.count() == 1
        notif = notifications.first()
        assert "Placement Update: Google" in notif.title
        assert "reverted" in notif.message
        assert "Interviewing" in notif.message

    def test_no_notification_on_normal_transitions(self):
        """
        Test that transitions other than revert placement (e.g. applied -> shortlisted)
        do not send status notifications.
        """
        from rest_framework.test import APIRequestFactory, force_authenticate
        from apps.applications.views import ApplicationViewSet
        from apps.applications.models import Application
        
        admin = baker.make(User, role='admin')
        student = baker.make(Student)
        job = baker.make(Job, company_name='Google', role='SWE')
        
        app = baker.make(Application, student=student, job=job, status='applied')
        
        # Clear notifications
        Notification.objects.filter(user=student.user).delete()
        
        # Patch status to shortlisted
        factory = APIRequestFactory()
        view = ApplicationViewSet.as_view({'patch': 'partial_update'})
        request = factory.patch(f'/api/applications/{app.id}/', {'status': 'shortlisted'}, format='json')
        force_authenticate(request, user=admin)
        response = view(request, pk=app.id)
        
        assert response.status_code == 200
        
        # Verify NO notification was sent
        notifications = Notification.objects.filter(user=student.user, notification_type='APPLICATION_UPDATE')
        assert notifications.count() == 0

    def test_no_notification_on_initial_placement(self):
        """
        Test that transitioning to placed (applied -> selected) does not send status notifications.
        """
        from rest_framework.test import APIRequestFactory, force_authenticate
        from apps.applications.views import ApplicationViewSet
        from apps.applications.models import Application
        
        admin = baker.make(User, role='admin')
        student = baker.make(Student)
        job = baker.make(Job, company_name='Google', role='SWE', openings_count=5)
        
        app = baker.make(Application, student=student, job=job, status='applied')
        
        # Clear notifications
        Notification.objects.filter(user=student.user).delete()
        
        # Patch status to selected
        factory = APIRequestFactory()
        view = ApplicationViewSet.as_view({'patch': 'partial_update'})
        request = factory.patch(f'/api/applications/{app.id}/', {'status': 'selected'}, format='json')
        force_authenticate(request, user=admin)
        response = view(request, pk=app.id)
        
        assert response.status_code == 200
        
        # Verify NO notification was sent
        notifications = Notification.objects.filter(user=student.user, notification_type='APPLICATION_UPDATE')
        assert notifications.count() == 0

    def test_notification_on_delete_placed_application(self):
        """
        Test that deleting a placed application (status selected) sends a revert notification.
        """
        from rest_framework.test import APIRequestFactory, force_authenticate
        from apps.applications.views import ApplicationViewSet
        from apps.applications.models import Application
        
        admin = baker.make(User, role='admin')
        student = baker.make(Student)
        job = baker.make(Job, company_name='Google', role='SWE')
        
        app = baker.make(Application, student=student, job=job, status='selected')
        
        Notification.objects.filter(user=student.user).delete()
        
        factory = APIRequestFactory()
        view = ApplicationViewSet.as_view({'delete': 'destroy'})
        request = factory.delete(f'/api/applications/{app.id}/')
        force_authenticate(request, user=admin)
        response = view(request, pk=app.id)
        
        assert response.status_code == 204
        
        # Verify notification was sent
        notifications = Notification.objects.filter(user=student.user, notification_type='APPLICATION_UPDATE')
        assert notifications.count() == 1
        notif = notifications.first()
        assert "Placement Update: Google" in notif.title
        assert "reverted" in notif.message

    def test_no_notification_on_delete_non_placed_application(self):
        """
        Test that deleting a non-placed application (status applied) does not send a notification.
        """
        from rest_framework.test import APIRequestFactory, force_authenticate
        from apps.applications.views import ApplicationViewSet
        from apps.applications.models import Application
        
        admin = baker.make(User, role='admin')
        student = baker.make(Student)
        job = baker.make(Job, company_name='Google', role='SWE')
        
        app = baker.make(Application, student=student, job=job, status='applied')
        
        Notification.objects.filter(user=student.user).delete()
        
        factory = APIRequestFactory()
        view = ApplicationViewSet.as_view({'delete': 'destroy'})
        request = factory.delete(f'/api/applications/{app.id}/')
        force_authenticate(request, user=admin)
        response = view(request, pk=app.id)
        
        assert response.status_code == 204
        
        # Verify NO notification was sent
        notifications = Notification.objects.filter(user=student.user, notification_type='APPLICATION_UPDATE')
        assert notifications.count() == 0


@pytest.mark.django_db
class TestEmailRetryMechanism:
    
    @patch('core.tasks.async_send_mail.retry')
    @patch('core.tasks.send_mail')
    def test_async_send_mail_retries_on_failure(self, mock_send_mail, mock_retry):
        from core.tasks import async_send_mail
        from celery.exceptions import Retry
        
        # Make send_mail raise an error
        mock_send_mail.side_effect = Exception("Brevo down")
        # Mock retry to raise Retry exception to simulate celery behavior
        mock_retry.side_effect = Retry("retry called", None)
        
        from django.conf import settings
        original_eager = getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False)
        try:
            settings.CELERY_TASK_ALWAYS_EAGER = False
            
            with pytest.raises(Retry):
                async_send_mail(
                    subject="Test subject",
                    message="Test message",
                    recipient_list=["test@student.com"]
                )
            
            # Assert retry was called
            mock_retry.assert_called_once()
        finally:
            settings.CELERY_TASK_ALWAYS_EAGER = original_eager

    @patch('core.tasks.async_send_mail.retry')
    @patch('core.tasks.send_mail')
    def test_async_send_mail_no_retry_on_config_error(self, mock_send_mail, mock_retry):
        from core.tasks import async_send_mail
        
        mock_send_mail.side_effect = ValueError("Brevo API key is not configured")
        
        from django.conf import settings
        original_eager = getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False)
        try:
            settings.CELERY_TASK_ALWAYS_EAGER = False
            
            with pytest.raises(ValueError, match="API key"):
                async_send_mail(
                    subject="Test subject",
                    message="Test message",
                    recipient_list=["test@student.com"]
                )
            
            # Assert retry was not called
            mock_retry.assert_not_called()
        finally:
            settings.CELERY_TASK_ALWAYS_EAGER = original_eager

    @patch('apps.applications.tasks.send_notification_email.retry')
    @patch('apps.applications.tasks.send_email_for_notification_object')
    def test_send_notification_email_retries_on_failure(self, mock_send_email_obj, mock_retry):
        from apps.applications.tasks import send_notification_email
        from celery.exceptions import Retry
        
        user = baker.make(User, email='test@test.com')
        notification = baker.make(Notification, user=user)
        
        mock_send_email_obj.side_effect = Exception("Brevo Down")
        mock_retry.side_effect = Retry("retry called", None)
        
        from django.conf import settings
        original_eager = getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False)
        try:
            settings.CELERY_TASK_ALWAYS_EAGER = False
            
            with pytest.raises(Retry):
                send_notification_email(notification.id)
                
            mock_retry.assert_called_once()
        finally:
            settings.CELERY_TASK_ALWAYS_EAGER = original_eager

    @patch('apps.applications.tasks.send_bulk_notification_emails.retry')
    @patch('apps.applications.tasks.get_connection')
    def test_send_bulk_notification_emails_retries_on_failure(self, mock_get_connection, mock_retry):
        from apps.applications.tasks import send_bulk_notification_emails
        from celery.exceptions import Retry
        
        user = baker.make(User, email='test@test.com')
        notification = baker.make(Notification, user=user)
        
        mock_conn = MagicMock()
        mock_conn.send_messages.side_effect = Exception("Connection refused")
        mock_get_connection.return_value = mock_conn
        
        mock_retry.side_effect = Retry("retry called", None)
        
        from django.conf import settings
        original_eager = getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False)
        try:
            settings.CELERY_TASK_ALWAYS_EAGER = False
            
            with pytest.raises(Retry):
                send_bulk_notification_emails([notification.id])
                
            mock_retry.assert_called_once()
        finally:
            settings.CELERY_TASK_ALWAYS_EAGER = original_eager


@pytest.mark.django_db
class TestEmailLimitsAndRotation:
    @patch('apps.applications.tasks.send_bulk_notification_emails.delay')
    def test_job_alert_capping_and_chunking(self, mock_bulk_send_delay):
        """
        Verify that send_job_alert_task respects the limit settings and chunks correctly.
        """
        from apps.applications.tasks import send_job_alert_task
        from django.conf import settings
        from django.utils import timezone
        
        # Make a batch of 25 active students with emails
        students = [
            baker.make(User, role='student', email=f'student_{i}@test.com', is_active=True)
            for i in range(25)
        ]
        
        job = baker.make(
            Job,
            company_name='Test Capping Corp',
            role='Software Engineer',
            package=12.0,
            location='Office',
            job_type='internal',
            listing_type='job',
            application_deadline=timezone.now() + timezone.timedelta(days=7),
            status='active'
        )
        
        # Override settings for the test
        original_limit = getattr(settings, 'JOB_ALERT_EMAIL_LIMIT', 200)
        try:
            # Set email limit to 15 (lower than 25 students)
            settings.JOB_ALERT_EMAIL_LIMIT = 15
            
            Notification.objects.all().delete()
            mock_bulk_send_delay.reset_mock()
            
            send_job_alert_task(job.id)
            
            # Capping: Total notifications should be 25, but emails should only be queued for 15
            notifications = Notification.objects.filter(notification_type='JOB_ALERT')
            assert notifications.count() == 25
            
            # Check mock_bulk_send_delay call
            # Total emails to send is 15. The chunk size is 200, so 15 fits in a single chunk.
            assert mock_bulk_send_delay.call_count == 1
            called_ids = mock_bulk_send_delay.call_args[0][0]
            assert len(called_ids) == 15
            
        finally:
            settings.JOB_ALERT_EMAIL_LIMIT = original_limit

    def test_brevo_rotation(self):
        """
        Verify that get_active_brevo_config correctly rotates when limit is reached.
        """
        from core.email_backends import get_active_brevo_config
        from core.models import SentEmailLog
        from django.conf import settings
        from django.utils import timezone
        
        # Setup rotation configs
        original_configs = getattr(settings, 'BREVO_ROTATION_CONFIG', [])
        original_limit = getattr(settings, 'BREVO_DAILY_LIMIT', 300)
        
        try:
            settings.BREVO_ROTATION_CONFIG = [
                {'api_key': 'key_alpha', 'from_email': 'alpha@ilead.net.in'},
                {'api_key': 'key_beta', 'from_email': 'beta@ilead.net.in'}
            ]
            settings.BREVO_DAILY_LIMIT = 10  # Low limit for testing
            
            # Clear logs
            SentEmailLog.objects.all().delete()
            
            # 1. No emails sent yet -> Should return first config (alpha)
            cfg = get_active_brevo_config()
            assert cfg['from_email'] == 'alpha@ilead.net.in'
            
            # 2. Send 4 emails under alpha -> Limit is 10 (buffer of 5, so threshold is 5).
            # 4 emails < 5, so it should still use alpha
            for _ in range(4):
                SentEmailLog.objects.create(
                    recipient='test@example.com',
                    subject='test',
                    api_key_used='key_alpha',
                    sender_email_used='alpha@ilead.net.in'
                )
            cfg = get_active_brevo_config()
            assert cfg['from_email'] == 'alpha@ilead.net.in'
            
            # 3. Send 1 more email (total 5) under alpha -> Reaches threshold (10 - 5 = 5)
            # Should rotate to beta
            SentEmailLog.objects.create(
                recipient='test@example.com',
                subject='test',
                api_key_used='key_alpha',
                sender_email_used='alpha@ilead.net.in'
            )
            cfg = get_active_brevo_config()
            assert cfg['from_email'] == 'beta@ilead.net.in'
            
        finally:
            settings.BREVO_ROTATION_CONFIG = original_configs
            settings.BREVO_DAILY_LIMIT = original_limit

