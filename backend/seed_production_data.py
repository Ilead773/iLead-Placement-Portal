#!/usr/bin/env python
"""
Production-safe Database Seeding Script.
Seeds 9 core iLEAD courses, 1 admin, 1 test student with complete profile data,
and the base AI Mock Interview question bank.
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
    {"name": "BSc in Computer Application (BCA)", "category": "Technology"},
    {"name": "BSc in Data Science", "category": "Technology"},
    {"name": "BBA", "category": "Business & Management"},
    {"name": "BBA in Digital Marketing (BBA DM)", "category": "Business & Management"},
    {"name": "BBA in Hospital Management (BBA HM)", "category": "Business & Management"},
    {"name": "BSc in Media Science (BMS)", "category": "Media & Creative"},
    {"name": "BSc in Multimedia, Animation, Graphic Design (BMAGD)", "category": "Media & Creative"},
    {"name": "BSc in Film and Television Production (FTP)", "category": "Creative Production"},
    {"name": "BSc in Cyber Security", "category": "Technology"},
]

def seed_production():
    print("Starting production database seeding...")
    
    with transaction.atomic():
        # 1. Seed Courses
        print("Seeding 9 core courses...")
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
        domain, _ = InterviewDomain.objects.get_or_create(
            name="Technology",
            defaults={"description": "Software development, data engineering, and system administration fields.", "icon": "Code"}
        )
        
        int_type, _ = InterviewType.objects.get_or_create(
            domain=domain,
            code="BCA_TECH",
            defaults={
                "name": "Software Engineering & Databases",
                "description": "Evaluates algorithms, Python programming, and relational database system designs.",
                "duration_minutes": 20,
                "questions_per_session": 3
            }
        )

        comp1, _ = Competency.objects.get_or_create(
            interview_type=int_type,
            name="Python Programming",
            defaults={
                "description": "Measures OOP paradigms, data structures (lists, dicts), and decorators.",
                "weight": 5.0,
                "mastery_keywords": "inheritance, decorators, list comprehension, generators, dynamic typing"
            }
        )

        comp2, _ = Competency.objects.get_or_create(
            interview_type=int_type,
            name="Database Systems (SQL)",
            defaults={
                "description": "Measures normalization, joins, indexing, and transaction properties.",
                "weight": 5.0,
                "mastery_keywords": "ACID, indexing, inner join, outer join, normalization, primary key"
            }
        )

        # Create Questions
        q1_text = "What is the difference between list comprehension and generator expressions in Python, and when should you use each?"
        Question.objects.get_or_create(
            text=q1_text,
            defaults={
                "competency": comp1,
                "question_type": "technical",
                "difficulty_level": "medium",
                "ideal_answer": "List comprehension loads all items into memory immediately and returns a list. Generator expressions evaluate items lazily (one-by-one) and return an iterator. Use generator expressions for large data sets to conserve memory.",
                "evaluation_rubric": "Look for keywords: lazy evaluation, memory conservation, iterator, list object.",
                "max_score": 10.0
            }
        )

        q2_text = "Explain the difference between an INNER JOIN and a LEFT JOIN in SQL, and what is the purpose of database indexing?"
        Question.objects.get_or_create(
            text=q2_text,
            defaults={
                "competency": comp2,
                "question_type": "technical",
                "difficulty_level": "easy",
                "ideal_answer": "An INNER JOIN returns only records that have matching values in both tables. A LEFT JOIN returns all records from the left table and matching records from the right. Indexing is used to speed up SELECT query retrieval speeds by avoiding full table scans.",
                "evaluation_rubric": "Look for keywords: matching records, left table, speed up query, full table scan.",
                "max_score": 10.0
            }
        )
        print("  AI Mock Interview questions seeded.")

        # 7. Seed Resume Templates
        print("Seeding premium PDF resume templates...")
        seed_modern_template()
        seed_ilead_kolkata_template()
        
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_production()
