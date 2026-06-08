# apps/observability/monitoring.py
"""
Layer 14: Performance Monitoring & Observability

Provides:
- PerformanceMonitor decorator for timing operations
- Structured logging helpers
- Health check utilities
"""

import time
import logging
import functools

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """Monitor operation performance with automatic logging."""

    @staticmethod
    def measure(operation_name):
        """
        Decorator to measure and log operation duration.

        Usage:
            @PerformanceMonitor.measure("resume_generation")
            def generate_resume_pdf(resume_id):
                ...
        """
        def decorator(func):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                start = time.time()
                try:
                    result = func(*args, **kwargs)
                    duration = time.time() - start
                    logger.info(
                        f"[PERF] {operation_name} completed",
                        extra={
                            'operation': operation_name,
                            'duration_seconds': round(duration, 3),
                            'status': 'success',
                        },
                    )
                    return result
                except Exception as exc:
                    duration = time.time() - start
                    logger.error(
                        f"[PERF] {operation_name} failed after {duration:.3f}s: {exc}",
                        extra={
                            'operation': operation_name,
                            'duration_seconds': round(duration, 3),
                            'status': 'failed',
                            'error': str(exc),
                        },
                    )
                    raise
            return wrapper
        return decorator


def health_check():
    """
    System health check — verify all dependencies are accessible.

    Returns dict with status of each subsystem.
    """
    health = {'status': 'healthy', 'checks': {}}

    # Database
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health['checks']['database'] = 'ok'
    except Exception as exc:
        health['checks']['database'] = f'error: {exc}'
        health['status'] = 'unhealthy'

    # Redis / Cache
    try:
        from django.core.cache import cache
        cache.set('health_check', 'ok', 10)
        val = cache.get('health_check')
        health['checks']['cache'] = 'ok' if val == 'ok' else 'error'
    except Exception as exc:
        health['checks']['cache'] = f'error: {exc}'

    # Celery
    try:
        from django.conf import settings
        if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            health['checks']['celery'] = 'always_eager (no workers required)'
        else:
            from config.celery import app as celery_app
            inspector = celery_app.control.inspect()
            stats = inspector.stats()
            health['checks']['celery'] = 'ok' if stats else 'no workers'
    except Exception as exc:
        health['checks']['celery'] = f'error: {exc}'

    return health
