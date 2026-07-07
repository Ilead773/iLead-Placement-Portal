# apps/scraped_jobs/scrapers/linkedin_scraper.py
import logging
import requests
import time
from datetime import datetime, timezone
from django.conf import settings
from .base import BaseJobScraper

logger = logging.getLogger(__name__)

class LinkedInScraper(BaseJobScraper):
    SOURCE_NAME = 'linkedin'

    def __init__(self):
        super().__init__()
        self.apify_token = getattr(settings, 'APIFY_API_TOKEN', '')
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': 'Mozilla/5.0'})

    def fetch_jobs(self, course_name: str, keywords: list, limit: int = 10) -> list:
        return self._fetch_linkedin(course_name, keywords, is_internship=False, limit=limit)

    def fetch_internships(self, course_name: str, keywords: list, limit: int = 10) -> list:
        return self._fetch_linkedin(course_name, keywords, is_internship=True, limit=limit)

    def _fetch_linkedin(self, course_name: str, keywords: list, is_internship: bool, limit: int = 10) -> list:
        if not keywords:
            return []
        
        # If we have apify token, run actor
        if self.apify_token:
            try:
                self.increment_api_call()
                from urllib.parse import quote
                
                # Combine top 3 keywords using OR to cast a wide net in a single URL (keeps Apify cost minimal)
                query = " OR ".join([f'"{kw}"' for kw in keywords[:3]])
                search_url = f"https://www.linkedin.com/jobs/search/?keywords={quote(query)}&location=India&f_TPR=r259200&sortBy=DD"
                
                run_url = f"https://api.apify.com/v2/acts/curious_coder~linkedin-jobs-scraper/runs?token={self.apify_token}"
                payload = {
                    "urls": [search_url],
                    "scrapeCompany": False,  # Minimize API execution time and credits
                    "count": max(15, limit)  # Reduced buffer size to cut Apify costs by 50%
                }
                logger.info(f"[LinkedInScraper] Triggering Apify actor with Boolean OR query: {query}")
                res = self.session.post(run_url, json=payload, timeout=60)
                res.raise_for_status()
                
                run_data = res.json().get('data', {})
                apify_run_id = run_data.get('id')
                dataset_id = run_data.get('defaultDatasetId')
                
                if not apify_run_id or not dataset_id:
                    raise ValueError("Failed to get Apify run ID or dataset ID.")

                # Poll
                status = 'RUNNING'
                max_polls = 60  # 5 minutes max
                polls = 0
                while status in ['RUNNING', 'READY', 'QUEUED'] and polls < max_polls:
                    time.sleep(5)
                    polls += 1
                    status_url = f"https://api.apify.com/v2/actor-runs/{apify_run_id}?token={self.apify_token}"
                    status_res = self.session.get(status_url, timeout=30)
                    status_res.raise_for_status()
                    status = status_res.json().get('data', {}).get('status')
                    logger.debug(f"[LinkedInScraper] Apify status: {status} (poll {polls}/{max_polls})")
                
                if status == 'SUCCEEDED':
                    items_url = f"https://api.apify.com/v2/datasets/{dataset_id}/items?token={self.apify_token}"
                    items_res = self.session.get(items_url, timeout=30)
                    items_res.raise_for_status()
                    items = items_res.json()
                    
                    results = []
                    for item in items:
                        parsed = self._parse_apify_item(item, course_name, is_internship)
                        if parsed:
                            results.append(parsed)
                    return results[:limit]
                else:
                    raise ValueError(f"Apify Actor run ended with status: {status}")
            except Exception as e:
                logger.error(f"[LinkedInScraper] Apify error: {e}. Falling back to JSearch site:linkedin.com.")

        # Fallback to JSearch site:linkedin.com
        return self._fetch_jsearch_fallback(course_name, keywords[0], is_internship, limit)

    def _fetch_jsearch_fallback(self, course_name: str, keyword: str, is_internship: bool, limit: int = 10) -> list:
        from apps.scraped_jobs.scrapers.jsearch_scraper import JSearchScraper
        jsearch = JSearchScraper()
        if not jsearch.api_key:
            logger.warning("[LinkedInScraper] JSearchFallback skipped: JSEARCH_API_KEY not configured.")
            return []
        
        query = f"{keyword} site:linkedin.com India"
        logger.info(f"[LinkedInScraper] Running JSearch fallback query: '{query}'")
        try:
            raw_jobs = jsearch._fetch_page_cached(
                query=query,
                employment_type='INTERN' if is_internship else 'FULLTIME',
                date_posted='3days',
                num_pages=1
            )
            results = []
            for r in raw_jobs:
                parsed = jsearch._parse_jsearch_job(r, course_name, is_internship, relevance_score=1.0)
                if parsed:
                    parsed['source'] = 'linkedin'
                    results.append(parsed)
            return results[:limit]
        except Exception as e:
            logger.error(f"[LinkedInScraper] JSearch fallback query failed: {e}")
            return []

    def _parse_apify_item(self, item: dict, course_name: str, is_internship: bool) -> dict | None:
        try:
            title = (item.get('positionName') or item.get('title') or '').strip()
            company = (item.get('companyName') or item.get('company') or '').strip()
            apply_url = (item.get('applyUrl') or item.get('jobUrl') or item.get('url') or item.get('link') or '').strip()
            if not title or not company or not apply_url:
                return None
                
            apply_url = self.validate_apply_url(apply_url)
            if not apply_url:
                return None

            description = item.get('descriptionText') or item.get('description') or item.get('descriptionHtml') or ''
            desc_short = self.make_short_description(description) if description else 'No description available.'
            location = item.get('location') or 'India'
            logo_url = item.get('companyLogo') or item.get('logo') or "https://logo.clearbit.com/linkedin.com"

            job_data = {
                'external_job_id': str(item.get('jobId') or item.get('id') or hash(title + company)),
                'source': self.SOURCE_NAME,
                'title': title,
                'company_name': company,
                'company_logo_url': logo_url,
                'location': location,
                'is_remote': 'remote' in location.lower() or item.get('isRemote', False),
                'job_type': 'internship' if is_internship else 'fresher_job',
                'is_internship': is_internship,
                'description': f"<h3>Job Description</h3><p>{description}</p>",
                'description_short': desc_short,
                'apply_url': apply_url,
                'salary_min': None,
                'salary_max': None,
                'salary_currency': 'INR',
                'salary_display': 'Not disclosed',
                'required_skills': self.extract_skills_from_description(description) if description else [],
                'experience_required': self.extract_experience(description) if description else 'Not specified',
                'matched_courses': [(course_name, 1.0)],
                'posted_at': datetime.now(timezone.utc), # fallback
                'raw_data': self.truncate_raw_data({}),
                'dedup_hash': self.compute_dedup_hash(title, company, item.get('url')),
            }
            
            posted_at_str = item.get('postedAt')
            if posted_at_str:
                try:
                    posted_date = datetime.strptime(posted_at_str[:10], '%Y-%m-%d').date()
                    now_date = datetime.now(timezone.utc).date()
                    days_diff = (now_date - posted_date).days
                    if days_diff > 3:
                        logger.warning(f"[LinkedInScraper] Rejecting job posted {days_diff} days ago: '{title}'")
                        return None
                    job_data['posted_at'] = datetime.combine(posted_date, datetime.min.time()).replace(tzinfo=timezone.utc)
                except Exception as ex:
                    logger.warning(f"[LinkedInScraper] Date parsing failed for '{posted_at_str}': {ex}")
            job_data['quality_score'] = self.calculate_quality_score(job_data)
            return job_data
        except Exception as e:
            logger.warning(f"[LinkedInScraper] Parse item error: {e}")
            return None
