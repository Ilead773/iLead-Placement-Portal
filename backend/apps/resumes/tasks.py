# apps/resumes/tasks.py
"""
Layer 2: Celery Async Tasks for Resume Operations

All heavy operations run asynchronously:
- PDF generation
- Resume parsing (uploaded PDFs)
- AI enhancement (future)
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=10, name='apps.resumes.tasks.generate_resume_pdf')
def generate_resume_pdf(self, resume_id, template_id):
    """
    Async: Generate PDF from canonical JSON + template.

    Retries up to 3 times with exponential backoff.
    """
    from apps.resumes.models import BuiltResume
    from apps.templates_engine.models import ResumeTemplate
    from apps.resume_engine.renderer import ResumeRenderer

    try:
        resume = BuiltResume.objects.get(id=resume_id)
        template = ResumeTemplate.objects.get(id=template_id)

        resume.start_processing()

        renderer = ResumeRenderer()
        pdf_bytes = renderer.render_pdf(resume.canonical_json, template, custom_html=resume.custom_html)

        if pdf_bytes:
            from django.core.files.base import ContentFile
            resume.generated_pdf.save(
                f"{resume.student_id}_{resume_id}.pdf",
                ContentFile(pdf_bytes),
                save=True,
            )
            resume.mark_generated()
            logger.info(f"PDF generated for resume {resume_id}")
            return {'status': 'success', 'resume_id': str(resume_id)}
        else:
            resume.mark_failed(error_message="PDF generation engine unavailable or failed.")
            return {'status': 'failed', 'resume_id': str(resume_id)}

    except Exception as exc:
        logger.error(f"PDF generation failed for {resume_id}: {exc}")
        try:
            resume = BuiltResume.objects.get(id=resume_id)
            resume.mark_failed(error_message=str(exc))
        except Exception:
            pass
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)


@shared_task(bind=True, max_retries=2, name='apps.resumes.tasks.parse_uploaded_resume')
def parse_uploaded_resume(self, upload_id):
    """
    Async: Parse an uploaded PDF to canonical JSON.
    """
    from apps.resumes.models import ResumeUpload
    from apps.resume_engine.normalizer import ResumeNormalizer
    from django.utils import timezone

    try:
        upload = ResumeUpload.objects.get(id=upload_id)
        upload.status = 'parsing'
        upload.save(update_fields=['status'])

        # Extract text and normalize from file stream for S3 compatibility
        normalizer = ResumeNormalizer()
        with upload.file.open('rb') as f:
            canonical = normalizer.normalize_from_file(f)

        upload.canonical_json = canonical
        upload.status = 'parsed'
        upload.parsed_at = timezone.now()
        upload.save(update_fields=['canonical_json', 'status', 'parsed_at'])

        logger.info(f"Upload {upload_id} parsed successfully")
        return {'status': 'success', 'upload_id': str(upload_id)}

    except Exception as exc:
        logger.error(f"Upload parsing failed for {upload_id}: {exc}")
        try:
            upload = ResumeUpload.objects.get(id=upload_id)
            upload.status = 'failed'
            upload.parsing_error = str(exc)
            upload.save(update_fields=['status', 'parsing_error'])
        except Exception:
            pass
        raise self.retry(exc=exc, countdown=5)


@shared_task(name='apps.resumes.tasks.cleanup_old_pdfs')
def cleanup_old_pdfs(days_old=30):
    """
    Periodic: Clean up generated PDFs older than N days.

    Canonical JSON is permanent — PDFs can always be regenerated.
    """
    from apps.resumes.models import BuiltResume
    from django.utils import timezone
    from datetime import timedelta

    cutoff = timezone.now() - timedelta(days=days_old)
    old_resumes = BuiltResume.objects.filter(
        generated_at__lt=cutoff,
        generated_pdf__isnull=False,
    ).exclude(generated_pdf='')

    count = 0
    for resume in old_resumes:
        if resume.generated_pdf:
            resume.generated_pdf.delete(save=False)
            resume.generated_pdf = None
            resume.save(update_fields=['generated_pdf'])
            count += 1

    logger.info(f"Cleaned up {count} old PDFs (older than {days_old} days)")
    return {'cleaned': count}
