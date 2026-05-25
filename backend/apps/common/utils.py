# apps/common/utils.py
"""
Shared utility functions for the Resume Engine.
"""

import logging

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """
    Extract real client IP from request, handling proxies.

    Checks X-Forwarded-For first (reverse proxy), then REMOTE_ADDR.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # First IP in the chain is the real client
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
