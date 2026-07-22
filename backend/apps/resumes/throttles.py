# apps/resumes/throttles.py
"""
Layer 12: Rate Limiting for Resume Operations

Prevents abuse of expensive operations (PDF generation, uploads).
"""

import math
import time

from rest_framework.throttling import SimpleRateThrottle


class ResumeGenerationThrottle(SimpleRateThrottle):
    """3 resume generations per hour per user."""
    scope = 'resume_generation'
    rate = '3/hour'

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return f'throttle_resume_gen_{request.user.id}'

    def get_wait_time(self):
        """
        Returns a human-readable string describing how long the user must
        wait before they can generate another resume.
        e.g. '45 minutes', '1 hour'
        """
        wait_seconds = self.wait()
        if wait_seconds is None:
            return 'a short while'
        wait_minutes = math.ceil(wait_seconds / 60)
        if wait_minutes >= 60:
            return '1 hour'
        if wait_minutes == 1:
            return '1 minute'
        return f'{wait_minutes} minutes'


class ResumeUploadThrottle(SimpleRateThrottle):
    """5 uploads per hour per user."""
    scope = 'resume_upload'
    rate = '5/hour'

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return f'throttle_upload_{request.user.id}'


class ResumeDownloadThrottle(SimpleRateThrottle):
    """3 downloads per hour per user."""
    scope = 'resume_download'
    rate = '3/hour'

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return f'throttle_download_{request.user.id}'

    def get_wait_time(self):
        wait_seconds = self.wait()
        if wait_seconds is None:
            return 'a short while'
        wait_minutes = math.ceil(wait_seconds / 60)
        if wait_minutes >= 60:
            return '1 hour'
        if wait_minutes == 1:
            return '1 minute'
        return f'{wait_minutes} minutes'

