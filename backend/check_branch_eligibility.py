"""
Script to identify students whose course names don't match job eligibility 'allowed_branches'.
Run with: python manage.py shell < check_branch_eligibility.py
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.applications.models import Application
from apps.applications.eligibility_engine import check_eligibility
from apps.jobs.models import Job
from core.models import Student

print("=== Jobs with legacy short course names in allowed_branches ===")
for job in Job.objects.all():
    rules = job.eligibility_rules or {}
    branches = rules.get('allowed_branches', [])
    legacy = [b for b in branches if b in ['BCA', 'MCA', 'BBA', 'B.Tech', 'B.Sc', 'MBA']]
    if legacy:
        print(f"Job: {job.role} (ID: {job.id}) | Legacy branches: {legacy}")

print("\n=== Applications failing ONLY due to branch mismatch ===")
count = 0
for app in Application.objects.select_related('student', 'job').all():
    try:
        result = check_eligibility(app.student, app.job)
        if not result['eligible']:
            failing = [f['check_name'] for f in result['failing_checks']]
            if 'branch' in failing:
                job_branches = (app.job.eligibility_rules or {}).get('allowed_branches', [])
                print(f"  App: {app.id} | Student: {app.student.name} | Course: {app.student.course} | Job: {app.job.role} | Job branches: {job_branches}")
                count += 1
    except Exception as e:
        pass

print(f"\nTotal applications failing branch check: {count}")

print("\n=== Core Course table vs normalized course names mismatch ===")
from core.models import Course
from apps.scraped_jobs.course_config import COURSE_SEARCH_CONFIG, normalize_course_name

official_names = set(COURSE_SEARCH_CONFIG.keys())
db_courses = Course.objects.all()
for c in db_courses:
    if c.name not in official_names:
        norm = normalize_course_name(c.name)
        print(f"  DB Course: '{c.name}' -> Normalizes to: '{norm}' (official={norm in official_names})")

print("\n=== Students in courses NOT in official 20-course list ===")
for student in Student.objects.exclude(course='').exclude(course__isnull=True):
    if student.course not in official_names:
        norm = normalize_course_name(student.course)
        print(f"  Student: {student.name} | Course: '{student.course}' -> Normalizes to: '{norm}'")
