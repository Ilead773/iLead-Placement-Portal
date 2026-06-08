import pytest
from rest_framework import status
from core.models import User, Student

@pytest.mark.django_db
class TestStudentUpdate:
    def test_update_student_success(self, auth_client, student_user):
        student = student_user.student_profile
        url = f'/api/v1/students/{student.id}/'
        
        update_data = {
            'name': 'Updated Student One',
            'email': 'updated_stu001@test.com',
            'phone_number': '+919876543210',
            'course': 'BSc Computer Science',
            'stream': 'Data Science',
            'semester': 4,
            'year': '2nd',
            'passing_year': 2026,
            'cgpa': 9.2,
            'attendance': 88.5,
            'training_attendance': 95.0,
            'backlogs_count': 1,
            'category': 'B'
        }
        
        response = auth_client.put(url, update_data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Reload from DB
        student.refresh_from_db()
        student_user.refresh_from_db()
        
        # Verify student fields
        assert student.name == 'Updated Student One'
        assert student.email == 'updated_stu001@test.com'
        assert student.phone_number == '+919876543210'
        assert student.course == 'BSc Computer Science'
        assert student.stream == 'Data Science'
        assert student.semester == 4
        assert student.year == '2nd'
        assert student.passing_year == 2026
        assert student.cgpa == 9.2
        assert student.attendance == 88.5
        assert student.training_attendance == 95.0
        assert student.backlogs_count == 1
        assert student.backlogs is True
        assert student.category == 'B'
        
        # Verify synced User fields
        assert student_user.name == 'Updated Student One'
        assert student_user.email == 'updated_stu001@test.com'

    def test_registration_number_is_immutable(self, auth_client, student_user):
        student = student_user.student_profile
        url = f'/api/v1/students/{student.id}/'
        
        update_data = {
            'name': 'Updated Student One',
            'registration_number': 'STU_HACKED',  # Attempt to change registration number
            'email': 'updated_stu001@test.com'
        }
        
        response = auth_client.put(url, update_data, format='json')
        assert response.status_code == status.HTTP_200_OK
        
        # Reload from DB
        student.refresh_from_db()
        student_user.refresh_from_db()
        
        # Verify registration number was NOT changed
        assert student.registration_number == 'STU001'
        assert student_user.login_id == 'stu001'

    def test_coordinator_permissions(self, api_client, coordinator_user, student_user):
        student = student_user.student_profile
        url = f'/api/v1/students/{student.id}/'
        update_data = {'name': 'Updated by Coord'}
        
        # 1. Unauthorized coordinator (can_manage_students = False)
        api_client.force_authenticate(user=coordinator_user)
        response = api_client.put(url, update_data, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # 2. Authorized coordinator (can_manage_students = True)
        coordinator_user.can_manage_students = True
        coordinator_user.save()
        
        response = api_client.put(url, update_data, format='json')
        assert response.status_code == status.HTTP_200_OK
        
        student.refresh_from_db()
        assert student.name == 'Updated by Coord'

    def test_student_cannot_edit_themselves(self, api_client, student_user):
        student = student_user.student_profile
        url = f'/api/v1/students/{student.id}/'
        update_data = {'name': 'Self Hack'}
        
        api_client.force_authenticate(user=student_user)
        response = api_client.put(url, update_data, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_invalid_cgpa_rejected(self, auth_client, student_user):
        student = student_user.student_profile
        url = f'/api/v1/students/{student.id}/'
        update_data = {'cgpa': 12.5}  # Out of bounds (>10)
        
        response = auth_client.put(url, update_data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_duplicate_email_rejected(self, auth_client, student_user):
        # Create another student first
        other_user = User.objects.create_user(
            login_id='other_stu',
            email='other@test.com',
            password='Password123!',
            role='student'
        )
        Student.objects.create(
            user=other_user,
            name='Other Student',
            registration_number='STU002',
            email='other@test.com',
            course='BCA'
        )
        
        student = student_user.student_profile
        url = f'/api/v1/students/{student.id}/'
        update_data = {'email': 'other@test.com'}  # In use by STU002
        
        response = auth_client.put(url, update_data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
