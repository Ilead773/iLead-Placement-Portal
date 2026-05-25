import os
import django
from datetime import datetime, timedelta, timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import User
from apps.jobs.models import Job, JobRound

def create_example():
    admin = User.objects.filter(role='admin').first()
    if not admin:
        print("No admin user found.")
        return

    job = Job.objects.create(
        company_name="Google",
        role="Software Engineer Intern",
        description="Join our elite engineering team to build the future of search and AI. You will work on massive-scale systems and high-impact features.",
        package=45.00,
        location="Bangalore, India",
        job_type="internal",
        eligibility_rules={
            "min_cgpa": 8.5,
            "allowed_branches": ["CSE", "IT", "ECE"],
            "required_skills": ["Python", "C++", "Data Structures", "Algorithms"],
            "allowed_years": [2025, 2026],
            "no_backlog": True
        },
        application_deadline=datetime.now(timezone.utc) + timedelta(days=14),
        status="active",
        created_by=admin
    )

    JobRound.objects.create(
        job=job,
        round_number=1,
        round_name="Online Assessment",
        round_type="test",
        is_elimination=True,
        duration_minutes=90
    )

    JobRound.objects.create(
        job=job,
        round_number=2,
        round_name="Technical Interview I",
        round_type="interview",
        is_elimination=True
    )

    JobRound.objects.create(
        job=job,
        round_number=3,
        round_name="Technical Interview II",
        round_type="interview",
        is_elimination=True
    )

    JobRound.objects.create(
        job=job,
        round_number=4,
        round_name="HR & Values Interview",
        round_type="interview",
        is_elimination=False
    )

    print(f"Example job created: {job.id}")

if __name__ == "__main__":
    create_example()
