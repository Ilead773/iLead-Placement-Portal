# Audit script to inspect database integrity and integration consistency
import os
import sys
import django
from collections import defaultdict

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, Placement, PlacementAssignment
from apps.jobs.models import Job
from apps.applications.models import Application

def run_audit():
    print("======================================================================")
    print("                PLACEMENT PORTAL DATA INTEGRITY AUDIT")
    print("======================================================================")

    # 1. Basic Counts
    total_students = Student.objects.count()
    total_jobs = Job.objects.count()
    total_placements = Placement.objects.count()
    total_assignments = PlacementAssignment.objects.count()
    total_applications = Application.objects.count()
    
    print(f"Total Registered Students:      {total_students}")
    print(f"Total Jobs in DB:               {total_jobs}")
    print(f"Total Legacy Placements:         {total_placements}")
    print(f"Total Placement Assignments:    {total_assignments}")
    print(f"Total Applications:             {total_applications}")
    print("----------------------------------------------------------------------")

    # 2. Placed Students Deduplication Check
    placed_assigns = set(PlacementAssignment.objects.filter(status='selected').values_list('student_id', flat=True))
    placed_apps = set(Application.objects.filter(status__in=['selected', 'accepted']).values_list('student_id', flat=True))
    
    intersection = placed_assigns & placed_apps
    union = placed_assigns | placed_apps
    
    print("Placed Student Counts:")
    print(f"- Placed via Internal Assignments:   {len(placed_assigns)}")
    print(f"- Placed via Job Applications:       {len(placed_apps)}")
    print(f"- Placed in both (Overlap):          {len(intersection)}")
    print(f"- Total Unique Placed Students:      {len(union)}")
    if intersection:
        print(f"  [!] Note: The following student IDs are marked placed in both systems: {list(intersection)}")
    print("----------------------------------------------------------------------")

    # 3. Legacy Placement vs Assignments Consistency
    print("Internal Placement Assignments by Status:")
    assign_stats = PlacementAssignment.objects.values('status').annotate(count=django.db.models.Count('id'))
    for s in assign_stats:
        print(f"- {s['status'].capitalize()}: {s['count']}")
        
    print("\nExternal Job Applications by Status:")
    app_stats = Application.objects.values('status').annotate(count=django.db.models.Count('id'))
    for s in app_stats:
        print(f"- {s['status'].capitalize()}: {s['count']}")
    print("----------------------------------------------------------------------")

    # 4. Salary/Package Inconsistencies Check
    # Check if there are placed students with 0 or null package
    zero_salary_placements = []
    for pa in PlacementAssignment.objects.filter(status='selected').select_related('student', 'placement'):
        if not pa.placement.salary or pa.placement.salary <= 0:
            zero_salary_placements.append((pa.student.name, pa.placement.company_name))
            
    zero_package_apps = []
    for app in Application.objects.filter(status__in=['selected', 'accepted']).select_related('student', 'job'):
        if not app.job.package or app.job.package <= 0:
            zero_package_apps.append((app.student.name, app.job.company_name))
            
    print("Salary Anomalies:")
    print(f"- Selected Internal Assignments with zero/null salary: {len(zero_salary_placements)}")
    for name, comp in zero_salary_placements:
        print(f"  * Student '{name}' at '{comp}' has 0/null salary")
    print(f"- Selected Job Applications with zero/null package:    {len(zero_package_apps)}")
    for name, comp in zero_package_apps:
        print(f"  * Student '{name}' at '{comp}' has 0/null package")
    print("----------------------------------------------------------------------")

    # 5. Course vs CGPA Data Consistency
    null_cgpa = Student.objects.filter(cgpa__isnull=True).count()
    null_course = Student.objects.filter(course='').count()
    print("Student Data Completeness:")
    print(f"- Students with missing CGPA:   {null_cgpa}")
    print(f"- Students with missing Course: {null_course}")
    print("======================================================================")

if __name__ == "__main__":
    run_audit()
