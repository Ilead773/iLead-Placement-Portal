import pytest
from django.contrib.auth import get_user_model
from core.models import Student
from apps.resumes.models import BuiltResume
from apps.templates_engine.models import ResumeTemplate

User = get_user_model()

@pytest.mark.django_db
class TestResumeDownloadConcurrency:
    def test_increment_download_atomic(self):
        # Create student and template
        user = User.objects.create_user(
            login_id='test_student_download',
            email='download@test.com',
            password='Password123!',
            role='student',
            name='Test Student'
        )
        student = Student.objects.create(
            user=user,
            registration_number='REG_DOWNLOAD',
            name='Test Student',
            course='BCA'
        )
        template = ResumeTemplate.objects.create(
            name='Template A',
            is_active=True,
            html_template='<div>{{ personal.name }}</div>',
            css_styles='body { color: black; }'
        )
        
        resume = BuiltResume.objects.create(
            student=student,
            title='Test Resume',
            template=template,
            canonical_json={}
        )
        
        assert resume.downloaded_count == 0
        
        # Test increment_download method
        resume.increment_download()
        assert resume.downloaded_count == 1
        
        # Test the refresh from db
        db_resume = BuiltResume.objects.get(id=resume.id)
        assert db_resume.downloaded_count == 1
