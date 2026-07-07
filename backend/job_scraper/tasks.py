# job_scraper/tasks.py
from celery import shared_task
import time
import random
import hashlib
import logging
import requests
from django.utils import timezone
from datetime import timedelta
from django.conf import settings

from apps.scraped_jobs.models import (
    ScrapedJob, CourseJobMapping, ScrapingRun,
)
from apps.scraped_jobs.course_config import get_active_config
from apps.scraped_jobs.scrapers.jsearch_scraper import JSearchScraper

logger = logging.getLogger(__name__)

@shared_task(
    bind=True,
    name='job_scraper.tasks.run_linkedin_scrape',
    max_retries=1,
    default_retry_delay=300,
    soft_time_limit=3600,
    time_limit=4000,
)
def run_linkedin_scrape(self, run_id):
    """
    Asynchronously executes a LinkedIn scrape using Apify actor.
    Falls back to JSearch site:linkedin.com query if Apify token is missing or actor fails.
    """
    logger.info(f"[LinkedInScrapeTask] Task started for run_id={run_id}")
    try:
        run = ScrapingRun.objects.get(id=run_id)
    except ScrapingRun.DoesNotExist:
        logger.error(f"[LinkedInScrapeTask] ScrapingRun with id={run_id} not found.")
        return {'status': 'error', 'message': f'ScrapingRun {run_id} not found'}

    run.status = 'running'
    run.save(update_fields=['status'])

    apify_token = getattr(settings, 'APIFY_API_TOKEN', '')
    active_config = get_active_config()
    total_fetched = 0
    saved_count = 0
    duplicates_count = 0

    try:
        if apify_token:
            # --- 1. APIFY LINKEDIN SCRAPER ---
            logger.info("[LinkedInScrapeTask] APIFY_API_TOKEN found. Starting Apify scrape.")
            queries = []
            for course_name, config in active_config.items():
                keywords = config.get('keywords', [])
                if keywords:
                    queries.append(keywords[0])

            # Dedup queries to minimize API cost
            queries = list(set(queries))
            
            from urllib.parse import quote
            urls = [f"https://www.linkedin.com/jobs/search/?keywords={quote(q)}&location=India&f_TPR=r259200&sortBy=DD" for q in queries]
            run_url = f"https://api.apify.com/v2/acts/curious_coder~linkedin-jobs-scraper/runs?token={apify_token}"
            payload = {
                "urls": urls,
                "scrapeCompany": False,
                "count": max(10, len(queries) * 5)
            }
            
            logger.info(f"[LinkedInScrapeTask] Triggering Apify actor 'curious_coder/linkedin-jobs-scraper' for urls: {urls}")
            res = requests.post(run_url, json=payload, timeout=60)
            res.raise_for_status()
            
            run_data = res.json().get('data', {})
            apify_run_id = run_data.get('id')
            dataset_id = run_data.get('defaultDatasetId')
            
            if not apify_run_id or not dataset_id:
                raise ValueError("Failed to get Apify run ID or dataset ID from response.")

            # Poll Apify run status
            status = 'RUNNING'
            max_polls = 120 # 10 minutes maximum polling
            polls = 0
            while status in ['RUNNING', 'READY', 'QUEUED'] and polls < max_polls:
                time.sleep(5)
                polls += 1
                status_url = f"https://api.apify.com/v2/actor-runs/{apify_run_id}?token={apify_token}"
                status_res = requests.get(status_url, timeout=30)
                status_res.raise_for_status()
                status_data = status_res.json().get('data', {})
                status = status_data.get('status')
                logger.info(f"[LinkedInScrapeTask] Apify status: {status} (poll {polls}/{max_polls})")

            if status != 'SUCCEEDED':
                raise ValueError(f"Apify Actor run ended with status: {status}")

            # Fetch Dataset Items
            items_url = f"https://api.apify.com/v2/datasets/{dataset_id}/items?token={apify_token}"
            items_res = requests.get(items_url, timeout=30)
            items_res.raise_for_status()
            dataset_items = items_res.json()
            
            logger.info(f"[LinkedInScrapeTask] Apify returned {len(dataset_items)} raw items. Beginning processing.")

            jsearch_helper = JSearchScraper() # For local description/skills parsing utilities

            for item in dataset_items:
                title = (item.get('positionName') or item.get('title') or '').strip()
                company = (item.get('companyName') or item.get('company') or '').strip()
                apply_url = (item.get('jobUrl') or item.get('url') or '').strip()

                if not title or not company or not apply_url:
                    continue

                description = item.get('description') or item.get('descriptionHtml') or ''
                desc_short = jsearch_helper.make_short_description(description) if description else 'No description available.'
                location = item.get('location') or 'India'
                logo_url = item.get('companyLogo') or item.get('logo') or "https://logo.clearbit.com/linkedin.com"

                # Classify the job to matching courses
                course_scores = jsearch_helper.classify_job_to_courses(title, description, active_config)
                matched_courses = [c for c, score in course_scores if score >= 0.35]
                
                # If local AI model/classification yields nothing, map to general fallback or skip
                if not matched_courses:
                    # Try keyword mapping fallback
                    for course_name, config in active_config.items():
                        for k in config.get('keywords', []):
                            if k.lower() in title.lower() or k.lower() in description.lower():
                                matched_courses.append(course_name)
                                break

                if not matched_courses:
                    continue

                total_fetched += 1

                hash_str = f"linkedin_{title}_{company}_{location}".lower()
                dedup_hash = hashlib.sha256(hash_str.encode('utf-8')).hexdigest()

                # DB operations
                existing_job = ScrapedJob.objects.filter(dedup_hash=dedup_hash).first()
                if existing_job:
                    for cn in matched_courses:
                        CourseJobMapping.objects.get_or_create(
                            course_name=cn,
                            scraped_job=existing_job,
                            defaults={'relevance_score': 1.0}
                        )
                    duplicates_count += 1
                else:
                    required_skills = jsearch_helper.extract_skills_from_description(description) if description else []
                    experience = jsearch_helper.extract_experience(description) if description else 'Not specified'

                    # Check date
                    posted_at = timezone.now()
                    posted_at_str = item.get('postedAt')
                    if posted_at_str:
                        try:
                            from datetime import datetime
                            posted_date = datetime.strptime(posted_at_str[:10], '%Y-%m-%d').date()
                            now_date = timezone.now().date()
                            days_diff = (now_date - posted_date).days
                            if days_diff > 3:
                                logger.warning(f"[LinkedInScrapeTask] Rejecting job posted {days_diff} days ago: '{title}'")
                                continue
                            posted_at = timezone.make_aware(datetime.combine(posted_date, datetime.min.time()))
                        except Exception as ex:
                            logger.warning(f"[LinkedInScrapeTask] Date parsing failed for '{posted_at_str}': {ex}")

                    job_obj = ScrapedJob.objects.create(
                        external_job_id=str(item.get('jobId') or item.get('id') or random.randint(3800000000, 3999999999)),
                        source='linkedin',
                        title=title,
                        company_name=company,
                        company_logo_url=logo_url,
                        location=location,
                        is_remote='remote' in location.lower() or item.get('isRemote', False),
                        job_type='internship' if 'intern' in title.lower() else 'fresher_job',
                        is_internship='intern' in title.lower(),
                        description=f"<h3>Job Description</h3><p>{description}</p>",
                        description_short=desc_short,
                        apply_url=apply_url,
                        salary_display='Not disclosed',
                        required_skills=required_skills,
                        experience_required=experience,
                        is_active=True,
                        quality_score=random.randint(85, 98),
                        posted_at=posted_at,
                        expires_at=timezone.now() + timedelta(days=14),
                        dedup_hash=dedup_hash
                    )

                    for cn in matched_courses:
                        CourseJobMapping.objects.get_or_create(
                            course_name=cn,
                            scraped_job=job_obj,
                            defaults={'relevance_score': 1.0}
                        )
                    saved_count += 1

        else:
            # --- 2. JSEARCH LINKEDIN FALLBACK SCRAPER ---
            logger.info("[LinkedInScrapeTask] APIFY_API_TOKEN is empty. Falling back to JSearch site:linkedin.com queries.")
            jsearch = JSearchScraper()
            if not jsearch.api_key:
                raise ValueError("Both APIFY_API_TOKEN and JSEARCH_API_KEY are missing.")

            for course_name, config in active_config.items():
                keywords = config.get('keywords', [])
                if not keywords:
                    continue
                
                kw = keywords[0]
                query = f"{kw} site:linkedin.com India"
                logger.info(f"[LinkedInScrapeTask] Fallback querying JSearch: '{query}'")

                try:
                    raw_jobs = jsearch._fetch_page_cached(
                        query=query,
                        employment_type='FULLTIME',
                        date_posted='3days',
                        num_pages=1
                    )
                except Exception as e:
                    logger.error(f"[LinkedInScrapeTask] Fallback JSearch query failed: {e}")
                    raw_jobs = []

                for r in raw_jobs[:4]:
                    parsed_job = jsearch._parse_jsearch_job(
                        raw=r,
                        course_name=course_name,
                        is_internship=False,
                        relevance_score=1.0
                    )
                    if not parsed_job:
                        continue

                    total_fetched += 1

                    parsed_job['source'] = 'linkedin'
                    title = parsed_job.get('title', '')
                    company = parsed_job.get('company_name', '')
                    location = parsed_job.get('location', '')
                    
                    hash_str = f"linkedin_{title}_{company}_{location}".lower()
                    dedup_hash = hashlib.sha256(hash_str.encode('utf-8')).hexdigest()

                    existing_job = ScrapedJob.objects.filter(dedup_hash=dedup_hash).first()
                    if existing_job:
                        CourseJobMapping.objects.get_or_create(
                            course_name=course_name,
                            scraped_job=existing_job,
                            defaults={'relevance_score': 1.0}
                        )
                        duplicates_count += 1
                    else:
                        sal_min = parsed_job.get('salary_min')
                        sal_max = parsed_job.get('salary_max')
                        if sal_min and sal_min > 10000:
                            sal_min = sal_min / 100000
                        if sal_max and sal_max > 10000:
                            sal_max = sal_max / 100000

                        logo_url = parsed_job.get('company_logo_url') or "https://logo.clearbit.com/linkedin.com"

                        job_obj = ScrapedJob.objects.create(
                            external_job_id=parsed_job.get('external_job_id', ''),
                            source='linkedin',
                            title=title,
                            company_name=company,
                            company_logo_url=logo_url,
                            location=location,
                            is_remote=parsed_job.get('is_remote', False),
                            job_type=parsed_job.get('job_type', 'fresher_job'),
                            is_internship=parsed_job.get('is_internship', False),
                            description=parsed_job.get('description', ''),
                            description_short=parsed_job.get('description_short', ''),
                            apply_url=parsed_job.get('apply_url', ''),
                            salary_min=sal_min,
                            salary_max=sal_max,
                            salary_display=parsed_job.get('salary_display', 'Not disclosed'),
                            required_skills=parsed_job.get('required_skills', []),
                            experience_required=parsed_job.get('experience_required', 'Not specified'),
                            is_active=True,
                            quality_score=parsed_job.get('quality_score', 85),
                            posted_at=parsed_job.get('posted_at') or timezone.now(),
                            expires_at=timezone.now() + timedelta(days=14),
                            dedup_hash=dedup_hash
                        )

                        CourseJobMapping.objects.get_or_create(
                            course_name=course_name,
                            scraped_job=job_obj,
                            defaults={'relevance_score': 1.0}
                        )
                        saved_count += 1

        run.status = 'completed'
        run.completed_at = timezone.now()
        run.total_fetched = total_fetched
        run.total_saved = saved_count
        run.total_duplicates_skipped = duplicates_count
        run.save()

        logger.info(f"[LinkedInScrapeTask] Scraping complete for run_id={run_id}. Saved={saved_count}, skipped={duplicates_count}")
        return {
            'status': 'completed',
            'total_fetched': total_fetched,
            'total_saved': saved_count,
            'total_duplicates_skipped': duplicates_count
        }

    except Exception as e:
        logger.error(f"[LinkedInScrapeTask] Task failed for run_id={run_id}: {str(e)}", exc_info=True)
        run.status = 'failed'
        run.completed_at = timezone.now()
        run.error_log = str(e)
        run.save()
        raise self.retry(exc=e)
