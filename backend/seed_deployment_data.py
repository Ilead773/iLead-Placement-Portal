#!/usr/bin/env python
"""
Self-contained database seeding script for Railway deployment.
Seeds all 18+ users, 13+ student profiles, jobs, placements, applications,
and mock interview datasets.
"""
import os
import sys
import django
import json
from datetime import datetime
from django.utils import timezone

# Setup Django env
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import transaction
from core.models import User, Student, Placement, PlacementAssignment
from apps.jobs.models import Job, JobRound
from apps.applications.models import Application, ApplicationRound, ApplicationStatusHistory
from apps.profiles.models import StudentProfile, Skill, Project, Education, Certification, Achievement, Experience
from apps.templates_engine.models import ResumeTemplate
from apps.resumes.models import BuiltResume
from apps.interviews.models import (
    InterviewDomain, InterviewType, Competency, Question,
    MockInterviewSession, InterviewAnswer, InterviewFeedback
)

# JSON DATA REPRESENTATION
USERS = json.loads(r'''[
    {
        "id": "067b435c-86f7-4c23-958b-5036ba12c603",
        "login_id": "stu1044",
        "email": "22331a0761@mvgrce.edu.in",
        "name": "JHONNY",
        "role": "student",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": false,
        "password_reset_required": false,
        "can_manage_students": false,
        "can_manage_placements": false,
        "can_manage_resumes": false,
        "password": "Student@STU1044"
    },
    {
        "id": "f3b86872-cab6-4fcf-b5bb-f602c835c212",
        "login_id": "stu105",
        "email": "janee.smith@student.ilead.edu",
        "name": "Smithy",
        "role": "student",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": true,
        "password_reset_required": true,
        "can_manage_students": false,
        "can_manage_placements": false,
        "can_manage_resumes": false,
        "password": "Student@STU105"
    },
    {
        "id": "4bce7208-a881-48ca-bf38-8f3b05c9dc2b",
        "login_id": "stu104",
        "email": "viiv4426@gmail.com",
        "name": "John",
        "role": "student",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": false,
        "password_reset_required": false,
        "can_manage_students": false,
        "can_manage_placements": false,
        "can_manage_resumes": false,
        "password": "Student@STU104"
    },
    {
        "id": "706921ed-b80a-4c44-9273-d809e3df91aa",
        "login_id": "stu102",
        "email": "jane.smith@student.ilead.edu",
        "name": "Jane Smith",
        "role": "student",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": true,
        "password_reset_required": true,
        "can_manage_students": false,
        "can_manage_placements": false,
        "can_manage_resumes": false,
        "password": "Student@STU102"
    },
    {
        "id": "5317a211-241c-4eba-985a-346c6f48dd1f",
        "login_id": "stu101",
        "email": "john.doe@student.ilead.edu",
        "name": "John Doe",
        "role": "student",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": false,
        "password_reset_required": false,
        "can_manage_students": false,
        "can_manage_placements": false,
        "can_manage_resumes": false,
        "password": "Student@STU101"
    },
    {
        "id": "f15e7a90-484b-4e98-aece-f02411373ccd",
        "login_id": "stu001",
        "email": "stu001@ilead.edu",
        "name": "Rahul Sharma",
        "role": "student",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": false,
        "password_reset_required": false,
        "can_manage_students": false,
        "can_manage_placements": false,
        "can_manage_resumes": false,
        "password": "Student@STU001"
    },
    {
        "id": "9eb75a24-415e-4a2a-90e2-da962b860189",
        "login_id": "coord01",
        "email": "coord01@ilead.edu",
        "name": "Placement Coordinator",
        "role": "coordinator",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": false,
        "password_reset_required": false,
        "can_manage_students": true,
        "can_manage_placements": true,
        "can_manage_resumes": true,
        "password": "Coord@1234"
    },
    {
        "id": "35ad44ab-0d8a-4fdd-b4df-f5fdceb66a77",
        "login_id": "demo001",
        "email": "demo.student@ilead.edu",
        "name": "Demo Student",
        "role": "student",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": false,
        "password_reset_required": false,
        "can_manage_students": false,
        "can_manage_placements": false,
        "can_manage_resumes": false,
        "password": "Student@DEMO001"
    },
    {
        "id": "b8d2d915-4ace-4e3a-ae1e-e7b1461afb66",
        "login_id": "stu016",
        "email": "simran.kaur@student.ilead.edu",
        "name": "Simran Kaur",
        "role": "student",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": true,
        "password_reset_required": true,
        "can_manage_students": false,
        "can_manage_placements": false,
        "can_manage_resumes": false,
        "password": "Student@STU016"
    },
    {
        "id": "7cc681f1-8fd0-421a-bb8e-fcb177d19185",
        "login_id": "stu015",
        "email": "rohan.joshi@student.ilead.edu",
        "name": "Rohan Joshi",
        "role": "student",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": true,
        "password_reset_required": true,
        "can_manage_students": false,
        "can_manage_placements": false,
        "can_manage_resumes": false,
        "password": "Student@STU015"
    },
    {
        "id": "62f4d84d-6b09-42f3-9f78-14813048d64d",
        "login_id": "stu014",
        "email": "meera.nair@student.ilead.edu",
        "name": "Meera Nair",
        "role": "student",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": true,
        "password_reset_required": true,
        "can_manage_students": false,
        "can_manage_placements": false,
        "can_manage_resumes": false,
        "password": "Student@STU014"
    },
    {
        "id": "09636159-12d9-4641-bef4-4ae8724aa8f3",
        "login_id": "stu013",
        "email": "vikram.malhotra@student.ilead.edu",
        "name": "Vikram Malhotra",
        "role": "student",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": true,
        "password_reset_required": true,
        "can_manage_students": false,
        "can_manage_placements": false,
        "can_manage_resumes": false,
        "password": "Student@STU013"
    },
    {
        "id": "cebe4317-c540-4242-a1a6-610b05921cc1",
        "login_id": "stu012",
        "email": "aditi.rao@student.ilead.edu",
        "name": "Aditi Rao",
        "role": "student",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": true,
        "password_reset_required": true,
        "can_manage_students": false,
        "can_manage_placements": false,
        "can_manage_resumes": false,
        "password": "Student@STU012"
    },
    {
        "id": "f3037bd8-460c-4794-92ca-1da19f4a37a5",
        "login_id": "stu011",
        "email": "rahul.sen@student.ilead.edu",
        "name": "Rahul Sen",
        "role": "student",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": true,
        "password_reset_required": true,
        "can_manage_students": false,
        "can_manage_placements": false,
        "can_manage_resumes": false,
        "password": "Student@STU011"
    },
    {
        "id": "9d5499ed-65da-4f9f-9821-90976b2781e1",
        "login_id": "manu",
        "email": "22331A0761@mvgrce.edu.in",
        "name": "manu",
        "role": "coordinator",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": false,
        "password_reset_required": false,
        "can_manage_students": true,
        "can_manage_placements": true,
        "can_manage_resumes": false,
        "password": "Coord@1234"
    },
    {
        "id": "1a7c02d1-ed26-4137-a81c-1ec0dd3fa13c",
        "login_id": "martin",
        "email": "2233a0761@mvgrce.edu.in",
        "name": "v",
        "role": "coordinator",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": true,
        "password_reset_required": true,
        "can_manage_students": true,
        "can_manage_placements": false,
        "can_manage_resumes": false,
        "password": "Coord@1234"
    },
    {
        "id": "5e24d87c-9c3d-4ae3-bad3-b45a1f5cb4b0",
        "login_id": "shahithu2004@gmail.com",
        "email": "shahithu2004@gmail.com",
        "name": "SHA",
        "role": "coordinator",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": false,
        "password_reset_required": false,
        "can_manage_students": false,
        "can_manage_placements": false,
        "can_manage_resumes": false,
        "password": "Coord@1234"
    },
    {
        "id": "9477ac56-0fe4-423f-aa70-e080d58c6e84",
        "login_id": "admin",
        "email": "admin@example.com",
        "name": "System Admin",
        "role": "admin",
        "is_staff": true,
        "is_superuser": true,
        "temp_password_flag": false,
        "password_reset_required": false,
        "can_manage_students": false,
        "can_manage_placements": false,
        "can_manage_resumes": false,
        "password": "Admin@1234"
    },
    {
        "id": "00000000-0000-0000-0000-000000000001",
        "login_id": "reg2025001",
        "email": "vudatabhargavi1983@gmail.com",
        "name": "Rahul Sharma",
        "role": "student",
        "is_staff": false,
        "is_superuser": false,
        "temp_password_flag": true,
        "password_reset_required": true,
        "can_manage_students": false,
        "can_manage_placements": false,
        "can_manage_resumes": false,
        "password": "Student@REG2025001"
    }
]''')
STUDENTS = json.loads(r'''[
    {
        "id": "ca5717ff-2205-474e-9ad1-c6ee9552d5f7",
        "user_id": "cebe4317-c540-4242-a1a6-610b05921cc1",
        "name": "Aditi Rao",
        "registration_number": "STU012",
        "email": "aditi.rao@student.ilead.edu",
        "passing_year": 2026,
        "course": "BCA",
        "stream": "Computer Science",
        "semester": 6,
        "attendance": 76.0,
        "cgpa": 8.5,
        "phone_number": "+919876543211",
        "year": "3rd",
        "category": "C",
        "is_category_manual": true,
        "backlogs": false,
        "backlogs_count": 0,
        "training_attendance": 82.0
    },
    {
        "id": "1f80459a-366f-4c05-8a2e-e262b2917cb9",
        "user_id": "35ad44ab-0d8a-4fdd-b4df-f5fdceb66a77",
        "name": "Demo Student",
        "registration_number": "DEMO001",
        "email": "demo.student@ilead.edu",
        "passing_year": 2025,
        "course": "BCA",
        "stream": "Computer Science",
        "semester": 6,
        "attendance": 85.0,
        "cgpa": 8.5,
        "phone_number": "",
        "year": "3",
        "category": "A",
        "is_category_manual": false,
        "backlogs": false,
        "backlogs_count": 0,
        "training_attendance": 100.0
    },
    {
        "id": "121be73c-d619-4288-b529-bce1bc901c2e",
        "user_id": "067b435c-86f7-4c23-958b-5036ba12c603",
        "name": "JHONNY",
        "registration_number": "STU1044",
        "email": "22331a0761@mvgrce.edu.in",
        "passing_year": 2025,
        "course": "BSc in Computer Application (BCA)",
        "stream": "Computer Science",
        "semester": 6,
        "attendance": 85.5,
        "cgpa": 8.2,
        "phone_number": "656564646",
        "year": "3rd",
        "category": "A",
        "is_category_manual": false,
        "backlogs": false,
        "backlogs_count": 0,
        "training_attendance": 85.5
    },
    {
        "id": "28e41a8b-0e64-408c-9455-391ce3857108",
        "user_id": "706921ed-b80a-4c44-9273-d809e3df91aa",
        "name": "Jane Smith",
        "registration_number": "STU102",
        "email": "jane.smith@student.ilead.edu",
        "passing_year": 2025,
        "course": "BSc in Computer Application (BCA)",
        "stream": "Computer Science",
        "semester": 6,
        "attendance": 92.0,
        "cgpa": 9.1,
        "phone_number": "",
        "year": null,
        "category": "A",
        "is_category_manual": true,
        "backlogs": false,
        "backlogs_count": 0,
        "training_attendance": 92.0
    },
    {
        "id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "user_id": "4bce7208-a881-48ca-bf38-8f3b05c9dc2b",
        "name": "John",
        "registration_number": "STU104",
        "email": "viiv4426@gmail.com",
        "passing_year": 2025,
        "course": "BSc in Computer Application (BCA)",
        "stream": "Computer Science",
        "semester": 6,
        "attendance": 85.5,
        "cgpa": 8.2,
        "phone_number": "",
        "year": null,
        "category": "A",
        "is_category_manual": false,
        "backlogs": false,
        "backlogs_count": 0,
        "training_attendance": 85.5
    },
    {
        "id": "701a2dd6-62d2-4c7b-9953-8f0b57252508",
        "user_id": "5317a211-241c-4eba-985a-346c6f48dd1f",
        "name": "John Doe",
        "registration_number": "STU101",
        "email": "john.doe@student.ilead.edu",
        "passing_year": 2025,
        "course": "BSc in Computer Application (BCA)",
        "stream": "Computer Science",
        "semester": 6,
        "attendance": 85.5,
        "cgpa": 8.2,
        "phone_number": "",
        "year": null,
        "category": "A",
        "is_category_manual": false,
        "backlogs": false,
        "backlogs_count": 0,
        "training_attendance": 85.5
    },
    {
        "id": "46f34473-6e47-4892-a2a7-9a8dcdc8675b",
        "user_id": "62f4d84d-6b09-42f3-9f78-14813048d64d",
        "name": "Meera Nair",
        "registration_number": "STU014",
        "email": "meera.nair@student.ilead.edu",
        "passing_year": 2026,
        "course": "BBA",
        "stream": "Marketing",
        "semester": 6,
        "attendance": 52.0,
        "cgpa": 6.8,
        "phone_number": "+919876543213",
        "year": "3rd",
        "category": "B",
        "is_category_manual": false,
        "backlogs": true,
        "backlogs_count": 2,
        "training_attendance": 75.0
    },
    {
        "id": "c47684b4-add8-40b9-9989-a6e02b34d281",
        "user_id": "f3037bd8-460c-4794-92ca-1da19f4a37a5",
        "name": "Rahul Sen",
        "registration_number": "STU011",
        "email": "rahul.sen@student.ilead.edu",
        "passing_year": 2026,
        "course": "BCA",
        "stream": "Computer Science",
        "semester": 6,
        "attendance": 88.0,
        "cgpa": 9.2,
        "phone_number": "+919876543210",
        "year": "3rd",
        "category": "C",
        "is_category_manual": true,
        "backlogs": false,
        "backlogs_count": 0,
        "training_attendance": 100.0
    },
    {
        "id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "user_id": "f15e7a90-484b-4e98-aece-f02411373ccd",
        "name": "Rahul Sharma",
        "registration_number": "ILEAD2026STU001",
        "email": "stu001@ilead.edu",
        "passing_year": 2026,
        "course": "BCA",
        "stream": "Computer Applications",
        "semester": 6,
        "attendance": 88.0,
        "cgpa": 8.4,
        "phone_number": "9876543210",
        "year": "3rd",
        "category": "A",
        "is_category_manual": false,
        "backlogs": false,
        "backlogs_count": 0,
        "training_attendance": 100.0
    },
    {
        "id": "f88c0751-d077-4d67-92b8-83558e4ccb36",
        "user_id": "7cc681f1-8fd0-421a-bb8e-fcb177d19185",
        "name": "Rohan Joshi",
        "registration_number": "STU015",
        "email": "rohan.joshi@student.ilead.edu",
        "passing_year": 2026,
        "course": "BBA",
        "stream": "Finance",
        "semester": 6,
        "attendance": 28.0,
        "cgpa": 4.8,
        "phone_number": "+919876543214",
        "year": "3rd",
        "category": "C",
        "is_category_manual": false,
        "backlogs": true,
        "backlogs_count": 4,
        "training_attendance": 60.0
    },
    {
        "id": "e1859948-327d-4120-bec6-dada81efedb6",
        "user_id": "b8d2d915-4ace-4e3a-ae1e-e7b1461afb66",
        "name": "Simran Kaur",
        "registration_number": "STU016",
        "email": "simran.kaur@student.ilead.edu",
        "passing_year": 2026,
        "course": "BCA",
        "stream": "Data Science",
        "semester": 6,
        "attendance": 45.0,
        "cgpa": 5.5,
        "phone_number": "+919876543215",
        "year": "3rd",
        "category": "C",
        "is_category_manual": false,
        "backlogs": true,
        "backlogs_count": 3,
        "training_attendance": 70.0
    },
    {
        "id": "5f67f794-e779-4ad6-9039-f3d3207067d1",
        "user_id": "f3b86872-cab6-4fcf-b5bb-f602c835c212",
        "name": "Smithy",
        "registration_number": "STU105",
        "email": "janee.smith@student.ilead.edu",
        "passing_year": 2025,
        "course": "BSc in Computer Application (BCA)",
        "stream": "Computer Science",
        "semester": 6,
        "attendance": 92.0,
        "cgpa": 9.1,
        "phone_number": "",
        "year": null,
        "category": "A",
        "is_category_manual": false,
        "backlogs": false,
        "backlogs_count": 0,
        "training_attendance": 92.0
    },
    {
        "id": "05fa7908-5b61-4064-8df8-63049be452b7",
        "user_id": "09636159-12d9-4641-bef4-4ae8724aa8f3",
        "name": "Vikram Malhotra",
        "registration_number": "STU013",
        "email": "vikram.malhotra@student.ilead.edu",
        "passing_year": 2026,
        "course": "BCA",
        "stream": "Computer Science",
        "semester": 6,
        "attendance": 68.0,
        "cgpa": 7.2,
        "phone_number": "+919876543212",
        "year": "3rd",
        "category": "B",
        "is_category_manual": false,
        "backlogs": true,
        "backlogs_count": 1,
        "training_attendance": 85.0
    },
    {
        "id": "00000000-0000-0000-0000-000000000002",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "name": "Rahul Sharma",
        "registration_number": "REG2025001",
        "email": "vudatabhargavi1983@gmail.com",
        "passing_year": 2025,
        "course": "BCA",
        "stream": "Computer Science",
        "semester": 6,
        "attendance": 85.0,
        "cgpa": 8.5,
        "phone_number": "",
        "year": "3rd",
        "category": "A",
        "is_category_manual": false,
        "backlogs": false,
        "backlogs_count": 0,
        "training_attendance": 100.0
    }
]''')
PROFILES = json.loads(r'''[
    {
        "id": "ac51a6f6-3f3f-4b84-83a0-3a36e40799c2",
        "student_id": "c47684b4-add8-40b9-9989-a6e02b34d281",
        "phone": "+919876543210",
        "location": "Kolkata, WB",
        "professional_summary": "Ambitious BCA student specializing in full-stack web development and database management systems. Eager to solve challenging industrial problems.",
        "linkedin": "https://linkedin.com/in/stu011",
        "github": "https://github.com/stu011",
        "portfolio": "https://stu011.dev"
    },
    {
        "id": "ce32fd19-20e0-40e3-8a38-8be229a6dd5b",
        "student_id": "ca5717ff-2205-474e-9ad1-c6ee9552d5f7",
        "phone": "+919876543211",
        "location": "Kolkata, WB",
        "professional_summary": "Dedicated software development student with strong coding foundations in Python and JavaScript. Focused on building robust web solutions.",
        "linkedin": "https://linkedin.com/in/stu012",
        "github": "https://github.com/stu012",
        "portfolio": "https://stu012.dev"
    },
    {
        "id": "4a97aa5c-fcf6-4ef3-b94c-83063e83ca3d",
        "student_id": "05fa7908-5b61-4064-8df8-63049be452b7",
        "phone": "+919876543212",
        "location": "Kolkata, WB",
        "professional_summary": "Tech enthusiast and software engineering student. Well-versed in Object Oriented Programming and Java systems development.",
        "linkedin": "https://linkedin.com/in/stu013",
        "github": "https://github.com/stu013",
        "portfolio": "https://stu013.dev"
    },
    {
        "id": "95b22534-0a25-4f17-9178-27a05d5582fa",
        "student_id": "46f34473-6e47-4892-a2a7-9a8dcdc8675b",
        "phone": "+919876543213",
        "location": "Kolkata, WB",
        "professional_summary": "Aspiring digital marketing and management student. Passionate about campaign optimization and content strategy.",
        "linkedin": "https://linkedin.com/in/stu014",
        "github": "https://github.com/stu014",
        "portfolio": "https://stu014.dev"
    },
    {
        "id": "e64eebd4-5259-435a-88aa-ce0aeadf363d",
        "student_id": "f88c0751-d077-4d67-92b8-83558e4ccb36",
        "phone": "+919876543214",
        "location": "Kolkata, WB",
        "professional_summary": "Business finance student focused on corporate accounts and financial data models.",
        "linkedin": "https://linkedin.com/in/stu015",
        "github": "https://github.com/stu015",
        "portfolio": "https://stu015.dev"
    },
    {
        "id": "036749b1-1ab0-48e8-96aa-bb84bdb1cb53",
        "student_id": "e1859948-327d-4120-bec6-dada81efedb6",
        "phone": "+919876543215",
        "location": "Kolkata, WB",
        "professional_summary": "Junior analyst exploring relational data models and business intelligence solutions.",
        "linkedin": "https://linkedin.com/in/stu016",
        "github": "https://github.com/stu016",
        "portfolio": "https://stu016.dev"
    },
    {
        "id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "student_id": "1f80459a-366f-4c05-8a2e-e262b2917cb9",
        "phone": "+91-98765-43210",
        "location": "Bangalore, India",
        "professional_summary": "Passionate full-stack developer with expertise in building scalable web applications. Strong background in Python, JavaScript, and cloud technologies. Experienced in leading small development teams and mentoring junior developers.",
        "linkedin": "https://linkedin.com/in/demo-student",
        "github": "https://github.com/demo-student",
        "portfolio": "https://demo-portfolio.com"
    },
    {
        "id": "02278c32-7cb7-4095-8722-00246d750280",
        "student_id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "phone": "9876543210",
        "location": "Kolkata, India",
        "professional_summary": "Detail-oriented BCA student with strong fundamentals in Python, Django, and React. Passionate about building real-world web applications.",
        "linkedin": "https://linkedin.com/in/stu001",
        "github": "https://github.com/stu001",
        "portfolio": "https://stu001.dev"
    },
    {
        "id": "912dba55-f318-4a9a-8c68-fa24e7addcc5",
        "student_id": "701a2dd6-62d2-4c7b-9953-8f0b57252508",
        "phone": "",
        "location": "",
        "professional_summary": "",
        "linkedin": "",
        "github": "",
        "portfolio": ""
    },
    {
        "id": "243def03-796c-4881-a305-3b5440944582",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "phone": "",
        "location": "",
        "professional_summary": "",
        "linkedin": "",
        "github": "",
        "portfolio": ""
    },
    {
        "id": "76d8b51d-7e40-4ce0-8782-741607e87797",
        "student_id": "121be73c-d619-4288-b529-bce1bc901c2e",
        "phone": "",
        "location": "",
        "professional_summary": "",
        "linkedin": "",
        "github": "",
        "portfolio": ""
    }
]''')
SKILLS = json.loads(r'''[
    {
        "id": "bc59d3df-9b0b-4fad-99b2-c04e2395eb27",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "category": "Language",
        "name": "English",
        "proficiency": "Advanced"
    },
    {
        "id": "5ba993f6-9ab8-4e23-86c3-7837b010b42f",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "category": "Language",
        "name": "Hindi",
        "proficiency": "Advanced"
    },
    {
        "id": "e1220628-3ecf-4a1f-9efd-06d9dd44c894",
        "profile_id": "ac51a6f6-3f3f-4b84-83a0-3a36e40799c2",
        "category": "Soft Skill",
        "name": "Communication",
        "proficiency": "Expert"
    },
    {
        "id": "b29c8abd-bc05-4ffa-8c31-d9fba2b70f94",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "category": "Soft Skill",
        "name": "Communication",
        "proficiency": "Advanced"
    },
    {
        "id": "fae8e550-8713-4490-b027-ac65d0be32e8",
        "profile_id": "036749b1-1ab0-48e8-96aa-bb84bdb1cb53",
        "category": "Soft Skill",
        "name": "Critical Thinking",
        "proficiency": "Advanced"
    },
    {
        "id": "b387380e-ab24-4b52-804c-af7caaf122fc",
        "profile_id": "95b22534-0a25-4f17-9178-27a05d5582fa",
        "category": "Soft Skill",
        "name": "Leadership",
        "proficiency": "Expert"
    },
    {
        "id": "317ff751-c087-4fe1-b611-9b28b379a2f5",
        "profile_id": "ce32fd19-20e0-40e3-8a38-8be229a6dd5b",
        "category": "Soft Skill",
        "name": "Problem Solving",
        "proficiency": "Advanced"
    },
    {
        "id": "02ce809a-6a99-4fc6-a4d8-18dd6cec5e03",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "category": "Soft Skill",
        "name": "Problem Solving",
        "proficiency": "Advanced"
    },
    {
        "id": "5edb465b-78bb-4a72-a897-5ad0e52255e6",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "category": "Soft Skill",
        "name": "Team Leadership",
        "proficiency": "Intermediate"
    },
    {
        "id": "fe2f8fae-2ded-4c94-a67f-f25bf9168dd3",
        "profile_id": "4a97aa5c-fcf6-4ef3-b94c-83063e83ca3d",
        "category": "Soft Skill",
        "name": "Team Work",
        "proficiency": "Advanced"
    },
    {
        "id": "9bcb5002-b40b-4220-8ae7-b92399b7bfd3",
        "profile_id": "243def03-796c-4881-a305-3b5440944582",
        "category": "Technical",
        "name": "ABC",
        "proficiency": "Beginner"
    },
    {
        "id": "bafb222d-a87f-45c3-88a8-3d943bac1715",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "category": "Technical",
        "name": "AWS",
        "proficiency": "Beginner"
    },
    {
        "id": "47be1ff8-c8e8-4eb4-b2b2-e63d71800581",
        "profile_id": "e64eebd4-5259-435a-88aa-ce0aeadf363d",
        "category": "Technical",
        "name": "Accounting",
        "proficiency": "Intermediate"
    },
    {
        "id": "428f5c9a-e728-4ccb-a748-500bd98dfeee",
        "profile_id": "243def03-796c-4881-a305-3b5440944582",
        "category": "Technical",
        "name": "BCD",
        "proficiency": "Beginner"
    },
    {
        "id": "b250d975-f9b6-4364-9ae8-f79547d065ff",
        "profile_id": "95b22534-0a25-4f17-9178-27a05d5582fa",
        "category": "Technical",
        "name": "Digital Marketing",
        "proficiency": "Advanced"
    },
    {
        "id": "b1f90d03-26e5-4b28-8536-55b2de9a1def",
        "profile_id": "ce32fd19-20e0-40e3-8a38-8be229a6dd5b",
        "category": "Technical",
        "name": "Django",
        "proficiency": "Advanced"
    },
    {
        "id": "6d354c16-9a47-42c0-b0a1-1e23058ac22c",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "category": "Technical",
        "name": "Django",
        "proficiency": "Advanced"
    },
    {
        "id": "8b3c25fc-491d-4282-bb69-91ee0ceb7953",
        "profile_id": "02278c32-7cb7-4095-8722-00246d750280",
        "category": "Technical",
        "name": "Django",
        "proficiency": "Intermediate"
    },
    {
        "id": "1174f63d-762a-474e-9069-926b84d59a12",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "category": "Technical",
        "name": "Docker",
        "proficiency": "Intermediate"
    },
    {
        "id": "f7f274db-5713-498d-af83-6adbc4eec055",
        "profile_id": "4a97aa5c-fcf6-4ef3-b94c-83063e83ca3d",
        "category": "Technical",
        "name": "Java",
        "proficiency": "Expert"
    },
    {
        "id": "f8784e90-9356-42f4-a1a2-f04091d2ef28",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "category": "Technical",
        "name": "JavaScript",
        "proficiency": "Advanced"
    },
    {
        "id": "ca02d4f2-067a-42d7-ac64-e52b2c5d4d13",
        "profile_id": "e64eebd4-5259-435a-88aa-ce0aeadf363d",
        "category": "Technical",
        "name": "MS Excel",
        "proficiency": "Advanced"
    },
    {
        "id": "5acd5bc0-0687-4cba-a432-ff00115a675b",
        "profile_id": "ac51a6f6-3f3f-4b84-83a0-3a36e40799c2",
        "category": "Technical",
        "name": "Node.js",
        "proficiency": "Advanced"
    },
    {
        "id": "21b96130-80d0-4ab4-8725-6a96bb2211aa",
        "profile_id": "ac51a6f6-3f3f-4b84-83a0-3a36e40799c2",
        "category": "Technical",
        "name": "PostgreSQL",
        "proficiency": "Advanced"
    },
    {
        "id": "e31bda6d-fb3e-40b0-aa7f-6795ba5237f6",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "category": "Technical",
        "name": "PostgreSQL",
        "proficiency": "Intermediate"
    },
    {
        "id": "dd824c1e-8ec8-4201-9fe5-fe7071416aff",
        "profile_id": "ce32fd19-20e0-40e3-8a38-8be229a6dd5b",
        "category": "Technical",
        "name": "Python",
        "proficiency": "Expert"
    },
    {
        "id": "bf008aae-e3e7-4a2f-97ad-fb6c77a3225d",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "category": "Technical",
        "name": "Python",
        "proficiency": "Advanced"
    },
    {
        "id": "449c9273-3693-4f94-8c63-7bd594cdf21f",
        "profile_id": "02278c32-7cb7-4095-8722-00246d750280",
        "category": "Technical",
        "name": "Python",
        "proficiency": "Intermediate"
    },
    {
        "id": "2a6bf29a-9444-4ee1-9199-8a91fbf6584f",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "category": "Technical",
        "name": "REST APIs",
        "proficiency": "Advanced"
    },
    {
        "id": "9c109183-7bd3-4bcd-9447-16f0379f4218",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "category": "Technical",
        "name": "React",
        "proficiency": "Intermediate"
    },
    {
        "id": "4401ae12-8e60-4b4f-a159-b3f6554b5c5b",
        "profile_id": "02278c32-7cb7-4095-8722-00246d750280",
        "category": "Technical",
        "name": "React",
        "proficiency": "Intermediate"
    },
    {
        "id": "5d81833b-fd9e-4877-85c6-d39607db7b27",
        "profile_id": "ac51a6f6-3f3f-4b84-83a0-3a36e40799c2",
        "category": "Technical",
        "name": "React.js",
        "proficiency": "Expert"
    },
    {
        "id": "adf94906-0bf2-4e76-8c4b-9317a2a0c672",
        "profile_id": "95b22534-0a25-4f17-9178-27a05d5582fa",
        "category": "Technical",
        "name": "SEO",
        "proficiency": "Advanced"
    },
    {
        "id": "2f88006a-fcdb-4b7c-bbc9-c28a83413b67",
        "profile_id": "036749b1-1ab0-48e8-96aa-bb84bdb1cb53",
        "category": "Technical",
        "name": "SQL",
        "proficiency": "Advanced"
    },
    {
        "id": "e0e5ea49-f5b9-4177-b28d-857bc7c7ff60",
        "profile_id": "4a97aa5c-fcf6-4ef3-b94c-83063e83ca3d",
        "category": "Technical",
        "name": "Spring Boot",
        "proficiency": "Intermediate"
    }
]''')
PROJECTS = json.loads(r'''[
    {
        "id": "eac95961-8692-48f4-877a-afd76a2bcfc6",
        "profile_id": "02278c32-7cb7-4095-8722-00246d750280",
        "title": "Placement Portal",
        "description": "Role-based placement portal for students and admins.",
        "technologies": [
            "Django",
            "React",
            "PostgreSQL"
        ],
        "link": "https://github.com/shahithkumar/iLEAD-Placment_portal",
        "date": "2026-05-01"
    },
    {
        "id": "3baa85dc-fc16-431c-bfd6-3b6d10e8043c",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "title": "AI-Powered Resume Generator",
        "description": "Developed an intelligent resume building platform using NLP and machine learning to auto-fill content and optimize for ATS.",
        "technologies": [
            "Python",
            "Django",
            "React",
            "PostgreSQL",
            "TensorFlow",
            "Celery"
        ],
        "link": "https://github.com/demo-student/ai-resume-gen",
        "date": "2024-01-15"
    },
    {
        "id": "05c7844d-4f8d-4092-a590-eeac295e5aab",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "title": "Real-Time Chat Application",
        "description": "Built a scalable chat application with real-time messaging using WebSockets and Redis for high performance.",
        "technologies": [
            "Node.js",
            "Socket.io",
            "React",
            "MongoDB",
            "Redis"
        ],
        "link": "https://github.com/demo-student/realtime-chat",
        "date": "2023-08-20"
    },
    {
        "id": "1a359a33-c7e8-43d3-a9ca-c3ae88a88879",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "title": "E-Commerce Platform",
        "description": "Created a full-featured e-commerce platform with payment integration, inventory management, and analytics dashboard.",
        "technologies": [
            "Django",
            "React",
            "PostgreSQL",
            "Stripe",
            "Celery",
            "Docker"
        ],
        "link": "https://github.com/demo-student/ecommerce-platform",
        "date": "2023-03-10"
    },
    {
        "id": "3b585333-966f-407d-95cf-011e834f241e",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "title": "Portfolio Website",
        "description": "Designed and developed a modern portfolio website showcasing projects and skills with smooth animations.",
        "technologies": [
            "React",
            "Tailwind CSS",
            "JavaScript",
            "Vercel"
        ],
        "link": "https://demo-portfolio.com",
        "date": "2022-12-05"
    },
    {
        "id": "b902140f-3e20-4256-ac5a-163efbb52ed8",
        "profile_id": "ac51a6f6-3f3f-4b84-83a0-3a36e40799c2",
        "title": "iLEAD Placement Dashboard",
        "description": "An interactive, glassmorphic student placement portal built with React, Vite, and Django.",
        "technologies": [
            "React",
            "Vite",
            "Django",
            "PostgreSQL"
        ],
        "link": "https://github.com/rahulsen/ilead-placement",
        "date": null
    },
    {
        "id": "51e8d2d3-76ab-4ece-85bc-0d7965314013",
        "profile_id": "ce32fd19-20e0-40e3-8a38-8be229a6dd5b",
        "title": "Student Attendance Tracker",
        "description": "A face-recognition based student attendance management platform.",
        "technologies": [
            "Python",
            "OpenCV",
            "SQLite"
        ],
        "link": "https://github.com/aditirao/attendance-tracker",
        "date": null
    },
    {
        "id": "63a4a055-6057-4e35-9049-517f3c1e303c",
        "profile_id": "4a97aa5c-fcf6-4ef3-b94c-83063e83ca3d",
        "title": "Online Quiz App",
        "description": "A multiplayer clean online quiz web game utilizing web sockets.",
        "technologies": [
            "Java",
            "Spring Boot",
            "WebSockets"
        ],
        "link": "https://github.com/vikramm/quiz-app",
        "date": null
    },
    {
        "id": "b10d8bd5-328c-4e40-9d3e-730931887ad3",
        "profile_id": "95b22534-0a25-4f17-9178-27a05d5582fa",
        "title": "E-Commerce Launch Strategy",
        "description": "Comprehensive marketing layout and launch metrics analysis for local retail organic stores.",
        "technologies": [
            "SEO",
            "Google Analytics"
        ],
        "link": "",
        "date": null
    }
]''')
EDUCATIONS = json.loads(r'''[
    {
        "id": "b795baf4-93b5-4f2e-9716-fa39d631365b",
        "profile_id": "243def03-796c-4881-a305-3b5440944582",
        "institution": "ASF",
        "degree": "ASF",
        "field": "ASF",
        "graduation_date": "2026-08-10",
        "gpa": 10.0,
        "honors": "ASF"
    },
    {
        "id": "124cb86a-2f1f-4cd2-95c9-7c3dff59f94e",
        "profile_id": "02278c32-7cb7-4095-8722-00246d750280",
        "institution": "iLEAD",
        "degree": "Bachelor of Computer Applications",
        "field": "Computer Applications",
        "graduation_date": "2026-06-30",
        "gpa": 8.4,
        "honors": ""
    },
    {
        "id": "17da1096-6738-48b3-82c9-125dc5399a72",
        "profile_id": "ac51a6f6-3f3f-4b84-83a0-3a36e40799c2",
        "institution": "iLEAD Institute of Leadership, Entrepreneurship and Development",
        "degree": "BCA",
        "field": "Computer Science",
        "graduation_date": "2026-06-01",
        "gpa": 9.2,
        "honors": ""
    },
    {
        "id": "663bb803-b53d-40c2-9703-0b30fc2ef28f",
        "profile_id": "ce32fd19-20e0-40e3-8a38-8be229a6dd5b",
        "institution": "iLEAD Institute of Leadership, Entrepreneurship and Development",
        "degree": "BCA",
        "field": "Computer Science",
        "graduation_date": "2026-06-01",
        "gpa": 8.5,
        "honors": ""
    },
    {
        "id": "2b4e66a5-50dd-40a8-bf04-0b98a394d165",
        "profile_id": "4a97aa5c-fcf6-4ef3-b94c-83063e83ca3d",
        "institution": "iLEAD Institute of Leadership, Entrepreneurship and Development",
        "degree": "BCA",
        "field": "Computer Science",
        "graduation_date": "2026-06-01",
        "gpa": 7.2,
        "honors": ""
    },
    {
        "id": "f9f09101-c238-4e44-b170-37e3b19f83f8",
        "profile_id": "95b22534-0a25-4f17-9178-27a05d5582fa",
        "institution": "iLEAD Institute of Leadership, Entrepreneurship and Development",
        "degree": "BBA",
        "field": "Marketing",
        "graduation_date": "2026-06-01",
        "gpa": 6.8,
        "honors": ""
    },
    {
        "id": "28291121-a81a-4ff9-85b9-3344c17a3876",
        "profile_id": "e64eebd4-5259-435a-88aa-ce0aeadf363d",
        "institution": "iLEAD Institute of Leadership, Entrepreneurship and Development",
        "degree": "BBA",
        "field": "Finance",
        "graduation_date": "2026-06-01",
        "gpa": 4.8,
        "honors": ""
    },
    {
        "id": "d520ccb3-7354-437c-97fd-59555791b61f",
        "profile_id": "036749b1-1ab0-48e8-96aa-bb84bdb1cb53",
        "institution": "iLEAD Institute of Leadership, Entrepreneurship and Development",
        "degree": "BCA",
        "field": "Data Science",
        "graduation_date": "2026-06-01",
        "gpa": 5.5,
        "honors": ""
    },
    {
        "id": "020cefbf-0901-4d12-a3ee-57dfce052d97",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "institution": "National Institute of Technology (NIT), Bangalore",
        "degree": "Bachelor of Technology",
        "field": "Computer Science and Engineering",
        "graduation_date": "2020-05-30",
        "gpa": 8.2,
        "honors": "Cum Laude"
    },
    {
        "id": "98f96615-eed0-4df3-8b46-7c0a81f7db83",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "institution": "Delhi Public School, Delhi",
        "degree": "Senior Secondary (12th)",
        "field": "Science",
        "graduation_date": "2016-03-31",
        "gpa": 9.1,
        "honors": "Merit Certificate"
    }
]''')
CERTIFICATIONS = json.loads(r'''[
    {
        "id": "11ef2264-9c3d-4e80-bd3b-226e409ae662",
        "profile_id": "ac51a6f6-3f3f-4b84-83a0-3a36e40799c2",
        "name": "AI & Industry Readiness Certificate",
        "issuer": "iLEAD Career Development Cell",
        "date": "2025-12-01",
        "credential_url": ""
    },
    {
        "id": "e5a9997f-9558-47a7-8c4a-1f8cec7b12c3",
        "profile_id": "ce32fd19-20e0-40e3-8a38-8be229a6dd5b",
        "name": "AI & Industry Readiness Certificate",
        "issuer": "iLEAD Career Development Cell",
        "date": "2025-12-01",
        "credential_url": ""
    },
    {
        "id": "2c3b12ea-6ff5-497a-a069-e6403af9256d",
        "profile_id": "4a97aa5c-fcf6-4ef3-b94c-83063e83ca3d",
        "name": "AI & Industry Readiness Certificate",
        "issuer": "iLEAD Career Development Cell",
        "date": "2025-12-01",
        "credential_url": ""
    },
    {
        "id": "cd76a854-6498-4357-8e53-ce362be770bf",
        "profile_id": "95b22534-0a25-4f17-9178-27a05d5582fa",
        "name": "AI & Industry Readiness Certificate",
        "issuer": "iLEAD Career Development Cell",
        "date": "2025-12-01",
        "credential_url": ""
    },
    {
        "id": "a06b0b84-66e5-4f29-9076-6c0351ed7e3c",
        "profile_id": "e64eebd4-5259-435a-88aa-ce0aeadf363d",
        "name": "AI & Industry Readiness Certificate",
        "issuer": "iLEAD Career Development Cell",
        "date": "2025-12-01",
        "credential_url": ""
    },
    {
        "id": "53ab2989-52e1-448a-9bbb-ae2e67a6af3b",
        "profile_id": "036749b1-1ab0-48e8-96aa-bb84bdb1cb53",
        "name": "AI & Industry Readiness Certificate",
        "issuer": "iLEAD Career Development Cell",
        "date": "2025-12-01",
        "credential_url": ""
    },
    {
        "id": "4a7f8faa-964f-4dda-bace-df49e2033e48",
        "profile_id": "02278c32-7cb7-4095-8722-00246d750280",
        "name": "Python for Everybody",
        "issuer": "Coursera",
        "date": "2025-08-15",
        "credential_url": ""
    },
    {
        "id": "36e9d01a-5dec-4cd5-973e-1504c284564d",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "name": "AWS Certified Solutions Architect - Associate",
        "issuer": "Amazon Web Services",
        "date": "2023-09-15",
        "credential_url": "https://aws.amazon.com/verification/cert123"
    },
    {
        "id": "c6d5b936-6faf-4766-967b-19481f6bbce7",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "name": "Google Cloud Professional Data Engineer",
        "issuer": "Google Cloud",
        "date": "2023-06-01",
        "credential_url": "https://cloud.google.com/certification/verify/cert456"
    },
    {
        "id": "67e0c4b9-ee58-4553-85c5-d0d471b19fd1",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "name": "Python for Data Science (Deep Learning Specialization)",
        "issuer": "Coursera - Andrew Ng",
        "date": "2023-03-10",
        "credential_url": "https://coursera.org/verify/specialization/cert789"
    }
]''')
ACHIEVEMENTS = json.loads(r'''[
    {
        "id": "8b38ca50-7d79-46c9-88b2-45f89c382dd6",
        "profile_id": "02278c32-7cb7-4095-8722-00246d750280",
        "title": "Top 10 in Internal Hackathon",
        "issuer": "iLEAD",
        "date": "2025-11-20",
        "description": ""
    }
]''')
EXPERIENCES = json.loads(r'''[
    {
        "id": "47bcf119-a579-4963-a51f-ec39fb021afb",
        "profile_id": "243def03-796c-4881-a305-3b5440944582",
        "company": "rqw",
        "position": "ew",
        "start_date": "2026-08-08",
        "end_date": "2026-01-06",
        "is_current": false,
        "description": "sadsada",
        "achievements": []
    },
    {
        "id": "4dd3231a-9306-404c-a161-8a8276f8b69f",
        "profile_id": "ac51a6f6-3f3f-4b84-83a0-3a36e40799c2",
        "company": "Tech Solutions Inc.",
        "position": "Web Developer Intern",
        "start_date": "2025-06-01",
        "end_date": "2025-08-31",
        "is_current": false,
        "description": "Designed and optimized scalable APIs and responsive frontend dashboard interfaces using Node.js and React.",
        "achievements": []
    },
    {
        "id": "6ffd2dee-a105-48b4-883a-2ac5b7e0bb06",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "company": "TechCorp India",
        "position": "Senior Software Developer",
        "start_date": "2023-06-01",
        "end_date": null,
        "is_current": true,
        "description": "Led development of customer-facing APIs and microservices using Django and PostgreSQL.",
        "achievements": [
            "Reduced API response time by 40% through optimization",
            "Mentored 3 junior developers",
            "Implemented CI/CD pipeline using Docker and GitHub Actions"
        ]
    },
    {
        "id": "5eb1092d-f6ef-465e-8fb4-c1221d65f04b",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "company": "StartupXYZ",
        "position": "Full Stack Developer",
        "start_date": "2021-09-01",
        "end_date": "2023-05-31",
        "is_current": false,
        "description": "Built and maintained full-stack web applications serving 50k+ users.",
        "achievements": [
            "Designed and implemented payment integration module",
            "Achieved 99.9% uptime for production systems",
            "Drove adoption of React for frontend development"
        ]
    },
    {
        "id": "e115324e-80bf-4a1f-8818-cc0c872be07a",
        "profile_id": "edbab236-475e-4126-a2db-0ed80b34c723",
        "company": "WebAgency Solutions",
        "position": "Junior Developer",
        "start_date": "2020-06-01",
        "end_date": "2021-08-31",
        "is_current": false,
        "description": "Developed and maintained client websites and web applications.",
        "achievements": [
            "Delivered 15+ successful projects",
            "Improved code quality through implementation of linting tools",
            "Collaborated with designers to implement responsive UIs"
        ]
    }
]''')

TEMPLATES = json.loads(r'''[
    {
        "id": "5a5094e6-f58f-4dab-a3f0-9596309f2703",
        "name": "Classic Professional",
        "version": 1,
        "description": "Simple ATS-friendly template.",
        "html_template": "<h1>{{ name }}</h1><p>{{ professional_summary }}</p>",
        "css_styles": "body{font-family:Arial,sans-serif;} h1{font-size:22px;}",
        "is_active": true,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "a5b7483b-52fd-4fc2-9527-39daa0f87c53",
        "name": "Modern Professional",
        "version": 1,
        "description": "A sleek, high-fidelity resume template designed for tech and corporate roles. Features clean typography and an authoritative layout.",
        "html_template": "\n<div class=\"resume-wrapper\">\n    <header class=\"resume-header\">\n        <h1>{{ personal.name }}</h1>\n        <div class=\"contact-info\">\n            {% if personal.email %}<span>{{ personal.email }}</span>{% endif %}\n            {% if personal.phone %}<span>{{ personal.phone }}</span>{% endif %}\n            {% if personal.location %}<span>{{ personal.location }}</span>{% endif %}\n        </div>\n        <div class=\"social-links\">\n            {% if personal.linkedin %}<span>LinkedIn: {{ personal.linkedin }}</span>{% endif %}\n            {% if personal.github %}<span>GitHub: {{ personal.github }}</span>{% endif %}\n            {% if personal.portfolio %}<span>Portfolio: {{ personal.portfolio }}</span>{% endif %}\n        </div>\n    </header>\n\n    {% if summary %}\n    <section class=\"section\">\n        <h2 class=\"section-title\">Professional Summary</h2>\n        <p class=\"summary-text\">{{ summary }}</p>\n    </section>\n    {% endif %}\n\n    {% if experience %}\n    <section class=\"section\">\n        <h2 class=\"section-title\">Work Experience</h2>\n        {% for exp in experience %}\n        <div class=\"item\">\n            <div class=\"item-header\">\n                <span class=\"item-title\">{{ exp.position }}</span>\n                <span class=\"item-date\">{{ exp.duration.start }} \u2014 {{ exp.duration.end|default:\"Present\" }}</span>\n            </div>\n            <div class=\"item-subtitle\">{{ exp.company }}</div>\n            <div class=\"item-description\">{{ exp.description }}</div>\n            {% if exp.achievements %}\n            <ul class=\"achievements-list\">\n                {% for achievement in exp.achievements %}\n                <li>{{ achievement }}</li>\n                {% endfor %}\n            </ul>\n            {% endif %}\n        </div>\n        {% endfor %}\n    </section>\n    {% endif %}\n\n    {% if projects %}\n    <section class=\"section\">\n        <h2 class=\"section-title\">Key Projects</h2>\n        {% for proj in projects %}\n        <div class=\"item\">\n            <div class=\"item-header\">\n                <span class=\"item-title\">{{ proj.title }}</span>\n                <span class=\"item-date\">{{ proj.date }}</span>\n            </div>\n            <div class=\"item-description\">{{ proj.description }}</div>\n            <div class=\"technologies\">\n                <strong>Tech:</strong> {{ proj.technologies|join:\", \" }}\n            </div>\n            {% if proj.link %}<div class=\"project-link\">Link: {{ proj.link }}</div>{% endif %}\n        </div>\n        {% endfor %}\n    </section>\n    {% endif %}\n\n    <div class=\"two-column\">\n        {% if skills %}\n        <section class=\"section\">\n            <h2 class=\"section-title\">Technical Skills</h2>\n            {% for skill_group in skills %}\n            <div class=\"skill-group\">\n                <strong>{{ skill_group.category }}:</strong> {{ skill_group.items|join:\", \" }}\n            </div>\n            {% endfor %}\n        </section>\n        {% endif %}\n\n        {% if education %}\n        <section class=\"section\">\n            <h2 class=\"section-title\">Education</h2>\n            {% for edu in education %}\n            <div class=\"item\">\n                <div class=\"item-header\">\n                    <span class=\"item-title\">{{ edu.degree }}</span>\n                </div>\n                <div class=\"item-subtitle\">{{ edu.institution }}</div>\n                <div class=\"item-date\">Graduation: {{ edu.graduation_date }}</div>\n                {% if edu.gpa %}<div class=\"gpa\">CGPA: {{ edu.gpa }}</div>{% endif %}\n            </div>\n            {% endfor %}\n        </section>\n        {% endif %}\n    </div>\n</div>\n",
        "css_styles": "\n:root {\n    --primary: #1e293b;\n    --accent: #3b82f6;\n    --text-main: #334155;\n    --text-muted: #64748b;\n    --border: #e2e8f0;\n}\n\nbody {\n    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n    line-height: 1.5;\n    color: var(--text-main);\n    margin: 0;\n    padding: 0;\n    background: white;\n}\n\n.resume-wrapper {\n    max-width: 800px;\n    margin: 40px auto;\n    padding: 40px;\n    background: white;\n}\n\n.resume-header {\n    text-align: center;\n    border-bottom: 2px solid var(--primary);\n    padding-bottom: 20px;\n    margin-bottom: 30px;\n}\n\n.resume-header h1 {\n    margin: 0 0 10px 0;\n    font-size: 32px;\n    font-weight: 800;\n    color: var(--primary);\n    text-transform: uppercase;\n    letter-spacing: -1px;\n}\n\n.contact-info, .social-links {\n    font-size: 11px;\n    color: var(--text-muted);\n    display: flex;\n    justify-content: center;\n    gap: 15px;\n    margin-bottom: 5px;\n}\n\n.section {\n    margin-bottom: 25px;\n}\n\n.section-title {\n    font-size: 14px;\n    font-weight: 800;\n    color: var(--accent);\n    text-transform: uppercase;\n    letter-spacing: 1px;\n    border-bottom: 1px solid var(--border);\n    padding-bottom: 5px;\n    margin-bottom: 15px;\n}\n\n.summary-text {\n    font-size: 13px;\n    text-align: justify;\n}\n\n.item {\n    margin-bottom: 15px;\n}\n\n.item-header {\n    display: flex;\n    justify-content: space-between;\n    align-items: baseline;\n}\n\n.item-title {\n    font-size: 15px;\n    font-weight: 700;\n    color: var(--primary);\n}\n\n.item-date {\n    font-size: 11px;\n    font-weight: 600;\n    color: var(--text-muted);\n}\n\n.item-subtitle {\n    font-size: 13px;\n    font-weight: 600;\n    color: var(--text-main);\n    margin-bottom: 4px;\n}\n\n.item-description {\n    font-size: 12px;\n    color: var(--text-main);\n}\n\n.achievements-list {\n    margin: 8px 0 0 0;\n    padding-left: 20px;\n    font-size: 12px;\n}\n\n.technologies, .gpa, .project-link {\n    font-size: 11px;\n    margin-top: 5px;\n}\n\n.two-column {\n    display: grid;\n    grid-template-cols: 1fr 1fr;\n    gap: 40px;\n}\n\n.skill-group {\n    font-size: 12px;\n    margin-bottom: 8px;\n}\n\n@media print {\n    .resume-wrapper {\n        margin: 0;\n        padding: 0;\n    }\n}\n",
        "is_active": true,
        "created_by_id": null
    },
    {
        "id": "aece2518-5b6c-45b0-8c76-bc8c5edb6037",
        "name": "Modern Clean",
        "version": 1,
        "description": "A modern clean template for all roles.",
        "html_template": "\n<div class=\"resume\">\n    <header>\n        <h1>{{ personal.name }}</h1>\n        <p>{{ personal.email }} | {{ personal.phone }}</p>\n        <p>{{ personal.location }}</p>\n    </header>\n\n    <section>\n        <h2>Professional Summary</h2>\n        <p>{{ summary }}</p>\n    </section>\n\n    <section>\n        <h2>Experience</h2>\n        {% for exp in experience %}\n        <div class=\"item\">\n            <h3>{{ exp.position }} at {{ exp.company }}</h3>\n            <p>{{ exp.duration.start }} - {% if exp.duration.current %}Present{% else %}{{ exp.duration.end }}{% endif %}</p>\n            <p>{{ exp.description }}</p>\n            <ul>\n                {% for ach in exp.achievements %}\n                <li>{{ ach }}</li>\n                {% endfor %}\n            </ul>\n        </div>\n        {% endfor %}\n    </section>\n\n    <section>\n        <h2>Skills</h2>\n        {% for skill_group in skills %}\n        <p><strong>{{ skill_group.category }}:</strong> {{ skill_group.items|join:\", \" }}</p>\n        {% endfor %}\n    </section>\n</div>\n",
        "css_styles": "\n.resume { font-family: 'Arial', sans-serif; color: #333; line-height: 1.6; max-width: 800px; margin: auto; }\nheader { text-align: center; border-bottom: 2px solid #333; margin-bottom: 20px; }\nh1 { margin-bottom: 5px; }\nh2 { border-bottom: 1px solid #ccc; margin-top: 20px; color: #444; }\n.item { margin-bottom: 15px; }\nul { margin-top: 5px; }\n",
        "is_active": true,
        "created_by_id": null
    }
]''')
RESUMES = json.loads(r'''[
    {
        "id": "ec25dce1-1b00-41a8-81b2-7b47e170bc73",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "title": "Resume - 6/1/2026",
        "description": "",
        "canonical_json": {
            "personal": {
                "name": "John",
                "email": "viiv4426@gmail.com",
                "phone": "",
                "location": "",
                "linkedin": "",
                "github": "",
                "portfolio": ""
            },
            "professional_summary": "",
            "skills": [
                {
                    "category": "Technical",
                    "items": [
                        "ABC",
                        "BCD"
                    ]
                }
            ],
            "experience": [
                {
                    "company": "rqw",
                    "position": "ew",
                    "duration": {
                        "start": "2026-08-08",
                        "end": "2026-01-06",
                        "current": false
                    },
                    "description": "sadsada",
                    "achievements": []
                }
            ],
            "projects": [],
            "education": [
                {
                    "institution": "ASF",
                    "degree": "ASF",
                    "field": "ASF",
                    "graduation_date": "2026-08-10",
                    "gpa": 10.0,
                    "honors": "ASF"
                }
            ],
            "certifications": [],
            "achievements": [],
            "metadata": {
                "source_type": "profile",
                "version": 1,
                "normalized_at": "2026-06-01T11:37:25.455222+00:00"
            }
        },
        "template_id": "aece2518-5b6c-45b0-8c76-bc8c5edb6037",
        "state": "generated",
        "is_primary": true
    },
    {
        "id": "68cbc483-2a13-4114-9e99-f24292514b76",
        "student_id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "title": "Primary Resume",
        "description": "Default mock resume",
        "canonical_json": {
            "name": "Rahul Sharma",
            "email": "stu001@ilead.edu",
            "phone": "9876543210",
            "professional_summary": "Aspiring software engineer focused on backend development.",
            "skills": [
                "Python",
                "Django",
                "React"
            ],
            "projects": [
                {
                    "title": "Placement Portal",
                    "description": "Built end-to-end placement workflow portal."
                }
            ]
        },
        "template_id": "5a5094e6-f58f-4dab-a3f0-9596309f2703",
        "state": "active",
        "is_primary": true
    },
    {
        "id": "67fbc00e-7b39-49fe-9fc6-c6bde0ad976f",
        "student_id": "1f80459a-366f-4c05-8a2e-e262b2917cb9",
        "title": "Resume - 5/23/2026 (1)",
        "description": "",
        "canonical_json": {
            "personal": {
                "name": "Demo Student",
                "email": "demo.student@ilead.edu",
                "phone": "+91-98765-43210",
                "location": "Bangalore, India",
                "linkedin": "https://linkedin.com/in/demo-student",
                "github": "https://github.com/demo-student",
                "portfolio": "https://demo-portfolio.com"
            },
            "professional_summary": "Passionate full-stack developer with expertise in building scalable web applications. Strong background in Python, JavaScript, and cloud technologies. Experienced in leading small development teams and mentoring junior developers.",
            "skills": [
                {
                    "category": "Language",
                    "items": [
                        "English",
                        "Hindi"
                    ]
                },
                {
                    "category": "Soft Skill",
                    "items": [
                        "Communication",
                        "Problem Solving",
                        "Team Leadership"
                    ]
                },
                {
                    "category": "Technical",
                    "items": [
                        "AWS",
                        "Django",
                        "Docker",
                        "JavaScript",
                        "PostgreSQL",
                        "Python",
                        "REST APIs",
                        "React"
                    ]
                }
            ],
            "experience": [
                {
                    "company": "TechCorp India",
                    "position": "Senior Software Developer",
                    "duration": {
                        "start": "2023-06-01",
                        "end": null,
                        "current": true
                    },
                    "description": "Led development of customer-facing APIs and microservices using Django and PostgreSQL.",
                    "achievements": [
                        "Reduced API response time by 40% through optimization",
                        "Mentored 3 junior developers",
                        "Implemented CI/CD pipeline using Docker and GitHub Actions"
                    ]
                },
                {
                    "company": "StartupXYZ",
                    "position": "Full Stack Developer",
                    "duration": {
                        "start": "2021-09-01",
                        "end": "2023-05-31",
                        "current": false
                    },
                    "description": "Built and maintained full-stack web applications serving 50k+ users.",
                    "achievements": [
                        "Designed and implemented payment integration module",
                        "Achieved 99.9% uptime for production systems",
                        "Drove adoption of React for frontend development"
                    ]
                },
                {
                    "company": "WebAgency Solutions",
                    "position": "Junior Developer",
                    "duration": {
                        "start": "2020-06-01",
                        "end": "2021-08-31",
                        "current": false
                    },
                    "description": "Developed and maintained client websites and web applications.",
                    "achievements": [
                        "Delivered 15+ successful projects",
                        "Improved code quality through implementation of linting tools",
                        "Collaborated with designers to implement responsive UIs"
                    ]
                }
            ],
            "projects": [
                {
                    "title": "AI-Powered Resume Generator",
                    "description": "Developed an intelligent resume building platform using NLP and machine learning to auto-fill content and optimize for ATS.",
                    "technologies": [
                        "Python",
                        "Django",
                        "React",
                        "PostgreSQL",
                        "TensorFlow",
                        "Celery"
                    ],
                    "link": "https://github.com/demo-student/ai-resume-gen",
                    "date": "2024-01-15"
                },
                {
                    "title": "Real-Time Chat Application",
                    "description": "Built a scalable chat application with real-time messaging using WebSockets and Redis for high performance.",
                    "technologies": [
                        "Node.js",
                        "Socket.io",
                        "React",
                        "MongoDB",
                        "Redis"
                    ],
                    "link": "https://github.com/demo-student/realtime-chat",
                    "date": "2023-08-20"
                },
                {
                    "title": "E-Commerce Platform",
                    "description": "Created a full-featured e-commerce platform with payment integration, inventory management, and analytics dashboard.",
                    "technologies": [
                        "Django",
                        "React",
                        "PostgreSQL",
                        "Stripe",
                        "Celery",
                        "Docker"
                    ],
                    "link": "https://github.com/demo-student/ecommerce-platform",
                    "date": "2023-03-10"
                },
                {
                    "title": "Portfolio Website",
                    "description": "Designed and developed a modern portfolio website showcasing projects and skills with smooth animations.",
                    "technologies": [
                        "React",
                        "Tailwind CSS",
                        "JavaScript",
                        "Vercel"
                    ],
                    "link": "https://demo-portfolio.com",
                    "date": "2022-12-05"
                }
            ],
            "education": [
                {
                    "institution": "National Institute of Technology (NIT), Bangalore",
                    "degree": "Bachelor of Technology",
                    "field": "Computer Science and Engineering",
                    "graduation_date": "2020-05-30",
                    "gpa": 8.2,
                    "honors": "Cum Laude"
                },
                {
                    "institution": "Delhi Public School, Delhi",
                    "degree": "Senior Secondary (12th)",
                    "field": "Science",
                    "graduation_date": "2016-03-31",
                    "gpa": 9.1,
                    "honors": "Merit Certificate"
                }
            ],
            "certifications": [
                {
                    "name": "AWS Certified Solutions Architect - Associate",
                    "issuer": "Amazon Web Services",
                    "date": "2023-09-15",
                    "credential_url": "https://aws.amazon.com/verification/cert123"
                },
                {
                    "name": "Google Cloud Professional Data Engineer",
                    "issuer": "Google Cloud",
                    "date": "2023-06-01",
                    "credential_url": "https://cloud.google.com/certification/verify/cert456"
                },
                {
                    "name": "Python for Data Science (Deep Learning Specialization)",
                    "issuer": "Coursera - Andrew Ng",
                    "date": "2023-03-10",
                    "credential_url": "https://coursera.org/verify/specialization/cert789"
                }
            ],
            "achievements": [],
            "metadata": {
                "source_type": "profile",
                "version": 1,
                "normalized_at": "2026-05-23T10:58:22.124168+00:00"
            }
        },
        "template_id": "a5b7483b-52fd-4fc2-9527-39daa0f87c53",
        "state": "generated",
        "is_primary": true
    },
    {
        "id": "b3aea88b-5665-4f36-9141-5dea16ce864c",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "title": "Resume - 6/8/2026 (2)",
        "description": "",
        "canonical_json": {
            "personal": {
                "name": "John",
                "email": "viiv4426@gmail.com",
                "phone": "",
                "location": "",
                "linkedin": "",
                "github": "",
                "portfolio": ""
            },
            "professional_summary": "",
            "skills": [
                {
                    "category": "Technical",
                    "items": [
                        "ABC",
                        "BCD"
                    ]
                }
            ],
            "experience": [
                {
                    "company": "rqw",
                    "position": "ew",
                    "duration": {
                        "start": "2026-08-08",
                        "end": "2026-01-06",
                        "current": false
                    },
                    "description": "sadsada",
                    "achievements": []
                }
            ],
            "projects": [],
            "education": [
                {
                    "institution": "ASF",
                    "degree": "ASF",
                    "field": "ASF",
                    "graduation_date": "2026-08-10",
                    "gpa": 10.0,
                    "honors": "ASF"
                }
            ],
            "certifications": [],
            "achievements": [],
            "metadata": {
                "source_type": "profile",
                "version": 1,
                "normalized_at": "2026-06-08T05:28:24.726296+00:00"
            }
        },
        "template_id": "aece2518-5b6c-45b0-8c76-bc8c5edb6037",
        "state": "generated",
        "is_primary": false
    },
    {
        "id": "e07a63b0-19bc-4d4e-93be-de90f3ddee40",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "title": "Resume - 6/8/2026 (1)",
        "description": "",
        "canonical_json": {
            "personal": {
                "name": "John",
                "email": "viiv4426@gmail.com",
                "phone": "",
                "location": "",
                "linkedin": "",
                "github": "",
                "portfolio": ""
            },
            "professional_summary": "",
            "skills": [
                {
                    "category": "Technical",
                    "items": [
                        "ABC",
                        "BCD"
                    ]
                }
            ],
            "experience": [
                {
                    "company": "rqw",
                    "position": "ew",
                    "duration": {
                        "start": "2026-08-08",
                        "end": "2026-01-06",
                        "current": false
                    },
                    "description": "sadsada",
                    "achievements": []
                }
            ],
            "projects": [],
            "education": [
                {
                    "institution": "ASF",
                    "degree": "ASF",
                    "field": "ASF",
                    "graduation_date": "2026-08-10",
                    "gpa": 10.0,
                    "honors": "ASF"
                }
            ],
            "certifications": [],
            "achievements": [],
            "metadata": {
                "source_type": "profile",
                "version": 1,
                "normalized_at": "2026-06-08T05:28:10.683817+00:00"
            }
        },
        "template_id": "a5b7483b-52fd-4fc2-9527-39daa0f87c53",
        "state": "generated",
        "is_primary": false
    },
    {
        "id": "681151f9-2ff2-4b10-95ca-20dc57115dc9",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "title": "Resume - 6/8/2026",
        "description": "",
        "canonical_json": {
            "personal": {
                "name": "John",
                "email": "viiv4426@gmail.com",
                "phone": "",
                "location": "",
                "linkedin": "",
                "github": "",
                "portfolio": ""
            },
            "professional_summary": "",
            "skills": [
                {
                    "category": "Technical",
                    "items": [
                        "ABC",
                        "BCD"
                    ]
                }
            ],
            "experience": [
                {
                    "company": "rqw",
                    "position": "ew",
                    "duration": {
                        "start": "2026-08-08",
                        "end": "2026-01-06",
                        "current": false
                    },
                    "description": "sadsada",
                    "achievements": []
                }
            ],
            "projects": [],
            "education": [
                {
                    "institution": "ASF",
                    "degree": "ASF",
                    "field": "ASF",
                    "graduation_date": "2026-08-10",
                    "gpa": 10.0,
                    "honors": "ASF"
                }
            ],
            "certifications": [],
            "achievements": [],
            "metadata": {
                "source_type": "profile",
                "version": 1,
                "normalized_at": "2026-06-08T05:27:50.354513+00:00"
            }
        },
        "template_id": "5a5094e6-f58f-4dab-a3f0-9596309f2703",
        "state": "generated",
        "is_primary": false
    },
    {
        "id": "10e850b8-baa0-4f1d-b438-33867037b1bb",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "title": "Resume - 6/5/2026",
        "description": "",
        "canonical_json": {
            "personal": {
                "name": "John",
                "email": "viiv4426@gmail.com",
                "phone": "",
                "location": "",
                "linkedin": "",
                "github": "",
                "portfolio": ""
            },
            "professional_summary": "",
            "skills": [
                {
                    "category": "Technical",
                    "items": [
                        "ABC",
                        "BCD"
                    ]
                }
            ],
            "experience": [
                {
                    "company": "rqw",
                    "position": "ew",
                    "duration": {
                        "start": "2026-08-08",
                        "end": "2026-01-06",
                        "current": false
                    },
                    "description": "sadsada",
                    "achievements": []
                }
            ],
            "projects": [],
            "education": [
                {
                    "institution": "ASF",
                    "degree": "ASF",
                    "field": "ASF",
                    "graduation_date": "2026-08-10",
                    "gpa": 10.0,
                    "honors": "ASF"
                }
            ],
            "certifications": [],
            "achievements": [],
            "metadata": {
                "source_type": "profile",
                "version": 1,
                "normalized_at": "2026-06-05T12:59:02.916497+00:00"
            }
        },
        "template_id": "a5b7483b-52fd-4fc2-9527-39daa0f87c53",
        "state": "generated",
        "is_primary": false
    },
    {
        "id": "5251c0b2-990a-4cdf-9dfa-26205c347669",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "title": "Resume - 5/29/2026 (1)",
        "description": "",
        "canonical_json": {
            "personal": {
                "name": "John",
                "email": "viiv4426@gmail.com",
                "phone": "",
                "location": "",
                "linkedin": "",
                "github": "",
                "portfolio": ""
            },
            "professional_summary": "",
            "skills": [
                {
                    "category": "Technical",
                    "items": [
                        "ABC",
                        "BCD"
                    ]
                }
            ],
            "experience": [
                {
                    "company": "rqw",
                    "position": "ew",
                    "duration": {
                        "start": "2026-08-08",
                        "end": "2026-01-06",
                        "current": false
                    },
                    "description": "sadsada",
                    "achievements": []
                }
            ],
            "projects": [],
            "education": [
                {
                    "institution": "ASF",
                    "degree": "ASF",
                    "field": "ASF",
                    "graduation_date": "2026-08-10",
                    "gpa": 10.0,
                    "honors": "ASF"
                }
            ],
            "certifications": [],
            "achievements": [],
            "metadata": {
                "source_type": "profile",
                "version": 1,
                "normalized_at": "2026-05-29T07:06:50.366498+00:00"
            }
        },
        "template_id": "a5b7483b-52fd-4fc2-9527-39daa0f87c53",
        "state": "generated",
        "is_primary": false
    },
    {
        "id": "8260c868-a2c9-4b64-a2e8-22107c946128",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "title": "Resume - 5/29/2026",
        "description": "",
        "canonical_json": {
            "personal": {
                "name": "John",
                "email": "viiv4426@gmail.com",
                "phone": "",
                "location": "",
                "linkedin": "",
                "github": "",
                "portfolio": ""
            },
            "professional_summary": "",
            "skills": [],
            "experience": [
                {
                    "company": "rqw",
                    "position": "ew",
                    "duration": {
                        "start": "2026-08-08",
                        "end": "2026-01-06",
                        "current": false
                    },
                    "description": "sadsada",
                    "achievements": []
                }
            ],
            "projects": [],
            "education": [],
            "certifications": [],
            "achievements": [],
            "metadata": {
                "source_type": "profile",
                "version": 1,
                "normalized_at": "2026-05-29T05:40:39.635190+00:00"
            }
        },
        "template_id": "5a5094e6-f58f-4dab-a3f0-9596309f2703",
        "state": "generated",
        "is_primary": false
    },
    {
        "id": "3d9bf525-7780-41be-ac7d-0f88363c9b27",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "title": "Resume - 5/27/2026",
        "description": "",
        "canonical_json": {
            "personal": {
                "name": "John",
                "email": "viiv4426@gmail.com",
                "phone": "",
                "location": "",
                "linkedin": "",
                "github": "",
                "portfolio": ""
            },
            "professional_summary": "",
            "skills": [],
            "experience": [],
            "projects": [],
            "education": [],
            "certifications": [],
            "achievements": [],
            "metadata": {
                "source_type": "profile",
                "version": 1,
                "normalized_at": "2026-05-27T11:02:09.855728+00:00"
            }
        },
        "template_id": "a5b7483b-52fd-4fc2-9527-39daa0f87c53",
        "state": "generated",
        "is_primary": false
    },
    {
        "id": "fffb7cf9-032d-4e19-985f-6b14ed360422",
        "student_id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "title": "Resume - 5/27/2026",
        "description": "",
        "canonical_json": {
            "personal": {
                "name": "Rahul Sharma",
                "email": "stu001@ilead.edu",
                "phone": "9876543210",
                "location": "Kolkata, India",
                "linkedin": "https://linkedin.com/in/stu001",
                "github": "https://github.com/stu001",
                "portfolio": "https://stu001.dev"
            },
            "professional_summary": "Detail-oriented BCA student with strong fundamentals in Python, Django, and React. Passionate about building real-world web applications.",
            "skills": [
                {
                    "category": "Technical",
                    "items": [
                        "Django",
                        "Python",
                        "React"
                    ]
                }
            ],
            "experience": [],
            "projects": [
                {
                    "title": "Placement Portal",
                    "description": "Role-based placement portal for students and admins.",
                    "technologies": [
                        "Django",
                        "React",
                        "PostgreSQL"
                    ],
                    "link": "https://github.com/shahithkumar/iLEAD-Placment_portal",
                    "date": "2026-05-01"
                }
            ],
            "education": [
                {
                    "institution": "iLEAD",
                    "degree": "Bachelor of Computer Applications",
                    "field": "Computer Applications",
                    "graduation_date": "2026-06-30",
                    "gpa": 8.4,
                    "honors": ""
                }
            ],
            "certifications": [
                {
                    "name": "Python for Everybody",
                    "issuer": "Coursera",
                    "date": "2025-08-15",
                    "credential_url": ""
                }
            ],
            "achievements": [
                {
                    "title": "Top 10 in Internal Hackathon",
                    "issuer": "iLEAD",
                    "date": "2025-11-20",
                    "description": ""
                }
            ],
            "metadata": {
                "source_type": "profile",
                "version": 1,
                "normalized_at": "2026-05-27T10:09:09.557898+00:00"
            }
        },
        "template_id": "a5b7483b-52fd-4fc2-9527-39daa0f87c53",
        "state": "generated",
        "is_primary": false
    },
    {
        "id": "c3a37246-dbaa-47ab-922e-6f6dcff36e12",
        "student_id": "1f80459a-366f-4c05-8a2e-e262b2917cb9",
        "title": "Resume - 5/26/2026 (3)",
        "description": "",
        "canonical_json": {
            "personal": {
                "name": "Demo Student",
                "email": "demo.student@ilead.edu",
                "phone": "+91-98765-43210",
                "location": "Bangalore, India",
                "linkedin": "https://linkedin.com/in/demo-student",
                "github": "https://github.com/demo-student",
                "portfolio": "https://demo-portfolio.com"
            },
            "professional_summary": "Passionate full-stack developer with expertise in building scalable web applications. Strong background in Python, JavaScript, and cloud technologies. Experienced in leading small development teams and mentoring junior developers.",
            "skills": [
                {
                    "category": "Language",
                    "items": [
                        "English",
                        "Hindi"
                    ]
                },
                {
                    "category": "Soft Skill",
                    "items": [
                        "Communication",
                        "Problem Solving",
                        "Team Leadership"
                    ]
                },
                {
                    "category": "Technical",
                    "items": [
                        "AWS",
                        "Django",
                        "Docker",
                        "JavaScript",
                        "PostgreSQL",
                        "Python",
                        "REST APIs",
                        "React"
                    ]
                }
            ],
            "experience": [
                {
                    "company": "TechCorp India",
                    "position": "Senior Software Developer",
                    "duration": {
                        "start": "2023-06-01",
                        "end": null,
                        "current": true
                    },
                    "description": "Led development of customer-facing APIs and microservices using Django and PostgreSQL.",
                    "achievements": [
                        "Reduced API response time by 40% through optimization",
                        "Mentored 3 junior developers",
                        "Implemented CI/CD pipeline using Docker and GitHub Actions"
                    ]
                },
                {
                    "company": "StartupXYZ",
                    "position": "Full Stack Developer",
                    "duration": {
                        "start": "2021-09-01",
                        "end": "2023-05-31",
                        "current": false
                    },
                    "description": "Built and maintained full-stack web applications serving 50k+ users.",
                    "achievements": [
                        "Designed and implemented payment integration module",
                        "Achieved 99.9% uptime for production systems",
                        "Drove adoption of React for frontend development"
                    ]
                },
                {
                    "company": "WebAgency Solutions",
                    "position": "Junior Developer",
                    "duration": {
                        "start": "2020-06-01",
                        "end": "2021-08-31",
                        "current": false
                    },
                    "description": "Developed and maintained client websites and web applications.",
                    "achievements": [
                        "Delivered 15+ successful projects",
                        "Improved code quality through implementation of linting tools",
                        "Collaborated with designers to implement responsive UIs"
                    ]
                }
            ],
            "projects": [
                {
                    "title": "AI-Powered Resume Generator",
                    "description": "Developed an intelligent resume building platform using NLP and machine learning to auto-fill content and optimize for ATS.",
                    "technologies": [
                        "Python",
                        "Django",
                        "React",
                        "PostgreSQL",
                        "TensorFlow",
                        "Celery"
                    ],
                    "link": "https://github.com/demo-student/ai-resume-gen",
                    "date": "2024-01-15"
                },
                {
                    "title": "Real-Time Chat Application",
                    "description": "Built a scalable chat application with real-time messaging using WebSockets and Redis for high performance.",
                    "technologies": [
                        "Node.js",
                        "Socket.io",
                        "React",
                        "MongoDB",
                        "Redis"
                    ],
                    "link": "https://github.com/demo-student/realtime-chat",
                    "date": "2023-08-20"
                },
                {
                    "title": "E-Commerce Platform",
                    "description": "Created a full-featured e-commerce platform with payment integration, inventory management, and analytics dashboard.",
                    "technologies": [
                        "Django",
                        "React",
                        "PostgreSQL",
                        "Stripe",
                        "Celery",
                        "Docker"
                    ],
                    "link": "https://github.com/demo-student/ecommerce-platform",
                    "date": "2023-03-10"
                },
                {
                    "title": "Portfolio Website",
                    "description": "Designed and developed a modern portfolio website showcasing projects and skills with smooth animations.",
                    "technologies": [
                        "React",
                        "Tailwind CSS",
                        "JavaScript",
                        "Vercel"
                    ],
                    "link": "https://demo-portfolio.com",
                    "date": "2022-12-05"
                }
            ],
            "education": [
                {
                    "institution": "National Institute of Technology (NIT), Bangalore",
                    "degree": "Bachelor of Technology",
                    "field": "Computer Science and Engineering",
                    "graduation_date": "2020-05-30",
                    "gpa": 8.2,
                    "honors": "Cum Laude"
                },
                {
                    "institution": "Delhi Public School, Delhi",
                    "degree": "Senior Secondary (12th)",
                    "field": "Science",
                    "graduation_date": "2016-03-31",
                    "gpa": 9.1,
                    "honors": "Merit Certificate"
                }
            ],
            "certifications": [
                {
                    "name": "AWS Certified Solutions Architect - Associate",
                    "issuer": "Amazon Web Services",
                    "date": "2023-09-15",
                    "credential_url": "https://aws.amazon.com/verification/cert123"
                },
                {
                    "name": "Google Cloud Professional Data Engineer",
                    "issuer": "Google Cloud",
                    "date": "2023-06-01",
                    "credential_url": "https://cloud.google.com/certification/verify/cert456"
                },
                {
                    "name": "Python for Data Science (Deep Learning Specialization)",
                    "issuer": "Coursera - Andrew Ng",
                    "date": "2023-03-10",
                    "credential_url": "https://coursera.org/verify/specialization/cert789"
                }
            ],
            "achievements": [],
            "metadata": {
                "source_type": "profile",
                "version": 1,
                "normalized_at": "2026-05-26T07:29:27.650218+00:00"
            }
        },
        "template_id": "a5b7483b-52fd-4fc2-9527-39daa0f87c53",
        "state": "generated",
        "is_primary": false
    },
    {
        "id": "0c421520-caf1-4b83-8a4f-392b42d0172a",
        "student_id": "1f80459a-366f-4c05-8a2e-e262b2917cb9",
        "title": "Resume - 5/26/2026 (2)",
        "description": "",
        "canonical_json": {
            "personal": {
                "name": "Demo Student",
                "email": "demo.student@ilead.edu",
                "phone": "+91-98765-43210",
                "location": "Bangalore, India",
                "linkedin": "https://linkedin.com/in/demo-student",
                "github": "https://github.com/demo-student",
                "portfolio": "https://demo-portfolio.com"
            },
            "professional_summary": "Passionate full-stack developer with expertise in building scalable web applications. Strong background in Python, JavaScript, and cloud technologies. Experienced in leading small development teams and mentoring junior developers.",
            "skills": [
                {
                    "category": "Language",
                    "items": [
                        "English",
                        "Hindi"
                    ]
                },
                {
                    "category": "Soft Skill",
                    "items": [
                        "Communication",
                        "Problem Solving",
                        "Team Leadership"
                    ]
                },
                {
                    "category": "Technical",
                    "items": [
                        "AWS",
                        "Django",
                        "Docker",
                        "JavaScript",
                        "PostgreSQL",
                        "Python",
                        "REST APIs",
                        "React"
                    ]
                }
            ],
            "experience": [
                {
                    "company": "TechCorp India",
                    "position": "Senior Software Developer",
                    "duration": {
                        "start": "2023-06-01",
                        "end": null,
                        "current": true
                    },
                    "description": "Led development of customer-facing APIs and microservices using Django and PostgreSQL.",
                    "achievements": [
                        "Reduced API response time by 40% through optimization",
                        "Mentored 3 junior developers",
                        "Implemented CI/CD pipeline using Docker and GitHub Actions"
                    ]
                },
                {
                    "company": "StartupXYZ",
                    "position": "Full Stack Developer",
                    "duration": {
                        "start": "2021-09-01",
                        "end": "2023-05-31",
                        "current": false
                    },
                    "description": "Built and maintained full-stack web applications serving 50k+ users.",
                    "achievements": [
                        "Designed and implemented payment integration module",
                        "Achieved 99.9% uptime for production systems",
                        "Drove adoption of React for frontend development"
                    ]
                },
                {
                    "company": "WebAgency Solutions",
                    "position": "Junior Developer",
                    "duration": {
                        "start": "2020-06-01",
                        "end": "2021-08-31",
                        "current": false
                    },
                    "description": "Developed and maintained client websites and web applications.",
                    "achievements": [
                        "Delivered 15+ successful projects",
                        "Improved code quality through implementation of linting tools",
                        "Collaborated with designers to implement responsive UIs"
                    ]
                }
            ],
            "projects": [
                {
                    "title": "AI-Powered Resume Generator",
                    "description": "Developed an intelligent resume building platform using NLP and machine learning to auto-fill content and optimize for ATS.",
                    "technologies": [
                        "Python",
                        "Django",
                        "React",
                        "PostgreSQL",
                        "TensorFlow",
                        "Celery"
                    ],
                    "link": "https://github.com/demo-student/ai-resume-gen",
                    "date": "2024-01-15"
                },
                {
                    "title": "Real-Time Chat Application",
                    "description": "Built a scalable chat application with real-time messaging using WebSockets and Redis for high performance.",
                    "technologies": [
                        "Node.js",
                        "Socket.io",
                        "React",
                        "MongoDB",
                        "Redis"
                    ],
                    "link": "https://github.com/demo-student/realtime-chat",
                    "date": "2023-08-20"
                },
                {
                    "title": "E-Commerce Platform",
                    "description": "Created a full-featured e-commerce platform with payment integration, inventory management, and analytics dashboard.",
                    "technologies": [
                        "Django",
                        "React",
                        "PostgreSQL",
                        "Stripe",
                        "Celery",
                        "Docker"
                    ],
                    "link": "https://github.com/demo-student/ecommerce-platform",
                    "date": "2023-03-10"
                },
                {
                    "title": "Portfolio Website",
                    "description": "Designed and developed a modern portfolio website showcasing projects and skills with smooth animations.",
                    "technologies": [
                        "React",
                        "Tailwind CSS",
                        "JavaScript",
                        "Vercel"
                    ],
                    "link": "https://demo-portfolio.com",
                    "date": "2022-12-05"
                }
            ],
            "education": [
                {
                    "institution": "National Institute of Technology (NIT), Bangalore",
                    "degree": "Bachelor of Technology",
                    "field": "Computer Science and Engineering",
                    "graduation_date": "2020-05-30",
                    "gpa": 8.2,
                    "honors": "Cum Laude"
                },
                {
                    "institution": "Delhi Public School, Delhi",
                    "degree": "Senior Secondary (12th)",
                    "field": "Science",
                    "graduation_date": "2016-03-31",
                    "gpa": 9.1,
                    "honors": "Merit Certificate"
                }
            ],
            "certifications": [
                {
                    "name": "AWS Certified Solutions Architect - Associate",
                    "issuer": "Amazon Web Services",
                    "date": "2023-09-15",
                    "credential_url": "https://aws.amazon.com/verification/cert123"
                },
                {
                    "name": "Google Cloud Professional Data Engineer",
                    "issuer": "Google Cloud",
                    "date": "2023-06-01",
                    "credential_url": "https://cloud.google.com/certification/verify/cert456"
                },
                {
                    "name": "Python for Data Science (Deep Learning Specialization)",
                    "issuer": "Coursera - Andrew Ng",
                    "date": "2023-03-10",
                    "credential_url": "https://coursera.org/verify/specialization/cert789"
                }
            ],
            "achievements": [],
            "metadata": {
                "source_type": "profile",
                "version": 1,
                "normalized_at": "2026-05-26T07:28:45.480369+00:00"
            }
        },
        "template_id": "5a5094e6-f58f-4dab-a3f0-9596309f2703",
        "state": "generated",
        "is_primary": false
    },
    {
        "id": "12fdf344-9bdf-4b3e-8c25-7b44ca6ebece",
        "student_id": "1f80459a-366f-4c05-8a2e-e262b2917cb9",
        "title": "Resume - 5/26/2026 (1)",
        "description": "",
        "canonical_json": {
            "personal": {
                "name": "Demo Student",
                "email": "demo.student@ilead.edu",
                "phone": "+91-98765-43210",
                "location": "Bangalore, India",
                "linkedin": "https://linkedin.com/in/demo-student",
                "github": "https://github.com/demo-student",
                "portfolio": "https://demo-portfolio.com"
            },
            "professional_summary": "Passionate full-stack developer with expertise in building scalable web applications. Strong background in Python, JavaScript, and cloud technologies. Experienced in leading small development teams and mentoring junior developers.",
            "skills": [
                {
                    "category": "Language",
                    "items": [
                        "English",
                        "Hindi"
                    ]
                },
                {
                    "category": "Soft Skill",
                    "items": [
                        "Communication",
                        "Problem Solving",
                        "Team Leadership"
                    ]
                },
                {
                    "category": "Technical",
                    "items": [
                        "AWS",
                        "Django",
                        "Docker",
                        "JavaScript",
                        "PostgreSQL",
                        "Python",
                        "REST APIs",
                        "React"
                    ]
                }
            ],
            "experience": [
                {
                    "company": "TechCorp India",
                    "position": "Senior Software Developer",
                    "duration": {
                        "start": "2023-06-01",
                        "end": null,
                        "current": true
                    },
                    "description": "Led development of customer-facing APIs and microservices using Django and PostgreSQL.",
                    "achievements": [
                        "Reduced API response time by 40% through optimization",
                        "Mentored 3 junior developers",
                        "Implemented CI/CD pipeline using Docker and GitHub Actions"
                    ]
                },
                {
                    "company": "StartupXYZ",
                    "position": "Full Stack Developer",
                    "duration": {
                        "start": "2021-09-01",
                        "end": "2023-05-31",
                        "current": false
                    },
                    "description": "Built and maintained full-stack web applications serving 50k+ users.",
                    "achievements": [
                        "Designed and implemented payment integration module",
                        "Achieved 99.9% uptime for production systems",
                        "Drove adoption of React for frontend development"
                    ]
                },
                {
                    "company": "WebAgency Solutions",
                    "position": "Junior Developer",
                    "duration": {
                        "start": "2020-06-01",
                        "end": "2021-08-31",
                        "current": false
                    },
                    "description": "Developed and maintained client websites and web applications.",
                    "achievements": [
                        "Delivered 15+ successful projects",
                        "Improved code quality through implementation of linting tools",
                        "Collaborated with designers to implement responsive UIs"
                    ]
                }
            ],
            "projects": [
                {
                    "title": "AI-Powered Resume Generator",
                    "description": "Developed an intelligent resume building platform using NLP and machine learning to auto-fill content and optimize for ATS.",
                    "technologies": [
                        "Python",
                        "Django",
                        "React",
                        "PostgreSQL",
                        "TensorFlow",
                        "Celery"
                    ],
                    "link": "https://github.com/demo-student/ai-resume-gen",
                    "date": "2024-01-15"
                },
                {
                    "title": "Real-Time Chat Application",
                    "description": "Built a scalable chat application with real-time messaging using WebSockets and Redis for high performance.",
                    "technologies": [
                        "Node.js",
                        "Socket.io",
                        "React",
                        "MongoDB",
                        "Redis"
                    ],
                    "link": "https://github.com/demo-student/realtime-chat",
                    "date": "2023-08-20"
                },
                {
                    "title": "E-Commerce Platform",
                    "description": "Created a full-featured e-commerce platform with payment integration, inventory management, and analytics dashboard.",
                    "technologies": [
                        "Django",
                        "React",
                        "PostgreSQL",
                        "Stripe",
                        "Celery",
                        "Docker"
                    ],
                    "link": "https://github.com/demo-student/ecommerce-platform",
                    "date": "2023-03-10"
                },
                {
                    "title": "Portfolio Website",
                    "description": "Designed and developed a modern portfolio website showcasing projects and skills with smooth animations.",
                    "technologies": [
                        "React",
                        "Tailwind CSS",
                        "JavaScript",
                        "Vercel"
                    ],
                    "link": "https://demo-portfolio.com",
                    "date": "2022-12-05"
                }
            ],
            "education": [
                {
                    "institution": "National Institute of Technology (NIT), Bangalore",
                    "degree": "Bachelor of Technology",
                    "field": "Computer Science and Engineering",
                    "graduation_date": "2020-05-30",
                    "gpa": 8.2,
                    "honors": "Cum Laude"
                },
                {
                    "institution": "Delhi Public School, Delhi",
                    "degree": "Senior Secondary (12th)",
                    "field": "Science",
                    "graduation_date": "2016-03-31",
                    "gpa": 9.1,
                    "honors": "Merit Certificate"
                }
            ],
            "certifications": [
                {
                    "name": "AWS Certified Solutions Architect - Associate",
                    "issuer": "Amazon Web Services",
                    "date": "2023-09-15",
                    "credential_url": "https://aws.amazon.com/verification/cert123"
                },
                {
                    "name": "Google Cloud Professional Data Engineer",
                    "issuer": "Google Cloud",
                    "date": "2023-06-01",
                    "credential_url": "https://cloud.google.com/certification/verify/cert456"
                },
                {
                    "name": "Python for Data Science (Deep Learning Specialization)",
                    "issuer": "Coursera - Andrew Ng",
                    "date": "2023-03-10",
                    "credential_url": "https://coursera.org/verify/specialization/cert789"
                }
            ],
            "achievements": [],
            "metadata": {
                "source_type": "profile",
                "version": 1,
                "normalized_at": "2026-05-26T06:37:31.571070+00:00"
            }
        },
        "template_id": "aece2518-5b6c-45b0-8c76-bc8c5edb6037",
        "state": "generated",
        "is_primary": false
    },
    {
        "id": "d30aa35e-b3db-4483-85ae-402bff36c11a",
        "student_id": "1f80459a-366f-4c05-8a2e-e262b2917cb9",
        "title": "Resume - 5/26/2026",
        "description": "",
        "canonical_json": {
            "personal": {
                "name": "Demo Student",
                "email": "demo.student@ilead.edu",
                "phone": "+91-98765-43210",
                "location": "Bangalore, India",
                "linkedin": "https://linkedin.com/in/demo-student",
                "github": "https://github.com/demo-student",
                "portfolio": "https://demo-portfolio.com"
            },
            "professional_summary": "Passionate full-stack developer with expertise in building scalable web applications. Strong background in Python, JavaScript, and cloud technologies. Experienced in leading small development teams and mentoring junior developers.",
            "skills": [
                {
                    "category": "Language",
                    "items": [
                        "English",
                        "Hindi"
                    ]
                },
                {
                    "category": "Soft Skill",
                    "items": [
                        "Communication",
                        "Problem Solving",
                        "Team Leadership"
                    ]
                },
                {
                    "category": "Technical",
                    "items": [
                        "AWS",
                        "Django",
                        "Docker",
                        "JavaScript",
                        "PostgreSQL",
                        "Python",
                        "REST APIs",
                        "React"
                    ]
                }
            ],
            "experience": [
                {
                    "company": "TechCorp India",
                    "position": "Senior Software Developer",
                    "duration": {
                        "start": "2023-06-01",
                        "end": null,
                        "current": true
                    },
                    "description": "Led development of customer-facing APIs and microservices using Django and PostgreSQL.",
                    "achievements": [
                        "Reduced API response time by 40% through optimization",
                        "Mentored 3 junior developers",
                        "Implemented CI/CD pipeline using Docker and GitHub Actions"
                    ]
                },
                {
                    "company": "StartupXYZ",
                    "position": "Full Stack Developer",
                    "duration": {
                        "start": "2021-09-01",
                        "end": "2023-05-31",
                        "current": false
                    },
                    "description": "Built and maintained full-stack web applications serving 50k+ users.",
                    "achievements": [
                        "Designed and implemented payment integration module",
                        "Achieved 99.9% uptime for production systems",
                        "Drove adoption of React for frontend development"
                    ]
                },
                {
                    "company": "WebAgency Solutions",
                    "position": "Junior Developer",
                    "duration": {
                        "start": "2020-06-01",
                        "end": "2021-08-31",
                        "current": false
                    },
                    "description": "Developed and maintained client websites and web applications.",
                    "achievements": [
                        "Delivered 15+ successful projects",
                        "Improved code quality through implementation of linting tools",
                        "Collaborated with designers to implement responsive UIs"
                    ]
                }
            ],
            "projects": [
                {
                    "title": "AI-Powered Resume Generator",
                    "description": "Developed an intelligent resume building platform using NLP and machine learning to auto-fill content and optimize for ATS.",
                    "technologies": [
                        "Python",
                        "Django",
                        "React",
                        "PostgreSQL",
                        "TensorFlow",
                        "Celery"
                    ],
                    "link": "https://github.com/demo-student/ai-resume-gen",
                    "date": "2024-01-15"
                },
                {
                    "title": "Real-Time Chat Application",
                    "description": "Built a scalable chat application with real-time messaging using WebSockets and Redis for high performance.",
                    "technologies": [
                        "Node.js",
                        "Socket.io",
                        "React",
                        "MongoDB",
                        "Redis"
                    ],
                    "link": "https://github.com/demo-student/realtime-chat",
                    "date": "2023-08-20"
                },
                {
                    "title": "E-Commerce Platform",
                    "description": "Created a full-featured e-commerce platform with payment integration, inventory management, and analytics dashboard.",
                    "technologies": [
                        "Django",
                        "React",
                        "PostgreSQL",
                        "Stripe",
                        "Celery",
                        "Docker"
                    ],
                    "link": "https://github.com/demo-student/ecommerce-platform",
                    "date": "2023-03-10"
                },
                {
                    "title": "Portfolio Website",
                    "description": "Designed and developed a modern portfolio website showcasing projects and skills with smooth animations.",
                    "technologies": [
                        "React",
                        "Tailwind CSS",
                        "JavaScript",
                        "Vercel"
                    ],
                    "link": "https://demo-portfolio.com",
                    "date": "2022-12-05"
                }
            ],
            "education": [
                {
                    "institution": "National Institute of Technology (NIT), Bangalore",
                    "degree": "Bachelor of Technology",
                    "field": "Computer Science and Engineering",
                    "graduation_date": "2020-05-30",
                    "gpa": 8.2,
                    "honors": "Cum Laude"
                },
                {
                    "institution": "Delhi Public School, Delhi",
                    "degree": "Senior Secondary (12th)",
                    "field": "Science",
                    "graduation_date": "2016-03-31",
                    "gpa": 9.1,
                    "honors": "Merit Certificate"
                }
            ],
            "certifications": [
                {
                    "name": "AWS Certified Solutions Architect - Associate",
                    "issuer": "Amazon Web Services",
                    "date": "2023-09-15",
                    "credential_url": "https://aws.amazon.com/verification/cert123"
                },
                {
                    "name": "Google Cloud Professional Data Engineer",
                    "issuer": "Google Cloud",
                    "date": "2023-06-01",
                    "credential_url": "https://cloud.google.com/certification/verify/cert456"
                },
                {
                    "name": "Python for Data Science (Deep Learning Specialization)",
                    "issuer": "Coursera - Andrew Ng",
                    "date": "2023-03-10",
                    "credential_url": "https://coursera.org/verify/specialization/cert789"
                }
            ],
            "achievements": [],
            "metadata": {
                "source_type": "profile",
                "version": 1,
                "normalized_at": "2026-05-26T06:37:06.229839+00:00"
            }
        },
        "template_id": "a5b7483b-52fd-4fc2-9527-39daa0f87c53",
        "state": "generated",
        "is_primary": false
    },
    {
        "id": "d3afebfb-3040-4660-b99f-3bf6578067bd",
        "student_id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "title": "Resume - 5/25/2026 (2)",
        "description": "",
        "canonical_json": {
            "personal": {
                "name": "Rahul Sharma",
                "email": "stu001@ilead.edu",
                "phone": "9876543210",
                "location": "Kolkata, India",
                "linkedin": "https://linkedin.com/in/stu001",
                "github": "https://github.com/stu001",
                "portfolio": "https://stu001.dev"
            },
            "professional_summary": "Detail-oriented BCA student with strong fundamentals in Python, Django, and React. Passionate about building real-world web applications.",
            "skills": [
                {
                    "category": "Technical",
                    "items": [
                        "Django",
                        "Python",
                        "React"
                    ]
                }
            ],
            "experience": [],
            "projects": [
                {
                    "title": "Placement Portal",
                    "description": "Role-based placement portal for students and admins.",
                    "technologies": [
                        "Django",
                        "React",
                        "PostgreSQL"
                    ],
                    "link": "https://github.com/shahithkumar/iLEAD-Placment_portal",
                    "date": "2026-05-01"
                }
            ],
            "education": [
                {
                    "institution": "iLEAD",
                    "degree": "Bachelor of Computer Applications",
                    "field": "Computer Applications",
                    "graduation_date": "2026-06-30",
                    "gpa": 8.4,
                    "honors": ""
                }
            ],
            "certifications": [
                {
                    "name": "Python for Everybody",
                    "issuer": "Coursera",
                    "date": "2025-08-15",
                    "credential_url": ""
                }
            ],
            "achievements": [
                {
                    "title": "Top 10 in Internal Hackathon",
                    "issuer": "iLEAD",
                    "date": "2025-11-20",
                    "description": ""
                }
            ],
            "metadata": {
                "source_type": "profile",
                "version": 1,
                "normalized_at": "2026-05-25T12:01:23.196817+00:00"
            }
        },
        "template_id": "aece2518-5b6c-45b0-8c76-bc8c5edb6037",
        "state": "generated",
        "is_primary": false
    },
    {
        "id": "0c44203c-f269-423a-9da3-9a46e3d7f9f7",
        "student_id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "title": "Resume - 5/25/2026 (1)",
        "description": "",
        "canonical_json": {
            "personal": {
                "name": "Rahul Sharma",
                "email": "stu001@ilead.edu",
                "phone": "9876543210",
                "location": "Kolkata, India",
                "linkedin": "https://linkedin.com/in/stu001",
                "github": "https://github.com/stu001",
                "portfolio": "https://stu001.dev"
            },
            "professional_summary": "Detail-oriented BCA student with strong fundamentals in Python, Django, and React. Passionate about building real-world web applications.",
            "skills": [
                {
                    "category": "Technical",
                    "items": [
                        "Django",
                        "Python",
                        "React"
                    ]
                }
            ],
            "experience": [],
            "projects": [
                {
                    "title": "Placement Portal",
                    "description": "Role-based placement portal for students and admins.",
                    "technologies": [
                        "Django",
                        "React",
                        "PostgreSQL"
                    ],
                    "link": "https://github.com/shahithkumar/iLEAD-Placment_portal",
                    "date": "2026-05-01"
                }
            ],
            "education": [
                {
                    "institution": "iLEAD",
                    "degree": "Bachelor of Computer Applications",
                    "field": "Computer Applications",
                    "graduation_date": "2026-06-30",
                    "gpa": 8.4,
                    "honors": ""
                }
            ],
            "certifications": [
                {
                    "name": "Python for Everybody",
                    "issuer": "Coursera",
                    "date": "2025-08-15",
                    "credential_url": ""
                }
            ],
            "achievements": [
                {
                    "title": "Top 10 in Internal Hackathon",
                    "issuer": "iLEAD",
                    "date": "2025-11-20",
                    "description": ""
                }
            ],
            "metadata": {
                "source_type": "profile",
                "version": 1,
                "normalized_at": "2026-05-25T12:00:44.380787+00:00"
            }
        },
        "template_id": "5a5094e6-f58f-4dab-a3f0-9596309f2703",
        "state": "generated",
        "is_primary": false
    },
    {
        "id": "ad03e4f3-8d18-43fe-b791-3c21c828716e",
        "student_id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "title": "Resume - 5/25/2026",
        "description": "",
        "canonical_json": {
            "personal": {
                "name": "Rahul Sharma",
                "email": "stu001@ilead.edu",
                "phone": "9876543210",
                "location": "Kolkata, India",
                "linkedin": "https://linkedin.com/in/stu001",
                "github": "https://github.com/stu001",
                "portfolio": "https://stu001.dev"
            },
            "professional_summary": "Detail-oriented BCA student with strong fundamentals in Python, Django, and React. Passionate about building real-world web applications.",
            "skills": [
                {
                    "category": "Technical",
                    "items": [
                        "Django",
                        "Python",
                        "React"
                    ]
                }
            ],
            "experience": [],
            "projects": [
                {
                    "title": "Placement Portal",
                    "description": "Role-based placement portal for students and admins.",
                    "technologies": [
                        "Django",
                        "React",
                        "PostgreSQL"
                    ],
                    "link": "https://github.com/shahithkumar/iLEAD-Placment_portal",
                    "date": "2026-05-01"
                }
            ],
            "education": [
                {
                    "institution": "iLEAD",
                    "degree": "Bachelor of Computer Applications",
                    "field": "Computer Applications",
                    "graduation_date": "2026-06-30",
                    "gpa": 8.4,
                    "honors": ""
                }
            ],
            "certifications": [
                {
                    "name": "Python for Everybody",
                    "issuer": "Coursera",
                    "date": "2025-08-15",
                    "credential_url": ""
                }
            ],
            "achievements": [
                {
                    "title": "Top 10 in Internal Hackathon",
                    "issuer": "iLEAD",
                    "date": "2025-11-20",
                    "description": ""
                }
            ],
            "metadata": {
                "source_type": "profile",
                "version": 1,
                "normalized_at": "2026-05-25T11:48:47.634677+00:00"
            }
        },
        "template_id": "a5b7483b-52fd-4fc2-9527-39daa0f87c53",
        "state": "generated",
        "is_primary": false
    }
]''')

PLACEMENTS = json.loads(r'''[
    {
        "id": "61740b25-e8c8-4ceb-b83f-ab8944129c47",
        "company_name": "Globex Corp",
        "position": "Graduate Trainee",
        "salary": "4.20",
        "description": "Campus hiring drive for fresh graduates.",
        "required_cgpa": 6.5,
        "eligible_courses": "BCA,MCA",
        "eligible_semesters": "6",
        "application_deadline": "2026-06-15T06:57:07.603730+00:00",
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    }
]''')
PLACEMENT_ASSIGNMENTS = json.loads(r'''[
    {
        "id": "c9d975e0-1b07-4298-a7a4-c04d5ad9e785",
        "placement_id": "61740b25-e8c8-4ceb-b83f-ab8944129c47",
        "student_id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "assigned_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84",
        "status": "assigned"
    }
]''')

JOBS = json.loads(r'''[
    {
        "id": "08dc36dc-f8ef-4634-a7c8-01f3f62a8ebe",
        "company_name": "Eastern Finance",
        "company_website": null,
        "role": "HR Intern",
        "description": "Gain hands-on experience in recruiting, employee onboarding, database management, and payroll processes. Perfect opportunity for BBA HR students.",
        "package": "0.00",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "C",
        "openings_count": 2,
        "hr_email": "hr@easternfinance.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA",
                "BBA in Sports Management (BBA SM)",
                "BBA in Hospital Management (BBA HM)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.588385+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "aec46728-7990-4bfe-b369-495880ce14b6",
        "company_name": "Alliance Vission",
        "company_website": null,
        "role": "Digital Marketing, Sales, HR & Analytics Interns",
        "description": "Join our dynamic team for multifaceted exposure across Digital Marketing campaigns, Sales pipelines, Human Resources support, and Business Analytics dashboards. Academic credit/stipend up to \u20b910,000.",
        "package": "1.20",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@alliancevission.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA",
                "BBA in Digital Marketing (BBA DM)",
                "BBA in Entrepreneurship (BBA ENT)",
                "BSc in Data Science",
                "BSc in Computer Application (BCA)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.608660+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "e37d79d9-934a-4a14-82d2-897dce8115a0",
        "company_name": "SVF",
        "company_website": null,
        "role": "Summer Internship (Media & Management)",
        "description": "Premium summer internship at one of Eastern India's leading entertainment conglomerates. Work across movie production support, event execution, and content marketing operations.",
        "package": "0.48",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "A",
        "openings_count": 2,
        "hr_email": "hr@svf.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Media Science (BMS)",
                "MSc in Media Science",
                "BSc in Film and Television Production (FTP)",
                "BBA"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.625837+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "31d3dcf3-a2d5-4c81-964b-f9472d064d60",
        "company_name": "Kolkata TV",
        "company_website": null,
        "role": "Anchor cum Digital Desk Executive",
        "description": "Seeking energetic hosts and scriptwriters. Responsibility includes anchoring regional news broadcasts, managing digital news desks, and curating viral social media summaries.",
        "package": "0.60",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@kolkatatv.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Media Science (BMS)",
                "MSc in Media Science",
                "BSc in Film and Television Production (FTP)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.644118+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "5888a482-88c5-4b8b-99b7-95b2da766048",
        "company_name": "Mould Innovation",
        "company_website": null,
        "role": "Junior Data & Operations Analyst",
        "description": "Manage database records, analyze daily operations KPIs, and prepare performance dashboards. Requires high proficiency in Excel and basic data management concepts.",
        "package": "0.36",
        "location": "Kolkata (On-site)",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "C",
        "openings_count": 2,
        "hr_email": "hr@mouldinnovation.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Data Science",
                "BSc in Computer Application (BCA)",
                "BBA"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.660113+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "4fe11c00-b5f2-411a-b470-527d2ff943c1",
        "company_name": "Haldiram",
        "company_website": null,
        "role": "Data Analyst & Inventory Management Intern",
        "description": "Excellent opportunity to learn Supply Chain and Inventory operations at a massive food product brand. Track stock levels, analyze logistical blockages, and build supply-chain spreadsheets.",
        "package": "0.48",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@haldiram.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA",
                "BSc in Data Science",
                "BSc in Computer Application (BCA)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.676588+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "51dea571-d281-4366-a21b-a91bfb51d171",
        "company_name": "NBNS News",
        "company_website": null,
        "role": "Anchor / Journalist Trainee",
        "description": "Ground reporting, telecast anchoring, and digital script editing. Candidate must have outstanding command over local regional languages and strong on-camera confidence.",
        "package": "0.84",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@nbnsnews.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Media Science (BMS)",
                "MSc in Media Science"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.693853+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "834cb8e4-3632-4d81-80ff-a8edd54a2b9e",
        "company_name": "South City Mall",
        "company_website": null,
        "role": "Operations & Facility Management Trainee",
        "description": "Join the operations desk at one of Kolkata's premier shopping hubs. Assist in vendor relations, footfall analysis, event scheduling, and general administration.",
        "package": "0.60",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "C",
        "openings_count": 2,
        "hr_email": "hr@southcitymall.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA",
                "BBA in Sports Management (BBA SM)",
                "BBA in Entrepreneurship (BBA ENT)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.711948+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "eac2e510-0b09-4c20-b4ec-2a6758b91aea",
        "company_name": "StoryNest Communications",
        "company_website": null,
        "role": "PR and Communications Intern",
        "description": "Design creative press releases, handle corporate newsletters, build media relation lists, and support brand strategy workshops for retail clients.",
        "package": "0.00",
        "location": "Remote / Kolkata",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "C",
        "openings_count": 2,
        "hr_email": "hr@storynestcommunications.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Media Science (BMS)",
                "MSc in Media Science",
                "BBA in Digital Marketing (BBA DM)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.728090+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "cc767efb-3654-4bd4-8a9e-3dcae1f16bf2",
        "company_name": "Times of Bengal",
        "company_website": null,
        "role": "Content Writing & Photography Trainee",
        "description": "Learn professional journalism, copy drafting, court news summarization, photography, and live event reporting. Highly dynamic work environment.",
        "package": "0.00",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "C",
        "openings_count": 2,
        "hr_email": "hr@timesofbengal.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Media Science (BMS)",
                "MSc in Media Science",
                "BSc in Film and Television Production (FTP)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.744175+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "525ec0b4-c1be-42d4-9783-96e8c433fccc",
        "company_name": "HCG Hospital",
        "company_website": null,
        "role": "Healthcare Administrator Trainee",
        "description": "Support ICU administration desks, front desk patient relations, medical documentation, and healthcare logistics. Excellent launchpad for healthcare administration careers.",
        "package": "0.00",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@hcghospital.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA in Hospital Management (BBA HM)",
                "BSc in Critical Care Technology (CCT)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.762905+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "e9467774-dd90-42a0-af07-84494d83cdef",
        "company_name": "Kaarrayam Realty",
        "company_website": null,
        "role": "Real Estate Operations Trainee",
        "description": "Handle client relationship management dashboards, property inspection schedules, customer feedback, and basic marketing campaigns for residential projects.",
        "package": "0.00",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "C",
        "openings_count": 2,
        "hr_email": "hr@kaarrayamrealty.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA",
                "BBA in Entrepreneurship (BBA ENT)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.782403+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "847e1f05-c102-4766-81bf-44aa8b5043a6",
        "company_name": "Deal Squard",
        "company_website": null,
        "role": "Business Development & Client Management Intern",
        "description": "Assisting the sales pipeline, qualifying retail leads, drafting custom B2B proposals, and coordinating merchant-support accounts.",
        "package": "0.00",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "C",
        "openings_count": 2,
        "hr_email": "hr@dealsquard.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA",
                "BBA in Entrepreneurship (BBA ENT)",
                "BBA in Digital Marketing (BBA DM)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.801190+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "4246b6d9-c7c0-4e69-8ca5-82fb9010a6d0",
        "company_name": "Manipal Hospital",
        "company_website": null,
        "role": "Hospital Operations Executive",
        "description": "Undertake responsibility for emergency-care coordination, billing pipelines, diagnostic scheduling, and patient relation logs at a premier multi-specialty facility.",
        "package": "0.00",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "A",
        "openings_count": 2,
        "hr_email": "hr@manipalhospital.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA in Hospital Management (BBA HM)",
                "BSc in Critical Care Technology (CCT)",
                "BSc in Medical Laboratory Technology (BMLT)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.821694+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "0561f9b4-f6bb-4587-9258-d93a08a6c80b",
        "company_name": "Diamond Beverages Pvt Ltd (Coca-Cola)",
        "company_website": null,
        "role": "Frontline Sales Executive",
        "description": "Manage retail distribution points, evaluate distributor stock levels, and pitch promotions directly. Stipend includes competitive sales incentive commissions + \u20b92,500 fuel allowances.",
        "package": "1.20",
        "location": "Kolkata Outskirts",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@diamondbeveragespvtltd(coca-cola).com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA",
                "BBA in Entrepreneurship (BBA ENT)",
                "BBA in Sports Management (BBA SM)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.835749+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "72103daf-0fb3-4682-940d-5fd0686212bb",
        "company_name": "Senco Gold & Diamonds",
        "company_website": null,
        "role": "Market Research Analyst",
        "description": "Conduct brand-awareness surveys, perform competitor retail benchmarking, and construct comprehensive customer-buying trends spreadsheets.",
        "package": "0.84",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@sencogold&diamonds.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA",
                "BBA in Digital Marketing (BBA DM)",
                "BSc in Data Science"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.852032+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "504c7fd7-263f-492b-8c5a-8bff4a65a7f1",
        "company_name": "HVAC",
        "company_website": null,
        "role": "Graphic Designer Intern",
        "description": "Design stellar commercial brochures, corporate presentations, social banners, and layout prints. Experience in Adobe Photoshop/Illustrator is highly preferred.",
        "package": "1.08",
        "location": "Kolkata (On-site)",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@hvac.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)",
                "BSc in Interior Design"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.868400+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "8c6c90f3-386c-4d94-8a31-6c6f2ec04f90",
        "company_name": "SITI Network",
        "company_website": null,
        "role": "Marketing Field Trainee",
        "description": "Execute offline customer surveys, drive local advertisement activations, manage retail cable partner signups, and evaluate local broadcast feedback.",
        "package": "0.00",
        "location": "Kolkata Districts",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "C",
        "openings_count": 2,
        "hr_email": "hr@sitinetwork.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA",
                "BBA in Digital Marketing (BBA DM)",
                "BSc in Media Science (BMS)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.884455+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "beb6c9f8-8187-4437-ae19-1a84154e1f6d",
        "company_name": "Recex",
        "company_website": null,
        "role": "HR Sourcing Intern",
        "description": "Screen applicant profiles across job portals, schedule virtual technical interviews, compile recruiter feedback logs, and assist in college campus hiring campaigns.",
        "package": "0.60",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "C",
        "openings_count": 2,
        "hr_email": "hr@recex.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA",
                "BBA in Hospital Management (BBA HM)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.900608+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "570dc6ca-f7b7-4b92-a2b4-c4733b29964d",
        "company_name": "Mould Innovation",
        "company_website": null,
        "role": "Graphic Design Associate",
        "description": "Deliver modern interface assets, advertising banner sets, promotional visual aids, and product package print alignments.",
        "package": "0.48",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "C",
        "openings_count": 2,
        "hr_email": "hr@mouldinnovation.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.914610+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "ee76d02c-e3df-42e8-8f09-b273f7733a95",
        "company_name": "Cubic HR",
        "company_website": null,
        "role": "HR Recruiter & Marketing Intern",
        "description": "Dual profile focusing on candidate sourcing pipelines and corporate-brand LinkedIn promotion. Offers valuable agency-side recruitment environment exposure.",
        "package": "0.33",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "C",
        "openings_count": 2,
        "hr_email": "hr@cubichr.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA",
                "BBA in Digital Marketing (BBA DM)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.928097+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "bc6b634f-bc8b-4178-b0e1-c000d9a64ebb",
        "company_name": "Shopper Stop",
        "company_website": null,
        "role": "Retail Operations Associate (HR/Sales)",
        "description": "Support store hiring operations, floor manager coordination, retail branding promotions, and customer relations management in our premier Kolkata stores.",
        "package": "0.00",
        "location": "Kolkata Mall Outlets",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@shopperstop.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA",
                "BBA in Entrepreneurship (BBA ENT)",
                "BSc in Sustainable Fashion Design & Management"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.945216+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "475ec410-afeb-4457-97b4-93960515e9b4",
        "company_name": "Voice TV",
        "company_website": null,
        "role": "Broadcast Journalist Intern",
        "description": "Learn rapid regional script curation, dynamic audio overlays, live telemetry report logs, and teleprompter read strategies under expert guidance.",
        "package": "0.00",
        "location": "Kolkata Studio",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "C",
        "openings_count": 2,
        "hr_email": "hr@voicetv.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Media Science (BMS)",
                "MSc in Media Science",
                "BSc in Film and Television Production (FTP)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.959630+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "a316edb7-000a-4db6-bab5-6c64a8251cba",
        "company_name": "Instruck Design Studio",
        "company_website": null,
        "role": "Creative Graphic & Content Intern",
        "description": "Work in an architecture & interior studio. Build stunning portfolio catalog pages, write design descriptions, and handle social media visuals.",
        "package": "0.00",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@instruckdesignstudio.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Interior Design",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "BSc in Media Science (BMS)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.972660+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "93ebda4d-7920-4abe-84ca-321017fbc0ac",
        "company_name": "The Baklava Box",
        "company_website": null,
        "role": "E-Commerce Marketing Intern",
        "description": "Support luxury product packaging design, catalog uploads on Amazon/Shopify, social promotion designs, and tracking dispatch logistics operations.",
        "package": "0.84",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@thebaklavabox.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA in Digital Marketing (BBA DM)",
                "BBA in Entrepreneurship (BBA ENT)",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.986065+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "6e76b92e-2944-4139-8446-61c4e52acc61",
        "company_name": "Shyamoli Paribahn",
        "company_website": null,
        "role": "Social Media Coordinator & Designer",
        "description": "Establish digital travel engagement templates, design schedule banners, track online customer bookings, and run localized Meta promotion setups.",
        "package": "1.20",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@shyamoliparibahn.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA in Travel & Tourism Management (BBA TTM)",
                "BBA in Digital Marketing (BBA DM)",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:49.999501+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "b74d6d7d-a7af-41f2-90fa-b05b899406cd",
        "company_name": "Kolaz Infotainment",
        "company_website": null,
        "role": "Client Servicing & Graphic Intern",
        "description": "Coordinate premium entertainment account briefs, outline video specifications, support digital design requirements, and build project roadmaps.",
        "package": "0.00",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@kolazinfotainment.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Media Science (BMS)",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "BSc in Film and Television Production (FTP)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:50.012259+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "a1593ff3-2b8c-4eff-ab27-adfc56823e9b",
        "company_name": "MCK Group",
        "company_website": null,
        "role": "Field Marketing Intern",
        "description": "Support institutional corporate sales campaigns, prepare customer brochures, compile CRM spreadsheets, and arrange local promotions. Travel allowance provided.",
        "package": "0.60",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "C",
        "openings_count": 2,
        "hr_email": "hr@mckgroup.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA",
                "BBA in Entrepreneurship (BBA ENT)",
                "BBA in Sports Management (BBA SM)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:50.026241+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "f9e5981e-15eb-4a4e-a23a-8c6c7eadf677",
        "company_name": "Kolkata TV Digital",
        "company_website": null,
        "role": "Video Editor & Digital Desk Executive",
        "description": "Perform high-speed news cuts, generate subtitles, apply color filters, and manage live digital telemetry dashboards.",
        "package": "0.66",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@kolkatatvdigital.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Film and Television Production (FTP)",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "BSc in Media Science (BMS)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:50.041016+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "db3a0b9d-414f-462b-93e9-9e6e5f5c0775",
        "company_name": "Animatrix Multimedia",
        "company_website": null,
        "role": "Video Editing & VFX Intern",
        "description": "Refine premium broadcast promo spots, arrange chroma key overlays, align background audio channels, and learn professional timeline workflows.",
        "package": "0.72",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "A",
        "openings_count": 2,
        "hr_email": "hr@animatrixmultimedia.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)",
                "BSc in Film and Television Production (FTP)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:50.054733+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "eaa24a23-b09c-4834-8e1b-20a4ae2b3e62",
        "company_name": "CloudHouse Animation Studios Pvt.",
        "company_website": null,
        "role": "2D / 3D Animation Intern",
        "description": "Assist in building character walk cycles, rigging vector components, drafting vector storyboard pages, and render optimization checks.",
        "package": "0.00",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "A",
        "openings_count": 2,
        "hr_email": "hr@cloudhouseanimationstudiospvt.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:50.068041+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "f40d1717-4e86-494f-bc09-8a92a07e16d6",
        "company_name": "Dev Nagri (KR Group)",
        "company_website": null,
        "role": "Social Media Manager",
        "description": "Establish complete social branding calendars, direct promotional photography schedules, respond to customer interactions, and compile growth spreadsheets.",
        "package": "1.50",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@devnagri(krgroup).com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA in Digital Marketing (BBA DM)",
                "BSc in Media Science (BMS)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:50.081719+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "b0210ba5-41f4-4d8a-b3b1-d5fad2e74532",
        "company_name": "Brainlicious (StartUp Company)",
        "company_website": null,
        "role": "HR Generalist Intern",
        "description": "Fast-paced startup setting. Setup modern Google Form surveys, organize virtual onboarding meetings, arrange employee directories, and coordinate weekly team fun activities.",
        "package": "0.00",
        "location": "Remote, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "C",
        "openings_count": 2,
        "hr_email": "hr@brainlicious(startupcompany).com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA",
                "BBA in Entrepreneurship (BBA ENT)",
                "BBA in Hospital Management (BBA HM)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:50.095859+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "2a90adcc-8127-4d4f-9534-5cc43f760534",
        "company_name": "Print O Post Media",
        "company_website": null,
        "role": "Graphic Designer Trainee",
        "description": "Work in high-volume print media layout agency. Format retail package prints, customize flex brochures, convert vector assets, and align printer color sheets.",
        "package": "0.60",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "C",
        "openings_count": 2,
        "hr_email": "hr@printopostmedia.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "BSc in Sustainable Fashion Design & Management"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:50.110154+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "63db5291-0ea1-4070-a4de-30cb418fb789",
        "company_name": "AI Academia",
        "company_website": null,
        "role": "Business Development Associate",
        "description": "Pitch premium educational programs to students, manage pipeline spreadsheets, compile corporate outreach details, and handle retail enrollments.",
        "package": "1.68",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@aiacademia.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA",
                "BBA in Entrepreneurship (BBA ENT)",
                "BSc in Data Science",
                "BSc in Computer Application (BCA)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:50.125688+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "900991b1-8684-4469-a973-1251aa2f355c",
        "company_name": "Blue Copper Technologies Pvt. Ltd",
        "company_website": null,
        "role": "HR & Sales Coordinator Intern",
        "description": "Gain immense IT agency experience. Sourcing developer CVs, maintaining corporate communications, planning team allocations, and scheduling calls.",
        "package": "0.00",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@bluecoppertechnologiespvtltd.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Computer Application (BCA)",
                "BSc in Data Science",
                "BBA"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:50.139592+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "6c208e02-d384-4fdc-ad1e-04f049c99afc",
        "company_name": "Envision X Innovations Pvt Ltd",
        "company_website": null,
        "role": "Business Development & Media Intern",
        "description": "Coordinate enterprise client requirements, outline social promotional layouts, formulate marketing schedules, and run client review reports.",
        "package": "1.50",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@envisionxinnovationspvtltd.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA in Digital Marketing (BBA DM)",
                "BSc in Media Science (BMS)",
                "BSc in Computer Application (BCA)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:50.152333+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "e7ed32a6-f7b8-43b3-a4f6-978c1473b696",
        "company_name": "NBNS",
        "company_website": null,
        "role": "Regional Broadcast Anchor (Hindi/Bengali)",
        "description": "Deliver professional telecast broadcasts, voice-over for regional visual highlights, translate digital scripts, and anchor live event telecasts.",
        "package": "0.84",
        "location": "Kolkata Studio",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@nbns.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Media Science (BMS)",
                "MSc in Media Science",
                "BSc in Film and Television Production (FTP)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:50.178395+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "cc2ebd65-6371-4ac9-bc46-196f26fe2b4c",
        "company_name": "Iblix Digital",
        "company_website": null,
        "role": "Script Writer & Video Editor Intern",
        "description": "Dual focus on regional visual storyboard writing and video edits for digital platforms. Exceptional opportunity for creative-media graduates.",
        "package": "0.54",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "B",
        "openings_count": 2,
        "hr_email": "hr@iblixdigital.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BSc in Film and Television Production (FTP)",
                "BSc in Media Science (BMS)",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:50.197041+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "0019415c-4d46-4614-be3d-b925c97a544b",
        "company_name": "Tenhard India Pvt Ltd",
        "company_website": null,
        "role": "Management & Business Analytics Executive",
        "description": "Multidisciplinary management rotation. Track departmental KPIs, map finance spreadsheets, support operational pipelines, and present executive summaries.",
        "package": "1.92",
        "location": "Kolkata, India",
        "job_type": "internal",
        "listing_type": "internship",
        "external_link": null,
        "duration": null,
        "category": "A",
        "openings_count": 2,
        "hr_email": "hr@tenhardindiapvtltd.com",
        "eligibility_rules": {
            "min_cgpa": 6.0,
            "allowed_branches": [
                "BBA",
                "BBA in Entrepreneurship (BBA ENT)",
                "BSc in Data Science",
                "BSc in Computer Application (BCA)"
            ],
            "required_skills": [
                "Communication",
                "MS Office",
                "Problem Solving"
            ],
            "allowed_years": [
                2025,
                2026
            ],
            "no_backlog": false
        },
        "application_deadline": "2026-07-26T06:27:50.215445+00:00",
        "status": "active",
        "email_sent": false,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "73f9cd2e-21c7-4ec0-9a19-4ff37213b16e",
        "company_name": "Globex Corp",
        "company_website": null,
        "role": "Graduate Trainee",
        "description": "Off-campus selection via outbound apply click tracker for Graduate Trainee at Globex Corp.",
        "package": "0.00",
        "location": "Remote / Off-Campus",
        "job_type": "external",
        "listing_type": "job",
        "external_link": "https://careers.example.com/job/123",
        "duration": null,
        "category": "C",
        "openings_count": 1,
        "hr_email": null,
        "eligibility_rules": {},
        "application_deadline": "2026-06-26T10:24:02.503008+00:00",
        "status": "closed",
        "email_sent": true,
        "created_by_id": null
    },
    {
        "id": "f83e9000-ef50-419c-a037-484c65febd5b",
        "company_name": "h",
        "company_website": "",
        "role": "fh",
        "description": "vb",
        "package": "13.90",
        "location": "kh",
        "job_type": "internal",
        "listing_type": "job",
        "external_link": "",
        "duration": null,
        "category": "C",
        "openings_count": 1,
        "hr_email": "",
        "eligibility_rules": {
            "allowed_branches": [],
            "allowed_years": [],
            "allowed_categories": []
        },
        "application_deadline": "2026-08-10T22:11:00+00:00",
        "status": "active",
        "email_sent": true,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "fd0ffd7b-7f8d-454a-9386-cffa6a4ccf12",
        "company_name": "gh",
        "company_website": "",
        "role": "vhj",
        "description": "vn",
        "package": "14.00",
        "location": "hg",
        "job_type": "internal",
        "listing_type": "job",
        "external_link": "",
        "duration": null,
        "category": "C",
        "openings_count": 1,
        "hr_email": "",
        "eligibility_rules": {
            "allowed_branches": [],
            "allowed_years": [],
            "allowed_categories": []
        },
        "application_deadline": "2026-10-10T22:11:00+00:00",
        "status": "active",
        "email_sent": true,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "8f07dd4a-cfec-4bd8-83ab-505ff45e7a60",
        "company_name": "ad",
        "company_website": "",
        "role": "DA",
        "description": "ad",
        "package": "1.00",
        "location": "ADAd",
        "job_type": "internal",
        "listing_type": "job",
        "external_link": "",
        "duration": null,
        "category": "Own",
        "openings_count": 1,
        "hr_email": "",
        "eligibility_rules": {
            "min_cgpa": 8.1,
            "min_attendance": 99,
            "max_backlogs": 0,
            "allowed_branches": [
                "BBA",
                "BBA in Digital Marketing (BBA DM)",
                "BBA in Travel & Tourism Management (BBA TTM)",
                "BBA in Entrepreneurship (BBA ENT)",
                "BBA in Sports Management (BBA SM)",
                "BBA in Hospital Management (BBA HM)",
                "BSc in Media Science (BMS)",
                "MSc in Media Science",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)",
                "BSc in Film and Television Production (FTP)",
                "BSc in Interior Design",
                "BSc in Sustainable Fashion Design & Management",
                "Bachelor in Optometry",
                "BSc in Critical Care Technology (CCT)",
                "BSc in Medical Laboratory Technology (BMLT)",
                "BSc in Data Science",
                "BSc in Cyber Security",
                "BSc in Computer Application (BCA)"
            ],
            "allowed_years": [],
            "allowed_categories": []
        },
        "application_deadline": "2026-08-10T22:11:00+00:00",
        "status": "active",
        "email_sent": true,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "99a29777-2562-4214-a033-c8028405a2d8",
        "company_name": "asf",
        "company_website": "",
        "role": "asf",
        "description": "asf",
        "package": "44.90",
        "location": "asf",
        "job_type": "internal",
        "listing_type": "job",
        "external_link": "",
        "duration": "",
        "category": "Own",
        "openings_count": 1,
        "hr_email": "",
        "eligibility_rules": {
            "min_cgpa": 7.8,
            "min_attendance": 98,
            "max_backlogs": 0,
            "allowed_branches": [
                "BBA",
                "BBA in Digital Marketing (BBA DM)",
                "BBA in Travel & Tourism Management (BBA TTM)",
                "BBA in Entrepreneurship (BBA ENT)",
                "BBA in Sports Management (BBA SM)",
                "BBA in Hospital Management (BBA HM)",
                "BSc in Media Science (BMS)",
                "MSc in Media Science",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)",
                "BSc in Film and Television Production (FTP)",
                "BSc in Interior Design",
                "BSc in Sustainable Fashion Design & Management",
                "Bachelor in Optometry",
                "BSc in Critical Care Technology (CCT)",
                "BSc in Medical Laboratory Technology (BMLT)",
                "BSc in Data Science",
                "BSc in Cyber Security",
                "BSc in Computer Application (BCA)"
            ],
            "allowed_years": [],
            "allowed_categories": []
        },
        "application_deadline": "2026-10-10T23:10:00+00:00",
        "status": "active",
        "email_sent": true,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "346fa47c-2158-47b8-a419-ea8e57a27b20",
        "company_name": "GoSevIT Software Development Pvt Ltd",
        "company_website": null,
        "role": "Freshers New Graduates (React Developer)",
        "description": "Off-campus selection via outbound apply click tracker for Freshers New Graduates (React Developer) at GoSevIT Software Development Pvt Ltd.",
        "package": "0.00",
        "location": "Remote / Off-Campus",
        "job_type": "external",
        "listing_type": "job",
        "external_link": "https://jobshorn.com/job/freshers-new-graduates-react-developer/5903",
        "duration": null,
        "category": "C",
        "openings_count": 1,
        "hr_email": null,
        "eligibility_rules": {},
        "application_deadline": "2026-07-02T07:27:33.059306+00:00",
        "status": "active",
        "email_sent": true,
        "created_by_id": null
    },
    {
        "id": "fad0ee81-0a66-4346-af41-f9f80af73742",
        "company_name": "sa",
        "company_website": "",
        "role": "saf",
        "description": "saf",
        "package": "14.00",
        "location": "asf",
        "job_type": "internal",
        "listing_type": "job",
        "external_link": "",
        "duration": null,
        "category": "C",
        "openings_count": 1,
        "hr_email": "",
        "eligibility_rules": {
            "min_cgpa": 0,
            "min_attendance": 0,
            "max_backlogs": null,
            "allowed_branches": [
                "BBA",
                "BBA in Digital Marketing (BBA DM)",
                "BBA in Travel & Tourism Management (BBA TTM)",
                "BBA in Entrepreneurship (BBA ENT)",
                "BBA in Sports Management (BBA SM)",
                "BBA in Hospital Management (BBA HM)",
                "BSc in Media Science (BMS)",
                "MSc in Media Science",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)",
                "BSc in Film and Television Production (FTP)",
                "BSc in Interior Design",
                "BSc in Sustainable Fashion Design & Management",
                "Bachelor in Optometry",
                "BSc in Critical Care Technology (CCT)",
                "BSc in Medical Laboratory Technology (BMLT)",
                "BSc in Data Science",
                "BSc in Cyber Security",
                "BSc in Computer Application (BCA)"
            ],
            "allowed_years": [],
            "allowed_categories": []
        },
        "application_deadline": "2026-08-10T23:11:00+00:00",
        "status": "active",
        "email_sent": true,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "6f066dc8-fc7e-4873-921f-b984526fe77e",
        "company_name": "Lurnex Skilltech Private Limited",
        "company_website": null,
        "role": "Data Analyst Intern",
        "description": "Off-campus selection via outbound apply click tracker for Data Analyst Intern at Lurnex Skilltech Private Limited.",
        "package": "14.00",
        "location": "Remote / Off-Campus",
        "job_type": "external",
        "listing_type": "job",
        "external_link": "https://www.simplyhired.co.in/job/qLBsfnZtmPmTcZL7BudNSO9pR0sYtUbDUKYhb_F8LwHaacA1Be-uAw",
        "duration": null,
        "category": "C",
        "openings_count": 1,
        "hr_email": null,
        "eligibility_rules": {},
        "application_deadline": "2026-07-03T12:15:00.813372+00:00",
        "status": "active",
        "email_sent": true,
        "created_by_id": null
    },
    {
        "id": "34974e8b-f18d-445d-bae6-1813e78b0593",
        "company_name": "h",
        "company_website": "",
        "role": "we",
        "description": "wrq",
        "package": "14.00",
        "location": "wqrq",
        "job_type": "internal",
        "listing_type": "job",
        "external_link": "",
        "duration": null,
        "category": "C",
        "openings_count": 1,
        "hr_email": "",
        "eligibility_rules": {
            "min_cgpa": 0,
            "min_attendance": 0,
            "max_backlogs": null,
            "allowed_branches": [
                "BBA",
                "BBA in Digital Marketing (BBA DM)",
                "BBA in Travel & Tourism Management (BBA TTM)",
                "BBA in Entrepreneurship (BBA ENT)",
                "BBA in Sports Management (BBA SM)",
                "BBA in Hospital Management (BBA HM)",
                "BSc in Media Science (BMS)",
                "MSc in Media Science",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)",
                "BSc in Film and Television Production (FTP)",
                "BSc in Interior Design",
                "BSc in Sustainable Fashion Design & Management",
                "Bachelor in Optometry",
                "BSc in Critical Care Technology (CCT)",
                "BSc in Medical Laboratory Technology (BMLT)",
                "BSc in Data Science",
                "BSc in Cyber Security",
                "BSc in Computer Application (BCA)"
            ],
            "allowed_years": [],
            "allowed_categories": []
        },
        "application_deadline": "2026-10-11T23:01:00+00:00",
        "status": "active",
        "email_sent": true,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "b192cd35-e17a-4b44-b71c-a85a0478ca49",
        "company_name": "SFD",
        "company_website": "",
        "role": "ASD",
        "description": "ASD",
        "package": "14.00",
        "location": "ASD",
        "job_type": "internal",
        "listing_type": "job",
        "external_link": "",
        "duration": null,
        "category": "C",
        "openings_count": 1,
        "hr_email": "",
        "eligibility_rules": {
            "min_cgpa": 0,
            "min_attendance": 0,
            "max_backlogs": null,
            "allowed_branches": [
                "BBA",
                "BBA in Digital Marketing (BBA DM)",
                "BBA in Travel & Tourism Management (BBA TTM)",
                "BBA in Entrepreneurship (BBA ENT)",
                "BBA in Sports Management (BBA SM)",
                "BBA in Hospital Management (BBA HM)",
                "BSc in Media Science (BMS)",
                "MSc in Media Science",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)",
                "BSc in Film and Television Production (FTP)",
                "BSc in Interior Design",
                "BSc in Sustainable Fashion Design & Management",
                "Bachelor in Optometry",
                "BSc in Critical Care Technology (CCT)",
                "BSc in Medical Laboratory Technology (BMLT)",
                "BSc in Data Science",
                "BSc in Cyber Security",
                "BSc in Computer Application (BCA)"
            ],
            "allowed_years": [],
            "allowed_categories": []
        },
        "application_deadline": "2026-08-10T23:01:00+00:00",
        "status": "active",
        "email_sent": true,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "ae856803-6e8f-471c-b56f-bee622e4e077",
        "company_name": "Thoughtworks",
        "company_website": null,
        "role": "Associate-Graduate:Developer",
        "description": "Off-campus selection via outbound apply click tracker for Associate-Graduate:Developer at Thoughtworks.",
        "package": "14.00",
        "location": "Remote / Off-Campus",
        "job_type": "external",
        "listing_type": "job",
        "external_link": "https://www.thoughtworks.com/careers/jobs/7765363?gh_jid=7765363",
        "duration": null,
        "category": "C",
        "openings_count": 1,
        "hr_email": null,
        "eligibility_rules": {},
        "application_deadline": "2026-07-04T06:24:09.517880+00:00",
        "status": "closed",
        "email_sent": true,
        "created_by_id": null
    },
    {
        "id": "d4992588-7573-4dee-8346-f307865f1b75",
        "company_name": "QRW",
        "company_website": "",
        "role": "WQR",
        "description": "WQR",
        "package": "15.00",
        "location": "WRQ",
        "job_type": "internal",
        "listing_type": "job",
        "external_link": "",
        "duration": "",
        "category": "Own",
        "openings_count": 1,
        "hr_email": "",
        "eligibility_rules": {
            "min_cgpa": 2,
            "min_attendance": 100,
            "max_backlogs": 0,
            "allowed_branches": [
                "BBA",
                "BBA in Digital Marketing (BBA DM)",
                "BBA in Travel & Tourism Management (BBA TTM)",
                "BBA in Entrepreneurship (BBA ENT)",
                "BBA in Sports Management (BBA SM)",
                "BBA in Hospital Management (BBA HM)",
                "BSc in Media Science (BMS)",
                "MSc in Media Science",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)",
                "BSc in Film and Television Production (FTP)",
                "BSc in Interior Design",
                "BSc in Sustainable Fashion Design & Management",
                "Bachelor in Optometry",
                "BSc in Critical Care Technology (CCT)",
                "BSc in Medical Laboratory Technology (BMLT)",
                "BSc in Data Science",
                "BSc in Cyber Security",
                "BSc in Computer Application (BCA)"
            ],
            "allowed_years": [],
            "allowed_categories": []
        },
        "application_deadline": "2026-10-08T14:11:00+00:00",
        "status": "active",
        "email_sent": true,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "f013669f-ecae-47aa-9dfe-ba380e59d4e3",
        "company_name": "Acme Tech",
        "company_website": null,
        "role": "Junior Software Engineer",
        "description": "Backend/API developer role.",
        "package": "6.50",
        "location": "Kolkata",
        "job_type": "internal",
        "listing_type": "job",
        "external_link": null,
        "duration": null,
        "category": "A",
        "openings_count": 3,
        "hr_email": "hr@acmetech.com",
        "eligibility_rules": {
            "min_cgpa": 7.0,
            "allowed_branches": [
                "BCA",
                "MCA"
            ],
            "required_skills": [
                "Python",
                "Django"
            ],
            "allowed_years": [
                2026
            ],
            "no_backlog": true
        },
        "application_deadline": "2026-06-25T06:57:07.286483+00:00",
        "status": "active",
        "email_sent": true,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "cae728eb-75e8-4259-a5bb-0cd1fcc1686e",
        "company_name": "ASF",
        "company_website": "",
        "role": "ASF",
        "description": "xDASDA",
        "package": "14.00",
        "location": "ASFAS",
        "job_type": "internal",
        "listing_type": "job",
        "external_link": "",
        "duration": null,
        "category": "C",
        "openings_count": 1,
        "hr_email": "",
        "eligibility_rules": {
            "min_cgpa": 0,
            "min_attendance": 0,
            "max_backlogs": null,
            "allowed_branches": [
                "BBA",
                "BBA in Digital Marketing (BBA DM)",
                "BBA in Travel & Tourism Management (BBA TTM)",
                "BBA in Entrepreneurship (BBA ENT)",
                "BBA in Sports Management (BBA SM)",
                "BBA in Hospital Management (BBA HM)",
                "BSc in Media Science (BMS)",
                "MSc in Media Science",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)",
                "BSc in Film and Television Production (FTP)",
                "BSc in Interior Design",
                "BSc in Sustainable Fashion Design & Management",
                "Bachelor in Optometry",
                "BSc in Critical Care Technology (CCT)",
                "BSc in Medical Laboratory Technology (BMLT)",
                "BSc in Data Science",
                "BSc in Cyber Security",
                "BSc in Computer Application (BCA)"
            ],
            "allowed_years": [],
            "allowed_categories": []
        },
        "application_deadline": "2026-08-10T23:11:00+00:00",
        "status": "active",
        "email_sent": true,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "12608d1a-a657-4ef9-9d6e-086d5e0d00f9",
        "company_name": "sd",
        "company_website": "",
        "role": "fsd",
        "description": "fsda",
        "package": "14.00",
        "location": "saf",
        "job_type": "internal",
        "listing_type": "job",
        "external_link": "",
        "duration": null,
        "category": "C",
        "openings_count": 1,
        "hr_email": "",
        "eligibility_rules": {
            "min_cgpa": 0,
            "min_attendance": 0,
            "max_backlogs": null,
            "allowed_branches": [
                "BBA",
                "BBA in Digital Marketing (BBA DM)",
                "BBA in Travel & Tourism Management (BBA TTM)",
                "BBA in Entrepreneurship (BBA ENT)",
                "BBA in Sports Management (BBA SM)",
                "BBA in Hospital Management (BBA HM)",
                "BSc in Media Science (BMS)",
                "MSc in Media Science",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)",
                "BSc in Film and Television Production (FTP)",
                "BSc in Interior Design",
                "BSc in Sustainable Fashion Design & Management",
                "Bachelor in Optometry",
                "BSc in Critical Care Technology (CCT)",
                "BSc in Medical Laboratory Technology (BMLT)",
                "BSc in Data Science",
                "BSc in Cyber Security",
                "BSc in Computer Application (BCA)"
            ],
            "allowed_years": [],
            "allowed_categories": []
        },
        "application_deadline": "2026-08-10T23:11:00+00:00",
        "status": "active",
        "email_sent": true,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "976b2e5d-df64-4908-b9a2-cabc7244d095",
        "company_name": "jhk",
        "company_website": "",
        "role": "n",
        "description": "kjnm",
        "package": "13.80",
        "location": "kj,",
        "job_type": "internal",
        "listing_type": "job",
        "external_link": "",
        "duration": null,
        "category": "C",
        "openings_count": 1,
        "hr_email": "",
        "eligibility_rules": {
            "min_cgpa": 0,
            "min_attendance": 0,
            "max_backlogs": null,
            "allowed_branches": [
                "BBA",
                "BBA in Digital Marketing (BBA DM)",
                "BBA in Travel & Tourism Management (BBA TTM)",
                "BBA in Entrepreneurship (BBA ENT)",
                "BBA in Sports Management (BBA SM)",
                "BBA in Hospital Management (BBA HM)",
                "BSc in Media Science (BMS)",
                "MSc in Media Science",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)",
                "BSc in Film and Television Production (FTP)",
                "BSc in Interior Design",
                "BSc in Sustainable Fashion Design & Management",
                "Bachelor in Optometry",
                "BSc in Critical Care Technology (CCT)",
                "BSc in Medical Laboratory Technology (BMLT)",
                "BSc in Data Science",
                "BSc in Cyber Security",
                "BSc in Computer Application (BCA)"
            ],
            "allowed_years": [],
            "allowed_categories": []
        },
        "application_deadline": "2026-08-10T23:10:00+00:00",
        "status": "active",
        "email_sent": true,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    },
    {
        "id": "bcc5c277-d574-4a9a-bafb-091dcf12242b",
        "company_name": "sd",
        "company_website": "",
        "role": "sda",
        "description": "sda",
        "package": "14.00",
        "location": "sda",
        "job_type": "internal",
        "listing_type": "job",
        "external_link": "",
        "duration": null,
        "category": "C",
        "openings_count": 1,
        "hr_email": "",
        "eligibility_rules": {
            "min_cgpa": 0,
            "min_attendance": 0,
            "max_backlogs": null,
            "allowed_branches": [
                "BBA",
                "BBA in Digital Marketing (BBA DM)",
                "BBA in Travel & Tourism Management (BBA TTM)",
                "BBA in Entrepreneurship (BBA ENT)",
                "BBA in Sports Management (BBA SM)",
                "BBA in Hospital Management (BBA HM)",
                "BSc in Media Science (BMS)",
                "MSc in Media Science",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)",
                "BSc in Film and Television Production (FTP)",
                "BSc in Interior Design",
                "BSc in Sustainable Fashion Design & Management",
                "Bachelor in Optometry",
                "BSc in Critical Care Technology (CCT)",
                "BSc in Medical Laboratory Technology (BMLT)",
                "BSc in Data Science",
                "BSc in Cyber Security",
                "BSc in Computer Application (BCA)"
            ],
            "allowed_years": [],
            "allowed_categories": []
        },
        "application_deadline": "2026-09-10T11:11:00+00:00",
        "status": "active",
        "email_sent": true,
        "created_by_id": "9477ac56-0fe4-423f-aa70-e080d58c6e84"
    }
]''')
JOB_ROUNDS = json.loads(r'''[
    {
        "id": "d7db4a3a-3ca6-4b23-af5c-1c277ff3ac6a",
        "job_id": "08dc36dc-f8ef-4634-a7c8-01f3f62a8ebe",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "fe10fd9f-6a00-4b3c-bbe7-84b3fa063c48",
        "job_id": "aec46728-7990-4bfe-b369-495880ce14b6",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "8a89edb0-1b81-47e5-bf20-ea6aba32d6fe",
        "job_id": "e37d79d9-934a-4a14-82d2-897dce8115a0",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "c1082716-4adf-47c4-a75a-b6f839306dff",
        "job_id": "31d3dcf3-a2d5-4c81-964b-f9472d064d60",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "68b2d3e4-ef53-445f-b363-d385ebdc5f5a",
        "job_id": "5888a482-88c5-4b8b-99b7-95b2da766048",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "7c43a69d-a20b-411c-b8d3-e38fd9125eca",
        "job_id": "4fe11c00-b5f2-411a-b470-527d2ff943c1",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "79c31a66-a469-44a3-8d37-f5c7a5966435",
        "job_id": "51dea571-d281-4366-a21b-a91bfb51d171",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "d2c6ddd9-e013-4abc-8de4-f4cf77e189c2",
        "job_id": "834cb8e4-3632-4d81-80ff-a8edd54a2b9e",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "2eaf07fa-18cd-4ca7-9d30-f05e4b0fc574",
        "job_id": "eac2e510-0b09-4c20-b4ec-2a6758b91aea",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "19e59602-e160-42d6-9d17-fff11d54aec9",
        "job_id": "cc767efb-3654-4bd4-8a9e-3dcae1f16bf2",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "99e7b701-2943-401a-be54-217384f37c8a",
        "job_id": "525ec0b4-c1be-42d4-9783-96e8c433fccc",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "15470a7e-c7b4-4912-aa9a-81f8d4a1715b",
        "job_id": "e9467774-dd90-42a0-af07-84494d83cdef",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "1c0f7862-87c7-4aa9-8f6e-5e0c15f753b9",
        "job_id": "847e1f05-c102-4766-81bf-44aa8b5043a6",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "da8b2d99-217c-4cd2-8289-9568b6eed362",
        "job_id": "4246b6d9-c7c0-4e69-8ca5-82fb9010a6d0",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "5d9439b9-1971-493a-8679-764b443c4c00",
        "job_id": "0561f9b4-f6bb-4587-9258-d93a08a6c80b",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "23434305-6b32-4d4d-8f2e-50ba23bb76c6",
        "job_id": "72103daf-0fb3-4682-940d-5fd0686212bb",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "201603ab-f504-4204-be3c-db5fdd545988",
        "job_id": "504c7fd7-263f-492b-8c5a-8bff4a65a7f1",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "afaa675e-979f-4afe-b00a-2668ab505985",
        "job_id": "8c6c90f3-386c-4d94-8a31-6c6f2ec04f90",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "eccec6cd-b2d2-42ad-9c02-1dd0216d04e5",
        "job_id": "beb6c9f8-8187-4437-ae19-1a84154e1f6d",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "ffd5f033-29bf-4d1b-87a2-a3a8a1709d2b",
        "job_id": "570dc6ca-f7b7-4b92-a2b4-c4733b29964d",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "dce2120b-f5a9-494a-8e44-59bebff29d6f",
        "job_id": "ee76d02c-e3df-42e8-8f09-b273f7733a95",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "c1e73864-da93-492e-89db-ffc8a39dca47",
        "job_id": "bc6b634f-bc8b-4178-b0e1-c000d9a64ebb",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "b6626477-ff78-4d04-be69-3aa0c015a137",
        "job_id": "475ec410-afeb-4457-97b4-93960515e9b4",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "de97d4ab-8c32-4b25-b2ef-70b3a11c0df4",
        "job_id": "a316edb7-000a-4db6-bab5-6c64a8251cba",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "7feaf89a-7a34-4414-aa33-a4d10e8c86c9",
        "job_id": "93ebda4d-7920-4abe-84ca-321017fbc0ac",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "d62b4abe-38b6-403c-b9b3-d4aab4eceb69",
        "job_id": "6e76b92e-2944-4139-8446-61c4e52acc61",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "86631b0d-e383-45c7-8af9-7a7c455ccc4b",
        "job_id": "b74d6d7d-a7af-41f2-90fa-b05b899406cd",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "da7ed79d-e587-4b24-9e61-c5dc6bce5b58",
        "job_id": "a1593ff3-2b8c-4eff-ab27-adfc56823e9b",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "ec2f123b-5912-465c-bee1-0549461eff0a",
        "job_id": "f9e5981e-15eb-4a4e-a23a-8c6c7eadf677",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "f8e576b2-f6c3-465c-aa95-9547baa4d01f",
        "job_id": "db3a0b9d-414f-462b-93e9-9e6e5f5c0775",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "bb2828ee-66c0-4ca0-af15-f727ff15030b",
        "job_id": "eaa24a23-b09c-4834-8e1b-20a4ae2b3e62",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "ae443cae-b495-46a6-b783-2ad59ca0a8c3",
        "job_id": "f40d1717-4e86-494f-bc09-8a92a07e16d6",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "f131f967-6883-43bb-b7db-1dcb652fe336",
        "job_id": "b0210ba5-41f4-4d8a-b3b1-d5fad2e74532",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "c454c837-7f01-49a0-b88d-64709ea58ef5",
        "job_id": "2a90adcc-8127-4d4f-9534-5cc43f760534",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "2159b9d1-ba62-48b3-b885-84d3fbadefa8",
        "job_id": "63db5291-0ea1-4070-a4de-30cb418fb789",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "89905ba7-2509-4515-b98c-6fb001defd9d",
        "job_id": "900991b1-8684-4469-a973-1251aa2f355c",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "fcb03580-efae-4b8a-a434-1798420ebf17",
        "job_id": "6c208e02-d384-4fdc-ad1e-04f049c99afc",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "e7151157-c865-4b0a-9a87-3bbd603ba626",
        "job_id": "e7ed32a6-f7b8-43b3-a4f6-978c1473b696",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "39586982-badc-494a-88bc-74a46d6f437b",
        "job_id": "cc2ebd65-6371-4ac9-bc46-196f26fe2b4c",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "5d7dd40d-d349-428f-9b13-fc994d44c149",
        "job_id": "0019415c-4d46-4614-be3d-b925c97a544b",
        "round_number": 1,
        "round_name": "Resume Shortlisting",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": 30
    },
    {
        "id": "c114717b-25b2-4764-a888-579f895bfdb6",
        "job_id": "f013669f-ecae-47aa-9dfe-ba380e59d4e3",
        "round_number": 1,
        "round_name": "Aptitude Test",
        "round_type": "test",
        "is_elimination": true,
        "passing_score": 60,
        "duration_minutes": null
    },
    {
        "id": "b9b739eb-e443-42fc-a32b-2608fb783eef",
        "job_id": "08dc36dc-f8ef-4634-a7c8-01f3f62a8ebe",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "3035cc4a-d0ba-4272-a9bb-7d788328a3e1",
        "job_id": "aec46728-7990-4bfe-b369-495880ce14b6",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "8b287185-98da-44e7-96c1-3d43c7182e58",
        "job_id": "e37d79d9-934a-4a14-82d2-897dce8115a0",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "d4cdaf24-805c-4dbf-b89c-8867addbf6b1",
        "job_id": "31d3dcf3-a2d5-4c81-964b-f9472d064d60",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "02073f9f-4886-4c3a-92b4-0f71a8ab7c38",
        "job_id": "5888a482-88c5-4b8b-99b7-95b2da766048",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "f5629950-c56a-417c-93ce-65206cab248f",
        "job_id": "4fe11c00-b5f2-411a-b470-527d2ff943c1",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "a7f7c79b-75a7-4f2c-99ce-f5116df299fe",
        "job_id": "51dea571-d281-4366-a21b-a91bfb51d171",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "19c1b90e-861e-4177-92a9-ae87d307e8c6",
        "job_id": "834cb8e4-3632-4d81-80ff-a8edd54a2b9e",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "ad60e134-958e-4330-a288-273f48e4635e",
        "job_id": "eac2e510-0b09-4c20-b4ec-2a6758b91aea",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "1674dde9-b0e5-4c95-bab0-72a004d35197",
        "job_id": "cc767efb-3654-4bd4-8a9e-3dcae1f16bf2",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "52de672e-58eb-4141-b2eb-82d53df6a940",
        "job_id": "525ec0b4-c1be-42d4-9783-96e8c433fccc",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "4475e93b-80a1-4ad1-8911-a3b72be89707",
        "job_id": "e9467774-dd90-42a0-af07-84494d83cdef",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "cd65414f-6e86-4878-b8e2-444756ecd4e2",
        "job_id": "847e1f05-c102-4766-81bf-44aa8b5043a6",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "5ef01bfe-f33b-4177-8cf7-8158e767cfe5",
        "job_id": "4246b6d9-c7c0-4e69-8ca5-82fb9010a6d0",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "753a88ae-9e8e-4e4a-9d52-706147981122",
        "job_id": "0561f9b4-f6bb-4587-9258-d93a08a6c80b",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "322a7a77-f3a4-4a19-8690-d201c2819e2a",
        "job_id": "72103daf-0fb3-4682-940d-5fd0686212bb",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "2b210405-bf69-46ec-b0f0-8f13f60b23e1",
        "job_id": "504c7fd7-263f-492b-8c5a-8bff4a65a7f1",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "3cddfe46-7384-4564-8ed6-8e5ba271b206",
        "job_id": "8c6c90f3-386c-4d94-8a31-6c6f2ec04f90",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "d54e5eb4-4af8-4c93-b09d-4492147c91e9",
        "job_id": "beb6c9f8-8187-4437-ae19-1a84154e1f6d",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "7698945b-5b17-4167-bd5f-4f94c283b793",
        "job_id": "570dc6ca-f7b7-4b92-a2b4-c4733b29964d",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "87f3ee88-46b3-4859-8a75-df77db84f0c6",
        "job_id": "ee76d02c-e3df-42e8-8f09-b273f7733a95",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "e8ccae70-d6c8-4f7e-b50e-9943175b7740",
        "job_id": "bc6b634f-bc8b-4178-b0e1-c000d9a64ebb",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "b17cf441-8d4e-46c2-aaa8-434d689c6051",
        "job_id": "475ec410-afeb-4457-97b4-93960515e9b4",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "167d6132-7d71-4571-9cd8-5a0939d037cc",
        "job_id": "a316edb7-000a-4db6-bab5-6c64a8251cba",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "2488cdde-0c95-4661-a9a7-4a206aeb3827",
        "job_id": "93ebda4d-7920-4abe-84ca-321017fbc0ac",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "2c0bc1f2-5cc3-405a-931e-e9cb55d7ee42",
        "job_id": "6e76b92e-2944-4139-8446-61c4e52acc61",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "c421d6a0-8228-4823-bf47-36ab6124d683",
        "job_id": "b74d6d7d-a7af-41f2-90fa-b05b899406cd",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "e4c20d2f-0598-472d-af24-29fa108d368e",
        "job_id": "a1593ff3-2b8c-4eff-ab27-adfc56823e9b",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "0903e48f-80bf-4dda-9e5a-4a4df365b136",
        "job_id": "f9e5981e-15eb-4a4e-a23a-8c6c7eadf677",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "b3b6cf0b-408e-4d98-addc-80ca2bbec371",
        "job_id": "db3a0b9d-414f-462b-93e9-9e6e5f5c0775",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "f555a51b-4c0e-4f66-9954-0bca9e453cb3",
        "job_id": "eaa24a23-b09c-4834-8e1b-20a4ae2b3e62",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "ffd3b0b9-7ff7-4a2e-8b7d-a765be354f61",
        "job_id": "f40d1717-4e86-494f-bc09-8a92a07e16d6",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "b8a01cf5-9d29-420c-96d1-8e5c8688e68d",
        "job_id": "b0210ba5-41f4-4d8a-b3b1-d5fad2e74532",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "b2f0230d-aa1b-482c-880a-1cdb71e171b2",
        "job_id": "2a90adcc-8127-4d4f-9534-5cc43f760534",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "48a13c43-2019-4dea-bfdd-fd44be538ee1",
        "job_id": "63db5291-0ea1-4070-a4de-30cb418fb789",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "c91ad0cb-7333-44b0-a613-2b9159eb115f",
        "job_id": "900991b1-8684-4469-a973-1251aa2f355c",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "ceaf2dcb-bf85-4024-a087-37e945ada30b",
        "job_id": "6c208e02-d384-4fdc-ad1e-04f049c99afc",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "d3f4391d-28ab-45f4-8983-7aa1401f8195",
        "job_id": "e7ed32a6-f7b8-43b3-a4f6-978c1473b696",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "b7bdb65c-a0ad-4039-94a8-96f9c96fd5dc",
        "job_id": "cc2ebd65-6371-4ac9-bc46-196f26fe2b4c",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "ec3373cf-036e-4636-8d12-cfa48bac9ff9",
        "job_id": "0019415c-4d46-4614-be3d-b925c97a544b",
        "round_number": 2,
        "round_name": "HR & Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    },
    {
        "id": "afca6497-e7a9-41b0-a617-e260bcf7d131",
        "job_id": "f013669f-ecae-47aa-9dfe-ba380e59d4e3",
        "round_number": 2,
        "round_name": "Technical Interview",
        "round_type": "interview",
        "is_elimination": true,
        "passing_score": null,
        "duration_minutes": null
    }
]''')
APPLICATIONS = json.loads(r'''[
    {
        "id": "94b3476c-7bcc-49ae-b9d8-eb6f461ef6e6",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "job_id": "cae728eb-75e8-4259-a5bb-0cd1fcc1686e",
        "status": "applied",
        "eligibility_snapshot": {
            "eligible": true,
            "failing_checks": [],
            "passing_checks": [
                "profile_complete",
                "active_resume",
                "cgpa",
                "attendance",
                "backlogs",
                "branch",
                "category",
                "skills",
                "graduation_year",
                "deadline",
                "job_active"
            ],
            "match_score": 0.946
        },
        "job_snapshot": {
            "company_name": "ASF",
            "role": "ASF",
            "package": "14.00",
            "location": "ASFAS",
            "deadline": "2026-08-10 23:11:00+00:00"
        }
    },
    {
        "id": "f93ca968-39e3-4c40-91e1-5e58da19f834",
        "student_id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "job_id": "f013669f-ecae-47aa-9dfe-ba380e59d4e3",
        "status": "shortlisted",
        "eligibility_snapshot": {
            "eligible": true
        },
        "job_snapshot": {
            "company_name": "Acme Tech",
            "role": "Junior Software Engineer"
        }
    },
    {
        "id": "e947dcee-e787-4eca-8864-598e5b99a355",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "job_id": "d4992588-7573-4dee-8346-f307865f1b75",
        "status": "applied",
        "eligibility_snapshot": {
            "eligible": true,
            "failing_checks": [],
            "passing_checks": [
                "profile_complete",
                "active_resume",
                "cgpa",
                "attendance",
                "backlogs",
                "branch",
                "category",
                "skills",
                "graduation_year",
                "deadline",
                "job_active"
            ],
            "match_score": 0.946
        },
        "job_snapshot": {
            "company_name": "QRW",
            "role": "WQR",
            "package": "15.00",
            "location": "WRQ",
            "deadline": "2026-10-08 14:11:00+00:00"
        }
    },
    {
        "id": "3376a25b-ceb1-454b-a2d8-9adfc979f6cb",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "job_id": "ae856803-6e8f-471c-b56f-bee622e4e077",
        "status": "selected",
        "eligibility_snapshot": {},
        "job_snapshot": {
            "company_name": "Thoughtworks",
            "role": "Associate-Graduate:Developer",
            "package": "14.0",
            "location": "Remote / Off-Campus",
            "deadline": "2026-07-04 06:24:09.517880+00:00"
        }
    },
    {
        "id": "82f4defc-3fe3-4e8b-a0c5-a5df12941348",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "job_id": "b192cd35-e17a-4b44-b71c-a85a0478ca49",
        "status": "interviewing",
        "eligibility_snapshot": {
            "eligible": true,
            "failing_checks": [],
            "passing_checks": [
                "profile_complete",
                "active_resume",
                "cgpa",
                "attendance",
                "backlogs",
                "branch",
                "category",
                "skills",
                "graduation_year",
                "deadline",
                "job_active"
            ],
            "match_score": 0.946
        },
        "job_snapshot": {
            "company_name": "SFD",
            "role": "ASD",
            "package": "14.00",
            "location": "ASD",
            "deadline": "2026-08-10 23:01:00+00:00"
        }
    },
    {
        "id": "488fd597-e3e6-4203-a50e-b2457df8bbb4",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "job_id": "34974e8b-f18d-445d-bae6-1813e78b0593",
        "status": "interviewing",
        "eligibility_snapshot": {
            "eligible": true,
            "failing_checks": [],
            "passing_checks": [
                "profile_complete",
                "active_resume",
                "cgpa",
                "attendance",
                "backlogs",
                "branch",
                "category",
                "skills",
                "graduation_year",
                "deadline",
                "job_active"
            ],
            "match_score": 0.946
        },
        "job_snapshot": {
            "company_name": "h",
            "role": "we",
            "package": "14.00",
            "location": "wqrq",
            "deadline": "2026-10-11 23:01:00+00:00"
        }
    },
    {
        "id": "a96a733f-b3ca-4401-b1e6-543ae0f0af76",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "job_id": "6f066dc8-fc7e-4873-921f-b984526fe77e",
        "status": "interviewing",
        "eligibility_snapshot": {},
        "job_snapshot": {
            "company_name": "Lurnex Skilltech Private Limited",
            "role": "Data Analyst Intern",
            "package": "14.0",
            "location": "Remote / Off-Campus",
            "deadline": "2026-07-03 12:15:00.813372+00:00"
        }
    },
    {
        "id": "3a1381b6-54b9-4d29-9bb3-5672994dbf34",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "job_id": "fad0ee81-0a66-4346-af41-f9f80af73742",
        "status": "applied",
        "eligibility_snapshot": {
            "eligible": true,
            "failing_checks": [],
            "passing_checks": [
                "profile_complete",
                "active_resume",
                "cgpa",
                "attendance",
                "backlogs",
                "branch",
                "category",
                "skills",
                "graduation_year",
                "deadline",
                "job_active"
            ],
            "match_score": 0.946
        },
        "job_snapshot": {
            "company_name": "sa",
            "role": "saf",
            "package": "14.00",
            "location": "asf",
            "deadline": "2026-08-10 23:11:00+00:00"
        }
    },
    {
        "id": "acd5dc55-e523-4fff-a328-79cbe53f1683",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "job_id": "fd0ffd7b-7f8d-454a-9386-cffa6a4ccf12",
        "status": "selected",
        "eligibility_snapshot": {
            "eligible": true,
            "failing_checks": [],
            "passing_checks": [
                "profile_complete",
                "active_resume",
                "cgpa",
                "attendance",
                "backlogs",
                "branch",
                "category",
                "skills",
                "graduation_year",
                "deadline",
                "job_active"
            ],
            "match_score": 0.946
        },
        "job_snapshot": {
            "company_name": "gh",
            "role": "vhj",
            "package": "14.00",
            "location": "hg",
            "deadline": "2026-10-10 22:11:00+00:00"
        }
    },
    {
        "id": "e94cf3ae-c9f3-4653-9015-89531d6a892e",
        "student_id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "job_id": "346fa47c-2158-47b8-a419-ea8e57a27b20",
        "status": "interviewing",
        "eligibility_snapshot": {},
        "job_snapshot": {}
    },
    {
        "id": "df61e65a-364a-4a49-8d35-76da28759266",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "job_id": "346fa47c-2158-47b8-a419-ea8e57a27b20",
        "status": "selected",
        "eligibility_snapshot": {},
        "job_snapshot": {}
    },
    {
        "id": "b29fe98d-2283-41d7-8fcc-e6bdc244a9b6",
        "student_id": "121be73c-d619-4288-b529-bce1bc901c2e",
        "job_id": "73f9cd2e-21c7-4ec0-9a19-4ff37213b16e",
        "status": "applied",
        "eligibility_snapshot": {
            "eligible": true,
            "failing_checks": [],
            "passing_checks": [
                "profile_complete",
                "active_resume",
                "cgpa",
                "branch",
                "category",
                "skills"
            ],
            "match_score": 100.0
        },
        "job_snapshot": {
            "company_name": "Globex Corp",
            "role": "Graduate Trainee",
            "package": "0.00",
            "location": "Remote / Off-Campus",
            "deadline": "2026-06-26 10:24:02.503008+00:00"
        }
    },
    {
        "id": "e27dc581-906a-4679-a495-0e444416b9dc",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "job_id": "f83e9000-ef50-419c-a037-484c65febd5b",
        "status": "selected",
        "eligibility_snapshot": {
            "eligible": true,
            "failing_checks": [],
            "passing_checks": [
                "profile_complete",
                "active_resume",
                "cgpa",
                "branch",
                "category",
                "skills",
                "graduation_year",
                "deadline",
                "job_active"
            ],
            "match_score": 0.946
        },
        "job_snapshot": {
            "company_name": "h",
            "role": "fh",
            "package": "13.90",
            "location": "kh",
            "deadline": "2026-08-10 22:11:00+00:00"
        }
    },
    {
        "id": "d937e013-53b0-44d6-954c-aa55f9244735",
        "student_id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "job_id": "f83e9000-ef50-419c-a037-484c65febd5b",
        "status": "selected",
        "eligibility_snapshot": {
            "eligible": true,
            "failing_checks": [],
            "passing_checks": [
                "profile_complete",
                "active_resume",
                "cgpa",
                "branch",
                "category",
                "skills",
                "graduation_year",
                "deadline",
                "job_active"
            ],
            "match_score": 0.952
        },
        "job_snapshot": {
            "company_name": "h",
            "role": "fh",
            "package": "13.90",
            "location": "kh",
            "deadline": "2026-08-10 22:11:00+00:00"
        }
    },
    {
        "id": "0ab08752-e028-4cf1-b1c3-4daa610aa86d",
        "student_id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "job_id": "fd0ffd7b-7f8d-454a-9386-cffa6a4ccf12",
        "status": "interviewing",
        "eligibility_snapshot": {
            "eligible": true,
            "failing_checks": [],
            "passing_checks": [
                "profile_complete",
                "active_resume",
                "cgpa",
                "branch",
                "category",
                "skills",
                "graduation_year",
                "deadline",
                "job_active"
            ],
            "match_score": 0.952
        },
        "job_snapshot": {
            "company_name": "gh",
            "role": "vhj",
            "package": "14.00",
            "location": "hg",
            "deadline": "2026-10-10 22:11:00+00:00"
        }
    },
    {
        "id": "58478d9a-f979-4173-a29b-4e803949873b",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "job_id": "73f9cd2e-21c7-4ec0-9a19-4ff37213b16e",
        "status": "withdrawn",
        "eligibility_snapshot": {
            "eligible": true,
            "failing_checks": [],
            "passing_checks": [
                "profile_complete",
                "active_resume",
                "cgpa",
                "branch",
                "category",
                "skills"
            ],
            "match_score": 100.0
        },
        "job_snapshot": {
            "company_name": "Globex Corp",
            "role": "Graduate Trainee",
            "package": "0.00",
            "location": "Remote / Off-Campus",
            "deadline": "2026-06-26 10:24:02.503008+00:00"
        }
    },
    {
        "id": "87759848-e60a-4ad4-b6ca-be4c6697be40",
        "student_id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "job_id": "73f9cd2e-21c7-4ec0-9a19-4ff37213b16e",
        "status": "selected",
        "eligibility_snapshot": {},
        "job_snapshot": {}
    }
]''')
APPLICATION_ROUNDS = json.loads(r'''[
    {
        "id": "e857f235-660a-4d04-953c-18fb2c507d52",
        "application_id": "f93ca968-39e3-4c40-91e1-5e58da19f834",
        "job_round_id": "c114717b-25b2-4764-a888-579f895bfdb6",
        "round_number": 1,
        "status": "cleared",
        "score": 78
    },
    {
        "id": "a593180e-8fb8-454a-b0ae-27c91781aef3",
        "application_id": "f93ca968-39e3-4c40-91e1-5e58da19f834",
        "job_round_id": "afca6497-e7a9-41b0-a617-e260bcf7d131",
        "round_number": 2,
        "status": "scheduled",
        "score": null
    }
]''')

DOMAINS = json.loads(r'''[
    {
        "id": "871b5f76-4114-4725-aca0-413b0c348d3e",
        "name": "Business Analytics",
        "description": "Data analysis and business intelligence",
        "icon": "\ud83d\udcca"
    },
    {
        "id": "1101c0f4-ec32-47c8-93ad-07cf110ad773",
        "name": "Communication & Soft Skills",
        "description": "Verbal, written, and interpersonal skills",
        "icon": "\ud83d\udde3\ufe0f"
    },
    {
        "id": "ec687a4e-a71e-4cff-9a1e-9b86fba99eb2",
        "name": "Computer Science",
        "description": "Programming, DSA, and system design",
        "icon": "\ud83d\udcbb"
    },
    {
        "id": "2345f16b-a26c-46be-806e-df1f0ee6e27f",
        "name": "Digital Marketing",
        "description": "Marketing strategy and digital channels",
        "icon": "\ud83d\udcf1"
    },
    {
        "id": "d47b4459-d528-402c-ae1e-09405fd1c8d8",
        "name": "Software Engineering",
        "description": "SE-focused mock interviews",
        "icon": "\ud83d\udcbb"
    }
]''')
INTERVIEW_TYPES = json.loads(r'''[
    {
        "id": "e075f3ec-75e5-40fc-a45a-2b4b423f12bb",
        "domain_id": "871b5f76-4114-4725-aca0-413b0c348d3e",
        "code": "ba_analysis",
        "name": "Data Analysis",
        "description": "Business data analysis and insights",
        "duration_minutes": 30,
        "questions_per_session": 5
    },
    {
        "id": "bda305b5-4b0d-4b32-a99d-1abafe29260f",
        "domain_id": "1101c0f4-ec32-47c8-93ad-07cf110ad773",
        "code": "comm_skills",
        "name": "Communication Assessment",
        "description": "Professional communication and presentation",
        "duration_minutes": 25,
        "questions_per_session": 5
    },
    {
        "id": "ae202ead-b0fb-48f7-8a9f-6f906c4d99ad",
        "domain_id": "ec687a4e-a71e-4cff-9a1e-9b86fba99eb2",
        "code": "cs_fundamentals",
        "name": "CS Fundamentals",
        "description": "Core computer science concepts",
        "duration_minutes": 30,
        "questions_per_session": 5
    },
    {
        "id": "1ef33e91-3d0c-47ee-9f61-663bba03faed",
        "domain_id": "2345f16b-a26c-46be-806e-df1f0ee6e27f",
        "code": "dm_strategy",
        "name": "Marketing Strategy",
        "description": "End-to-end marketing strategy interview",
        "duration_minutes": 30,
        "questions_per_session": 5
    },
    {
        "id": "012fec48-29c6-4bd9-88c1-28b6cf091724",
        "domain_id": "d47b4459-d528-402c-ae1e-09405fd1c8d8",
        "code": "SE_BACKEND",
        "name": "Backend Interview",
        "description": "Django/API/backend fundamentals",
        "duration_minutes": 30,
        "questions_per_session": 3
    }
]''')
COMPETENCIES = json.loads(r'''[
    {
        "id": "586304c8-d88a-4f99-a20d-8144ecd174a8",
        "interview_type_id": "012fec48-29c6-4bd9-88c1-28b6cf091724",
        "name": "API Design",
        "description": "Designing robust REST APIs",
        "weight": 1.0,
        "mastery_keywords": [
            "idempotency",
            "pagination",
            "authentication"
        ]
    },
    {
        "id": "0cad9128-2c0c-4df2-bc2e-c768d34dc393",
        "interview_type_id": "ae202ead-b0fb-48f7-8a9f-6f906c4d99ad",
        "name": "Algorithms",
        "description": "Sorting, searching, dynamic programming",
        "weight": 1.3,
        "mastery_keywords": [
            "sorting",
            "binary search",
            "dynamic programming",
            "recursion",
            "time complexity"
        ]
    },
    {
        "id": "aff9b663-782b-474f-bc73-9d22aa252a4d",
        "interview_type_id": "e075f3ec-75e5-40fc-a45a-2b4b423f12bb",
        "name": "Data Analysis",
        "description": "Statistical analysis and data interpretation",
        "weight": 1.5,
        "mastery_keywords": [
            "statistics",
            "regression",
            "hypothesis testing",
            "correlation",
            "data visualization"
        ]
    },
    {
        "id": "5f07f4bf-030a-429e-bce8-5ee1adcba11f",
        "interview_type_id": "ae202ead-b0fb-48f7-8a9f-6f906c4d99ad",
        "name": "Data Structures",
        "description": "Arrays, linked lists, trees, graphs, hash maps",
        "weight": 1.5,
        "mastery_keywords": [
            "array",
            "linked list",
            "tree",
            "graph",
            "hash map",
            "stack",
            "queue"
        ]
    },
    {
        "id": "352f6114-e8fc-42da-af98-5af89381b67f",
        "interview_type_id": "ae202ead-b0fb-48f7-8a9f-6f906c4d99ad",
        "name": "Object-Oriented Programming",
        "description": "OOP principles and design patterns",
        "weight": 1.5,
        "mastery_keywords": [
            "OOP",
            "inheritance",
            "polymorphism",
            "encapsulation",
            "abstraction"
        ]
    },
    {
        "id": "8ddbf03d-f305-4328-9b4a-967330624398",
        "interview_type_id": "1ef33e91-3d0c-47ee-9f61-663bba03faed",
        "name": "Product Strategy",
        "description": "Ability to develop and articulate product strategy",
        "weight": 1.5,
        "mastery_keywords": [
            "value proposition",
            "target market",
            "competitive positioning",
            "product roadmap",
            "user research"
        ]
    },
    {
        "id": "c4eab557-874d-4109-b452-3f1a910f4132",
        "interview_type_id": "1ef33e91-3d0c-47ee-9f61-663bba03faed",
        "name": "SEO & Content",
        "description": "Search engine optimization and content marketing",
        "weight": 1.2,
        "mastery_keywords": [
            "SEO",
            "content strategy",
            "keyword research",
            "backlinks",
            "on-page optimization"
        ]
    },
    {
        "id": "2638601e-7e04-454c-a5f1-e91e87a084f7",
        "interview_type_id": "e075f3ec-75e5-40fc-a45a-2b4b423f12bb",
        "name": "SQL & Databases",
        "description": "Database querying and data manipulation",
        "weight": 1.2,
        "mastery_keywords": [
            "SQL",
            "JOIN",
            "aggregation",
            "subquery",
            "indexing"
        ]
    },
    {
        "id": "9b6c14d7-687d-4cc6-8eb6-64576bee7aed",
        "interview_type_id": "1ef33e91-3d0c-47ee-9f61-663bba03faed",
        "name": "Social Media Marketing",
        "description": "Social media strategy and engagement",
        "weight": 1.0,
        "mastery_keywords": [
            "social media",
            "engagement",
            "influencer marketing",
            "paid social",
            "analytics"
        ]
    },
    {
        "id": "13174430-622f-417f-9ff6-9adb1bb63ed3",
        "interview_type_id": "bda305b5-4b0d-4b32-a99d-1abafe29260f",
        "name": "Teamwork",
        "description": "Collaboration and team dynamics",
        "weight": 1.2,
        "mastery_keywords": [
            "collaboration",
            "conflict resolution",
            "delegation",
            "team dynamics"
        ]
    },
    {
        "id": "bb0cee4f-82b9-4feb-9c76-3fd3f1b32863",
        "interview_type_id": "bda305b5-4b0d-4b32-a99d-1abafe29260f",
        "name": "Verbal Communication",
        "description": "Clear and effective verbal expression",
        "weight": 1.3,
        "mastery_keywords": [
            "clarity",
            "articulation",
            "active listening",
            "presentation",
            "public speaking"
        ]
    }
]''')
QUESTIONS = json.loads(r'''[
    {
        "id": "c13cd661-ccd5-4fdd-b530-fd7a1a234547",
        "competency_id": "8ddbf03d-f305-4328-9b4a-967330624398",
        "text": "How would you develop a go-to-market strategy for a new product?",
        "question_type": "interview",
        "difficulty_level": "advanced",
        "ideal_answer": "Should cover market research, target audience identification, positioning, channel selection, and success metrics.",
        "evaluation_rubric": {},
        "max_score": 100
    },
    {
        "id": "8d0eb4d0-2d2c-4584-86c1-705f3e89fc04",
        "competency_id": "c4eab557-874d-4109-b452-3f1a910f4132",
        "text": "How would you create a content calendar for a B2B SaaS company?",
        "question_type": "interview",
        "difficulty_level": "advanced",
        "ideal_answer": "Should demonstrate strategic content planning aligned to business goals.",
        "evaluation_rubric": {},
        "max_score": 100
    },
    {
        "id": "d19de1a7-dc40-4eba-a3c3-29852c3fe8ca",
        "competency_id": "352f6114-e8fc-42da-af98-5af89381b67f",
        "text": "What is the difference between composition and inheritance? When would you use each?",
        "question_type": "interview",
        "difficulty_level": "advanced",
        "ideal_answer": "Should explain tradeoffs and when to prefer composition over inheritance.",
        "evaluation_rubric": {},
        "max_score": 100
    },
    {
        "id": "096993ce-69e0-4437-9669-72b154cbe0f1",
        "competency_id": "5f07f4bf-030a-429e-bce8-5ee1adcba11f",
        "text": "Compare arrays and linked lists. When would you choose one over the other?",
        "question_type": "interview",
        "difficulty_level": "beginner",
        "ideal_answer": "Should compare access time, insertion/deletion, and memory characteristics.",
        "evaluation_rubric": {},
        "max_score": 100
    },
    {
        "id": "914df35f-dfb4-4a58-b942-ba72a138be36",
        "competency_id": "0cad9128-2c0c-4df2-bc2e-c768d34dc393",
        "text": "Explain the concept of time complexity. Compare O(n), O(n log n), and O(n\u00b2).",
        "question_type": "interview",
        "difficulty_level": "beginner",
        "ideal_answer": "Should explain Big O notation with practical examples of each complexity class.",
        "evaluation_rubric": {},
        "max_score": 100
    },
    {
        "id": "0d6357bc-c2cd-443a-b119-db0c8edf0b57",
        "competency_id": "aff9b663-782b-474f-bc73-9d22aa252a4d",
        "text": "Explain the difference between correlation and causation with a business example.",
        "question_type": "interview",
        "difficulty_level": "beginner",
        "ideal_answer": "Must clearly distinguish the two concepts with a practical example.",
        "evaluation_rubric": {},
        "max_score": 100
    },
    {
        "id": "1aec82fb-1b11-4f7b-a2c3-f54c3903e177",
        "competency_id": "8ddbf03d-f305-4328-9b4a-967330624398",
        "text": "Describe your approach to product positioning in a competitive market.",
        "question_type": "interview",
        "difficulty_level": "intermediate",
        "ideal_answer": "Should discuss competitor analysis, unique differentiators, and target positioning.",
        "evaluation_rubric": {},
        "max_score": 100
    },
    {
        "id": "b39076a3-88c5-46bd-a6a4-1c48d6408ef0",
        "competency_id": "8ddbf03d-f305-4328-9b4a-967330624398",
        "text": "What frameworks do you use for understanding customer needs?",
        "question_type": "interview",
        "difficulty_level": "intermediate",
        "ideal_answer": "Demonstrate knowledge of at least 2-3 customer research frameworks.",
        "evaluation_rubric": {},
        "max_score": 100
    },
    {
        "id": "8d41091d-db26-49c4-8fe2-ceee63359f15",
        "competency_id": "c4eab557-874d-4109-b452-3f1a910f4132",
        "text": "Explain the key components of a successful SEO strategy.",
        "question_type": "interview",
        "difficulty_level": "intermediate",
        "ideal_answer": "Should cover on-page, off-page, and technical SEO fundamentals.",
        "evaluation_rubric": {},
        "max_score": 100
    },
    {
        "id": "21d9016b-cd24-4574-a07e-532647d6f6ce",
        "competency_id": "9b6c14d7-687d-4cc6-8eb6-64576bee7aed",
        "text": "How would you measure the ROI of a social media campaign?",
        "question_type": "interview",
        "difficulty_level": "intermediate",
        "ideal_answer": "Should explain metrics, attribution, and business impact measurement.",
        "evaluation_rubric": {},
        "max_score": 100
    },
    {
        "id": "fd0ec765-aff1-4acf-a14a-cc1b78ba7401",
        "competency_id": "352f6114-e8fc-42da-af98-5af89381b67f",
        "text": "Explain the four pillars of Object-Oriented Programming with examples.",
        "question_type": "interview",
        "difficulty_level": "intermediate",
        "ideal_answer": "Must explain all four pillars with concrete examples.",
        "evaluation_rubric": {},
        "max_score": 100
    },
    {
        "id": "87dac7fd-4eca-4f2d-a41c-960d6fadde1e",
        "competency_id": "5f07f4bf-030a-429e-bce8-5ee1adcba11f",
        "text": "Explain how a hash map works internally. What happens during a collision?",
        "question_type": "interview",
        "difficulty_level": "intermediate",
        "ideal_answer": "Must explain hashing, bucket storage, and collision resolution strategies.",
        "evaluation_rubric": {},
        "max_score": 100
    },
    {
        "id": "41013a41-9360-4a55-b29f-27dba312acc9",
        "competency_id": "aff9b663-782b-474f-bc73-9d22aa252a4d",
        "text": "How would you approach analyzing a dataset to find actionable business insights?",
        "question_type": "interview",
        "difficulty_level": "intermediate",
        "ideal_answer": "Should cover the full data analysis workflow from cleaning to insight presentation.",
        "evaluation_rubric": {},
        "max_score": 100
    },
    {
        "id": "b4dd3437-696f-4cc5-9328-0e8da83d70d8",
        "competency_id": "2638601e-7e04-454c-a5f1-e91e87a084f7",
        "text": "Explain the different types of SQL JOINs with examples.",
        "question_type": "interview",
        "difficulty_level": "intermediate",
        "ideal_answer": "Should explain at least 3 JOIN types with practical use cases.",
        "evaluation_rubric": {},
        "max_score": 100
    },
    {
        "id": "345e7fb4-e558-48eb-b9a5-da491849f507",
        "competency_id": "bb0cee4f-82b9-4feb-9c76-3fd3f1b32863",
        "text": "Tell me about a time you had to explain a complex idea to a non-technical audience.",
        "question_type": "interview",
        "difficulty_level": "intermediate",
        "ideal_answer": "Should demonstrate ability to adapt communication style to audience.",
        "evaluation_rubric": {},
        "max_score": 100
    },
    {
        "id": "4ef81efd-c8e4-4e5a-82e2-c53ef1f69d98",
        "competency_id": "13174430-622f-417f-9ff6-9adb1bb63ed3",
        "text": "Describe a situation where you had a disagreement with a team member. How did you resolve it?",
        "question_type": "interview",
        "difficulty_level": "intermediate",
        "ideal_answer": "Should show maturity in handling interpersonal conflicts professionally.",
        "evaluation_rubric": {},
        "max_score": 100
    },
    {
        "id": "d2a5aff9-3336-414f-96fd-b09529187973",
        "competency_id": "586304c8-d88a-4f99-a20d-8144ecd174a8",
        "text": "How would you design a paginated and secure list API in Django REST Framework?",
        "question_type": "interview",
        "difficulty_level": "intermediate",
        "ideal_answer": "Discuss token auth, permissions, pagination classes, filtering, and validation.",
        "evaluation_rubric": {
            "technical_accuracy": {
                "weight": 40,
                "criteria": [
                    "Correct DRF primitives"
                ]
            },
            "depth": {
                "weight": 30,
                "criteria": [
                    "Trade-offs and scaling"
                ]
            },
            "communication": {
                "weight": 30,
                "criteria": [
                    "Clear structure"
                ]
            }
        },
        "max_score": 100
    }
]''')
SESSIONS = json.loads(r'''[
    {
        "id": "115727e9-771e-41aa-b533-f134e00ae0b8",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "interview_type_id": "ae202ead-b0fb-48f7-8a9f-6f906c4d99ad",
        "status": "completed",
        "started_at": "2026-06-08T05:40:51.319142+00:00",
        "completed_at": "2026-06-08T05:42:24.814132+00:00",
        "questions": [
            {
                "id": "914df35f-dfb4-4a58-b942-ba72a138be36",
                "text": "Explain the concept of time complexity. Compare O(n), O(n log n), and O(n\u00b2).",
                "difficulty": "beginner",
                "type": "interview"
            },
            {
                "id": "87dac7fd-4eca-4f2d-a41c-960d6fadde1e",
                "text": "Explain how a hash map works internally. What happens during a collision?",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "fd0ec765-aff1-4acf-a14a-cc1b78ba7401",
                "text": "Explain the four pillars of Object-Oriented Programming with examples.",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "d19de1a7-dc40-4eba-a3c3-29852c3fe8ca",
                "text": "What is the difference between composition and inheritance? When would you use each?",
                "difficulty": "advanced",
                "type": "interview"
            },
            {
                "id": "096993ce-69e0-4437-9669-72b154cbe0f1",
                "text": "Compare arrays and linked lists. When would you choose one over the other?",
                "difficulty": "beginner",
                "type": "interview"
            }
        ],
        "use_voice": true
    },
    {
        "id": "b46cf71e-45ec-496f-a3f9-82b49264ece0",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "interview_type_id": "e075f3ec-75e5-40fc-a45a-2b4b423f12bb",
        "status": "completed",
        "started_at": "2026-06-05T13:05:13.697005+00:00",
        "completed_at": "2026-06-05T13:06:13.308040+00:00",
        "questions": [
            {
                "id": "0d6357bc-c2cd-443a-b119-db0c8edf0b57",
                "text": "Explain the difference between correlation and causation with a business example.",
                "difficulty": "beginner",
                "type": "interview"
            },
            {
                "id": "b4dd3437-696f-4cc5-9328-0e8da83d70d8",
                "text": "Explain the different types of SQL JOINs with examples.",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "41013a41-9360-4a55-b29f-27dba312acc9",
                "text": "How would you approach analyzing a dataset to find actionable business insights?",
                "difficulty": "intermediate",
                "type": "interview"
            }
        ],
        "use_voice": true
    },
    {
        "id": "10a51d82-aa9f-4a91-bf27-e4a21eb2222a",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "interview_type_id": "ae202ead-b0fb-48f7-8a9f-6f906c4d99ad",
        "status": "abandoned",
        "started_at": "2026-06-04T06:34:56.081715+00:00",
        "completed_at": null,
        "questions": [
            {
                "id": "914df35f-dfb4-4a58-b942-ba72a138be36",
                "text": "Explain the concept of time complexity. Compare O(n), O(n log n), and O(n\u00b2).",
                "difficulty": "beginner",
                "type": "interview"
            },
            {
                "id": "87dac7fd-4eca-4f2d-a41c-960d6fadde1e",
                "text": "Explain how a hash map works internally. What happens during a collision?",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "d19de1a7-dc40-4eba-a3c3-29852c3fe8ca",
                "text": "What is the difference between composition and inheritance? When would you use each?",
                "difficulty": "advanced",
                "type": "interview"
            },
            {
                "id": "fd0ec765-aff1-4acf-a14a-cc1b78ba7401",
                "text": "Explain the four pillars of Object-Oriented Programming with examples.",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "096993ce-69e0-4437-9669-72b154cbe0f1",
                "text": "Compare arrays and linked lists. When would you choose one over the other?",
                "difficulty": "beginner",
                "type": "interview"
            }
        ],
        "use_voice": true
    },
    {
        "id": "ae046f8d-29eb-4183-a3b0-ae3f03112a9a",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "interview_type_id": "bda305b5-4b0d-4b32-a99d-1abafe29260f",
        "status": "completed",
        "started_at": "2026-06-01T07:34:56.144484+00:00",
        "completed_at": "2026-06-01T07:36:14.916376+00:00",
        "questions": [
            {
                "id": "4ef81efd-c8e4-4e5a-82e2-c53ef1f69d98",
                "text": "Describe a situation where you had a disagreement with a team member. How did you resolve it?",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "345e7fb4-e558-48eb-b9a5-da491849f507",
                "text": "Tell me about a time you had to explain a complex idea to a non-technical audience.",
                "difficulty": "intermediate",
                "type": "interview"
            }
        ],
        "use_voice": true
    },
    {
        "id": "21e06658-7330-4897-9691-f7d57ce33b8c",
        "student_id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "interview_type_id": "ae202ead-b0fb-48f7-8a9f-6f906c4d99ad",
        "status": "abandoned",
        "started_at": "2026-05-30T11:39:09.464598+00:00",
        "completed_at": "2026-05-30T11:40:24.780540+00:00",
        "questions": [
            {
                "id": "914df35f-dfb4-4a58-b942-ba72a138be36",
                "text": "Explain the concept of time complexity. Compare O(n), O(n log n), and O(n\u00b2).",
                "difficulty": "beginner",
                "type": "interview"
            },
            {
                "id": "87dac7fd-4eca-4f2d-a41c-960d6fadde1e",
                "text": "Explain how a hash map works internally. What happens during a collision?",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "d19de1a7-dc40-4eba-a3c3-29852c3fe8ca",
                "text": "What is the difference between composition and inheritance? When would you use each?",
                "difficulty": "advanced",
                "type": "interview"
            },
            {
                "id": "096993ce-69e0-4437-9669-72b154cbe0f1",
                "text": "Compare arrays and linked lists. When would you choose one over the other?",
                "difficulty": "beginner",
                "type": "interview"
            },
            {
                "id": "fd0ec765-aff1-4acf-a14a-cc1b78ba7401",
                "text": "Explain the four pillars of Object-Oriented Programming with examples.",
                "difficulty": "intermediate",
                "type": "interview"
            }
        ],
        "use_voice": true
    },
    {
        "id": "7f1125f3-ebac-4aa6-b853-72cc6f5df736",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "interview_type_id": "012fec48-29c6-4bd9-88c1-28b6cf091724",
        "status": "abandoned",
        "started_at": "2026-05-27T11:34:06.813298+00:00",
        "completed_at": null,
        "questions": [
            {
                "id": "d2a5aff9-3336-414f-96fd-b09529187973",
                "text": "How would you design a paginated and secure list API in Django REST Framework?",
                "difficulty": "intermediate",
                "type": "interview"
            }
        ],
        "use_voice": true
    },
    {
        "id": "05cde7f4-c496-49e4-afc5-9e42392ff3f0",
        "student_id": "32442ada-98d6-4910-a8d1-1c8b324b4d4b",
        "interview_type_id": "012fec48-29c6-4bd9-88c1-28b6cf091724",
        "status": "abandoned",
        "started_at": "2026-05-27T11:27:30.514817+00:00",
        "completed_at": "2026-05-27T11:33:58.765035+00:00",
        "questions": [
            {
                "id": "d2a5aff9-3336-414f-96fd-b09529187973",
                "text": "How would you design a paginated and secure list API in Django REST Framework?",
                "difficulty": "intermediate",
                "type": "interview"
            }
        ],
        "use_voice": true
    },
    {
        "id": "bf31bd2d-7c61-4689-8285-dd56f6053de2",
        "student_id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "interview_type_id": "012fec48-29c6-4bd9-88c1-28b6cf091724",
        "status": "completed",
        "started_at": "2026-05-27T09:31:32.096974+00:00",
        "completed_at": "2026-05-27T09:31:44.774993+00:00",
        "questions": [
            {
                "id": "d2a5aff9-3336-414f-96fd-b09529187973",
                "text": "How would you design a paginated and secure list API in Django REST Framework?",
                "difficulty": "intermediate",
                "type": "interview"
            }
        ],
        "use_voice": true
    },
    {
        "id": "bb31883d-4a5a-4026-877f-5492c96f6a33",
        "student_id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "interview_type_id": "bda305b5-4b0d-4b32-a99d-1abafe29260f",
        "status": "completed",
        "started_at": "2026-05-27T09:29:19.419599+00:00",
        "completed_at": "2026-05-27T09:30:40.453719+00:00",
        "questions": [
            {
                "id": "4ef81efd-c8e4-4e5a-82e2-c53ef1f69d98",
                "text": "Describe a situation where you had a disagreement with a team member. How did you resolve it?",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "345e7fb4-e558-48eb-b9a5-da491849f507",
                "text": "Tell me about a time you had to explain a complex idea to a non-technical audience.",
                "difficulty": "intermediate",
                "type": "interview"
            }
        ],
        "use_voice": true
    },
    {
        "id": "61e2d0bf-e119-42d5-a2ca-1c334128a3b2",
        "student_id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "interview_type_id": "012fec48-29c6-4bd9-88c1-28b6cf091724",
        "status": "completed",
        "started_at": "2026-05-25T11:50:57.978884+00:00",
        "completed_at": "2026-05-25T11:52:45.380763+00:00",
        "questions": [
            {
                "id": "d2a5aff9-3336-414f-96fd-b09529187973",
                "text": "How would you design a paginated and secure list API in Django REST Framework?",
                "difficulty": "intermediate",
                "type": "interview"
            }
        ],
        "use_voice": true
    },
    {
        "id": "0de89b2a-ac8b-440c-a994-33432f2f3b5a",
        "student_id": "6b3b81d7-7ad0-43f6-b4bb-f422f22adc19",
        "interview_type_id": "012fec48-29c6-4bd9-88c1-28b6cf091724",
        "status": "completed",
        "started_at": "2026-05-25T10:30:43.679927+00:00",
        "completed_at": "2026-05-25T10:45:43.679927+00:00",
        "questions": [
            {
                "id": "d2a5aff9-3336-414f-96fd-b09529187973",
                "text": "How would you design a paginated and secure list API in Django REST Framework?",
                "difficulty": "intermediate"
            }
        ],
        "use_voice": false
    },
    {
        "id": "57001a7b-a84d-4e34-ad42-32b512745fa9",
        "student_id": "1f80459a-366f-4c05-8a2e-e262b2917cb9",
        "interview_type_id": "1ef33e91-3d0c-47ee-9f61-663bba03faed",
        "status": "abandoned",
        "started_at": "2026-05-25T07:08:39.306535+00:00",
        "completed_at": null,
        "questions": [
            {
                "id": "1aec82fb-1b11-4f7b-a2c3-f54c3903e177",
                "text": "Describe your approach to product positioning in a competitive market.",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "8d41091d-db26-49c4-8fe2-ceee63359f15",
                "text": "Explain the key components of a successful SEO strategy.",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "21d9016b-cd24-4574-a07e-532647d6f6ce",
                "text": "How would you measure the ROI of a social media campaign?",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "b39076a3-88c5-46bd-a6a4-1c48d6408ef0",
                "text": "What frameworks do you use for understanding customer needs?",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "8d0eb4d0-2d2c-4584-86c1-705f3e89fc04",
                "text": "How would you create a content calendar for a B2B SaaS company?",
                "difficulty": "advanced",
                "type": "interview"
            }
        ],
        "use_voice": true
    },
    {
        "id": "af8b44eb-5ccd-4c8c-9d6b-5a4584a2bbf7",
        "student_id": "1f80459a-366f-4c05-8a2e-e262b2917cb9",
        "interview_type_id": "1ef33e91-3d0c-47ee-9f61-663bba03faed",
        "status": "abandoned",
        "started_at": "2026-05-25T06:54:09.723833+00:00",
        "completed_at": null,
        "questions": [
            {
                "id": "c13cd661-ccd5-4fdd-b530-fd7a1a234547",
                "text": "How would you develop a go-to-market strategy for a new product?",
                "difficulty": "advanced",
                "type": "interview"
            },
            {
                "id": "8d41091d-db26-49c4-8fe2-ceee63359f15",
                "text": "Explain the key components of a successful SEO strategy.",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "21d9016b-cd24-4574-a07e-532647d6f6ce",
                "text": "How would you measure the ROI of a social media campaign?",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "1aec82fb-1b11-4f7b-a2c3-f54c3903e177",
                "text": "Describe your approach to product positioning in a competitive market.",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "8d0eb4d0-2d2c-4584-86c1-705f3e89fc04",
                "text": "How would you create a content calendar for a B2B SaaS company?",
                "difficulty": "advanced",
                "type": "interview"
            }
        ],
        "use_voice": true
    },
    {
        "id": "6021e8d0-2170-4601-b828-9a4f63b5ec0f",
        "student_id": "1f80459a-366f-4c05-8a2e-e262b2917cb9",
        "interview_type_id": "e075f3ec-75e5-40fc-a45a-2b4b423f12bb",
        "status": "abandoned",
        "started_at": "2026-05-25T06:50:04.184076+00:00",
        "completed_at": null,
        "questions": [
            {
                "id": "41013a41-9360-4a55-b29f-27dba312acc9",
                "text": "How would you approach analyzing a dataset to find actionable business insights?",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "b4dd3437-696f-4cc5-9328-0e8da83d70d8",
                "text": "Explain the different types of SQL JOINs with examples.",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "0d6357bc-c2cd-443a-b119-db0c8edf0b57",
                "text": "Explain the difference between correlation and causation with a business example.",
                "difficulty": "beginner",
                "type": "interview"
            }
        ],
        "use_voice": true
    },
    {
        "id": "2142d1d1-2c2d-46c4-95bf-c2ffb18f723e",
        "student_id": "1f80459a-366f-4c05-8a2e-e262b2917cb9",
        "interview_type_id": "bda305b5-4b0d-4b32-a99d-1abafe29260f",
        "status": "completed",
        "started_at": "2026-05-22T09:33:41.076997+00:00",
        "completed_at": "2026-05-22T09:36:08.902054+00:00",
        "questions": [
            {
                "id": "4ef81efd-c8e4-4e5a-82e2-c53ef1f69d98",
                "text": "Describe a situation where you had a disagreement with a team member. How did you resolve it?",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "345e7fb4-e558-48eb-b9a5-da491849f507",
                "text": "Tell me about a time you had to explain a complex idea to a non-technical audience.",
                "difficulty": "intermediate",
                "type": "interview"
            }
        ],
        "use_voice": true
    },
    {
        "id": "2f3645fc-258f-4e52-a6f7-52049f0e29d6",
        "student_id": "1f80459a-366f-4c05-8a2e-e262b2917cb9",
        "interview_type_id": "e075f3ec-75e5-40fc-a45a-2b4b423f12bb",
        "status": "abandoned",
        "started_at": "2026-05-22T09:31:34.808722+00:00",
        "completed_at": "2026-05-22T09:33:22.342647+00:00",
        "questions": [
            {
                "id": "0d6357bc-c2cd-443a-b119-db0c8edf0b57",
                "text": "Explain the difference between correlation and causation with a business example.",
                "difficulty": "beginner",
                "type": "interview"
            },
            {
                "id": "b4dd3437-696f-4cc5-9328-0e8da83d70d8",
                "text": "Explain the different types of SQL JOINs with examples.",
                "difficulty": "intermediate",
                "type": "interview"
            },
            {
                "id": "41013a41-9360-4a55-b29f-27dba312acc9",
                "text": "How would you approach analyzing a dataset to find actionable business insights?",
                "difficulty": "intermediate",
                "type": "interview"
            }
        ],
        "use_voice": true
    }
]''')
ANSWERS = json.loads(r'''[
    {
        "id": "e3f812b4-dad7-43ec-a4f0-7349fcc92476",
        "session_id": "2142d1d1-2c2d-46c4-95bf-c2ffb18f723e",
        "question_id": "4ef81efd-c8e4-4e5a-82e2-c53ef1f69d98",
        "question_number": 1,
        "answer_text": "hello  hi actually I don't know the answer so what can we done",
        "eval_status": "evaluated",
        "score": 16.0,
        "evaluation_json": {
            "overall_score": 16,
            "dimensions": {
                "technical_accuracy": {
                    "score": 2,
                    "feedback": "The candidate struggled to recall a personal experience and didn't demonstrate any understanding of conflict resolution.",
                    "max": 10
                },
                "depth": {
                    "score": 1,
                    "feedback": "The candidate didn't provide any details or insights, indicating a lack of depth in their answer.",
                    "max": 10
                }
            },
            "strengths": [
                "The candidate was honest about not knowing the answer"
            ],
            "weaknesses": [
                "Lack of personal experience, inability to recall a situation, and lack of insight into conflict resolution"
            ],
            "follow_up_recommendation": "Can you walk me through a time when you had to work through a difficult conversation with a team member?",
            "feedback": "While it's okay to not know the answer to every question, it's essential to show that you can think critically and recall personal experiences. This answer fell short of expectations.",
            "what_candidate_answered": "The candidate said they didn't know the answer and asked what could be done.",
            "ideal_answer_summary": "A strong answer would describe a specific situation where the candidate had a disagreement with a team member, explain how they approached the conflict, and detail how they resolved it. This would demonstrate maturity and effective communication skills.",
            "score_explanation": "The candidate's answer was limited to a brief statement of 'I don't know' and asking what could be done. While they showed honesty, they didn't demonstrate any understanding of conflict resolution or provide any personal experiences.",
            "confidence": 0.92
        },
        "ai_feedback": "While it's okay to not know the answer to every question, it's essential to show that you can think critically and recall personal experiences. This answer fell short of expectations.",
        "confidence_score": 0.92,
        "time_taken_seconds": 37
    },
    {
        "id": "defe6d82-f828-40f8-9404-8d96caf103b5",
        "session_id": "0de89b2a-ac8b-440c-a994-33432f2f3b5a",
        "question_id": "d2a5aff9-3336-414f-96fd-b09529187973",
        "question_number": 1,
        "answer_text": "I would use DRF pagination, JWT auth, permission classes, and query optimization.",
        "eval_status": "evaluated",
        "score": 82.0,
        "evaluation_json": {
            "overall_score": 82
        },
        "ai_feedback": "Strong structure and practical approach.",
        "confidence_score": 0.88,
        "time_taken_seconds": 95
    },
    {
        "id": "0cf227a8-0e76-4b35-976b-e6579e4abd58",
        "session_id": "61e2d0bf-e119-42d5-a2ca-1c334128a3b2",
        "question_id": "d2a5aff9-3336-414f-96fd-b09529187973",
        "question_number": 1,
        "answer_text": "hi",
        "eval_status": "evaluated",
        "score": 6.0,
        "evaluation_json": {
            "overall_score": 6,
            "dimensions": {
                "technical_accuracy": {
                    "score": 1,
                    "feedback": "Unfortunately, no correct DRF primitives were mentioned.",
                    "max": 10
                },
                "depth": {
                    "score": 0,
                    "feedback": "This answer lacked any discussion of trade-offs and scaling.",
                    "max": 10
                }
            },
            "strengths": [
                "The candidate attempted to answer the question"
            ],
            "weaknesses": [
                "Lack of technical knowledge, incomplete answer"
            ],
            "follow_up_recommendation": "Can you walk me through how you would handle authentication and authorization in this API?",
            "feedback": "This was an opportunity to showcase your understanding of Django REST Framework, but unfortunately, you didn't provide any relevant information. Remember to stay calm and think aloud during the interview.",
            "what_candidate_answered": "The candidate responded with a brief 'hi' without elaborating on the question.",
            "ideal_answer_summary": "A strong answer would discuss the use of token authentication, permissions, pagination classes, filtering, and validation in a Django REST Framework API, possibly including trade-offs and scaling considerations.",
            "score_explanation": "The candidate's score is low because they didn't demonstrate any understanding of the technical requirements for a paginated and secure list API in Django REST Framework. While they attempted to answer the question, their response was incomplete and lacked relevant information.",
            "confidence": 0.92
        },
        "ai_feedback": "This was an opportunity to showcase your understanding of Django REST Framework, but unfortunately, you didn't provide any relevant information. Remember to stay calm and think aloud during the interview.",
        "confidence_score": 0.92,
        "time_taken_seconds": 24
    },
    {
        "id": "c18a4bcb-f121-4b05-ba89-9a096d960476",
        "session_id": "bb31883d-4a5a-4026-877f-5492c96f6a33",
        "question_id": "4ef81efd-c8e4-4e5a-82e2-c53ef1f69d98",
        "question_number": 1,
        "answer_text": "hi",
        "eval_status": "evaluated",
        "score": 10.0,
        "evaluation_json": {
            "overall_score": 10,
            "dimensions": {
                "technical_accuracy": {
                    "score": 1,
                    "feedback": "Unfortunately, the candidate didn't demonstrate any technical accuracy in this response.",
                    "max": 10
                },
                "depth": {
                    "score": 1,
                    "feedback": "The candidate's answer lacked any depth or detail, making it difficult to assess their understanding of conflict resolution.",
                    "max": 10
                }
            },
            "strengths": [
                "Candidate made an attempt to answer the question"
            ],
            "weaknesses": [
                "Lack of technical accuracy",
                "Insufficient depth in the answer"
            ],
            "follow_up_recommendation": "Can you tell me more about a time when you had to work through a difficult situation with a team member?",
            "feedback": "This is a great opportunity to showcase your ability to handle conflicts professionally. Remember to provide specific examples and detail your thought process.",
            "what_candidate_answered": "The candidate simply said 'hi' without providing any further information.",
            "ideal_answer_summary": "A strong answer would describe a specific situation where you had a disagreement with a team member, explain how you approached the conflict, and detail the steps you took to resolve it.",
            "score_explanation": "The candidate's answer was very brief and lacked any relevant details, making it difficult to assess their understanding of conflict resolution. While they made an attempt to answer the question, they didn't demonstrate any technical accuracy or depth.",
            "confidence": 0.92
        },
        "ai_feedback": "This is a great opportunity to showcase your ability to handle conflicts professionally. Remember to provide specific examples and detail your thought process.",
        "confidence_score": 0.92,
        "time_taken_seconds": 15
    },
    {
        "id": "362c0444-3dfa-4333-880d-e0c1178efaf2",
        "session_id": "bf31bd2d-7c61-4689-8285-dd56f6053de2",
        "question_id": "d2a5aff9-3336-414f-96fd-b09529187973",
        "question_number": 1,
        "answer_text": "hi hello",
        "eval_status": "evaluated",
        "score": 10.0,
        "evaluation_json": {
            "overall_score": 10,
            "dimensions": {
                "technical_accuracy": {
                    "score": 1,
                    "feedback": "The candidate did not demonstrate any understanding of Django REST Framework primitives.",
                    "max": 10
                },
                "depth": {
                    "score": 1,
                    "feedback": "The candidate did not provide any insights into designing a paginated and secure list API.",
                    "max": 10
                }
            },
            "strengths": [],
            "weaknesses": [
                "Lack of understanding of Django REST Framework",
                "Incomplete answer"
            ],
            "follow_up_recommendation": "Can you walk me through your thought process on designing a paginated and secure API?",
            "feedback": "This response indicates a significant gap in understanding of Django REST Framework and API design principles. It's essential to demonstrate a basic understanding of technical concepts and provide thoughtful insights to move forward in the interview.",
            "what_candidate_answered": "The candidate responded with a greeting but did not provide any relevant information.",
            "ideal_answer_summary": "A strong answer would discuss token authentication, permissions, pagination classes, filtering, and validation, while also considering trade-offs and scalability.",
            "score_explanation": "The candidate's score is low due to the lack of technical accuracy and depth in their response. While it's essential to reward effort, a basic understanding of the topic is expected in an interview. To improve, the candidate should focus on demonstrating a solid grasp of Django REST Framework primitives and API design principles.",
            "confidence": 0.92
        },
        "ai_feedback": "This response indicates a significant gap in understanding of Django REST Framework and API design principles. It's essential to demonstrate a basic understanding of technical concepts and provide thoughtful insights to move forward in the interview.",
        "confidence_score": 0.92,
        "time_taken_seconds": 6
    },
    {
        "id": "d0529634-7f4c-4665-8ac9-f65849a765d4",
        "session_id": "ae046f8d-29eb-4183-a3b0-ae3f03112a9a",
        "question_id": "4ef81efd-c8e4-4e5a-82e2-c53ef1f69d98",
        "question_number": 1,
        "answer_text": "inte",
        "eval_status": "evaluated",
        "score": 10.0,
        "evaluation_json": {
            "overall_score": 10,
            "dimensions": {
                "technical_accuracy": {
                    "score": 1,
                    "feedback": "Unfortunately, the answer lacked any relevant details.",
                    "max": 10
                },
                "depth": {
                    "score": 1,
                    "feedback": "No attempt was made to describe the situation or resolution.",
                    "max": 10
                }
            },
            "strengths": [
                "Candidate attempted to answer the question"
            ],
            "weaknesses": [
                "Lack of relevant details",
                "No clear description of the situation or resolution"
            ],
            "follow_up_recommendation": "Can you walk me through a specific situation where you had a disagreement with a team member and how you handled it?",
            "feedback": "It's great that you're willing to participate in this conversation, but I need to see more substance in your answer to assess your experience and skills.",
            "what_candidate_answered": "The candidate was silent and didn't provide any information.",
            "ideal_answer_summary": "A strong answer would describe a specific situation where you disagreed with a team member, explain the steps you took to resolve it, and highlight any key takeaways or lessons learned.",
            "score_explanation": "The candidate's answer was completely silent, which resulted in a low score. If they had attempted to answer or provided some relevant details, their score would have been higher.",
            "confidence": 0.92
        },
        "ai_feedback": "It's great that you're willing to participate in this conversation, but I need to see more substance in your answer to assess your experience and skills.",
        "confidence_score": 0.92,
        "time_taken_seconds": 39
    },
    {
        "id": "0e3b1c35-0630-47b5-b038-6cab11cf37fc",
        "session_id": "b46cf71e-45ec-496f-a3f9-82b49264ece0",
        "question_id": "0d6357bc-c2cd-443a-b119-db0c8edf0b57",
        "question_number": 1,
        "answer_text": "hi",
        "eval_status": "evaluated",
        "score": 0.0,
        "evaluation_json": {
            "overall_score": 0,
            "dimensions": {
                "technical_accuracy": {
                    "score": 0,
                    "feedback": "The candidate failed to provide any relevant information.",
                    "max": 10
                },
                "depth": {
                    "score": 0,
                    "feedback": "The candidate did not demonstrate any understanding of the topic.",
                    "max": 10
                }
            },
            "strengths": [],
            "weaknesses": [
                "Lack of effort and understanding of the topic"
            ],
            "follow_up_recommendation": "Can you explain the difference between correlation and causation?",
            "feedback": "Unfortunately, the candidate did not provide any relevant information, so we cannot assess their understanding of the topic.",
            "what_candidate_answered": "The candidate was silent and did not provide any answer.",
            "ideal_answer_summary": "A strong answer would clearly distinguish between correlation and causation, providing a practical business example to illustrate the difference.",
            "score_explanation": "The candidate did not make any effort to answer the question, resulting in a low score. A candidate who provides any relevant information, even if it's basic, would be rewarded with a higher score.",
            "confidence": 0.92
        },
        "ai_feedback": "Unfortunately, the candidate did not provide any relevant information, so we cannot assess their understanding of the topic.",
        "confidence_score": 0.92,
        "time_taken_seconds": 15
    },
    {
        "id": "6018c479-79d9-43c4-8ba0-034158115dac",
        "session_id": "115727e9-771e-41aa-b533-f134e00ae0b8",
        "question_id": "914df35f-dfb4-4a58-b942-ba72a138be36",
        "question_number": 1,
        "answer_text": "HI HELLO",
        "eval_status": "evaluated",
        "score": 10.0,
        "evaluation_json": {
            "overall_score": 10,
            "dimensions": {
                "technical_accuracy": {
                    "score": 1,
                    "feedback": "Unfortunately, the candidate failed to demonstrate any understanding of time complexity.",
                    "max": 10
                },
                "depth": {
                    "score": 1,
                    "feedback": "The candidate's answer lacked any relevant technical keywords or concepts.",
                    "max": 10
                }
            },
            "strengths": [
                "Candidate made an attempt to answer the question"
            ],
            "weaknesses": [
                "Lack of understanding of time complexity",
                "No technical keywords or concepts were mentioned"
            ],
            "follow_up_recommendation": "Can you explain what you think time complexity means and how it relates to algorithm performance?",
            "feedback": "This is a great opportunity to learn about time complexity. It's a fundamental concept in computer science that helps us understand how efficient our algorithms are. Let's discuss it further.",
            "what_candidate_answered": "The candidate responded with a greeting, but failed to provide any relevant information.",
            "ideal_answer_summary": "A strong answer would explain Big O notation, provide practical examples of each complexity class (O(n), O(n log n), and O(n\u00b2)), and discuss how they relate to algorithm performance.",
            "score_explanation": "The candidate's score is low because they failed to demonstrate any understanding of time complexity, and their answer lacked any technical keywords or concepts. While they made an attempt to answer the question, their response was not relevant to the topic.",
            "confidence": 0.92
        },
        "ai_feedback": "This is a great opportunity to learn about time complexity. It's a fundamental concept in computer science that helps us understand how efficient our algorithms are. Let's discuss it further.",
        "confidence_score": 0.92,
        "time_taken_seconds": 9
    },
    {
        "id": "62b4c528-6ada-4864-a9d5-a7187382c9e6",
        "session_id": "2142d1d1-2c2d-46c4-95bf-c2ffb18f723e",
        "question_id": "345e7fb4-e558-48eb-b9a5-da491849f507",
        "question_number": 2,
        "answer_text": "vvhv",
        "eval_status": "evaluated",
        "score": 10.0,
        "evaluation_json": {
            "overall_score": 10,
            "dimensions": {
                "technical_accuracy": {
                    "score": 1,
                    "feedback": "Unfortunately, this answer does not demonstrate any technical accuracy.",
                    "max": 10
                },
                "depth": {
                    "score": 1,
                    "feedback": "The candidate's answer lacks depth and does not provide any insights or ideas.",
                    "max": 10
                }
            },
            "strengths": [],
            "weaknesses": [
                "Lack of effort",
                "No attempt to answer the question"
            ],
            "follow_up_recommendation": "Can you tell me a time when you had to explain a simple concept to a friend or family member?",
            "feedback": "It seems like this answer was not well-prepared or thought out. I encourage you to think about a time when you had to explain something complex to someone who might not understand it.",
            "what_candidate_answered": "The candidate remained silent and provided no answer.",
            "ideal_answer_summary": "A strong answer would demonstrate the ability to adapt communication style to the audience by sharing a specific example of a complex idea explained in a way that was easy to understand for a non-technical person.",
            "score_explanation": "This answer was scored low because the candidate did not attempt to answer the question. A score of 4 or higher would have been given if the candidate made an honest attempt, but unfortunately, that did not happen here.",
            "confidence": 0.92
        },
        "ai_feedback": "It seems like this answer was not well-prepared or thought out. I encourage you to think about a time when you had to explain something complex to someone who might not understand it.",
        "confidence_score": 0.92,
        "time_taken_seconds": 85
    },
    {
        "id": "aa7c72a7-dd82-4270-9a52-a653fd8ecf5e",
        "session_id": "bb31883d-4a5a-4026-877f-5492c96f6a33",
        "question_id": "345e7fb4-e558-48eb-b9a5-da491849f507",
        "question_number": 2,
        "answer_text": "no",
        "eval_status": "evaluated",
        "score": 40.0,
        "evaluation_json": {
            "overall_score": 40,
            "dimensions": {
                "technical_accuracy": {
                    "score": 0,
                    "feedback": "No attempt was made to answer the question.",
                    "max": 10
                },
                "depth": {
                    "score": 10,
                    "feedback": "This dimension is not applicable in this case, as the candidate did not provide any answer.",
                    "max": 10
                }
            },
            "strengths": [],
            "weaknesses": [
                "Lack of effort or preparation for the question"
            ],
            "follow_up_recommendation": "Can you tell me what you would do differently if faced with this type of question in the future?",
            "feedback": "It's great that you're here today, but it seems like you might have been caught off guard by this question. Remember that it's okay to take a moment to think before answering, and try to provide some insight or experience related to the question.",
            "what_candidate_answered": "The candidate did not answer the question.",
            "ideal_answer_summary": "A strong answer would involve sharing a personal experience where you had to explain a complex idea to a non-technical audience, highlighting your ability to adapt your communication style to the audience.",
            "score_explanation": "The candidate did not attempt to answer the question, so they did not demonstrate any technical accuracy. However, they could have at least acknowledged the question or asked for a moment to think before responding, which would have shown some effort and potentially earned a higher score.",
            "confidence": 0.92
        },
        "ai_feedback": "It's great that you're here today, but it seems like you might have been caught off guard by this question. Remember that it's okay to take a moment to think before answering, and try to provide some insight or experience related to the question.",
        "confidence_score": 0.92,
        "time_taken_seconds": 9
    },
    {
        "id": "79314c80-b808-49f9-83ce-c2a67f66b5fc",
        "session_id": "ae046f8d-29eb-4183-a3b0-ae3f03112a9a",
        "question_id": "345e7fb4-e558-48eb-b9a5-da491849f507",
        "question_number": 2,
        "answer_text": "fsdhjkfhdskfhkdf",
        "eval_status": "evaluated",
        "score": 6.0,
        "evaluation_json": {
            "overall_score": 6,
            "dimensions": {
                "technical_accuracy": {
                    "score": 1,
                    "feedback": "The candidate's answer was completely silent, indicating a lack of understanding or preparation.",
                    "max": 10
                },
                "depth": {
                    "score": 0,
                    "feedback": "There was no attempt to demonstrate depth in their answer.",
                    "max": 10
                }
            },
            "strengths": [],
            "weaknesses": [
                "Lack of preparation or understanding of the question",
                "Failed to demonstrate any attempt to answer the question"
            ],
            "follow_up_recommendation": "Can you tell me what you think this question is getting at, and how you would approach it?",
            "feedback": "Unfortunately, this candidate's answer was completely silent, indicating a lack of preparation or understanding of the question. This can be a red flag in an interview, as it suggests that the candidate may struggle to think on their feet or communicate effectively.",
            "what_candidate_answered": "The candidate did not provide any answer to the question.",
            "ideal_answer_summary": "A strong answer would demonstrate the candidate's ability to adapt their communication style to a non-technical audience, using clear and simple language to explain a complex idea.",
            "score_explanation": "The candidate received a low score because their answer was completely silent, indicating a lack of preparation or understanding of the question. This lack of effort or understanding would be a concern in an interview, as it suggests that the candidate may struggle to communicate effectively or think on their feet.",
            "confidence": 0.92
        },
        "ai_feedback": "Unfortunately, this candidate's answer was completely silent, indicating a lack of preparation or understanding of the question. This can be a red flag in an interview, as it suggests that the candidate may struggle to think on their feet or communicate effectively.",
        "confidence_score": 0.92,
        "time_taken_seconds": 15
    },
    {
        "id": "1ba8f0c4-d784-48ec-b40b-2022c1497a1d",
        "session_id": "b46cf71e-45ec-496f-a3f9-82b49264ece0",
        "question_id": "b4dd3437-696f-4cc5-9328-0e8da83d70d8",
        "question_number": 2,
        "answer_text": "hiii",
        "eval_status": "evaluated",
        "score": 22.0,
        "evaluation_json": {
            "overall_score": 22,
            "dimensions": {
                "technical_accuracy": {
                    "score": 1,
                    "feedback": "The candidate failed to demonstrate any understanding of SQL JOINs.",
                    "max": 10
                },
                "depth": {
                    "score": 4,
                    "feedback": "The candidate made an honest attempt but lacked depth in their response.",
                    "max": 10
                }
            },
            "strengths": [
                "The candidate made an effort to respond"
            ],
            "weaknesses": [
                "Lack of understanding of SQL JOINs",
                "Insufficient explanation or examples"
            ],
            "follow_up_recommendation": "Can you walk me through an example of how you would use a JOIN in a real-world scenario?",
            "feedback": "While I appreciate your enthusiasm, this is a fundamental concept in SQL that requires more attention. Let's work on developing your understanding of JOINs and how to apply them in practical situations.",
            "what_candidate_answered": "The candidate simply said 'hiii' without providing any explanation or answer.",
            "ideal_answer_summary": "A strong answer would explain at least three types of SQL JOINs (INNER, LEFT, RIGHT, FULL OUTER), providing practical examples of when to use each.",
            "score_explanation": "The candidate's score reflects their effort to respond, but unfortunately, they failed to demonstrate any understanding of SQL JOINs. A stronger answer would have included specific examples or explanations of JOIN types.",
            "confidence": 0.92
        },
        "ai_feedback": "While I appreciate your enthusiasm, this is a fundamental concept in SQL that requires more attention. Let's work on developing your understanding of JOINs and how to apply them in practical situations.",
        "confidence_score": 0.92,
        "time_taken_seconds": 5
    },
    {
        "id": "102550b6-5c4c-411a-9185-7ccf670f0d4b",
        "session_id": "115727e9-771e-41aa-b533-f134e00ae0b8",
        "question_id": "87dac7fd-4eca-4f2d-a41c-960d6fadde1e",
        "question_number": 2,
        "answer_text": "NO I DINT KNOWNAYTHINGN",
        "eval_status": "evaluated",
        "score": 14.0,
        "evaluation_json": {
            "overall_score": 14,
            "dimensions": {
                "technical_accuracy": {
                    "score": 1,
                    "feedback": "The candidate's answer lacked any technical accuracy.",
                    "max": 10
                },
                "depth": {
                    "score": 2,
                    "feedback": "The candidate failed to demonstrate any understanding of the topic.",
                    "max": 10
                }
            },
            "strengths": [],
            "weaknesses": [
                "Lack of technical knowledge",
                "Failed to demonstrate understanding of hash map concepts"
            ],
            "follow_up_recommendation": "Can you describe a scenario where you've encountered a hash map in a real-world application?",
            "feedback": "This is a great opportunity to learn and improve. Let's work on understanding the basics of hash maps and collision resolution strategies.",
            "what_candidate_answered": "The candidate stated they didn't know anything about how a hash map works internally.",
            "ideal_answer_summary": "A strong answer would explain hashing, bucket storage, and collision resolution strategies, such as open addressing or chaining.",
            "score_explanation": "The candidate's score is low due to their complete lack of technical accuracy and understanding of the topic. While they showed no effort, a candidate who makes an honest attempt and demonstrates basic understanding of relevant technical keywords would receive a higher score.",
            "confidence": 0.92
        },
        "ai_feedback": "This is a great opportunity to learn and improve. Let's work on understanding the basics of hash maps and collision resolution strategies.",
        "confidence_score": 0.92,
        "time_taken_seconds": 18
    },
    {
        "id": "17eca737-d311-4874-b401-e029b7d8901a",
        "session_id": "b46cf71e-45ec-496f-a3f9-82b49264ece0",
        "question_id": "41013a41-9360-4a55-b29f-27dba312acc9",
        "question_number": 3,
        "answer_text": "hiiii",
        "eval_status": "evaluated",
        "score": 22.0,
        "evaluation_json": {
            "overall_score": 22,
            "dimensions": {
                "technical_accuracy": {
                    "score": 1,
                    "feedback": "The candidate failed to demonstrate any technical understanding of the data analysis process.",
                    "max": 10
                },
                "depth": {
                    "score": 4,
                    "feedback": "The candidate made an honest attempt but lacked depth in their response, failing to cover any part of the data analysis workflow.",
                    "max": 10
                }
            },
            "strengths": [
                "Candidate made an honest attempt to answer the question"
            ],
            "weaknesses": [
                "Lack of technical understanding, shallow response"
            ],
            "follow_up_recommendation": "Can you walk me through your thought process when approaching a new dataset?",
            "feedback": "While you made a good effort, it's essential to demonstrate a clear understanding of the data analysis process to provide actionable business insights.",
            "what_candidate_answered": "The candidate responded with a simple greeting.",
            "ideal_answer_summary": "A strong answer should cover the full data analysis workflow from cleaning to insight presentation, including technical details and examples.",
            "score_explanation": "You demonstrated a willingness to try, but lacked technical accuracy and depth in your response. To improve, focus on covering the entire data analysis process and providing relevant technical details.",
            "confidence": 0.92
        },
        "ai_feedback": "While you made a good effort, it's essential to demonstrate a clear understanding of the data analysis process to provide actionable business insights.",
        "confidence_score": 0.92,
        "time_taken_seconds": 5
    },
    {
        "id": "b2bd15da-78e3-48d6-9d7c-62a94ed4bef0",
        "session_id": "115727e9-771e-41aa-b533-f134e00ae0b8",
        "question_id": "fd0ec765-aff1-4acf-a14a-cc1b78ba7401",
        "question_number": 3,
        "answer_text": "OKAY",
        "eval_status": "evaluated",
        "score": 38.0,
        "evaluation_json": {
            "overall_score": 38,
            "dimensions": {
                "technical_accuracy": {
                    "score": 5,
                    "feedback": "The candidate attempted to answer, but provided no actual information.",
                    "max": 10
                },
                "depth": {
                    "score": 2,
                    "feedback": "The candidate's answer lacked any substantial content or examples.",
                    "max": 10
                }
            },
            "strengths": [
                "The candidate made an honest attempt to answer the question."
            ],
            "weaknesses": [
                "Lack of actual information or examples provided.",
                "Insufficient understanding of the four pillars of Object-Oriented Programming."
            ],
            "follow_up_recommendation": "Can you give me an example of how encapsulation is used in a real-world scenario?",
            "feedback": "While it's great that you made an effort to answer, providing actual information and examples is crucial in a technical interview. Let's work on building your understanding and confidence in Object-Oriented Programming concepts.",
            "what_candidate_answered": "The candidate responded with 'OKAY', which didn't provide any actual information or examples.",
            "ideal_answer_summary": "A strong answer should explain all four pillars of Object-Oriented Programming (encapsulation, inheritance, polymorphism, and abstraction) with concrete examples.",
            "score_explanation": "The candidate's score reflects their honest attempt to answer, but the lack of actual information and examples greatly impacted their technical accuracy and depth scores.",
            "confidence": 0.92
        },
        "ai_feedback": "While it's great that you made an effort to answer, providing actual information and examples is crucial in a technical interview. Let's work on building your understanding and confidence in Object-Oriented Programming concepts.",
        "confidence_score": 0.92,
        "time_taken_seconds": 6
    },
    {
        "id": "6836bda4-41c1-47d2-89ce-a173f0dabeb1",
        "session_id": "115727e9-771e-41aa-b533-f134e00ae0b8",
        "question_id": "d19de1a7-dc40-4eba-a3c3-29852c3fe8ca",
        "question_number": 4,
        "answer_text": "HI",
        "eval_status": "evaluated",
        "score": 6.0,
        "evaluation_json": {
            "overall_score": 6,
            "dimensions": {
                "technical_accuracy": {
                    "score": 1,
                    "feedback": "The candidate failed to provide any technical information.",
                    "max": 10
                },
                "depth": {
                    "score": 0,
                    "feedback": "The candidate did not attempt to answer the question.",
                    "max": 10
                }
            },
            "strengths": [],
            "weaknesses": [
                "Lack of technical knowledge",
                "Failed to make any attempt to answer the question"
            ],
            "follow_up_recommendation": "Can you explain what you think composition and inheritance are, and how they might be used in a programming context?",
            "feedback": "Unfortunately, this answer did not demonstrate any understanding of the concepts of composition and inheritance. I encourage you to review these topics and be prepared to discuss them in future interviews.",
            "what_candidate_answered": "The candidate was completely silent.",
            "ideal_answer_summary": "A strong answer would explain the difference between composition and inheritance, and discuss trade-offs and scenarios where each is preferred.",
            "score_explanation": "The candidate did not provide any information about composition and inheritance, so they scored low on technical accuracy. They also did not attempt to answer the question, so they scored 0 on depth.",
            "confidence": 0.92
        },
        "ai_feedback": "Unfortunately, this answer did not demonstrate any understanding of the concepts of composition and inheritance. I encourage you to review these topics and be prepared to discuss them in future interviews.",
        "confidence_score": 0.92,
        "time_taken_seconds": 5
    },
    {
        "id": "41a64ebb-e055-44c8-9217-907845140f4f",
        "session_id": "115727e9-771e-41aa-b533-f134e00ae0b8",
        "question_id": "096993ce-69e0-4437-9669-72b154cbe0f1",
        "question_number": 5,
        "answer_text": "HI",
        "eval_status": "evaluated",
        "score": 10.0,
        "evaluation_json": {
            "overall_score": 10,
            "dimensions": {
                "technical_accuracy": {
                    "score": 1,
                    "feedback": "The candidate did not provide any relevant information about arrays and linked lists.",
                    "max": 10
                },
                "depth": {
                    "score": 1,
                    "feedback": "The candidate did not demonstrate any understanding of the topic.",
                    "max": 10
                }
            },
            "strengths": [],
            "weaknesses": [
                "Lack of relevant information",
                "Insufficient understanding of the topic"
            ],
            "follow_up_recommendation": "Can you tell me what you know about arrays and linked lists?",
            "feedback": "It's great that you're here to learn and share your thoughts, but this time, it's essential to demonstrate your understanding of the topic. Let's try again, and I'll be happy to guide you through the process.",
            "what_candidate_answered": "The candidate said 'HI'.",
            "ideal_answer_summary": "A strong answer would compare arrays and linked lists in terms of access time, insertion/deletion, and memory characteristics, and provide scenarios where one is preferred over the other.",
            "score_explanation": "The candidate did not provide any relevant information, so their technical accuracy and depth scores are low. However, I want to encourage them to try again and demonstrate their understanding of the topic.",
            "confidence": 0.92
        },
        "ai_feedback": "It's great that you're here to learn and share your thoughts, but this time, it's essential to demonstrate your understanding of the topic. Let's try again, and I'll be happy to guide you through the process.",
        "confidence_score": 0.92,
        "time_taken_seconds": 3
    }
]''')
FEEDBACKS = json.loads(r'''[
    {
        "id": "889ceb15-781b-4d93-a2c2-ecb2ac0d462b",
        "session_id": "115727e9-771e-41aa-b533-f134e00ae0b8",
        "total_score": 15.6,
        "competency_scores": {
            "Algorithms": 10.0,
            "Data Structures": 12.0,
            "Object-Oriented Programming": 22.0
        },
        "dimension_averages": {
            "technical_accuracy": {
                "score": 1.8,
                "max": 10
            },
            "depth": {
                "score": 1.2,
                "max": 10
            }
        },
        "strengths": [
            "Candidate made an attempt to answer the question",
            "The candidate made an honest attempt to answer the question."
        ],
        "weaknesses": [
            "Lack of understanding of time complexity",
            "No technical keywords or concepts were mentioned",
            "Lack of technical knowledge",
            "Failed to demonstrate understanding of hash map concepts",
            "Lack of actual information or examples provided."
        ],
        "feedback_summary": "**Performance Summary:**\nI want to commend you on your willingness to participate in this mock interview and take the first step towards improving your technical skills. Your enthusiasm and eagerness to learn are truly admirable, and I'm confident that with practice and dedication, you'll excel in your future interviews. Although your overall score indicates areas for improvement, your effort and potential are undeniable.\n\n**Single Biggest Strength:**\nYour exceptional understanding of Object-Oriented Programming (OOP) concepts, particularly the four pillars, is a significant strength. Your attempt to explain these concepts, even if not entirely accurate, showcases your willingness to learn and apply theoretical knowledge in a practical context.\n\n**Single Biggest Area for Improvement:**\nOne area where you can focus your learning efforts is developing a deeper understanding of fundamental computer science concepts, such as time complexity, hash maps, and data structures like arrays and linked lists. This will not only enhance your technical skills but also enable you to communicate complex ideas more effectively, making you a more confident and compelling candidate in future interviews."
    },
    {
        "id": "47307574-488d-4073-a590-8afc21c5b321",
        "session_id": "b46cf71e-45ec-496f-a3f9-82b49264ece0",
        "total_score": 14.7,
        "competency_scores": {
            "Data Analysis": 11.0,
            "SQL & Databases": 22.0
        },
        "dimension_averages": {
            "technical_accuracy": {
                "score": 0.7,
                "max": 10
            },
            "depth": {
                "score": 2.7,
                "max": 10
            }
        },
        "strengths": [
            "The candidate made an effort to respond",
            "Candidate made an honest attempt to answer the question"
        ],
        "weaknesses": [
            "Lack of effort and understanding of the topic",
            "Lack of understanding of SQL JOINs",
            "Insufficient explanation or examples",
            "Lack of technical understanding, shallow response"
        ],
        "feedback_summary": "**Performance Summary:**\nI want to start by acknowledging your enthusiasm and effort in the mock interview. Although your overall score indicates areas for improvement, I believe your eagerness to learn and grow is a significant strength that will serve you well in your future endeavors. With dedication and practice, I'm confident you'll make significant strides in developing your technical skills.\n\n**Single Biggest Strength:**\nYour ability to explain the concept of SQL JOINs with examples is a notable strength, showcasing your technical foundation in database management. Your willingness to share your knowledge, even if it requires refinement, demonstrates your potential to develop into a skilled data professional.\n\n**Single Biggest Area for Improvement:**\nOne exciting area for growth is developing a deeper understanding of statistical concepts, such as correlation and causation. By exploring real-world business examples and practicing your explanations, you'll enhance your ability to analyze complex data and provide actionable insights, ultimately making you a more effective data-driven decision-maker."
    },
    {
        "id": "eb3f5aed-c5c2-49aa-a9ab-b4ce3aa0b965",
        "session_id": "ae046f8d-29eb-4183-a3b0-ae3f03112a9a",
        "total_score": 8.0,
        "competency_scores": {
            "Teamwork": 10.0,
            "Verbal Communication": 6.0
        },
        "dimension_averages": {
            "technical_accuracy": {
                "score": 1.0,
                "max": 10
            },
            "depth": {
                "score": 0.5,
                "max": 10
            }
        },
        "strengths": [
            "Candidate attempted to answer the question"
        ],
        "weaknesses": [
            "Lack of relevant details",
            "No clear description of the situation or resolution",
            "Lack of preparation or understanding of the question",
            "Failed to demonstrate any attempt to answer the question"
        ],
        "feedback_summary": "**Performance Summary:**\nI want to commend you on taking the initiative to participate in this mock interview, demonstrating your enthusiasm and commitment to growth. Although you faced some challenges, your effort and willingness to engage are truly commendable, and I'm confident that with continued practice, you'll excel in your future interviews. Your positive attitude and eagerness to learn are assets that will undoubtedly serve you well in your career.\n\n**Single Biggest Strength:**\nOne of your standout moments was when you effectively described a situation where you had a disagreement with a team member and how you resolved it. Your ability to articulate a clear, relatable example showcases your excellent communication skills and capacity to think critically in a challenging situation.\n\n**Single Biggest Area for Improvement:**\nWhile you demonstrated a strong foundation in some areas, your response to explaining a complex idea to a non-technical audience was a notable area for growth. I encourage you to focus on developing your ability to break down complex concepts into simple, accessible language, which will undoubtedly enhance your communication skills and confidence in articulating your ideas effectively."
    },
    {
        "id": "db4e70dc-5bc3-4e9b-b649-5c43f94cea02",
        "session_id": "bf31bd2d-7c61-4689-8285-dd56f6053de2",
        "total_score": 10.0,
        "competency_scores": {
            "API Design": 10.0
        },
        "dimension_averages": {
            "technical_accuracy": {
                "score": 1.0,
                "max": 10
            },
            "depth": {
                "score": 1.0,
                "max": 10
            }
        },
        "strengths": [],
        "weaknesses": [
            "Lack of understanding of Django REST Framework",
            "Incomplete answer"
        ],
        "feedback_summary": "**Performance Summary:**\nCongratulations on participating in the mock interview, and thank you for your enthusiasm and effort. Although the overall score was not as high as we had hoped, it's clear that you have a strong foundation to build upon, and we're excited to see your growth and development in the field. Your willingness to learn and improve is truly commendable.\n\n**Single Biggest Strength:**\nOne of your greatest strengths lies in your ability to articulate complex concepts in a clear and concise manner, which is an essential skill for any technical professional. Your communication style is engaging, and it's evident that you have a strong passion for technology, which shines through in your responses.\n\n**Single Biggest Area for Improvement:**\nWhile you demonstrated some gaps in understanding key technical concepts, this presents an exciting opportunity for growth and learning. To further develop your skills, focus on expanding your knowledge of Django REST Framework and API design principles, and don't be afraid to ask questions or seek guidance from experienced professionals \u2013 this will help you build a solid foundation for future success in the field."
    },
    {
        "id": "63bddb4c-5efe-48e9-b7aa-4d236b88eb69",
        "session_id": "bb31883d-4a5a-4026-877f-5492c96f6a33",
        "total_score": 25.0,
        "competency_scores": {
            "Teamwork": 10.0,
            "Verbal Communication": 40.0
        },
        "dimension_averages": {
            "technical_accuracy": {
                "score": 0.5,
                "max": 10
            },
            "depth": {
                "score": 5.5,
                "max": 10
            }
        },
        "strengths": [
            "Candidate made an attempt to answer the question"
        ],
        "weaknesses": [
            "Lack of technical accuracy",
            "Insufficient depth in the answer",
            "Lack of effort or preparation for the question"
        ],
        "feedback_summary": "**Performance Summary:**\nIt was wonderful to see you take the initiative to participate in this mock interview, and I appreciate the effort you put into sharing your experiences and thoughts. Although there's room for improvement, your potential shines through, and I'm excited to see you grow and develop your skills further. Keep up the good work, and I'm confident you'll excel in future interviews.\n\n**Single Biggest Strength:**\nYour ability to articulate complex ideas in a clear and concise manner is truly impressive, as evident in your response to the question about explaining a complex idea to a non-technical audience. You demonstrated a great capacity for breaking down complex concepts into relatable terms, which is a valuable skill in any professional setting.\n\n**Single Biggest Area for Improvement:**\nWhile you handled the disagreement scenario question with some success, I believe there's an opportunity for you to further develop your storytelling skills by providing more specific examples and details about your thought process. This will not only make your responses more engaging but also help you to effectively communicate your problem-solving approach and professional growth."
    },
    {
        "id": "7431a8a8-3005-45fe-a869-5d879cc5d2c4",
        "session_id": "61e2d0bf-e119-42d5-a2ca-1c334128a3b2",
        "total_score": 6.0,
        "competency_scores": {
            "API Design": 6.0
        },
        "dimension_averages": {
            "technical_accuracy": {
                "score": 1.0,
                "max": 10
            },
            "depth": {
                "score": 0.0,
                "max": 10
            }
        },
        "strengths": [
            "The candidate attempted to answer the question"
        ],
        "weaknesses": [
            "Lack of technical knowledge, incomplete answer"
        ],
        "feedback_summary": "**Performance Summary:**\nI want to commend you on your effort to participate in this mock interview, and I'm excited to see your potential in a real interview setting. Although your overall score was lower than expected, I believe you have a strong foundation to build upon, and with practice and experience, you'll excel in technical interviews. Keep up the good work, and I'm confident you'll see significant improvement in the future.\n\n**Single Biggest Strength:**\nYou demonstrated a great attitude and willingness to learn during the interview, which is a fantastic asset in any technical role. I was impressed by your eagerness to share your thoughts and ideas, even when faced with challenging questions.\n\n**Single Biggest Area for Improvement:**\nOne area where you can focus on growth is developing a more comprehensive understanding of Django REST Framework, particularly when it comes to designing complex APIs. This is an exciting opportunity for you to delve deeper into the framework and explore its capabilities, which will undoubtedly enhance your confidence and expertise in future interviews."
    },
    {
        "id": "14751d2e-1dfb-4067-8758-e7cd04dee446",
        "session_id": "0de89b2a-ac8b-440c-a994-33432f2f3b5a",
        "total_score": 82.0,
        "competency_scores": {
            "API Design": 82
        },
        "dimension_averages": {
            "technical_accuracy": {
                "avg": 8.2,
                "max": 10
            }
        },
        "strengths": [
            "Clear API design fundamentals"
        ],
        "weaknesses": [
            "Could include caching details"
        ],
        "feedback_summary": "Good fundamentals with room for production-level depth."
    },
    {
        "id": "3c7f9001-eaf9-4497-a4c5-0ff88732ec8b",
        "session_id": "2142d1d1-2c2d-46c4-95bf-c2ffb18f723e",
        "total_score": 13.0,
        "competency_scores": {
            "Teamwork": 16.0,
            "Verbal Communication": 10.0
        },
        "dimension_averages": {
            "technical_accuracy": {
                "score": 1.5,
                "max": 10
            },
            "depth": {
                "score": 1.0,
                "max": 10
            }
        },
        "strengths": [
            "The candidate was honest about not knowing the answer"
        ],
        "weaknesses": [
            "Lack of personal experience, inability to recall a situation, and lack of insight into conflict resolution",
            "Lack of effort",
            "No attempt to answer the question"
        ],
        "feedback_summary": "**Performance Summary:**\nI want to commend you on your willingness to participate in this mock interview, which demonstrates your enthusiasm for the opportunity. Although there were areas where you could improve, your effort and eagerness to learn are truly commendable. I believe with practice and preparation, you have the potential to excel in this field.\n\n**Single Biggest Strength:**\nYour ability to recall a personal experience and describe a situation where you had a disagreement with a team member was impressive. You showed a good understanding of how to approach conflict resolution, and your answer demonstrated a positive and constructive attitude.\n\n**Single Biggest Area for Improvement:**\nOne area where you could improve is in preparing thoughtful, well-structured responses to complex questions. This will be an exciting opportunity for you to develop your critical thinking skills and learn how to effectively communicate your ideas and experiences. With practice and reflection, I'm confident you'll become more confident and articulate in your responses."
    }
]''')

def parse_date(date_str):
    if not date_str:
        return None
    try:
        if 'T' in date_str:
            clean_str = date_str.replace('Z', '+00:00')
            dt = datetime.fromisoformat(clean_str)
            if dt.tzinfo is None:
                from datetime import timezone as dt_timezone
                dt = timezone.make_aware(dt, dt_timezone.utc)
            return dt
        else:
            return datetime.fromisoformat(date_str).date()
    except Exception as e:
        print(f"Error parsing date {date_str}: {e}")
        return None

def seed_database():
    print("Starting database seeding...")
    
    with transaction.atomic():
        print("Cleaning old data...")
        
        def clear_model(model):
            if hasattr(model, 'all_objects'):
                model.all_objects.all().hard_delete()
            else:
                model.objects.all().delete()

        clear_model(InterviewFeedback)
        clear_model(InterviewAnswer)
        clear_model(MockInterviewSession)
        clear_model(Question)
        clear_model(Competency)
        clear_model(InterviewType)
        clear_model(InterviewDomain)
        
        clear_model(ApplicationRound)
        clear_model(ApplicationStatusHistory)
        clear_model(Application)
        clear_model(JobRound)
        clear_model(Job)
        
        clear_model(PlacementAssignment)
        clear_model(Placement)
        
        clear_model(BuiltResume)
        clear_model(ResumeTemplate)
        
        clear_model(Achievement)
        clear_model(Certification)
        clear_model(Education)
        clear_model(Project)
        clear_model(Skill)
        clear_model(Experience)
        clear_model(StudentProfile)
        clear_model(Student)
        clear_model(User)
        
        # 1. Create Users
        print("Creating Users...")
        for u in USERS:
            User.objects.create_user(
                id=u['id'],
                login_id=u['login_id'],
                email=u['email'],
                password=u['password'],
                name=u['name'],
                role=u['role'],
                temp_password_flag=u['temp_password_flag'],
                password_reset_required=u['password_reset_required'],
                is_staff=u['is_staff'],
                is_superuser=u['is_superuser'],
                can_manage_students=u['can_manage_students'],
                can_manage_placements=u['can_manage_placements'],
                can_manage_resumes=u['can_manage_resumes']
            )
            
        # 2. Create Students
        print("Creating Students...")
        for s in STUDENTS:
            Student.objects.create(
                id=s['id'],
                user_id=s['user_id'],
                name=s['name'],
                registration_number=s['registration_number'],
                email=s['email'],
                passing_year=s['passing_year'],
                course=s['course'],
                stream=s['stream'],
                semester=s['semester'],
                attendance=s['attendance'],
                cgpa=s['cgpa'],
                phone_number=s['phone_number'],
                year=s['year'],
                category=s['category'],
                is_category_manual=s['is_category_manual'],
                backlogs=s['backlogs'],
                backlogs_count=s['backlogs_count'],
                training_attendance=s['training_attendance']
            )

        # 3. Create Profiles, Skills, Projects, Educations, Certifications, Achievements, Experiences
        print("Creating Career Profiles & Student details...")
        for p in PROFILES:
            StudentProfile.objects.create(
                id=p['id'],
                student_id=p['student_id'],
                phone=p['phone'],
                location=p['location'],
                professional_summary=p['professional_summary'],
                linkedin=p['linkedin'],
                github=p['github'],
                portfolio=p['portfolio']
            )

        for sk in SKILLS:
            Skill.objects.create(
                id=sk['id'],
                profile_id=sk['profile_id'],
                category=sk['category'],
                name=sk['name'],
                proficiency=sk['proficiency']
            )

        for proj in PROJECTS:
            Project.objects.create(
                id=proj['id'],
                profile_id=proj['profile_id'],
                title=proj['title'],
                description=proj['description'],
                technologies=proj['technologies'],
                link=proj['link'],
                date=parse_date(proj['date'])
            )

        for edu in EDUCATIONS:
            Education.objects.create(
                id=edu['id'],
                profile_id=edu['profile_id'],
                institution=edu['institution'],
                degree=edu['degree'],
                field=edu['field'],
                graduation_date=parse_date(edu['graduation_date']),
                gpa=edu['gpa'],
                honors=edu['honors']
            )

        for cert in CERTIFICATIONS:
            Certification.objects.create(
                id=cert['id'],
                profile_id=cert['profile_id'],
                name=cert['name'],
                issuer=cert['issuer'],
                date=parse_date(cert['date']),
                credential_url=cert['credential_url']
            )

        for ach in ACHIEVEMENTS:
            Achievement.objects.create(
                id=ach['id'],
                profile_id=ach['profile_id'],
                title=ach['title'],
                issuer=ach['issuer'],
                date=parse_date(ach['date']),
                description=ach['description']
            )

        for exp in EXPERIENCES:
            Experience.objects.create(
                id=exp['id'],
                profile_id=exp['profile_id'],
                company=exp['company'],
                position=exp['position'],
                start_date=parse_date(exp['start_date']),
                end_date=parse_date(exp['end_date']),
                is_current=exp['is_current'],
                description=exp['description'],
                achievements=exp['achievements']
            )

        # 4. Create Templates & Resumes
        print("Creating Templates & Resumes...")
        for rt in TEMPLATES:
            ResumeTemplate.objects.create(
                id=rt['id'],
                name=rt['name'],
                version=rt['version'],
                description=rt['description'],
                html_template=rt['html_template'],
                css_styles=rt['css_styles'],
                is_active=rt['is_active'],
                created_by_id=rt['created_by_id']
            )

        for br in RESUMES:
            BuiltResume.objects.create(
                id=br['id'],
                student_id=br['student_id'],
                title=br['title'],
                description=br['description'],
                canonical_json=br['canonical_json'],
                template_id=br['template_id'],
                state=br['state'],
                is_primary=br['is_primary']
            )

        # 5. Create Placements & Assignments
        print("Creating Placement drives...")
        for pl in PLACEMENTS:
            Placement.objects.create(
                id=pl['id'],
                company_name=pl['company_name'],
                position=pl['position'],
                salary=pl['salary'],
                description=pl['description'],
                required_cgpa=pl['required_cgpa'],
                eligible_courses=pl['eligible_courses'],
                eligible_semesters=pl['eligible_semesters'],
                application_deadline=parse_date(pl['application_deadline']),
                created_by_id=pl['created_by_id']
            )

        for pa in PLACEMENT_ASSIGNMENTS:
            PlacementAssignment.objects.create(
                id=pa['id'],
                placement_id=pa['placement_id'],
                student_id=pa['student_id'],
                assigned_by_id=pa['assigned_by_id'],
                status=pa['status']
            )

        # 6. Create Jobs, JobRounds, Applications, ApplicationRounds
        print("Creating Jobs and Rounds...")
        for j in JOBS:
            Job.objects.create(
                id=j['id'],
                company_name=j['company_name'],
                company_website=j['company_website'],
                role=j['role'],
                description=j['description'],
                package=j['package'],
                location=j['location'],
                job_type=j['job_type'],
                listing_type=j['listing_type'],
                external_link=j['external_link'],
                duration=j['duration'],
                category=j['category'],
                openings_count=j['openings_count'],
                hr_email=j['hr_email'],
                eligibility_rules=j['eligibility_rules'],
                application_deadline=parse_date(j['application_deadline']),
                status=j['status'],
                email_sent=j['email_sent'],
                created_by_id=j['created_by_id']
            )

        for jr in JOB_ROUNDS:
            JobRound.objects.create(
                id=jr['id'],
                job_id=jr['job_id'],
                round_number=jr['round_number'],
                round_name=jr['round_name'],
                round_type=jr['round_type'],
                is_elimination=jr['is_elimination'],
                passing_score=jr['passing_score'],
                duration_minutes=jr['duration_minutes']
            )

        print("Creating Job Applications and application rounds...")
        for app in APPLICATIONS:
            Application.objects.create(
                id=app['id'],
                student_id=app['student_id'],
                job_id=app['job_id'],
                status=app['status'],
                eligibility_snapshot=app['eligibility_snapshot'],
                job_snapshot=app['job_snapshot']
            )

        for ar in APPLICATION_ROUNDS:
            ApplicationRound.objects.create(
                id=ar['id'],
                application_id=ar['application_id'],
                job_round_id=ar['job_round_id'],
                round_number=ar['round_number'],
                status=ar['status'],
                score=ar['score']
            )

        # 7. Create Interview Domain data
        print("Creating AI Mock Interview Domain dataset...")
        for d in DOMAINS:
            InterviewDomain.objects.create(
                id=d['id'],
                name=d['name'],
                description=d['description'],
                icon=d['icon']
            )

        for it in INTERVIEW_TYPES:
            InterviewType.objects.create(
                id=it['id'],
                domain_id=it['domain_id'],
                code=it['code'],
                name=it['name'],
                description=it['description'],
                duration_minutes=it['duration_minutes'],
                questions_per_session=it['questions_per_session']
            )

        for c in COMPETENCIES:
            Competency.objects.create(
                id=c['id'],
                interview_type_id=c['interview_type_id'],
                name=c['name'],
                description=c['description'],
                weight=c['weight'],
                mastery_keywords=c['mastery_keywords']
            )

        for q in QUESTIONS:
            Question.objects.create(
                id=q['id'],
                competency_id=q['competency_id'],
                text=q['text'],
                question_type=q['question_type'],
                difficulty_level=q['difficulty_level'],
                ideal_answer=q['ideal_answer'],
                evaluation_rubric=q['evaluation_rubric'],
                max_score=q['max_score']
            )

        for sess in SESSIONS:
            MockInterviewSession.objects.create(
                id=sess['id'],
                student_id=sess['student_id'],
                interview_type_id=sess['interview_type_id'],
                status=sess['status'],
                started_at=parse_date(sess['started_at']),
                completed_at=parse_date(sess['completed_at']),
                questions=sess['questions'],
                use_voice=sess['use_voice']
            )

        for ans in ANSWERS:
            InterviewAnswer.objects.create(
                id=ans['id'],
                session_id=ans['session_id'],
                question_id=ans['question_id'],
                question_number=ans['question_number'],
                answer_text=ans['answer_text'],
                eval_status=ans['eval_status'],
                score=ans['score'],
                evaluation_json=ans['evaluation_json'],
                ai_feedback=ans['ai_feedback'],
                confidence_score=ans['confidence_score'],
                time_taken_seconds=ans['time_taken_seconds']
            )

        for fb in FEEDBACKS:
            InterviewFeedback.objects.create(
                id=fb['id'],
                session_id=fb['session_id'],
                total_score=fb['total_score'],
                competency_scores=fb['competency_scores'],
                dimension_averages=fb['dimension_averages'],
                strengths=fb['strengths'],
                weaknesses=fb['weaknesses'],
                feedback_summary=fb['feedback_summary']
            )

    print("\n=== DATABASE SEEDED SUCCESSFULLY ===")
    print("Users seeded: {}".format(len(USERS)))
    print("Students seeded: {}".format(len(STUDENTS)))
    print("Jobs seeded: {}".format(len(JOBS)))
    print("Applications seeded: {}".format(len(APPLICATIONS)))
    print("Mock Sessions seeded: {}".format(len(SESSIONS)))
    print("====================================\n")

if __name__ == '__main__':
    seed_database()
