import pytest
from datetime import datetime, timezone
from apps.scraped_jobs.scrapers.base import BaseJobScraper
from apps.scraped_jobs.scrapers.lever_scraper import LeverScraper
from unittest.mock import MagicMock, patch

class MockScraper(BaseJobScraper):
    SOURCE_NAME = 'mock'
    def fetch_jobs(self, course_name, keywords, limit=25): return []
    def fetch_internships(self, course_name, keywords, limit=10): return []

@pytest.fixture
def base_scraper():
    return MockScraper()

def test_normalize_text(base_scraper):
    assert base_scraper._normalize_text("  Software   Engineer!  ") == "software engineer"
    assert base_scraper._normalize_text("L.P.A.") == "lpa"
    assert base_scraper._normalize_text(None) == ""

def test_compute_dedup_hash(base_scraper):
    h1 = base_scraper.compute_dedup_hash("Software Engineer", "Google")
    h2 = base_scraper.compute_dedup_hash("software engineer", "google")
    h3 = base_scraper.compute_dedup_hash("Backend Dev", "Google")
    assert h1 == h2
    assert h1 != h3

def test_score_job_relevance(base_scraper):
    keywords = ["Python", "Django", "React"]
    # Title match (3.0) + Desc match (1.0) = 4.0. Max possible = 3 * 4.0 = 12.0. 4/12 = 0.333
    score = base_scraper.score_job_relevance("Python Developer", "Knowledge of Django is good", keywords)
    assert score >= 0.3
    
    # No match
    score = base_scraper.score_job_relevance("Chef", "Cooking pasta", keywords)
    assert score == 0.0

def test_sanitize_description(base_scraper):
    html = "<p>Hello <b>World</b><script>alert(1)</script></p>"
    assert base_scraper.sanitize_description(html) == "Hello Worldalert(1)"

def test_parse_salary(base_scraper):
    res = base_scraper.parse_salary("5 - 10 LPA")
    assert res['min'] == 5.0
    assert res['max'] == 10.0
    
    res = base_scraper.parse_salary("20K - 30K per month")
    assert res['min'] == 20.0
    assert res['max'] == 30.0

def test_extract_experience(base_scraper):
    assert base_scraper.extract_experience("Requires 3-5 years of experience") == "3-5 years of experience"
    assert base_scraper.extract_experience("Looking for fresHERs") == "Fresher"
    assert base_scraper.extract_experience("No experience mentioned") == "Not specified"

@patch('requests.Session.get')
def test_lever_scraper_fetch(mock_get):
    scraper = LeverScraper()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = [
        {
            'id': 'job1',
            'text': 'Software Intern',
            'hostedUrl': 'https://lever.co/job1',
            'categories': {'location': 'Remote', 'team': 'Engineering'},
            'descriptionPlain': 'We need a Python intern',
            'createdAt': int(datetime.now(timezone.utc).timestamp() * 1000)
        }
    ]
    mock_get.return_value = mock_response
    
    # Use keywords that appear in title to boost score > 0.3
    jobs = scraper.fetch_jobs('BSc in Computer Application (BCA)', ['Software', 'Python'], limit=1)
    assert len(jobs) == 1
    assert jobs[0]['title'] == 'Software Intern'
    assert jobs[0]['is_internship'] is True
    assert jobs[0]['source'] == 'lever'


@patch('requests.Session.post')
@patch('requests.Session.get')
def test_linkedin_scraper_batch(mock_get, mock_post):
    from apps.scraped_jobs.scrapers.linkedin_scraper import LinkedInScraper
    scraper = LinkedInScraper()
    scraper.apify_token = 'fake-token'

    # Mock Apify actor run triggering response
    mock_post_res = MagicMock()
    mock_post_res.status_code = 201
    mock_post_res.json.return_value = {
        'data': {
            'id': 'run123',
            'defaultDatasetId': 'dataset123'
        }
    }
    mock_post.return_value = mock_post_res

    # Mock Apify status checks and dataset retrieval
    # First get is status check (SUCCEEDED), second get is dataset items
    mock_get_res1 = MagicMock()
    mock_get_res1.status_code = 200
    mock_get_res1.json.return_value = {'data': {'status': 'SUCCEEDED'}}
    
    mock_get_res2 = MagicMock()
    mock_get_res2.status_code = 200
    mock_get_res2.json.return_value = [
        {
            'id': 'job1',
            'title': 'Junior Python Developer',
            'company': 'Google',
            'url': 'https://linkedin.com/job1',
            'description': 'Python React software developer fresher',
            'postedAt': '2026-07-08T12:00:00Z'
        }
    ]
    
    mock_get.side_effect = [mock_get_res1, mock_get_res2]

    # Mock orchestrator counts
    mock_orch = MagicMock()
    mock_orch._get_active_counts.return_value = (0, 0)

    active_config = {
        'BSc in Computer Application (BCA)': {
            'keywords': ['Python', 'Developer'],
            'internship_keywords': ['Developer intern'],
        }
    }

    # Run batch pre-fetch
    scraper.pre_fetch_batch(active_config, mock_orch)

    # Check cache was populated
    assert scraper._batch_fetched is True
    assert 'BSc in Computer Application (BCA)' in scraper._batch_cache['jobs']
    assert len(scraper._batch_cache['jobs']['BSc in Computer Application (BCA)']) == 1

    # Check fetch_jobs reads from cache
    jobs = scraper.fetch_jobs('BSc in Computer Application (BCA)', ['Python'], limit=1)
    assert len(jobs) == 1
    assert jobs[0]['title'] == 'Junior Python Developer'
    
    # Check that calling fetch_jobs again does NOT trigger requests.Session.post (uses cache)
    mock_post.reset_mock()
    jobs2 = scraper.fetch_jobs('BSc in Computer Application (BCA)', ['Python'], limit=1)
    assert len(jobs2) == 1
    mock_post.assert_not_called()

