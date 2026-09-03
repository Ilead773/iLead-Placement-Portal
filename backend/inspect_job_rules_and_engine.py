import os
import sys
import django

sys.stdout.reconfigure(encoding='utf-8')

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
os.environ['SECRET_KEY'] = "yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP"
os.environ['DEBUG'] = "False"
os.environ['ALLOWED_HOSTS'] = "ilead-backend-production-20f7.up.railway.app"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student
from apps.jobs.models import Job
from apps.applications.eligibility_engine import check_eligibility

student = Student.objects.filter(registration_number='28941323053').first()
print(f"Student: {student.name} | Sem: {student.semester} | Course: {student.course}")

active_jobs = Job.objects.filter(status='active', job_type='internal')

for job in active_jobs:
    res = check_eligibility(student, job, ignore_profile_resume=True)
    if res['eligible']:
        print(f"ELIGIBLE JOB: {job.company_name} - {job.role} (Semesters targeted: {job.eligibility_rules.get('target_semesters')})")
    else:
        failing_names = [c['check_name'] for c in res['failing_checks']]
        if 'semester' in failing_names or 'branch' in failing_names:
            print(f"FAILED JOB: {job.company_name} - {job.role}")
            print(f"  Failing checks: {failing_names}")
            print(f"  Job Target Semesters: {job.eligibility_rules.get('target_semesters')}")
            print(f"  Job Target Branches: {job.eligibility_rules.get('target_branches')}")
            for c in res['failing_checks']:
                print(f"    Check detail: {c}")
            print()
