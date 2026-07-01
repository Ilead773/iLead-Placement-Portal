import requests
import logging
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from django.conf import settings
from .models import Application, ApplicationRound, ApplicationStatusHistory, Notification
from .serializers import ApplicationSerializer, ApplicationRoundSerializer, NotificationSerializer, SendResumesSerializer, ResumeEmailLogSerializer
from apps.jobs.models import Job, JobRound
from .eligibility_engine import check_eligibility

logger = logging.getLogger(__name__)

class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role in ['admin', 'coordinator']:
            qs = Application.objects.filter(is_deleted=False)
        else:
            student_profile = getattr(self.request.user, 'student_profile', None)
            if student_profile:
                qs = Application.objects.filter(student=student_profile)
            else:
                return Application.objects.none()
        
        # Optimize queries by selecting and prefetching related attributes needed by serializer / eligibility check
        return qs.select_related(
            'student', 
            'job', 
            'student__resume_profile'
        ).prefetch_related(
            'rounds__job_round',
            'student__resume_profile__skills',
            'student__resume_profile__experiences',
            'student__resume_profile__projects',
            'student__resume_profile__education_entries',
            'student__resume_profile__certifications',
            'student__built_resumes',
            'student__resume_uploads'
        )

    def destroy(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        try:
            # Query base objects directly to check if it's already soft-deleted
            application = Application.objects.get(pk=pk)
            
            # Access control: students can only delete/withdraw their own applications
            if request.user.role not in ['admin', 'coordinator']:
                student_profile = getattr(request.user, 'student_profile', None)
                if not student_profile or application.student != student_profile:
                    return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
            
            if application.is_deleted:
                # Already soft-deleted: return success idempotently
                return Response(status=status.HTTP_204_NO_CONTENT)
            
            self.perform_destroy(application)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Application.DoesNotExist:
            return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)

    def perform_destroy(self, instance):
        if instance.status in ['selected', 'accepted']:
            company_name = instance.job.company_name
            role = instance.job.role
            title = f"⚠️ Placement Update: {company_name}"
            message = f"Your placement status for the role of {role} at {company_name} has been reverted."
            
            Notification.objects.create(
                user=instance.student.user,
                notification_type='APPLICATION_UPDATE',
                title=title,
                message=message,
                priority='high',
                action_url=None
            )
            
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted'])

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        old_ol_status = instance.offer_letter_status
        
        # Check if offer_letter_status is being updated to approved
        new_ol_status = serializer.validated_data.get('offer_letter_status', old_ol_status)
        
        if new_ol_status == 'approved' and old_ol_status != 'approved':
            # Auto-transition status to accepted
            serializer.validated_data['status'] = 'accepted'
            
        application = serializer.save()
        
        # After save, get the actual updated values
        new_status = application.status
        new_ol_status = application.offer_letter_status
        
        # 1. Handle status history logs and revert notifications
        if old_status != new_status:
            ApplicationStatusHistory.objects.create(
                application=application,
                old_status=old_status,
                new_status=new_status,
                changed_by=self.request.user
            )
            
            if old_status in ['selected', 'accepted'] and new_status not in ['selected', 'accepted']:
                company_name = application.job.company_name
                role = application.job.role
                title = f"⚠️ Placement Update: {company_name}"
                message = f"Your placement status for the role of {role} at {company_name} has been reverted. Your application status is now {new_status.capitalize()}."
                
                Notification.objects.create(
                    user=application.student.user,
                    notification_type='APPLICATION_UPDATE',
                    title=title,
                    message=message,
                    priority='high',
                    action_url=f"/student/applications/{application.id}"
                )
                
        # 2. Handle offer letter status notifications
        if old_ol_status != new_ol_status:
            company_name = application.job.company_name
            role = application.job.role
            
            if new_ol_status == 'approved':
                title = f"🎉 Offer Letter Approved: {company_name}"
                message = f"Your offer letter for the {role} position at {company_name} has been approved. Your placement is officially finalized!"
                Notification.objects.create(
                    user=application.student.user,
                    notification_type='OFFER_LETTER_APPROVED',
                    title=title,
                    message=message,
                    priority='high',
                    action_url=f"/student/applications/{application.id}"
                )
            elif new_ol_status == 'rejected':
                feedback = application.offer_letter_feedback or "No feedback provided."
                title = f"❌ Offer Letter Rejected: {company_name}"
                message = f"Your offer letter for the {role} position at {company_name} was rejected. Reason: {feedback}. Please re-upload a valid document."
                Notification.objects.create(
                    user=application.student.user,
                    notification_type='OFFER_LETTER_REJECTED',
                    title=title,
                    message=message,
                    priority='critical',
                    action_url=f"/student/applications/{application.id}"
                )
            elif new_ol_status == 'pending_verification':
                from django.contrib.auth import get_user_model
                User = get_user_model()
                staff_users = User.objects.filter(role__in=['admin', 'coordinator'], is_active=True)
                student_name = application.student.name
                for staff in staff_users:
                    Notification.objects.create(
                        user=staff,
                        notification_type='OFFER_LETTER_SUBMITTED',
                        title=f"📁 Offer Letter Submitted: {student_name}",
                        message=f"{student_name} has submitted an offer letter for {role} at {company_name}. Please review and verify it.",
                        priority='medium',
                        action_url="/admin/placements"
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

    @action(detail=False, methods=['post'], url_path='bulk-update-status')
    def bulk_update_status(self, request):
        if request.user.role not in ['admin', 'coordinator']:
            return Response({'error': 'Only admins and coordinators can perform bulk status updates.'}, status=status.HTTP_403_FORBIDDEN)

        application_ids = request.data.get('application_ids', [])
        new_status = request.data.get('status')

        if not application_ids or not new_status:
            return Response({'error': 'application_ids and status are required.'}, status=status.HTTP_400_BAD_REQUEST)

        valid_statuses = [choice[0] for choice in Application.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': f"Invalid status: {new_status}"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Query base set of applications
                applications = Application.objects.filter(id__in=application_ids, is_deleted=False).select_related('job', 'student__user')
                if not applications.exists():
                    return Response({'error': 'No active applications found for the given IDs.'}, status=status.HTTP_400_BAD_REQUEST)

                # If moving to selected/accepted, check job vacancies limit with locking
                if new_status in ['selected', 'accepted']:
                    # Group by job to check limits atomically
                    job_ids = applications.values_list('job_id', flat=True).distinct()
                    for j_id in job_ids:
                        locked_job = Job.objects.select_for_update().get(id=j_id)
                        
                        already_placed_count = Application.objects.filter(
                            job=locked_job,
                            status__in=['selected', 'accepted'],
                            is_deleted=False
                        ).exclude(id__in=application_ids).count()
                        
                        to_be_placed_count = applications.filter(job=locked_job).count()
                        
                        if already_placed_count + to_be_placed_count > locked_job.openings_count:
                            return Response({
                                'error': f"Cannot select candidates. Job '{locked_job.company_name} - {locked_job.role}' only has {locked_job.openings_count} openings, which will be exceeded."
                            }, status=status.HTTP_400_BAD_REQUEST)

                # Update applications and log history
                updated_count = 0
                for app in applications:
                    old_status = app.status
                    if old_status != new_status:
                        app.status = new_status
                        app.save(update_fields=['status', 'updated_at'])
                        
                        ApplicationStatusHistory.objects.create(
                            application=app,
                            old_status=old_status,
                            new_status=new_status,
                            changed_by=request.user
                        )
                        updated_count += 1
                        
                        # Handle notification for revert
                        if old_status in ['selected', 'accepted'] and new_status not in ['selected', 'accepted']:
                            company_name = app.job.company_name
                            role = app.job.role
                            title = f"⚠️ Placement Update: {company_name}"
                            message = f"Your placement status for the role of {role} at {company_name} has been reverted. Your application status is now {new_status.capitalize()}."
                            
                            Notification.objects.create(
                                user=app.student.user,
                                notification_type='APPLICATION_UPDATE',
                                title=title,
                                message=message,
                                priority='high',
                                action_url=f"/student/applications/{app.id}"
                            )

            return Response({'status': 'success', 'updated_count': updated_count})
        except Exception as e:
            logger.error(f"Error in bulk_update_status: {e}", exc_info=True)
            return Response({'error': f"Failed to perform bulk status update: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete(self, request):
        if request.user.role not in ['admin', 'coordinator']:
            return Response({'error': 'Only admins and coordinators can perform bulk deletions.'}, status=status.HTTP_403_FORBIDDEN)

        application_ids = request.data.get('application_ids', [])
        if not application_ids:
            return Response({'error': 'application_ids list is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                applications = Application.objects.filter(id__in=application_ids, is_deleted=False)
                deleted_count = 0
                for app in applications:
                    self.perform_destroy(app)
                    deleted_count += 1
            return Response({'status': 'success', 'deleted_count': deleted_count})
        except Exception as e:
            logger.error(f"Error in bulk_delete: {e}", exc_info=True)
            return Response({'error': f"Failed to perform bulk deletions: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        if not (request.user.role == 'admin' or (request.user.role == 'coordinator' and getattr(request.user, 'can_send_notifications', False))):
            return Response({'error': 'Only admins and authorized coordinators can dispatch notifications.'}, status=status.HTTP_403_FORBIDDEN)

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

        import uuid
        broadcast_id = str(uuid.uuid4())
        
        target_value = 'All Students'
        if target_type == 'course':
            target_value = request.data.get('course', 'Unknown Course')
        elif target_type == 'students':
            target_value = f"{len(student_profiles)} Students"

        metadata = {
            'broadcast_id': broadcast_id,
            'sender_id': str(request.user.id),
            'sender_email': request.user.email,
            'target_type': target_type,
            'target_value': target_value
        }

        # Bulk create notifications
        notifications_to_create = [
            Notification(
                user=user,
                notification_type=notification_type,
                title=title,
                message=message,
                priority=priority,
                action_url=action_url,
                metadata=metadata
            )
            for user in users
        ]
        
        created_notifications = Notification.objects.bulk_create(notifications_to_create, batch_size=500)

        # Trigger background email dispatch in a SINGLE batched Celery task
        from .tasks import send_bulk_notification_emails
        email_queued = 0
        try:
            ids_to_email = [str(notif.id) for notif in created_notifications]
            if ids_to_email:
                send_bulk_notification_emails.delay(ids_to_email)
                email_queued = len(ids_to_email)
        except Exception as e:
            logger.warning(f"Could not queue bulk email task (is Celery running?): {e}")

        return Response({
            'status': 'success',
            'message': f'Successfully dispatched notifications to {len(users)} student(s). Email/push queued for {email_queued}/{len(users)} recipients.'
        })

    @action(detail=False, methods=['get'], url_path='admin/history')
    def admin_history(self, request):
        """GET — Admin lists history of sent notification broadcasts with recipient read stats."""
        if not (request.user.role == 'admin' or (request.user.role == 'coordinator' and getattr(request.user, 'can_send_notifications', False))):
            return Response({'error': 'Only admins and authorized coordinators can view notification history.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Query notifications that have a broadcast_id key in metadata
        notifications = Notification.objects.filter(metadata__has_key='broadcast_id').order_by('-created_at')
        
        # Group by broadcast_id in memory
        batches = {}
        for notif in notifications:
            b_id = notif.metadata.get('broadcast_id')
            if not b_id:
                continue
            if b_id not in batches:
                batches[b_id] = {
                    'broadcast_id': b_id,
                    'title': notif.title,
                    'message': notif.message,
                    'priority': notif.priority,
                    'action_url': notif.action_url,
                    'created_at': notif.created_at,
                    'sender_email': notif.metadata.get('sender_email', 'System'),
                    'target_type': notif.metadata.get('target_type', 'unknown'),
                    'target_value': notif.metadata.get('target_value', ''),
                    'recipient_count': 0,
                    'read_count': 0
                }
            batches[b_id]['recipient_count'] += 1
            if notif.is_read:
                batches[b_id]['read_count'] += 1
                
        return Response(list(batches.values()))

    @action(detail=False, methods=['delete'], url_path='admin/delete-broadcast')
    def delete_broadcast(self, request):
        """DELETE — Admin deletes (retracts) a broadcast of notifications."""
        if not (request.user.role == 'admin' or (request.user.role == 'coordinator' and getattr(request.user, 'can_send_notifications', False))):
            return Response({'error': 'Only admins and authorized coordinators can retract notifications.'}, status=status.HTTP_403_FORBIDDEN)
            
        broadcast_id = request.query_params.get('broadcast_id')
        if not broadcast_id:
            return Response({'error': 'broadcast_id parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        deleted_count, _ = Notification.objects.filter(metadata__broadcast_id=broadcast_id).delete()
        return Response({'status': 'success', 'message': f'Successfully retracted notification. Deleted {deleted_count} alerts.'})

class SendResumesToCompanyView(APIView):
    """
    POST /api/v1/admin/jobs/{job_id}/send-resumes/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, job_id):
        if not (request.user.role == 'admin' or (request.user.role == 'coordinator' and getattr(request.user, 'can_manage_resumes', False))):
            return Response({'error': 'Only admins and authorized coordinators can send resumes.'}, status=status.HTTP_403_FORBIDDEN)

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

        # Pre-create the log synchronously
        from .models import ResumeEmailLog
        from django.conf import settings

        student_names = list(valid_apps.values_list('student__name', flat=True))
        str_app_ids = [str(uid) for uid in valid_ids]

        log_obj = ResumeEmailLog.objects.create(
            sent_by=request.user,
            job=job,
            company_email=data['company_email'],
            subject=data['subject'],
            body=data['body'],
            cc_emails=data.get('cc_emails', []),
            application_ids=str_app_ids,
            student_names=student_names,
            resumes_attached=0,
            status='pending',
            error_message=None,
        )

        # Queue async Celery task
        from .tasks import send_resumes_to_company_task
        task = send_resumes_to_company_task.delay(
            log_id=str(log_obj.id)
        )

        return Response(
            {
                'message': 'Email is being sent. You will receive a notification when done.',
                'task_id': task.id,
                'shared_link': f"{settings.FRONTEND_URL}/shared-resumes/{log_obj.id}",
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
    GET /api/v1/admin/jobs/{job_id}/email-log/ or GET /api/v1/admin/email-logs/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, job_id=None):
        if not (request.user.role == 'admin' or (request.user.role == 'coordinator' and getattr(request.user, 'can_manage_resumes', False))):
            return Response({'error': 'Only admins and authorized coordinators can view logs.'}, status=status.HTTP_403_FORBIDDEN)
            
        from .models import ResumeEmailLog
        
        target_job_id = job_id or request.query_params.get('job_id')
        if target_job_id:
            logs = ResumeEmailLog.objects.filter(job_id=target_job_id).select_related('sent_by', 'job')
        else:
            logs = ResumeEmailLog.objects.all().select_related('sent_by', 'job')

        serializer = ResumeEmailLogSerializer(logs, many=True)
        return Response(serializer.data)

from rest_framework.throttling import SimpleRateThrottle

class SharedResumePINThrottle(SimpleRateThrottle):
    """
    Worst-case security protection: limits unauthenticated PIN verification attempts
    to 10 requests per minute per IP to prevent brute-forcing the 6-digit PIN.
    """
    scope = 'shared_resume_pin'
    rate = '10/minute'

    def get_cache_key(self, request, view):
        # Authenticated staff/admins are bypassed
        if request.user and request.user.is_authenticated and (
            getattr(request.user, 'role', None) in ('admin', 'coordinator')
        ):
            return None
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request)
        }

class SharedResumeView(APIView):
    """
    GET /api/v1/applications/shared-resumes/{log_id}/
    Public endpoint to view shared resumes.
    Authenticated staff/admin users can preview without a PIN.
    External (unauthenticated) users must provide the correct PIN.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [SharedResumePINThrottle]

    def get(self, request, log_id):
        from .models import ResumeEmailLog, Application
        from .serializers import ApplicationSerializer
        
        from django.utils import timezone
        
        log = get_object_or_404(ResumeEmailLog, id=log_id)
        
        # Check link expiration
        if log.expires_at and timezone.now() > log.expires_at:
            return Response(
                {
                    'error': 'link_expired',
                    'message': 'This shared resume link has expired and is no longer accessible due to privacy settings.'
                },
                status=status.HTTP_410_GONE
            )

        # Staff/admin users can preview without a PIN
        is_staff_preview = bool(
            request.user and request.user.is_authenticated and
            getattr(request.user, 'role', None) in ('admin', 'coordinator')
        )

        # Check link PIN code verification (skipped for internal staff)
        if not is_staff_preview:
            pin_code = request.query_params.get('pin') or request.headers.get('X-Shared-Resume-PIN')
            if log.pin_code and log.pin_code != pin_code:
                return Response(
                    {
                        'error': 'invalid_pin',
                        'message': 'A valid verification PIN is required to access this shared link.'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
        
        app_ids = log.application_ids
        applications = Application.objects.filter(id__in=app_ids).select_related('student', 'student__user', 'job')
        
        serializer = ApplicationSerializer(applications, many=True, context={'request': request})
        
        return Response({
            'company_email': log.company_email,
            'subject': log.subject,
            'body': log.body,
            'sent_at': log.sent_at,
            'is_staff_preview': is_staff_preview,
            'job': {
                'company_name': log.job.company_name,
                'role': log.job.role,
            },
            'applications': serializer.data
        })

