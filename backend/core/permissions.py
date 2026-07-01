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

class IsPlacementManagerOrReadOnly(permissions.BasePermission):
    """
    Allows read-only access (GET/HEAD/OPTIONS) to all authenticated users,
    but limits write access (POST/PUT/PATCH/DELETE) to admins and authorized coordinators.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role == 'admin' or (
            request.user.role == 'coordinator' and 
            getattr(request.user, 'can_manage_placements', False)
        ) or request.user.is_superuser

