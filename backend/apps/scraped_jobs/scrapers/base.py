# apps/scraped_jobs/scrapers/base.py
"""
Abstract base scraper with shared utilities:
- Quality scoring, dedup hashing, URL validation
- Sanitization, skill extraction, salary parsing
- Circuit breaker, retry logic
- Centralized timeout config from settings.py
"""

import logging
import hashlib
import re
import json
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional

import validators
import bleach

logger = logging.getLogger(__name__)

# Centralized timeout config — read from settings, not hardcoded per-scraper
from django.conf import settings

SCRAPER_TIMEOUTS = getattr(settings, 'SCRAPER_TIMEOUTS', {
    'jsearch': 15,
    'adzuna': 15,
    'greenhouse': 10,
    'lever': 10,
    'default': 12,
})

SUSPICIOUS_PHRASES = [
    "work from home guaranteed",
    "earn lakhs daily",
    "no experience needed earn",
    "100% placement guaranteed",
    "binary trading",
    "mlm",
    "pyramid scheme",
    "earn money online guaranteed",
    "investment required",
]


class BaseJobScraper(ABC):
    SOURCE_NAME = ''
    MAX_RETRIES = 3
    RETRY_DELAY_SECONDS = 5

    def __init__(self):
        self.session = None
        self.total_fetched = 0
        self.errors = []
        self._failure_count = 0
        self._failure_window_start = None
        self.circuit_open = False
        self._actual_api_calls = 0  # real counter, incremented per HTTP request made

    @property
    def timeout(self) -> int:
        return SCRAPER_TIMEOUTS.get(self.SOURCE_NAME, SCRAPER_TIMEOUTS['default'])

    def increment_api_call(self):
        """Call this once per actual HTTP request made to external API."""
        self._actual_api_calls += 1

    def get_actual_api_calls(self) -> int:
        return self._actual_api_calls

    @abstractmethod
    def fetch_jobs(self, course_name: str, keywords: list, limit: int = 25) -> list:
        pass

    @abstractmethod
    def fetch_internships(self, course_name: str, keywords: list, limit: int = 10) -> list:
        pass

    def check_circuit_breaker(self):
        now = time.time()
        if self._failure_window_start is None:
            self._failure_window_start = now
        if now - self._failure_window_start > 600:
            self._failure_count = 0
            self._failure_window_start = now
        self._failure_count += 1
        if self._failure_count >= 5:
            self.circuit_open = True
            logger.error(
                f"[{self.SOURCE_NAME}] Circuit breaker OPEN — 5 failures in 10 min."
            )

    def validate_apply_url(self, url: str) -> Optional[str]:
        if not url:
            return None
        url = url.strip()
        blocked = ('javascript:', 'data:', 'file:')
        if any(url.lower().startswith(s) for s in blocked):
            return None
        if not validators.url(url):
            return None
        return url

    def sanitize_description(self, description: str) -> str:
        if not description:
            return ''
        return bleach.clean(description, tags=[], strip=True)

    def truncate_raw_data(self, raw: dict) -> dict:
        """
        Do not store the raw API payload at all to minimize DB storage.
        """
        return {}

    def contains_suspicious_phrase(self, text: str) -> bool:
        text_lower = text.lower()
        return any(phrase in text_lower for phrase in SUSPICIOUS_PHRASES)

    def compute_dedup_hash(self, title: str, company: str, apply_url: str = None) -> str:
        if apply_url:
            return hashlib.sha256(apply_url.encode('utf-8')).hexdigest()
        normalized = f"{self._normalize_text(title)}::{self._normalize_text(company)}"
        return hashlib.sha256(normalized.encode('utf-8')).hexdigest()

    def _normalize_text(self, text: str) -> str:
        if not text:
            return ''
        text = text.lower().strip()
        text = re.sub(r'[^a-z0-9\s]', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text

    def should_exclude(self, title: str, description: str, exclude_keywords: list) -> bool:
        title_lower = title.lower()
        desc_lower = description.lower()
        
        # 1. Check exclude_keywords
        for kw in exclude_keywords:
            kw_l = kw.lower()
            # If the keyword specifies experience years (e.g. "10+ years", "8+ years"), check full text
            if "year" in kw_l or "+" in kw_l or "exp" in kw_l:
                if kw_l in desc_lower or kw_l in title_lower:
                    return True
            else:
                # Seniority terms: check title only to avoid false positives in description (e.g. "report to manager")
                if kw_l in title_lower.split() or f" {kw_l} " in f" {title_lower} ":
                    return True
        
        # 2. Hard-coded check for common senior indicators in title
        senior_terms = [
            'senior', 'lead', 'manager', 'staff', 'principal', 'architect', 'iii', 'iv',
            'vp', 'director', 'president', 'chief', 'head', 'officer', 'faculty', 
            'professor', 'teacher', 'hod', 'dean', 'expert'
        ]
        for term in senior_terms:
            if term in title_lower.split() or f" {term} " in f" {title_lower} ":
                return True
                
        return False

    def is_experience_excessive(self, description: str) -> bool:
        """
        Returns True if the description is NOT strictly for freshers or 0-1 years.
        Rejects unspecified experience or experience requirements >= 2 years.
        """
        if not description:
            return True
            
        desc_lower = description.lower()
        
        # 1. Hard-reject if it explicitly states 2+ years or higher is required
        patterns_excessive = [
            r'\b(?:1[0-9]|[2-9])\+\s*(?:years?|yrs?)',
            r'min(?:imum)?\s*(?:1[0-9]|[2-9])\s*(?:years?|yrs?)',
            r'\b(?:1[0-9]|[2-9])\s*(?:-|to)\s*\d+\s*(?:years?|yrs?)',
            r'\b(?:1[0-9]|[2-9])\s*(?:years?|yrs?)\s*(?:of\s*)?experience',
        ]
        for pattern in patterns_excessive:
            if re.search(pattern, desc_lower):
                return True
                
        # 2. Must explicitly mention "fresher", "entry level", "0-1 year", etc.
        fresher_patterns = [
            r'fresher',
            r'entry.?level',
            r'no\s*experience',
            r'trainee',
            r'intern',
            r'\b0\s*-\s*1\s*(?:years?|yrs?)',
            r'\b0\s*to\s*1\s*(?:years?|yrs?)',
            r'\b0\s*(?:years?|yrs?)',
            r'\b1\s*(?:years?|yrs?)',
        ]
        
        is_fresher_mention = False
        for pattern in fresher_patterns:
            if re.search(pattern, desc_lower):
                is_fresher_mention = True
                break
                
        if not is_fresher_mention:
            return True # Reject since there is no explicit fresher/0-1 year mention
            
        return False

    def score_job_relevance(self, title: str, description: str, course_keywords: list) -> float:
        """
        Weighted relevance scoring for job-to-course matching.
        Returns 0.0-1.0 score. Only create CourseJobMapping if score >= 0.3.

        Title matches are weighted 3x higher than description matches.
        Exact phrase matches score higher than partial matches.
        """
        if not course_keywords:
            return 0.0

        title_lower = title.lower()
        desc_lower = (description or '').lower()
        total_score = 0.0
        max_possible = len(course_keywords) * 4.0  # max per keyword: 3 (title) + 1 (desc)

        for keyword in course_keywords:
            kw_lower = keyword.lower()
            # Exact phrase in title (highest weight)
            if kw_lower in title_lower:
                total_score += 3.0
            # Partial word match in title (medium weight)
            elif any(word in title_lower for word in kw_lower.split()):
                total_score += 1.5
            # Description match (low weight)
            if kw_lower in desc_lower:
                total_score += 1.0

        normalized = min(total_score / max_possible, 1.0) if max_possible > 0 else 0.0
        return round(normalized, 3)

    def classify_job_to_courses(self, title: str, description: str, active_config: dict) -> list:
        """
        Returns list of (course_name, relevance_score) tuples.
        Only includes courses where score >= 0.3 threshold.
        Prevents combinatorial explosion of CourseJobMappings.
        """
        results = []
        for course_name, config in active_config.items():
            keywords = config.get('keywords', []) + config.get('internship_keywords', [])
            score = self.score_job_relevance(title, description, keywords)
            if score >= 0.3:
                results.append((course_name, score))
        return results

    def calculate_quality_score(self, job_data: dict) -> float:
        score = 0.0
        title = job_data.get('title', '')
        description = job_data.get('description', '')

        # Immediate reject for suspicious phrases or excessive experience
        if self.contains_suspicious_phrase(f"{title} {description}"):
            return 0.0
            
        if self.is_experience_excessive(description):
            return 0.0

        if job_data.get('apply_url'):
            score += 20
        if job_data.get('salary_min'):
            score += 15
        if job_data.get('is_internship'):
            score += 10
        posted_at = job_data.get('posted_at')
        if posted_at:
            age_hours = (datetime.now(timezone.utc) - posted_at).total_seconds() / 3600
            if age_hours < 24:
                score += 20
        if job_data.get('company_logo_url'):
            score += 15
        if job_data.get('required_skills'):
            score += 10
            
        # Experience bonus for freshers
        exp_req = job_data.get('experience_required', '').lower()
        if 'fresher' in exp_req or '0-1' in exp_req or '0-2' in exp_req:
            score += 15
            
        # Title quality: penalize ALL-CAPS, very short, or generic titles
        if title and len(title) > 10 and title != title.upper():
            score += 10
        return score

    def extract_experience(self, description: str) -> str:
        if not description:
            return 'Fresher / 0-2 years'
        patterns = [
            r'(\d+)\s*[-–]\s*(\d+)\s*years?\s*(?:of\s*)?experience',
            r'(\d+)\+\s*years?\s*(?:of\s*)?experience',
            r'fresher|entry.?level|0\s*years',
            r'(\d+)\s*years?\s*experience',
        ]
        for pattern in patterns:
            match = re.search(pattern, description, re.IGNORECASE)
            if match:
                matched = match.group(0)
                if any(x in matched.lower() for x in ['fresher', 'entry', '0 years']):
                    return 'Fresher'
                return matched.strip()
        return 'Not specified'

    def extract_skills_from_description(self, description: str) -> list:
        SKILL_PATTERNS = [
            'Python', 'Java', 'JavaScript', 'React', 'Node.js', 'SQL', 'Excel',
            'Photoshop', 'Illustrator', 'After Effects', 'Premiere Pro', 'AutoCAD',
            'SEO', 'Google Ads', 'Facebook Ads', 'Google Analytics', 'HubSpot',
            'Tally', 'MS Office', 'PowerPoint', 'Canva', 'WordPress',
            'Machine Learning', 'Data Analysis', 'Tableau', 'Power BI',
            'Networking', 'Linux', 'AWS', 'Azure', 'Docker', 'Git',
            'Figma', 'Sketch', 'Adobe XD', 'Unity', 'Blender',
        ]
        if not description:
            return []
        found = [s for s in SKILL_PATTERNS if s.lower() in description.lower()]
        return found[:10]

    def parse_salary(self, salary_str: str, currency: str = 'INR') -> dict:
        if not salary_str or salary_str.strip() in ['', 'N/A', 'Not disclosed']:
            return {
                'min': None, 'max': None,
                'currency': currency, 'display': 'Not disclosed',
            }
        patterns = [
            r'(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)\s*(?:LPA|lpa|L)',
        r'(\d+(?:\.\d+)?)\s*(?:K|k)?\s*[-–to]+\s*(\d+(?:\.\d+)?)\s*(?:K|k)?\s*per\s*month',
            r'(\d+(?:,\d+)?)\s*[-–to]+\s*(\d+(?:,\d+)?)',
        ]
        for pattern in patterns:
            match = re.search(pattern, salary_str)
            if match:
                try:
                    min_val = float(match.group(1).replace(',', ''))
                    max_val = float(match.group(2).replace(',', ''))
                    return {
                        'min': min_val, 'max': max_val,
                        'currency': currency, 'display': salary_str.strip(),
                    }
                except (ValueError, IndexError):
                    pass
        return {
            'min': None, 'max': None,
            'currency': currency, 'display': salary_str.strip(),
        }

    def make_short_description(self, description: str) -> str:
        if not description:
            return ''
        clean = re.sub(r'<[^>]+>', ' ', description)
        clean = re.sub(r'\s+', ' ', clean).strip()
        return clean[:500]

    def with_retry(self, func, *args, **kwargs):
        if self.circuit_open:
            logger.warning(f"[{self.SOURCE_NAME}] Circuit open. Skipping.")
            return None
        for attempt in range(1, self.MAX_RETRIES + 1):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.warning(
                    f"[{self.SOURCE_NAME}] Attempt {attempt} failed: {e}"
                )
                self.check_circuit_breaker()
                if self.circuit_open:
                    return None
                if attempt < self.MAX_RETRIES:
                    time.sleep(self.RETRY_DELAY_SECONDS * attempt)
                else:
                    logger.error(
                        f"[{self.SOURCE_NAME}] All retries exhausted: {e}"
                    )
                    self.errors.append(str(e))
                    return None
