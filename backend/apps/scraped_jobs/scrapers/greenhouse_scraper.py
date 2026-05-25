# apps/scraped_jobs/scrapers/greenhouse_scraper.py
"""
Tertiary scraper: Greenhouse Boards API.
Opportunistic, fire-and-forget, never blocks the main pipeline.
"""

import requests
import logging
from datetime import datetime, timezone

from .base import BaseJobScraper

logger = logging.getLogger(__name__)

GREENHOUSE_COMPANIES = [
    'thoughtworks', 'freshworks', 'razorpay', 'chargebee',
    'postman', 'browserstack', 'druva', 'clevertap',
]

TECH_COURSES = [
    'BSc in Data Science', 'BSc in Cyber Security', 'BSc in Computer Application (BCA)',
    'BBA in Digital Marketing (BBA DM)', 'BBA in Entrepreneurship (BBA ENT)',
]


class GreenhouseScraper(BaseJobScraper):
    SOURCE_NAME = 'greenhouse'

    def __init__(self):
        super().__init__()
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': 'Mozilla/5.0'})

    def fetch_jobs(self, course_name, keywords, limit=10):
        if course_name not in TECH_COURSES:
            return []
        results = []
        for company in GREENHOUSE_COMPANIES:
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
        url = f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs"
        response = self.session.get(url, timeout=self.timeout)
        if response.status_code == 404:
            return []
        response.raise_for_status()
        results = []
        for raw in response.json().get('jobs', []):
            title = raw.get('title', '')
            score = self.score_job_relevance(title, '', keywords)
            if score < 0.3:
                continue
            parsed = self._parse_greenhouse_job(raw, company, course_name, score)
            if parsed:
                results.append(parsed)
        return results

    def _parse_greenhouse_job(self, raw, company, course_name, relevance_score=1.0):
        try:
            job_id = str(raw.get('id', ''))
            title = raw.get('title', '').strip()
            if not job_id or not title:
                return None
            apply_url = self.validate_apply_url(raw.get('absolute_url', '') or '')
            if not apply_url:
                return None
            location = raw.get('location', {}).get('name', 'India')
            posted_at = None
            updated_at = raw.get('updated_at', '')
            if updated_at:
                try:
                    posted_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
                except (ValueError, TypeError):
                    posted_at = datetime.now(timezone.utc)
            if posted_at and (datetime.now(timezone.utc) - posted_at).total_seconds() > 72 * 3600:
                return None
            job_data = {
                'external_job_id': job_id, 'source': self.SOURCE_NAME,
                'title': title, 'company_name': company.title(),
                'company_logo_url': None, 'location': location,
                'is_remote': 'remote' in location.lower(),
                'job_type': 'internship' if 'intern' in title.lower() else 'full_time',
                'is_internship': 'intern' in title.lower(),
                'description': '', 'description_short': f"{title} at {company.title()}",
                'apply_url': apply_url, 'salary_min': None, 'salary_max': None,
                'salary_currency': 'INR', 'salary_display': 'Not disclosed',
                'required_skills': [], 'experience_required': 'Not specified',
                'matched_courses': [(course_name, relevance_score)],
                'posted_at': posted_at,
                'raw_data': self.truncate_raw_data({'greenhouse_company': company}),
                'dedup_hash': self.compute_dedup_hash(title, company),
            }
            job_data['quality_score'] = self.calculate_quality_score(job_data)
            return job_data
        except Exception as e:
            logger.warning(f"[Greenhouse] Parse error for {company}: {e}")
            return None
