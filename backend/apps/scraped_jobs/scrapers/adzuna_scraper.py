# apps/scraped_jobs/scrapers/adzuna_scraper.py
"""
Secondary scraper: Adzuna API.
Only called when JSearch pool yields < 10 jobs for a course.
"""

import requests
import logging
from datetime import datetime, timezone

from django.conf import settings

from .base import BaseJobScraper

logger = logging.getLogger(__name__)

ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api/jobs/in/search'


class AdzunaScraper(BaseJobScraper):
    SOURCE_NAME = 'adzuna'

    def __init__(self):
        super().__init__()
        self.app_id = getattr(settings, 'ADZUNA_APP_ID', '')
        self.app_key = getattr(settings, 'ADZUNA_APP_KEY', '')
        self.session = requests.Session()

    def fetch_jobs(self, course_name: str, keywords: list, limit: int = 15) -> list:
        if not self.app_id or not self.app_key:
            logger.warning("[Adzuna] API credentials not set. Skipping.")
            return []
        query = ' OR '.join(keywords[:3]) if keywords else course_name
        raw_results = self.with_retry(
            self._fetch_page, query=query, page=1,
            results_per_page=limit, max_days_old=2, category='it-jobs',
        )
        return [
            j for j in
            [self._parse_adzuna_job(r, course_name, False) for r in (raw_results or [])]
            if j
        ]

    def fetch_internships(self, course_name: str, keywords: list, limit: int = 10) -> list:
        if not self.app_id or not self.app_key:
            return []
        query = (
            f"{keywords[0]} internship"
            if keywords
            else f"{course_name} internship"
        )
        raw_results = self.with_retry(
            self._fetch_page, query=query, page=1,
            results_per_page=limit, max_days_old=3,
        )
        return [
            j for j in
            [self._parse_adzuna_job(r, course_name, True) for r in (raw_results or [])]
            if j
        ]

    def _fetch_page(
        self, query: str, page: int = 1,
        results_per_page: int = 20, max_days_old: int = 2,
        category: str = None
    ) -> list:
        self.increment_api_call()
        params = {
            'app_id': self.app_id,
            'app_key': self.app_key,
            'what': query,
            'where': 'India',
            'results_per_page': results_per_page,
            'max_days_old': max_days_old,
            'content-type': 'application/json',
        }
        if category:
            params['category'] = category
        url = f"{ADZUNA_BASE_URL}/{page}"
        response = self.session.get(url, params=params, timeout=self.timeout)
        response.raise_for_status()
        return response.json().get('results', [])

    def _parse_adzuna_job(
        self, raw: dict, course_name: str, is_internship: bool
    ) -> dict | None:
        try:
            job_id = str(raw.get('id', ''))
            title = raw.get('title', '').strip()
            company = raw.get('company', {}).get('display_name', '').strip()
            if not job_id or not title or not company:
                return None

            description = self.sanitize_description(
                raw.get('description', '') or ''
            )
            location = raw.get('location', {}).get('display_name', 'India')
            apply_url = self.validate_apply_url(
                raw.get('redirect_url', '') or ''
            )
            if not apply_url:
                return None

            salary_min = raw.get('salary_min')
            salary_max = raw.get('salary_max')
            salary_display = (
                f"₹{salary_min:,.0f} - ₹{salary_max:,.0f}/year"
                if salary_min and salary_max else 'Not disclosed'
            )

            posted_at = None
            posted_str = raw.get('created', '')
            if posted_str:
                try:
                    posted_at = datetime.fromisoformat(
                        posted_str.replace('Z', '+00:00')
                    )
                except (ValueError, TypeError):
                    posted_at = datetime.now(timezone.utc)

            if posted_at and (datetime.now(timezone.utc) - posted_at).total_seconds() > 48 * 3600:
                return None

            job_data = {
                'external_job_id': job_id,
                'source': self.SOURCE_NAME,
                'title': title,
                'company_name': company,
                'company_logo_url': None,
                'location': location,
                'is_remote': 'remote' in location.lower() or 'remote' in title.lower(),
                'job_type': 'internship' if is_internship else 'full_time',
                'is_internship': is_internship,
                'description': description,
                'description_short': self.make_short_description(description),
                'apply_url': apply_url,
                'salary_min': salary_min,
                'salary_max': salary_max,
                'salary_currency': 'INR',
                'salary_display': salary_display,
                'required_skills': self.extract_skills_from_description(description),
                'experience_required': self.extract_experience(description),
                'matched_courses': [(course_name, 1.0)],
                'posted_at': posted_at,
                'raw_data': self.truncate_raw_data({
                    'category': raw.get('category', {}).get('label'),
                }),
                'dedup_hash': self.compute_dedup_hash(title, company),
            }
            job_data['quality_score'] = self.calculate_quality_score(job_data)
            return job_data
        except Exception as e:
            logger.warning(f"[Adzuna] Parse error: {e}")
            return None
