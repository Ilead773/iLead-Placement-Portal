#!/usr/bin/env python
import os
import django
import random
from datetime import datetime, timedelta
from django.utils import timezone

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from core.models import Student
from core.models import Course
from apps.north_star.models import (
    ScheduledClass,
    Attendance,
    NorthStarAssignment,
    AssignmentSubmission,
    CourseProgress
)

User = get_user_model()

def seed_north_star():
    print("Starting North Star LMS seeding...")

    # 1. Fetch all unique student courses from Student profiles
    student_courses = set(Student.objects.exclude(course='').values_list('course', flat=True))
    if not student_courses:
        print("No student courses found. Make sure student data is seeded first.")
        return

    print(f"Found {len(student_courses)} unique courses to seed in LMS.")

    # 2. Get a host coordinator/admin to host classes and create assignments
    host_user = User.objects.filter(role__in=['admin', 'coordinator']).first()
    if not host_user:
        # Fallback to superuser
        host_user = User.objects.filter(is_superuser=True).first()
    if not host_user:
        print("No admin or coordinator found to host classes.")
        return
    print(f"Using host: {host_user.username if hasattr(host_user, 'username') else host_user.login_id} ({host_user.role})")

    # Keep track of course models
    course_map = {}

    # 3. Create courses
    for course_name in student_courses:
        dept = "Management"
        if "BSc" in course_name or "Computer" in course_name or "Data Science" in course_name or "Cyber" in course_name:
            dept = "Technology"
        elif "Media" in course_name or "Multimedia" in course_name:
            dept = "Media & Design"

        course_obj, created = Course.objects.get_or_create(
            name=course_name,
            defaults={
                'category': dept
            }
        )
        course_map[course_name] = course_obj
        if created:
            print(f"Created Course: {course_name}")
        else:
            print(f"Found Course: {course_name}")

    # For each course, create classes and assignments
    now = timezone.now()
    
    # Define past and future offsets for classes
    past_classes_info = [
        {"title": "Orientation & Course Overview", "days_ago": 7, "hour": 10, "duration": 60},
        {"title": "Fundamentals & Concepts - Session 1", "days_ago": 5, "hour": 11, "duration": 90},
        {"title": "Interactive Workshop & Q&A - Session 2", "days_ago": 3, "hour": 14, "duration": 60},
        {"title": "Intermediate Lab & Hands-on Practice", "days_ago": 1, "hour": 10, "duration": 120},
    ]
    
    future_classes_info = [
        {"title": "Advanced Topics & Industry Guest Lecture", "days_ahead": 1, "hour": 10, "duration": 90},
        {"title": "Project Presentations & Feedback", "days_ahead": 3, "hour": 11, "duration": 120},
        {"title": "Final Review & Q&A Session", "days_ahead": 5, "hour": 14, "duration": 60},
    ]

    # Define assignments
    assignments_info = [
        {"title": "Assignment 1: Foundational Worksheet", "days_ago": 6, "max_score": 100},
        {"title": "Assignment 2: Midterm Practical Submission", "days_ago": 2, "max_score": 100},
        {"title": "Final Project: Capstone Presentation", "days_ahead": 4, "max_score": 150},
    ]

    for course_name, course_obj in course_map.items():
        print(f"\nSeeding Classes & Assignments for: {course_name}")
        
        # A. Create Classes
        past_classes = []
        for cls_info in past_classes_info:
            start_date = now - timedelta(days=cls_info["days_ago"])
            start_time = datetime(start_date.year, start_date.month, start_date.day, cls_info["hour"], 0)
            start_time = timezone.make_aware(start_time)
            end_time = start_time + timedelta(minutes=cls_info["duration"])

            cls_obj, _ = ScheduledClass.objects.get_or_create(
                course=course_obj,
                title=cls_info["title"],
                defaults={
                    'start_time': start_time,
                    'end_time': end_time,
                    'zoom_meeting_id': f"{random.randint(100000000, 999999999)}",
                    'zoom_join_url': f"https://zoom.us/j/{random.randint(100000000, 999999999)}",
                    'zoom_start_url': f"https://zoom.us/s/{random.randint(100000000, 999999999)}",
                    'host': host_user
                }
            )
            past_classes.append(cls_obj)

        for cls_info in future_classes_info:
            start_date = now + timedelta(days=cls_info["days_ahead"])
            start_time = datetime(start_date.year, start_date.month, start_date.day, cls_info["hour"], 0)
            start_time = timezone.make_aware(start_time)
            end_time = start_time + timedelta(minutes=cls_info["duration"])

            ScheduledClass.objects.get_or_create(
                course=course_obj,
                title=cls_info["title"],
                defaults={
                    'start_time': start_time,
                    'end_time': end_time,
                    'zoom_meeting_id': f"{random.randint(100000000, 999999999)}",
                    'zoom_join_url': f"https://zoom.us/j/{random.randint(100000000, 999999999)}",
                    'zoom_start_url': f"https://zoom.us/s/{random.randint(100000000, 999999999)}",
                    'host': host_user
                }
            )

        # B. Create Assignments
        past_asms = []
        future_asms = []
        for asm_info in assignments_info:
            if "days_ago" in asm_info:
                due_time = now - timedelta(days=asm_info["days_ago"])
                asm_obj, _ = NorthStarAssignment.objects.get_or_create(
                    course=course_obj,
                    title=asm_info["title"],
                    defaults={
                        'description': f"Please complete and submit the {asm_info['title']}.",
                        'due_date': due_time,
                        'max_score': asm_info["max_score"],
                        'created_by': host_user
                    }
                )
                past_asms.append(asm_obj)
            else:
                due_time = now + timedelta(days=asm_info["days_ahead"])
                asm_obj, _ = NorthStarAssignment.objects.get_or_create(
                    course=course_obj,
                    title=asm_info["title"],
                    defaults={
                        'description': f"Capstone final project details and templates.",
                        'due_date': due_time,
                        'max_score': asm_info["max_score"],
                        'created_by': host_user
                    }
                )
                future_asms.append(asm_obj)

        # C. Process Students in this course
        students = Student.objects.filter(course=course_name)
        print(f"Seeding student metrics for {students.count()} students in {course_name}...")
        
        for student in students:
            # Create Attendance records for past classes
            attended_count = 0
            for p_class in past_classes:
                # 85% attendance probability
                is_present = random.random() < 0.85
                status_val = 'present' if is_present else random.choice(['absent', 'late', 'excused'])
                if status_val in ['present', 'late']:
                    attended_count += 1

                Attendance.objects.get_or_create(
                    scheduled_class=p_class,
                    student=student.user,
                    defaults={
                        'status': status_val,
                        'total_duration_minutes': random.randint(45, 120) if status_val in ['present', 'late'] else 0,
                        'join_count': random.randint(1, 2) if status_val in ['present', 'late'] else 0,
                        'marked_via': 'zoom_auto'
                    }
                )

            # Create submissions for past assignments
            graded_count = 0
            for p_asm in past_asms:
                # 80% submission probability
                if random.random() < 0.85:
                    status_choice = random.choice(['submitted', 'graded'])
                    score = None
                    feedback = ""
                    if status_choice == 'graded':
                        score = random.randint(70, p_asm.max_score)
                        feedback = random.choice([
                            "Excellent work, clear presentation.",
                            "Good effort! Satisfies all core requirements.",
                            "Nicely done, but check formatting next time.",
                            "Outstanding submission, very detailed."
                        ])
                        graded_count += 1

                    AssignmentSubmission.objects.get_or_create(
                        assignment=p_asm,
                        student=student.user,
                        defaults={
                            'status': status_choice,
                            'score': score,
                            'feedback': feedback,
                            'submitted_at': p_asm.due_date - timedelta(hours=random.randint(1, 12))
                        }
                    )

            # Compute and save CourseProgress
            total_classes_held = len(past_classes)
            attendance_percent = (attended_count * 100.0 / total_classes_held) if total_classes_held > 0 else 100.0
            
            total_assignments_issued = len(past_asms) + len(future_asms)
            completion_percent = (graded_count * 100.0 / total_assignments_issued) if total_assignments_issued > 0 else 100.0

            certificate_unlocked = (attendance_percent >= 75.0 and completion_percent == 100.0)
            cert_url = f"/media/certificates/cert_{student.id}.pdf" if certificate_unlocked else ""

            CourseProgress.objects.update_or_create(
                student=student.user,
                course=course_obj,
                defaults={
                    'completion_percent': round(completion_percent, 2),
                    'attendance_percent': round(attendance_percent, 2),
                    'certificate_unlocked': certificate_unlocked,
                    'certificate_url': cert_url
                }
            )

    print("\nNorth Star LMS seeding completed successfully!")

if __name__ == "__main__":
    seed_north_star()
