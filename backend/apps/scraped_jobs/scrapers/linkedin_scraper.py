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
        self._batch_cache = {'jobs': {}, 'internships': {}}
        self._batch_fetched = False

    def fetch_jobs(self, course_name: str, keywords: list, limit: int = 10) -> list:
        return self._fetch_linkedin(course_name, keywords, is_internship=False, limit=limit)

    def fetch_internships(self, course_name: str, keywords: list, limit: int = 10) -> list:
        return self._fetch_linkedin(course_name, keywords, is_internship=True, limit=limit)

    def pre_fetch_batch(self, active_config: dict, orchestrator) -> None:
        """
        Runs a single Apify container execution for all courses needing jobs,
        saving them in a local cache to avoid per-course runs.
        """
        if not self.apify_token:
            logger.info("[LinkedInScraper] APIFY_API_TOKEN is not set. Skipping batch pre-fetch.")
            return

        from urllib.parse import quote
        urls_to_scrape = []
        
        # Gather courses needing jobs/internships
        for course_name, config in active_config.items():
            active_jobs, active_internships = orchestrator._get_active_counts(course_name)
            
            # 1. Fresher Jobs URL if quota < 10
            if active_jobs < 10:
                keywords = config.get('keywords', [])
                if keywords:
                    # No quotes — broad search returns far more results for niche courses
                    query = " OR ".join(keywords[:3])
                    # f_TPR=r604800 = last 7 days; sortBy=DD = most recent first
                    search_url = f"https://www.linkedin.com/jobs/search/?keywords={quote(query)}&location=India&f_TPR=r604800&sortBy=DD"
                    urls_to_scrape.append((search_url, course_name, False))

            # 2. Internship URL if quota < 10
            if active_internships < 10:
                internship_keywords = config.get('internship_keywords', [])
                if internship_keywords:
                    # No quotes + no f_JT=I — broader search, internships classified by title/description heuristic
                    query = " OR ".join(internship_keywords[:3])
                    search_url = f"https://www.linkedin.com/jobs/search/?keywords={quote(query)}&location=India&f_TPR=r604800&sortBy=DD"
                    urls_to_scrape.append((search_url, course_name, True))
                    
        url_list = [item[0] for item in urls_to_scrape]
        if not url_list:
            logger.info("[LinkedInScraper] No active courses need LinkedIn scraping. Batch fetch skipped.")
            self._batch_fetched = True
            return

        count_per_url = 15
        total_count = len(url_list) * count_per_url
        logger.info(f"[LinkedInScraper] Starting batch pre-fetch with {len(url_list)} URLs in a SINGLE Apify run (requesting ~{total_count} listings).")
        try:
            self.increment_api_call()
            run_url = f"https://api.apify.com/v2/acts/curious_coder~linkedin-jobs-scraper/runs?token={self.apify_token}"
            payload = {
                "urls": url_list,
                "scrapeCompany": False,
                "count": total_count
            }
            res = self.session.post(run_url, json=payload, timeout=60)
            res.raise_for_status()
            
            run_data = res.json().get('data', {})
            apify_run_id = run_data.get('id')
            dataset_id = run_data.get('defaultDatasetId')
            
            if not apify_run_id or not dataset_id:
                raise ValueError("Failed to get Apify run ID or dataset ID.")

            # Poll
            status = 'RUNNING'
            max_polls = 120  # 10 minutes max
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
                logger.info(f"[LinkedInScraper] Batch run succeeded. Fetched {len(items)} raw listings.")
                
                from urllib.parse import urlparse, parse_qs, unquote_plus
                # Pre-extract keywords from our built URLs for fast matching
                url_kw_to_course = {}
                for url, course_name, is_intern in urls_to_scrape:
                    parsed = urlparse(url)
                    params = parse_qs(parsed.query)
                    kw_raw = params.get('keywords', [''])[0]
                    kw_norm = unquote_plus(kw_raw).lower().strip()
                    if kw_norm:
                        url_kw_to_course[kw_norm] = (course_name, is_intern)

                passed = 0
                rejected = 0
                unmatched = 0
                for item in items:
                    title = (item.get('positionName') or item.get('title') or '').strip()
                    description = item.get('descriptionText') or item.get('description') or item.get('descriptionHtml') or ''

                    # Determine if it's an internship from the title/description
                    is_internship = False
                    if 'intern' in title.lower() or 'internship' in title.lower() or 'intern' in description.lower()[:300]:
                        is_internship = True

                    # PRIMARY: match result back to source course by extracting keywords from Apify's inputUrl
                    raw_input_url = (item.get('inputUrl') or '').strip()
                    matched_entry = None
                    if raw_input_url:
                        parsed_in = urlparse(raw_input_url)
                        params_in = parse_qs(parsed_in.query)
                        in_kw = unquote_plus(params_in.get('keywords', [''])[0]).lower().strip()
                        # Exact keyword match
                        matched_entry = url_kw_to_course.get(in_kw)
                        if not matched_entry and in_kw:
                            # Partial match: check if our built keyword is a substring of Apify's (or vice versa)
                            for built_kw, entry in url_kw_to_course.items():
                                if in_kw.startswith(built_kw[:40]) or built_kw.startswith(in_kw[:40]):
                                    matched_entry = entry
                                    break

                    if matched_entry:
                        course_name, url_is_intern = matched_entry
                        # Use the URL-determined internship flag (more reliable than heuristic)
                        is_internship = url_is_intern
                        parsed = self._parse_apify_item(item, course_name, is_internship)
                        if parsed:
                            passed += 1
                            cache_key = 'internships' if is_internship else 'jobs'
                            if course_name not in self._batch_cache[cache_key]:
                                self._batch_cache[cache_key][course_name] = []
                            self._batch_cache[cache_key][course_name].append(parsed)
                        else:
                            rejected += 1
                    else:
                        # FALLBACK: use generic classifier if source URL can't be matched
                        unmatched += 1
                        matched_courses = self.classify_job_to_courses(title, description, active_config)
                        for course_name, score in matched_courses:
                            parsed = self._parse_apify_item(item, course_name, is_internship)
                            if parsed:
                                passed += 1
                                cache_key = 'internships' if is_internship else 'jobs'
                                if course_name not in self._batch_cache[cache_key]:
                                    self._batch_cache[cache_key][course_name] = []
                                self._batch_cache[cache_key][course_name].append(parsed)
                            else:
                                rejected += 1

                logger.info(
                    f"[LinkedInScraper] Classification complete: {passed} passed, "
                    f"{rejected} rejected, {unmatched} unmatched (used generic classifier)."
                )
                # Log per-course cache counts
                for key in ['jobs', 'internships']:
                    for cname, clist in self._batch_cache[key].items():
                        logger.info(f"[LinkedInScraper] Cache [{key}] {cname}: {len(clist)} items")
                self._batch_fetched = True
                logger.info("[LinkedInScraper] Batch pre-fetch completed and cached locally.")
            else:
                raise ValueError(f"Apify Actor run ended with status: {status}")
        except Exception as e:
            logger.error(f"[LinkedInScraper] Batch pre-fetch failed: {e}. Falling back to normal flow.")

    def get_actual_api_calls(self) -> int:
        val = self._actual_api_calls
        self._actual_api_calls = 0
        return val

    def _fetch_linkedin(self, course_name: str, keywords: list, is_internship: bool, limit: int = 10) -> list:
        if not keywords:
            return []
        
        # If batch pre-fetch was run, check cache
        if self._batch_fetched:
            cache_key = 'internships' if is_internship else 'jobs'
            jobs = self._batch_cache[cache_key].get(course_name, [])
            if jobs:
                logger.info(f"[LinkedInScraper] Pulling {len(jobs)} {cache_key} from batch cache for {course_name} (limit={limit})")
                return jobs[:limit]
            else:
                logger.info(f"[LinkedInScraper] No cached {cache_key} for {course_name}. Skipping fallback (Apify-only mode).")
                return []
        
        # If we have apify token, run actor (Single-course fallback / legacy mode)
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
                    if days_diff > 7:
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
