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

from core.models import Student, User
from apps.jobs.models import Job
from apps.applications.eligibility_engine import check_eligibility

user = User.objects.filter(login_id='demo.student').first()
student_profile = user.student_profile

print(f"=== DEBUGGING STUDENT JOBS ENDPOINT FOR: {student_profile.name} ===")

# Query queryset matching get_queryset for student
# qs = Job.objects.filter(status='active', job_type='internal').order_by('-updated_at')
from apps.applications.models import Application
deleted_job_ids = Application.objects.filter(student=student_profile, is_deleted=True).values_list('job_id', flat=True)
qs = Job.objects.filter(status='active', job_type='internal').exclude(id__in=deleted_job_ids).order_by('-updated_at')

print(f"Active Internal Jobs (excluding deleted applications): {qs.count()}")

applied_job_ids = set(
    Application.objects.filter(student=student_profile, is_deleted=False).values_list('job_id', flat=True)
)

print(f"Applied Job IDs: {applied_job_ids}")

results = []
for job in qs:
    eligibility = check_eligibility(student_profile, job, ignore_profile_resume=True)
    has_applied = job.id in applied_job_ids
    
    # Matching Jobs.jsx frontend filtering:
    # job.status === 'active' && (
    #   job.eligibility?.eligible || 
    #   job.has_applied || 
    #   ((job.eligibility?.failing_checks || []).length > 0 && 
    #    (job.eligibility?.failing_checks || []).every(c => c.check_name === 'deadline'))
    # )
    failing_checks = eligibility.get('failing_checks', [])
    only_deadline = len(failing_checks) > 0 and all(c['check_name'] == 'deadline' for c in failing_checks)
    
    is_front_eligible = eligibility['eligible'] or has_applied or only_deadline
    
    if is_front_eligible:
        print(f"\nVisible Job:")
        print(f"  Company: {job.company_name} | Role: {job.role}")
        print(f"  Eligible: {eligibility['eligible']} | Has Applied: {has_applied} | Only Deadline Failed: {only_deadline}")
        if failing_checks:
            print(f"  Failing checks: {[c['check_name'] for c in failing_checks]}")
    else:
        # Let's print why it is not visible
        print(f"\nHidden Job:")
        print(f"  Company: {job.company_name} | Role: {job.role}")
        print(f"  Failing checks: {[c['check_name'] for c in failing_checks]}")
