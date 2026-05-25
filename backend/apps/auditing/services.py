# apps/auditing/services.py
"""Audit logging service — used across all resume apps."""

import logging
from apps.common.utils import get_client_ip

logger = logging.getLogger(__name__)


class AuditLogService:
    """Service for creating audit log entries."""

    @staticmethod
    def log(actor, action, resource_type, resource_id, metadata=None, request=None):
        """
        Create an audit log entry.

        Args:
            actor: User performing the action
            action: Action type string (from ResumeAuditLog.ACTIONS)
            resource_type: 'resume', 'template', 'profile', 'upload'
            resource_id: ID of the affected resource
            metadata: Optional dict with additional context
            request: Optional HTTP request for IP/user agent
        """
        from .models import ResumeAuditLog

        ip_address = None
        user_agent = None

        if request:
            ip_address = get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')

        try:
            ResumeAuditLog.objects.create(
                actor=actor,
                action=action,
                resource_type=resource_type,
                resource_id=str(resource_id),
                metadata=metadata or {},
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception as exc:
            # Audit logging should never crash the main operation
            logger.error(f"Audit log failed: {exc}")
