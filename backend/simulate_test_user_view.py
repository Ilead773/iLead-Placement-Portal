import os, django

os.environ['DATABASE_URL'] = 'postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres'
os.environ['SECRET_KEY'] = 'yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP'
os.environ['DEBUG'] = 'False'
os.environ['ALLOWED_HOSTS'] = 'ilead-backend-production-20f7.up.railway.app'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

os.environ['REDIS_URL'] = ''
import django.core.cache
from django.core.cache.backends.dummy import DummyCache
django.setup()
django.core.cache.cache = DummyCache('dummy', {})

from core.models import Student
from apps.jobs.models import Job
from apps.applications.models import Application
from apps.applications.eligibility_engine import check_eligibility

student = Student.objects.get(registration_number='TESTBBA9999') # test.bba.student

# Mimic get_queryset logic for students
qs = Job.objects.filter(status='active', job_type='internal').order_by('-updated_at')
deleted_job_ids = Application.objects.filter(student=student, is_deleted=True).values_list('job_id', flat=True)
qs = qs.exclude(id__in=deleted_job_ids)

print(f"Total active internal jobs: {qs.count()}")
print("-" * 120)
print(f"{'ID':<6} | {'Company':<25} | {'Role':<30} | {'Eligible'} | {'Failing Checks'}")
print("-" * 120)

eligible_count = 0
for j in qs:
    el = check_eligibility(student, j, ignore_profile_resume=True)
    is_eligible = el.get('eligible', False)
    failing = el.get('failing_checks', [])
    
    # Check if this job would be shown on frontend Jobs.jsx
    is_only_deadline_failing = len(failing) > 0 and all(c['check_name'] == 'deadline' for c in failing)
    shown = is_eligible or is_only_deadline_failing
    
    if shown:
        eligible_count += 1
        print(f"{j.job_id:<6} | {j.company_name[:25]:<25} | {j.role[:30]:<30} | {str(is_eligible):<8} | {str([c['check_name'] for c in failing])}")

print(f"\nTotal jobs that SHOULD display in frontend: {eligible_count}")
