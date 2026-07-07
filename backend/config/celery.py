# config/celery.py
"""
Layer 2: Celery Configuration for Async Job Processing

Handles:
- PDF generation (heavy I/O)
- Resume parsing (OCR + AI)
- AI enhancement (API calls)
- Periodic cleanup tasks
"""

import os
from celery import Celery

try:
    import dotenv
    dotenv.load_dotenv()
except ImportError:
    pass

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('resume_engine')

# Load config from Django settings, namespace CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()

# Task execution limits
app.conf.update(
    task_soft_time_limit=300,       # 5 min soft limit
    task_time_limit=600,            # 10 min hard limit
    worker_prefetch_multiplier=1,   # Fair scheduling
    worker_max_tasks_per_child=1000,  # Restart worker after 1000 tasks (memory leak prevention)
)

# ─── Celery Beat Schedule ────────────────────────────────────────────
from celery.schedules import crontab

app.conf.beat_schedule = {
    'nightly-job-scrape': {
        'task': 'scraped_jobs.tasks.run_nightly_scrape',
        'schedule': crontab(day_of_month='*/3', hour=17, minute=30),  # Every 3 days at 11:00 PM IST (17:30 UTC)
        'options': {'expires': 3600},
    },
    'deactivate-expired-jobs': {
        'task': 'scraped_jobs.tasks.deactivate_expired_jobs',
        'schedule': crontab(hour='*/6', minute=0),
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task for testing Celery connectivity."""
    print(f'Request: {self.request!r}')

