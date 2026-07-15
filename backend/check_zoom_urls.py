import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.north_star.models import ScheduledClass

classes = ScheduledClass.objects.all().order_by('-start_time')[:5]
for c in classes:
    print(f"Class: {c.title} | ID: {c.id}")
    print(f"  zoom_start_url: {c.zoom_start_url}")
    print(f"  zoom_join_url: {c.zoom_join_url}")
    print("-" * 80)
