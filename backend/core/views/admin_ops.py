import random
import string
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q, Count
from ..models import User, AuditLog, ExternalClickLog
from ..serializers import ExternalClickLogSerializer
from ..permissions import IsAdminOnly
from .helpers import log_audit

class AdminOpsViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOnly]

    @action(detail=False, methods=['post'], url_path='create-coordinator')
    def create_coordinator(self, request):
        """Admin creates a coordinator with a random password and sends an email."""
        name = request.data.get('name')
        email = request.data.get('email')
        login_id = request.data.get('login_id')
        
        # Permissions
        can_manage_students = request.data.get('can_manage_students', False)
        can_manage_placements = request.data.get('can_manage_placements', False)
        can_manage_resumes = request.data.get('can_manage_resumes', False)

        if not all([name, email, login_id]):
            return Response({'error': 'Name, email, and login_id are required.'}, status=status.HTTP_400_BAD_VALUE)

        if User.objects.filter(login_id=login_id).exists():
            return Response({'error': 'Login ID already exists.'}, status=status.HTTP_400_BAD_VALUE)

        # Generate random password
        password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
        
        try:
            user = User.objects.create_user(
                login_id=login_id,
                email=email,
                password=password,
                name=name,
                role='coordinator',
                temp_password_flag=True,
                can_manage_students=can_manage_students,
                can_manage_placements=can_manage_placements,
                can_manage_resumes=can_manage_resumes
            )

            # Send Email
            subject = 'Welcome to iLEAD Placement Portal'
            message = f"""
            Hello {name},

            You have been added as a Placement Coordinator.
            Your login details are:
            
            Login ID: {login_id}
            Temporary Password: {password}
            
            Please log in at {settings.FRONTEND_URL} and change your password immediately.
            """
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )

            log_audit(request.user, 'coordinator_created', f'Created {login_id}', request)
            return Response({'message': 'Coordinator created and email sent successfully.'}, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='list-coordinators')
    def list_coordinators(self, request):
        """List all coordinators."""
        coordinators = User.objects.filter(role='coordinator').values(
            'id', 'login_id', 'email', 'name', 'created_at',
            'can_manage_students', 'can_manage_placements', 'can_manage_resumes'
        )
        return Response(list(coordinators))

    @action(detail=True, methods=['put'], url_path='update-permissions')
    def update_permissions(self, request, pk=None):
        """Update permissions for a specific coordinator."""
        try:
            coordinator = User.objects.get(id=pk, role='coordinator')
            coordinator.can_manage_students = request.data.get('can_manage_students', coordinator.can_manage_students)
            coordinator.can_manage_placements = request.data.get('can_manage_placements', coordinator.can_manage_placements)
            coordinator.can_manage_resumes = request.data.get('can_manage_resumes', coordinator.can_manage_resumes)
            coordinator.save()
            log_audit(request.user, 'coordinator_permissions_updated', f'Updated {coordinator.login_id}', request)
            return Response({'message': 'Permissions updated successfully.'})
        except User.DoesNotExist:
            return Response({'error': 'Coordinator not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='external-clicks')
    def external_clicks(self, request):
        """List external outbound clicks and show click aggregations."""
        clicks = ExternalClickLog.objects.select_related('user', 'user__student_profile').all()

        search = request.query_params.get('search')
        if search:
            clicks = clicks.filter(
                Q(user__login_id__icontains=search) |
                Q(user__student_profile__name__icontains=search) |
                Q(job_title__icontains=search) |
                Q(company_name__icontains=search)
            )

        # Aggregated stats: clicks per user
        user_stats = ExternalClickLog.objects.values(
            'user__login_id',
            'user__student_profile__name',
            'user__student_profile__registration_number'
        ).annotate(
            total_clicks=Count('id')
        ).order_by('-total_clicks')[:15]

        # Aggregated stats: clicks per target site/domain
        domain_stats = ExternalClickLog.objects.values('company_name').annotate(
            total_clicks=Count('id')
        ).order_by('-total_clicks')[:15]

        serializer = ExternalClickLogSerializer(clicks[:200], many=True)
        return Response({
            'clicks': serializer.data,
            'user_stats': list(user_stats),
            'domain_stats': list(domain_stats)
        })

    @action(detail=True, methods=['post'], url_path='mark-selected')
    def mark_selected(self, request, pk=None):
        """Mark a student from an external click log as selected for that external job."""
        try:
            click = ExternalClickLog.objects.select_related('user', 'user__student_profile').get(id=pk)
        except ExternalClickLog.DoesNotExist:
            return Response({'error': 'Click log not found.'}, status=status.HTTP_404_NOT_FOUND)

        student = getattr(click.user, 'student_profile', None)
        if not student:
            return Response({'error': 'Student profile not found for this user.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Find or create matching Job
        from apps.jobs.models import Job
        from django.utils import timezone

        # Try to find by external link first
        job = Job.objects.filter(external_link=click.external_url).first()
        if not job:
            # Try by role and company
            job = Job.objects.filter(role__iexact=click.job_title, company_name__iexact=click.company_name).first()
        
        if not job:
            # Create a shadow off-campus Job record
            job = Job.objects.create(
                role=click.job_title or "Off-Campus Role",
                company_name=click.company_name or "External Company",
                description=f"Off-campus selection via outbound apply click tracker for {click.job_title} at {click.company_name}.",
                external_link=click.external_url,
                job_type='external',
                location="Remote / Off-Campus",
                application_deadline=timezone.now() + timezone.timedelta(days=30),
                status='active',
                package=0.00
            )

        # 2. Find or create Application record and set status to 'selected'
        from apps.applications.models import Application, Notification
        
        app, created = Application.objects.get_or_create(
            student=student,
            job=job,
            defaults={'status': 'selected'}
        )
        if not created:
            app.status = 'selected'
            app.save()

        # 2b. Mark the click log as processed/selected
        from django.utils import timezone
        if not click.is_marked_selected:
            click.is_marked_selected = True
            click.marked_selected_at = timezone.now()
            click.save(update_fields=['is_marked_selected', 'marked_selected_at'])

        # 3. Create Notification for the student
        title = f"🏆 Placed at {job.company_name}!"
        message = f"Incredible achievement! You have been marked as selected & offered the role of {job.role} at {job.company_name} via Off-Campus Placement. Please upload your official offer letter to finalize details!"
        
        Notification.objects.create(
            user=click.user,
            notification_type='APPLICATION_UPDATE',
            title=title,
            message=message,
            priority='high',
            action_url=f"/student/applications/{app.id}"
        )

        log_audit(request.user, 'external_click_mark_selected', f'Marked {student.registration_number} selected for {job.company_name}', request)

        return Response({
            'status': 'success',
            'message': f'Student {student.name} marked as selected for {job.company_name} successfully.',
            'application_id': str(app.id),
            'click_id': str(click.id),
            'marked_selected_at': click.marked_selected_at,
        })
