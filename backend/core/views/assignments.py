# core/views/assignments.py
"""Assignment management — list all, update status (Admin/Coordinator)."""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import PlacementAssignment
from ..serializers import PlacementAssignmentSerializer, AssignmentStatusSerializer
from ..permissions import IsAdminOrCoordinator
from .helpers import log_audit


class AssignmentViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrCoordinator]

    @action(detail=False, methods=['get'], url_path='list')
    def list_all(self, request):
        """List all assignments with optional status filter."""
        qs = PlacementAssignment.objects.select_related(
            'student', 'placement', 'assigned_by'
        ).all()
        st = request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        return Response(PlacementAssignmentSerializer(qs, many=True).data)

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        """Update assignment status (assigned → applied → shortlisted → selected/rejected)."""
        try:
            assignment = PlacementAssignment.objects.get(pk=pk)
        except PlacementAssignment.DoesNotExist:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AssignmentStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old = assignment.status
        assignment.status = serializer.validated_data['status']
        assignment.save(update_fields=['status', 'updated_date'])

        log_audit(request.user, 'assignment_status_changed', f'{old} → {assignment.status}', request)
        return Response(PlacementAssignmentSerializer(assignment).data)
