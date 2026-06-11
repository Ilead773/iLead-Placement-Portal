# core/tasks.py
import logging
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

@shared_task(name='core.tasks.async_send_mail', max_retries=3)
def async_send_mail(subject, message, recipient_list, from_email=None, **kwargs):
    """
    Asynchronous task to send an email.
    """
    if from_email is None:
        from_email = settings.DEFAULT_FROM_EMAIL
        
    try:
        # We ensure recipient_list is a list
        if isinstance(recipient_list, str):
            recipient_list = [recipient_list]
            
        result = send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            **kwargs
        )
        logger.info(f"[CELERY] Sent email to {recipient_list}: subject '{subject}'")
        return result
    except Exception as e:
        logger.error(f"[CELERY] Failed to send email to {recipient_list}: {e}", exc_info=True)
        # Re-raise the exception to trigger a retry
        raise e
