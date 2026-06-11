from datetime import timedelta

from django.utils import timezone

from core.models import LearningAssignment, StudentLearningAssignment


def test_admin_can_assign_mcq_and_student_submission_is_scored(auth_client, api_client, admin_user, student_user):
    payload = {
        'course': 'BCA',
        'title': 'Aptitude Basics',
        'description': 'Quick practice set',
        'duration_minutes': 20,
        'questions': [
            {
                'prompt': '2 + 2 = ?',
                'options': ['3', '4', '5', '6'],
                'correct_option': 1,
                'points': 2,
                'order': 0,
            },
            {
                'prompt': 'Which is a database?',
                'options': ['React', 'PostgreSQL', 'CSS', 'HTML'],
                'correct_option': 1,
                'points': 1,
                'order': 1,
            },
        ],
    }

    create_response = auth_client.post('/api/v1/learning-assignments/bank/', payload, format='json')
    assert create_response.status_code == 201
    assignment_id = create_response.data['id']
    student = student_user.student_profile

    assign_response = auth_client.post(
        '/api/v1/learning-assignments/assign/',
        {
            'assignment_id': assignment_id,
            'student_ids': [str(student.id)],
            'due_at': (timezone.now() + timedelta(days=1)).isoformat(),
        },
        format='json',
    )
    assert assign_response.status_code == 201
    assert assign_response.data['assigned'] == 1

    api_client.force_authenticate(user=student_user)
    student_assignment = StudentLearningAssignment.objects.get(student=student)
    questions = list(LearningAssignment.objects.get(id=assignment_id).questions.all())
    submit_response = api_client.post(
        f'/api/v1/me/learning-assignments/{student_assignment.id}/submit/',
        {'answers': {str(questions[0].id): 1, str(questions[1].id): 0}},
        format='json',
    )

    assert submit_response.status_code == 200
    assert submit_response.data['score'] == 2
    assert submit_response.data['total_points'] == 3
    assert submit_response.data['percentage'] == 66.7

    auth_client.force_authenticate(user=admin_user)
    results_response = auth_client.get('/api/v1/learning-assignments/results/', {'course': 'BCA'})
    assert results_response.status_code == 200
    assert results_response.data[0]['status'] == 'submitted'
    assert results_response.data[0]['score'] == 2


def test_admin_can_reassign_mcq_and_resets_attempt(auth_client, api_client, admin_user, student_user):
    payload = {
        'course': 'BCA',
        'title': 'Aptitude Basics',
        'description': 'Quick practice set',
        'duration_minutes': 20,
        'questions': [
            {
                'prompt': '2 + 2 = ?',
                'options': ['3', '4', '5', '6'],
                'correct_option': 1,
                'points': 2,
                'order': 0,
            }
        ],
    }

    create_resp = auth_client.post('/api/v1/learning-assignments/bank/', payload, format='json')
    assert create_resp.status_code == 201
    assignment_id = create_resp.data['id']
    student = student_user.student_profile

    # Assign first time
    assign_resp = auth_client.post(
        '/api/v1/learning-assignments/assign/',
        {
            'assignment_id': assignment_id,
            'student_ids': [str(student.id)],
        },
        format='json',
    )
    assert assign_resp.status_code == 201
    assert assign_resp.data['assigned'] == 1
    assert assign_resp.data['duplicates'] == 0

    # Student submits
    student_assignment = StudentLearningAssignment.objects.get(student=student)
    questions = list(LearningAssignment.objects.get(id=assignment_id).questions.all())
    api_client.force_authenticate(user=student_user)
    submit_resp = api_client.post(
        f'/api/v1/me/learning-assignments/{student_assignment.id}/submit/',
        {'answers': {str(questions[0].id): 1}},
        format='json',
    )
    assert submit_resp.status_code == 200
    assert student_assignment.answers.count() == 1

    # Reassign same assignment
    auth_client.force_authenticate(user=admin_user)
    assign_resp2 = auth_client.post(
        '/api/v1/learning-assignments/assign/',
        {
            'assignment_id': assignment_id,
            'student_ids': [str(student.id)],
        },
        format='json',
    )
    assert assign_resp2.status_code == 201
    assert assign_resp2.data['assigned'] == 1
    assert assign_resp2.data['duplicates'] == 0

    # Check that it resets
    student_assignment.refresh_from_db()
    assert student_assignment.status == 'assigned'
    assert student_assignment.score is None
    assert student_assignment.submitted_at is None
    assert student_assignment.answers.count() == 0

