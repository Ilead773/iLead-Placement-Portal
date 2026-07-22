# core/views/auth.py
"""Authentication: login, logout, password change, token refresh."""
import logging
from datetime import datetime, timezone, timedelta

from django.conf import settings
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.mail import send_mail

from ..models import User
from ..serializers import UserSerializer, LoginSerializer, ChangePasswordSerializer
from .helpers import log_audit

logger = logging.getLogger('core')


def _set_auth_cookies(response, request, access_token, refresh_token):
    cookie_domain = getattr(settings, 'AUTH_COOKIE_DOMAIN', None)
    is_secure_request = request.is_secure() or request.META.get('HTTP_X_FORWARDED_PROTO') == 'https'
    secure = not settings.DEBUG or is_secure_request
    
    # Use SameSite=None in production/secure contexts to support cross-site requests (Vercel -> Railway)
    samesite = 'None' if secure else 'Lax'
    
    response.set_cookie(
        key='access_token',
        value=access_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        domain=cookie_domain,
        max_age=3600,
    )
    response.set_cookie(
        key='refresh_token',
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        domain=cookie_domain,
        max_age=7 * 24 * 3600,
    )

def _delete_auth_cookies(response, request=None):
    cookie_domain = getattr(settings, 'AUTH_COOKIE_DOMAIN', None)
    is_secure_request = False
    if request:
        is_secure_request = request.is_secure() or request.META.get('HTTP_X_FORWARDED_PROTO') == 'https'
    
    secure = not settings.DEBUG or is_secure_request
    samesite = 'None' if secure else 'Lax'
    
    response.set_cookie('access_token', '', max_age=0, expires='Thu, 01 Jan 1970 00:00:00 GMT', domain=cookie_domain, secure=secure, samesite=samesite)
    response.set_cookie('refresh_token', '', max_age=0, expires='Thu, 01 Jan 1970 00:00:00 GMT', domain=cookie_domain, secure=secure, samesite=samesite)


class AuthViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    def get_permissions(self):
        if self.action in ['logout', 'change_password']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    @action(detail=False, methods=['post'], url_path='login')
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        login_id = serializer.validated_data['login_id'].lower()
        password = serializer.validated_data['password']

        # Look up user first without row lock
        try:
            user = User.objects.get(login_id=login_id)
        except User.DoesNotExist:
            log_audit(None, 'login_failed', f'Unknown login_id: {login_id}', request)
            return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Quick lockout check before running slow hash check
        if user.locked_until and user.locked_until > datetime.now(timezone.utc):
            remaining = int((user.locked_until - datetime.now(timezone.utc)).total_seconds() // 60) + 1
            if remaining <= 0:
                remaining = 1
            return Response(
                {'error': f'Account locked. Try again in {remaining} minutes.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Verify password (slow, CPU-bound BCrypt operation outside transaction)
        password_correct = user.check_password(password)

        # Short write transaction block to update failed counters or reset on success
        from django.db import transaction
        try:
            with transaction.atomic():
                # Re-fetch user with row lock to securely update status counters
                user = User.objects.select_for_update().get(id=user.id)

                # Re-check lockout status inside transaction to prevent race conditions
                if user.locked_until:
                    if user.locked_until > datetime.now(timezone.utc):
                        remaining = int((user.locked_until - datetime.now(timezone.utc)).total_seconds() // 60) + 1
                        if remaining <= 0:
                            remaining = 1
                        return Response(
                            {'error': f'Account locked. Try again in {remaining} minutes.'},
                            status=status.HTTP_429_TOO_MANY_REQUESTS,
                        )
                    else:
                        # Lockout has expired, reset attempts before evaluating this attempt
                        user.failed_login_attempts = 0
                        user.locked_until = None

                if not password_correct:
                    user.failed_login_attempts += 1
                    
                    if user.failed_login_attempts >= 5:
                        if user.failed_login_attempts == 5:
                            lockout_mins = 1
                        else:
                            lockout_mins = 5
                        
                        user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=lockout_mins)
                        user.save(update_fields=['failed_login_attempts', 'locked_until'])
                        log_audit(user, 'account_locked', f'Locked for {lockout_mins} min after {user.failed_login_attempts} failures', request)
                        return Response(
                            {'error': f'Too many failed attempts. Account locked for {lockout_mins} minutes.'},
                            status=status.HTTP_429_TOO_MANY_REQUESTS,
                        )
                    
                    user.save(update_fields=['failed_login_attempts', 'locked_until'])
                    log_audit(user, 'login_failed', f'Attempt {user.failed_login_attempts}', request)
                    return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

                # Success path inside transaction — reset counters
                user.failed_login_attempts = 0
                user.locked_until = None
                user.save(update_fields=['failed_login_attempts', 'locked_until'])
        except User.DoesNotExist:
            log_audit(None, 'login_failed', f'Unknown login_id: {login_id}', request)
            return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        log_audit(user, 'login_success', '', request)

        response = Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })
        _set_auth_cookies(response, request, str(refresh.access_token), str(refresh))
        return response

    @action(detail=False, methods=['post'], url_path='logout',
            permission_classes=[permissions.IsAuthenticated])
    def logout(self, request):
        try:
            token = request.COOKIES.get('refresh_token') or request.data.get('refresh')
            if token:
                RefreshToken(token).blacklist()
        except Exception:
            pass
        log_audit(request.user, 'logout', '', request)
        response = Response({'message': 'Logged out.'})
        _delete_auth_cookies(response, request)
        return response

    @action(detail=False, methods=['post'], url_path='change-password',
            permission_classes=[permissions.IsAuthenticated])
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['current_password']):
            return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.temp_password_flag = False
        user.password_reset_required = False
        user.save(update_fields=['password', 'temp_password_flag', 'password_reset_required'])

        log_audit(user, 'password_changed', '', request)
        refresh = RefreshToken.for_user(user)
        response = Response({
            'message': 'Password changed successfully.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })
        _set_auth_cookies(response, request, str(refresh.access_token), str(refresh))
        return response

    @action(detail=False, methods=['post'], url_path='refresh')
    def refresh_token(self, request):
        token = request.COOKIES.get('refresh_token') or request.data.get('refresh')
        if not token:
            return Response({'error': 'Refresh token required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            refresh = RefreshToken(token)
            data = {'access': str(refresh.access_token)}
            
            from rest_framework_simplejwt.settings import api_settings
            
            if api_settings.ROTATE_REFRESH_TOKENS:
                if api_settings.BLACKLIST_AFTER_ROTATION:
                    try:
                        refresh.blacklist()
                    except AttributeError:
                        pass
                
                refresh.set_jti()
                refresh.set_exp()
                refresh.set_iat()
                
                data['refresh'] = str(refresh)
            else:
                data['refresh'] = str(refresh)
                
            response = Response({
                'status': 'refreshed',
                'access': data['access'],
                'refresh': data['refresh'],
            })
            _set_auth_cookies(response, request, data['access'], data['refresh'])
            return response
        except Exception:
            response = Response({'error': 'Invalid refresh token.'}, status=status.HTTP_401_UNAUTHORIZED)
            _delete_auth_cookies(response, request)
            return response

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny], url_path='forgot-password')
    def forgot_password(self, request):
        """Send a password reset link to the user's email or login ID."""
        identity = request.data.get('identity')
        if not identity:
            return Response({'error': 'Login ID or Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Case-insensitive search by email OR login_id
            from django.db.models import Q
            user = User.objects.filter(Q(email__iexact=identity) | Q(login_id__iexact=identity)).first()
            
            if not user:
                logger.info("Forgot Password requested, but no matching user was found.")
                return Response({'message': 'If an account exists with this identity, a reset link has been sent.'})

            if not user.email:
                logger.warning(f"User '{user.id}' found for forgot password, but has no email address.")
                return Response({'message': 'If an account exists with this identity, a reset link has been sent.'})

            from django.contrib.auth.tokens import default_token_generator
            from django.utils.http import urlsafe_base64_encode
            from django.utils.encoding import force_bytes
            
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"
            
            subject = 'Password Reset Request'
            message = f"""
            You requested a password reset for your iLEAD Placement Portal account.
            Please click the link below to set a new password:
            
            {reset_url}
            
            If you did not request this, please ignore this email.
            """
            
            logger.info(f"Attempting to send password reset email to user ID: {user.id}")
            from core.tasks import async_send_mail
            async_send_mail.delay(subject, message, [user.email], fail_silently=False)
            logger.info(f"Email queued successfully for user ID: {user.id}")
            return Response({'message': 'If an account exists with this identity, a reset link has been sent.'})
            
        except Exception as e:
            logger.exception("Unexpected error in forgot_password")
            return Response({'error': 'Something went wrong. Please try again later.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny], url_path='reset-password-confirm')
    def reset_password_confirm(self, request):
        """Reset password using the token sent in the email."""
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        
        if not all([uidb64, token, new_password]):
            return Response({'error': 'Missing data.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            from django.utils.http import urlsafe_base64_decode
            from django.contrib.auth.tokens import default_token_generator
            
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
            
            if default_token_generator.check_token(user, token):
                user.set_password(new_password)
                user.temp_password_flag = False
                user.password_reset_required = False
                user.save()
                log_audit(user, 'password_reset_complete', '', request)
                return Response({'message': 'Password reset successfully.'})
            else:
                return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'error': 'Invalid request.'}, status=status.HTTP_400_BAD_REQUEST)
