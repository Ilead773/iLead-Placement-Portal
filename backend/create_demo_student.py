#!/usr/bin/env python
"""
Create a single demo student account for testing/demonstration.
"""
import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import User, Student
from datetime import datetime

def create_student():
    """Create one demo student."""
    # Student details
    reg_no = "DEMO001"
    login_id = "demo001"
    email = "demo.student@ilead.edu"
    temp_password = f"Student@{reg_no}"
    name = "Demo Student"
    
    # Check if student already exists
    if User.objects.filter(login_id=login_id).exists():
        print(f"❌ Login ID '{login_id}' already exists!")
        return
    
    if Student.objects.filter(registration_number=reg_no).exists():
        print(f"❌ Registration number '{reg_no}' already exists!")
        return
    
    try:
        # Create User
        user = User.objects.create_user(
            login_id=login_id,
            email=email,
            password=temp_password,
            name=name,
            role='student',
            temp_password_flag=True,
            password_reset_required=True
        )
        print(f"✅ User created: {login_id}")
        
        # Create Student Profile
        student = Student.objects.create(
            user=user,
            name=name,
            registration_number=reg_no,
            email=email,
            passing_year=2025,
            course="BCA",
            stream="Computer Science",
            semester=6,
            attendance=85.0,
            cgpa=8.5,
            year=3,
            category='A',
            backlogs=False
        )
        print(f"✅ Student profile created: {reg_no}")
        
        # Display credentials
        print("\n" + "="*60)
        print("🎓 STUDENT LOGIN CREDENTIALS")
        print("="*60)
        print(f"Login ID:          {login_id}")
        print(f"Email:             {email}")
        print(f"Temporary Password: {temp_password}")
        print(f"Name:              {name}")
        print(f"Registration No:   {reg_no}")
        print(f"Course:            {student.course}")
        print(f"Stream:            {student.stream}")
        print(f"CGPA:              {student.cgpa}")
        print(f"Attendance:        {student.attendance}%")
        print("="*60)
        print("\n⚠️  Note: Student must change password on first login")
        print(f"📍 Login URL: http://localhost:3000/login")
        print("="*60 + "\n")
        
        return student
        
    except Exception as e:
        print(f"❌ Error creating student: {e}")
        return None

if __name__ == "__main__":
    student = create_student()
    sys.exit(0 if student else 1)
