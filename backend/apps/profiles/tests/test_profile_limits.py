import pytest
from rest_framework import status
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.conf import settings
from rest_framework.test import APIClient

from core.models import Student
from apps.profiles.models import StudentProfile

User = get_user_model()


@pytest.mark.django_db
class TestProfileLimits:
    @pytest.fixture(autouse=True)
    def setup_method(self):
        self.user = User.objects.create_user(
            login_id='test_student_profile_limits',
            email='profile_limits@test.com',
            password='Password123!',
            role='student',
            name='Test Student Profile Limits'
        )
        self.student = Student.objects.create(
            user=self.user,
            registration_number='REG_PROFILE_LIMITS',
            name='Test Student Profile Limits',
            course='BCA'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @override_settings(MAX_PROFILE_PICTURE_SIZE=100) # 100 bytes limit
    def test_upload_photo_size_limit(self):
        # 1. Uploading image exceeding limits (200 bytes) should fail
        file_too_large = SimpleUploadedFile("avatar.jpg", b"a" * 200, content_type="image/jpeg")
        response = self.client.post('/api/v1/profiles/me/photo/', {'profile_picture': file_too_large})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Profile picture size exceeds the maximum limit of" in response.data['error']

        # 2. Uploading image within limits (50 bytes) should succeed
        file_ok = SimpleUploadedFile("avatar_ok.jpg", b"a" * 50, content_type="image/jpeg")
        response2 = self.client.post('/api/v1/profiles/me/photo/', {'profile_picture': file_ok})
        assert response2.status_code == status.HTTP_200_OK
        
        # Verify the database updated the photo field
        profile = StudentProfile.objects.get(student=self.student)
        assert profile.profile_picture is not None
        assert profile.profile_picture.size == 50
