from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from .models import Application, ApplicationRound, ApplicationStatusHistory, Notification
from .serializers import ApplicationSerializer, ApplicationRoundSerializer, NotificationSerializer, SendResumesSerializer, ResumeEmailLogSerializer
from apps.jobs.models import Job, JobRound
from .eligibility_engine import check_eligibility

class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return Application.objects.all()
        student_profile = getattr(self.request.user, 'student_profile', None)
        if student_profile:
            return Application.objects.filter(student=student_profile)
        return Application.objects.none()

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        new_status = serializer.validated_data.get('status', old_status)
        
        # Save the updated status
        application = serializer.save()
        
        # If status changed, log history and send notification
        if old_status != new_status:
            # 1. Log in history
            ApplicationStatusHistory.objects.create(
                application=application,
                old_status=old_status,
                new_status=new_status,
                changed_by=self.request.user
            )
            
            # 2. Build custom high-fidelity notifications
            company_name = application.job.company_name
            role = application.job.role
            title = f"Application Update: {company_name}"
            message = f"Your application status for {role} at {company_name} was updated."
            
            if new_status == 'shortlisted':
                title = f"🎉 Shortlisted for {company_name}!"
                message = f"Congratulations! You have been shortlisted for the role of {role} at {company_name}. Please stay tuned for the next steps."
            elif new_status == 'interviewing':
                title = f"📅 Interview Invitation: {company_name}"
                message = f"Fantastic news! You have been selected for an interview round for the {role} position at {company_name}. Please check your email and dashboard for schedule details."
            elif new_status == 'selected':
                title = f"🏆 Placed at {company_name}!"
                message = f"Incredible achievement! You have been selected & offered the role of {role} at {company_name}. The placement cell congratulates you!"
            elif new_status == 'rejected':
                title = f"Status Update: {company_name}"
                message = f"Thank you for participating in the {company_name} recruitment drive for {role}. Unfortunately, your application is not moving forward at this time. Keep learning and growing!"
            
            Notification.objects.create(
                user=application.student.user,
                notification_type='APPLICATION_UPDATE',
                title=title,
                message=message,
                priority='high' if new_status in ['shortlisted', 'interviewing', 'selected', 'rejected'] else 'medium',
                action_url=f"/student/applications/{application.id}"
            )

    def create(self, request, *args, **kwargs):
        student_profile = getattr(request.user, 'student_profile', None)
        if not student_profile:
            return Response({'error': 'Only students can apply'}, status=status.HTTP_400_BAD_REQUEST)
            
        job_id = request.data.get('job_id')
        
        try:
            job = Job.objects.get(id=job_id)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

        # Explicit duplicate check OUTSIDE transaction
        if Application.objects.filter(student=student_profile, job=job).exists():
            return Response(
                {'error': 'You have already applied for this job', 'has_applied': True},
                status=status.HTTP_409_CONFLICT
            )

        eligibility = check_eligibility(student_profile, job)
        if not eligibility['eligible']:
            return Response({'error': 'Not eligible', 'reasons': eligibility['failing_checks']}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                application = Application.objects.create(
                    student=student_profile,
                    job=job,
                    eligibility_snapshot=eligibility,
                    job_snapshot={
                        'company_name': job.company_name,
                        'role': job.role,
                        'package': str(job.package),
                        'location': job.location,
                        'deadline': str(job.application_deadline),
                    }
                )
                
                first_round = job.rounds.filter(round_number=1).first()
                if first_round:
                    ApplicationRound.objects.create(
                        application=application,
                        job_round=first_round,
                        round_number=1
                    )

                ApplicationStatusHistory.objects.create(
                    application=application,
                    new_status='applied',
                    changed_by=request.user
                )

            return Response(self.get_serializer(application).data, status=status.HTTP_201_CREATED)
            
        except IntegrityError as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"IntegrityError in application create: {e}")
            print(f"[APPLICATION ERROR] IntegrityError: {e}")
            
            # Check if it's actually a duplicate application
            if Application.objects.filter(student=student_profile, job=job).exists():
                return Response(
                    {'error': 'You have already applied for this job', 'has_applied': True},
                    status=status.HTTP_409_CONFLICT
                )
            # It's some other DB constraint error — report it properly
            return Response(
                {'error': f'Application failed due to a database error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def withdraw(self, request, pk=None):
        application = self.get_object()
        application.status = 'withdrawn'
        application.save()
        
        ApplicationStatusHistory.objects.create(
            application=application,
            old_status=application.status,
            new_status='withdrawn',
            changed_by=request.user
        )
        return Response({'status': 'withdrawn'})

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['patch'])
    def read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'read'})

    @action(detail=False, methods=['patch'], url_path='read-all')
    def read_all(self, request):
        self.get_queryset().update(is_read=True)
        return Response({'status': 'all read'})

    @action(detail=False, methods=['post'], url_path='admin/create')
    def admin_create(self, request):
        """POST — Admin creates bulk notifications for all, selected course, or selected student list."""
        if request.user.role not in ['admin', 'coordinator']:
            return Response({'error': 'Only admins and coordinators can dispatch notifications.'}, status=status.HTTP_403_FORBIDDEN)

        target_type = request.data.get('target_type') # 'all', 'course', 'students'
        title = request.data.get('title')
        message = request.data.get('message')
        priority = request.data.get('priority', 'medium')
        notification_type = request.data.get('notification_type', 'ADMIN_BROADCAST')
        action_url = request.data.get('action_url', '')

        if not title or not message:
            return Response({'error': 'Title and Message are required.'}, status=status.HTTP_400_BAD_REQUEST)

        from core.models import Student, User
        users = []

        if target_type == 'all':
            users = User.objects.filter(role='student')
        elif target_type == 'course':
            course_name = request.data.get('course')
            if not course_name:
                return Response({'error': 'Course name is required for course targeting.'}, status=status.HTTP_400_BAD_REQUEST)
            student_profiles = Student.objects.filter(course__iexact=course_name)
            users = [sp.user for sp in student_profiles]
        elif target_type == 'students':
            student_ids = request.data.get('student_ids', [])
            if not student_ids:
                return Response({'error': 'At least one student must be selected.'}, status=status.HTTP_400_BAD_REQUEST)
            student_profiles = Student.objects.filter(id__in=student_ids)
            users = [sp.user for sp in student_profiles]
        else:
            return Response({'error': 'Invalid target type.'}, status=status.HTTP_400_BAD_REQUEST)

        # Bulk create notifications
        notifications_to_create = [
            Notification(
                user=user,
                notification_type=notification_type,
                title=title,
                message=message,
                priority=priority,
                action_url=action_url
            )
            for user in users
        ]
        
        Notification.objects.bulk_create(notifications_to_create)

        return Response({
            'status': 'success',
            'message': f'Successfully dispatched notifications to {len(users)} student(s).'
        })

class SendResumesToCompanyView(APIView):
    """
    POST /api/v1/admin/jobs/{job_id}/send-resumes/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, job_id):
        if request.user.role not in ['admin', 'coordinator']:
            return Response({'error': 'Only admins and coordinators can send resumes.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = SendResumesSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'validation_error', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        data = serializer.validated_data

        job = get_object_or_404(Job, id=job_id)
        if getattr(job, 'job_type', None) == 'external':
            return Response(
                {
                    'error': 'off_campus_not_supported',
                    'message': 'Off-campus (external) jobs do not support bulk resume emailing.',
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        application_ids = data['application_ids']
        valid_apps = Application.objects.filter(id__in=application_ids, job=job)

        valid_ids = list(valid_apps.values_list('id', flat=True))
        invalid_ids = [i for i in application_ids if i not in valid_ids]

        if invalid_ids:
            return Response(
                {
                    'error': 'invalid_applications',
                    'message': f'{len(invalid_ids)} selected application(s) do not belong to this job.',
                    'invalid_ids': invalid_ids,
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Queue async Celery task
        from .tasks import send_resumes_to_company_task
        try:
            task = send_resumes_to_company_task.delay(
                application_ids=valid_ids,
                company_email=data['company_email'],
                subject=data['subject'],
                body=data['body'],
                cc_emails=data.get('cc_emails', []),
                sent_by_user_id=request.user.id,
                job_id=job.id,
            )
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return Response(
                {
                    'error': 'email_task_failed',
                    'message': f'Could not send email: {str(exc)}'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {
                'message': 'Email is being sent. You will receive a notification when done.',
                'task_id': task.id,
                'summary': {
                    'selected_students': len(valid_ids),
                    'company_email': data['company_email'],
                    'cc_emails': data.get('cc_emails', []),
                },
            },
            status=status.HTTP_202_ACCEPTED
        )

class ResumeEmailLogView(APIView):
    """
    GET /api/v1/admin/jobs/{job_id}/email-log/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, job_id):
        if request.user.role not in ['admin', 'coordinator']:
            return Response({'error': 'Only admins and coordinators can view logs.'}, status=status.HTTP_403_FORBIDDEN)
            
        from .models import ResumeEmailLog
        logs = ResumeEmailLog.objects.filter(job_id=job_id).select_related('sent_by')

        serializer = ResumeEmailLogSerializer(logs, many=True)
        return Response(serializer.data)
