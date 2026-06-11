#!/usr/bin/env python
"""
Seed comprehensive mock data for the iLEAD Placement Portal.

Usage:
  python manage.py shell < seed_full_mock_data.py
  OR
  python seed_full_mock_data.py
"""

import os
from datetime import date, datetime, timedelta, timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from core.models import (
    User,
    Student,
    Placement,
    PlacementAssignment,
    ExternalClickLog,
    LearningAssignment,
    LearningQuestion,
    StudentLearningAssignment,
)
from apps.jobs.models import Job, JobRound
from apps.applications.models import (
    Application,
    ApplicationRound,
    ApplicationStatusHistory,
    Notification,
)
from apps.profiles.models import (
    StudentProfile,
    Skill,
    Project,
    Education,
    Certification,
    Achievement,
)
from apps.templates_engine.models import ResumeTemplate
from apps.resumes.models import BuiltResume
from apps.interviews.models import (
    InterviewDomain,
    InterviewType,
    Competency,
    Question,
    MockInterviewSession,
    InterviewAnswer,
    InterviewFeedback,
)


def _create_users_and_students():
    admin, _ = User.objects.get_or_create(
        login_id="admin",
        defaults={
            "email": "admin@ilead.edu",
            "name": "System Admin",
            "role": "admin",
            "is_staff": True,
            "is_superuser": True,
            "temp_password_flag": False,
            "password_reset_required": False,
        },
    )
    admin.set_password("Admin@1234")
    admin.save()

    coord, _ = User.objects.get_or_create(
        login_id="coord01",
        defaults={
            "email": "coord01@ilead.edu",
            "name": "Placement Coordinator",
            "role": "coordinator",
            "can_manage_students": True,
            "can_manage_placements": True,
            "can_manage_resumes": True,
            "can_manage_assignments": True,
            "can_send_notifications": True,
            "can_view_scraping": True,
            "can_view_clicks": True,
            "temp_password_flag": False,
            "password_reset_required": False,
        },
    )
    coord.set_password("Coord@1234")
    coord.save()

    student_user, _ = User.objects.get_or_create(
        login_id="stu001",
        defaults={
            "email": "stu001@ilead.edu",
            "name": "Rahul Sharma",
            "role": "student",
            "temp_password_flag": False,
            "password_reset_required": False,
        },
    )
    student_user.set_password("Student@1234")
    student_user.save()

    student, _ = Student.objects.get_or_create(
        registration_number="ILEAD2026STU001",
        defaults={
            "user": student_user,
            "name": "Rahul Sharma",
            "email": "stu001@ilead.edu",
            "passing_year": 2026,
            "course": "BCA",
            "stream": "Computer Applications",
            "semester": 6,
            "attendance": 88.0,
            "cgpa": 8.4,
            "phone_number": "9876543210",
            "year": "3rd",
            "backlogs": False,
            "backlogs_count": 0,
            "training_attendance": 100.0,
        },
    )
    if student.user_id != student_user.id:
        student.user = student_user
        student.save(update_fields=["user"])

    return admin, coord, student


def _create_profile_data(student):
    profile, _ = StudentProfile.objects.get_or_create(
        student=student,
        defaults={
            "phone": "9876543210",
            "location": "Kolkata, India",
            "professional_summary": (
                "Detail-oriented BCA student with strong fundamentals in "
                "Python, Django, and React. Passionate about building "
                "real-world web applications."
            ),
            "linkedin": "https://linkedin.com/in/stu001",
            "github": "https://github.com/stu001",
            "portfolio": "https://stu001.dev",
        },
    )

    Skill.objects.get_or_create(profile=profile, category="Technical", name="Python")
    Skill.objects.get_or_create(profile=profile, category="Technical", name="Django")
    Skill.objects.get_or_create(profile=profile, category="Technical", name="React")

    Project.objects.get_or_create(
        profile=profile,
        title="Placement Portal",
        defaults={
            "description": "Role-based placement portal for students and admins.",
            "technologies": ["Django", "React", "PostgreSQL"],
            "link": "https://github.com/shahithkumar/iLEAD-Placment_portal",
            "date": date(2026, 5, 1),
        },
    )

    Education.objects.get_or_create(
        profile=profile,
        institution="iLEAD",
        degree="Bachelor of Computer Applications",
        defaults={
            "field": "Computer Applications",
            "graduation_date": date(2026, 6, 30),
            "gpa": 8.4,
        },
    )

    Certification.objects.get_or_create(
        profile=profile,
        name="Python for Everybody",
        issuer="Coursera",
        defaults={"date": date(2025, 8, 15)},
    )

    Achievement.objects.get_or_create(
        profile=profile,
        title="Top 10 in Internal Hackathon",
        defaults={"issuer": "iLEAD", "date": date(2025, 11, 20)},
    )

    profile.recalculate_completion()
    return profile


def _create_templates_and_resume(admin, student):
    template, _ = ResumeTemplate.objects.get_or_create(
        name="Classic Professional",
        version=1,
        defaults={
            "description": "Simple ATS-friendly template.",
            "html_template": (
                "<html><body><h1>{{ name }}</h1><p>{{ professional_summary }}</p></body></html>"
            ),
            "css_styles": "body{font-family:Arial,sans-serif;} h1{font-size:22px;}",
            "is_active": True,
            "created_by": admin,
        },
    )

    canonical_json = {
        "name": student.name,
        "email": student.email,
        "phone": "9876543210",
        "professional_summary": "Aspiring software engineer focused on backend development.",
        "skills": ["Python", "Django", "React"],
        "projects": [
            {
                "title": "Placement Portal",
                "description": "Built end-to-end placement workflow portal.",
            }
        ],
    }

    built_resume, _ = BuiltResume.objects.get_or_create(
        student=student,
        title="Primary Resume",
        defaults={
            "description": "Default mock resume",
            "canonical_json": canonical_json,
            "template": template,
            "state": "active",
            "is_primary": True,
        },
    )
    if not built_resume.is_primary:
        built_resume.set_as_primary()


def _create_jobs_and_applications(admin, student):
    deadline = datetime.now(timezone.utc) + timedelta(days=20)
    job, _ = Job.objects.get_or_create(
        company_name="Acme Tech",
        role="Junior Software Engineer",
        defaults={
            "description": "Backend/API developer role.",
            "package": 6.50,
            "location": "Kolkata",
            "job_type": "internal",
            "listing_type": "job",
            "category": "A",
            "openings_count": 3,
            "hr_email": "hr@acmetech.com",
            "eligibility_rules": {
                "min_cgpa": 7.0,
                "allowed_branches": ["BCA", "MCA"],
                "required_skills": ["Python", "Django"],
                "allowed_years": [2026],
                "no_backlog": True,
            },
            "application_deadline": deadline,
            "status": "active",
            "created_by": admin,
        },
    )

    round1, _ = JobRound.objects.get_or_create(
        job=job,
        round_number=1,
        defaults={
            "round_name": "Aptitude Test",
            "round_type": "test",
            "is_elimination": True,
            "passing_score": 60,
        },
    )
    round2, _ = JobRound.objects.get_or_create(
        job=job,
        round_number=2,
        defaults={
            "round_name": "Technical Interview",
            "round_type": "interview",
            "is_elimination": True,
        },
    )

    app, created = Application.objects.get_or_create(
        student=student,
        job=job,
        defaults={
            "status": "shortlisted",
            "eligibility_snapshot": {"eligible": True},
            "job_snapshot": {"company_name": job.company_name, "role": job.role},
        },
    )

    ApplicationRound.objects.get_or_create(
        application=app,
        job_round=round1,
        defaults={"round_number": 1, "status": "cleared", "score": 78},
    )
    ApplicationRound.objects.get_or_create(
        application=app,
        job_round=round2,
        defaults={"round_number": 2, "status": "scheduled"},
    )

    if created:
        ApplicationStatusHistory.objects.create(
            application=app,
            old_status="applied",
            new_status="shortlisted",
            changed_by=admin,
            notes="Mock shortlist update",
        )

    Notification.objects.get_or_create(
        user=student.user,
        title="Application Shortlisted",
        defaults={
            "notification_type": "APPLICATION_UPDATE",
            "message": f"You are shortlisted for {job.company_name} - {job.role}.",
            "priority": "high",
            "action_url": f"/student/applications/{app.id}",
        },
    )


def _create_placement_data(admin, student):
    placement, _ = Placement.objects.get_or_create(
        company_name="Globex Corp",
        position="Graduate Trainee",
        defaults={
            "salary": 4.20,
            "description": "Campus hiring drive for fresh graduates.",
            "required_cgpa": 6.5,
            "eligible_courses": "BCA,MCA",
            "eligible_semesters": "6",
            "application_deadline": datetime.now(timezone.utc) + timedelta(days=10),
            "created_by": admin,
        },
    )

    PlacementAssignment.objects.get_or_create(
        placement=placement,
        student=student,
        defaults={"assigned_by": admin, "status": "assigned"},
    )

    ExternalClickLog.objects.get_or_create(
        user=student.user,
        external_url="https://careers.example.com/job/123",
        defaults={"job_title": "Graduate Trainee", "company_name": "Globex Corp"},
    )


def _create_interview_data(student):
    domain, _ = InterviewDomain.objects.get_or_create(
        name="Software Engineering",
        defaults={"description": "SE-focused mock interviews", "icon": "💻"},
    )

    i_type, _ = InterviewType.objects.get_or_create(
        code="SE_BACKEND",
        defaults={
            "domain": domain,
            "name": "Backend Interview",
            "description": "Django/API/backend fundamentals",
            "duration_minutes": 30,
            "questions_per_session": 3,
        },
    )
    if i_type.domain_id != domain.id:
        i_type.domain = domain
        i_type.save(update_fields=["domain"])

    comp, _ = Competency.objects.get_or_create(
        interview_type=i_type,
        name="API Design",
        defaults={
            "description": "Designing robust REST APIs",
            "weight": 1.0,
            "mastery_keywords": ["idempotency", "pagination", "authentication"],
        },
    )

    q, _ = Question.objects.get_or_create(
        competency=comp,
        text="How would you design a paginated and secure list API in Django REST Framework?",
        defaults={
            "question_type": "interview",
            "difficulty_level": "intermediate",
            "ideal_answer": "Discuss token auth, permissions, pagination classes, filtering, and validation.",
            "evaluation_rubric": {
                "technical_accuracy": {"weight": 40, "criteria": ["Correct DRF primitives"]},
                "depth": {"weight": 30, "criteria": ["Trade-offs and scaling"]},
                "communication": {"weight": 30, "criteria": ["Clear structure"]},
            },
            "max_score": 100,
        },
    )

    session = MockInterviewSession.objects.filter(student=student, interview_type=i_type).first()
    if not session:
        session = MockInterviewSession.objects.create(
            student=student,
            interview_type=i_type,
            status="completed",
            started_at=datetime.now(timezone.utc) - timedelta(minutes=20),
            completed_at=datetime.now(timezone.utc) - timedelta(minutes=5),
            questions=[{"id": str(q.id), "text": q.text, "difficulty": "intermediate"}],
            use_voice=False,
        )

    answer = InterviewAnswer.objects.filter(session=session, question=q).first()
    if not answer:
        answer = InterviewAnswer.objects.create(
            session=session,
            question=q,
            question_number=1,
            answer_text="I would use DRF pagination, JWT auth, permission classes, and query optimization.",
            eval_status="evaluated",
            score=82,
            evaluation_json={"overall_score": 82},
            ai_feedback="Strong structure and practical approach.",
            confidence_score=0.88,
            time_taken_seconds=95,
        )

    feedback = InterviewFeedback.objects.filter(session=session).first()
    if not feedback:
        InterviewFeedback.objects.create(
            session=session,
            total_score=answer.score or 80,
            competency_scores={"API Design": 82},
            dimension_averages={"technical_accuracy": {"avg": 8.2, "max": 10}},
            strengths=["Clear API design fundamentals"],
            weaknesses=["Could include caching details"],
            feedback_summary="Good fundamentals with room for production-level depth.",
        )


def _create_learning_assignments(admin):
    courses = list(Student.objects.exclude(course='').values_list('course', flat=True).distinct())
    if not courses:
        courses = ["BCA", "BBA"]
    
    for course in courses:
        clean_course = course.strip()
        title = f"{clean_course} MCQ Assessment"
        assignment, _ = LearningAssignment.objects.get_or_create(
            course=clean_course,
            title=title,
            defaults={
                "description": f"Evaluate your competency in core topics and professional placement preparation for {clean_course}.",
                "duration_minutes": 25,
                "created_by": admin,
            }
        )
        
        questions_data = [
            {
                "prompt": f"Which of the following is a vital skill or domain of expertise in {clean_course}?",
                "options": ["Aptitude & Analytical Logic", "Core domain expertise", "Professional Communication", "All of the above"],
                "correct_option": 3,
                "points": 5,
            },
            {
                "prompt": "If a trainer conducts classes on Monday, Wednesday, and Friday, and another conducts on Tuesday and Thursday, how many combined sessions are held in 4 weeks?",
                "options": ["12 sessions", "16 sessions", "20 sessions", "24 sessions"],
                "correct_option": 2,
                "points": 5,
            },
            {
                "prompt": "What is the primary role of self-evaluations and mock interviews?",
                "options": ["To check theoretical memory", "To identify skill gaps and build interview confidence", "To get a high score only", "None of the above"],
                "correct_option": 1,
                "points": 5,
            }
        ]
        
        total_points = 0
        for idx, q_data in enumerate(questions_data):
            q, _ = LearningQuestion.objects.get_or_create(
                assignment=assignment,
                order=idx,
                defaults={
                    "prompt": q_data["prompt"],
                    "options": q_data["options"],
                    "correct_option": q_data["correct_option"],
                    "points": q_data["points"],
                }
            )
            total_points += q.points
            
        students = Student.objects.filter(course=clean_course)
        for student in students:
            StudentLearningAssignment.objects.get_or_create(
                assignment=assignment,
                student=student,
                defaults={
                    "assigned_by": admin,
                    "due_at": datetime.now(timezone.utc) + timedelta(days=14),
                    "total_points": total_points,
                    "status": "assigned",
                }
            )


def seed():
    admin, _coord, student = _create_users_and_students()
    _create_profile_data(student)
    _create_templates_and_resume(admin, student)
    _create_jobs_and_applications(admin, student)
    _create_placement_data(admin, student)
    _create_interview_data(student)
    _create_learning_assignments(admin)

    print("\n=== MOCK DATA SEEDED SUCCESSFULLY ===")
    print("Admin Login:")
    print("  login_id: admin")
    print("  password: Admin@1234")
    print("Student Login:")
    print("  login_id: stu001")
    print("  password: Student@1234")
    print("====================================\n")


if __name__ == "__main__":
    seed()
