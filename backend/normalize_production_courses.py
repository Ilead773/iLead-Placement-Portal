"""
Script to normalize course names in the production database.
This script will:
1. Update Student.course for:
   - 'Bachelor of Business Administration (BBA)' -> 'BBA' (210 students)
   - 'BBA in Sport Management (BBA SM)' -> 'BBA in Sports Management (BBA SM)' (46 students)
   - 'BBA in Data Science' -> 'BSc in Data Science' (2 students)
2. Delete the non-standard Course records from the LMS courses table.
3. Delete CourseProgress records for non-standard courses to prevent duplicates/orphans.
4. Regenerate CourseProgress records for the normalized courses using ensure_student_progress_records().

To run this script on the production database:
python backend/manage.py shell < backend/normalize_production_courses.py
"""

import os
import django

# Setup django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction
from core.models import Student, Course
from apps.north_star.models import CourseProgress
from apps.north_star.views import ensure_student_progress_records

print("=== STARTING COURSE NORMALIZATION ===")

with transaction.atomic():
    # 1. Update Student.course values
    s1 = Student.objects.filter(course='Bachelor of Business Administration (BBA)').update(course='BBA')
    print(f"Updated {s1} students from 'Bachelor of Business Administration (BBA)' to 'BBA'")

    s2 = Student.objects.filter(course='BBA in Sport Management (BBA SM)').update(course='BBA in Sports Management (BBA SM)')
    print(f"Updated {s2} students from 'BBA in Sport Management (BBA SM)' to 'BBA in Sports Management (BBA SM)'")

    s3 = Student.objects.filter(course='BBA in Data Science').update(course='BSc in Data Science')
    print(f"Updated {s3} students from 'BBA in Data Science' to 'BSc in Data Science'")

    # 2. Delete the CourseProgress records associated with the old non-standard course names
    old_course_names = [
        'Bachelor of Business Administration (BBA)',
        'BBA in Sport Management (BBA SM)',
        'BBA in Data Science'
    ]
    
    old_courses = Course.objects.filter(name__in=old_course_names)
    for course in old_courses:
        p_deleted, _ = CourseProgress.objects.filter(course=course).delete()
        print(f"Deleted {p_deleted} CourseProgress records for old course '{course.name}'")

    # 3. Delete the non-standard Course records from LMS courses table
    c_deleted, _ = old_courses.delete()
    print(f"Deleted {c_deleted} non-standard Course records")

    # 4. Re-run ensure_student_progress_records to rebuild clean records
    print("Rebuilding student progress records...")
    ensure_student_progress_records()
    print("Clean progress records ensured.")

print("=== NORMALIZATION COMPLETE ===")
