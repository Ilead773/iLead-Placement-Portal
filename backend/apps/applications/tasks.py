import logging
from django.core.mail import send_mail
from celery import shared_task
from django.conf import settings
from .models import Notification

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def send_notification_email(self, notification_id):
    """
    Sends an email for a specific notification.
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        user = notification.user
        
        subject = f"Placement Portal: {notification.title}"
        message = notification.message
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
        
        logger.info(f"Email sent successfully to {user.email} for notification {notification_id}")
        
    except Notification.DoesNotExist:
        logger.error(f"Notification {notification_id} not found")
    except Exception as exc:
        logger.error(f"Error sending email: {exc}")
        raise self.retry(exc=exc, countdown=60)

@shared_task
def process_application_status_change(application_id, old_status, new_status):
    """
    Background processing for application status changes.
    Can trigger notifications, update stats, etc.
    """
    from .models import Application, Notification
    try:
        application = Application.objects.get(id=application_id)
        student = application.student
        
        # Create notification for student
        Notification.objects.create(
            user=student.user,
            notification_type='APPLICATION_UPDATE',
            title=f"Application Update: {application.job.role}",
            message=f"Your application status for {application.job.company_name} has changed from {old_status} to {new_status}.",
            priority='high' if new_status in ['shortlisted', 'selected', 'rejected'] else 'medium',
            action_url=f"/student/applications/{application.id}"
        )
        
    except Application.DoesNotExist:
        logger.error(f"Application {application_id} not found")

@shared_task(bind=True, max_retries=2, default_retry_delay=120)
def send_resumes_to_company_task(
    self,
    application_ids: list,
    company_email: str,
    subject: str,
    body: str,
    cc_emails: list,
    sent_by_user_id: str,
    job_id: str,
):
    """
    Celery task: fetches applications, builds email with PDF attachments,
    sends to company. Creates a ResumeEmailLog record on completion.
    """
    try:
        from apps.applications.models import Application, ResumeEmailLog
        from core.models import User
        from apps.applications.email_sender import build_resume_email

        # Fetch applications with related data in one query
        applications = list(
            Application.objects.filter(
                id__in=application_ids
            ).select_related(
                'student', 'student__user'
            )
        )

        if not applications:
            raise ValueError("No applications found for given IDs.")

        # Build and send email
        email_obj, attached_count, skipped = build_resume_email(
            to_email=company_email,
            subject=subject,
            body=body,
            applications=applications,
            cc_emails=cc_emails,
        )

        email_obj.send(fail_silently=False)

        # Log success
        sent_by = User.objects.get(id=sent_by_user_id)
        student_names = [app.student.name for app in applications]
        str_app_ids = [str(uid) for uid in application_ids]

        ResumeEmailLog.objects.create(
            sent_by=sent_by,
            job_id=job_id,
            company_email=company_email,
            subject=subject,
            body=body,
            cc_emails=cc_emails,
            application_ids=str_app_ids,
            student_names=student_names,
            resumes_attached=attached_count,
            skipped_students=skipped,
            status='sent',
            error_message=None,
        )

        return {
            'status': 'sent',
            'resumes_attached': attached_count,
            'skipped': skipped,
        }

    except Exception as exc:
        # Log failure
        try:
            from apps.applications.models import ResumeEmailLog
            from core.models import User
            sent_by = User.objects.get(id=sent_by_user_id)
            str_app_ids = [str(uid) for uid in application_ids]
            ResumeEmailLog.objects.create(
                sent_by=sent_by,
                job_id=job_id,
                company_email=company_email,
                subject=subject,
                body=body,
                cc_emails=cc_emails,
                application_ids=str_app_ids,
                student_names=[],
                resumes_attached=0,
                skipped_students=[],
                status='failed',
                error_message=str(exc),
            )
        except Exception as log_err:
            logger.error(f"Could not log email failure: {log_err}")

        if isinstance(exc, ValueError):
            raise exc
            
        from django.conf import settings
        if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            raise exc

        raise self.retry(exc=exc)
