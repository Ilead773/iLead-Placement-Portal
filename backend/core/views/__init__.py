# core/views/__init__.py
"""
Views package — split by domain for maintainability.
Each file handles one responsibility.
"""
from .auth import AuthViewSet
from .students import StudentViewSet
from .placements import PlacementViewSet
from .assignments import AssignmentViewSet, LearningAssignmentAdminViewSet, StudentLearningAssignmentViewSet
from .student_self import StudentSelfViewSet
from .dashboard import DashboardViewSet, AuditLogViewSet
from .admin_ops import AdminOpsViewSet, HealthCheckView
from .features import FeatureConfigViewSet

__all__ = [
    'AuthViewSet',
    'StudentViewSet',
    'PlacementViewSet',
    'AssignmentViewSet',
    'LearningAssignmentAdminViewSet',
    'StudentLearningAssignmentViewSet',
    'StudentSelfViewSet',
    'DashboardViewSet',
    'AuditLogViewSet',
    'AdminOpsViewSet',
    'HealthCheckView',
    'FeatureConfigViewSet',
]

