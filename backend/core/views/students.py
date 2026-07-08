# core/views/students.py
"""Student management — CSV import, listing, detail, upload history (Admin/Coordinator)."""
import csv
import io
import logging

from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
from ..models import User, Student, CSVUploadLog
from ..serializers import StudentSerializer, CSVUploadLogSerializer
from ..permissions import IsAdminOrCoordinator
from ..csv_processor import process_csv
from ..tasks import process_student_csv_task
from .helpers import log_audit

logger = logging.getLogger('core')


def check_active_student_records(student):
    """Checks if a student has active records (applications, interviews, resumes, assignments)."""
    reasons = []
    
    # 1. Check Job Applications
    from apps.applications.models import Application
    apps_count = Application.objects.filter(student=student).count()
    if apps_count > 0:
        reasons.append(f"{apps_count} job application(s)")
        
    # 2. Check Mock Interview Sessions
    from apps.interviews.models import MockInterviewSession
    interviews_count = MockInterviewSession.objects.filter(student=student).count()
    if interviews_count > 0:
        reasons.append(f"{interviews_count} mock interview session(s)")
        
    # 3. Check Built Resumes
    from apps.resumes.models import BuiltResume
    resumes_count = BuiltResume.objects.filter(student=student).count()
    if resumes_count > 0:
        reasons.append(f"{resumes_count} built resume(s)")
        
    # 4. Check Placement Assignments (Legacy)
    from ..models import PlacementAssignment
    placements_count = PlacementAssignment.objects.filter(student=student).count()
    if placements_count > 0:
        reasons.append(f"{placements_count} placement assignment(s)")
        
    # 5. Check Learning Assignments
    from ..models import StudentLearningAssignment
    learning_count = StudentLearningAssignment.objects.filter(student=student).count()
    if learning_count > 0:
        reasons.append(f"{learning_count} learning assignment(s)")
        
    return reasons


class StudentViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrCoordinator]

    @action(detail=False, methods=['post'], url_path='import-csv',
            parser_classes=[MultiPartParser, FormParser])
    def import_csv(self, request):
        """Upload CSV → create pending log → trigger Celery task."""
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'CSV file is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not file.name.lower().endswith('.csv'):
            return Response({'error': 'Only .csv files are accepted.'}, status=status.HTTP_400_BAD_REQUEST)
        if file.size > 5 * 1024 * 1024:
            return Response({'error': 'File must be < 5MB.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            content = file.read()
            # Save CSV file temporarily in Django default storage
            import uuid
            import os
            temp_dir = 'temp_csv'
            os.makedirs(os.path.join(settings.MEDIA_ROOT, temp_dir), exist_ok=True)
            temp_file_name = f"upload_{uuid.uuid4()}.csv"
            temp_file_path = os.path.join(temp_dir, temp_file_name)
            
            # Save file content to temp path
            path = default_storage.save(temp_file_path, ContentFile(content))
            
            # Create a pending upload log
            upload_log = CSVUploadLog.objects.create(
                uploaded_by=request.user,
                file_name=file.name,
                total_records=0,
                successful_records=0,
                failed_records=0,
                status='pending',
                error_details=None
            )
            
            log_audit(request.user, 'csv_upload_queued', f'Queued import for {file.name}', request)
            
            # Trigger Celery task
            process_student_csv_task.delay(str(upload_log.id), path, str(request.user.id))
            
            return Response({
                'message': 'CSV upload successful. Processing in background.',
                'upload_log': CSVUploadLogSerializer(upload_log).data
            }, status=status.HTTP_202_ACCEPTED)
        except Exception as e:
            logger.error(f'CSV import initiation error: {e}')
            return Response({'error': 'Failed to initiate CSV processing.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='upload-status')
    def upload_status(self, request, pk=None):
        """Get the status of a specific CSV upload log."""
        try:
            log = CSVUploadLog.objects.get(pk=pk)
            # Check if Excel file exists and build dynamic URL
            excel_exists = False
            credentials_url = None
            excel_base64 = None
            import base64
            from django.core.files.storage import default_storage
            
            credentials_file_path = f"private_credentials/credentials_{log.id}.xlsx"
            if default_storage.exists(credentials_file_path):
                excel_exists = True
                credentials_url = request.build_absolute_uri(
                    f"/api/v1/students/upload-status/{log.id}/download-credentials/"
                )
                try:
                    with default_storage.open(credentials_file_path, 'rb') as f:
                        excel_base64 = base64.b64encode(f.read()).decode('utf-8')
                except Exception as read_err:
                    logger.error(f"Failed to read credentials excel: {read_err}")
                
            return Response({
                'id': log.id,
                'status': log.status,
                'file_name': log.file_name,
                'total_records': log.total_records,
                'successful_records': log.successful_records,
                'failed_records': log.failed_records,
                'error_details': log.error_details,
                'excel_exists': excel_exists,
                'credentials_url': credentials_url,
                'credentials_excel': excel_base64,
                'uploaded_at': log.uploaded_at
            })
        except CSVUploadLog.DoesNotExist:
            return Response({'error': 'Upload log not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'], url_path='download-credentials')
    def download_credentials(self, request, pk=None):
        """Secure gated download for generated CSV import credentials sheets."""
        if request.user.role not in ['admin', 'coordinator']:
            return Response({'error': 'Only admins and coordinators can download credentials sheets.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            log = CSVUploadLog.objects.get(pk=pk)
            from django.core.files.storage import default_storage
            credentials_file_path = f"private_credentials/credentials_{log.id}.xlsx"
            
            if not default_storage.exists(credentials_file_path):
                return Response({'error': 'Credentials file not found or expired.'}, status=status.HTTP_404_NOT_FOUND)
            
            from django.http import FileResponse
            f = default_storage.open(credentials_file_path, 'rb')
            response = FileResponse(f, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = f'attachment; filename="credentials_{log.file_name or str(log.id)}.xlsx"'
            return response
        except CSVUploadLog.DoesNotExist:
            return Response({'error': 'Upload log not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='send-emails')
    def send_welcome_emails(self, request, pk=None):
        """Manually trigger sending welcome emails to newly created students from this CSV upload."""
        if request.user.role not in ['admin', 'coordinator']:
            return Response({'error': 'Only admins and coordinators can send welcome emails.'}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            log = CSVUploadLog.objects.get(pk=pk)
            
            # Read from the saved excel credentials file
            from django.core.files.storage import default_storage
            import openpyxl
            
            credentials_file_path = f"private_credentials/credentials_{log.id}.xlsx"
            if not default_storage.exists(credentials_file_path):
                return Response({'error': 'Credentials sheet not found for this upload.'}, status=status.HTTP_404_NOT_FOUND)
                
            # Load the credentials
            with default_storage.open(credentials_file_path, 'rb') as f:
                wb = openpyxl.load_workbook(f)
                ws = wb.active
                
                # Rows are: Name, Registration Number, Login ID, Email, Temporary Password
                # Header row is index 1.
                rows = list(ws.iter_rows(min_row=2, values_only=True))
                
            from core.tasks import async_send_mail
            from django.utils import timezone
            
            sent_emails_count = 0
            for row in rows:
                if not row or len(row) < 5:
                    continue
                name, reg_no, login_id, email, temp_password = row
                
                # Only send email if a temporary password exists and is not "(UNCHANGED)"
                if temp_password and temp_password != '(UNCHANGED)' and email:
                    subject = "Welcome to iLEAD Placement Portal - Account Created"
                    message = (
                        f"Dear {name},\n\n"
                        f"Your student account has been successfully created on the iLEAD Placement Portal.\n\n"
                        f"Here are your login credentials:\n"
                        f"- Login ID: {login_id}\n"
                        f"- Temporary Password: {temp_password}\n\n"
                        f"Please log in and update your password immediately at your first login.\n\n"
                        f"Best regards,\n"
                        f"Placement Team\n"
                        f"iLEAD Institute of Leadership, Entrepreneurship and Development"
                    )
                    async_send_mail.delay(
                        subject=subject,
                        message=message,
                        recipient_list=[email]
                    )
                    sent_emails_count += 1
            
            # Update log
            log.emails_sent = True
            log.emails_sent_at = timezone.now()
            log.save(update_fields=['emails_sent', 'emails_sent_at'])
            
            log_audit(request.user, 'emails_sent_manual', f'Sent welcome emails to {sent_emails_count} students for log {log.id}', request)
            
            return Response({
                'message': f'Welcome emails have been sent successfully to {sent_emails_count} students.',
                'emails_sent_count': sent_emails_count
            })
            
        except CSVUploadLog.DoesNotExist:
            return Response({'error': 'Upload log not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception("Error sending manual emails")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='list')
    def list_students(self, request):
        """List all students with search, filters, and pagination."""
        qs = Student.objects.select_related('user').all()

        # Filters
        course = request.query_params.get('course')
        if course:
            qs = qs.filter(course__icontains=course)
        stream = request.query_params.get('stream')
        if stream:
            qs = qs.filter(stream__icontains=stream)
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(registration_number__icontains=search) |
                Q(email__icontains=search)
            )
        cgpa_min = request.query_params.get('cgpa_min')
        if cgpa_min:
            qs = qs.filter(cgpa__gte=float(cgpa_min))
        cgpa_max = request.query_params.get('cgpa_max')
        if cgpa_max:
            qs = qs.filter(cgpa__lte=float(cgpa_max))
        semester = request.query_params.get('semester')
        if semester:
            qs = qs.filter(semester=int(semester))
            
        year = request.query_params.get('year')
        if year:
            qs = qs.filter(year=year)
            
        category = request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
            
        backlogs = request.query_params.get('backlogs')
        if backlogs is not None:
            qs = qs.filter(backlogs=(backlogs.lower() == 'true'))

        training_attendance_min = request.query_params.get('training_attendance_min')
        if training_attendance_min:
            qs = qs.filter(training_attendance__gte=float(training_attendance_min))
        training_attendance_max = request.query_params.get('training_attendance_max')
        if training_attendance_max:
            qs = qs.filter(training_attendance__lte=float(training_attendance_max))

        backlogs_count_min = request.query_params.get('backlogs_count_min')
        if backlogs_count_min:
            qs = qs.filter(backlogs_count__gte=int(backlogs_count_min))
        backlogs_count_max = request.query_params.get('backlogs_count_max')
        if backlogs_count_max:
            qs = qs.filter(backlogs_count__lte=int(backlogs_count_max))

        # Skill filter — filter students who have a skill matching the given name(s)
        skill_param = request.query_params.get('skill')
        if skill_param:
            skill_names = [s.strip() for s in skill_param.split(',') if s.strip()]
            for skill_name in skill_names:
                qs = qs.filter(resume_profile__skills__name__icontains=skill_name)
            qs = qs.distinct()

        # IDs filter — return specific students by comma-separated UUIDs (used to pre-fill EditJob targeting)
        ids_param = request.query_params.get('ids')
        if ids_param:
            id_list = [i.strip() for i in ids_param.split(',') if i.strip()]
            qs = qs.filter(id__in=id_list)

        # Pagination
        page = int(request.query_params.get('page', 1))
        limit = min(int(request.query_params.get('limit', 20)), 10000)
        total = qs.count()
        results = qs[(page - 1) * limit: page * limit]

        return Response({
            'count': total,
            'page': page,
            'total_pages': (total + limit - 1) // limit,
            'results': StudentSerializer(results, many=True, context={'request': request}).data,
        })

    @action(detail=True, methods=['get'], url_path='detail')
    def get_student(self, request, pk=None):
        """Get a single student's details with prefetch-optimized profile data."""
        try:
            student = Student.objects.select_related('user').prefetch_related(
                'resume_profile',
                'resume_profile__skills',
                'resume_profile__experiences',
                'resume_profile__projects',
                'resume_profile__education_entries',
                'resume_profile__certifications'
            ).get(pk=pk)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(StudentSerializer(student, context={'request': request}).data)

    @action(detail=False, methods=['get'], url_path='upload-history')
    def upload_history(self, request):
        """View CSV upload logs."""
        logs = CSVUploadLog.objects.select_related('uploaded_by').all()[:50]
        return Response(CSVUploadLogSerializer(logs, many=True).data)

    @action(detail=True, methods=['post'], url_path='revert-upload')
    def revert_upload(self, request, pk=None):
        """Revert a CSV upload by deleting newly created students."""
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can revert uploads.'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            log = CSVUploadLog.objects.get(pk=pk)
            if log.status == 'reverted':
                return Response({'error': 'This upload has already been reverted.'}, status=status.HTTP_400_BAD_REQUEST)
                
            # Get students created by this upload
            students = Student.objects.filter(upload_log=log)
            deleted_count = students.count()
            
            # Check for force flag (bypasses safeguards)
            force = request.query_params.get('force', 'false').lower() == 'true' or request.data.get('force') is True
            
            if not force:
                blocked_students = []
                for s in students:
                    reasons = check_active_student_records(s)
                    if reasons:
                        blocked_students.append({
                            'id': str(s.id),
                            'name': s.name,
                            'registration_number': s.registration_number,
                            'reasons': reasons
                        })
                if blocked_students:
                    return Response({
                        'error': 'Some students in this upload have active portal activity. Reverting will permanently erase their data.',
                        'blocked_students': blocked_students
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Delete their users (which cascades to Student profile)
            user_ids = students.values_list('user_id', flat=True)
            User.objects.filter(id__in=user_ids).delete()
            
            # Mark log as reverted
            log.status = 'reverted'
            log.save()
            
            log_audit(request.user, 'csv_upload_reverted', f'Reverted upload {log.file_name}, deleted {deleted_count} students.', request)
            
            return Response({'message': f'Successfully reverted upload. Deleted {deleted_count} newly created students.'})
            
        except CSVUploadLog.DoesNotExist:
            return Response({'error': 'Upload log not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['delete'], url_path='delete')
    def delete_student(self, request, pk=None):
        """Admin only deletes a student and their user account."""
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can delete students.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            student = Student.objects.get(pk=pk)
            
            # Check for force flag (bypasses safeguards)
            force = request.query_params.get('force', 'false').lower() == 'true' or request.data.get('force') is True
            
            if not force:
                reasons = check_active_student_records(student)
                if reasons:
                    return Response({
                        'error': f'Student {student.name} has active portal activity. Deleting will permanently erase their data.',
                        'reasons': reasons
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            user = student.user
            # Delete the user, which will cascade delete the student profile
            user.delete()
            log_audit(request.user, 'student_deleted', f'Deleted student {student.registration_number}', request)
            return Response({'message': 'Student deleted successfully.'})
        except Student.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='toggle-access')
    def toggle_access(self, request, pk=None):
        """Revoke or restore student portal access."""
        if not (request.user.role == 'admin' or (request.user.role == 'coordinator' and getattr(request.user, 'can_manage_students', False))):
            return Response({'error': 'Only admins or authorized coordinators can modify portal access.'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            student = Student.objects.select_related('user').get(pk=pk)
            user = student.user
            user.is_active = not user.is_active
            user.save()
            
            action_str = 'restored' if user.is_active else 'revoked'
            log_audit(request.user, f'student_access_{action_str}', f'{action_str.capitalize()} access for {student.registration_number}', request)
            return Response({
                'message': f'Access {action_str} successfully.',
                'is_active': user.is_active
            })
        except Student.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post', 'put', 'patch'], url_path='change-category')
    def change_category(self, request, pk=None):
        """Manually set or reset a student's category."""
        if not (request.user.role == 'admin' or (request.user.role == 'coordinator' and getattr(request.user, 'can_manage_students', False))):
            return Response({'error': 'Only admins or authorized coordinators can change student category.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            student = Student.objects.get(pk=pk)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        category = request.data.get('category')
        if not category:
            return Response({'error': 'Category is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if category == 'auto':
            student.is_category_manual = False
            student.category = student.calculate_category()
        elif category in ['A', 'B', 'C']:
            student.is_category_manual = True
            student.category = category
        else:
            return Response({'error': 'Invalid category choice. Must be A, B, C, or auto.'}, status=status.HTTP_400_BAD_REQUEST)
            
        student.save()
        log_audit(request.user, 'student_category_changed', f'Changed category to {category} for {student.registration_number}', request)
        
        return Response({
            'message': 'Category updated successfully.',
            'category': student.category,
            'is_category_manual': student.is_category_manual
        })

    def update_student(self, request, pk=None):
        """Update a student's basic details, keeping their User in sync, while keeping registration number read-only."""
        if not (request.user.role == 'admin' or (request.user.role == 'coordinator' and getattr(request.user, 'can_manage_students', False))):
            return Response({'error': 'Only admins or authorized coordinators can modify student details.'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            student = Student.objects.select_related('user').get(pk=pk)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        user = student.user

        # Validation phase:
        email = data.get('email')
        if email:
            email = email.lower().strip()
            # Check unique constraint in User model
            if User.objects.filter(email=email).exclude(id=user.id).exists():
                return Response({'error': f"Email '{email}' is already in use."}, status=status.HTTP_400_BAD_REQUEST)
            # Check unique constraint in Student model
            if Student.objects.filter(email=email).exclude(id=student.id).exists():
                return Response({'error': f"Email '{email}' is already in use by another student."}, status=status.HTTP_400_BAD_REQUEST)

        # Update User fields if provided
        if 'name' in data:
            user.name = data['name'].strip()
        if email:
            user.email = email
        user.save()

        # Update Student fields
        if 'name' in data:
            student.name = data['name'].strip()
        if email:
            student.email = email
        
        if 'phone_number' in data:
            student.phone_number = data['phone_number'].strip()
        if 'course' in data:
            student.course = data['course'].strip()
        if 'stream' in data:
            student.stream = data['stream'].strip() if data['stream'] else None
        
        if 'semester' in data:
            try:
                student.semester = int(data['semester']) if data['semester'] is not None and data['semester'] != '' else None
            except ValueError:
                return Response({'error': 'Semester must be a valid integer.'}, status=status.HTTP_400_BAD_REQUEST)
                
        if 'year' in data:
            student.year = data['year'] if data['year'] else None
            
        if 'passing_year' in data:
            try:
                student.passing_year = int(data['passing_year']) if data['passing_year'] is not None and data['passing_year'] != '' else None
            except ValueError:
                return Response({'error': 'Passing year must be a valid integer.'}, status=status.HTTP_400_BAD_REQUEST)

        if 'cgpa' in data:
            try:
                student.cgpa = float(data['cgpa']) if data['cgpa'] is not None and data['cgpa'] != '' else None
            except ValueError:
                return Response({'error': 'CGPA must be a valid decimal number.'}, status=status.HTTP_400_BAD_REQUEST)

        if 'attendance' in data:
            try:
                student.attendance = float(data['attendance']) if data['attendance'] is not None and data['attendance'] != '' else None
            except ValueError:
                return Response({'error': 'Attendance must be a valid decimal number.'}, status=status.HTTP_400_BAD_REQUEST)

        if 'training_attendance' in data:
            try:
                student.training_attendance = float(data['training_attendance']) if data['training_attendance'] is not None and data['training_attendance'] != '' else 100.0
            except ValueError:
                return Response({'error': 'Training attendance must be a valid decimal number.'}, status=status.HTTP_400_BAD_REQUEST)

        if 'backlogs_count' in data:
            try:
                student.backlogs_count = int(data['backlogs_count']) if data['backlogs_count'] is not None and data['backlogs_count'] != '' else 0
                student.backlogs = student.backlogs_count > 0
            except ValueError:
                return Response({'error': 'Backlogs count must be a valid integer.'}, status=status.HTTP_400_BAD_REQUEST)

        if 'category' in data:
            cat = data['category']
            if cat in ['A', 'B', 'C', 'Own']:
                student.category = cat
                student.is_category_manual = True
            elif cat == 'auto' or not cat:
                student.is_category_manual = False
                student.category = student.calculate_category()
            else:
                return Response({'error': 'Invalid category choice.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            student.full_clean()
            student.save()
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        log_audit(request.user, 'student_updated', f"Updated details for student {student.registration_number}", request)
        
        return Response({
            'message': 'Student details updated successfully.',
            'student': StudentSerializer(student, context={'request': request}).data
        })

