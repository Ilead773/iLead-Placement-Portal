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

from django.contrib.auth.models import User
from core.models import Student
from apps.profiles.models import StudentProfile
import uuid


def create_demo_student():
    """Create a fully populated demo student with all data"""
    
    # Check if demo student already exists
    try:
        existing = User.objects.get(username='demo.student@ilead.com')
        print(f"Demo student already exists: {existing.username}")
        return existing.student_profile
    except User.DoesNotExist:
        pass
    
    # Create User account
    user = User.objects.create_user(
        username='demo.student@ilead.com',
        email='demo.student@ilead.com',
        password='Demo@12345',
        first_name='Demo',
        last_name='Student'
    )
    print(f"[+] User created: {user.username}")
    
    # Create Student profile with all data
    student = Student.objects.create(
        user=user,
        name='Demo Student',
        registration_number=f'DEMO{uuid.uuid4().hex[:8].upper()}',
        email='demo.student@ilead.com',
        phone_number='9999999999',
        
        # Academic Info
        course='BBA (GEN)',
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
        professional_summary='Dedicated BBA student with strong academic performance and leadership skills. Passionate about business management and entrepreneurship.',
        linkedin='https://linkedin.com/in/demostudent',
        github='https://github.com/demostudent',
        portfolio='https://demostudent.com',
        completion_score=0.85
    )
    print(f"[+] Resume profile created")
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
    print(f"Username: {user.username}")
    print(f"Password: Demo@12345")
    print(f"Email:    {user.email}")
    print("="*60 + "\n")
    
    print("[+] Demo student created successfully!")
    print(f"[+] Student ID: {student.id}")
    print(f"[+] You can now login with these credentials\n")


if __name__ == '__main__':
    main()
