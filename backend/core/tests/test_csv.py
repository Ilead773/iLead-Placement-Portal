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

    def test_send_welcome_emails(self, auth_client):
        # 1. Import a CSV to create a student and save the credentials excel
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
        log_id = response.data['upload_log']['id']
        log = CSVUploadLog.objects.get(id=log_id)
        assert not log.emails_sent
        
        # 2. Call the manual email trigger endpoint
        send_url = f'/api/v1/students/upload-status/{log_id}/send-emails/'
        send_response = auth_client.post(send_url)
        assert send_response.status_code == status.HTTP_200_OK
        assert send_response.data['emails_sent_count'] == 1
        
        # 3. Verify database updates
        log.refresh_from_db()
        assert log.emails_sent
        assert log.emails_sent_at is not None

    def test_revert_upload_success(self, auth_client):
        # 1. Import a student
        url = '/api/v1/students/import-csv/'
        csv_content = (
            "name,registration_number,email,passing_year,course,semester,marks\n"
            "Test Student,STU_TEST,test@student.com,2025,BCA,6,8.5"
        )
        csv_file = SimpleUploadedFile("students.csv", csv_content.encode('utf-8'), content_type="text/csv")
        response = auth_client.post(url, {'file': csv_file}, format='multipart')
        assert response.status_code == status.HTTP_202_ACCEPTED
        log_id = response.data['upload_log']['id']
        
        assert User.objects.filter(login_id='stu_test').exists()
        assert Student.objects.filter(registration_number='STU_TEST').exists()
        
        # 2. Revert the import
        revert_url = f'/api/v1/students/{log_id}/revert-upload/'
        revert_response = auth_client.post(revert_url)
        assert revert_response.status_code == status.HTTP_200_OK
        
        # 3. Verify user and student are deleted
        assert not User.objects.filter(login_id='stu_test').exists()
        assert not Student.objects.filter(registration_number='STU_TEST').exists()
        log = CSVUploadLog.objects.get(id=log_id)
        assert log.status == 'reverted'

    def test_import_without_semester_success(self, auth_client):
        url = '/api/v1/students/import-csv/'
        # CSV content has no semester column, and passing_year has no 'year' or year auto-derivation
        csv_content = (
            "name,registration_number,email,passing_year,course,marks\n"
            "Semesterless Student,STU_NO_SEM,nosem@student.com,2025,BCA,8.5"
        )
        csv_file = SimpleUploadedFile(
            "students.csv", 
            csv_content.encode('utf-8'), 
            content_type="text/csv"
        )
        
        # Post request with empty string or omitting default_semester
        response = auth_client.post(url, {'file': csv_file, 'default_semester': ''}, format='multipart')
        
        assert response.status_code == status.HTTP_202_ACCEPTED
        assert User.objects.filter(login_id='stu_no_sem').exists()
        
        student = Student.objects.get(registration_number='STU_NO_SEM')
        assert student.semester is None
        assert student.year is None
        
        log_id = response.data['upload_log']['id']
        log = CSVUploadLog.objects.get(id=log_id)
        assert log.status == 'success'
        assert log.successful_records == 1
