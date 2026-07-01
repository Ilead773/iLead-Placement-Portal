# apps/resumes/models.py
"""
Layer 1 + 9: Resume Models — Canonical JSON + Multi-Resume Support

BuiltResume: Individual built resume with canonical JSON, state machine,
             and multi-resume support (students can have multiple versions).

ResumeUpload: Uploaded PDF resume with parsing status tracking.
"""

import uuid
from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils import timezone

from apps.common.models import SoftDeleteModel
from .states import ResumeState, ResumeStateMachine


class BuiltResume(SoftDeleteModel):
    """
    Individual built resume. Students can have multiple active versions.

    Examples:
        "Tech Company ATS" — optimized for tracking systems
        "Product Manager"  — highlights PM experience
        "One-Pager"        — condensed version
        "Academic"         — emphasizes research
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        'core.Student', on_delete=models.CASCADE,
        related_name='built_resumes',
    )
    title = models.CharField(
        max_length=200,
        help_text="e.g., 'Tech Company ATS', 'Product Manager', 'One-Pager'",
    )
    description = models.TextField(blank=True, default='')

    # Layer 1: Canonical resume data (THE source of truth)
    canonical_json = models.JSONField(
        default=dict,
        help_text='Canonical resume format — all operations use this.',
    )

    # Optional overrides for WYSIWYG editing
    custom_html = models.TextField(
        blank=True, null=True,
        help_text='If provided, this HTML is used directly to generate the PDF instead of canonical_json.'
    )

    # Template reference
    template = models.ForeignKey(
        'templates_engine.ResumeTemplate',
        on_delete=models.PROTECT,
        related_name='resumes',
    )

    # Layer 10: State machine
    state = models.CharField(
        max_length=20,
        choices=ResumeState.CHOICES,
        default=ResumeState.DRAFT,
    )
    error_message = models.TextField(
        blank=True, default='',
        help_text='Error reason if state=failed.',
    )

    # Layer 9: Multi-resume support
    is_primary = models.BooleanField(
        default=False,
        help_text='Default resume shown to employers.',
    )

    # Generated output (Layer 4: cache, regenerate on demand)
    generated_pdf = models.FileField(
        upload_to='resumes/generated/%Y/%m/',
        null=True, blank=True,
        help_text='Cached PDF. Can be regenerated from canonical_json.',
    )

    # Celery task tracking
    celery_task_id = models.CharField(max_length=255, blank=True, default='')

    # Metrics
    generated_at = models.DateTimeField(null=True, blank=True)
    downloaded_count = models.IntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'built_resumes'
        indexes = [
            models.Index(fields=['student', 'is_primary', 'state']),
        ]
        unique_together = ('student', 'title')
        ordering = ['-is_primary', '-created_at']

    def __str__(self):
        return f"{self.student.name} — {self.title} ({self.state})"

    # ─── State Machine Helpers ───────────────────────────────────

    def get_state_machine(self):
        return ResumeStateMachine(self)

    def start_processing(self):
        self.get_state_machine().start_processing()

    def mark_generated(self):
        self.generated_at = timezone.now()
        self.save(update_fields=['generated_at'])
        self.get_state_machine().mark_generated()

    def mark_failed(self, error_message=''):
        self.get_state_machine().mark_failed(error_message)

    def activate(self):
        self.get_state_machine().activate()

    def archive(self):
        self.is_primary = False
        self.save(update_fields=['is_primary'])
        self.get_state_machine().archive()

    # ─── Multi-Resume Helpers ────────────────────────────────────

    def set_as_primary(self):
        """Make this the primary resume, unsetting all others (built or uploaded)."""
        from django.db import transaction
        with transaction.atomic():
            BuiltResume.objects.filter(
                student=self.student
            ).exclude(id=self.id).update(is_primary=False)
            
            from .models import ResumeUpload
            ResumeUpload.objects.filter(student=self.student).update(is_primary=False)
            
            self.is_primary = True
            self.save(update_fields=['is_primary'])

    def increment_download(self):
        BuiltResume.objects.filter(pk=self.pk).update(downloaded_count=models.F('downloaded_count') + 1)
        self.refresh_from_db(fields=['downloaded_count'])


class ResumeUpload(SoftDeleteModel):
    """
    Uploaded resume PDF with parsing status.

    Flow: Upload → Parse (async) → canonical_json → Available for import
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        'core.Student', on_delete=models.CASCADE,
        related_name='resume_uploads',
    )
    file = models.FileField(
        upload_to='resumes/uploads/%Y/%m/',
        validators=[FileExtensionValidator(allowed_extensions=['pdf'])],
    )
    original_filename = models.CharField(max_length=255, blank=True, default='')

    # Parsed canonical data
    canonical_json = models.JSONField(null=True, blank=True)

    # Parsing status
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('parsing', 'Parsing'),
        ('parsed', 'Parsed'),
        ('failed', 'Failed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    parsing_error = models.TextField(blank=True, default='')

    uploaded_at = models.DateTimeField(auto_now_add=True)
    parsed_at = models.DateTimeField(null=True, blank=True)
    
    # Layer 9: Multi-resume support
    is_primary = models.BooleanField(
        default=False,
        help_text='Default resume shown to employers.',
    )

    class Meta:
        db_table = 'resume_uploads'
        indexes = [
            models.Index(fields=['student', 'uploaded_at']),
        ]
        ordering = ['-is_primary', '-uploaded_at']

    def __str__(self):
        return f"Upload: {self.original_filename} ({self.status})"

    def set_as_primary(self):
        """Make this the primary resume, unsetting all others (built or uploaded)."""
        from django.db import transaction
        with transaction.atomic():
            ResumeUpload.objects.filter(
                student=self.student
            ).exclude(id=self.id).update(is_primary=False)
            
            from .models import BuiltResume
            BuiltResume.objects.filter(student=self.student).update(is_primary=False)
            
            self.is_primary = True
            self.save(update_fields=['is_primary'])
