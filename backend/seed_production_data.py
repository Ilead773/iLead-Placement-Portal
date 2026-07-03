#!/usr/bin/env python
"""
Production-safe Database Seeding Script.
Seeds all 19 core iLEAD courses, 1 admin, 1 test student with complete profile data,
and the base AI Mock Interview question bank for all departments (Tech, Business, Media).
Does not wipe existing production tables.
"""
import os
import sys
import django

# Setup Django env
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import transaction
from core.models import User, Student, Course
from apps.profiles.models import StudentProfile, Skill, Project, Education, Experience
from apps.interviews.models import InterviewDomain, InterviewType, Competency, Question
from apps.templates_engine.seed_templates import seed_modern_template, seed_ilead_kolkata_template

COURSES_TO_SEED = [
    # Business & Management
    {"name": "BBA", "category": "Business & Management"},
    {"name": "BBA in Digital Marketing (BBA DM)", "category": "Business & Management"},
    {"name": "BBA in Travel & Tourism Management (BBA TTM)", "category": "Business & Management"},
    {"name": "BBA in Entrepreneurship (BBA ENT)", "category": "Business & Management"},
    {"name": "BBA in Sports Management (BBA SM)", "category": "Business & Management"},
    {"name": "BBA in Hospital Management (BBA HM)", "category": "Business & Management"},
    
    # Media & Creative
    {"name": "BSc in Media Science (BMS)", "category": "Media & Creative"},
    {"name": "MSc in Media Science", "category": "Media & Creative"},
    {"name": "BSc in Multimedia, Animation, Graphic Design (BMAGD)", "category": "Media & Creative"},
    {"name": "MSc in Multimedia, Animation, Graphic Design (MMAGD)", "category": "Media & Creative"},
    
    # Creative Production
    {"name": "BSc in Film and Television Production (FTP)", "category": "Creative Production"},
    {"name": "BSc in Interior Design", "category": "Creative Production"},
    {"name": "BSc in Sustainable Fashion Design & Management", "category": "Creative Production"},
    
    # Healthcare
    {"name": "Bachelor in Optometry", "category": "Healthcare"},
    {"name": "BSc in Critical Care Technology (CCT)", "category": "Healthcare"},
    {"name": "BSc in Medical Laboratory Technology (BMLT)", "category": "Healthcare"},
    
    # Technology
    {"name": "BSc in Data Science", "category": "Technology"},
    {"name": "BSc in Cyber Security", "category": "Technology"},
    {"name": "BSc in Computer Application (BCA)", "category": "Technology"},
]

def seed_production():
    print("Starting production database seeding...")
    
    with transaction.atomic():
        # 1. Seed Courses
        print("Seeding all 19 courses...")
        for c_data in COURSES_TO_SEED:
            course, created = Course.objects.get_or_create(
                name=c_data["name"],
                defaults={"category": c_data["category"]}
            )
            if created:
                print(f"  Created Course: {course.name}")

        # 2. Seed Admin User
        print("Seeding Admin User...")
        admin_user = User.objects.filter(login_id="admin").first()
        if not admin_user:
            admin_user = User.objects.create_superuser(
                login_id="admin",
                email="admin@ileadportal.com",
                password="Admin@123",
                name="System Administrator"
            )
            print("  Created Admin: admin / Admin@123")
        else:
            print("  Admin user already exists. Skipping.")

        # 3. Seed Student User
        print("Seeding Student User...")
        student_user = User.objects.filter(login_id="student").first()
        if not student_user:
            student_user = User.objects.create_user(
                login_id="student",
                email="student@ileadportal.com",
                password="Student@123",
                name="Demo Student",
                role="student",
                temp_password_flag=False,
                password_reset_required=False
            )
            print("  Created Student User: student / Student@123")
        else:
            print("  Student user already exists.")

        # 4. Seed Student Core Record
        student_rec = Student.objects.filter(user=student_user).first()
        if not student_rec:
            student_rec = Student.objects.create(
                user=student_user,
                name="Demo Student",
                registration_number="REG-2026-BCA01",
                email="student@ileadportal.com",
                passing_year=2026,
                course="BSc in Computer Application (BCA)",
                stream="Technology",
                semester=6,
                attendance=92.5,
                cgpa=8.85,
                phone_number="+919876543210",
                year=3,
                category="General",
                backlogs=0,
                backlogs_count=0,
                training_attendance=95.0
            )
            print("  Created Student database record.")
        else:
            print("  Student database record already exists.")

        # 5. Seed Student Career Profile details
        profile, created = StudentProfile.objects.get_or_create(
            student=student_rec,
            defaults={
                "phone": "+919876543210",
                "location": "Kolkata, India",
                "professional_summary": "Aspiring software developer with a strong foundation in Python, web architectures, and algorithms. Looking to build scalable solutions.",
                "linkedin": "linkedin.com/in/demostudent",
                "github": "github.com/demostudent",
                "portfolio": "demostudent.dev"
            }
        )
        if created:
            print("  Created Student Career Profile.")
            
            # Add Skills
            skills_data = [
                ("Programming Languages", "Python", "Advanced"),
                ("Programming Languages", "JavaScript", "Intermediate"),
                ("Web Technologies", "Django REST Framework", "Advanced"),
                ("Web Technologies", "React.js", "Intermediate"),
                ("Databases", "PostgreSQL", "Intermediate"),
            ]
            for cat, name, prof in skills_data:
                Skill.objects.create(profile=profile, category=cat, name=name, proficiency=prof)
            print("    Added default skills.")

            # Add Education
            Education.objects.create(
                profile=profile,
                institution="iLEAD Institute",
                degree="Bachelor of Science",
                field="Computer Applications",
                graduation_date="2026-06-30",
                gpa="8.85",
                honors="First Class with Distinction"
            )
            print("    Added default education.")

            # Add Project
            Project.objects.create(
                profile=profile,
                title="iLEAD Placement Portal",
                description="Contributed to building the automated college recruitment workflow engine, handling PDF resumes and AI interview logging.",
                technologies=["Python", "Django", "React", "PostgreSQL"],
                link="github.com/demostudent/ilead-portal",
                date="2026-03-01"
            )
            print("    Added default project.")

            # Add Experience
            Experience.objects.create(
                profile=profile,
                company="Tech Solutions India",
                position="Backend Engineering Intern",
                start_date="2025-06-01",
                end_date="2025-08-31",
                is_current=False,
                description="Designed and optimized REST endpoints using Django. Wrote unit tests and improved API response speeds.",
                achievements="Decreased database query latency by 15% through indexing."
            )
            print("    Added default work experience.")

        # 6. Seed AI Mock Interview domain & questions
        print("Seeding AI Mock Interview datasets...")
        
        # ─── Tech Domain ───
        tech_domain, _ = InterviewDomain.objects.get_or_create(
            name="Technology",
            defaults={"description": "Software development, data engineering, and system administration fields.", "icon": "💻"}
        )
        tech_type, _ = InterviewType.objects.get_or_create(
            domain=tech_domain,
            code="BCA_TECH",
            defaults={"name": "Software Engineering", "description": "Algorithms and databases.", "duration_minutes": 20, "questions_per_session": 3}
        )
        tech_comp, _ = Competency.objects.get_or_create(
            interview_type=tech_type,
            name="Python Programming",
            defaults={"description": "OOP, decorators and data structures.", "weight": 5.0}
        )
        Question.objects.get_or_create(
            text="What is the difference between list comprehension and generator expressions in Python?",
            defaults={
                "competency": tech_comp,
                "question_type": "technical",
                "difficulty_level": "medium",
                "ideal_answer": "List comprehension returns a list and loads all items into memory. Generators return an iterator and evaluate lazily.",
                "max_score": 10.0
            }
        )

        # ─── Business Domain ───
        biz_domain, _ = InterviewDomain.objects.get_or_create(
            name="Business",
            defaults={"description": "Business administration, marketing, sales, and management roles.", "icon": "💼"}
        )
        biz_type, _ = InterviewType.objects.get_or_create(
            domain=biz_domain,
            code="BBA_MGMT",
            defaults={"name": "General Management & Marketing", "description": "Principles of marketing, strategy, and operations.", "duration_minutes": 15, "questions_per_session": 2}
        )
        biz_comp, _ = Competency.objects.get_or_create(
            interview_type=biz_type,
            name="Marketing Strategy",
            defaults={"description": "4Ps of marketing and segmentation strategies.", "weight": 5.0}
        )
        Question.objects.get_or_create(
            text="Explain the 4 Ps of marketing and how a new business should apply them.",
            defaults={
                "competency": biz_comp,
                "question_type": "technical",
                "difficulty_level": "easy",
                "ideal_answer": "The 4 Ps are Product, Price, Place, and Promotion. A business applies them by aligning the product offering, pricing strategy, distribution channel, and advertising campaign to their target audience.",
                "max_score": 10.0
            }
        )

        # ─── Media Domain ───
        media_domain, _ = InterviewDomain.objects.get_or_create(
            name="Media & Creative",
            defaults={"description": "Journalism, public relations, graphic design, and media science.", "icon": "📺"}
        )
        media_type, _ = InterviewType.objects.get_or_create(
            domain=media_domain,
            code="MEDIA_SCI",
            defaults={"name": "Media Science & Communications", "description": "Public relations, digital media, and communication theory.", "duration_minutes": 15, "questions_per_session": 2}
        )
        media_comp, _ = Competency.objects.get_or_create(
            interview_type=media_type,
            name="Public Relations (PR)",
            defaults={"description": "Handling press releases and crisis communication.", "weight": 5.0}
        )
        Question.objects.get_or_create(
            text="What is a press release, and what are the essential elements required in a media kit?",
            defaults={
                "competency": media_comp,
                "question_type": "technical",
                "difficulty_level": "easy",
                "ideal_answer": "A press release is an official statement sent to the media. A media kit must include a company backgrounder, bios of key executives, press releases, high-resolution logos, and contact information.",
                "max_score": 10.0
            }
        )
        print("  AI Mock Interview questions seeded for all domains.")

        # 7. Seed Resume Templates
        print("Seeding premium PDF resume templates...")
        seed_modern_template()
        seed_ilead_kolkata_template()
        
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_production()
