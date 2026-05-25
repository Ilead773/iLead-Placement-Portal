# apps/interviews/conversation.py
"""
AI Conversation Service — Separate from Evaluation.

Handles the HUMAN-LIKE interviewer persona:
  - Natural question delivery
  - Contextual reactions to previous answer
  - Follow-up question generation
  - Conversational transitions

This is intentionally SEPARATE from AIInterviewEvaluator.
Never mix scoring with conversation.
"""

import os
import json
import logging
from typing import Dict, List, Optional

from core.ai_client import ai_client_wrapper

logger = logging.getLogger(__name__)


def _get_client():
    return ai_client_wrapper.client



class AIConversationService:
    """
    Handles the interviewer's conversational layer.

    Does NOT score. Only handles:
      - Natural language reaction to previous answer
      - Deciding the next question
      - Adaptive follow-up generation
    """

    @property
    def MODEL(self) -> str:
        return ai_client_wrapper.model or 'llama-3.1-8b-instant'

    MAX_TOKENS = 300

    INTERVIEWER_SYSTEM = (
        "You are a professional, sharp, and highly observant job interviewer. "
        "Your goal is to react to the candidate's specific answer with unique, non-repetitive insights. "
        "Acknowledge the depth or specific keywords they used. "
        "Keep your responses concise but varied (1-3 sentences). "
        "Avoid starting every sentence with 'I appreciate' or 'That's a good point'. "
        "Be encouraging but professionally detached. Never reveal scores."
    )

    def generate_reaction_and_transition(
        self,
        question_asked: str,
        candidate_answer: str,
        evaluation_summary: str,
        next_question: Optional[str],
        is_final: bool = False,
    ) -> str:
        """
        Generate a natural conversational bridge between questions.

        Example output:
            "Good explanation! You mentioned abstraction — can you walk me through
             a real project where you used it? Now for the next question: [...]"
        """
        prompt = self._build_transition_prompt(
            question_asked, candidate_answer, evaluation_summary,
            next_question, is_final
        )

        try:
            client = _get_client()
            response = client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {"role": "system", "content": self.INTERVIEWER_SYSTEM},
                    {"role": "user",   "content": prompt},
                ],
                max_tokens=self.MAX_TOKENS,
                temperature=0.85,
            )
            return response.choices[0].message.content.strip()

        except Exception as exc:
            logger.warning(f"[CONVERSATION] AI reaction failed: {exc}")
            if is_final:
                return "Thank you for completing this interview! Your results are being compiled."
            return f"Thank you. Next question: {next_question or ''}"

    def generate_adaptive_follow_up(
        self,
        question: str,
        answer: str,
        weaknesses: List[str],
        score: int,
    ) -> str:
        """
        Generate an adaptive follow-up based on evaluation weaknesses.
        Used when score is below 60.
        """
        if score >= 60 or not weaknesses:
            return ""

        prompt = (
            f"The candidate answered this interview question:\n"
            f"Q: {question}\n"
            f"A: {answer}\n\n"
            f"The evaluator found these gaps: {', '.join(weaknesses[:3])}\n\n"
            f"Generate ONE short, natural clarifying follow-up question "
            f"that probes the specific gap. Return only the question text."
        )

        try:
            client = _get_client()
            response = client.chat.completions.create(
                model=self.MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=80,
                temperature=0.5,
            )
            return response.choices[0].message.content.strip()
        except Exception as exc:
            logger.warning(f"[CONVERSATION] Follow-up generation failed: {exc}")
            return ""

    # ─── Private ────────────────────────────────────────────────

    def _build_transition_prompt(
        self,
        q: str,
        a: str,
        eval_summary: str,
        next_q: Optional[str],
        is_final: bool,
    ) -> str:
        if is_final:
            return (
                f"The candidate just answered the final interview question.\n"
                f"Q: {q}\nA: {a[:200]}\n"
                f"Evaluation notes: {eval_summary}\n\n"
                f"Give a warm, professional closing remark (2 sentences max). "
                f"Tell them results will be available soon."
            )

        return (
            f"You asked: {q}\n"
            f"Candidate said: {a[:200]}\n"
            f"Evaluation notes (DO NOT reveal scores): {eval_summary}\n"
            f"Next question that will follow: {next_q}\n\n"
            f"Write a natural 1-2 sentence bridge: briefly react to the candidate's previous answer "
            f"(acknowledge something specific they said), and then provide a short transition phrase "
            f"like 'Let's move on to the next topic' or 'I'd like to ask you about...'. "
            f"DO NOT restate or read out the next question text yourself, as the UI will display it. "
            f"Do not use 'Great answer' or overly generic praise."
        )
