# scratch/check_db.py
import os
import sys
import django

# Set up Django environment
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, User, Placement, PlacementAssignment
from apps.applications.models import Application

print("=== DATABASE STATUS INSPECTION ===")
print(f"Total Users: {User.objects.count()}")
print(f"Total Students: {Student.objects.count()}")
print(f"Total Placement Drives (Placement model): {Placement.objects.count()}")
print(f"Total Placement Assignments (PlacementAssignment model): {PlacementAssignment.objects.count()}")
print(f"Total Applications (Application model): {Application.objects.count()}")

print("\n--- Application Status Counts ---")
from django.db.models import Count
app_counts = Application.objects.values('status').annotate(c=Count('id'))
for ac in app_counts:
    print(f"Status: '{ac['status']}' -> Count: {ac['c']}")

print("\n--- PlacementAssignment Status Counts ---")
pa_counts = PlacementAssignment.objects.values('status').annotate(c=Count('id'))
for pac in pa_counts:
    print(f"Status: '{pac['status']}' -> Count: {pac['c']}")
