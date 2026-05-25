# apps/scraped_jobs/management/commands/run_scrape.py
from django.core.management.base import BaseCommand
from apps.scraped_jobs.orchestrator import ScrapingOrchestrator
import logging

class Command(BaseCommand):
    help = 'Runs the job scraping pipeline manually'

    def handle(self, *args, **options):
        self.stdout.write("Starting manual scrape...")
        orchestrator = ScrapingOrchestrator()
        run = orchestrator.run_full_scrape()
        
        self.stdout.write(self.style.SUCCESS(f"Scrape completed with status: {run.status}"))
        self.stdout.write(f"Total Fetched: {run.total_fetched}")
        self.stdout.write(f"Total Saved: {run.total_saved}")
        self.stdout.write(f"Total Duplicates: {run.total_duplicates_skipped}")
        self.stdout.write(f"API Calls: {run.api_calls_made}")
