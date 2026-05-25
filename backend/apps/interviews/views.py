# apps/interviews/views.py
"""
AI-Powered Mock Interview API Views.

Flow:
  POST /interviews/start/         → Create session, return first question
  POST /interviews/submit-answer/ → Submit answer → AI evaluate → return result
  GET  /interviews/sessions/      → List student sessions
  GET  /interviews/sessions/<id>/ → Session detail
  GET  /interviews/domains/       → List domains
  GET  /interviews/types/         → List types (filtered by domain_id)
"""

import logging
from datetime import timedelta

from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    InterviewDomain, InterviewType, Question,
    MockInterviewSession, InterviewAnswer, InterviewFeedback,
    SkillGapAnalysis,
)
from .serializers import (
    InterviewDomainSerializer, InterviewTypeSerializer,
    StartInterviewSerializer, SubmitAnswerSerializer,
    MockInterviewSessionSerializer, SessionListSerializer,
    InterviewFeedbackSerializer,
    StartGapAnalysisSerializer, SkillGapAnalysisSerializer,
    QuickRoadmapSerializer,
)
from .ai_evaluator import AIInterviewEvaluator
from .conversation import AIConversationService
from .gap_analysis import LightweightGapAnalysisService

logger = logging.getLogger(__name__)


def _auto_abandon_stale_sessions(student, *, stale_after_hours=12):
    cutoff = timezone.now() - timedelta(hours=stale_after_hours)

    qs = MockInterviewSession.objects.filter(
        student=student, status='in_progress'
    ).only('id', 'started_at', 'created_at')

    to_abandon_ids = []
    for session in qs:
        last_activity = session.started_at or session.created_at
        if last_activity and last_activity < cutoff:
            to_abandon_ids.append(session.id)

    if to_abandon_ids:
        MockInterviewSession.objects.filter(id__in=to_abandon_ids).update(status='abandoned')


# ─── Domains & Types ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_domains(request):
    domains = InterviewDomain.objects.filter(is_active=True)
    return Response(InterviewDomainSerializer(domains, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_interview_types(request):
    domain_id = request.query_params.get('domain_id')
    types = InterviewType.objects.filter(is_active=True).select_related('domain')
    if domain_id:
        types = types.filter(domain_id=domain_id)
    return Response(InterviewTypeSerializer(types, many=True).data)


# ─── Session Flow ────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_interview(request):
    """
    Start a new mock interview session.
    POST: { interview_type_id, use_voice }
    """
    serializer = StartInterviewSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    interview_type_id = serializer.validated_data['interview_type_id']
    use_voice = serializer.validated_data['use_voice']

    try:
        student = request.user.student_profile
    except Exception:
        return Response({'error': 'Student profile not found.'}, status=400)

    try:
        interview_type = InterviewType.objects.get(id=interview_type_id, is_active=True)
    except InterviewType.DoesNotExist:
        return Response({'error': 'Invalid interview type.'}, status=400)

    # Guard against accidental duplicate starts (double-click / flaky network retries).
    # If the student already has a very recent in-progress session for the same type+mode,
    # reuse it instead of creating thousands of sessions.
    recent_cutoff = timezone.now() - timedelta(minutes=2)
    existing = MockInterviewSession.objects.filter(
        student=student,
        interview_type=interview_type,
        use_voice=use_voice,
        status='in_progress',
        created_at__gte=recent_cutoff,
    ).order_by('-created_at').first()
    if existing:
        questions = existing.questions or []
        first_q = questions[0] if questions else None
        return Response({
            'session_id': str(existing.id),
            'interview_type': interview_type.name,
            'domain': interview_type.domain.name,
            'total_questions': len(questions),
            'use_voice': existing.use_voice,
            'first_question': {
                'number': 1,
                'text': first_q.get('text') if first_q else '',
                'difficulty': first_q.get('difficulty') if first_q else 'intermediate',
                'type': first_q.get('type') if first_q else 'interview',
            } if first_q else None,
            'interviewer_intro': (
                f"Welcome back to your {interview_type.name} interview! "
                f"I'll be asking you {len(questions)} questions. "
                "Let's continue."
            ),
            'reused_existing': True,
        }, status=200)

    questions = _select_questions(interview_type)
    if not questions:
        return Response({'error': 'No questions available for this interview type.'}, status=400)

    session = MockInterviewSession.objects.create(
        student=student,
        interview_type=interview_type,
        status='in_progress',
        started_at=timezone.now(),
        use_voice=use_voice,
        questions=[{
            'id': str(q.id),
            'text': q.text,
            'difficulty': q.difficulty_level,
            'type': q.question_type,
        } for q in questions],
    )

    logger.info(
        f"[INTERVIEW] Started session {session.id} for "
        f"{student.name}, type={interview_type.name}, "
        f"questions={len(questions)}, voice={use_voice}"
    )

    return Response({
        'session_id': str(session.id),
        'interview_type': interview_type.name,
        'domain': interview_type.domain.name,
        'total_questions': len(questions),
        'use_voice': use_voice,
        'first_question': {
            'number': 1,
            'text': questions[0].text,
            'difficulty': questions[0].difficulty_level,
            'type': questions[0].question_type,
        },
        'interviewer_intro': (
            f"Welcome to your {interview_type.name} interview! "
            f"I'll be asking you {len(questions)} questions. "
            "Take your time, speak clearly, and feel free to structure your answers. "
            "Let's begin!"
        ),
    }, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_answer(request):
    """
    Submit an answer and receive AI-based dimension scoring.
    POST: { session_id, question_number, answer_text, time_taken_seconds }

    Evaluates synchronously via GPT-4.1-mini.
    Falls back gracefully if OpenAI is unavailable.
    """
    serializer = SubmitAnswerSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    session_id = serializer.validated_data['session_id']
    question_number = serializer.validated_data['question_number']
    answer_text = serializer.validated_data['answer_text']
    time_taken = serializer.validated_data.get('time_taken_seconds', 0)

    try:
        student = request.user.student_profile
    except Exception:
        return Response({'error': 'Student profile not found.'}, status=400)

    try:
        session = MockInterviewSession.objects.get(id=session_id, student=student)
    except MockInterviewSession.DoesNotExist:
        return Response({'error': 'Session not found.'}, status=404)

    if session.status != 'in_progress':
        return Response({'error': 'Session is not in progress.'}, status=400)

    if question_number < 1 or question_number > len(session.questions):
        return Response({'error': 'Invalid question number.'}, status=400)

    if session.answers.filter(question_number=question_number).exists():
        return Response({'error': 'This question has already been answered.'}, status=400)

    question_data = session.questions[question_number - 1]
    try:
        question = Question.objects.get(id=question_data['id'])
    except Question.DoesNotExist:
        return Response({'error': 'Question not found.'}, status=404)

    # ── Save Answer (Initial) ────────────────────────────────────
    answer = InterviewAnswer.objects.create(
        session=session,
        question=question,
        question_number=question_number,
        answer_text=answer_text,
        eval_status='evaluating',
        time_taken_seconds=time_taken,
    )

    # ── Trigger Celery Task ──────────────────────────────────────
    from .tasks import evaluate_answer_task
    evaluate_answer_task.delay(answer.id)

    total_q = len(session.questions)
    is_final = question_number >= total_q

    return Response({
        'status': 'processing',
        'answer_id': str(answer.id),
        'question_number': question_number,
        'is_final': is_final,
        'message': 'AI is evaluating your response...'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_answer_status(request, answer_id):
    """
    Poll endpoint for the frontend to check if AI evaluation is done.
    """
    try:
        student = request.user.student_profile
        answer = InterviewAnswer.objects.get(id=answer_id, session__student=student)
    except Exception:
        return Response({'error': 'Answer not found.'}, status=404)

    if answer.eval_status in ['evaluated', 'failed']:
        session = answer.session
        total_q = len(session.questions)
        is_final = answer.question_number >= total_q
        
        data = {
            'status': 'done',
            'score': answer.score,
            'feedback': answer.ai_feedback,
            'evaluation': answer.evaluation_json,
            'interviewer_reaction': answer.interviewer_reaction,
            'interview_complete': is_final,
        }

        if not is_final:
            next_q_data = session.questions[answer.question_number]
            data['next_question'] = {
                'number': answer.question_number + 1,
                'id': next_q_data['id'],
                'text': next_q_data['text'],
                'type': next_q_data.get('type', 'interview'),
                'difficulty': next_q_data.get('difficulty', 'intermediate'),
            }
        else:
            # Check for final feedback
            from .models import InterviewFeedback
            try:
                feedback = InterviewFeedback.objects.get(session=session)
                data['final_feedback'] = InterviewFeedbackSerializer(feedback).data
            except InterviewFeedback.DoesNotExist:
                # Still generating — keep status='done' so the frontend
                # checks data.final_feedback and polls again if missing.
                pass

        return Response(data)

    return Response({'status': 'processing'})


# ─── Session History ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_sessions(request):
    user_role = getattr(request.user, 'role', 'student')
    student_id = request.query_params.get('student_id')

    if student_id and user_role in ['admin', 'coordinator']:
        from core.models import Student
        try:
            student = Student.objects.get(id=student_id)
        except (Student.DoesNotExist, ValueError):
            return Response({'error': 'Student not found.'}, status=404)
    else:
        try:
            student = request.user.student_profile
        except Exception:
            return Response({'error': 'Student profile not found.'}, status=400)

    _auto_abandon_stale_sessions(student)

    sessions = (
        MockInterviewSession.objects.filter(student=student)
        .exclude(status__in=['in_progress', 'scheduled'])
        .select_related('interview_type', 'interview_type__domain')
        .order_by('-created_at')[:200]
    )
    return Response(SessionListSerializer(sessions, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def abandon_session(request, session_id):
    """
    Mark a student's in-progress session as abandoned (e.g., proctoring violations).
    """
    try:
        student = request.user.student_profile
    except Exception:
        return Response({'error': 'Student profile not found.'}, status=400)

    try:
        session = MockInterviewSession.objects.get(id=session_id, student=student)
    except MockInterviewSession.DoesNotExist:
        return Response({'error': 'Session not found.'}, status=404)

    if session.status in ['completed', 'abandoned']:
        return Response({'status': session.status}, status=200)

    session.status = 'abandoned'
    session.completed_at = timezone.now()
    session.save(update_fields=['status', 'completed_at'])
    return Response({'status': 'abandoned'}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_detail(request, session_id):
    user_role = getattr(request.user, 'role', 'student')

    try:
        if user_role in ['admin', 'coordinator']:
            session = MockInterviewSession.objects.select_related(
                'interview_type', 'interview_type__domain'
            ).prefetch_related('answers', 'answers__question').get(
                id=session_id
            )
        else:
            try:
                student = request.user.student_profile
            except Exception:
                return Response({'error': 'Student profile not found.'}, status=400)

            session = MockInterviewSession.objects.select_related(
                'interview_type', 'interview_type__domain'
            ).prefetch_related('answers', 'answers__question').get(
                id=session_id, student=student
            )
    except MockInterviewSession.DoesNotExist:
        return Response({'error': 'Session not found.'}, status=404)

    return Response(MockInterviewSessionSerializer(session).data)


# ─── Gap Analysis ────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_gap_analysis(request):
    serializer = StartGapAnalysisSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        student = request.user.student_profile
    except Exception:
        return Response({'error': 'Student profile not found.'}, status=400)

    try:
        domain = InterviewDomain.objects.get(
            id=serializer.validated_data['domain_id'], is_active=True
        )
    except InterviewDomain.DoesNotExist:
        return Response({'error': 'Domain not found.'}, status=400)

    service = LightweightGapAnalysisService()
    gap_analysis = service.analyze(student, domain)
    return Response(SkillGapAnalysisSerializer(gap_analysis).data, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_gap_analyses(request):
    try:
        student = request.user.student_profile
    except Exception:
        return Response({'error': 'Student profile not found.'}, status=400)

    analyses = SkillGapAnalysis.objects.filter(student=student).select_related(
        'domain', 'recommended_roadmap_template'
    )
    return Response(SkillGapAnalysisSerializer(analyses, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_roadmap(request, analysis_id):
    try:
        student = request.user.student_profile
    except Exception:
        return Response({'error': 'Student profile not found.'}, status=400)

    try:
        gap_analysis = SkillGapAnalysis.objects.get(id=analysis_id, student=student)
    except SkillGapAnalysis.DoesNotExist:
        return Response({'error': 'Gap analysis not found.'}, status=404)

    service = LightweightGapAnalysisService()
    roadmap = service.create_roadmap(gap_analysis)
    if not roadmap:
        return Response({'error': 'No roadmap template available.'}, status=400)

    return Response(QuickRoadmapSerializer(roadmap).data, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_roadmaps(request):
    from .models import QuickRoadmap
    try:
        student = request.user.student_profile
    except Exception:
        return Response({'error': 'Student profile not found.'}, status=400)

    roadmaps = QuickRoadmap.objects.filter(student=student).select_related(
        'template', 'gap_analysis__domain'
    )
    return Response(QuickRoadmapSerializer(roadmaps, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def interview_stats(request):
    if request.user.role not in ['admin', 'coordinator']:
        return Response({'error': 'Permission denied.'}, status=403)

    from django.db.models import Avg, Count

    return Response({
        'total_sessions': MockInterviewSession.objects.count(),
        'completed_sessions': MockInterviewSession.objects.filter(status='completed').count(),
        'in_progress_sessions': MockInterviewSession.objects.filter(status='in_progress').count(),
        'average_score': round(
            InterviewFeedback.objects.aggregate(avg=Avg('total_score'))['avg'] or 0, 1
        ),
        'total_questions': Question.objects.filter(is_active=True).count(),
        'total_domains': InterviewDomain.objects.filter(is_active=True).count(),
        'total_interview_types': InterviewType.objects.filter(is_active=True).count(),
    })


# ─── Helpers ─────────────────────────────────────────────────────

def _select_questions(interview_type, num=None):
    """Select pre-made questions from competencies (one per competency first)."""
    num = num or interview_type.questions_per_session
    questions = []
    competencies = interview_type.competencies.filter(is_active=True)

    for comp in competencies[:num]:
        q = comp.questions.filter(is_active=True).order_by('?').first()
        if q:
            questions.append(q)

    remaining = num - len(questions)
    if remaining > 0:
        used_ids = [q.id for q in questions]
        more = Question.objects.filter(
            competency__interview_type=interview_type,
            is_active=True,
        ).exclude(id__in=used_ids).order_by('?')[:remaining]
        questions.extend(more)

    return questions[:num]

def _generate_session_feedback(session):
    """Aggregate dimension scores from all answers into session feedback."""
    answers = session.answers.select_related('question__competency').all()
    if not answers:
        return None

    has_failed = answers.filter(eval_status='failed').exists() or session.status == 'pending_review'

    if has_failed:
        total_score = None
        summary = "AI evaluation service was temporarily unavailable during this session. This session is pending manual review by a placement coordinator."
    else:
        scores = [a.score or 0 for a in answers]
        total_score = round(sum(scores) / len(scores), 1) if scores else 0
        evaluator = AIInterviewEvaluator()
        summary = evaluator.generate_final_summary(answers, total_score)

    # Aggregate dimension averages
    dim_totals = {
        'technical_accuracy': [], 'depth': []
    }
    competency_scores = {}
    strengths = []
    weaknesses = []

    for answer in answers:
        if answer.eval_status != 'evaluated' or answer.score is None:
            continue
        comp_name = answer.question.competency.name
        score = answer.score
        competency_scores.setdefault(comp_name, []).append(score)

        dims = (answer.evaluation_json or {}).get('dimensions', {})
        for dim in dim_totals:
            if dim in dims:
                dim_totals[dim].append(dims[dim].get('score', 0))

        # Collect strengths/weaknesses from AI evaluation
        for s in (answer.evaluation_json or {}).get('strengths', []):
            if s and s not in strengths:
                strengths.append(s)
        for w in (answer.evaluation_json or {}).get('weaknesses', []):
            if w and w not in weaknesses:
                weaknesses.append(w)

    # Average competency scores
    comp_avg = {k: round(sum(v) / len(v), 1) for k, v in competency_scores.items()}

    # Dimension averages
    dimension_averages = {
        dim: {
            'score': round(sum(vals) / len(vals), 1) if vals else 0,
            'max': 10,
        }
        for dim, vals in dim_totals.items()
    }

    return InterviewFeedback.objects.create(
        session=session,
        total_score=total_score,
        competency_scores=comp_avg,
        dimension_averages=dimension_averages,
        strengths=strengths[:5],
        weaknesses=weaknesses[:5],
        feedback_summary=summary,
    )
