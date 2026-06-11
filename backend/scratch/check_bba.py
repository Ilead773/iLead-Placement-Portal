import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, StudentLearningAssignment, LearningAssignment

def run():
    bba_students = Student.objects.filter(course__iexact='BBA')
    print(f"Total BBA Students: {bba_students.count()}")
    
    assignments = LearningAssignment.objects.filter(course__iexact='BBA')
    print(f"BBA Assignment Templates: {assignments.count()}")
    for a in assignments:
        print(f"  - {a.title} ({a.id})")
        sla = StudentLearningAssignment.objects.filter(assignment=a)
        print(f"    Total assigned records: {sla.count()}")
        print(f"      assigned status: {sla.filter(status='assigned').count()}")
        print(f"      submitted status: {sla.filter(status='submitted').count()}")
        print(f"      expired status: {sla.filter(status='expired').count()}")

if __name__ == '__main__':
    run()
