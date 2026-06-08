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

from ..models import User, Student, CSVUploadLog
from ..serializers import StudentSerializer, CSVUploadLogSerializer
from ..permissions import IsAdminOrCoordinator
from ..csv_processor import process_csv
from .helpers import log_audit

logger = logging.getLogger('core')


class StudentViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrCoordinator]

    @action(detail=False, methods=['post'], url_path='import-csv',
            parser_classes=[MultiPartParser, FormParser])
    def import_csv(self, request):
        """Upload CSV → create students → return credentials CSV."""
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'CSV file is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not file.name.lower().endswith('.csv'):
            return Response({'error': 'Only .csv files are accepted.'}, status=status.HTTP_400_BAD_REQUEST)
        if file.size > 5 * 1024 * 1024:
            return Response({'error': 'File must be < 5MB.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            content = file.read()
            credentials, upload_log = process_csv(content, request.user, file_name=file.name)
            log_audit(request.user, 'csv_upload', f'{file.name}: {upload_log.successful_records}/{upload_log.total_records}', request)

            # Build credentials CSV for download
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(['Name', 'Registration Number', 'Login ID', 'Email', 'Temporary Password'])
            for cred in credentials:
                writer.writerow([cred['name'], cred['registration_number'], cred['login_id'], cred['email'], cred['temporary_password']])

            return Response({
                'message': f'{upload_log.successful_records} students created successfully.',
                'upload_log': CSVUploadLogSerializer(upload_log).data,
                'credentials_csv': output.getvalue(),
                'credentials': credentials,
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f'CSV import error: {e}')
            return Response({'error': 'Failed to process CSV.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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

    @action(detail=True, methods=['delete'], url_path='delete')
    def delete_student(self, request, pk=None):
        """Admin only deletes a student and their user account."""
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can delete students.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            student = Student.objects.get(pk=pk)
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

