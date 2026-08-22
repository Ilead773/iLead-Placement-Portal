import os, django

os.environ['DATABASE_URL'] = 'postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres'
os.environ['SECRET_KEY'] = 'yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP'
os.environ['DEBUG'] = 'False'
os.environ['ALLOWED_HOSTS'] = 'ilead-backend-production-20f7.up.railway.app'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Student
from apps.jobs.models import Job

User = get_user_model()

print("=== DEEP ANALYSIS: SUBROTO DAS ===")
print()

# ── 1. Look up student ────────────────────────────────────────────────────────
students = Student.objects.filter(name__icontains="Subroto")
if not students.exists():
    students = Student.objects.filter(name__icontains="Das")

print(f"Found {students.count()} matching students for search 'Subroto':")
subroto = None
for s in students:
    print(f"  ID: {s.id}")
    print(f"  Name:             {s.name}")
    print(f"  Reg No:           {s.registration_number}")
    print(f"  Course (Raw):     {s.course}")
    print(f"  Semester:         {s.semester}")
    print(f"  Stream:           {s.stream}")
    print(f"  CGPA:             {s.cgpa}")
    print(f"  Attendance:       {s.attendance}")
    print(f"  Is Active:        {s.user.is_active if s.user else 'No User'}")
    print(f"  Role:             {s.user.role if s.user else 'No User'}")
    print(f"  Email:            {s.email}")
    if "subroto" in s.name.lower():
        subroto = s
    print("-" * 50)

if not subroto:
    print("Could not find a student explicitly named 'Subroto Das'.")
    exit()

# ── 2. Look up jobs matching his criteria ─────────────────────────────────────
# Let's list active jobs that he might be trying to see
active_jobs = Job.objects.filter(status='active')
print(f"\nTotal Active Jobs in DB: {active_jobs.count()}")

# Check details of active jobs
for j in active_jobs[:10]:
    rules = j.eligibility_rules or {}
    print(f"\n  Job ID: {j.id}")
    print(f"  Role: {j.role} | Company: {j.company_name}")
    print(f"  Allowed Courses: {rules.get('allowed_branches')}")
    print(f"  Min CGPA: {rules.get('min_cgpa')}")
    print(f"  Min Attendance: {rules.get('min_attendance')}")
    print(f"  Allowed Years: {rules.get('allowed_years')}")
    
    # Check eligibility engine response for Subroto
    from apps.applications.eligibility_engine import check_eligibility
    el = check_eligibility(subroto, j, ignore_profile_resume=True)
    print(f"  CHECK_ELIGIBILITY RESULT: {el}")
