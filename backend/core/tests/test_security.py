import pytest
from rest_framework import status
from core.models import AuditLog, User, Student
from model_bakery import baker

@pytest.mark.django_db
class TestSecurityAndAudit:
    def test_audit_log_on_login(self, api_client, admin_user):
        url = '/api/v1/auth/login/'
        data = {'login_id': 'admin_test', 'password': 'AdminPassword123!'}
        
        # Action
        api_client.post(url, data)
        
        # Verify log entry
        log = AuditLog.objects.filter(user=admin_user, action='login_success').first()
        assert log is not None
        assert log.ip_address is not None

    def test_audit_log_on_csv_import(self, auth_client):
        from django.core.files.uploadedfile import SimpleUploadedFile
        url = '/api/v1/students/import-csv/'
        csv_content = "name,registration_number,email\nTest,STU_AUDIT,audit@test.com"
        csv_file = SimpleUploadedFile("test.csv", csv_content.encode('utf-8'), content_type="text/csv")
        
        # Action
        auth_client.post(url, {'file': csv_file}, format='multipart')
        
        # Verify log entry
        log = AuditLog.objects.filter(action='csv_upload').first()
        assert log is not None
        assert 'test.csv' in log.details

    def test_student_isolation_cannot_see_other_students(self, api_client, student_user):
        # Create another student
        other_user = baker.make(User, role='student')
        baker.make(Student, user=other_user, registration_number='STU_OTHER')
        
        # Login as first student
        api_client.force_authenticate(user=student_user)
        
        # Try to access students list
        url = '/api/v1/students/'
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_student_cannot_access_audit_logs(self, api_client, student_user):
        api_client.force_authenticate(user=student_user)
        url = '/api/v1/audit-logs/'
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
