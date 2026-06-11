import pytest
from datetime import timedelta
from django.utils import timezone
from model_bakery import baker

from apps.applications.eligibility_engine import check_eligibility
from apps.jobs.models import Job
from apps.profiles.models import StudentProfile, Skill, Education, Experience, Project
from apps.resumes.models import BuiltResume
from core.models import Student


@pytest.mark.django_db
def test_profile_completion_is_calculated_from_live_profile_data(student_user):
    from datetime import date
    student = Student.objects.get(user=student_user)
    profile, _ = StudentProfile.objects.get_or_create(student=student)
    profile.completion_score = 0.0
    profile.professional_summary = "Experienced student developer building practical applications."
    profile.phone = "9999999999"
    profile.location = "Kolkata"
    profile.linkedin = "https://linkedin.com/in/student"
    profile.github = "https://github.com/student"
    profile.save()

    baker.make(Skill, profile=profile, name="Python", category="Technical")
    baker.make(Skill, profile=profile, name="Django", category="Technical")
    baker.make(Skill, profile=profile, name="SQL", category="Technical")
    baker.make(Education, profile=profile, institution="iLEAD", degree="BCA")
    baker.make(Experience, profile=profile, company="Google", position="Intern", start_date=date(2026, 1, 1), is_current=True)
    baker.make(Project, profile=profile, title="Portal", description="Placement portal", technologies=["Python"])
    baker.make(BuiltResume, student=student, is_primary=True, is_deleted=False)

    job = baker.make(
        Job,
        job_type='internal',
        category='C',
        status='active',
        application_deadline=timezone.now() + timedelta(days=30),
        eligibility_rules={},
    )

    eligibility = check_eligibility(student, job)

    assert eligibility['eligible'] is True
    assert 'profile_complete' in eligibility['passing_checks']
