import os
import sys
import random
import string
import pandas as pd
import django

sys.stdout.reconfigure(encoding='utf-8')

# Ensure environment variables are loaded
from pathlib import Path
try:
    import dotenv
    prod_env = Path(__file__).resolve().parent / '.env.production'
    if prod_env.exists():
        dotenv.load_dotenv(prod_env, override=True)
except ImportError:
    pass

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, User
from django.contrib.auth.hashers import make_password

dst = r'c:\Users\shahi\OneDrive\Documents\iLEAD_Placement_portal\temp_msc.xlsx'
df = pd.read_excel(dst)

print(f"=== ONBOARDING {len(df)} MSC MEDIA SCIENCE (2ND YEAR) STUDENTS (DATABASE ONLY - NO EMAILS) ===", flush=True)

chars = string.ascii_letters + string.digits
results = []

for idx, row in df.iterrows():
    name = str(row.get('Student Name', '')).strip()
    roll_val = row.get('Roll No.')
    if pd.isna(roll_val):
        print(f"Skipping row {idx}: No roll number provided.")
        continue
    
    try:
        roll = str(int(roll_val)).strip()
    except Exception:
        roll = str(roll_val).strip()

    email_val = row.get('Email ID')
    if pd.isna(email_val) or not str(email_val).strip():
        email = f"{roll}@student.ilead.net.in"
    else:
        email = str(email_val).strip().lower()

    phone_val = row.get('Phone Number')
    if pd.isna(phone_val):
        phone = ""
    else:
        try:
            phone = str(int(phone_val)).strip()
        except Exception:
            phone = str(phone_val).strip()

    school = str(row.get('School', 'School of Creativity')).strip()
    course = str(row.get('Program / Course', 'MSc in Media Science')).strip()
    year_str = "2nd"
    semester = 3

    # Check if student or user exists
    student = Student.objects.filter(registration_number=roll).first()
    if not student:
        student = Student.objects.filter(email__iexact=email).first()

    user = User.objects.filter(login_id=roll).first()
    if not user:
        user = User.objects.filter(email__iexact=email).first()

    created_flag = False

    if not student and not user:
        # Create new User and Student
        created_flag = True
        user = User.objects.create(
            login_id=roll,
            email=email,
            name=name,
            role='student',
            is_active=True
        )
        student = Student.objects.create(
            user=user,
            registration_number=roll,
            name=name,
            email=email,
            phone_number=phone,
            course=course,
            stream=school,
            year=year_str,
            semester=semester,
            status='active'
        )
    else:
        # Update existing record
        if student:
            student.name = name
            student.email = email
            student.phone_number = phone
            student.course = course
            student.stream = school
            student.year = year_str
            student.semester = semester
            student.save()

        if user:
            user.email = email
            user.name = name
            user.save()
        elif student and not student.user:
            user = User.objects.create(
                login_id=roll,
                email=email,
                name=name,
                role='student',
                is_active=True
            )
            student.user = user
            student.save()

    # Generate temporary password for user
    temp_password = ''.join(random.choice(chars) for _ in range(10))
    user.password = make_password(temp_password)
    user.temp_password_flag = True
    user.save()

    status_action = "CREATED" if created_flag else "UPDATED"
    print(f"[{status_action}] {name:<22} | Roll: {roll:<12} | Email: {email:<32} | Temp Pass: {temp_password}", flush=True)

    results.append({
        "SL No": row.get('Sl No'),
        "Name": name,
        "Roll Number": roll,
        "Email": email,
        "Phone": phone,
        "Course": course,
        "Semester": semester,
        "Action": status_action,
        "Temp Password": temp_password
    })

print("\n=== COMPLETED DATABASE ONBOARDING FOR ALL STUDENTS ===", flush=True)
print(f"Total Processed: {len(results)}")
