# apps/scraped_jobs/scrapers/lever_scraper.py
"""
Tertiary scraper: Lever Postings API.
Opportunistic, fire-and-forget, never blocks the main pipeline.
"""

import requests
import logging
from datetime import datetime, timezone

from .base import BaseJobScraper

logger = logging.getLogger(__name__)

LEVER_COMPANIES = [
    'swiggy', 'meesho', 'cred', 'slice', 'groww',
    'zepto', 'rapido', 'dunzo', 'urban-company',
]

STARTUP_COURSES = [
    'BBA in Entrepreneurship (BBA ENT)', 'BBA in Digital Marketing (BBA DM)',
    'BSc in Computer Application (BCA)', 'BSc in Data Science',
]


class LeverScraper(BaseJobScraper):
    SOURCE_NAME = 'lever'

    def __init__(self):
        super().__init__()
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': 'Mozilla/5.0'})

    def fetch_jobs(self, course_name, keywords, limit=10):
        if course_name not in STARTUP_COURSES:
            return []
        results = []
        for company in LEVER_COMPANIES:
            if self.circuit_open or len(results) >= limit:
                break
            jobs = self.with_retry(self._fetch_company_jobs, company, course_name, keywords)
            if jobs:
                results.extend(jobs)
        return results[:limit]

    def fetch_internships(self, course_name, keywords, limit=5):
        jobs = self.fetch_jobs(course_name, keywords, limit=20)
        interns = [j for j in jobs if 'intern' in j.get('title', '').lower()]
        for j in interns:
            j['is_internship'] = True
            j['job_type'] = 'internship'
        return interns[:limit]

    def _fetch_company_jobs(self, company, course_name, keywords):
        self.increment_api_call()
        url = f"https://api.lever.co/v0/postings/{company}?mode=json"
        response = self.session.get(url, timeout=self.timeout)
        if response.status_code in [404, 403]:
            return []
        response.raise_for_status()
        postings = response.json()
        if not isinstance(postings, list):
            return []
        results = []
        for raw in postings:
            title = raw.get('text', '')
            score = self.score_job_relevance(title, raw.get('descriptionPlain', '') or '', keywords)
            if score < 0.3:
                continue
            parsed = self._parse_lever_job(raw, company, course_name, score)
            if parsed:
                results.append(parsed)
        return results

    def _parse_lever_job(self, raw, company, course_name, relevance_score=1.0):
        try:
            job_id = raw.get('id', '')
            title = raw.get('text', '').strip()
            if not job_id or not title:
                return None
            apply_url = self.validate_apply_url(raw.get('hostedUrl', '') or '')
            if not apply_url:
                return None
            location_val = raw.get('categories', {}).get('location', 'India')
            location = location_val if isinstance(location_val, str) else 'India'
            posted_at = None
            created_ms = raw.get('createdAt', 0)
            if created_ms:
                try:
                    posted_at = datetime.fromtimestamp(created_ms / 1000, tz=timezone.utc)
                except (ValueError, OSError):
                    posted_at = datetime.now(timezone.utc)
            if posted_at and (datetime.now(timezone.utc) - posted_at).total_seconds() > 72 * 3600:
                return None
            description = self.sanitize_description(raw.get('descriptionPlain', '') or '')
            job_data = {
                'external_job_id': job_id, 'source': self.SOURCE_NAME,
                'title': title, 'company_name': company.replace('-', ' ').title(),
                'company_logo_url': None, 'location': location,
                'is_remote': 'remote' in location.lower(),
                'job_type': 'internship' if 'intern' in title.lower() else 'full_time',
                'is_internship': 'intern' in title.lower(),
                'description': description,
                'description_short': self.make_short_description(description),
                'apply_url': apply_url, 'salary_min': None, 'salary_max': None,
                'salary_currency': 'INR', 'salary_display': 'Not disclosed',
                'required_skills': self.extract_skills_from_description(description),
                'experience_required': self.extract_experience(description),
                'matched_courses': [(course_name, relevance_score)],
                'posted_at': posted_at,
                'raw_data': self.truncate_raw_data({
                    'lever_company': company,
                    'team': raw.get('categories', {}).get('team'),
                }),
                'dedup_hash': self.compute_dedup_hash(title, company),
            }
            job_data['quality_score'] = self.calculate_quality_score(job_data)
            return job_data
        except Exception as e:
            logger.warning(f"[Lever] Parse error for {company}: {e}")
            return None
