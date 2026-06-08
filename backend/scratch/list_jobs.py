import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.jobs.models import Job

print("--- ACTIVE JOBS ---")
for job in Job.objects.filter(status='active'):
    print(f"ID: {job.id} | Role: {job.role} | Company: {job.company_name} | Type: {job.job_type} | Pkg: {job.package} | External: {job.external_link}")

print("\n--- ALL JOBS ---")
for job in Job.objects.all():
    print(f"ID: {job.id} | Role: {job.role} | Company: {job.company_name} | Status: {job.status} | Type: {job.job_type} | Pkg: {job.package}")
