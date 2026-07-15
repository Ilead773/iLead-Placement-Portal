import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.north_star.tasks import update_course_progress
from django.contrib.auth import get_user_model
from apps.north_star.models import Course, CourseProgress

User = get_user_model()
student = User.objects.get(email='demo.student@ilead.com')
course = Course.objects.filter(name='BBA').first()

print(f"=== UPDATING COURSE PROGRESS FOR {student.email} IN {course.name} ===")
# We run the function directly (not async .delay) to run synchronously!
update_course_progress(student.id, course.id)
print("=== UPDATE COMPLETE ===")

# Verify new value
progress = CourseProgress.objects.get(student=student, course=course)
print(f"New Progress Value: Completion={progress.completion_percent}% | Attendance={progress.attendance_percent}%")
