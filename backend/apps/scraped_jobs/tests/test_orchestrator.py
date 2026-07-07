import pytest
from unittest.mock import patch, MagicMock
from apps.scraped_jobs.orchestrator import ScrapingOrchestrator
from apps.scraped_jobs.models import ScrapingRun, ScrapedJob
from django.core.cache import cache

@pytest.mark.django_db
class TestOrchestrator:

    def test_orchestrator_lock(self):
        orchestrator = ScrapingOrchestrator()
        cache.set("nightly_scrape_lock", True)
        
        run = orchestrator.run_full_scrape()
        # If lock is held, it should return None or an existing run, not create a new one
        assert ScrapingRun.objects.count() == 0
        cache.delete("nightly_scrape_lock")

    @patch('apps.scraped_jobs.orchestrator.SCRAPER_STRATEGIES', {'DEFAULT': ['jsearch']})
    @patch('apps.scraped_jobs.orchestrator.get_active_config')
    @patch('apps.scraped_jobs.scrapers.jsearch_scraper.JSearchScraper.fetch_jobs')
    @patch('apps.scraped_jobs.scrapers.jsearch_scraper.JSearchScraper.fetch_internships')
    def test_full_scrape_flow(self, mock_fetch_interns, mock_fetch_jobs, mock_config):
        mock_config.return_value = {
            'BSc in Data Science': {'keywords': ['Data Science'], 'internship_keywords': []}
        }
        mock_fetch_jobs.return_value = [
            {
                'external_job_id': 'test1',
                'source': 'jsearch',
                'title': 'Data Scientist',
                'company_name': 'TestCo',
                'dedup_hash': 'hash123',
                'quality_score': 50,
                'matched_courses': [('BSc in Data Science', 1.0)],
                'posted_at': None,
            }
        ]
        mock_fetch_interns.return_value = []
        
        orchestrator = ScrapingOrchestrator()
        orchestrator.run_full_scrape()
        
        assert ScrapingRun.objects.count() == 1
        assert ScrapedJob.objects.count() == 1
        assert ScrapedJob.objects.first().title == 'Data Scientist'

    def test_deactivate_expired_jobs(self):
        from datetime import datetime, timezone, timedelta
        old_date = datetime.now(timezone.utc) - timedelta(days=8)
        job = ScrapedJob.objects.create(
            external_job_id='old', source='test', title='Old Job',
            company_name='OldCo', dedup_hash='oldhash',
            is_active=True
        )
        ScrapedJob.objects.filter(id=job.id).update(scraped_at=old_date)
        
        orchestrator = ScrapingOrchestrator()
        count = orchestrator._deactivate_expired_jobs()
        
        assert count == 1
        assert ScrapedJob.objects.get(external_job_id='old').is_active is False
