import os, django

os.environ['DATABASE_URL'] = 'postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres'
os.environ['SECRET_KEY'] = 'yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP'
os.environ['DEBUG'] = 'False'
os.environ['ALLOWED_HOSTS'] = 'ilead-backend-production-20f7.up.railway.app'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Force Django to use Local Memory Cache instead of Redis to prevent local timeout hangs
os.environ['REDIS_URL'] = '' 
import django.conf
from django.conf import settings

django.setup()

# Override CACHES setting dynamically
from django.core.cache import cache
from django.core.cache.backends.dummy import DummyCache
import django.core.cache
django.core.cache.cache = DummyCache('dummy', {})

from core.models import Student
from apps.jobs.models import Job
from apps.applications.eligibility_engine import check_eligibility

student = Student.objects.get(registration_number='28941923187') # Subrato Das
active_jobs = Job.objects.filter(status='active')

print("Bypassed Redis cache locally. Scanning active jobs...")

eligible_jobs = []
for j in active_jobs:
    el = check_eligibility(student, j, ignore_profile_resume=True)
    if el.get('eligible', False):
        eligible_jobs.append(f"{j.role} at {j.company_name} (ID: {j.job_id})")

print(f"TOTAL_ELIGIBLE_COUNT: {len(eligible_jobs)}")
for job_str in eligible_jobs:
    print(f"  - {job_str}")
