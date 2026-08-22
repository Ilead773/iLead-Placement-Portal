import os, django

os.environ['DATABASE_URL'] = 'postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres'
os.environ['SECRET_KEY'] = 'yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP'
os.environ['DEBUG'] = 'False'
os.environ['ALLOWED_HOSTS'] = 'ilead-backend-production-20f7.up.railway.app'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student

total = Student.objects.count()
null_cgpa = Student.objects.filter(cgpa__isnull=True).count()
zero_cgpa = Student.objects.filter(cgpa=0).count()
has_cgpa = Student.objects.filter(cgpa__gt=0).count()

null_attendance = Student.objects.filter(attendance__isnull=True).count()
zero_attendance = Student.objects.filter(attendance=0).count()
has_attendance = Student.objects.filter(attendance__gt=0).count()

print("=== STUDENT CGPA & ATTENDANCE DATA AUDIT ===")
print(f"Total Student Profiles in DB:  {total}")
print()
print(f"CGPA STATUS:")
print(f"  NULL CGPA:                  {null_cgpa}")
print(f"  Zero CGPA (0.0):            {zero_cgpa}")
print(f"  Valid CGPA (>0.0):          {has_cgpa}")
print()
print(f"ATTENDANCE STATUS:")
print(f"  NULL Attendance:            {null_attendance}")
print(f"  Zero Attendance (0.0):      {zero_attendance}")
print(f"  Valid Attendance (>0.0):    {has_attendance}")
print()

# Print a sample of 10 students to see their data
print("=== SAMPLE OF 10 STUDENTS ===")
samples = Student.objects.all()[:10]
for s in samples:
    print(f"  Name: {s.name:25} | CGPA: {s.cgpa} | Attendance: {s.attendance}")
