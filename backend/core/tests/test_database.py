import pytest
from django.db import IntegrityError
from core.models import User, Student
from model_bakery import baker

@pytest.mark.django_db
class TestDatabaseIntegrity:
    def test_unique_registration_number_constraint(self):
        # Create first student
        user1 = baker.make(User, login_id='u1', email='u1@test.com')
        Student.objects.create(user=user1, name='S1', registration_number='REG001', email='u1@test.com')
        
        # Try to create second student with same reg number
        user2 = baker.make(User, login_id='u2', email='u2@test.com')
        with pytest.raises(IntegrityError):
            Student.objects.create(user=user2, name='S2', registration_number='REG001', email='u2@test.com')

    def test_unique_login_id_constraint(self):
        baker.make(User, login_id='unique_id', email='u1@test.com')
        with pytest.raises(IntegrityError):
            baker.make(User, login_id='unique_id', email='u2@test.com')

    def test_student_cascade_delete(self):
        user = baker.make(User, login_id='to_delete')
        student = Student.objects.create(user=user, name='DeleteMe', registration_number='DEL001', email='del@test.com')
        
        # Deleting user should delete student profile
        user.delete()
        assert not Student.objects.filter(registration_number='DEL001').exists()
