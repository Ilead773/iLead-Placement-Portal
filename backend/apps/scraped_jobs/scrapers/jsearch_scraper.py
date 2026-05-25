# apps/scraped_jobs/scrapers/jsearch_scraper.py
"""
Primary scraper: JSearch via RapidAPI.
Pool-based strategy to minimize API calls (8-12 calls/night total).
Query result caching with 24h TTL to avoid duplicate requests.
"""

import hashlib
import logging
import requests
from datetime import datetime, timezone

from django.conf import settings
from django.core.cache import cache

from .base import BaseJobScraper
from apps.scraped_jobs.rate_limiter import get_rate_limiter

logger = logging.getLogger(__name__)

JSEARCH_BASE_URL = 'https://jsearch.p.rapidapi.com/search'
JSEARCH_HOST = 'jsearch.p.rapidapi.com'

SEARCH_POOLS = {
    "tech_fresher": {
        "queries": [
            "software developer fresher India",
            "junior developer India",
            "react developer fresher India",
            "python developer fresher India",
        ],
        "courses": ["BSc in Computer Application (BCA)", "BSc in Data Science"],
        "is_internship": False,
    },
    "data_ai": {
        "queries": [
            "data scientist India",
            "machine learning engineer India",
            "data analyst fresher India",
        ],
        "courses": ["BSc in Data Science"],
        "is_internship": False,
    },
    "cyber": {
        "queries": [
            "cybersecurity analyst India",
            "SOC analyst India",
            "network security fresher India",
        ],
        "courses": ["BSc in Cyber Security"],
        "is_internship": False,
    },
    "marketing": {
        "queries": [
            "digital marketing executive India",
            "SEO executive India",
            "social media manager India",
        ],
        "courses": ["BBA in Digital Marketing (BBA DM)", "BSc in Media Science (BMS)", "MSc in Media Science"],
        "is_internship": False,
    },
    "business": {
        "queries": [
            "business analyst fresher India",
            "sales executive India",
            "MBA fresher India",
        ],
        "courses": ["BBA", "BBA (Finance)", "BBA in Entrepreneurship (BBA ENT)", "BBA in Hospital Management (BBA HM)"],
        "is_internship": False,
    },
    "creative": {
        "queries": [
            "graphic design India",
            "motion graphics India",
            "video editor India",
        ],
        "courses": [
            "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
            "MSc in Multimedia, Animation, Graphic Design (MMAGD)",
            "BSc in Film and Television Production (FTP)",
        ],
        "is_internship": False,
    },
    "design": {
        "queries": [
            "interior designer India",
            "AutoCAD designer India",
            "3D visualization India",
            "fashion designer India",
            "sustainable fashion India",
        ],
        "courses": ["BSc in Interior Design", "BSc in Sustainable Fashion Design & Management"],
        "is_internship": False,
    },
    "hospitality": {
        "queries": [
            "travel consultant India",
            "tourism executive India",
            "hotel management fresher India",
        ],
        "courses": ["BBA in Travel & Tourism Management (BBA TTM)", "BBA in Sports Management (BBA SM)"],
        "is_internship": False,
    },
    "healthcare": {
        "queries": [
            "medical lab technician India",
            "biomedical technician India",
            "ICU technician India",
        ],
        "courses": [
            "BSc in Medical Laboratory Technology (BMLT)",
            "BSc in Critical Care Technology (CCT)",
            "Bachelor in Optometry",
        ],
        "is_internship": False,
    },
    "internships_tech": {
        "queries": [
            "software intern India",
            "data science intern India",
            "web development intern India",
        ],
        "courses": ["BSc in Computer Application (BCA)", "BSc in Data Science", "BSc in Cyber Security"],
        "is_internship": True,
    },
    "internships_general": {
        "queries": [
            "marketing intern India",
            "business intern India",
            "media intern India",
            "fashion design intern India",
        ],
        "courses": [
            "BBA in Digital Marketing (BBA DM)", "BBA", "BBA (Finance)",
            "BSc in Media Science (BMS)", "MSc in Media Science",
            "BBA in Entrepreneurship (BBA ENT)", "BSc in Sustainable Fashion Design & Management",
        ],
        "is_internship": True,
    },
}

QUERY_CACHE_TTL = 86400  # 24 hours — identical queries reuse cached results


class JSearchScraper(BaseJobScraper):
    SOURCE_NAME = 'jsearch'

    def __init__(self):
        super().__init__()
        self.api_key = getattr(settings, 'JSEARCH_API_KEY', '')
        self.headers = {
            'X-RapidAPI-Key': self.api_key,
            'X-RapidAPI-Host': JSEARCH_HOST,
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        self.rate_limiter = get_rate_limiter('jsearch', calls_per_minute=8)

    def _get_query_cache_key(self, query: str, employment_type: str) -> str:
        raw = f"jsearch:{query}:{employment_type}"
        return f"query_cache:{hashlib.md5(raw.encode()).hexdigest()}"

    def _fetch_page_cached(
        self, query: str, employment_type: str,
        date_posted: str, num_pages: int = 1
    ) -> list:
        """
        Fetches from JSearch API with 24h query result cache.
        Identical queries (same query+type) within 24h return cached results.
        """
        cache_key = self._get_query_cache_key(query, employment_type)
        cached = cache.get(cache_key)
        if cached is not None:
            logger.debug(f"[JSearch] Cache hit for query: '{query}'")
            return cached

        self.rate_limiter.wait()
        self.increment_api_call()
        result = self.with_retry(
            self._fetch_page, query, employment_type, date_posted, num_pages
        )
        result = result or []

        if result:
            cache.set(cache_key, result, timeout=QUERY_CACHE_TTL)
            logger.debug(f"[JSearch] Cached {len(result)} results for query: '{query}'")

        return result

    def fetch_all_pools(self, active_config: dict) -> dict:
        """
        Main entry point. Fetches all SEARCH_POOLS.
        Returns {course_name: [normalized_job_dicts]}.
        Uses query result cache to avoid re-hitting API for identical queries.
        """
        if not self.api_key:
            logger.error("[JSearch] JSEARCH_API_KEY not set. Skipping.")
            return {course: [] for course in active_config.keys()}

        results_by_course = {course: [] for course in active_config.keys()}

        for pool_name, pool_config in SEARCH_POOLS.items():
            if self.circuit_open:
                logger.warning("[JSearch] Circuit open. Stopping pool fetch.")
                break

            is_internship = pool_config.get('is_internship', False)
            employment_type = 'INTERN' if is_internship else 'FULLTIME'
            pool_jobs_raw = []

            for query in pool_config['queries']:
                raw = self._fetch_page_cached(
                    query=query,
                    employment_type=employment_type,
                    date_posted='3days',
                    num_pages=1,
                )
                pool_jobs_raw.extend(raw)

            logger.info(
                f"[JSearch] Pool '{pool_name}': {len(pool_jobs_raw)} raw jobs."
            )

            # Local classification: assign each job to matching courses
            for raw_job in pool_jobs_raw:
                title = raw_job.get('job_title', '')
                description = raw_job.get('job_description', '') or ''
                course_scores = self.classify_job_to_courses(
                    title, description, active_config
                )

                # Always include pool's declared courses as fallback
                declared_courses = set(pool_config['courses'])
                classified_courses = {c: s for c, s in course_scores}
                for course_name in declared_courses:
                    if course_name not in classified_courses:
                        classified_courses[course_name] = 0.5

                for course_name, relevance_score in classified_courses.items():
                    if course_name not in results_by_course:
                        continue
                    parsed = self._parse_jsearch_job(
                        raw_job, course_name, is_internship, relevance_score
                    )
                    if parsed:
                        results_by_course[course_name].append(parsed)

        return results_by_course

    def fetch_jobs(self, course_name: str, keywords: list, limit: int = 25) -> list:
        """Per-course fallback — used only in single-course scrape_pool_task."""
        if not self.api_key:
            return []
        primary_keyword = keywords[0] if keywords else course_name
        raw = self._fetch_page_cached(
            query=f"{primary_keyword} India",
            employment_type='FULLTIME',
            date_posted='3days',
            num_pages=2,
        )
        normalized = []
        for r in raw[:limit]:
            job = self._parse_jsearch_job(r, course_name, False, relevance_score=1.0)
            if job:
                normalized.append(job)
        return normalized

    def fetch_internships(self, course_name: str, keywords: list, limit: int = 10) -> list:
        if not self.api_key:
            return []
        query = (
            f"{keywords[0]} internship India"
            if keywords
            else f"{course_name} internship India"
        )
        raw = self._fetch_page_cached(
            query=query,
            employment_type='INTERN',
            date_posted='3days',
            num_pages=1,
        ) or self._fetch_page_cached(
            query=query,
            employment_type='FULLTIME',
            date_posted='3days',
            num_pages=1,
        )
        normalized = []
        for r in (raw or [])[:limit]:
            job = self._parse_jsearch_job(r, course_name, True, relevance_score=1.0)
            if job:
                normalized.append(job)
        return normalized

    def _fetch_page(
        self, query: str, employment_type: str,
        date_posted: str, num_pages: int = 1
    ) -> list:
        params = {
            'query': query,
            'date_posted': date_posted,
            'employment_types': employment_type,
            'num_pages': str(num_pages),
            'page': '1',
            'remote_jobs_only': 'false',
            'radius': '100',
        }
        try:
            response = self.session.get(
                JSEARCH_BASE_URL, params=params, timeout=self.timeout
            )
            if response.status_code == 403:
                logger.error(
                    "[JSearch] 403 — API key invalid or quota exceeded. Returning []."
                )
                return []
            response.raise_for_status()
            return response.json().get('data', [])
        except requests.exceptions.HTTPError as e:
            if e.response is not None and e.response.status_code == 403:
                return []
            raise

    def _parse_jsearch_job(
        self, raw: dict, course_name: str,
        is_internship: bool, relevance_score: float = 1.0
    ) -> dict | None:
        try:
            job_id = raw.get('job_id', '')
            title = raw.get('job_title', '').strip()
            company = raw.get('employer_name', '').strip()
            if not job_id or not title or not company:
                return None

            description = self.sanitize_description(
                raw.get('job_description', '') or ''
            )
            location = ', '.join(filter(None, [
                raw.get('job_city', '') or '',
                raw.get('job_state', '') or '',
                raw.get('job_country', 'India') or 'India',
            ]))

            apply_url = self.validate_apply_url(
                raw.get('job_apply_link', '') or raw.get('job_google_link', '') or ''
            )
            if not apply_url:
                return None

            salary_min = raw.get('job_min_salary')
            salary_max = raw.get('job_max_salary')
            salary_period = raw.get('job_salary_period', '')
            salary_currency = raw.get('job_salary_currency', 'USD')
            salary_display = (
                f"{salary_min:,.0f} - {salary_max:,.0f} {salary_currency}/{salary_period}"
                if salary_min and salary_max else 'Not disclosed'
            )

            posted_at = None
            posted_str = raw.get('job_posted_at_datetime_utc')
            if posted_str:
                try:
                    posted_at = datetime.fromisoformat(
                        posted_str.replace('Z', '+00:00')
                    )
                except (ValueError, TypeError):
                    posted_at = datetime.now(timezone.utc)

            if posted_at and (datetime.now(timezone.utc) - posted_at).total_seconds() > 48 * 3600:
                return None

            exp_obj = raw.get('job_required_experience')
            exp_str = ''
            if isinstance(exp_obj, dict):
                if exp_obj.get('no_experience_required'):
                    exp_str = 'Fresher / Entry Level (0 Years)'
                elif exp_obj.get('required_experience_in_months'):
                    months = exp_obj.get('required_experience_in_months')
                    years = round(months / 12, 1)
                    exp_str = f'{years} Years Experience'
            if not exp_str:
                exp_str = self.extract_experience(description)

            job_data = {
                'external_job_id': job_id,
                'source': self.SOURCE_NAME,
                'title': title,
                'company_name': company,
                'company_logo_url': raw.get('employer_logo'),
                'location': location or 'India',
                'is_remote': raw.get('job_is_remote', False),
                'job_type': 'internship' if is_internship else 'full_time',
                'is_internship': is_internship,
                'description': description,
                'description_short': self.make_short_description(description),
                'apply_url': apply_url,
                'salary_min': salary_min,
                'salary_max': salary_max,
                'salary_currency': salary_currency,
                'salary_display': salary_display,
                'required_skills': self.extract_skills_from_description(description),
                'experience_required': exp_str,
                'matched_courses': [(course_name, relevance_score)],
                'posted_at': posted_at,
                'raw_data': self.truncate_raw_data({
                    'employer_website': raw.get('employer_website'),
                    'job_employment_type': raw.get('job_employment_type'),
                    'job_required_experience': raw.get('job_required_experience'),
                }),
                'dedup_hash': self.compute_dedup_hash(title, company),
            }
            job_data['quality_score'] = self.calculate_quality_score(job_data)
            return job_data
        except Exception as e:
            logger.warning(
                f"[JSearch] Parse error: {e} for job_id={raw.get('job_id', '?')}"
            )
            return None
