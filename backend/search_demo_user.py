import os, django

os.environ['DATABASE_URL'] = 'postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres'
os.environ['SECRET_KEY'] = 'yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP'
os.environ['DEBUG'] = 'False'
os.environ['ALLOWED_HOSTS'] = 'ilead-backend-production-20f7.up.railway.app'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import User, Student

# Look for users with username or name containing "demo" or "test"
users = User.objects.filter(login_id__icontains="demo")
if not users.exists():
    users = User.objects.filter(name__icontains="demo")

print("=== DEMO USERS ===")
for u in users:
    student = getattr(u, 'student_profile', None)
    print(f"User: {u.login_id} | Name: {u.name} | Role: {u.role}")
    if student:
        print(f"  Student Profile: Course={student.course}, Sem={student.semester}, CGPA={student.cgpa}, Attendance={student.attendance}")
    else:
        print("  No student profile.")
