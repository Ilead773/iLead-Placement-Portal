import os
import django
import sys

# Add the current directory to sys.path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.scraped_jobs.models import ScrapedJob, CourseJobMapping
from django.db.models import Count

def check_db():
    total_jobs = ScrapedJob.objects.count()
    active_jobs = ScrapedJob.objects.filter(is_active=True).count()
    
    print(f"========================================")
    print(f"   JOB DATABASE SUMMARY")
    print(f"========================================")
    print(f"Total Jobs Collected: {total_jobs}")
    print(f"Active Jobs:         {active_jobs}")
    print(f"----------------------------------------")
    
    if total_jobs > 0:
        print(f"\nTop 10 Latest Jobs:")
        latest_jobs = ScrapedJob.objects.all().order_by('-scraped_at')[:10]
        for i, job in enumerate(latest_jobs, 1):
            print(f"{i}. {job.title} @ {job.company_name}")
            print(f"   Source: {job.source} | Location: {job.location}")
            print(f"   Link: {job.apply_url[:100]}...")
            print(f"   ---")
            
        print("\nJobs by Course Mapping:")
        stats = CourseJobMapping.objects.values('course_name').annotate(count=Count('id')).order_by('-count')
        for s in stats:
            print(f"- {s['course_name']}: {s['count']}")
    else:
        print("\nNo jobs found in the database yet.")
    print(f"========================================")

if __name__ == "__main__":
    check_db()
