import pytest
from rest_framework import status
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.conf import settings
from rest_framework.test import APIClient

from core.models import Student
from apps.resumes.models import BuiltResume, ResumeUpload
from apps.templates_engine.models import ResumeTemplate

from unittest.mock import patch

User = get_user_model()


class MockLargeFile(SimpleUploadedFile):
    """Memory-efficient mocked uploaded file with an arbitrary custom size."""
    def __init__(self, name, size, content_type="application/pdf"):
        super().__init__(name, b"dummy content", content_type=content_type)
        self.size = size


@pytest.mark.django_db
class TestResumeLimits:
    @pytest.fixture(autouse=True)
    def mock_parse_task(self):
        with patch('apps.resumes.tasks.parse_uploaded_resume.delay') as mock:
            yield mock

    @pytest.fixture(autouse=True)
    def setup_method(self):
        # Create student user
        self.user = User.objects.create_user(
            login_id='test_student_limits',
            email='limits@test.com',
            password='Password123!',
            role='student',
            name='Test Student Limits'
        )
        self.student = Student.objects.create(
            user=self.user,
            registration_number='REG_LIMITS',
            name='Test Student Limits',
            course='BCA'
        )
        self.template = ResumeTemplate.objects.create(
            name='Template Limits Test',
            is_active=True,
            html_template='<div>{{ personal.name }}</div>',
            css_styles='body { color: black; }'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @override_settings(MAX_BUILT_RESUMES=2)
    def test_built_resume_limit_reached(self):
        # 1. First resume generation should succeed
        response = self.client.post('/api/v1/resumes/generate/', {'template_id': str(self.template.id)})
        assert response.status_code == status.HTTP_201_CREATED
        assert BuiltResume.objects.filter(student=self.student).count() == 1

        # 2. Second resume generation should succeed (hits limit of 2)
        response2 = self.client.post('/api/v1/resumes/generate/', {'template_id': str(self.template.id)})
        assert response2.status_code == status.HTTP_201_CREATED
        assert BuiltResume.objects.filter(student=self.student).count() == 2

        # 3. Third resume generation should fail
        response3 = self.client.post('/api/v1/resumes/generate/', {'template_id': str(self.template.id)})
        assert response3.status_code == status.HTTP_400_BAD_REQUEST
        assert "Maximum limit of 2 built resumes reached." in response3.data['error']

        # 4. Manual creation should also fail
        payload = {
            'title': 'Manual Resume',
            'template_id': str(self.template.id),
            'canonical_json': {}
        }
        response4 = self.client.post('/api/v1/resumes/', payload, format='json')
        assert response4.status_code == status.HTTP_400_BAD_REQUEST
        assert "Maximum limit of 2 built resumes reached." in response4.data['error']

    @override_settings(MAX_BUILT_RESUMES=2)
    def test_built_resume_limit_reclaimed_on_soft_delete(self):
        # Generate two resumes to hit the limit
        r1 = self.client.post('/api/v1/resumes/generate/', {'template_id': str(self.template.id)})
        r2 = self.client.post('/api/v1/resumes/generate/', {'template_id': str(self.template.id)})
        assert BuiltResume.objects.filter(student=self.student).count() == 2

        # Delete one resume
        resume_id_to_delete = r1.data['id']
        delete_resp = self.client.delete(f'/api/v1/resumes/{resume_id_to_delete}/')
        assert delete_resp.status_code == status.HTTP_204_NO_CONTENT
        assert BuiltResume.objects.filter(student=self.student).count() == 1

        # Now generating a new one should succeed
        r3 = self.client.post('/api/v1/resumes/generate/', {'template_id': str(self.template.id)})
        assert r3.status_code == status.HTTP_201_CREATED
        assert BuiltResume.objects.filter(student=self.student).count() == 2



