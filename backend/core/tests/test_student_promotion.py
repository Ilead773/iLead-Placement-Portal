import pytest
from rest_framework import status
from core.models import User, Student


@pytest.mark.django_db
class TestStudentPromotion:
    """Tests for the /students/promote-batch/ endpoint."""

    def _make_student(self, reg_no, year, semester, passing_year=2027, course='BCA'):
        user = User.objects.create_user(
            login_id=f'stu_{reg_no}',
            email=f'{reg_no}@test.com',
            password='Password123!',
            role='student',
        )
        student = Student.objects.create(
            user=user,
            name=f'Student {reg_no}',
            registration_number=reg_no,
            email=f'{reg_no}@test.com',
            course=course,
            year=year,
            semester=semester,
            passing_year=passing_year,
            cgpa=7.5,
            attendance=80.0,
        )
        return student

    # ── Permission checks ───────────────────────────────────────────────────

    def test_student_user_cannot_promote(self, api_client, student_user):
        api_client.force_authenticate(user=student_user)
        response = api_client.post('/api/v1/students/promote-batch/', {
            'student_ids': [str(student_user.student_profile.id)],
            'target_year': '2nd',
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthorized_coordinator_cannot_promote(self, api_client, coordinator_user, student_user):
        coordinator_user.can_manage_students = False
        coordinator_user.save()
        api_client.force_authenticate(user=coordinator_user)
        response = api_client.post('/api/v1/students/promote-batch/', {
            'student_ids': [str(student_user.student_profile.id)],
            'target_year': '2nd',
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_authorized_coordinator_can_promote(self, api_client, coordinator_user):
        coordinator_user.can_manage_students = True
        coordinator_user.save()
        student = self._make_student('P001', '1st', 1)
        api_client.force_authenticate(user=coordinator_user)
        response = api_client.post('/api/v1/students/promote-batch/', {
            'registration_numbers': 'P001',
            'target_year': '2nd',
        }, format='json')
        assert response.status_code == status.HTTP_200_OK

    # ── Auto increment (1st → 2nd, 2nd → 3rd, 4th → Graduated) ────────────

    def test_auto_increment_1st_to_2nd(self, auth_client):
        student = self._make_student('A001', '1st', 1)
        response = auth_client.post('/api/v1/students/promote-batch/', {
            'registration_numbers': 'A001',
            'target_year': 'auto_increment',
            'semester_mode': 'auto',
            'passing_year_mode': 'keep',
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        student.refresh_from_db()
        assert student.year == '2nd'
        assert student.semester == 3  # Odd sem 1 → 3

    def test_auto_increment_1st_sem2_to_2nd_sem4(self, auth_client):
        student = self._make_student('A002', '1st', 2)
        auth_client.post('/api/v1/students/promote-batch/', {
            'registration_numbers': 'A002',
            'target_year': 'auto_increment',
            'semester_mode': 'auto',
        }, format='json')
        student.refresh_from_db()
        assert student.year == '2nd'
        assert student.semester == 4  # Even sem 2 → 4

    def test_auto_increment_2nd_to_3rd(self, auth_client):
        student = self._make_student('A003', '2nd', 3)
        auth_client.post('/api/v1/students/promote-batch/', {
            'registration_numbers': 'A003',
            'target_year': 'auto_increment',
        }, format='json')
        student.refresh_from_db()
        assert student.year == '3rd'
        assert student.semester == 5

    def test_auto_increment_4th_to_graduated(self, auth_client):
        student = self._make_student('A004', '4th', 7)
        response = auth_client.post('/api/v1/students/promote-batch/', {
            'registration_numbers': 'A004',
            'target_year': 'auto_increment',
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        student.refresh_from_db()
        assert student.year is None
        assert student.semester is None

    # ── 3rd year skipped during auto_increment ──────────────────────────────

    def test_auto_increment_3rd_year_is_skipped(self, auth_client):
        student = self._make_student('B001', '3rd', 5)
        response = auth_client.post('/api/v1/students/promote-batch/', {
            'registration_numbers': 'B001',
            'target_year': 'auto_increment',
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['promoted_count'] == 0
        assert data['skipped_count'] == 1
        student.refresh_from_db()
        assert student.year == '3rd'  # Unchanged

    # ── Explicit target year for 3rd year (NEP exit/continue) ──────────────

    def test_3rd_year_continue_to_4th(self, auth_client):
        student = self._make_student('C001', '3rd', 5)
        response = auth_client.post('/api/v1/students/promote-batch/', {
            'registration_numbers': 'C001',
            'target_year': '4th',
            'semester_mode': 'auto',
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        student.refresh_from_db()
        assert student.year == '4th'
        assert student.semester == 7

    def test_3rd_year_exit_to_graduated(self, auth_client):
        student = self._make_student('C002', '3rd', 6)
        response = auth_client.post('/api/v1/students/promote-batch/', {
            'registration_numbers': 'C002',
            'target_year': 'graduated',
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        student.refresh_from_db()
        assert student.year is None
        assert student.semester is None

    # ── By course + year filter scope ──────────────────────────────────────

    def test_promote_entire_course_batch(self, auth_client):
        s1 = self._make_student('D001', '1st', 1, course='BCA')
        s2 = self._make_student('D002', '1st', 2, course='BCA')
        s3 = self._make_student('D003', '2nd', 3, course='BBA')  # Different course, should not move

        response = auth_client.post('/api/v1/students/promote-batch/', {
            'filter_course': 'BCA',
            'filter_year': '1st',
            'target_year': 'auto_increment',
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['promoted_count'] == 2

        s1.refresh_from_db()
        s2.refresh_from_db()
        s3.refresh_from_db()

        assert s1.year == '2nd'
        assert s2.year == '2nd'
        assert s3.year == '2nd'  # BBA student unchanged

    # ── Passing year modes ──────────────────────────────────────────────────

    def test_passing_year_increment_1(self, auth_client):
        student = self._make_student('E001', '1st', 1, passing_year=2027)
        auth_client.post('/api/v1/students/promote-batch/', {
            'registration_numbers': 'E001',
            'target_year': 'auto_increment',
            'passing_year_mode': 'increment_1',
        }, format='json')
        student.refresh_from_db()
        assert student.passing_year == 2028

    def test_passing_year_specific(self, auth_client):
        student = self._make_student('E002', '1st', 1, passing_year=2027)
        auth_client.post('/api/v1/students/promote-batch/', {
            'registration_numbers': 'E002',
            'target_year': 'auto_increment',
            'passing_year_mode': 'specific',
            'specific_passing_year': 2030,
        }, format='json')
        student.refresh_from_db()
        assert student.passing_year == 2030

    # ── Validation errors ──────────────────────────────────────────────────

    def test_no_scope_returns_400(self, auth_client):
        response = auth_client.post('/api/v1/students/promote-batch/', {
            'target_year': '2nd',
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_target_year_returns_400(self, auth_client):
        self._make_student('F001', '1st', 1)
        response = auth_client.post('/api/v1/students/promote-batch/', {
            'registration_numbers': 'F001',
            'target_year': 'invalid_year',
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_no_students_found_returns_404(self, auth_client):
        response = auth_client.post('/api/v1/students/promote-batch/', {
            'registration_numbers': 'NONEXISTENT123',
            'target_year': '2nd',
        }, format='json')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    # ── Paste list with multiple formats ───────────────────────────────────

    def test_promote_by_comma_separated_reg_numbers(self, auth_client):
        s1 = self._make_student('G001', '2nd', 3)
        s2 = self._make_student('G002', '2nd', 4)
        response = auth_client.post('/api/v1/students/promote-batch/', {
            'registration_numbers': 'G001, G002',
            'target_year': 'auto_increment',
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.json()['promoted_count'] == 2
        s1.refresh_from_db()
        s2.refresh_from_db()
        assert s1.year == '3rd'
        assert s2.year == '3rd'

    def test_promote_by_newline_separated_reg_numbers(self, auth_client):
        s1 = self._make_student('H001', '1st', 1)
        s2 = self._make_student('H002', '1st', 2)
        response = auth_client.post('/api/v1/students/promote-batch/', {
            'registration_numbers': 'H001\nH002',
            'target_year': 'auto_increment',
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.json()['promoted_count'] == 2
