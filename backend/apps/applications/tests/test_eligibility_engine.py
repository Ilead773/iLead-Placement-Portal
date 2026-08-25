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
    profile.portfolio = "https://studentportfolio.com"
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


@pytest.mark.django_db
def test_semester_eligibility_rules(student_user):
    from datetime import date
    student = Student.objects.get(user=student_user)
    student.semester = 6
    student.save()

    profile, _ = StudentProfile.objects.get_or_create(student=student)
    profile.completion_score = 0.0
    profile.professional_summary = "Experienced student developer building practical applications."
    profile.phone = "9999999999"
    profile.location = "Kolkata"
    profile.linkedin = "https://linkedin.com/in/student"
    profile.github = "https://github.com/student"
    profile.portfolio = "https://studentportfolio.com"
    profile.save()
    
    baker.make(Skill, profile=profile, name="Python", category="Technical")
    baker.make(Skill, profile=profile, name="Django", category="Technical")
    baker.make(Skill, profile=profile, name="SQL", category="Technical")
    baker.make(Education, profile=profile, institution="iLEAD", degree="BCA")
    baker.make(Experience, profile=profile, company="Google", position="Intern", start_date=date(2026, 1, 1), is_current=True)
    baker.make(Project, profile=profile, title="Portal", description="Placement portal", technologies=["Python"])
    baker.make(BuiltResume, student=student, is_primary=True, is_deleted=False)

    # Job targeting semester 6 and 8
    job = baker.make(
        Job,
        job_type='internal',
        category='C',
        status='active',
        application_deadline=timezone.now() + timedelta(days=30),
        eligibility_rules={'allowed_semesters': [6, 8]},
    )

    eligibility = check_eligibility(student, job)
    assert eligibility['eligible'] is True
    assert 'semester' in eligibility['passing_checks']

    # Job targeting semester 4
    job_ineligible = baker.make(
        Job,
        job_type='internal',
        category='C',
        status='active',
        application_deadline=timezone.now() + timedelta(days=30),
        eligibility_rules={'allowed_semesters': [4]},
    )

    eligibility_ineligible = check_eligibility(student, job_ineligible)
    assert eligibility_ineligible['eligible'] is False
    assert any(x['check_name'] == 'semester' for x in eligibility_ineligible['failing_checks'])


@pytest.mark.django_db
def test_adding_skills_updates_eligibility(student_user):
    from datetime import date
    student = Student.objects.get(user=student_user)
    profile, _ = StudentProfile.objects.get_or_create(student=student)
    profile.professional_summary = "Experienced student developer building practical applications."
    profile.phone = "9999999999"
    profile.location = "Kolkata"
    profile.linkedin = "https://linkedin.com/in/student"
    profile.github = "https://github.com/student"
    profile.portfolio = "https://studentportfolio.com"
    profile.save()

    baker.make(Education, profile=profile, institution="iLEAD", degree="BCA")
    baker.make(Experience, profile=profile, company="Google", position="Intern", start_date=date(2026, 1, 1), is_current=True)
    baker.make(Project, profile=profile, title="Portal", description="Placement portal", technologies=["Python"])
    baker.make(BuiltResume, student=student, is_primary=True, is_deleted=False)

    # Initially only 2 skills added (less than minimum 3)
    baker.make(Skill, profile=profile, name="Python", category="Technical")
    baker.make(Skill, profile=profile, name="Django", category="Technical")

    job = baker.make(
        Job,
        job_type='internal',
        category='C',
        status='active',
        application_deadline=timezone.now() + timedelta(days=30),
        eligibility_rules={},
    )

    # Check eligibility when student has 2 skills
    eligibility = check_eligibility(student, job)
    assert eligibility['eligible'] is False
    assert any("Minimum 3 skill(s) required" in x.get('reason', '') for x in eligibility['failing_checks'])

    # Student adds 3rd skill
    baker.make(Skill, profile=profile, name="SQL", category="Technical")
    student.refresh_from_db()

    # Eligibility check should now pass
    eligibility_after = check_eligibility(student, job)
    assert eligibility_after['eligible'] is True
    assert 'profile_complete' in eligibility_after['passing_checks']


