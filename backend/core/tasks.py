# core/tasks.py
import logging
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

@shared_task(bind=True, name='core.tasks.async_send_mail', max_retries=3, default_retry_delay=60)
def async_send_mail(self, subject, message, recipient_list, from_email=None, **kwargs):
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
        # If Celery is running in eager mode (synchronously), do not raise retry exception,
        # as it will bubble up and cause a server error in the HTTP request.
        if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            raise e

        # Do not retry configuration errors (like missing keys)
        if isinstance(e, ValueError) and ("API key" in str(e) or "configuration" in str(e).lower()):
            raise e

        # Re-raise the exception via self.retry to trigger a retry
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=2, default_retry_delay=60, name='core.tasks.process_student_csv_task')
def process_student_csv_task(self, log_id, temp_file_path, user_id):
    """
    Background Celery task to process student CSV imports.
    """
    import os
    import io
    import openpyxl
    from django.core.files.storage import default_storage
    from .models import User, CSVUploadLog
    from .csv_processor import process_csv
    from .views.helpers import log_audit
    
    logger.info(f"[CELERY] Starting process_student_csv_task for log {log_id}")
    try:
        log = CSVUploadLog.objects.get(pk=log_id)
        user = User.objects.get(pk=user_id)
        
        # Read the file content
        if not default_storage.exists(temp_file_path):
            raise FileNotFoundError(f"Temporary file {temp_file_path} not found.")
            
        with default_storage.open(temp_file_path, 'rb') as f:
            content = f.read()
            
        # Process CSV
        credentials, updated_log = process_csv(content, user, file_name=log.file_name, upload_log_id=log_id)
        
        # Generate credentials Excel in-memory
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Credentials"
        ws.append(['Name', 'Registration Number', 'Login ID', 'Email', 'Temporary Password'])
        for cred in credentials:
            ws.append([cred['name'], cred['registration_number'], cred['login_id'], cred['email'], cred['temporary_password']])
            
        # Auto-adjust column widths for premium layout
        import openpyxl.utils
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)
            
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        # Save output credentials excel using default_storage under a private prefix
        from django.core.files.base import ContentFile
        credentials_file_path = f"private_credentials/credentials_{log_id}.xlsx"
        default_storage.save(credentials_file_path, ContentFile(output.getvalue()))

        log_audit(user, 'csv_upload_complete', f"{log.file_name}: {updated_log.successful_records}/{updated_log.total_records}")
        logger.info(f"[CELERY] CSV processed successfully for log {log_id}. Excel saved to {credentials_file_path}.")
        
    except (FileNotFoundError, ValueError) as permanent_exc:
        # Permanent failure — file missing or bad data. Do not retry.
        logger.error(f"[CELERY] Permanent failure in process_student_csv_task: {permanent_exc}", exc_info=True)
        try:
            log = CSVUploadLog.objects.get(pk=log_id)
            log.status = 'failed'
            log.error_details = str(permanent_exc)
            log.save()
        except Exception as log_err:
            logger.error(f"[CELERY] Failed to update CSVUploadLog on permanent error: {log_err}")
    except Exception as e:
        logger.error(f"[CELERY] Failed to process CSV task: {e}", exc_info=True)
        # Update log status to failed
        try:
            log = CSVUploadLog.objects.get(pk=log_id)
            log.status = 'failed'
            log.error_details = str(e)
            log.save()
        except Exception as log_err:
            logger.error(f"[CELERY] Failed to update CSVUploadLog on error: {log_err}")
        # Retry on transient errors (DB lock, connection issues)
        raise self.retry(exc=e)
    finally:
        # Delete temp file from storage
        try:
            if default_storage.exists(temp_file_path):
                default_storage.delete(temp_file_path)
                logger.info(f"[CELERY] Deleted temporary CSV file: {temp_file_path}")
        except Exception as del_err:
            logger.error(f"[CELERY] Failed to delete temp file {temp_file_path}: {del_err}")
