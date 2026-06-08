# apps/scraped_jobs/orchestrator.py
"""
Scraping orchestrator: coordinates all scrapers, dedup, storage, caching, and health metrics.
"""

import json
import logging
from datetime import datetime, timezone, timedelta

from django.db import transaction, IntegrityError
from django.core.cache import cache

from apps.scraped_jobs.models import (
    ScrapedJob, CourseJobMapping, ScrapingRun, ScraperHealthMetric,
    CourseJobFeedCache, FailedScrapeRecord,
)
from apps.scraped_jobs.course_config import (
    get_active_config, get_exclude_keywords, get_course_keywords,
    get_course_internship_keywords, SCRAPER_STRATEGIES,
)
from apps.scraped_jobs.scrapers.jsearch_scraper import JSearchScraper
from apps.scraped_jobs.scrapers.adzuna_scraper import AdzunaScraper
from apps.scraped_jobs.scrapers.greenhouse_scraper import GreenhouseScraper
from apps.scraped_jobs.scrapers.lever_scraper import LeverScraper
from apps.scraped_jobs.deduplication import (
    preload_existing_hashes, load_fuzzy_candidates,
    find_fuzzy_duplicate_in_memory,
)

logger = logging.getLogger(__name__)

JOBS_PER_COURSE_TARGET = 25
INTERNSHIP_PER_COURSE_TARGET = 10
MIN_JOBS_FROM_PRIMARY = 10
REDIS_LOCK_KEY = "nightly_scrape_lock"
REDIS_LOCK_TIMEOUT = 3600


class ScrapingOrchestrator:

    def __init__(self):
        self.jsearch = JSearchScraper()
        self.adzuna = AdzunaScraper()
        self.greenhouse = GreenhouseScraper()
        self.lever = LeverScraper()
        self.run = None
        self.active_config = get_active_config()

    def run_full_scrape(self):
        """
        Main entry. Uses Redis lock to prevent admin double-trigger.
        """
        if cache.get(REDIS_LOCK_KEY):
            logger.warning("[Orchestrator] Redis lock held. Aborting duplicate run.")
            existing = ScrapingRun.objects.filter(status='running').order_by('-started_at').first()
            return existing or ScrapingRun(status='running')

        cache.set(REDIS_LOCK_KEY, True, timeout=REDIS_LOCK_TIMEOUT)
        self.run = ScrapingRun.objects.create(status='running')
        logger.info(f"[Orchestrator] Starting run #{self.run.id}")

        expired_count = 0
        try:
            jsearch_results = self.jsearch.fetch_all_pools(self.active_config)
            total_fetched = 0
            total_saved = 0
            total_dupes = 0
            api_calls = {
                'jsearch': self.jsearch.get_actual_api_calls(),
                'adzuna': 0, 'greenhouse': 0, 'lever': 0,
            }
            courses_completed = []
            courses_failed = []
            per_course_stats = {}

            for course_name in self.active_config.keys():
                try:
                    strategy = SCRAPER_STRATEGIES.get(course_name, SCRAPER_STRATEGIES['DEFAULT'])
                    stats = self._process_course(
                        course_name=course_name,
                        jsearch_jobs=jsearch_results.get(course_name, []),
                        strategy=strategy, api_calls=api_calls,
                    )
                    total_fetched += stats['fetched']
                    total_saved += stats['saved']
                    total_dupes += stats['duplicates']
                    per_course_stats[course_name] = stats
                    courses_completed.append(course_name)
                except Exception as e:
                    logger.error(f"[Orchestrator] {course_name} failed: {e}", exc_info=True)
                    courses_failed.append(course_name)
                    per_course_stats[course_name] = {'error': str(e), 'fetched': 0, 'saved': 0, 'duplicates': 0}

            expired_count = self._deactivate_expired_jobs()
            self._cleanup_old_archive()
            self._precompute_course_feed_caches(self.run.id)
            self._record_health_metrics(per_course_stats, api_calls)

            final_status = 'completed' if not courses_failed else ('partial' if courses_completed else 'failed')
        except Exception as e:
            logger.error(f"[Orchestrator] Fatal error: {e}", exc_info=True)
            final_status = 'failed'
            total_fetched = total_saved = total_dupes = expired_count = 0
            courses_completed = []
            courses_failed = list(self.active_config.keys())
            per_course_stats = {}
            api_calls = {}
        finally:
            cache.delete(REDIS_LOCK_KEY)

        self.run.status = final_status
        self.run.completed_at = datetime.now(timezone.utc)
        self.run.total_fetched = total_fetched
        self.run.total_saved = total_saved
        self.run.total_duplicates_skipped = total_dupes
        self.run.total_expired_deactivated = expired_count
        self.run.courses_completed = courses_completed
        self.run.courses_failed = courses_failed
        self.run.per_course_stats = per_course_stats
        self.run.api_calls_made = api_calls
        self.run.save()

        logger.info(
            f"[Orchestrator] Run #{self.run.id} done. "
            f"Saved={total_saved}, Dupes={total_dupes}, Deactivated={expired_count}"
        )
        return self.run

    def _process_course(self, course_name, jsearch_jobs, strategy, api_calls):
        keywords = get_course_keywords(course_name)
        internship_keywords = get_course_internship_keywords(course_name)
        exclude_keywords = get_exclude_keywords(course_name)
        all_jobs = list(jsearch_jobs)
        jobs_count = len([j for j in all_jobs if not j.get('is_internship')])

        if jobs_count < MIN_JOBS_FROM_PRIMARY and 'adzuna' in strategy:
            try:
                az_jobs = self.adzuna.fetch_jobs(course_name, keywords, limit=15)
                az_interns = self.adzuna.fetch_internships(course_name, internship_keywords, limit=5)
                all_jobs.extend(az_jobs + az_interns)
                api_calls['adzuna'] += self.adzuna.get_actual_api_calls()
            except Exception as e:
                logger.warning(f"[Adzuna] {course_name}: {e}")

        if 'greenhouse' in strategy:
            try:
                gh = self.greenhouse.fetch_jobs(course_name, keywords, limit=10)
                all_jobs.extend(gh)
                if gh:
                    api_calls['greenhouse'] += self.greenhouse.get_actual_api_calls()
            except Exception:
                pass

        if 'lever' in strategy:
            try:
                lv = self.lever.fetch_jobs(course_name, keywords, limit=10)
                all_jobs.extend(lv)
                if lv:
                    api_calls['lever'] += self.lever.get_actual_api_calls()
            except Exception:
                pass

        filtered = [
            j for j in all_jobs
            if not self.jsearch.should_exclude(j.get('title', ''), j.get('description', ''), exclude_keywords)
        ]
        quality = [j for j in filtered if j.get('quality_score', 0) >= 40]
        fetched = len(quality)
        saved, duplicates = self._save_jobs(quality, course_name)
        return {
            'fetched': fetched, 'saved': saved, 'duplicates': duplicates,
            'sources_used': list(set(j.get('source') for j in quality)),
        }

    def _save_jobs(self, jobs, course_name):
        if not jobs:
            return 0, 0
        saved = 0
        duplicates = 0
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=7)

        existing_hashes = preload_existing_hashes(jobs)
        company_names = [j.get('company_name', '') for j in jobs]
        fuzzy_candidates = load_fuzzy_candidates(company_names)
        new_job_objects = []
        jobs_to_map = []

        for job_data in jobs:
            dedup_hash = job_data.get('dedup_hash', '')
            if not dedup_hash:
                continue
            try:
                if dedup_hash in existing_hashes:
                    existing = ScrapedJob.objects.filter(dedup_hash=dedup_hash).first()
                    if existing:
                        for cn, score in job_data.get('matched_courses', [(course_name, 1.0)]):
                            if score >= 0.3:
                                CourseJobMapping.objects.get_or_create(
                                    course_name=cn, scraped_job=existing,
                                    defaults={'relevance_score': score},
                                )
                    duplicates += 1
                    continue

                ext_id = job_data.get('external_job_id', '')
                source = job_data.get('source', '')
                if ext_id and source:
                    by_ext = ScrapedJob.objects.filter(external_job_id=ext_id, source=source).first()
                    if by_ext:
                        CourseJobMapping.objects.get_or_create(
                            course_name=course_name, scraped_job=by_ext,
                        )
                        duplicates += 1
                        continue

                fuzzy_match = find_fuzzy_duplicate_in_memory(
                    job_data.get('title', ''), job_data.get('company_name', ''),
                    fuzzy_candidates,
                )
                if fuzzy_match:
                    CourseJobMapping.objects.get_or_create(
                        course_name=course_name, scraped_job_id=fuzzy_match[0],
                    )
                    duplicates += 1
                    continue

                new_job_objects.append(ScrapedJob(
                    external_job_id=ext_id or f"generated_{dedup_hash[:20]}",
                    source=source, title=job_data.get('title', ''),
                    company_name=job_data.get('company_name', ''),
                    company_logo_url=job_data.get('company_logo_url'),
                    location=job_data.get('location', 'India'),
                    is_remote=job_data.get('is_remote', False),
                    job_type=job_data.get('job_type', 'full_time'),
                    is_internship=job_data.get('is_internship', False),
                    description=job_data.get('description', ''),
                    description_short=job_data.get('description_short', ''),
                    apply_url=job_data.get('apply_url', ''),
                    salary_min=job_data.get('salary_min'),
                    salary_max=job_data.get('salary_max'),
                    salary_currency=job_data.get('salary_currency', 'INR'),
                    salary_display=job_data.get('salary_display', 'Not disclosed'),
                    required_skills=job_data.get('required_skills', []),
                    experience_required=job_data.get('experience_required', 'Not specified'),
                    is_active=True, quality_score=job_data.get('quality_score', 0.0),
                    posted_at=job_data.get('posted_at'), expires_at=expires_at,
                    raw_data=job_data.get('raw_data', {}), dedup_hash=dedup_hash,
                ))
                jobs_to_map.append({
                    'dedup_hash': dedup_hash,
                    'matched_courses': job_data.get('matched_courses', [(course_name, 1.0)]),
                })
            except Exception as e:
                logger.error(f"[Save] Error processing '{job_data.get('title', '')}': {e}")
                self._record_failure(job_data, str(e), 'save_error')

        if new_job_objects:
            try:
                ScrapedJob.objects.bulk_create(new_job_objects, batch_size=50, ignore_conflicts=True)
                created_hashes = [m['dedup_hash'] for m in jobs_to_map]
                created_jobs = {
                    j.dedup_hash: j
                    for j in ScrapedJob.objects.filter(dedup_hash__in=created_hashes)
                }
                saved = len(created_jobs)
                mapping_objs = []
                for job_map in jobs_to_map:
                    scraped_job = created_jobs.get(job_map['dedup_hash'])
                    if not scraped_job:
                        continue
                    for cn, score in job_map['matched_courses']:
                        if score >= 0.3:
                            mapping_objs.append(CourseJobMapping(
                                course_name=cn, scraped_job=scraped_job,
                                relevance_score=score,
                            ))
                CourseJobMapping.objects.bulk_create(mapping_objs, batch_size=100, ignore_conflicts=True)
            except Exception as e:
                logger.error(f"[Save] bulk_create failed for {course_name}: {e}")

        return saved, duplicates

    def _record_failure(self, job_data, error_message, failure_type):
        try:
            raw_snippet = json.dumps(job_data)[:500] if job_data else ''
            FailedScrapeRecord.objects.create(
                scraping_run=self.run, source=job_data.get('source', 'unknown'),
                raw_snippet=raw_snippet, error_message=error_message[:500],
                failure_type=failure_type,
            )
        except Exception:
            pass

    def _deactivate_expired_jobs(self):
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        count = ScrapedJob.objects.filter(scraped_at__lt=cutoff, is_active=True).update(is_active=False)
        logger.info(f"[Cleanup] Deactivated {count} jobs (scraped_at < {cutoff})")
        return count

    def _cleanup_old_archive(self):
        cutoff = datetime.now(timezone.utc) - timedelta(days=90)
        deleted_count, _ = ScrapedJob.objects.filter(scraped_at__lt=cutoff).delete()
        if deleted_count:
            logger.info(f"[Archive] Hard-deleted {deleted_count} jobs > 90 days old.")

    def _precompute_course_feed_caches(self, run_id):
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        for course_name in self.active_config.keys():
            try:
                job_ids = list(
                    ScrapedJob.objects.filter(
                        is_active=True, is_internship=False, scraped_at__gte=cutoff,
                        course_mappings__course_name=course_name,
                    ).order_by('-quality_score', '-scraped_at')
                    .values_list('id', flat=True)[:200]
                )
                internship_ids = list(
                    ScrapedJob.objects.filter(
                        is_active=True, is_internship=True, scraped_at__gte=cutoff,
                        course_mappings__course_name=course_name,
                    ).order_by('-quality_score', '-scraped_at')
                    .values_list('id', flat=True)[:100]
                )
                CourseJobFeedCache.objects.update_or_create(
                    course_name=course_name,
                    defaults={
                        'job_ids': job_ids, 'internship_ids': internship_ids,
                        'scraping_run_id': run_id,
                        'total_jobs': len(job_ids), 'total_internships': len(internship_ids),
                    },
                )
            except Exception as e:
                logger.warning(f"[FeedCache] Failed for {course_name}: {e}")

    def _record_health_metrics(self, per_course_stats, api_calls):
        try:
            # 1. Record basic API health
            for source, count in api_calls.items():
                ScraperHealthMetric.objects.create(
                    scraping_run=self.run, source=source, actual_api_calls=count,
                    jobs_fetched=sum(
                        s.get('fetched', 0) for s in per_course_stats.values()
                        if source in s.get('sources_used', [])
                    ),
                    is_healthy=count > 0 or source in ['greenhouse', 'lever'],
                )

            # 2. Check for "Relevant" critical lows across ALL courses
            # We alert if the TOTAL ACTIVE jobs for a course drops below a healthy threshold
            HEALTHY_THRESHOLD = 15
            low_courses = []
            
            for course_name in self.active_config.keys():
                total_active = ScrapedJob.objects.filter(
                    course_mappings__course_name=course_name,
                    is_active=True
                ).count()
                
                if total_active < HEALTHY_THRESHOLD:
                    low_courses.append(f"- {course_name}: only {total_active} active jobs")

            if low_courses:
                subject = f"[RELEVANT ALERT] {len(low_courses)} Courses Running Low"
                message = (
                    f"Scraping Run #{self.run.id} completed.\n\n"
                    "The following courses have dropped below the healthy threshold of "
                    f"{HEALTHY_THRESHOLD} total active jobs:\n\n"
                    + "\n".join(low_courses) +
                    "\n\nSuggestion: You may want to add more keywords to these courses in the Admin panel."
                )
                self._send_alert(subject=subject, message=message)

        except Exception as e:
            logger.warning(f"[Health] Metric recording failed: {e}")

    def _send_alert(self, subject, message):
        from django.core.mail import send_mail
        from django.conf import settings
        try:
            send_mail(
                subject=subject, message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[getattr(settings, 'ADMIN_EMAIL', 'shahithu2004@gmail.com')],
                fail_silently=True,
            )
        except Exception as e:
            logger.error(f"[Alert] Email send failed: {e}")
