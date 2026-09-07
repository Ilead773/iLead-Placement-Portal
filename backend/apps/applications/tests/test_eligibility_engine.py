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
def test_active_resume_gate(student_user):
    student = Student.objects.get(user=student_user)
    profile, _ = StudentProfile.objects.get_or_create(student=student)
    profile.save()

    job = baker.make(
        Job,
        job_type='internal',
        category='C',
        status='active',
        application_deadline=timezone.now() + timedelta(days=30),
        eligibility_rules={},
    )

    # Without active resume -> ineligible
    eligibility_no_resume = check_eligibility(student, job)
    assert eligibility_no_resume['eligible'] is False
    assert any(x['check_name'] == 'active_resume' for x in eligibility_no_resume['failing_checks'])

    # With active resume -> eligible
    baker.make(BuiltResume, student=student, is_primary=True, is_deleted=False)
    student._has_primary_built = None
    
    eligibility_with_resume = check_eligibility(student, job)
    assert eligibility_with_resume['eligible'] is True
    assert 'active_resume' in eligibility_with_resume['passing_checks']


@pytest.mark.django_db
def test_job_required_skills_matching(student_user):
    student = Student.objects.get(user=student_user)
    profile, _ = StudentProfile.objects.get_or_create(student=student)
    baker.make(BuiltResume, student=student, is_primary=True, is_deleted=False)

    # Job requires Python & Django
    job = baker.make(
        Job,
        job_type='internal',
        category='C',
        status='active',
        application_deadline=timezone.now() + timedelta(days=30),
        eligibility_rules={'required_skills': ['Python', 'Django']},
    )

    # Student has only Python
    baker.make(Skill, profile=profile, name="Python", category="Technical")
    eligibility_missing = check_eligibility(student, job)
    assert eligibility_missing['eligible'] is False
    assert any(x['check_name'] == 'skills' for x in eligibility_missing['failing_checks'])

    # Student adds Django
    baker.make(Skill, profile=profile, name="Django", category="Technical")
    student._skills_list = None
    eligibility_matched = check_eligibility(student, job)
    assert eligibility_matched['eligible'] is True
    assert 'skills' in eligibility_matched['passing_checks']


@pytest.mark.django_db
def test_6th_sem_exit_student_with_backlogs_restricted_from_jobs(student_user):
    student = Student.objects.get(user=student_user)
    StudentProfile.objects.get_or_create(student=student)
    baker.make(BuiltResume, student=student, is_primary=True, is_deleted=False)

    student.status = 'exited_3yr'
    student.backlogs = True
    student.backlogs_count = 1
    student.save()

    # Job listing (listing_type='job')
    job = baker.make(
        Job,
        listing_type='job',
        job_type='internal',
        category='C',
        status='active',
        application_deadline=timezone.now() + timedelta(days=30),
        eligibility_rules={},
    )

    eligibility = check_eligibility(student, job)
    assert eligibility['eligible'] is False
    assert any(x['check_name'] == 'exit_student_backlogs' for x in eligibility['failing_checks'])


@pytest.mark.django_db
def test_6th_sem_exit_student_with_backlogs_allowed_for_internships(student_user):
    student = Student.objects.get(user=student_user)
    StudentProfile.objects.get_or_create(student=student)
    baker.make(BuiltResume, student=student, is_primary=True, is_deleted=False)

    student.status = 'exited_3yr'
    student.backlogs = True
    student.backlogs_count = 1
    student.save()

    # Internship listing (listing_type='internship')
    internship = baker.make(
        Job,
        listing_type='internship',
        job_type='internal',
        category='C',
        status='active',
        application_deadline=timezone.now() + timedelta(days=30),
        eligibility_rules={},
    )

    eligibility = check_eligibility(student, internship)
    assert eligibility['eligible'] is True
    assert 'exit_student_backlogs' in eligibility['passing_checks']


@pytest.mark.django_db
def test_6th_sem_exit_student_without_backlogs_allowed_for_jobs(student_user):
    student = Student.objects.get(user=student_user)
    StudentProfile.objects.get_or_create(student=student)
    baker.make(BuiltResume, student=student, is_primary=True, is_deleted=False)

    student.status = 'exited_3yr'
    student.backlogs = False
    student.backlogs_count = 0
    student.save()

    job = baker.make(
        Job,
        listing_type='job',
        job_type='internal',
        category='C',
        status='active',
        application_deadline=timezone.now() + timedelta(days=30),
        eligibility_rules={},
    )

    eligibility = check_eligibility(student, job)
    assert eligibility['eligible'] is True
    assert 'exit_student_backlogs' in eligibility['passing_checks']


@pytest.mark.django_db
def test_active_student_with_backlogs_not_restricted_by_exit_rule(student_user):
    student = Student.objects.get(user=student_user)
    StudentProfile.objects.get_or_create(student=student)
    baker.make(BuiltResume, student=student, is_primary=True, is_deleted=False)

    student.status = 'active'
    student.backlogs = True
    student.backlogs_count = 1
    student.save()

    job = baker.make(
        Job,
        listing_type='job',
        job_type='internal',
        category='C',
        status='active',
        application_deadline=timezone.now() + timedelta(days=30),
        eligibility_rules={},
    )

    eligibility = check_eligibility(student, job)
    assert eligibility['eligible'] is True
    assert 'exit_student_backlogs' in eligibility['passing_checks']




