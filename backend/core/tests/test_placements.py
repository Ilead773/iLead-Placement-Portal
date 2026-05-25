import pytest
from rest_framework import status
from core.models import Placement, PlacementAssignment, Student
from model_bakery import baker

@pytest.mark.django_db
class TestPlacements:
    def test_create_placement(self, auth_client):
        url = '/api/v1/placements/'
        data = {
            'company_name': 'Google',
            'position': 'Software Engineer',
            'salary': 1500000,
            'required_cgpa': 8.0,
            'eligible_courses': 'BCA, MCA'
        }
        response = auth_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert Placement.objects.filter(company_name='Google').exists()

    def test_bulk_assign_students(self, auth_client, student_user):
        placement = baker.make(Placement, company_name='Meta')
        student = Student.objects.get(user=student_user)
        
        url = f'/api/v1/placements/{placement.id}/assign-students/'
        data = {
            'student_ids': [str(student.id)]
        }
        response = auth_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert PlacementAssignment.objects.filter(placement=placement, student=student).exists()

    def test_prevent_duplicate_assignment(self, auth_client, student_user):
        placement = baker.make(Placement)
        student = Student.objects.get(user=student_user)
        
        # First assignment
        PlacementAssignment.objects.create(placement=placement, student=student)
        
        url = f'/api/v1/placements/{placement.id}/assign-students/'
        data = {'student_ids': [str(student.id)]}
        response = auth_client.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['duplicates'] == 1
        assert response.data['assigned'] == 0

    def test_assignment_status_update(self, auth_client, student_user):
        placement = baker.make(Placement)
        student = Student.objects.get(user=student_user)
        assignment = PlacementAssignment.objects.create(placement=placement, student=student, status='assigned')
        
        url = f'/api/v1/assignments/{assignment.id}/status/'
        data = {'status': 'selected'}
        response = auth_client.patch(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assignment.refresh_from_db()
        assert assignment.status == 'selected'
