import os, django

os.environ['DATABASE_URL'] = 'postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres'
os.environ['SECRET_KEY'] = 'yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP'
os.environ['DEBUG'] = 'False'
os.environ['ALLOWED_HOSTS'] = 'ilead-backend-production-20f7.up.railway.app'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Student

User = get_user_model()

login_id = "test.bba.student"
email = "test.bba.student@example.com"
password = "iLEADPass2026!"

# Check if user already exists
user, created = User.objects.get_or_create(
    login_id=login_id,
    defaults={
        'email': email,
        'name': "Test BBA Student",
        'role': 'student',
        'is_active': True,
        'temp_password_flag': False,
        'password_reset_required': False
    }
)

# Always reset password to the target password
user.set_password(password)
user.save()

# Check/Create Student Profile matching Subrato Das
student, s_created = Student.objects.get_or_create(
    user=user,
    defaults={
        'name': "Test BBA Student",
        'email': email,
        'registration_number': "TESTBBA9999",
        'course': "BBA",
        'semester': 7,
        'stream': "School of Business",
        'cgpa': None,
        'attendance': None,
        'passing_year': 2026
    }
)

if not s_created:
    student.course = "BBA"
    student.semester = 7
    student.cgpa = None
    student.attendance = None
    student.save()

print(f"STATUS: {'Created' if created else 'Reset'}")
print(f"Login ID: {login_id}")
print(f"Password: {password}")
print(f"Student Profile Details: Course={student.course}, Sem={student.semester}, CGPA={student.cgpa}")
