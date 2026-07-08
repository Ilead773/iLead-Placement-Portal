import pytest
from django.utils import timezone
from datetime import timedelta
from core.models import User, Student, Course
from apps.north_star.models import ScheduledClass

@pytest.mark.django_db
class TestDynamicCalculations:
    def test_pact_score_without_scheduled_classes(self):
        # Ensure no scheduled classes exist
        ScheduledClass.objects.all().delete()
        
        user = User.objects.create_user(
            login_id='test_student_1',
            email='test1@example.com',
            password='Password123!'
        )
        student = Student.objects.create(
            user=user,
            name='Test Student 1',
            registration_number='REG001',
            email='test1@example.com',
            cgpa=8.0,
            attendance=80.0,
            backlogs_count=0
        )
        
        # Expected calculation:
        # performance_score = 8.0 * 10.0 = 80.0
        # attendance_score = 80.0
        # standing_score = 100.0
        # Formula: (80.0 * 0.35 + 80.0 * 0.25 + 100.0 * 0.15) / 0.75 = 63.0 / 0.75 = 84.0
        assert student.pact_score == 84.0

    def test_pact_score_with_scheduled_classes(self):
        # Create a scheduled class
        course = Course.objects.create(name='BCA Test', category='IT')
        host = User.objects.create_user(
            login_id='host_user',
            email='host@example.com',
            password='Password123!',
            role='coordinator'
        )
        ScheduledClass.objects.create(
            course=course,
            title='Test Class',
            start_time=timezone.now(),
            end_time=timezone.now() + timedelta(hours=1),
            host=host
        )

        user = User.objects.create_user(
            login_id='test_student_2',
            email='test2@example.com',
            password='Password123!'
        )
        student = Student.objects.create(
            user=user,
            name='Test Student 2',
            registration_number='REG002',
            email='test2@example.com',
            cgpa=8.0,
            attendance=80.0,
            training_attendance=90.0,
            backlogs_count=0
        )

        # Expected calculation:
        # performance_score = 80.0
        # attendance_score = 80.0
        # training_score = 90.0
        # standing_score = 100.0
        # Formula: 80.0 * 0.35 + 80.0 * 0.25 + 90.0 * 0.25 + 100.0 * 0.15 = 28.0 + 20.0 + 22.5 + 15.0 = 85.5
        assert student.pact_score == 85.5

    def test_calculate_category_without_scheduled_classes(self):
        # Ensure no scheduled classes exist
        ScheduledClass.objects.all().delete()

        user = User.objects.create_user(
            login_id='test_student_3',
            email='test3@example.com',
            password='Password123!'
        )
        student = Student.objects.create(
            user=user,
            name='Test Student 3',
            registration_number='REG003',
            email='test3@example.com',
            cgpa=8.2,
            attendance=76.0,
            backlogs=True,
            backlogs_count=1
        )

        # Since no classes exist:
        # Category A needs >= 2 of 3 conditions:
        # 1. attendance >= 75% -> 76.0 (Yes)
        # 2. cgpa >= 8.0 -> 8.2 (Yes)
        # 3. backlogs_count == 0 -> 1 (No)
        # Score = 2, category should be 'A'
        assert student.category == 'A'

    def test_calculate_category_with_scheduled_classes(self):
        # Create a scheduled class
        course = Course.objects.create(name='BCA Test 2', category='IT')
        host = User.objects.create_user(
            login_id='host_user_2',
            email='host2@example.com',
            password='Password123!',
            role='coordinator'
        )
        ScheduledClass.objects.create(
            course=course,
            title='Test Class 2',
            start_time=timezone.now(),
            end_time=timezone.now() + timedelta(hours=1),
            host=host
        )

        user = User.objects.create_user(
            login_id='test_student_4',
            email='test4@example.com',
            password='Password123!'
        )
        student = Student.objects.create(
            user=user,
            name='Test Student 4',
            registration_number='REG004',
            email='test4@example.com',
            cgpa=8.2,
            attendance=76.0,
            training_attendance=90.0,
            backlogs=True,
            backlogs_count=1
        )

        # With scheduled classes:
        # Category A needs >= 3 of 4 conditions:
        # 1. attendance >= 75% -> 76.0 (Yes)
        # 2. cgpa >= 8.0 -> 8.2 (Yes)
        # 3. backlogs_count == 0 -> 1 (No)
        # 4. training_attendance >= 100% -> 90.0 (No)
        # Score = 2, so NOT Category A.
        # Let's check Category B (needs >= 3 of 4 conditions):
        # 1. attendance >= 50% -> 76.0 (Yes)
        # 2. cgpa >= 6.5 -> 8.2 (Yes)
        # 3. backlogs_count <= 2 -> 1 (Yes)
        # 4. training_attendance >= 80% -> 90.0 (Yes)
        # Score = 4, category should be 'B'
        assert student.category == 'B'

    def test_signals_automatically_recalculate_categories(self):
        # Start with no classes
        ScheduledClass.objects.all().delete()

        user = User.objects.create_user(
            login_id='test_student_5',
            email='test5@example.com',
            password='Password123!'
        )
        student = Student.objects.create(
            user=user,
            name='Test Student 5',
            registration_number='REG005',
            email='test5@example.com',
            cgpa=8.2,
            attendance=76.0,
            training_attendance=90.0,
            backlogs=True,
            backlogs_count=1
        )

        # Initially, with 0 classes, Category A is met (2 of 3)
        assert student.category == 'A'

        # Now create the first scheduled class in the database
        course = Course.objects.create(name='BCA Test 3', category='IT')
        host = User.objects.create_user(
            login_id='host_user_3',
            email='host3@example.com',
            password='Password123!',
            role='coordinator'
        )
        cls = ScheduledClass.objects.create(
            course=course,
            title='Test Class 3',
            start_time=timezone.now(),
            end_time=timezone.now() + timedelta(hours=1),
            host=host
        )

        # This should trigger the signal and recalculate the category to 'B'
        student.refresh_from_db()
        assert student.category == 'B'

        # Now delete the scheduled class, leaving 0 classes
        cls.delete()

        # This should trigger the signal and recalculate the category back to 'A'
        student.refresh_from_db()
        assert student.category == 'A'
