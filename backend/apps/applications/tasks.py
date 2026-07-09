import logging
from django.core.mail import send_mail, get_connection, EmailMultiAlternatives
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



@shared_task(bind=True, max_retries=3, name='apps.applications.tasks.send_notification_email')
def send_notification_email(self, notification_id):
    """
    Sends an email alert for a specific notification (single).
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        try:
            send_email_for_notification_object(notification)
            logger.info(f"Email sent successfully to {notification.user.email} for notification {notification_id}")
        except Exception as mail_exc:
            logger.error(f"Error sending email for notification {notification_id}: {mail_exc}")
            raise mail_exc
    except Notification.DoesNotExist:
        logger.error(f"Notification {notification_id} not found")
    except Exception as exc:
        logger.error(f"General error in send_notification_email: {exc}")
        # If Celery is running in eager mode (synchronously), do not raise retry exception,
        # as it will bubble up and cause a server error in the HTTP request.
        if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            raise exc
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3, name='apps.applications.tasks.send_bulk_notification_emails')
def send_bulk_notification_emails(self, notification_ids):
    """
    Sends emails for a batch of notification IDs in a SINGLE connection.
    Much faster than spawning one Celery task per notification.
    """
    if not notification_ids:
        return

    try:
        notifications = Notification.objects.filter(id__in=notification_ids).select_related('user')

        email_messages = []
        for notification in notifications:
            user = notification.user
            if not user.email:
                continue

            subject = f"iLEAD Portal Alert: {notification.title}"

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
                      <tr>
                        <td style="padding: 32px 24px 24px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                          <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #2563eb; letter-spacing: -0.03em;">iLEAD Placement Portal</h2>
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.1em; display: block; margin-top: 4px;">Student Alert Center</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 32px 24px;">
                          <p style="margin: 0 0 16px; font-size: 15px; font-weight: 600; color: #64748b;">Dear {user.name or 'Student'},</p>
                          <div style="background: linear-gradient(135deg, rgba(37, 99, 235, 0.02) 0%, rgba(59, 130, 246, 0.02) 100%); border: 1px solid rgba(37, 99, 235, 0.08); border-radius: 12px; padding: 20px; margin: 24px 0;">
                            <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 800; color: #1e3a8a;">📢 {notification.title}</h3>
                            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #334155; font-weight: 500;">{notification.message}</p>
                          </div>
                          <div style="text-align: center; margin: 32px 0 12px;">
                            <a href="{settings.FRONTEND_URL}{notification.action_url or '/'}" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: 700; border-radius: 99px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); display: inline-block;">View Details on Portal</a>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 24px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
                          <p style="font-size: 11px; color: #94a3b8; font-weight: 600; margin: 0 0 4px;">iLEAD Placement &amp; Training Cell</p>
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

            text_message = f"""Dear {user.name or 'Student'},

You have a new alert on the iLEAD Placement Portal:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📢  {notification.title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{notification.message}

👉 Click here to view details: {settings.FRONTEND_URL}{notification.action_url or '/'}

Best regards,
iLEAD Placement & Training Cell"""

            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email],
            )
            msg.attach_alternative(html_message, "text/html")
            email_messages.append(msg)

        if not email_messages:
            logger.info("send_bulk_notification_emails: no valid recipients, skipping.")
            return

        # Send ALL emails in a single connection (one API call batch)
        connection = get_connection()
        connection.send_messages(email_messages)
        logger.info(f"Bulk email sent: {len(email_messages)} emails dispatched in a single connection.")

    except Exception as exc:
        logger.error(f"Error in send_bulk_notification_emails: {exc}", exc_info=True)
        # If Celery is running in eager mode (synchronously), do not raise retry exception,
        # as it will bubble up and cause a server error in the HTTP request.
        if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            raise exc
        raise self.retry(exc=exc, countdown=60)

@shared_task(bind=True, max_retries=3, name='apps.applications.tasks.send_job_alert_task')
def send_job_alert_task(self, job_id):
    """
    Celery task: Fetches the newly published job, queries all active students,
    creates in-app notifications in bulk, and sends email alerts.

    Retries up to 3 times with exponential backoff (60s → 120s → 240s) on any
    transient error (DB lock, Redis hiccup, etc.).  A missing Job record is a
    permanent failure and is never retried.
    """
    from apps.jobs.models import Job
    from core.models import User
    from apps.applications.eligibility_engine import check_eligibility

    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        # Permanent failure — job was deleted before the task ran. Do not retry.
        logger.error(f"send_job_alert_task: Job {job_id} not found. Aborting (no retry).")
        return

    try:
        notifications_to_create = []
        ids_to_email = []

        from django.db.models import Q, Max
        from django.utils import timezone
        from apps.resumes.models import BuiltResume, ResumeUpload

        # Precompute database filters based on job eligibility rules to minimize student loop size
        rules = job.eligibility_rules or {}
        student_filter = Q(role='student', is_active=True)

        allowed_branches = rules.get('allowed_branches', [])
        if allowed_branches:
            student_filter &= Q(student_profile__course__in=allowed_branches)

        allowed_years = rules.get('allowed_years', [])
        if allowed_years:
            student_filter &= Q(student_profile__passing_year__in=allowed_years)

        raw_min_cgpa = rules.get('min_cgpa', 0)
        try:
            min_cgpa = float(raw_min_cgpa) if raw_min_cgpa not in (None, "") else 0.0
            if min_cgpa > 0:
                student_filter &= Q(student_profile__cgpa__gte=min_cgpa) | Q(student_profile__cgpa__isnull=True)
        except (ValueError, TypeError):
            pass

        raw_min_attendance = rules.get('min_attendance', 0)
        try:
            min_attendance = float(raw_min_attendance) if raw_min_attendance not in (None, "") else 0.0
            if min_attendance > 0:
                student_filter &= Q(student_profile__attendance__gte=min_attendance) | Q(student_profile__attendance__isnull=True)
        except (ValueError, TypeError):
            pass

        raw_max_backlogs = rules.get('max_backlogs', None)
        if raw_max_backlogs not in (None, ""):
            try:
                max_backlogs = int(raw_max_backlogs)
                student_filter &= Q(student_profile__backlogs_count__lte=max_backlogs)
            except (ValueError, TypeError):
                pass

        # Query all primary resumes in bulk to cache presence
        primary_built_student_ids = set(
            BuiltResume.objects.filter(is_primary=True, is_deleted=False).values_list('student_id', flat=True)
        )
        primary_uploaded_student_ids = set(
            ResumeUpload.objects.filter(is_primary=True, is_deleted=False).values_list('student_id', flat=True)
        )

        # Precompute max update timestamps grouped by student to avoid sequential aggregate queries
        max_built_map = {
            res['student_id']: res['max_updated']
            for res in BuiltResume.objects.values('student_id').annotate(max_updated=Max('updated_at'))
        }
        max_uploaded_map = {
            res['student_id']: res['max_updated']
            for res in ResumeUpload.objects.values('student_id').annotate(max_updated=Max('uploaded_at'))
        }

        # Process filtered students in chunks of 500 to keep memory low
        student_query = User.objects.filter(student_filter).select_related(
            'student_profile', 'student_profile__resume_profile'
        ).prefetch_related(
            'student_profile__resume_profile__skills'
        ).iterator(chunk_size=500)

        for student in student_query:
            # Skip if they don't have an email address
            if not student.email:
                continue

            student_profile = getattr(student, 'student_profile', None)
            if student_profile:
                # Pre-populate properties on Student model to prevent check_eligibility DB hits
                student_profile._has_primary_built = (student_profile.id in primary_built_student_ids)
                student_profile._has_primary_uploaded = (student_profile.id in primary_uploaded_student_ids)
                
                # Pre-populate max built/uploaded timestamp caches
                student_profile._max_built_updated_ts = max_built_map.get(
                    student_profile.id, timezone.datetime.fromtimestamp(0, tz=timezone.utc)
                ).timestamp()
                student_profile._max_uploaded_updated_ts = max_uploaded_map.get(
                    student_profile.id, timezone.datetime.fromtimestamp(0, tz=timezone.utc)
                ).timestamp()

                resume_profile = getattr(student_profile, 'resume_profile', None)
                if resume_profile:
                    # Pre-cache skills list
                    student_profile._skills_list = [s.name.lower() for s in resume_profile.skills.all()]

                # Skip ineligible students
                eligibility = check_eligibility(student_profile, job, ignore_profile_resume=True)
                if not eligibility['eligible']:
                    continue

            title = f"💼 New Opportunity: {job.company_name}!"
            if job.listing_type == 'internship':
                title = f"🎓 New Internship: {job.company_name}!"

            import re
            pkg_str = str(job.package).strip()
            if re.match(r'^\d+(?:\.\d+)?$', pkg_str):
                if job.listing_type == 'internship':
                    pkg_display = f"₹{pkg_str} / month"
                else:
                    pkg_display = f"{pkg_str} LPA"
            else:
                pkg_display = pkg_str

            message = (
                f"{job.company_name} is hiring for the role of {job.role} "
                f"({job.job_type.capitalize()}-Campus)!\n"
                f"Location: {job.location}\n"
                f"Package/Stipend: {pkg_display}\n"
                f"Deadline: {job.application_deadline.strftime('%b %d, %Y')}"
            )

            notifications_to_create.append(
                Notification(
                    user=student,
                    notification_type='JOB_ALERT',
                    title=title,
                    message=message,
                    priority='high',
                    action_url="/student/jobs"
                )
            )

            # When notifications_to_create list reaches 500, bulk create them
            if len(notifications_to_create) >= 500:
                created_notifications = Notification.objects.bulk_create(notifications_to_create, batch_size=500)
                # Collect email alert ids
                for notification in created_notifications:
                    student_user = notification.user
                    student_profile = getattr(student_user, 'student_profile', None)
                    resume_profile = getattr(student_profile, 'resume_profile', None) if student_profile else None
                    if resume_profile and not getattr(resume_profile, 'email_job_alerts', True):
                        continue
                    ids_to_email.append(str(notification.id))
                notifications_to_create = []

        # Create any remaining notifications
        if notifications_to_create:
            created_notifications = Notification.objects.bulk_create(notifications_to_create, batch_size=500)
            for notification in created_notifications:
                student_user = notification.user
                student_profile = getattr(student_user, 'student_profile', None)
                resume_profile = getattr(student_profile, 'resume_profile', None) if student_profile else None
                if resume_profile and not getattr(resume_profile, 'email_job_alerts', True):
                    continue
                ids_to_email.append(str(notification.id))

        # ✅ One single Celery task sends ALL emails in one batched connection
        if ids_to_email:
            send_bulk_notification_emails.delay(ids_to_email)

        logger.info(
            f"send_job_alert_task: Dispatched bulk job alert for job {job_id} "
            f"to eligible students. Email/push queued for {len(ids_to_email)} recipients."
        )

    except Exception as exc:
        # Exponential backoff: attempt 0 → 60s, attempt 1 → 120s, attempt 2 → 240s
        countdown = 60 * (2 ** self.request.retries)
        logger.error(
            f"send_job_alert_task: Error for job {job_id} (attempt "
            f"{self.request.retries + 1}/{self.max_retries + 1}): {exc}. "
            f"Retrying in {countdown}s.",
            exc_info=True,
        )
        # In eager mode (tests / synchronous execution), re-raise directly so we
        # don't wrap a MaxRetriesExceededError inside an HTTP 500.
        if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            raise exc
        raise self.retry(exc=exc, countdown=countdown)

@shared_task(bind=True, max_retries=3, default_retry_delay=30, name='apps.applications.tasks.process_application_status_change')
def process_application_status_change(self, application_id, old_status, new_status):
    """
    Background processing for application status changes.
    Creates an in-app notification for the student (which in turn triggers an
    email via the Notification post_save signal → send_notification_email task).

    Retries up to 3 times with a 30-second fixed delay on any transient error
    (e.g. DB lock, brief connection failure).  A missing Application record is
    a permanent failure and is never retried.
    """
    from .models import Application, Notification

    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        # Permanent failure — application deleted before task ran. Do not retry.
        logger.error(
            f"process_application_status_change: Application {application_id} not found. "
            f"Aborting (no retry)."
        )
        return

    try:
        student = application.student

        # Create in-app notification for student.
        # The Notification post_save signal will automatically queue an email
        # via send_notification_email.delay().
        Notification.objects.create(
            user=student.user,
            notification_type='APPLICATION_UPDATE',
            title=f"Application Update: {application.job.role}",
            message=(
                f"Your application status for {application.job.company_name} "
                f"has changed from {old_status} to {new_status}."
            ),
            priority='high' if new_status in ['shortlisted', 'selected', 'rejected'] else 'medium',
            action_url=f"/student/applications/{application.id}"
        )

        logger.info(
            f"process_application_status_change: Notification created for "
            f"application {application_id} ({old_status} → {new_status})."
        )

    except Exception as exc:
        logger.error(
            f"process_application_status_change: Error for application {application_id} "
            f"(attempt {self.request.retries + 1}/{self.max_retries + 1}): {exc}. "
            f"Retrying in {self.default_retry_delay}s.",
            exc_info=True,
        )
        # In eager mode (tests / synchronous execution), re-raise directly.
        if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            raise exc
        raise self.retry(exc=exc)

@shared_task(bind=True, max_retries=2, default_retry_delay=120, name='apps.applications.tasks.send_resumes_to_company_task')
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
            pin_code=getattr(log_obj, 'pin_code', None),
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

        # If Celery is running in eager mode (synchronously), do not raise retry exception,
        # as it will bubble up and cause a 500 server error in the HTTP request.
        if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            logger.error(f"Eager Celery task failed: {exc}")
            return {'status': 'failed', 'error': str(exc)}

        # In non-eager mode, do not retry configuration errors (like missing Resend key)
        if isinstance(exc, ValueError) and "Resend API key" in str(exc):
            logger.error(f"Configuration error, not retrying: {exc}")
            raise exc

        raise self.retry(exc=exc)


