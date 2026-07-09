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
    get_course_internship_keywords, get_domain_terms, SCRAPER_STRATEGIES,
)
from apps.scraped_jobs.scrapers.jsearch_scraper import JSearchScraper
from apps.scraped_jobs.scrapers.adzuna_scraper import AdzunaScraper
from apps.scraped_jobs.scrapers.greenhouse_scraper import GreenhouseScraper
from apps.scraped_jobs.scrapers.lever_scraper import LeverScraper
from apps.scraped_jobs.scrapers.linkedin_scraper import LinkedInScraper
from apps.scraped_jobs.deduplication import (
    preload_existing_hashes, load_fuzzy_candidates,
    find_fuzzy_duplicate_in_memory,
)

logger = logging.getLogger(__name__)

JOBS_PER_COURSE_TARGET = 10
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
        self.linkedin = LinkedInScraper()
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
            total_fetched = 0
            total_saved = 0
            total_dupes = 0
            api_calls = {
                'jsearch': 0, 'adzuna': 0, 'greenhouse': 0, 'lever': 0, 'linkedin': 0
            }
            courses_completed = []
            courses_failed = []
            per_course_stats = {}

            # Pre-fetch all LinkedIn/Apify jobs in a single batch run
            uses_linkedin = False
            for course_name in self.active_config.keys():
                strategy = SCRAPER_STRATEGIES.get(course_name, SCRAPER_STRATEGIES['DEFAULT'])
                if any(s in ['linkedin', 'apify'] for s in strategy):
                    uses_linkedin = True
                    break

            if uses_linkedin:
                try:
                    self.linkedin.pre_fetch_batch(self.active_config, self)
                except Exception as e:
                    logger.error(f"[Orchestrator] Batch pre-fetch failed: {e}", exc_info=True)

            for course_name in self.active_config.keys():
                try:
                    strategy = SCRAPER_STRATEGIES.get(course_name, SCRAPER_STRATEGIES['DEFAULT'])
                    stats = self._process_course(
                        course_name=course_name,
                        strategy=strategy,
                        api_calls=api_calls,
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

    def _get_active_counts(self, course_name):
        active_jobs = ScrapedJob.objects.filter(
            course_mappings__course_name=course_name,
            is_active=True,
            job_type='fresher_job'
        ).count()
        active_internships = ScrapedJob.objects.filter(
            course_mappings__course_name=course_name,
            is_active=True,
            job_type='internship'
        ).count()
        return active_jobs, active_internships

    def _is_course_low_supply(self, course_name) -> bool:
        return False
        
        """
        Check if a course has consistently returned low numbers (under 5 saved jobs in total)
        over the last completed runs, unless the admin has updated the keywords recently.
        """
        try:
            # 1. Fetch the course config
            from apps.scraped_jobs.models import CourseSearchConfig
            config = CourseSearchConfig.objects.filter(course_name=course_name).first()
            if not config:
                return False
                
            # Get last 5 completed runs
            runs = ScrapingRun.objects.filter(status='completed').order_by('-completed_at')[:5]
            if len(runs) < 3:
                # Need at least 3 completed runs to establish history
                return False
                
            # Check if all runs yielded under 5 saved jobs/internships
            consistently_low = True
            runs_checked = 0
            
            for run in runs:
                stats = run.per_course_stats.get(course_name) if run.per_course_stats else None
                if stats:
                    saved_count = stats.get('saved', 0)
                    if saved_count >= 5:
                        consistently_low = False
                        break
                    runs_checked += 1
                    
            if runs_checked < 3 or not consistently_low:
                return False
                
            # 2. Check if the admin updated keywords after the last run
            last_run = runs[0]
            if last_run.completed_at and config.updated_at and config.updated_at > last_run.completed_at:
                logger.info(f"[Orchestrator] Course '{course_name}' config was updated since last run. Resetting low-supply flag.")
                return False
                
            logger.warning(f"[Orchestrator] Course '{course_name}' is flagged as a LOW-SUPPLY course (consistently <5 saved).")
            return True
        except Exception as e:
            logger.error(f"[Orchestrator] Error checking low supply for {course_name}: {e}")
            return False

    def _process_course(self, course_name, strategy, api_calls, *args, **kwargs):
        # Get active counts
        active_jobs, active_internships = self._get_active_counts(course_name)
        
        keywords = get_course_keywords(course_name)
        internship_keywords = get_course_internship_keywords(course_name)
        exclude_keywords = get_exclude_keywords(course_name)
        domain_terms = get_domain_terms(course_name)
        
        # Partition strategy to run free first
        free_scrapers = [s for s in strategy if s in ['jsearch', 'greenhouse', 'lever']]
        paid_scrapers = [s for s in strategy if s in ['adzuna', 'linkedin', 'apify']]
        ordered_strategy = free_scrapers + paid_scrapers
        
        # Track budgets for this course in this cycle
        adzuna_calls_made = 0
        apify_runs_made = 0
        
        fetched = 0
        saved = 0
        duplicates = 0
        sources_used = set()
        partially_filled = False
        
        is_low_supply = self._is_course_low_supply(course_name)
        
        for scraper_name in ordered_strategy:
            # Quota Check (10 fresher jobs and 10 internships)
            if active_jobs >= 10 and active_internships >= 10:
                logger.info(f"[Orchestrator] Quota (10+10) met for {course_name}. Stopping waterfall.")
                break
                
            # Skip paid scrapers for low-supply courses
            if scraper_name in ['adzuna', 'linkedin', 'apify'] and is_low_supply:
                logger.info(f"[Orchestrator] Skipping paid scraper '{scraper_name}' for low-supply course: {course_name}")
                continue
                
            logger.info(f"[Orchestrator] Running scraper '{scraper_name}' for {course_name} (jobs={active_jobs}/10, internships={active_internships}/10)")
            
            jobs_to_save = []
            internships_to_save = []
            
            # 1. JSEARCH
            if scraper_name == 'jsearch':
                # Fetch fresher jobs
                if active_jobs < 10:
                    raw_jobs = self.jsearch.fetch_jobs(course_name, keywords, limit=10 - active_jobs)
                    jobs_to_save.extend(raw_jobs)
                    api_calls['jsearch'] += self.jsearch.get_actual_api_calls()
                # Fetch internships
                if active_internships < 10:
                    raw_interns = self.jsearch.fetch_internships(course_name, internship_keywords, limit=10 - active_internships)
                    internships_to_save.extend(raw_interns)
                    api_calls['jsearch'] += self.jsearch.get_actual_api_calls()
                    
            # 2. GREENHOUSE
            elif scraper_name == 'greenhouse':
                if active_jobs < 10:
                    raw_jobs = self.greenhouse.fetch_jobs(course_name, keywords, limit=10 - active_jobs)
                    jobs_to_save.extend(raw_jobs)
                    api_calls['greenhouse'] += self.greenhouse.get_actual_api_calls()
                if active_internships < 10:
                    raw_interns = self.greenhouse.fetch_internships(course_name, internship_keywords, limit=10 - active_internships)
                    internships_to_save.extend(raw_interns)
                    api_calls['greenhouse'] += self.greenhouse.get_actual_api_calls()
                    
            # 3. LEVER
            elif scraper_name == 'lever':
                if active_jobs < 10:
                    raw_jobs = self.lever.fetch_jobs(course_name, keywords, limit=10 - active_jobs)
                    jobs_to_save.extend(raw_jobs)
                    api_calls['lever'] += self.lever.get_actual_api_calls()
                if active_internships < 10:
                    raw_interns = self.lever.fetch_internships(course_name, internship_keywords, limit=10 - active_internships)
                    internships_to_save.extend(raw_interns)
                    api_calls['lever'] += self.lever.get_actual_api_calls()
                    
            # 4. ADZUNA (Paid: max 2 calls per run per course)
            elif scraper_name == 'adzuna':
                if active_jobs < 10 and adzuna_calls_made < 2:
                    adzuna_calls_made += 1
                    raw_jobs = self.adzuna.fetch_jobs(course_name, keywords, limit=10 - active_jobs)
                    jobs_to_save.extend(raw_jobs)
                    api_calls['adzuna'] += 1
                if active_internships < 10 and adzuna_calls_made < 2:
                    adzuna_calls_made += 1
                    raw_interns = self.adzuna.fetch_internships(course_name, internship_keywords, limit=10 - active_internships)
                    internships_to_save.extend(raw_interns)
                    api_calls['adzuna'] += 1
                    
            # 5. LINKEDIN/APIFY (Paid: max 1 actor run per run per course)
            elif scraper_name in ['linkedin', 'apify']:
                if apify_runs_made < 1:
                    apify_runs_made += 1
                    if active_jobs < 10:
                        raw_jobs = self.linkedin.fetch_jobs(course_name, keywords, limit=10 - active_jobs)
                        jobs_to_save.extend(raw_jobs)
                    if active_internships < 10:
                        raw_interns = self.linkedin.fetch_internships(course_name, internship_keywords, limit=10 - active_internships)
                        internships_to_save.extend(raw_interns)
                    api_calls['linkedin'] += self.linkedin.get_actual_api_calls()
            
            # Apply exclude_keywords, strict domain_terms check, and quality threshold
            filtered_jobs = []
            for j in jobs_to_save:
                title = j.get('title', '')
                if self.jsearch.should_exclude(title, j.get('description', ''), exclude_keywords):
                    continue
                if domain_terms and not any(term.lower() in title.lower() for term in domain_terms):
                    continue
                if j.get('quality_score', 0) >= 40:
                    filtered_jobs.append(j)

            filtered_interns = []
            for j in internships_to_save:
                title = j.get('title', '')
                description = j.get('description', '')
                if self.jsearch.should_exclude(title, description, exclude_keywords):
                    continue
                # For internships: match domain terms in title OR description (internship titles are often generic like 'Summer Intern')
                if domain_terms and not any(term.lower() in title.lower() or term.lower() in description.lower() for term in domain_terms):
                    continue
                if j.get('quality_score', 0) >= 40:
                    filtered_interns.append(j)
            
            # Save fresher jobs
            s_jobs, d_jobs = self._save_jobs(filtered_jobs, course_name, 'fresher_job')
            active_jobs += s_jobs
            saved += s_jobs
            duplicates += d_jobs
            fetched += len(filtered_jobs)
            if s_jobs > 0:
                sources_used.add(scraper_name)
                
            # Save internships
            s_interns, d_interns = self._save_jobs(filtered_interns, course_name, 'internship')
            active_internships += s_interns
            saved += s_interns
            duplicates += d_interns
            fetched += len(filtered_interns)
            if s_interns > 0:
                sources_used.add(scraper_name)
                
            # Check if budget caps were hit
            if (scraper_name == 'adzuna' and adzuna_calls_made >= 2) or \
               (scraper_name in ['linkedin', 'apify'] and apify_runs_made >= 1):
                if active_jobs < 10 or active_internships < 10:
                    partially_filled = True
                    logger.warning(f"[Orchestrator] Budget cap hit for {course_name} (jobs={active_jobs}/10, internships={active_internships}/10). Flagged as partially filled.")

        return {
            'fetched': fetched,
            'saved': saved,
            'duplicates': duplicates,
            'sources_used': list(sources_used),
            'partially_filled': partially_filled,
        }

    def _save_jobs(self, jobs, course_name, job_type):
        if not jobs:
            return 0, 0
        saved = 0
        duplicates = 0
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=6)

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
                    job_type=job_type,
                    is_internship=(job_type == 'internship'),
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
                    raw_data={}, dedup_hash=dedup_hash,
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
        cutoff = datetime.now(timezone.utc) - timedelta(days=6)
        count = ScrapedJob.objects.filter(scraped_at__lt=cutoff, is_active=True).update(is_active=False)
        logger.info(f"[Cleanup] Deactivated {count} jobs (scraped_at < {cutoff})")
        return count

    def _cleanup_old_archive(self):
        from django.conf import settings
        import os
        from django.core.serializers import serialize

        cutoff = datetime.now(timezone.utc) - timedelta(days=20)
        old_jobs = ScrapedJob.objects.filter(scraped_at__lt=cutoff)
        old_count = old_jobs.count()
        if old_count == 0:
            return

        total_count = ScrapedJob.objects.count()

        # Safety Check: If we're about to delete > 50% of the entire database,
        # alert the admin and abort! (Indicates potential date corruption)
        if total_count > 0 and (old_count / total_count) > 0.5:
            logger.critical(
                f"[Archive] SAFETY ABORT: Attempted to delete {old_count} jobs out of {total_count} total "
                f"({(old_count/total_count)*100:.1f}%). This exceeds the 50% safety limit. "
                f"Aborting deletion to prevent data loss."
            )
            self._send_alert(
                subject="[CRITICAL ALERT] Scraped Jobs Archive Cleanup Aborted",
                message=(
                    f"The nightly archive cleanup task was safety-aborted.\n\n"
                    f"Attempted to delete {old_count} old scraped jobs out of {total_count} total "
                    f"({(old_count/total_count)*100:.1f}%), which exceeds the 50% safety threshold.\n\n"
                    f"This may indicate corrupted job timestamps or database error. No files were deleted.\n"
                    f"Please inspect the database immediately."
                )
            )
            return

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = f"archive_backups/scraped_jobs_backup_{timestamp}.json"

        try:
            # Backup jobs to file
            from django.core.files.storage import default_storage
            from django.core.files.base import ContentFile
            serialized_data = serialize('json', old_jobs)
            
            default_storage.save(backup_file, ContentFile(serialized_data.encode('utf-8')))
            logger.info(f"[Archive] Successfully backed up {old_count} jobs via default_storage to {backup_file}")

            # Perform hard delete
            deleted_count, _ = old_jobs.delete()
            logger.info(f"[Archive] Hard-deleted {deleted_count} jobs > 20 days old.")
        except Exception as e:
            logger.error(f"[Archive] Failed to backup or clean up old jobs: {e}", exc_info=True)

    def _precompute_course_feed_caches(self, run_id):
        cutoff = datetime.now(timezone.utc) - timedelta(days=6)
        for course_name in self.active_config.keys():
            try:
                job_ids = list(
                    ScrapedJob.objects.filter(
                        is_active=True, is_internship=False, scraped_at__gte=cutoff,
                        course_mappings__course_name=course_name,
                    ).order_by('-quality_score', '-scraped_at')
                    .values_list('id', flat=True)[:10]
                )
                internship_ids = list(
                    ScrapedJob.objects.filter(
                        is_active=True, is_internship=True, scraped_at__gte=cutoff,
                        course_mappings__course_name=course_name,
                    ).order_by('-quality_score', '-scraped_at')
                    .values_list('id', flat=True)[:10]
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
            # We alert if the ACTIVE jobs < 10 or internships < 10 for a course
            low_courses = []
            
            for course_name in self.active_config.keys():
                active_jobs = ScrapedJob.objects.filter(
                    course_mappings__course_name=course_name,
                    is_active=True,
                    job_type='fresher_job'
                ).count()
                active_internships = ScrapedJob.objects.filter(
                    course_mappings__course_name=course_name,
                    is_active=True,
                    job_type='internship'
                ).count()
                
                if active_jobs < 10 or active_internships < 10:
                    low_courses.append(
                        f"- {course_name}: jobs={active_jobs}/10, internships={active_internships}/10"
                    )

            if low_courses:
                subject = f"[RELEVANT ALERT] {len(low_courses)} Courses Running Low"
                message = (
                    f"Scraping Run #{self.run.id} completed.\n\n"
                    "The following courses have dropped below the target threshold of "
                    "10 active fresher jobs or 10 active internships:\n\n"
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
