import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

print("=== START LIVE PRODUCTION STUDENT USERS ===")
students = User.objects.filter(role='student')
if not students.exists():
    print("No students found in production database.")
else:
    for s in students:
        print(f"Name: {s.name} | Email: {s.email} | Login ID: {s.login_id}")
        profile = getattr(s, 'student_profile', None)
        if profile:
            print(f"  Course: {profile.course} | Reg No: {profile.registration_number}")
        print("-" * 50)
print("=== END LIVE PRODUCTION STUDENT USERS ===")
