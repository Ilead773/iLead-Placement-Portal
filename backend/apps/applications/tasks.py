import logging
import requests
from django.core.mail import send_mail
from celery import shared_task
from django.conf import settings
from .models import Notification

logger = logging.getLogger(__name__)

def send_email_for_notification_object(notification):
    """
    Core helper to send a beautifully styled HTML + text email for a single notification.
    """
    user = notification.user
    if not user.email:
        return False
        
    subject = f"iLEAD Portal Alert: {notification.title}"
    
    # Premium responsive HTML template
    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>{notification.title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              
              <!-- Header -->
              <tr>
                <td style="padding: 32px 24px 24px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                  <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #2563eb; letter-spacing: -0.03em;">iLEAD Placement Portal</h2>
                  <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.1em; display: block; margin-top: 4px;">Student Alert Center</span>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 32px 24px;">
                  <p style="margin: 0 0 16px; font-size: 15px; font-weight: 600; color: #64748b;">Dear {user.name or 'Student'},</p>
                  
                  <div style="background: linear-gradient(135deg, rgba(37, 99, 235, 0.02) 0%, rgba(59, 130, 246, 0.02) 100%); border: 1px solid rgba(37, 99, 235, 0.08); border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 800; color: #1e3a8a;">
                      📢 {notification.title}
                    </h3>
                    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #334155; font-weight: 500;">
                      {notification.message}
                    </p>
                  </div>
                  
                  <div style="text-align: center; margin: 32px 0 12px;">
                    <a href="{settings.FRONTEND_URL}{notification.action_url or '/'}" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: 700; border-radius: 99px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); display: inline-block;">
                      View Details on Portal
                    </a>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 24px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
                  <p style="font-size: 11px; color: #94a3b8; font-weight: 600; margin: 0 0 4px;">iLEAD Placement & Training Cell</p>
                  <p style="font-size: 10px; color: #cbd5e1; margin: 0;">This is an automated system email. Please do not reply directly to this message.</p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """
    
    # Premium text version fallback
    text_message = f"""
Dear {user.name or 'Student'},

You have a new alert on the iLEAD Placement Portal:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📢  {notification.title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{notification.message}

👉 Click here to view details: {settings.FRONTEND_URL}{notification.action_url or '/'}

Best regards,
iLEAD Placement & Training Cell
    """
    
    send_mail(
        subject=subject,
        message=text_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )
    return True

def send_push_for_notification_object(notification):
    """
    Sends a push notification via OneSignal REST API for a single notification.
    """
    app_id = getattr(settings, 'ONESIGNAL_APP_ID', '97a17b7a-8d2b-4daf-bba5-a0b16d31a1bb')
    rest_api_key = getattr(settings, 'ONESIGNAL_REST_API_KEY', '')
    
    if not rest_api_key:
        logger.warning("ONESIGNAL_REST_API_KEY not configured, skipping push notification.")
        return False
        
    user = notification.user
    external_id = str(user.id)
    
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": f"Basic {rest_api_key}"
    }
    
    payload = {
        "app_id": app_id,
        "include_aliases": {
            "external_id": [external_id]
        },
        "target_channel": "push",
        "headings": {"en": notification.title},
        "contents": {"en": notification.message},
    }
    
    if notification.action_url:
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        action_path = notification.action_url
        if not action_path.startswith('/') and not action_path.startswith('http'):
            action_path = f"/{action_path}"
        payload["url"] = f"{frontend_url.rstrip('/')}{action_path}"
        
    try:
        response = requests.post(
            "https://onesignal.com/api/v1/notifications",
            headers=headers,
            json=payload,
            timeout=10
        )
        response_data = response.json() if response.content else {}
        if response.status_code == 200:
            recipients = response_data.get('recipients', 0)
            if recipients == 0:
                logger.warning(
                    f"OneSignal push sent to user {user.id} but 0 recipients matched. "
                    f"The user may not have granted notification permission, or their browser is not subscribed. "
                    f"Response: {response_data}"
                )
            else:
                logger.info(f"OneSignal push sent successfully to user {user.id} ({recipients} device(s)) for notification {notification.id}")
            return True
        else:
            logger.error(
                f"OneSignal push FAILED for user {user.id}: HTTP {response.status_code} — {response_data}. "
                f"Check your ONESIGNAL_REST_API_KEY and ONESIGNAL_APP_ID."
            )
            return False
    except Exception as e:
        logger.error(f"Error calling OneSignal API for user {user.id}: {e}")
        return False


@shared_task(bind=True, max_retries=3)
def send_notification_email(self, notification_id):
    """
    Sends an email and a push notification for a specific notification.
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        
        # 1. Send Email Alert
        try:
            send_email_for_notification_object(notification)
            logger.info(f"Email sent successfully to {notification.user.email} for notification {notification_id}")
        except Exception as mail_exc:
            logger.error(f"Error sending email for notification {notification_id}: {mail_exc}")
            
        # 2. Send OneSignal Push Notification
        try:
            send_push_for_notification_object(notification)
        except Exception as push_exc:
            logger.error(f"Error sending push for notification {notification_id}: {push_exc}")
            
    except Notification.DoesNotExist:
        logger.error(f"Notification {notification_id} not found")
    except Exception as exc:
        logger.error(f"General error in send_notification_email: {exc}")
        raise self.retry(exc=exc, countdown=60)

@shared_task
def send_job_alert_task(job_id):
    """
    Celery task: Fetches the newly published job, queries all active students,
    creates in-app notifications in bulk, and sends email alerts.
    """
    from apps.jobs.models import Job
    from core.models import User
    from apps.applications.eligibility_engine import check_eligibility
    
    try:
        job = Job.objects.get(id=job_id)
        students = User.objects.filter(role='student', is_active=True).select_related('student_profile')
        
        notifications_to_create = []
        for student in students:
            # Skip if they don't have an email address
            if not student.email:
                continue
            
            student_profile = getattr(student, 'student_profile', None)
            if student_profile:
                # Skip ineligible students
                eligibility = check_eligibility(student_profile, job, ignore_profile_resume=True)
                if not eligibility['eligible']:
                    continue
            
            title = f"💼 New Opportunity: {job.company_name}!"
            if job.listing_type == 'internship':
                title = f"🎓 New Internship: {job.company_name}!"
                
            message = f"{job.company_name} is hiring for the role of {job.role} ({job.job_type.capitalize()}-Campus)!\nLocation: {job.location}\nPackage/Stipend: {job.package} LPA\nDeadline: {job.application_deadline.strftime('%b %d, %Y')}"
            
            notifications_to_create.append(
                Notification(
                    user=student,
                    notification_type='JOB_ALERT',
                    title=title,
                    message=message,
                    priority='high',
                    action_url=f"/student/jobs"
                )
            )
            
        # Bulk create in-app notifications
        if notifications_to_create:
            created_notifications = Notification.objects.bulk_create(notifications_to_create)
            
            # Send emails and push notifications for all en-routed notifications
            for notification in created_notifications:
                try:
                    send_email_for_notification_object(notification)
                except Exception as mail_err:
                    logger.error(f"Failed to email job alert to {notification.user.email}: {mail_err}")
                
                try:
                    send_push_for_notification_object(notification)
                except Exception as push_err:
                    logger.error(f"Failed to send push job alert to {notification.user.email}: {push_err}")
                    
        logger.info(f"Dispatched bulk job alert for job {job_id} to {len(notifications_to_create)} students.")
        
    except Job.DoesNotExist:
        logger.error(f"Job {job_id} not found for alert task")
    except Exception as exc:
        logger.error(f"Error in send_job_alert_task: {exc}")

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
    log_id=None,
    *args,
    **kwargs
):
    """
    Celery task: fetches pre-created ResumeEmailLog, retrieves student resumes,
    sends HTML email to company containing the master link, and logs status.
    """
    try:
        from apps.applications.models import Application, ResumeEmailLog
        from core.models import User
        from apps.applications.email_sender import build_resume_email

        actual_log_id = log_id or kwargs.get('log_id') or (args[0] if args else None)
        if not actual_log_id:
            raise ValueError("No 'log_id' was supplied to the task.")

        log_obj = ResumeEmailLog.objects.get(id=actual_log_id)

        # Fetch applications with related data in one query
        applications = list(
            Application.objects.filter(
                id__in=log_obj.application_ids
            ).select_related(
                'student', 'student__user'
            )
        )

        if not applications:
            raise ValueError("No applications found for given IDs.")

        # Build and send email
        email_obj, attached_count, skipped = build_resume_email(
            to_email=log_obj.company_email,
            subject=log_obj.subject,
            body=log_obj.body,
            applications=applications,
            cc_emails=log_obj.cc_emails,
            log_id=str(log_obj.id),
        )

        email_obj.send(fail_silently=False)

        # Update log success
        log_obj.resumes_attached = attached_count
        log_obj.skipped_students = skipped
        log_obj.status = 'sent'
        log_obj.save()

        return {
            'status': 'sent',
            'resumes_attached': attached_count,
            'skipped': skipped,
        }

    except Exception as exc:
        # Log failure
        try:
            from apps.applications.models import ResumeEmailLog
            log_obj = ResumeEmailLog.objects.filter(id=log_id).first()
            if log_obj:
                log_obj.status = 'failed'
                log_obj.error_message = str(exc)
                log_obj.save()
        except Exception as log_err:
            logger.error(f"Could not log email failure: {log_err}")

        raise self.retry(exc=exc)


