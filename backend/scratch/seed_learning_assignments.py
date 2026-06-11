import os
import sys
from datetime import timedelta
from django.utils import timezone

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import User, Student, LearningAssignment, LearningQuestion, StudentLearningAssignment

def seed_learning_assignments():
    print("=== STARTING LEARNING ASSIGNMENT SEEDING ===")
    
    # 1. Get or create creator user (admin)
    admin = User.objects.filter(role='admin').first() or User.objects.filter(is_superuser=True).first()
    if not admin:
        admin = User.objects.create_superuser(
            login_id="admin_temp",
            email="admin_temp@ilead.edu",
            password="Admin@1234"
        )
        print("Created temporary admin user for seeding.")

    # 2. Get distinct student courses
    courses = list(Student.objects.exclude(course='').values_list('course', flat=True).distinct())
    if not courses:
        courses = ["BCA", "BBA", "BSc in Computer Application (BCA)", "BBA in Digital Marketing (BBA DM)"]
        print("No students found. Using default courses list.")
    else:
        print(f"Found distinct courses from Student table: {courses}")

    # 3. Create assignments and questions
    for course in courses:
        clean_course = course.strip()
        title = f"{clean_course} MCQ Assessment"
        
        assignment, created = LearningAssignment.objects.get_or_create(
            course=clean_course,
            title=title,
            defaults={
                "description": f"Evaluate your competency in core topics and professional placement preparation for {clean_course}.",
                "duration_minutes": 25,
                "created_by": admin,
            }
        )
        
        if created:
            print(f"Created assignment: '{title}' for Course: '{clean_course}'")
        else:
            print(f"Assignment already exists: '{title}'")

        # Questions for this assignment
        questions_data = [
            {
                "prompt": f"Which of the following is a vital skill or domain of expertise in {clean_course}?",
                "options": ["Aptitude & Analytical Logic", "Core domain expertise", "Professional Communication", "All of the above"],
                "correct_option": 3,
                "points": 5,
            },
            {
                "prompt": "If a trainer conducts classes on Monday, Wednesday, and Friday, and another conducts on Tuesday and Thursday, how many combined sessions are held in 4 weeks?",
                "options": ["12 sessions", "16 sessions", "20 sessions", "24 sessions"],
                "correct_option": 2,
                "points": 5,
            },
            {
                "prompt": "What is the primary role of self-evaluations and mock interviews?",
                "options": ["To check theoretical memory", "To identify skill gaps and build interview confidence", "To get a high score only", "None of the above"],
                "correct_option": 1,
                "points": 5,
            }
        ]

        total_points = 0
        for idx, q_data in enumerate(questions_data):
            q, q_created = LearningQuestion.objects.get_or_create(
                assignment=assignment,
                order=idx,
                defaults={
                    "prompt": q_data["prompt"],
                    "options": q_data["options"],
                    "correct_option": q_data["correct_option"],
                    "points": q_data["points"],
                }
            )
            total_points += q.points
            if q_created:
                print(f"  -> Added Question {idx+1}")

        # 4. Assign to students of this course
        students = Student.objects.filter(course=clean_course)
        assigned_count = 0
        for student in students:
            sub_assignment, sa_created = StudentLearningAssignment.objects.get_or_create(
                assignment=assignment,
                student=student,
                defaults={
                    "assigned_by": admin,
                    "due_at": timezone.now() + timedelta(days=14),
                    "total_points": total_points,
                    "status": "assigned",
                }
            )
            if sa_created:
                assigned_count += 1
        
        if assigned_count > 0:
            print(f"  -> Assigned to {assigned_count} students of course '{clean_course}'")

    print("=== LEARNING ASSIGNMENT SEEDING COMPLETED ===")

if __name__ == '__main__':
    seed_learning_assignments()
