import pytest
from unittest.mock import patch
from apps.scraped_jobs.tasks import run_nightly_scrape

@pytest.mark.django_db
def test_run_nightly_scrape_task():
    with patch('apps.scraped_jobs.orchestrator.ScrapingOrchestrator.run_full_scrape') as mock_run:
        run_nightly_scrape()
        assert mock_run.called
