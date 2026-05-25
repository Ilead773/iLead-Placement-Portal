import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.jobs.models import Job
from apps.applications.serializers import ApplicationSerializer

job = Job.objects.filter(role='asdkgd').first()
if job:
    print(f"Job found: {job.role}")
    apps = job.applications.all()
    print(f"Applications count: {apps.count()}")
    try:
        serializer = ApplicationSerializer(apps, many=True)
        data = serializer.data
        print(f"Serialized applications: {len(data)}")
    except Exception as e:
        print(f"Serialization failed: {e}")
else:
    print("Job not found")
