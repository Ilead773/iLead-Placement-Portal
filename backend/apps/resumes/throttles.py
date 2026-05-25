# apps/resumes/throttles.py
"""
Layer 12: Rate Limiting for Resume Operations

Prevents abuse of expensive operations (PDF generation, uploads).
"""

from rest_framework.throttling import SimpleRateThrottle


class ResumeGenerationThrottle(SimpleRateThrottle):
    """10 resume generations per hour per user."""
    scope = 'resume_generation'
    rate = '10/hour'

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return f'throttle_resume_gen_{request.user.id}'


class ResumeUploadThrottle(SimpleRateThrottle):
    """5 uploads per hour per user."""
    scope = 'resume_upload'
    rate = '5/hour'

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return f'throttle_upload_{request.user.id}'


class ResumeDownloadThrottle(SimpleRateThrottle):
    """30 downloads per hour per user."""
    scope = 'resume_download'
    rate = '30/hour'

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return f'throttle_download_{request.user.id}'
