# apps/interviews/tasks.py
from celery import shared_task
import logging
from django.utils import timezone
from .models import InterviewAnswer, MockInterviewSession
from .ai_evaluator import AIInterviewEvaluator
from .conversation import AIConversationService

logger = logging.getLogger(__name__)

@shared_task(name='apps.interviews.tasks.evaluate_answer_task')
def evaluate_answer_task(answer_id):
    """
    Background task to evaluate an interview answer and generate a reaction.
    """
    try:
        answer = InterviewAnswer.objects.get(id=answer_id)
        session = answer.session
        question = answer.question
        
        # ── AI Evaluation ────────────────────────────────────────────
        evaluator = AIInterviewEvaluator()
        eval_result = evaluator.evaluate(
            question_text=question.text,
            ideal_answer=question.ideal_answer,
            evaluation_rubric=question.evaluation_rubric,
            answer_text=answer.answer_text,
        )
        
        # ── Conversation Layer ───────────────────────────────────────
        conversation = AIConversationService()
        is_final = answer.question_number >= len(session.questions)
        
        next_q_text = None
        if not is_final:
            next_q_data = session.questions[answer.question_number]
            next_q_text = next_q_data.get('text')
            
        interviewer_reaction = conversation.generate_reaction_and_transition(
            question_asked=question.text,
            candidate_answer=answer.answer_text,
            evaluation_summary=f"Score: {eval_result.get('overall_score')}/100.",
            next_question=next_q_text,
            is_final=is_final,
        )
        
        # ── Update DB ────────────────────────────────────────────────
        answer.score = eval_result.get('overall_score', 0)
        answer.evaluation_json = eval_result
        answer.ai_feedback = eval_result.get('feedback', '')
        answer.confidence_score = eval_result.get('confidence', 0.0)
        answer.interviewer_reaction = interviewer_reaction
        answer.eval_status = 'evaluated'
        answer.save()
        
        if is_final:
            # Check if all answers in this session are finished evaluating
            # (eval_status must be 'evaluated' or 'failed' — not 'evaluating' or 'submitted')
            still_processing = session.answers.exclude(
                eval_status__in=['evaluated', 'failed']
            ).exclude(id=answer.id).exists()
            if not still_processing:
                from .views import _generate_session_feedback
                if session.status != 'pending_review':
                    session.status = 'completed'
                session.completed_at = timezone.now()
                session.save()
                _generate_session_feedback(session)
                
        logger.info(f"[CELERY] Evaluated answer {answer_id} for session {session.id}")
        return True

    except Exception as exc:
        logger.error(f"[CELERY] Task failed for answer {answer_id}: {exc}")
        try:
            answer = InterviewAnswer.objects.get(id=answer_id)
            session = answer.session
            is_final = answer.question_number >= len(session.questions)
            
            answer.eval_status = 'failed'
            answer.score = None
            answer.interviewer_reaction = (
                "I understand. Let's proceed to the next question."
                if not is_final else
                "Thank you. The interview is complete and pending manual review."
            )
            answer.save()
            
            session.status = 'pending_review'
            session.save()
            
            # Send email to coordinators
            from django.core.mail import send_mail
            from django.conf import settings
            from core.models import User
            
            coordinators = User.objects.filter(role='coordinator')
            recipient_list = [c.email for c in coordinators if c.email]
            
            if recipient_list:
                subject = f"ACTION REQUIRED: Interview Session {session.id} Pending Manual Review"
                message = (
                    f"The AI evaluation for Interview Session {session.id} (Student: {session.student.name}) "
                    f"has failed due to AI service unavailability.\n\n"
                    f"This session has been marked as 'Pending Manual Review'. Please log in to review the student's answers."
                )
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    recipient_list,
                    fail_silently=True,
                )
            
            if is_final:
                still_processing = session.answers.exclude(
                    eval_status__in=['evaluated', 'failed']
                ).exclude(id=answer.id).exists()
                if not still_processing:
                    from .views import _generate_session_feedback
                    session.completed_at = timezone.now()
                    session.save()
                    _generate_session_feedback(session)
        except Exception as inner_exc:
            logger.error(f"[CELERY] Failed to handle task failure cleanly: {inner_exc}")
        return False

