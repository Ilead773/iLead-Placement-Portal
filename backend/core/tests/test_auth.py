import pytest
from django.urls import reverse
from rest_framework import status
from core.models import User
from django.utils import timezone
from datetime import timedelta

@pytest.mark.django_db
class TestAuthentication:
    def test_admin_login_success(self, api_client, admin_user):
        url = '/api/v1/auth/login/'
        data = {
            'login_id': 'admin_test',
            'password': 'AdminPassword123!'
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert 'access_token' in response.cookies
        assert response.data['user']['role'] == 'admin'

    def test_invalid_password_failure(self, api_client, admin_user):
        url = '/api/v1/auth/login/'
        data = {
            'login_id': 'admin_test',
            'password': 'WrongPassword'
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert 'access_token' not in response.cookies

    def test_rate_limiting_lockout(self, api_client, admin_user):
        url = '/api/v1/auth/login/'
        data = {
            'login_id': 'admin_test',
            'password': 'WrongPassword'
        }
        
        # 5 failed attempts
        for _ in range(5):
            api_client.post(url, data)
            
        # 6th attempt should be locked
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert 'locked' in response.data['error'].lower()

    def test_forced_password_change_middleware(self, api_client, student_user):
        # Student has temp_password_flag=True
        # Use force_login so the middleware sees the user
        api_client.force_login(user=student_user)
        
        # Try to access a student-accessible endpoint (should still be blocked)
        url = '/api/v1/me/'
        response = api_client.get(url)
        
        assert response.status_code == 403
        assert 'password_change_required' in response.content.decode()

    def test_forced_password_change_allowed_endpoints(self, api_client, student_user):
        api_client.force_login(user=student_user)
        api_client.force_authenticate(user=student_user)
        
        for url in ['/api/v1/auth/change-password/', '/api/v1/auth/logout/', '/api/v1/auth/refresh/']:
            response = api_client.post(url, {})
            # Should not be blocked with password_change_required
            if response.status_code == 403:
                assert 'password_change_required' not in response.content.decode()

    def test_rbac_student_access_denied_to_admin_api(self, api_client, student_user):
        # Even if password is changed, student cannot access /api/students/
        student_user.temp_password_flag = False
        student_user.password_reset_required = False
        student_user.save()
        
        api_client.force_authenticate(user=student_user)
        url = '/api/v1/students/'
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_lockout_expiration_reset(self, api_client, admin_user):
        url = '/api/v1/auth/login/'
        data = {
            'login_id': 'admin_test',
            'password': 'WrongPassword'
        }
        
        # Trigger lockout (5 failures)
        for _ in range(5):
            api_client.post(url, data)
            
        # Verify locked out
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        
        # Fast-forward lockout in DB
        from datetime import datetime, timezone, timedelta
        admin_user.refresh_from_db()
        admin_user.locked_until = datetime.now(timezone.utc) - timedelta(minutes=1)
        admin_user.save()
        
        # Next failed attempt should reset attempts counter (new attempt makes it 1) and not block
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        admin_user.refresh_from_db()
        assert admin_user.failed_login_attempts == 1
        assert admin_user.locked_until is None

    def test_unauthenticated_change_password_and_logout_are_unauthorized(self, api_client):
        # Without authentication, POST /api/v1/auth/change-password/ should be 401
        response = api_client.post('/api/v1/auth/change-password/', {})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

        # Without authentication, POST /api/v1/auth/logout/ should be 401
        response2 = api_client.post('/api/v1/auth/logout/', {})
        assert response2.status_code == status.HTTP_401_UNAUTHORIZED

