import csv

from django.db.models.functions import ExtractMonth
from django.http import HttpResponse
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Job, JobRound
from .serializers import JobSerializer, JobCreateSerializer, EligibilityCheckSerializer
from apps.applications.eligibility_engine import check_eligibility
from apps.applications.serializers import ApplicationSerializer
from core.permissions import IsPlacementManagerOrReadOnly

from django.core.cache import cache

def get_serialized_job_data(job):
    from apps.applications.eligibility_engine import IS_TESTING
    if IS_TESTING:
        return JobSerializer(job).data

    app_count = getattr(job, 'applications_count_annotated', 0)
    cache_key = f"serialized_job_{job.id}_{job.updated_at.timestamp()}_{app_count}"
    
    data = cache.get(cache_key)
    if data is None:
        data = JobSerializer(job).data
        cache.set(cache_key, data, 86400)  # cache for 24 hours
    return data


class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.exclude(status='draft')
    permission_classes = [permissions.IsAuthenticated, IsPlacementManagerOrReadOnly]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return JobCreateSerializer
        return JobSerializer

    def get_queryset(self):
        from django.db.models import Count, Q
        if self.request.user and (self.request.user.role == 'admin' or (self.request.user.role == 'coordinator' and getattr(self.request.user, 'can_manage_placements', False))):
            qs = Job.objects.all().order_by('-updated_at')
        else:
            qs = Job.objects.filter(status='active', job_type='internal').order_by('-updated_at')
            student_profile = getattr(self.request.user, 'student_profile', None)
            if student_profile:
                from apps.applications.models import Application
                deleted_job_ids = Application.objects.filter(student=student_profile, is_deleted=True).values_list('job_id', flat=True)
                qs = qs.exclude(id__in=deleted_job_ids)
        # Filter by listing_type if provided (e.g. ?listing_type=internship)
        listing_type = self.request.query_params.get('listing_type')
        if listing_type in ('job', 'internship'):
            qs = qs.filter(listing_type=listing_type)
        
        # Optimize queries by prefetching rounds and annotating applications count
        qs = qs.prefetch_related('rounds').annotate(
            applications_count_annotated=Count('applications', filter=Q(applications__is_deleted=False))
        )
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        """Create job and return full serialized response."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # Return full read-serializer data
        read_serializer = JobSerializer(serializer.instance)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Update job and return full serialized response with all fields."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Return full read-serializer data so the client sees updated_at, rounds, etc.
        instance.refresh_from_db()
        read_serializer = JobSerializer(instance)
        return Response(read_serializer.data)

    def list(self, request, *args, **kwargs):
        jobs = self.get_queryset()
        student_profile = getattr(request.user, 'student_profile', None)
        
        applied_job_ids = set()
        if student_profile:
            from apps.applications.models import Application
            # 1. Fetch applied job IDs once
            applied_job_ids = set(
                Application.objects.filter(student=student_profile, is_deleted=False).values_list('job_id', flat=True)
            )
            
            # 2. Pre-populate resume profile validation & resume checks to avoid N+1 queries
            try:
                profile = student_profile.resume_profile
            except Exception:
                profile = None
            
            if profile:
                from apps.profiles.rules import ProfileCompletionValidator
                validator = ProfileCompletionValidator()
                is_valid, errors, completion_score = validator.validate_profile(profile)
                student_profile._validated_profile = (is_valid, errors, completion_score)
                
                # Fetch skills list once
                skills_list = list(profile.skills.all())
                student_profile._skills_list = [s.name.lower() for s in skills_list]
                
            from apps.resumes.models import BuiltResume, ResumeUpload
            student_profile._has_primary_built = BuiltResume.objects.filter(student=student_profile, is_primary=True, is_deleted=False).exists()
            student_profile._has_primary_uploaded = ResumeUpload.objects.filter(student=student_profile, is_primary=True, is_deleted=False).exists()
        
        results = []
        for job in jobs:
            data = get_serialized_job_data(job).copy()
            if student_profile:
                eligibility = check_eligibility(student_profile, job, ignore_profile_resume=True)
                data['eligibility'] = eligibility
                data['has_applied'] = job.id in applied_job_ids
            results.append(data)
        
        response = Response(results)
        # Prevent browser/CDN from caching stale job data
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response['Pragma'] = 'no-cache'
        return response

    def retrieve(self, request, *args, **kwargs):
        """Single job detail – also add eligibility + no-cache."""
        instance = self.get_object()
        data = JobSerializer(instance).data
        student_profile = getattr(request.user, 'student_profile', None)
        if student_profile:
            eligibility = check_eligibility(student_profile, instance, ignore_profile_resume=True)
            data['eligibility'] = eligibility
            data['has_applied'] = instance.applications.filter(student=student_profile, is_deleted=False).exists()
        response = Response(data)
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response['Pragma'] = 'no-cache'
        return response

    @action(detail=True, methods=['get'])
    def eligibility(self, request, pk=None):
        job = self.get_object()
        student_profile = getattr(request.user, 'student_profile', None)
        if not student_profile:
            return Response({'error': 'Not a student'}, status=status.HTTP_400_BAD_REQUEST)
        eligibility = check_eligibility(student_profile, job)
        return Response(eligibility)

    @action(detail=False, methods=['get'])
    def recommended(self, request):
        jobs = Job.objects.filter(status='active').prefetch_related('rounds')
        student_profile = getattr(request.user, 'student_profile', None)
        if not student_profile:
            return Response([])
        
        # Pre-populate validation and resume cache to avoid N+1 queries in recommended listing
        try:
            profile = student_profile.resume_profile
        except Exception:
            profile = None
        
        if profile:
            from apps.profiles.rules import ProfileCompletionValidator
            validator = ProfileCompletionValidator()
            is_valid, errors, completion_score = validator.validate_profile(profile)
            student_profile._validated_profile = (is_valid, errors, completion_score)
            
            skills_list = list(profile.skills.all())
            student_profile._skills_list = [s.name.lower() for s in skills_list]
            
        from apps.resumes.models import BuiltResume, ResumeUpload
        student_profile._has_primary_built = BuiltResume.objects.filter(student=student_profile, is_primary=True, is_deleted=False).exists()
        student_profile._has_primary_uploaded = ResumeUpload.objects.filter(student=student_profile, is_primary=True, is_deleted=False).exists()
        
        ranked_jobs = []
        for job in jobs:
            eligibility = check_eligibility(student_profile, job)
            if eligibility['eligible']:
                ranked_jobs.append({'job': job, 'score': eligibility['match_score']})
                
        ranked_jobs.sort(key=lambda x: x['score'], reverse=True)
        top_10 = [item['job'] for item in ranked_jobs[:10]]
        
        return Response(self.get_serializer(top_10, many=True).data)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        if not (request.user.role == 'admin' or (request.user.role == 'coordinator' and getattr(request.user, 'can_manage_placements', False))):
            return Response({'error': 'Only admins or authorized coordinators can publish jobs'}, status=status.HTTP_403_FORBIDDEN)
        job = self.get_object()
        
        job.status = 'active'
        job.save()
        return Response({'status': 'published'})

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        if not (request.user.role == 'admin' or (request.user.role == 'coordinator' and getattr(request.user, 'can_manage_placements', False))):
            return Response({'error': 'Only admins or authorized coordinators can close jobs'}, status=status.HTTP_403_FORBIDDEN)
        job = self.get_object()
        job.status = 'closed'
        job.save()
        return Response({'status': 'closed'})

    @action(detail=True, methods=['get'])
    def applications(self, request, pk=None):
        if not (request.user.role == 'admin' or (request.user.role == 'coordinator' and getattr(request.user, 'can_manage_placements', False))):
            return Response({'error': 'Only admins or authorized coordinators can view applications'}, status=status.HTTP_403_FORBIDDEN)
        job = self.get_object()
        apps = job.applications.filter(is_deleted=False)
        serializer = ApplicationSerializer(apps, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='selected-excel')
    def selected_excel(self, request, pk=None):
        """
        Download Excel of selected students for this job.

        Default statuses: selected + accepted.
        Optional query: ?status=selected&status=accepted (repeatable)
        """
        if not (request.user.role == 'admin' or (request.user.role == 'coordinator' and getattr(request.user, 'can_manage_placements', False))):
            return Response({'error': 'Only admins or authorized coordinators can download exports'}, status=status.HTTP_403_FORBIDDEN)

        job = self.get_object()

        statuses = request.query_params.getlist('status') or request.query_params.getlist('status[]')
        if not statuses:
            statuses = ['selected', 'accepted']

        apps = (
            job.applications
            .filter(status__in=statuses, is_deleted=False)
            .select_related('student', 'job')
            .order_by('student__registration_number', 'student__name')
        )

        safe_company = slugify(job.company_name or 'company')[:40] or 'company'
        safe_role = slugify(getattr(job, 'role', '') or getattr(job, 'title', '') or 'role')[:40] or 'role'
        date_tag = timezone.localtime(timezone.now()).strftime('%Y-%m-%d')
        filename = f"selected_students_{safe_company}_{safe_role}_{date_tag}.xlsx"

        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Selected Students"

        headers = [
            'Company',
            'Role',
            'Student Name',
            'Registration Number',
            'Email',
            'Phone',
            'Course',
            'Stream',
            'CGPA',
            'Status',
            'Applied At',
        ]
        ws.append(headers)

        for app in apps:
            student = app.student
            ws.append([
                job.company_name or '',
                getattr(job, 'role', '') or getattr(job, 'title', '') or '',
                student.name or '',
                student.registration_number or '',
                student.email or '',
                getattr(student, 'phone_number', '') or '',
                student.course or '',
                student.stream or '',
                student.cgpa if student.cgpa is not None else '',
                app.status or '',
                timezone.localtime(app.applied_at).isoformat() if app.applied_at else '',
            ])

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Cache-Control'] = 'no-store'
        wb.save(response)
        return response

    @action(detail=False, methods=['get'], url_path='cycle-selected-excel')
    def cycle_selected_excel(self, request):
        """
        Download Excel of selected students across a placement cycle (all companies).

        Uses the same season buckets as the frontend:
        - all
        - jan_mar: Dec/Jan/Feb
        - mar_june: Mar..Jul
        - aug_nov: Aug..Nov
        """
        if not (request.user.role == 'admin' or (request.user.role == 'coordinator' and getattr(request.user, 'can_manage_placements', False))):
            return Response({'error': 'Only admins or authorized coordinators can download exports'}, status=status.HTTP_403_FORBIDDEN)

        season = (request.query_params.get('season') or 'all').strip()
        listing_type = (request.query_params.get('listing_type') or '').strip()

        jobs_qs = Job.objects.all()
        if listing_type in ('job', 'internship'):
            jobs_qs = jobs_qs.filter(listing_type=listing_type)

        if season == 'jan_mar':
            months = [12, 1, 2]
            jobs_qs = jobs_qs.annotate(m=ExtractMonth('created_at')).filter(m__in=months)
        elif season == 'mar_june':
            months = [3, 4, 5, 6, 7]
            jobs_qs = jobs_qs.annotate(m=ExtractMonth('created_at')).filter(m__in=months)
        elif season == 'aug_nov':
            months = [8, 9, 10, 11]
            jobs_qs = jobs_qs.annotate(m=ExtractMonth('created_at')).filter(m__in=months)
        else:
            season = 'all'

        statuses = request.query_params.getlist('status') or request.query_params.getlist('status[]')
        if not statuses:
            statuses = ['selected', 'accepted']

        from apps.applications.models import Application

        apps = (
            Application.objects.filter(job__in=jobs_qs, status__in=statuses)
            .select_related('student', 'job')
            .order_by('job__company_name', 'job__role', 'student__registration_number', 'student__name')
        )

        date_tag = timezone.localtime(timezone.now()).strftime('%Y-%m-%d')
        filename = f"selected_students_cycle_{season}_{date_tag}.xlsx"

        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Cycle Selected"

        headers = [
            'Cycle',
            'Company',
            'Role',
            'Student Name',
            'Registration Number',
            'Email',
            'Phone',
            'Course',
            'Stream',
            'CGPA',
            'Status',
            'Applied At',
            'Job Created At',
        ]
        ws.append(headers)

        for app in apps:
            job = app.job
            student = app.student
            ws.append([
                season,
                job.company_name or '',
                job.role or '',
                student.name or '',
                student.registration_number or '',
                student.email or '',
                getattr(student, 'phone_number', '') or '',
                student.course or '',
                student.stream or '',
                student.cgpa if student.cgpa is not None else '',
                app.status or '',
                timezone.localtime(app.applied_at).isoformat() if app.applied_at else '',
                timezone.localtime(job.created_at).isoformat() if job.created_at else '',
            ])

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Cache-Control'] = 'no-store'
        wb.save(response)
        return response

