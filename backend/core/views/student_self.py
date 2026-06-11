# core/views/student_self.py
"""Student self-service — profile, my placements (read-only)."""
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from django.utils import timezone
from ..models import Student, PlacementAssignment, ExternalClickLog
from apps.jobs.models import Job
from apps.applications.models import Application
from ..serializers import UserSerializer, StudentSerializer, PlacementAssignmentSerializer


class StudentSelfViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='log-click')
    def log_click(self, request):
        """Log an external click by the student."""
        job_title = request.data.get('job_title', '')
        company_name = request.data.get('company_name', '')
        external_url = request.data.get('external_url')
        if not external_url:
            return Response({'error': 'external_url is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if the student has already clicked this link before
        click_log = ExternalClickLog.objects.filter(user=request.user, external_url=external_url).first()
        if click_log:
            click_log.click_count += 1
            if job_title and not click_log.job_title:
                click_log.job_title = job_title
            if company_name and not click_log.company_name:
                click_log.company_name = company_name
            click_log.save()
            return Response({'message': 'Click count incremented.', 'click_count': click_log.click_count}, status=status.HTTP_200_OK)

        ExternalClickLog.objects.create(
            user=request.user,
            job_title=job_title,
            company_name=company_name,
            external_url=external_url,
            click_count=1
        )
        return Response({'message': 'Click logged successfully.', 'click_count': 1}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='me')
    def get_me(self, request):
        """Get current logged-in user info + dashboard summary for student."""
        user_data = UserSerializer(request.user).data
        
        # Add summary data for student dashboard
        student = getattr(request.user, 'student_profile', None)
        upcoming_qs = Job.objects.filter(
            status='active', 
            application_deadline__gt=timezone.now()
        )
        if student:
            deleted_job_ids = Application.objects.filter(student=student, is_deleted=True).values_list('job_id', flat=True)
            upcoming_qs = upcoming_qs.exclude(id__in=deleted_job_ids)
            
        upcoming = upcoming_qs.order_by('application_deadline')[:5]  # nearest deadline first
        
        applied_job_ids = set()
        if student:
            applied_job_ids = set(
                Application.objects.filter(student=student, is_deleted=False).values_list('job_id', flat=True)
            )

        user_data['upcoming_jobs'] = [{
            'id': job.id,
            'company_name': job.company_name,
            'role': job.role,
            'deadline': job.application_deadline,
            'package': job.package,
            'has_applied': job.id in applied_job_ids if student else False
        } for job in upcoming]

        # Add job applications (new system)
        try:
            apps = Application.objects.filter(student=student).select_related('job').order_by('-applied_at')
            user_data['job_applications'] = [{
                'id': app.id,
                'company_name': app.job.company_name,
                'role': app.job.role,
                'status': 'rejected' if app.is_deleted else app.status,
                'job_type': app.job.job_type,
                'job_status': app.job.status,
                'applied_at': app.applied_at
            } for app in apps]
        except Student.DoesNotExist:
            user_data['job_applications'] = []
        
        response = Response(user_data)
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response

    @action(detail=False, methods=['get'], url_path='profile')
    def get_profile(self, request):
        """Get current student's full profile + sync dashboard data."""
        try:
            student = request.user.student_profile
        except Student.DoesNotExist:
            return Response({'error': 'No student profile.'}, status=status.HTTP_404_NOT_FOUND)
            
        data = StudentSerializer(student, context={'request': request}).data
        
        # Sync: Add applications and upcoming jobs here too
        apps = Application.objects.filter(student=student).select_related('job').order_by('-applied_at')
        data['job_applications'] = [{
            'id': app.id,
            'company_name': app.job.company_name,
            'role': app.job.role,
            'status': 'rejected' if app.is_deleted else app.status,
            'job_type': app.job.job_type,
            'job_status': app.job.status,
            'applied_at': app.applied_at
        } for app in apps]
        
        upcoming_qs = Job.objects.filter(
            status='active', 
            application_deadline__gt=timezone.now()
        )
        deleted_job_ids = Application.objects.filter(student=student, is_deleted=True).values_list('job_id', flat=True)
        upcoming_qs = upcoming_qs.exclude(id__in=deleted_job_ids)
        upcoming = upcoming_qs.order_by('application_deadline')[:5]  # nearest deadline first
        
        applied_job_ids = set(
            Application.objects.filter(student=student, is_deleted=False).values_list('job_id', flat=True)
        )

        data['upcoming_jobs'] = [{
            'id': job.id,
            'company_name': job.company_name,
            'role': job.role,
            'deadline': job.application_deadline,
            'package': job.package,
            'has_applied': job.id in applied_job_ids
        } for job in upcoming]
        
        response = Response(data)
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response

    @action(detail=False, methods=['get'], url_path='placements')
    def my_placements(self, request):
        """Get placements assigned to the current student."""
        try:
            student = request.user.student_profile
        except Student.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)
        assignments = PlacementAssignment.objects.filter(
            student=student
        ).select_related('placement', 'assigned_by')
        return Response(PlacementAssignmentSerializer(assignments, many=True).data)
