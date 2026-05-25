# core/views/__init__.py
"""
Views package — split by domain for maintainability.
Each file handles one responsibility.
"""
from .auth import AuthViewSet
from .students import StudentViewSet
from .placements import PlacementViewSet
from .assignments import AssignmentViewSet
from .student_self import StudentSelfViewSet
from .dashboard import DashboardViewSet, AuditLogViewSet
from .admin_ops import AdminOpsViewSet

__all__ = [
    'AuthViewSet',
    'StudentViewSet',
    'PlacementViewSet',
    'AssignmentViewSet',
    'StudentSelfViewSet',
    'DashboardViewSet',
    'AuditLogViewSet',
    'AdminOpsViewSet',
]
