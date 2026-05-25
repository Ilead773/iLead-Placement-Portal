from django.shortcuts import redirect
from django.urls import reverse
from rest_framework.response import Response
from rest_framework import status
import json

class ForcePasswordChangeMiddleware:
    """
    Middleware to force users to change their password if the flag is set.
    Blocks all API requests except for logout and change-password.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            # Check if password change is required
            if getattr(request.user, 'temp_password_flag', False) or getattr(request.user, 'password_reset_required', False):
                
                # List of allowed paths that don't require password change
                allowed_paths = [
                    reverse('admin:index') if hasattr(reverse, 'admin:index') else '/admin/',
                    '/api/auth/change-password/',
                    '/api/auth/logout/',
                    '/api/auth/refresh/',
                ]
                
                # For debug/dev, allow admin panel access if they are superuser (optional)
                # if request.user.is_superuser: return self.get_response(request)

                if not any(request.path.startswith(path) for path in allowed_paths):
                    from django.http import JsonResponse
                    return JsonResponse(
                        {'error': 'password_change_required', 'message': 'You must change your password before continuing.'},
                        status=403
                    )

        return self.get_response(request)
