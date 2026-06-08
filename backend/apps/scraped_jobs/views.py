# apps/scraped_jobs/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from django.db import models as db_models

from core.permissions import IsStudentUser, IsAdminOrCoordinator
from .pagination import StandardPagination
from .models import (
    ScrapedJob, CourseJobMapping, ScrapingRun, StudentSavedJob,
    StudentJobView, CourseJobFeedCache,
)
from .serializers import (
    ScrapedJobSerializer, ScrapedJobDetailSerializer, ScrapingRunSerializer,
    AdminEditJobSerializer,
)


class StudentJobFeedView(APIView):
    """
    GET /api/v1/scraped-jobs/student/job-feed/

    Feed strategy:
      1. Read CourseJobFeedCache for student's course.
      2. Validate freshness: cache.scraping_run_id == latest completed ScrapingRun.id
      3. If fresh: load from cached IDs (re-filter is_active=True AND is_approved=True)
      4. If stale or missing: live query fallback.
    """
    permission_classes = [IsAuthenticated, IsStudentUser]

    def get(self, request):
        student = request.user.student_profile
        student_course = getattr(student, 'course', None) or ''

        if not student_course:
            return Response({
                'error': 'no_course',
                'message': 'Your enrolled course is not configured. Contact your coordinator.',
                'jobs': {'count': 0, 'results': []},
                'internships': {'count': 0, 'results': []},
            }, status=400)

        sort = request.query_params.get('sort', '-quality_score')
        job_type_filter = request.query_params.get('type', 'all')
        try:
            page_size = min(int(request.query_params.get('page_size', 20)), 50)
        except (ValueError, TypeError):
            page_size = 20

        allowed_sorts = ['-scraped_at', 'scraped_at', '-salary_max', 'company_name', '-quality_score']
        if sort not in allowed_sorts:
            sort = '-quality_score'

        cutoff = timezone.now() - timedelta(days=7)

        from apps.scraped_jobs.course_config import normalize_course_name
        norm_course = normalize_course_name(student_course)
        norm_stream = normalize_course_name(getattr(student, 'stream', '') or '')

        # We look for jobs matching either the Course or the Stream
        search_terms = [t for t in [norm_course, norm_stream, getattr(student, 'stream', None)] if t]

        # Check cache for any of the terms (using the first one found in cache)
        cache_obj = None
        for term in search_terms:
            cache_obj = CourseJobFeedCache.objects.filter(course_name=term).first()
            if cache_obj:
                break

        latest_run = ScrapingRun.objects.filter(status='completed').order_by('-id').first()
        cache_is_fresh = (
            cache_obj is not None
            and latest_run is not None
            and cache_obj.scraping_run_id == latest_run.id
        )

        if cache_is_fresh:
            # Only show APPROVED jobs to students
            all_jobs_qs = ScrapedJob.objects.filter(
                id__in=cache_obj.job_ids, is_active=True, is_approved=True,
            ).order_by(sort)
            all_interns_qs = ScrapedJob.objects.filter(
                id__in=cache_obj.internship_ids, is_active=True, is_approved=True,
            ).order_by(sort)
            total_jobs = all_jobs_qs.count()
            total_internships = all_interns_qs.count()
        else:
            # Fallback: Search CourseJobMapping for any of the student's terms (Course or Stream)
            course_job_ids = CourseJobMapping.objects.filter(
                course_name__in=search_terms,
                scraped_job__is_active=True,
                scraped_job__is_approved=True,
            ).values_list('scraped_job_id', flat=True)

            all_jobs_qs = ScrapedJob.objects.filter(
                id__in=course_job_ids, is_internship=False,
            ).order_by(sort)
            all_interns_qs = ScrapedJob.objects.filter(
                id__in=course_job_ids, is_internship=True,
            ).order_by(sort)
            total_jobs = all_jobs_qs.count()
            total_internships = all_interns_qs.count()

        saved_ids = set(
            StudentSavedJob.objects.filter(student=student).values_list('scraped_job_id', flat=True)
        )

        ctx = {'saved_ids': saved_ids}

        if job_type_filter == 'internships':
            jobs_data = []
            internships_data = ScrapedJobSerializer(all_interns_qs[:page_size], many=True, context=ctx).data
        elif job_type_filter == 'jobs':
            jobs_data = ScrapedJobSerializer(all_jobs_qs[:page_size], many=True, context=ctx).data
            internships_data = []
        else:
            jobs_data = ScrapedJobSerializer(all_jobs_qs[:page_size], many=True, context=ctx).data
            internships_data = ScrapedJobSerializer(all_interns_qs[:page_size], many=True, context=ctx).data

        last_updated = None
        if cache_is_fresh and cache_obj.job_ids:
            last_updated = ScrapedJob.objects.filter(
                id__in=cache_obj.job_ids[:1]
            ).values_list('scraped_at', flat=True).first()
        if not last_updated:
            last_updated = ScrapedJob.objects.filter(
                course_mappings__course_name=student_course
            ).order_by('-scraped_at').values_list('scraped_at', flat=True).first()

        return Response({
            'course': student_course,
            'feed_window': '7 days',
            'cache_fresh': cache_is_fresh,
            'jobs': {'count': total_jobs, 'results': jobs_data},
            'internships': {'count': total_internships, 'results': internships_data},
            'last_updated': last_updated,
        })


class ScrapedJobDetailView(APIView):
    """GET /api/v1/scraped-jobs/student/jobs/{id}/"""
    permission_classes = [IsAuthenticated, IsStudentUser]

    def get(self, request, job_id):
        student = request.user.student_profile
        job = ScrapedJob.objects.filter(id=job_id, is_active=True, is_approved=True).first()
        if not job:
            return Response({'error': 'not_found', 'message': 'Job not found or expired.'}, status=404)
        try:
            StudentJobView.objects.get_or_create(student=student, scraped_job=job)
        except Exception:
            pass
        is_saved = StudentSavedJob.objects.filter(student=student, scraped_job=job).exists()
        saved_ids = {job.id} if is_saved else set()
        return Response(ScrapedJobDetailSerializer(job, context={'saved_ids': saved_ids}).data)


class SaveJobView(APIView):
    """POST /save -> save | DELETE /save -> unsave"""
    permission_classes = [IsAuthenticated, IsStudentUser]

    def post(self, request, job_id):
        student = request.user.student_profile
        job = ScrapedJob.objects.filter(id=job_id, is_active=True, is_approved=True).first()
        if not job:
            return Response({'error': 'not_found'}, status=404)
        obj, created = StudentSavedJob.objects.get_or_create(student=student, scraped_job=job)
        return Response({'saved': True, 'message': 'Job saved.'}, status=201 if created else 200)

    def delete(self, request, job_id):
        student = request.user.student_profile
        deleted, _ = StudentSavedJob.objects.filter(student=student, scraped_job_id=job_id).delete()
        if deleted:
            return Response({'saved': False, 'message': 'Removed.'}, status=200)
        return Response({'error': 'not_saved'}, status=404)


class SavedJobsView(APIView):
    """GET /api/v1/scraped-jobs/student/saved-jobs/"""
    permission_classes = [IsAuthenticated, IsStudentUser]

    def get(self, request):
        student = request.user.student_profile
        saved = StudentSavedJob.objects.filter(
            student=student, scraped_job__is_active=True, scraped_job__is_approved=True,
        ).select_related('scraped_job').order_by('-saved_at')
        paginator = StandardPagination()
        page = paginator.paginate_queryset(saved, request)
        data = [ScrapedJobSerializer(s.scraped_job, context={'saved_ids': {s.scraped_job_id}}).data for s in page]
        return paginator.get_paginated_response(data)


class AdminScrapingDashboardView(APIView):
    """GET /api/v1/scraped-jobs/admin/scraping/status/"""
    permission_classes = [IsAuthenticated, IsAdminOrCoordinator]

    def get(self, request):
        last_run = ScrapingRun.objects.order_by('-started_at').first()
        recent_runs = ScrapingRun.objects.order_by('-started_at')[:5]
        total_active = ScrapedJob.objects.filter(is_active=True).count()
        total_pending = ScrapedJob.objects.filter(is_active=True, is_approved=False).count()
        total_approved = ScrapedJob.objects.filter(is_active=True, is_approved=True).count()
        jobs_by_course = (
            CourseJobMapping.objects
            .values('course_name')
            .annotate(count=db_models.Count('scraped_job', distinct=True))
            .filter(scraped_job__is_active=True)
            .order_by('course_name')
        )
        from .models import ScraperHealthMetric
        health = list(
            ScraperHealthMetric.objects.filter(scraping_run=last_run)
            .values('source', 'jobs_fetched', 'actual_api_calls', 'is_healthy')
        ) if last_run else []

        return Response({
            'last_run': ScrapingRunSerializer(last_run).data if last_run else None,
            'recent_runs': ScrapingRunSerializer(recent_runs, many=True).data,
            'total_active_jobs': total_active,
            'total_pending_approval': total_pending,
            'total_approved_jobs': total_approved,
            'jobs_by_course': list(jobs_by_course),
            'source_health': health,
            'next_scheduled': '23:00 IST daily',
        })


class AdminTriggerScrapeView(APIView):
    """POST /api/v1/scraped-jobs/admin/scraping/trigger/"""
    permission_classes = [IsAuthenticated, IsAdminOrCoordinator]

    def post(self, request):
        from django.core.cache import cache
        if cache.get('nightly_scrape_lock') or ScrapingRun.objects.filter(status='running').exists():
            return Response({'error': 'already_running', 'message': 'A run is already in progress.'}, status=409)
        try:
            # Run scrape directly (no broker/worker needed — works for S3/serverless)
            from .orchestrator import ScrapingOrchestrator
            orchestrator = ScrapingOrchestrator()
            run = orchestrator.run_full_scrape()
            return Response({
                'message': 'Scraping completed.',
                'run_id': run.id,
                'status': run.status,
                'total_saved': run.total_saved,
                'courses_failed': run.courses_failed,
            }, status=200)
        except Exception as exc:
            return Response({'error': 'scrape_failed', 'message': str(exc)}, status=500)


class AdminScrapedJobsListView(APIView):
    """GET /api/v1/scraped-jobs/admin/scraping/jobs/"""
    permission_classes = [IsAuthenticated, IsAdminOrCoordinator]

    def get(self, request):
        qs = ScrapedJob.objects.filter(is_active=True).order_by('-scraped_at')
        course = request.query_params.get('course')
        source = request.query_params.get('source')
        job_type = request.query_params.get('type')
        search = request.query_params.get('search')
        approval = request.query_params.get('approved')  # 'true' | 'false' | None (all)

        if course:
            course_ids = CourseJobMapping.objects.filter(course_name=course).values_list('scraped_job_id', flat=True)
            qs = qs.filter(id__in=course_ids)
        if source:
            qs = qs.filter(source=source)
        if job_type == 'internship':
            qs = qs.filter(is_internship=True)
        elif job_type == 'job':
            qs = qs.filter(is_internship=False)
        if search:
            qs = qs.filter(
                db_models.Q(title__icontains=search) | db_models.Q(company_name__icontains=search)
            )
        if approval == 'true':
            qs = qs.filter(is_approved=True)
        elif approval == 'false':
            qs = qs.filter(is_approved=False)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(ScrapedJobSerializer(page, many=True).data)


class AdminApproveJobView(APIView):
    """
    POST   /api/v1/scraped-jobs/admin/scraping/jobs/<id>/approve/  -> approve
    DELETE /api/v1/scraped-jobs/admin/scraping/jobs/<id>/approve/  -> revoke
    """
    permission_classes = [IsAuthenticated, IsAdminOrCoordinator]

    def post(self, request, job_id):
        job = ScrapedJob.objects.filter(id=job_id, is_active=True).first()
        if not job:
            return Response({'error': 'not_found', 'message': 'Job not found.'}, status=404)
        if job.is_approved:
            return Response({'message': 'Already approved.', 'is_approved': True}, status=200)
        job.is_approved = True
        job.approved_by = request.user
        job.approved_at = timezone.now()
        job.save(update_fields=['is_approved', 'approved_by', 'approved_at'])
        return Response({'message': 'Job approved.', 'is_approved': True}, status=200)

    def delete(self, request, job_id):
        job = ScrapedJob.objects.filter(id=job_id, is_active=True).first()
        if not job:
            return Response({'error': 'not_found', 'message': 'Job not found.'}, status=404)
        job.is_approved = False
        job.approved_by = None
        job.approved_at = None
        job.save(update_fields=['is_approved', 'approved_by', 'approved_at'])
        return Response({'message': 'Approval revoked.', 'is_approved': False}, status=200)


class AdminEditJobView(APIView):
    """
    GET   /api/v1/scraped-jobs/admin/scraping/jobs/<id>/edit/  -> full job data for form
    PATCH /api/v1/scraped-jobs/admin/scraping/jobs/<id>/edit/  -> partial update
    """
    permission_classes = [IsAuthenticated, IsAdminOrCoordinator]

    def get(self, request, job_id):
        job = ScrapedJob.objects.filter(id=job_id, is_active=True).first()
        if not job:
            return Response({'error': 'not_found', 'message': 'Job not found.'}, status=404)
        return Response(ScrapedJobDetailSerializer(job, context={'saved_ids': set()}).data)

    def patch(self, request, job_id):
        job = ScrapedJob.objects.filter(id=job_id, is_active=True).first()
        if not job:
            return Response({'error': 'not_found', 'message': 'Job not found.'}, status=404)
        serializer = AdminEditJobSerializer(job, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Refresh from DB and return full read serializer
            job.refresh_from_db()
            return Response(ScrapedJobSerializer(job, context={'saved_ids': set()}).data)
        return Response({'errors': serializer.errors}, status=400)
