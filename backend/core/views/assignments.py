"""Assignment management for placements and MCQ learning assignments."""
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import (
    LearningAssignment, PlacementAssignment, Student, StudentLearningAnswer,
    StudentLearningAssignment,
)
from ..permissions import IsAdminOrCoordinator, IsStudentUser
from ..serializers import (
    AssignmentStatusSerializer, LearningAssignmentBulkAssignSerializer,
    LearningAssignmentSerializer, LearningAssignmentSubmitSerializer,
    PlacementAssignmentSerializer, StudentLearningAssignmentSerializer,
)
from .helpers import log_audit


class AssignmentViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrCoordinator]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.user and request.user.is_authenticated and request.user.role == 'coordinator':
            if not getattr(request.user, 'can_manage_placements', False):
                self.permission_denied(request, message="You do not have permission to manage placement assignments.")

    @action(detail=False, methods=['get'], url_path='list')
    def list_all(self, request):
        """List placement assignments with optional status filter."""
        qs = PlacementAssignment.objects.select_related(
            'student', 'placement', 'assigned_by'
        ).all()
        st = request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        return Response(PlacementAssignmentSerializer(qs, many=True).data)

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        """Update placement assignment status."""
        try:
            assignment = PlacementAssignment.objects.get(pk=pk)
        except PlacementAssignment.DoesNotExist:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AssignmentStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old = assignment.status
        assignment.status = serializer.validated_data['status']
        assignment.save(update_fields=['status', 'updated_date'])

        log_audit(request.user, 'assignment_status_changed', f'{old} -> {assignment.status}', request)
        return Response(PlacementAssignmentSerializer(assignment).data)


class LearningAssignmentAdminViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrCoordinator]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.user and request.user.is_authenticated and request.user.role == 'coordinator':
            if not getattr(request.user, 'can_manage_assignments', False):
                self.permission_denied(request, message="You do not have permission to manage learning assignments.")

    @action(detail=False, methods=['get'], url_path='courses')
    def courses(self, request):
        student_courses = Student.objects.exclude(course='').values_list('course', flat=True).distinct()
        assignment_courses = LearningAssignment.objects.exclude(course='').values_list('course', flat=True).distinct()
        courses = sorted({c for c in list(student_courses) + list(assignment_courses) if c})
        return Response(courses)

    @action(detail=False, methods=['get'], url_path='students')
    def students(self, request):
        qs = Student.objects.select_related('user').all()
        course = request.query_params.get('course')
        search = request.query_params.get('search')
        semester = request.query_params.get('semester')
        year = request.query_params.get('year')
        category = request.query_params.get('category')

        if course:
            qs = qs.filter(course__iexact=course)
        if semester:
            qs = qs.filter(semester=semester)
        if year:
            qs = qs.filter(year=year)
        if category:
            qs = qs.filter(category=category)
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(registration_number__icontains=search)
                | Q(email__icontains=search)
            )

        return Response([
            {
                'id': str(student.id),
                'name': student.name,
                'registration_number': student.registration_number,
                'email': student.email,
                'course': student.course,
                'stream': student.stream,
                'semester': student.semester,
                'year': student.year,
                'category': student.category,
                'cgpa': student.cgpa,
            }
            for student in qs.order_by('name')[:500]
        ])

    @action(detail=False, methods=['get', 'post'], url_path='bank')
    def bank(self, request):
        if request.method.lower() == 'get':
            qs = LearningAssignment.objects.prefetch_related('questions').all()
            course = request.query_params.get('course')
            if course:
                qs = qs.filter(course__iexact=course)
            return Response(LearningAssignmentSerializer(qs, many=True).data)

        serializer = LearningAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assignment = serializer.save(created_by=request.user)
        log_audit(request.user, 'learning_assignment_created', assignment.title, request)
        return Response(LearningAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['put', 'patch', 'delete'], url_path='bank-detail')
    def bank_detail(self, request, pk=None):
        try:
            assignment = LearningAssignment.objects.prefetch_related('questions').get(pk=pk)
        except LearningAssignment.DoesNotExist:
            return Response({'error': 'Assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.method.lower() == 'delete':
            title = assignment.title
            assignment.delete()
            log_audit(request.user, 'learning_assignment_deleted', title, request)
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = LearningAssignmentSerializer(
            assignment,
            data=request.data,
            partial=request.method.lower() == 'patch',
        )
        serializer.is_valid(raise_exception=True)
        assignment = serializer.save()
        log_audit(request.user, 'learning_assignment_updated', assignment.title, request)
        return Response(LearningAssignmentSerializer(assignment).data)

    @action(detail=False, methods=['post'], url_path='assign')
    def assign(self, request):
        serializer = LearningAssignmentBulkAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            assignment = LearningAssignment.objects.prefetch_related('questions').get(
                pk=serializer.validated_data['assignment_id']
            )
        except LearningAssignment.DoesNotExist:
            return Response({'error': 'Assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

        question_total = sum(q.points for q in assignment.questions.all())
        created = 0
        updated = 0
        reset = 0
        duplicates = 0
        for student_id in serializer.validated_data['student_ids']:
            existing = StudentLearningAssignment.objects.filter(
                assignment=assignment,
                student_id=student_id,
                status='assigned'
            ).first()

            if existing:
                # Assignment is in 'assigned' status. Just update its due_at deadline.
                existing.due_at = serializer.validated_data.get('due_at')
                existing.assigned_by = request.user
                existing.total_points = question_total
                existing.save()
                updated += 1
            else:
                try:
                    StudentLearningAssignment.objects.create(
                        assignment=assignment,
                        student_id=student_id,
                        assigned_by=request.user,
                        due_at=serializer.validated_data.get('due_at'),
                        total_points=question_total,
                    )
                    created += 1
                except IntegrityError:
                    duplicates += 1

        total_assigned = created + updated + reset
        log_audit(request.user, 'learning_assignment_sent', f'{assignment.title}: {total_assigned} students', request)
        return Response({
            'assigned': total_assigned,
            'created': created,
            'updated': updated,
            'reset': reset,
            'duplicates': duplicates
        }, status=status.HTTP_201_CREATED)


    @action(detail=False, methods=['get'], url_path='results')
    def results(self, request):
        qs = StudentLearningAssignment.objects.select_related('assignment', 'student').prefetch_related('answers__question')
        course = request.query_params.get('course')
        assignment_id = request.query_params.get('assignment_id')
        status_filter = request.query_params.get('status')

        if course:
            qs = qs.filter(assignment__course__iexact=course)
        if assignment_id:
            qs = qs.filter(assignment_id=assignment_id)
        if status_filter:
            qs = qs.filter(status=status_filter)

        return Response(StudentLearningAssignmentSerializer(qs, many=True).data)


class StudentLearningAssignmentViewSet(viewsets.ViewSet):
    permission_classes = [IsStudentUser]

    @action(detail=False, methods=['get'], url_path='list')
    def list_assignments(self, request):
        student = request.user.student_profile
        now = timezone.now()
        qs = StudentLearningAssignment.objects.filter(student=student).select_related('assignment').prefetch_related('answers__question')
        expired = qs.filter(status='assigned', due_at__lt=now)
        if expired.exists():
            expired.update(status='expired', updated_at=now)
        return Response(StudentLearningAssignmentSerializer(qs, many=True).data)

    @action(detail=True, methods=['get'], url_path='detail')
    def get_assignment_detail(self, request, pk=None):
        try:
            student_assignment = StudentLearningAssignment.objects.select_related('assignment', 'student').prefetch_related(
                'assignment__questions', 'answers__question'
            ).get(pk=pk, student=request.user.student_profile)
        except StudentLearningAssignment.DoesNotExist:
            return Response({'error': 'Assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = StudentLearningAssignmentSerializer(student_assignment).data
        questions = []
        for question in student_assignment.assignment.questions.all():
            row = {
                'id': str(question.id),
                'prompt': question.prompt,
                'options': question.options,
                'points': question.points,
                'order': question.order,
            }
            if student_assignment.status == 'submitted':
                row['correct_option'] = question.correct_option
            questions.append(row)
        data['questions'] = questions
        return Response(data)

    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        try:
            student_assignment = StudentLearningAssignment.objects.select_related('assignment', 'student').prefetch_related(
                'assignment__questions'
            ).get(pk=pk, student=request.user.student_profile)
        except StudentLearningAssignment.DoesNotExist:
            return Response({'error': 'Assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if student_assignment.status == 'submitted':
            return Response({'error': 'Assignment already submitted.'}, status=status.HTTP_400_BAD_REQUEST)
        if student_assignment.due_at and student_assignment.due_at < timezone.now():
            student_assignment.status = 'expired'
            student_assignment.save(update_fields=['status', 'updated_at'])
            return Response({'error': 'Assignment timeline has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = LearningAssignmentSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        answers = serializer.validated_data['answers']

        score = 0
        total = 0
        with transaction.atomic():
            for question in student_assignment.assignment.questions.all():
                selected = answers.get(str(question.id))
                is_correct = selected == question.correct_option
                awarded = question.points if is_correct else 0
                score += awarded
                total += question.points
                StudentLearningAnswer.objects.update_or_create(
                    student_assignment=student_assignment,
                    question=question,
                    defaults={
                        'selected_option': selected,
                        'is_correct': is_correct,
                        'awarded_points': awarded,
                    },
                )
            student_assignment.score = score
            student_assignment.total_points = total
            student_assignment.status = 'submitted'
            student_assignment.submitted_at = timezone.now()
            student_assignment.save(update_fields=['score', 'total_points', 'status', 'submitted_at', 'updated_at'])

        return Response(StudentLearningAssignmentSerializer(student_assignment).data)
