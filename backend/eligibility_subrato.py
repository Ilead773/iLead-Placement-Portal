import os, django

os.environ['DATABASE_URL'] = 'postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres'
os.environ['SECRET_KEY'] = 'yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP'
os.environ['DEBUG'] = 'False'
os.environ['ALLOWED_HOSTS'] = 'ilead-backend-production-20f7.up.railway.app'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student
from apps.jobs.models import Job
from apps.applications.eligibility_engine import check_eligibility

student = Student.objects.get(registration_number='28941923187') # Subrato Das

print(f"=== ELIGIBILITY ANALYSIS FOR {student.name} ({student.course} Sem {student.semester}) ===")
print(f"CGPA: {student.cgpa} | Attendance: {student.attendance}")

active_jobs = Job.objects.filter(status='active')
print(f"Total Active Jobs: {active_jobs.count()}\n")

ineligible_reasons = {}
eligible_count = 0

for j in active_jobs:
    el = check_eligibility(student, j, ignore_profile_resume=True)
    if el.get('eligible', False):
        eligible_count += 1
        print(f"ELIGIBLE FOR: {j.role} at {j.company_name} (ID: {j.job_id})")
    else:
        # Group by failing check names
        failing = el.get('failing_checks', [])
        for f in failing:
            name = f.get('check_name')
            reason = f.get('reason')
            ineligible_reasons[name] = ineligible_reasons.get(name, 0) + 1

print("\n=== SUMMARY OF WHY HE IS BLOCKED FROM OTHER JOBS ===")
for check, count in ineligible_reasons.items():
    print(f"  Blocked by '{check}': {count} jobs")
