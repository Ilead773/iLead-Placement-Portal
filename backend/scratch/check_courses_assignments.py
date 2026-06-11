import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, LearningAssignment, LearningQuestion

def check():
    courses = list(Student.objects.exclude(course='').values_list('course', flat=True).distinct())
    print("Distinct courses in Student table:", courses)
    
    assignments = LearningAssignment.objects.all()
    print(f"Total LearningAssignments in DB: {assignments.count()}")
    for a in assignments:
        print(f"- Course: {a.course} | Title: {a.title} | Questions: {a.questions.count()}")

if __name__ == '__main__':
    check()
