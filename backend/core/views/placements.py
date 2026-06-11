# core/views/placements.py
"""Placement CRUD + student assignment (Admin/Coordinator)."""
import csv
import logging

from django.db import IntegrityError
from django.http import HttpResponse
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import Student, Placement, PlacementAssignment
from ..serializers import (
    PlacementSerializer, PlacementCreateSerializer,
    PlacementAssignmentSerializer, BulkAssignSerializer,
)
from ..permissions import IsAdminOrCoordinator
from .helpers import log_audit

logger = logging.getLogger('core')


class PlacementViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrCoordinator]

    @action(detail=False, methods=['get'], url_path='list')
    def list_placements(self, request):
        """List all placements."""
        qs = Placement.objects.select_related('created_by').all()
        search = request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(Q(company_name__icontains=search) | Q(position__icontains=search))
        return Response(PlacementSerializer(qs, many=True).data)

    @action(detail=False, methods=['post'], url_path='create')
    def create_placement(self, request):
        """Create a new placement opportunity."""
        serializer = PlacementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        placement = serializer.save(created_by=request.user)
        log_audit(request.user, 'placement_created', f'{placement.company_name} — {placement.position}', request)
        return Response(PlacementSerializer(placement).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='detail')
    def get_placement(self, request, pk=None):
        """Get placement details."""
        try:
            p = Placement.objects.select_related('created_by').get(pk=pk)
        except Placement.DoesNotExist:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PlacementSerializer(p).data)

    @action(detail=True, methods=['put'], url_path='update')
    def update_placement(self, request, pk=None):
        """Update a placement."""
        try:
            p = Placement.objects.get(pk=pk)
        except Placement.DoesNotExist:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = PlacementCreateSerializer(p, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_audit(request.user, 'placement_updated', f'{p.company_name}', request)
        return Response(PlacementSerializer(p).data)

    @action(detail=True, methods=['delete'], url_path='delete')
    def delete_placement(self, request, pk=None):
        """Delete a placement."""
        try:
            p = Placement.objects.get(pk=pk)
        except Placement.DoesNotExist:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        log_audit(request.user, 'placement_deleted', f'{p.company_name} — {p.position}', request)
        p.delete()
        return Response({'message': 'Deleted.'}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='assign-students')
    def assign_students(self, request, pk=None):
        """Bulk assign students to a placement."""
        try:
            placement = Placement.objects.get(pk=pk)
        except Placement.DoesNotExist:
            return Response({'error': 'Placement not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = BulkAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student_ids = serializer.validated_data['student_ids']

        created = 0
        duplicates = 0
        for sid in student_ids:
            try:
                student = Student.objects.get(pk=sid)
                if PlacementAssignment.objects.filter(placement=placement, student=student).exists():
                    duplicates += 1
                    continue
                PlacementAssignment.objects.create(
                    placement=placement, student=student, assigned_by=request.user,
                )
                created += 1
            except Student.DoesNotExist:
                continue

        log_audit(request.user, 'students_assigned', f'{created} to {placement.company_name}', request)
        return Response({'assigned': created, 'duplicates': duplicates}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='assignments')
    def list_assignments(self, request, pk=None):
        """List students assigned to a specific placement."""
        assignments = PlacementAssignment.objects.filter(
            placement_id=pk
        ).select_related('student', 'placement', 'assigned_by')
        return Response(PlacementAssignmentSerializer(assignments, many=True).data)

    @action(detail=True, methods=['get'], url_path='selected-excel')
    def selected_excel(self, request, pk=None):
        """Download Excel of selected students for this placement."""
        try:
            placement = Placement.objects.get(pk=pk)
        except Placement.DoesNotExist:
            return Response({'error': 'Placement not found.'}, status=status.HTTP_404_NOT_FOUND)

        assignments = (
            PlacementAssignment.objects.filter(placement=placement, status='selected')
            .select_related('student', 'placement')
            .order_by('student__registration_number', 'student__name')
        )

        safe_company = slugify(placement.company_name or 'company')[:40] or 'company'
        safe_position = slugify(placement.position or 'position')[:40] or 'position'
        date_tag = timezone.localtime(timezone.now()).strftime('%Y-%m-%d')
        filename = f"selected_students_{safe_company}_{safe_position}_{date_tag}.xlsx"

        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Selected Students"

        headers = [
            'Company',
            'Position',
            'Student Name',
            'Registration Number',
            'Email',
            'Phone',
            'Course',
            'Stream',
            'CGPA',
            'Status',
            'Assigned Date',
        ]
        ws.append(headers)

        for a in assignments:
            s = a.student
            ws.append([
                placement.company_name or '',
                placement.position or '',
                s.name or '',
                s.registration_number or '',
                s.email or '',
                getattr(s, 'phone_number', '') or '',
                s.course or '',
                s.stream or '',
                s.cgpa if s.cgpa is not None else '',
                a.status or '',
                timezone.localtime(a.assigned_date).isoformat() if a.assigned_date else '',
            ])

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Cache-Control'] = 'no-store'
        wb.save(response)
        return response

