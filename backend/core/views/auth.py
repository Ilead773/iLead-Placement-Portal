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

        # Look up user first without row lock (supports login by login_id OR email)
        from django.db.models import Q
        user = User.objects.filter(Q(login_id=login_id) | Q(email__iexact=login_id)).first()
        if not user:
            log_audit(None, 'login_failed', f'Unknown login_id: {login_id}', request)
            if '@' in login_id:
                return Response(
                    {'error': f'No account found with email "{login_id}". Please check your email or log in using your Roll Number (Login ID).'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            return Response(
                {'error': f'No account found for Login ID "{login_id}". Please make sure you are using your correct Roll Number or check your Welcome Email.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            log_audit(user, 'login_failed', 'Account inactive', request)
            return Response(
                {'error': 'Your account is currently inactive or disabled. Please contact the placement cell or portal administrator.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Quick lockout check before running slow hash check
        if user.locked_until and user.locked_until > datetime.now(timezone.utc):
            remaining = int((user.locked_until - datetime.now(timezone.utc)).total_seconds() // 60) + 1
            if remaining <= 0:
                remaining = 1
            return Response(
                {'error': f'Account locked due to multiple failed attempts. Please try again in {remaining} minute(s) or use "Forgot password?".'},
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
                            {'error': f'Account locked due to multiple failed attempts. Please try again in {remaining} minute(s) or use "Forgot password?".'},
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
                            {'error': f'Too many failed attempts. Account locked for {lockout_mins} minute(s).'},
                            status=status.HTTP_429_TOO_MANY_REQUESTS,
                        )
                    
                    user.save(update_fields=['failed_login_attempts', 'locked_until'])
                    log_audit(user, 'login_failed', f'Attempt {user.failed_login_attempts}', request)
                    
                    # Custom error warning specifically for first-time login users
                    if user.temp_password_flag or user.password_reset_required:
                        email_str = user.email or ''
                        if '@' in email_str:
                            parts = email_str.split('@')
                            uname = parts[0]
                            domain = parts[1]
                            masked_uname = uname[0] + '***' + (uname[-1] if len(uname) > 1 else '')
                            masked_email = f"{masked_uname}@{domain}"
                        else:
                            masked_email = "your registered email"

                        return Response(
                            {'error': f'Incorrect temporary password. If this is your first time logging in, please check the Welcome Email (including Spam/Junk) sent to {masked_email} and copy-paste your temporary password exactly as shown for Roll Number {user.login_id} (make sure there are no extra spaces).'},
                            status=status.HTTP_401_UNAUTHORIZED
                        )
                    
                    return Response(
                        {'error': 'Incorrect password. Please check your password or use "Forgot password?" to reset it.'},
                        status=status.HTTP_401_UNAUTHORIZED
                    )

                # Success path inside transaction — reset counters
                user.failed_login_attempts = 0
                user.locked_until = None
                user.save(update_fields=['failed_login_attempts', 'locked_until'])
        except User.DoesNotExist:
            log_audit(None, 'login_failed', f'Unknown login_id: {login_id}', request)
            return Response({'error': f'No account found for Login ID "{login_id}".'}, status=status.HTTP_401_UNAUTHORIZED)

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
        """Send a password reset link to the user's email or login ID.

        Rate limits (enforced via Redis cache):
          - Per email/login_id : 1 request per 5 minutes
          - Per IP address     : 5 requests per 10 minutes
        """
        return Response(
            {'error': 'Forgot password service is temporarily disabled.'},
            status=status.HTTP_403_FORBIDDEN
        )

        from django.core.cache import cache

        identity = request.data.get('identity', '').strip()
        if not identity:
            return Response({'error': 'Login ID or Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # ── Rate limit 1: per identity (email / login_id) ─────────────────
        COOLDOWN_SECONDS = 5 * 60  # 5 minutes
        identity_key = f'pwd_reset_identity:{identity.lower()}'
        if cache.get(identity_key):
            # Calculate remaining seconds so the frontend can show a countdown
            ttl = cache.ttl(identity_key) if hasattr(cache, 'ttl') else COOLDOWN_SECONDS
            wait_mins = max(1, round(ttl / 60))
            return Response(
                {
                    'error': f'A reset email was already sent. Please wait {wait_mins} minute(s) before requesting another one.',
                    'retry_after_seconds': ttl,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # ── Rate limit 2: per IP address ──────────────────────────────────
        IP_WINDOW_SECONDS = 10 * 60  # 10-minute window
        IP_MAX_REQUESTS   = 100       # max 100 reset attempts from same IP for testing
        ip = (
            request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
            or request.META.get('REMOTE_ADDR', 'unknown')
        )
        ip_key   = f'pwd_reset_ip:{ip}'
        ip_count = cache.get(ip_key, 0)
        if ip_count >= IP_MAX_REQUESTS:
            return Response(
                {'error': 'Too many password reset attempts from your network. Please try again in 10 minutes.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        try:
            from django.db.models import Q
            user = User.objects.filter(Q(email__iexact=identity) | Q(login_id__iexact=identity)).first()

            if not user:
                logger.info("Forgot Password requested, but no matching user was found.")
                # Still set the rate-limit key even for unknown users (prevents enumeration)
                cache.set(identity_key, True, COOLDOWN_SECONDS)
                return Response({'message': 'If an account exists with this identity, a reset link has been sent.'})

            if not user.email:
                logger.warning(f"User '{user.id}' found for forgot password, but has no email address.")
                return Response({'message': 'If an account exists with this identity, a reset link has been sent.'})

            from django.contrib.auth.tokens import default_token_generator
            from django.utils.http import urlsafe_base64_encode
            from django.utils.encoding import force_bytes

            token = default_token_generator.make_token(user)
            uid   = urlsafe_base64_encode(force_bytes(user.pk))
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"

            subject = 'Password Reset Request'
            message = f"""
            You requested a password reset for your iLEAD Placement Portal account.
            Please copy and paste the link below to set a new password:

            {reset_url}

            This link is valid for 24 hours. If you did not request this, please ignore this email.
            """

            html_message = f"""
            <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 40px 20px; margin: 0; color: #334155;">
                    <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                        <!-- Brand Banner -->
                        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 30px; text-align: center;">
                            <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">iLEAD Placement Portal</h2>
                        </div>
                        
                        <!-- Content Body -->
                        <div style="padding: 32px 24px;">
                            <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">Hello,</p>
                            <p style="font-size: 14px; line-height: 1.6; margin-bottom: 24px;">You requested a password reset for your iLEAD Placement Portal account. Please click the button below to set a new password:</p>
                            
                            <!-- Action Button -->
                            <div style="text-align: center; margin-bottom: 28px; margin-top: 20px;">
                                <a href="{reset_url}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; font-size: 14px; font-weight: 700; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                                    Reset Password
                                </a>
                            </div>
                            
                            <!-- Validity Warning -->
                            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
                                <p style="font-size: 13px; color: #b45309; margin: 0; font-weight: 600;">
                                    ⚠️ This link is valid for 24 hours.
                                </p>
                            </div>
                            
                            <!-- Fallback Link -->
                            <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
                                If the button above doesn't work, copy and paste the following link into your browser:
                                <br/>
                                <a href="{reset_url}" style="color: #2563eb; text-decoration: none; word-break: break-all; display: block; margin-top: 6px;">{reset_url}</a>
                            </p>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="font-size: 11px; color: #94a3b8; margin: 0;">Sent securely via iLEAD Placement Portal</p>
                            <p style="font-size: 11px; color: #94a3b8; margin: 4px 0 0 0;">If you did not request this password reset, please ignore this email.</p>
                        </div>
                    </div>
                </body>
            </html>
            """

            logger.info(f"Attempting to send password reset email to user ID: {user.id}")
            from django.core.mail import send_mail
            send_mail(subject, message, None, [user.email], fail_silently=False, html_message=html_message)
            logger.info(f"Email sent successfully for user ID: {user.id}")

            # ── Set rate-limit keys AFTER successful send ─────────────────
            cache.set(identity_key, True, COOLDOWN_SECONDS)
            # Increment IP counter (set TTL only on first hit)
            if ip_count == 0:
                cache.set(ip_key, 1, IP_WINDOW_SECONDS)
            else:
                cache.incr(ip_key)

            return Response({
                'message': 'If an account exists with this identity, a reset link has been sent.',
                'retry_after_seconds': COOLDOWN_SECONDS,
            })

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
                # Validate password complexity (matching the standard regex checklist)
                import re
                if len(new_password) < 8:
                    return Response({'error': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)
                if not re.search(r'[A-Z]', new_password):
                    return Response({'error': 'Password must contain at least one uppercase letter.'}, status=status.HTTP_400_BAD_REQUEST)
                if not re.search(r'[a-z]', new_password):
                    return Response({'error': 'Password must contain at least one lowercase letter.'}, status=status.HTTP_400_BAD_REQUEST)
                if not re.search(r'\d', new_password):
                    return Response({'error': 'Password must contain at least one digit.'}, status=status.HTTP_400_BAD_REQUEST)
                if not re.search(r'[!@#$%^&*(),.?":{}|<>]', new_password):
                    return Response({'error': 'Password must contain at least one special character.'}, status=status.HTTP_400_BAD_REQUEST)

                # Also run standard Django validators (common passwords, numeric, similarity)
                from django.contrib.auth.password_validation import validate_password
                from django.core.exceptions import ValidationError as DjangoValidationError
                try:
                    validate_password(new_password, user)
                except DjangoValidationError as ve:
                    return Response({'error': ve.messages[0]}, status=status.HTTP_400_BAD_REQUEST)

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
