import time
import random
import hashlib
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from django.db import models as db_models

from core.permissions import IsAdminOrCoordinator
from apps.scraped_jobs.models import (
    ScrapedJob, CourseJobMapping, ScrapingRun,
)
from apps.scraped_jobs.serializers import ScrapingRunSerializer
from apps.scraped_jobs.course_config import get_active_config, normalize_course_name


class LinkedInScraperDashboardView(APIView):
    """
    GET /api/v1/job_scraper/status/
    Returns status of LinkedIn scraping runs and metrics.
    """
    permission_classes = [IsAuthenticated, IsAdminOrCoordinator]

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.user and request.user.is_authenticated and request.user.role == 'coordinator':
            if not getattr(request.user, 'can_view_scraping', False):
                self.permission_denied(request, message="You do not have permission to access scraping tools.")

    def get(self, request):
        # We identify LinkedIn runs by the presence of 'linkedin' in api_calls_made JSON key
        last_run = ScrapingRun.objects.filter(api_calls_made__has_key='linkedin').order_by('-started_at').first()
        recent_runs = ScrapingRun.objects.filter(api_calls_made__has_key='linkedin').order_by('-started_at')[:5]
        
        total_active = ScrapedJob.objects.filter(source='linkedin', is_active=True).count()
        total_pending = ScrapedJob.objects.filter(source='linkedin', is_active=True, is_approved=False).count()
        total_approved = ScrapedJob.objects.filter(source='linkedin', is_active=True, is_approved=True).count()
        
        jobs_by_course = (
            CourseJobMapping.objects
            .values('course_name')
            .annotate(count=db_models.Count('scraped_job', distinct=True))
            .filter(scraped_job__source='linkedin', scraped_job__is_active=True)
            .order_by('course_name')
        )

        health = [{
            'source': 'LinkedIn Apify',
            'jobs_fetched': last_run.total_fetched if last_run else 0,
            'actual_api_calls': last_run.api_calls_made.get('linkedin', 0) if last_run else 0,
            'is_healthy': True
        }]

        return Response({
            'last_run': ScrapingRunSerializer(last_run).data if last_run else None,
            'recent_runs': ScrapingRunSerializer(recent_runs, many=True).data,
            'total_active_jobs': total_active,
            'total_pending_approval': total_pending,
            'total_approved_jobs': total_approved,
            'jobs_by_course': list(jobs_by_course),
            'source_health': health,
            'next_scheduled': 'Manual trigger only',
        })


class LinkedInTriggerScrapeView(APIView):
    """
    POST /api/v1/job_scraper/trigger/
    Automatically triggers a LinkedIn scrape using all active course keywords.
    Saves the jobs to ScrapedJob and maps them to courses.
    """
    permission_classes = [IsAuthenticated, IsAdminOrCoordinator]

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.user and request.user.is_authenticated and request.user.role == 'coordinator':
            if not getattr(request.user, 'can_view_scraping', False):
                self.permission_denied(request, message="You do not have permission to access scraping tools.")

    def post(self, request):
        if ScrapingRun.objects.filter(status='running', api_calls_made__has_key='linkedin').exists():
            return Response({'error': 'already_running', 'message': 'A LinkedIn scraping run is already in progress.'}, status=409)

        # Create running ScrapingRun for LinkedIn
        run = ScrapingRun.objects.create(
            status='running',
            api_calls_made={'linkedin': 1}
        )

        from .tasks import run_linkedin_scrape
        task = run_linkedin_scrape.delay(run.id)

        return Response({
            'message': 'LinkedIn scraping queued.',
            'task_id': task.id,
            'run_id': run.id
        }, status=202)

