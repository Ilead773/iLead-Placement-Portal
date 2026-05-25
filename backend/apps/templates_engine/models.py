# apps/templates_engine/models.py
"""
Layer 3: Template Versioning & Immutability

ResumeTemplate: Immutable template definitions with version tracking.
Never edit existing templates — create new versions instead.

ResumeSnapshot: Frozen snapshot of resume + template at a point in time.
Ensures old resumes always render correctly regardless of template changes.
"""

import uuid
import logging

from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models import SoftDeleteModel
from .validators import TemplateSecurityValidator

logger = logging.getLogger(__name__)


class ResumeTemplate(SoftDeleteModel):
    """
    Immutable resume template definition.

    Strategy: Never edit. Create a new version via create_new_version().
    Old versions are deactivated but preserved for snapshot rendering.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    html_template = models.TextField(help_text='Jinja2/Django template HTML')
    css_styles = models.TextField(help_text='CSS styles for the template')
    version = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        'core.User', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='created_templates',
    )

    class Meta:
        db_table = 'resume_templates'
        unique_together = ('name', 'version')
        indexes = [
            models.Index(fields=['is_active', 'created_at']),
        ]
        ordering = ['-created_at']
        verbose_name = 'Resume Template'

    def __str__(self):
        return f"{self.name} v{self.version}"

    def clean(self):
        """Validate template security on save."""
        super().clean()
        try:
            self.html_template, self.css_styles = (
                TemplateSecurityValidator.validate_template(
                    self.html_template, self.css_styles
                )
            )
        except ValueError as exc:
            raise ValidationError(f"Template security check failed: {exc}")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @classmethod
    def create_new_version(cls, existing_template, created_by=None, **overrides):
        """
        Create a new version of an existing template.

        The old version is deactivated. The new version inherits
        all fields unless overridden.
        """
        new_data = {
            'name': existing_template.name,
            'description': existing_template.description,
            'html_template': existing_template.html_template,
            'css_styles': existing_template.css_styles,
            'version': existing_template.version + 1,
            'is_active': True,
            'created_by': created_by,
        }
        new_data.update(overrides)

        new_template = cls.objects.create(**new_data)

        existing_template.is_active = False
        existing_template.save(update_fields=['is_active'])

        logger.info(
            f"Template '{existing_template.name}' upgraded: "
            f"v{existing_template.version} → v{new_template.version}"
        )
        return new_template


class ResumeSnapshot(SoftDeleteModel):
    """
    Immutable snapshot of a resume rendered with a specific template version.

    Ensures old resumes always render correctly even if the template
    is later updated or deleted.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    built_resume = models.ForeignKey(
        'resumes.BuiltResume',
        on_delete=models.CASCADE,
        related_name='snapshots',
    )
    template = models.ForeignKey(
        ResumeTemplate,
        on_delete=models.PROTECT,
        related_name='snapshots',
    )
    template_snapshot = models.JSONField(
        help_text='Full template state (HTML+CSS) frozen at snapshot time.',
    )
    rendered_html = models.TextField(
        help_text='Fully rendered HTML output at snapshot time.',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'resume_snapshots'
        indexes = [
            models.Index(fields=['built_resume', 'created_at']),
        ]
        ordering = ['-created_at']
        verbose_name = 'Resume Snapshot'

    def __str__(self):
        return f"Snapshot {self.id} — {self.template}"
