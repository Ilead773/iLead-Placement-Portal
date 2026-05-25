from rest_framework import permissions

class IsAdminOrCoordinator(permissions.BasePermission):
    """
    Allows access only to admins and placement coordinators.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['admin', 'coordinator'] or request.user.is_superuser

class IsStudentUser(permissions.BasePermission):
    """
    Allows access only to students.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == 'student'

class IsAdminOnly(permissions.BasePermission):
    """
    Allows access only to admins.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == 'admin' or request.user.is_superuser
