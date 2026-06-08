import os
import sys
import django
from collections import defaultdict
from statistics import median

# Setup Django environment
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, PlacementAssignment
from apps.jobs.models import Job
from apps.applications.models import Application

def audit():
    print("=" * 80)
    print("                     DEEP DATABASE DATA & SCHEMA AUDIT                         ")
    print("=" * 80)

    # 1. Check student counts & courses
    all_students = Student.objects.all()
    print(f"\nTotal Students in DB: {all_students.count()}")
    courses = defaultdict(int)
    for s in all_students:
        courses[s.course] += 1
    print("Courses in Student table:")
    for c, cnt in courses.items():
        print(f"  - {repr(c)}: {cnt} students")

    # 2. Check PlacementAssignment selected students
    pa_selected = set(PlacementAssignment.objects.filter(status='selected').values_list('student_id', flat=True))
    print(f"\nPlacementAssignment status='selected' unique students count: {len(pa_selected)}")
    print(f"PlacementAssignment status='selected' IDs: {pa_selected}")

    # 3. Check Application selected/accepted students
    app_selected = set(Application.objects.filter(status__in=['selected', 'accepted']).values_list('student_id', flat=True))
    print(f"Application status in ['selected', 'accepted'] unique students count: {len(app_selected)}")
    print(f"Application status in ['selected', 'accepted'] IDs: {app_selected}")

    # Union of both
    union_placed = pa_selected | app_selected
    print(f"Union of both placed students (actual unique placed students count): {len(union_placed)}")
    print(f"Union of both placed IDs: {union_placed}")

    # 4. Check salary statistics
    # Let's list all selected applications and their packages
    print("\nSelected/Accepted Applications Detail:")
    for app in Application.objects.filter(status__in=['selected', 'accepted']).select_related('student', 'job'):
        print(f"  - Student: {app.student.name} ({app.student.course}) | Company: {app.job.company_name} | Role: {app.job.role} | Package: {app.job.package} | Listing Type: {app.job.listing_type} | Status: {app.status}")

    # Let's check selected PlacementAssignments
    print("\nSelected PlacementAssignments Detail:")
    for pa in PlacementAssignment.objects.filter(status='selected').select_related('student', 'placement'):
        print(f"  - Student: {pa.student.name} ({pa.student.course}) | Company: {pa.placement.company_name} | Position: {pa.placement.position} | Salary: {pa.placement.salary} | Status: {pa.status}")

    # 5. Check if there are duplicate student profiles or users
    from core.models import User
    print(f"\nTotal Users: {User.objects.count()}")
    for role in ['admin', 'coordinator', 'student']:
        print(f"  - {role}: {User.objects.filter(role=role).count()}")

if __name__ == '__main__':
    audit()
