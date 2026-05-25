# core/views/helpers.py
"""Shared helper functions for all view modules."""
import logging
from ..models import AuditLog

logger = logging.getLogger('core')


def get_client_ip(request):
    """Extract client IP from request headers."""
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')


def log_audit(user, action_str, details='', request=None):
    """Create an audit log entry."""
    AuditLog.objects.create(
        user=user,
        action=action_str,
        details=details,
        ip_address=get_client_ip(request) if request else None,
    )
