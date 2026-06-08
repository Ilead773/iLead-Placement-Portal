import os
import sys
import django

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Placement, PlacementAssignment

def clear_legacy():
    print("Purging legacy PlacementAssignment records...")
    assignments_count = PlacementAssignment.objects.all().count()
    PlacementAssignment.objects.all().delete()
    print(f"Purged {assignments_count} legacy PlacementAssignment records.")

    print("Purging legacy Placement records...")
    placements_count = Placement.objects.all().count()
    Placement.objects.all().delete()
    print(f"Purged {placements_count} legacy Placement records.")

if __name__ == '__main__':
    clear_legacy()
