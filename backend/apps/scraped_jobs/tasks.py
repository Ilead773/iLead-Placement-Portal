# apps/scraped_jobs/tasks.py
"""
Celery tasks for the nightly scraping pipeline.
"""

from celery import shared_task, group
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name='scraped_jobs.tasks.run_nightly_scrape',
    max_retries=1,
    default_retry_delay=300,
    soft_time_limit=3600,
    time_limit=4000,
)
def run_nightly_scrape(self):
    """
    Nightly scheduled task. Calls orchestrator which fans out scraping.
    Uses Redis lock inside orchestrator to prevent double-trigger.
    """
    logger.info(f"[Task] Nightly scrape started at {datetime.now(timezone.utc)}")
    try:
        from apps.scraped_jobs.orchestrator import ScrapingOrchestrator
        orchestrator = ScrapingOrchestrator()
        run = orchestrator.run_full_scrape()
        return {
            'run_id': run.id,
            'status': run.status,
            'total_saved': run.total_saved,
            'courses_failed': run.courses_failed,
            'api_calls': run.api_calls_made,
        }
    except Exception as exc:
        logger.error(f"[Task] Nightly scrape failed: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    name='scraped_jobs.tasks.scrape_pool_task',
    max_retries=2,
    default_retry_delay=60,
    soft_time_limit=600,
    time_limit=700,
)
def scrape_pool_task(self, pool_name, run_id):
    """
    Parallel pool scraping task. One task per SEARCH_POOL.
    Used in run_parallel_scrape() to achieve true parallelism.
    """
    try:
        from apps.scraped_jobs.orchestrator import ScrapingOrchestrator
        from apps.scraped_jobs.scrapers.jsearch_scraper import SEARCH_POOLS
        from apps.scraped_jobs.course_config import (
            get_active_config, SCRAPER_STRATEGIES,
        )

        orchestrator = ScrapingOrchestrator()
        active_config = get_active_config()
        pool_config = SEARCH_POOLS.get(pool_name)
        if not pool_config:
            return {'pool': pool_name, 'error': 'pool not found'}

        is_internship = pool_config.get('is_internship', False)
        employment_type = 'INTERN' if is_internship else 'FULLTIME'
        pool_jobs_raw = []
        for query in pool_config['queries']:
            raw = orchestrator.jsearch._fetch_page_cached(
                query=query, employment_type=employment_type,
                date_posted='3days', num_pages=1,
            )
            pool_jobs_raw.extend(raw)

        results_by_course = {course: [] for course in pool_config['courses']}
        for raw_job in pool_jobs_raw:
            title = raw_job.get('job_title', '')
            description = raw_job.get('job_description', '') or ''
            course_scores = orchestrator.jsearch.classify_job_to_courses(
                title, description, active_config
            )
            classified = {c: s for c, s in course_scores}
            for cn in pool_config['courses']:
                if cn not in classified:
                    classified[cn] = 0.5
            for course_name, relevance_score in classified.items():
                if course_name not in results_by_course:
                    continue
                parsed = orchestrator.jsearch._parse_jsearch_job(
                    raw_job, course_name, is_internship, relevance_score
                )
                if parsed:
                    results_by_course[course_name].append(parsed)

        pool_stats = {}
        for course_name, jobs in results_by_course.items():
            strategy = SCRAPER_STRATEGIES.get(course_name, SCRAPER_STRATEGIES['DEFAULT'])
            stats = orchestrator._process_course(
                course_name=course_name, jsearch_jobs=jobs, strategy=strategy,
                api_calls={'jsearch': 0, 'adzuna': 0, 'greenhouse': 0, 'lever': 0},
            )
            pool_stats[course_name] = stats

        return {'pool': pool_name, 'stats': pool_stats}
    except Exception as exc:
        logger.error(f"[PoolTask:{pool_name}] Failed: {exc}", exc_info=True)
        raise self.retry(exc=exc)


def run_parallel_scrape():
    """
    True parallel entry point. Fans out one Celery task per SEARCH_POOL.
    """
    from apps.scraped_jobs.scrapers.jsearch_scraper import SEARCH_POOLS
    from apps.scraped_jobs.models import ScrapingRun
    from django.core.cache import cache

    if cache.get('nightly_scrape_lock'):
        logger.warning("[ParallelScrape] Lock held. Aborting.")
        return None

    run = ScrapingRun.objects.create(status='running')
    cache.set('nightly_scrape_lock', True, timeout=3600)

    pool_names = list(SEARCH_POOLS.keys())
    job = group(scrape_pool_task.s(pool_name, run.id) for pool_name in pool_names)
    return job.apply_async()


@shared_task(name='scraped_jobs.tasks.deactivate_expired_jobs')
def deactivate_expired_jobs():
    """
    Safety task — runs every 6 hours. Deactivates (NOT deletes) expired jobs.
    """
    from apps.scraped_jobs.orchestrator import ScrapingOrchestrator
    orch = ScrapingOrchestrator()
    count = orch._deactivate_expired_jobs()
    return {'deactivated': count}
