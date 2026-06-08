import pytest
from rest_framework import status
from django.contrib.auth import get_user_model
from core.models import Student
from apps.resumes.models import BuiltResume
from apps.templates_engine.models import ResumeTemplate
from rest_framework.test import APIClient

User = get_user_model()

@pytest.mark.django_db
class TestUniqueResumes:
    def test_generate_resume_duplicate_titles_active_and_deleted(self):
        # Create student and template
        user = User.objects.create_user(
            login_id='test_student_unique',
            email='unique@test.com',
            password='Password123!',
            role='student',
            name='Test Student Unique'
        )
        student = Student.objects.create(
            user=user,
            registration_number='REG_UNIQUE',
            name='Test Student Unique',
            course='BCA'
        )
        template = ResumeTemplate.objects.create(
            name='Template A',
            is_active=True,
            html_template='<div>{{ personal.name }}</div>',
            css_styles='body { color: black; }'
        )
        
        # Create client and auth
        client = APIClient()
        client.force_authenticate(user=user)
        
        # 1. Generate first resume
        url = '/api/v1/resumes/generate/'
        response = client.post(url, {'template_id': str(template.id)})
        assert response.status_code == status.HTTP_201_CREATED
        first_title = response.data['title']
        assert first_title == "Resume - Test Student Unique"
        
        # 2. Soft delete the first resume
        resume_id = response.data['id']
        delete_url = f'/api/v1/resumes/{resume_id}/'
        del_resp = client.delete(delete_url)
        assert del_resp.status_code == status.HTTP_204_NO_CONTENT
        
        # Confirm it's soft-deleted
        assert not BuiltResume.objects.filter(id=resume_id).exists()
        assert BuiltResume.all_objects.filter(id=resume_id).exists()
        
        # 3. Generate second resume with same one-click generation
        # It should see the soft-deleted one with same base title and append suffix " (1)"
        response2 = client.post(url, {'template_id': str(template.id)})
        assert response2.status_code == status.HTTP_201_CREATED
        second_title = response2.data['title']
        assert second_title == "Resume - Test Student Unique (1)"
        
        # 4. Generate third resume with same one-click generation
        # It should see both soft-deleted and active ones, and append suffix " (2)"
        response3 = client.post(url, {'template_id': str(template.id)})
        assert response3.status_code == status.HTTP_201_CREATED
        third_title = response3.data['title']
        assert third_title == "Resume - Test Student Unique (2)"
        
        # 5. Test manual creation duplicate title block
        url_create = '/api/v1/resumes/'
        payload = {
            'title': 'Resume - Test Student Unique (2)',
            'template_id': str(template.id),
            'canonical_json': {}
        }
        response_create = client.post(url_create, payload, format='json')
        assert response_create.status_code == status.HTTP_400_BAD_REQUEST
        assert 'title' in response_create.data
