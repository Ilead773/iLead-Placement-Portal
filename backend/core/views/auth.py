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


class AuthViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'], url_path='login')
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        login_id = serializer.validated_data['login_id'].lower()
        password = serializer.validated_data['password']

        # Look up user
        try:
            user = User.objects.get(login_id=login_id)
        except User.DoesNotExist:
            log_audit(None, 'login_failed', f'Unknown login_id: {login_id}', request)
            return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Rate limiting — check lockout
        if user.locked_until:
            if user.locked_until > datetime.now(timezone.utc):
                remaining = int((user.locked_until - datetime.now(timezone.utc)).total_seconds() // 60) + 1
                return Response(
                    {'error': f'Account locked. Try again in {remaining} minutes.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            else:
                # Lockout period has passed — reset the counter for a fresh start
                user.failed_login_attempts = 0
                user.locked_until = None
                user.save(update_fields=['failed_login_attempts', 'locked_until'])

        # Verify password
        if not user.check_password(password):
            user.failed_login_attempts += 1
            
            max_attempts = getattr(settings, 'LOGIN_RATE_LIMIT_MAX_ATTEMPTS', 5)
            lockout_mins = getattr(settings, 'LOGIN_RATE_LIMIT_LOCKOUT_MINUTES', 15)
            
            if user.failed_login_attempts >= max_attempts:
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=lockout_mins)
                user.save(update_fields=['failed_login_attempts', 'locked_until'])
                log_audit(user, 'account_locked', f'Locked for {lockout_mins} min after {max_attempts} failures', request)
                return Response(
                    {'error': f'Too many failed attempts. Account locked for {lockout_mins} minutes.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            
            user.save(update_fields=['failed_login_attempts'])
            log_audit(user, 'login_failed', f'Attempt {user.failed_login_attempts}', request)
            return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'error': 'Account is disabled.'}, status=status.HTTP_403_FORBIDDEN)

        # Success — reset counters and issue tokens
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save(update_fields=['failed_login_attempts', 'locked_until'])

        refresh = RefreshToken.for_user(user)
        log_audit(user, 'login_success', '', request)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })

    @action(detail=False, methods=['post'], url_path='logout',
            permission_classes=[permissions.IsAuthenticated])
    def logout(self, request):
        try:
            token = request.data.get('refresh')
            if token:
                RefreshToken(token).blacklist()
        except Exception:
            pass
        log_audit(request.user, 'logout', '', request)
        return Response({'message': 'Logged out.'})

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
        return Response({
            'message': 'Password changed successfully.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })

    @action(detail=False, methods=['post'], url_path='refresh')
    def refresh_token(self, request):
        token = request.data.get('refresh')
        if not token:
            return Response({'error': 'Refresh token required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            refresh = RefreshToken(token)
            return Response({'access': str(refresh.access_token), 'refresh': str(refresh)})
        except Exception:
            return Response({'error': 'Invalid refresh token.'}, status=status.HTTP_401_UNAUTHORIZED)

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
                print(f"DEBUG: Forgot Password requested for '{identity}', but no matching user was found.")
                return Response({'message': 'If an account exists with this identity, a reset link has been sent.'})

            if not user.email:
                print(f"DEBUG: User '{user.login_id}' found, but has no email address.")
                return Response({'error': 'This account does not have a registered email address. Please contact an admin.'}, status=status.HTTP_400_BAD_REQUEST)

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
            
            print(f"DEBUG: Attempting to send password reset email to: {user.email}")
            from core.tasks import async_send_mail
            async_send_mail.delay(subject, message, [user.email], fail_silently=False)
            print(f"DEBUG: Email queued successfully to {user.email}")
            return Response({'message': 'Password reset link sent to your email.'})
            
        except Exception as e:
            print(f"DEBUG: Unexpected error in forgot_password: {str(e)}")
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
