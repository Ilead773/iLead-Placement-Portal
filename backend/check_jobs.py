from apps.scraped_jobs.models import ScrapedJob, CourseJobMapping
from django.db.models import Count

print(f"Total Unique Jobs: {ScrapedJob.objects.count()}")
print(f"Total Active Jobs: {ScrapedJob.objects.filter(is_active=True).count()}")

print("\nJobs by Course:")
stats = CourseJobMapping.objects.values('course_name').annotate(count=Count('id')).order_by('-count')
for s in stats:
    print(f"- {s['course_name']}: {s['count']}")
