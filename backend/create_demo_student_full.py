#!/usr/bin/env python
"""
Script to create a fully populated demo student with login credentials
Run: python create_demo_student_full.py
"""

import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()
from core.models import Student
from apps.profiles.models import StudentProfile
import uuid


def create_demo_student():
    """Create a fully populated demo student with all data"""
    
    # Check if demo student already exists
    try:
        existing = User.objects.get(email='demo.student@ilead.com')
        print(f"Demo student already exists: {existing.email}")
        return existing.student_profile, existing
    except User.DoesNotExist:
        pass
    
    # Create User account
    user = User.objects.create_user(
        login_id='demo.student@ilead.com',
        email='demo.student@ilead.com',
        password='Demo@12345',
        name='Demo Student'
    )
    print(f"[+] User created: {user.email}")
    
    # Create Student profile with all data
    student = Student.objects.create(
        user=user,
        name='Demo Student',
        registration_number=f'DEMO{uuid.uuid4().hex[:8].upper()}',
        email='demo.student@ilead.com',
        phone_number='9999999999',
        
        # Academic Info
        course='BBA',
        stream='BBA General',
        semester=6,
        year='3rd',
        passing_year=2025,
        
        # Performance Metrics
        cgpa=8.5,
        attendance=85.0,
        training_attendance=92.5,
        
        # Backlog Info
        backlogs=False,
        backlogs_count=0,
        
        # Category (will be auto-calculated)
        category=None,
        is_category_manual=False
    )
    print(f"[+] Student profile created: {student.name}")
    print(f"    - Registration: {student.registration_number}")
    print(f"    - Email: {student.email}")
    print(f"    - Course: {student.course}")
    print(f"    - Semester: {student.semester}")
    print(f"    - CGPA: {student.cgpa}")
    print(f"    - Attendance: {student.attendance}%")
    print(f"    - Training Attendance: {student.training_attendance}%")
    
    # Auto-calculate category based on metrics
    auto_category = student.calculate_category()
    student.category = auto_category
    student.save()
    print(f"    - Category (Auto-calculated): {auto_category}")
    print(f"    - PACT Score: {student.pact_score}")
    
    # Create Resume Profile
    profile = StudentProfile.objects.create(
        student=student,
        phone='9999999999',
        location='New Delhi, India',
        professional_summary='Dedicated BBA student with strong academic performance and leadership skills. Passionate about business management and entrepreneurship. Proven track record of managing university events and leading student groups.',
        linkedin='https://linkedin.com/in/demostudent',
        github='https://github.com/demostudent',
        portfolio='https://demostudent.com',
        completion_score=0.85,
        strengths=['Leadership', 'Problem Solving', 'Public Speaking', 'Team Collaboration'],
        languages_known=['English (Fluent)', 'Hindi (Native)', 'Bengali (Conversational)']
    )
    print(f"[+] Resume profile created")
    
    from apps.profiles.models import Skill, Experience, Project, Education, Certification, Achievement, ExtracurricularActivity
    from datetime import date

    # Education
    Education.objects.create(
        profile=profile,
        institution='iLEAD, Kolkata',
        degree='Bachelor of Business Administration',
        field='General',
        graduation_date=date(2025, 5, 30),
        gpa=8.5,
        honors="Dean's List"
    )
    Education.objects.create(
        profile=profile,
        institution='Delhi Public School',
        degree='High School (12th Grade)',
        field='Commerce',
        graduation_date=date(2022, 5, 30),
        gpa=9.2,
        honors='Head Boy'
    )

    # Experience
    Experience.objects.create(
        profile=profile,
        company='Tech Startup Inc.',
        position='Marketing Intern',
        start_date=date(2024, 6, 1),
        end_date=date(2024, 8, 30),
        is_current=False,
        description='Supported digital marketing campaigns and managed social media outreach.',
        achievements=['Increased social media engagement by 35%', 'Managed a marketing budget of $5,000 for ad campaigns']
    )
    Experience.objects.create(
        profile=profile,
        company='University Student Council',
        position='Event Coordinator',
        start_date=date(2023, 1, 1),
        is_current=True,
        description='Coordinating major university events and academic workshops.',
        achievements=['Organized the annual tech fest with over 2000 attendees', 'Negotiated sponsorships worth $10,000']
    )

    # Projects
    Project.objects.create(
        profile=profile,
        title='Market Analysis Tool',
        description='A tool to scrape and analyze competitor pricing strategies for local businesses.',
        technologies=['Python', 'Pandas', 'BeautifulSoup'],
        link='https://github.com/demostudent/market-analysis',
        date=date(2024, 3, 15)
    )
    Project.objects.create(
        profile=profile,
        title='E-commerce Business Plan',
        description='A comprehensive business plan for a sustainable clothing brand.',
        technologies=['Excel', 'Financial Modeling', 'Market Research'],
        link='',
        date=date(2023, 11, 20)
    )

    # Skills
    skills_data = [
        ('Technical', 'Data Analysis', 'Advanced'),
        ('Technical', 'Financial Modeling', 'Intermediate'),
        ('Technical', 'Python', 'Beginner'),
        ('Soft Skill', 'Leadership', 'Expert'),
        ('Soft Skill', 'Public Speaking', 'Advanced'),
        ('Soft Skill', 'Project Management', 'Advanced'),
        ('Language', 'English', 'Expert'),
        ('Language', 'Hindi', 'Expert'),
    ]
    for category, name, proficiency in skills_data:
        Skill.objects.create(
            profile=profile,
            category=category,
            name=name,
            proficiency=proficiency
        )
    
    # Certifications
    Certification.objects.create(
        profile=profile,
        name='Google Digital Marketing Certification',
        issuer='Google',
        date=date(2023, 8, 15),
        credential_url='https://credentials.google.com/demo'
    )
    Certification.objects.create(
        profile=profile,
        name='Advanced Excel for Business',
        issuer='Coursera',
        date=date(2023, 5, 10),
        credential_url='https://coursera.org/verify/demo'
    )

    # Achievements
    Achievement.objects.create(
        profile=profile,
        title='Winner, National Business Plan Competition',
        issuer='Startup India',
        date=date(2024, 1, 15),
        description='Awarded 1st place among 500+ participating teams nationwide.'
    )
    Achievement.objects.create(
        profile=profile,
        title='Best Student of the Year',
        issuer='iLEAD',
        date=date(2023, 12, 10),
        description='Recognized for exceptional academic and extracurricular performance.'
    )

    # Extracurricular Activities
    ExtracurricularActivity.objects.create(
        profile=profile,
        title='Football Team Captain',
        description='Led the university football team, organizing practice sessions and inter-college tournaments.',
        date=date(2023, 8, 1)
    )
    ExtracurricularActivity.objects.create(
        profile=profile,
        title='Member – Entrepreneurship Club',
        description='Active member of the iLEAD Entrepreneurship Club. Participated in pitch competitions and startup workshops.',
        date=date(2023, 1, 15)
    )
    ExtracurricularActivity.objects.create(
        profile=profile,
        title='NSS Volunteer',
        description='Participated in community service camps and tree plantation drives under the National Service Scheme.',
        date=date(2022, 10, 5)
    )

    profile.recalculate_completion()
    print(f"    - Completion Score: {profile.completion_score:.0%}")
    
    return student, user


def main():
    print("\n" + "="*60)
    print("Demo Student Account Creation")
    print("="*60)
    
    student, user = create_demo_student()
    
    print("\n" + "="*60)
    print("LOGIN CREDENTIALS:")
    print("="*60)
    print(f"Username/Email: {user.email}")
    print(f"Password:       Demo@12345")
    print("="*60 + "\n")
    
    print("[+] Demo student created successfully!")
    print(f"[+] Student ID: {student.id}")
    print(f"[+] You can now login with these credentials\n")


if __name__ == '__main__':
    main()
