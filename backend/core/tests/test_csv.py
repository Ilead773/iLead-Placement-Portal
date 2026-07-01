import pytest
import io
import csv
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from core.models import User, Student, CSVUploadLog

@pytest.mark.django_db
class TestCSVImport:
    def test_valid_csv_import_success(self, auth_client):
        url = '/api/v1/students/import-csv/'
        csv_content = (
            "name,registration_number,email,passing_year,course,semester,marks\n"
            "Test Student,STU_TEST,test@student.com,2025,BCA,6,8.5"
        )
        csv_file = SimpleUploadedFile(
            "students.csv", 
            csv_content.encode('utf-8'), 
            content_type="text/csv"
        )
        
        response = auth_client.post(url, {'file': csv_file}, format='multipart')
        
        assert response.status_code == status.HTTP_202_ACCEPTED
        assert User.objects.filter(login_id='stu_test').exists()
        assert Student.objects.filter(registration_number='STU_TEST').exists()
        
        # Verify upload_log is returned and is successful
        assert 'upload_log' in response.data
        log_id = response.data['upload_log']['id']
        log = CSVUploadLog.objects.get(id=log_id)
        assert log.status == 'success'
        assert log.successful_records == 1

    def test_duplicate_registration_number_failure(self, auth_client, student_user):
        # student_user already has STU001
        url = '/api/v1/students/import-csv/'
        csv_content = (
            "name,registration_number,email,passing_year,course,semester,marks\n"
            "New Student,STU001,new@student.com,2025,BCA,6,8.5"
        )
        csv_file = SimpleUploadedFile("students.csv", csv_content.encode('utf-8'), content_type="text/csv")
        
        response = auth_client.post(url, {'file': csv_file}, format='multipart')
        
        # Should be a partial or success with errors logged in CSVUploadLog
        assert response.status_code == status.HTTP_202_ACCEPTED
        log = CSVUploadLog.objects.first()
        assert log.failed_records == 1
        assert "Duplicate registration number" in log.error_details

    def test_invalid_cgpa_rejection(self, auth_client):
        url = '/api/v1/students/import-csv/'
        csv_content = (
            "name,registration_number,email,passing_year,course,semester,marks\n"
            "Invalid CGPA,STU_INV,inv@test.com,2025,BCA,6,11.5" # 11.5 is invalid (>10)
        )
        csv_file = SimpleUploadedFile("students.csv", csv_content.encode('utf-8'), content_type="text/csv")
        
        response = auth_client.post(url, {'file': csv_file}, format='multipart')
        log = CSVUploadLog.objects.first()
        assert log.failed_records == 1
        assert "cgpa" in log.error_details.lower()
