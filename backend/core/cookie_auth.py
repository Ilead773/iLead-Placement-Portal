from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

class JWTCookieAuthentication(JWTAuthentication):
    """
    Custom authentication class that extends Simple JWT's JWTAuthentication
    to read the access token from cookies, falling back to Authorization headers.
    """
    def authenticate(self, request):
        # Extract access token from cookies
        raw_token = request.COOKIES.get('access_token')
        from_cookie = True

        # Fallback to Authorization header if cookie is missing
        if raw_token is None:
            from_cookie = False
            header = self.get_header(request)
            if header is None:
                return None
            raw_token = self.get_raw_token(header)
            if raw_token is None:
                return None

        # Validate the token and return user + token
        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)

            # Enforce CSRF check if authenticated via cookie
            # Disabled to support cross-domain Vercel -> Railway requests
            # if from_cookie:
            #     self.enforce_csrf(request)

            return user, validated_token
        except (InvalidToken, TokenError):
            return None

    def enforce_csrf(self, request):
        from rest_framework.authentication import CSRFCheck
        from rest_framework import exceptions

        check = CSRFCheck(request)
        # populates request.META['CSRF_COOKIE'], which is used by CSRFCheck
        reason = check.process_view(request, None, (), {})
        if reason:
            # CSRF failed, raise validation error
            raise exceptions.PermissionDenied(f'CSRF Failed: {reason}')
