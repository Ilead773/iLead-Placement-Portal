# apps/resumes/services.py
"""
Layer 5: Atomic Resume Generation Service

All resume operations are wrapped in database transactions.
If ANY step fails, the entire transaction rolls back cleanly.
"""

import logging
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


class ResumeGenerationService:
    """
    Core service for atomic resume generation.

    Orchestrates: normalize → create document → queue PDF → update profile → audit.
    """

    @transaction.atomic
    def generate_resume(self, student, title, template, canonical_json, user=None):
        """
        Atomically generate a new resume.

        Steps (all-or-nothing):
        1. Create BuiltResume with canonical JSON
        2. Queue async PDF generation
        3. Log audit trail

        Returns: BuiltResume instance
        """
        from apps.resumes.models import BuiltResume
        from apps.resumes.tasks import generate_resume_pdf

        try:
            is_first = not BuiltResume.objects.filter(student=student).exists()
            resume = BuiltResume.objects.create(
                student=student,
                title=title,
                canonical_json=canonical_json,
                template=template,
                state='draft',
                is_primary=is_first,
            )

            # Queue async PDF generation
            generate_resume_pdf.delay(str(resume.id), str(template.id))

            # Audit log
            self._log_audit(user or student.user, 'resume_created', resume)

            logger.info(f"Resume '{title}' created for student {student.id}")
            return resume

        except Exception as exc:
            logger.error(f"Resume generation failed: {exc}")
            raise

    @transaction.atomic
    def update_resume(self, resume, canonical_json=None, custom_html=None, user=None):
        """Atomically update resume canonical data or HTML and re-queue PDF."""
        from apps.resumes.tasks import generate_resume_pdf

        update_fields = ['state', 'updated_at']
        if canonical_json is not None:
            resume.canonical_json = canonical_json
            update_fields.append('canonical_json')
        if custom_html is not None:
            resume.custom_html = custom_html
            update_fields.append('custom_html')

        resume.state = 'draft'
        resume.save(update_fields=update_fields)
        
        # Queue async PDF generation
        generate_resume_pdf.delay(str(resume.id), str(resume.template_id))
        
        self._log_audit(user, 'resume_updated', resume)
        return resume

    @transaction.atomic
    def delete_resume(self, resume, user=None):
        """Atomically soft-delete a resume and auto-promote fallback."""
        was_primary = resume.is_primary
        resume.soft_delete(user=user)
        self._log_audit(user, 'resume_deleted', resume)

        if was_primary:
            from apps.resumes.models import BuiltResume, ResumeUpload
            latest_built = BuiltResume.objects.filter(student=resume.student).order_by('-created_at').first()
            latest_upload = ResumeUpload.objects.filter(student=resume.student).order_by('-uploaded_at').first()

            if latest_built and latest_upload:
                if latest_built.created_at > latest_upload.uploaded_at:
                    latest_built.set_as_primary()
                else:
                    latest_upload.set_as_primary()
            elif latest_built:
                latest_built.set_as_primary()
            elif latest_upload:
                latest_upload.set_as_primary()

    def _log_audit(self, user, action, resume):
        """Create audit log entry if auditing app is available."""
        try:
            from apps.auditing.services import AuditLogService
            AuditLogService.log(
                actor=user,
                action=action,
                resource_type='resume',
                resource_id=str(resume.id),
                metadata={
                    'title': resume.title,
                    'template_id': str(resume.template_id),
                    'state': resume.state,
                },
            )
        except ImportError:
            logger.debug("Auditing app not installed, skipping audit log")


class ResumeUploadService:
    """Service for handling resume uploads."""

    @transaction.atomic
    def upload_resume(self, student, file, user=None):
        """Upload and queue parsing of a resume PDF."""
        from apps.resumes.models import ResumeUpload
        from apps.resumes.tasks import parse_uploaded_resume

        upload = ResumeUpload.objects.create(
            student=student,
            file=file,
            original_filename=file.name,
            status='pending',
        )

        task = parse_uploaded_resume.delay(str(upload.id))
        logger.info(f"Upload {upload.id} queued for parsing (task: {task.id})")

        return upload

    @transaction.atomic
    def delete_upload(self, upload, user=None):
        """Atomically soft-delete an uploaded resume and auto-promote fallback."""
        was_primary = upload.is_primary
        upload.soft_delete(user=user)

        if was_primary:
            from apps.resumes.models import BuiltResume, ResumeUpload
            latest_built = BuiltResume.objects.filter(student=upload.student).order_by('-created_at').first()
            latest_upload = ResumeUpload.objects.filter(student=upload.student).order_by('-uploaded_at').first()

            if latest_built and latest_upload:
                if latest_built.created_at > latest_upload.uploaded_at:
                    latest_built.set_as_primary()
                else:
                    latest_upload.set_as_primary()
            elif latest_built:
                latest_built.set_as_primary()
            elif latest_upload:
                latest_upload.set_as_primary()

