import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import PlacementAssignment

def print_assignments():
    assignments = PlacementAssignment.objects.select_related('student', 'placement').all()
    print(f"Total Database Assignments Found: {len(assignments)}\n")
    print("-" * 110)
    print(f"{'STUDENT NAME':<20} | {'REG NO':<8} | {'CGPA':<5} | {'COMPANY':<12} | {'POSITION':<20} | {'SEASON DATE':<12} | {'STATUS':<12}")
    print("-" * 110)
    for a in assignments:
        student_name = a.student.name
        reg_no = a.student.registration_number
        cgpa = a.student.cgpa if a.student.cgpa else 0.0
        company = a.placement.company_name
        position = a.placement.position
        season_date = a.placement.created_at.strftime('%Y-%m-%d')
        status = a.status.upper()
        
        print(f"{student_name:<20} | {reg_no:<8} | {cgpa:<5.2f} | {company:<12} | {position:<20} | {season_date:<12} | {status:<12}")
    print("-" * 110)

if __name__ == '__main__':
    print_assignments()
