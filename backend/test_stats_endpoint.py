# test_stats_endpoint.py
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import time
from django.test import RequestFactory
from django.contrib.auth import get_user_model
from core.views.dashboard import DashboardViewSet

User = get_user_model()
admin_user = User.objects.get(login_id='admin')

factory = RequestFactory()
request = factory.get('/api/v1/dashboard/stats/', {'listing_type': 'job'})
request.user = admin_user

view = DashboardViewSet.as_view({'get': 'stats'})

print("Triggering first stats request (should query DB)...")
t0 = time.time()
response1 = view(request)
print("First request completed in:", time.time() - t0, "seconds. Status:", response1.status_code)

print("Triggering second stats request (should hit Redis cache)...")
t1 = time.time()
response2 = view(request)
print("Second request completed in:", time.time() - t1, "seconds. Status:", response2.status_code)
