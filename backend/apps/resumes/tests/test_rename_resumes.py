import pytest
from rest_framework import status
from django.contrib.auth import get_user_model
from core.models import Student
from apps.resumes.models import BuiltResume, ResumeUpload
from apps.templates_engine.models import ResumeTemplate
from rest_framework.test import APIClient

User = get_user_model()

@pytest.mark.django_db
class TestRenameResumes:
    @pytest.fixture(autouse=True)
    def setup_method(self):
        self.user = User.objects.create_user(
            login_id='test_student_rename',
            email='rename@test.com',
            password='Password123!',
            role='student',
            name='Test Student Rename'
        )
        self.student = Student.objects.create(
            user=self.user,
            registration_number='REG_RENAME',
            name='Test Student Rename',
            course='BCA'
        )
        self.template = ResumeTemplate.objects.create(
            name='Template B',
            is_active=True,
            html_template='<div>{{ personal.name }}</div>',
            css_styles='body { color: black; }'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_rename_built_resume_success(self):
        # Generate a resume
        url_gen = '/api/v1/resumes/generate/'
        res_gen = self.client.post(url_gen, {'template_id': str(self.template.id)})
        assert res_gen.status_code == status.HTTP_201_CREATED
        resume_id = res_gen.data['id']
        assert res_gen.data['title'] == "Resume - Test Student Rename"

        # Rename it
        url_detail = f'/api/v1/resumes/{resume_id}/'
        res_rename = self.client.patch(url_detail, {'title': 'My New Awesome Resume'})
        assert res_rename.status_code == status.HTTP_200_OK
        assert res_rename.data['title'] == 'My New Awesome Resume'

        # Verify database update
        resume = BuiltResume.objects.get(id=resume_id)
        assert resume.title == 'My New Awesome Resume'

    def test_rename_built_resume_duplicate_block(self):
        # Generate two resumes
        url_gen = '/api/v1/resumes/generate/'
        res1 = self.client.post(url_gen, {'template_id': str(self.template.id)})
        res2 = self.client.post(url_gen, {'template_id': str(self.template.id)})
        
        id1 = res1.data['id']
        id2 = res2.data['id']
        title2 = res2.data['title'] # Resume - Test Student Rename (1)

        # Attempt to rename first resume to the title of second resume
        url_detail1 = f'/api/v1/resumes/{id1}/'
        res_rename = self.client.patch(url_detail1, {'title': title2})
        assert res_rename.status_code == status.HTTP_400_BAD_REQUEST
        assert 'title' in res_rename.data


