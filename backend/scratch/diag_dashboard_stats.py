# Diagnostic dashboard stats runner (renamed so pytest ignores it)
import os
import sys
import django
import json
from collections import defaultdict

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from core.views.dashboard import DashboardViewSet

django.setup()

User = get_user_model()
admin = User.objects.filter(role='admin').first() or User.objects.filter(is_superuser=True).first()
if not admin:
    admin = User.objects.create_superuser('temp_admin', 'admin@example.com', 'adminpass', role='admin')

factory = APIRequestFactory()

def test_view(listing_type):
    print(f"\n--- TESTING stats FOR listing_type='{listing_type}' ---")
    request = factory.get(f'/dashboard/stats/?listing_type={listing_type}')
    force_authenticate(request, user=admin)
    view = DashboardViewSet.as_view({'get': 'stats'})
    response = view(request)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.data
        print(f"Total Students: {data.get('overview', {}).get('total_students')}")
        print(f"Placed/Converted Students: {data.get('overview', {}).get('placed_students')}")
        print(f"Salary/Stipend stats: Avg={data.get('salary_analysis', {}).get('avg_package')}, Max={data.get('salary_analysis', {}).get('highest_package')}")
        print(f"Course stats counts: {len(data.get('course_performance', []))}")
        if data.get('course_performance'):
            first_course = data.get('course_performance')[0]
            print(f"First course stats: {first_course}")
        print(f"Salary/Stipend bands: {ascii(data.get('salary_analysis', {}).get('salary_bands_detailed'))}")
        print(f"Salary/Stipend distribution: {ascii(data.get('salary_analysis', {}).get('salary_distribution'))}")

if __name__ == '__main__':
    test_view('all')
    test_view('job')
    test_view('internship')
