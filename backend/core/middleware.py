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
                from django.conf import settings
                allowed_paths = [
                    f"/{settings.ADMIN_URL}",
                    '/api/v1/auth/change-password/',
                    '/api/v1/auth/logout/',
                    '/api/v1/auth/refresh/',
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


from django.middleware.csrf import get_token

class EnsureCsrfCookieMiddleware:
    """
    Middleware that ensures CSRF cookie is set on all safe (GET/HEAD/OPTIONS) requests.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            get_token(request)
        return self.get_response(request)


class LimitUploadSizeMiddleware:
    """
    Middleware to reject requests with content length greater than a limit (e.g., 10MB).
    This prevents out-of-memory or disk exhaustion from massive file uploads.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == 'POST':
            content_length = request.META.get('CONTENT_LENGTH')
            if content_length:
                try:
                    content_length = int(content_length)
                    # Max allowed request payload: 10MB
                    max_size = 10 * 1024 * 1024  
                    if content_length > max_size:
                        from django.http import JsonResponse
                        return JsonResponse(
                            {'error': 'payload_too_large', 'message': 'Upload size exceeds maximum limit.'},
                            status=413
                        )
                except ValueError:
                    pass
        return self.get_response(request)


class AdminIPRestrictionMiddleware:
    """
    Middleware to restrict access to the Django admin panel based on IP address.
    Configured via ADMIN_IP_WHITELIST setting.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.conf import settings
        admin_url = getattr(settings, 'ADMIN_URL', 'admin-secure-portal/')
        if request.path.startswith(f"/{admin_url}"):
            whitelist = getattr(settings, 'ADMIN_IP_WHITELIST', None)
            if whitelist:
                # Get client IP
                x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                if x_forwarded_for:
                    ip = x_forwarded_for.split(',')[0].strip()
                else:
                    ip = request.META.get('REMOTE_ADDR')
                
                if ip not in whitelist:
                    from django.http import HttpResponseForbidden
                    return HttpResponseForbidden("Access denied.")
        return self.get_response(request)


class SecurityHeadersMiddleware:
    """
    Middleware to append security headers, including Content-Security-Policy (CSP),
    to all outgoing HTTP responses.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Set CSP header
        csp_directives = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://*.zoom.us; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 https: ws: wss:; "
            "frame-src 'self' https://*.zoom.us;"
        )
        response['Content-Security-Policy'] = csp_directives
        
        # Additional Security Headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), camera=(), microphone=*'
        
        # Disable caching for API responses to ensure real-time consistency
        if request.path.startswith('/api/'):
            response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            
        return response
