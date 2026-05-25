# apps/auditing/models.py
"""
Layer 7: Enhanced Audit Logging for Resume Operations

Tracks all resume-domain actions with actor, resource, metadata,
IP address, and user agent for compliance and debugging.
"""

from django.db import models


class ResumeAuditLog(models.Model):
    """
    Audit trail for all resume operations.

    Complements the existing core.AuditLog with resume-specific
    action types and resource tracking.
    """

    ACTIONS = [
        ('resume_created', 'Resume Created'),
        ('resume_generated', 'Resume Generated'),
        ('resume_updated', 'Resume Updated'),
        ('resume_deleted', 'Resume Deleted'),
        ('resume_downloaded', 'Resume Downloaded'),
        ('resume_state_changed', 'Resume State Changed'),
        ('template_created', 'Template Created'),
        ('template_updated', 'Template Updated'),
        ('template_versioned', 'Template Version Created'),
        ('profile_updated', 'Profile Updated'),
        ('upload_processed', 'Upload Processed'),
        ('upload_failed', 'Upload Failed'),
        ('ai_enhancement', 'AI Enhancement Applied'),
    ]

    RESOURCE_TYPES = [
        ('resume', 'Resume'),
        ('template', 'Template'),
        ('profile', 'Profile'),
        ('upload', 'Upload'),
    ]

    id = models.BigAutoField(primary_key=True)
    actor = models.ForeignKey(
        'core.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='resume_audit_logs',
    )
    action = models.CharField(max_length=50, choices=ACTIONS)
    resource_type = models.CharField(max_length=50, choices=RESOURCE_TYPES)
    resource_id = models.CharField(max_length=100)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'resume_audit_logs'
        indexes = [
            models.Index(fields=['actor', 'action', 'created_at']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]
        ordering = ['-created_at']
        verbose_name = 'Resume Audit Log'
        verbose_name_plural = 'Resume Audit Logs'

    def __str__(self):
        return f"{self.actor} — {self.action} — {self.created_at}"
