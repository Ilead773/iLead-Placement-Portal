# apps/interviews/ai_evaluator.py
"""
AI Interview Evaluation Engine — GPT-4.1-mini Based.

Replaces KeywordScoringEngine entirely.

Evaluates student answers against structured rubric dimensions:
  - technical_accuracy
  - depth
  - communication
  - clarity

Returns rich, structured JSON that gets stored in evaluation_json.
"""

import os
import json
import logging
from typing import Dict, Optional

from core.ai_client import ai_client_wrapper

logger = logging.getLogger(__name__)


def _get_client():
    return ai_client_wrapper.client



# ─── Core Evaluator ─────────────────────────────────────────────

class AIInterviewEvaluator:
    """
    Evaluate a student's interview answer using GPT-4.1-mini.

    Input:
        question_text   - the interview question string
        ideal_answer    - the ideal answer summary from DB
        evaluation_rubric - dict with dimension criteria
        answer_text     - student's answer

    Output (dict):
        {
          "overall_score": 78,
          "dimensions": {
            "technical_accuracy": {"score": 8, "max": 10, "feedback": "..."},
            "depth":              {"score": 7, "max": 10, "feedback": "..."},
            "communication":      {"score": 7, "max": 10, "feedback": "..."},
            "clarity":            {"score": 6, "max": 10, "feedback": "..."}
          },
          "strengths": ["Point 1", "Point 2"],
          "weaknesses": ["Gap 1", "Gap 2"],
          "follow_up_recommendation": "...",
          "feedback": "Overall 2-3 sentence summary",
          "confidence": 0.92
        }
    """

    @property
    def MODEL(self) -> str:
        return ai_client_wrapper.model or 'llama-3.1-8b-instant'

    MAX_TOKENS = 800

    def evaluate(
        self,
        question_text: str,
        ideal_answer: str,
        evaluation_rubric: Dict,
        answer_text: str,
    ) -> Dict:
        """
        Run AI evaluation. Returns structured dict.
        Raises exception on failure to handle in background task.
        """
        if not answer_text or not answer_text.strip():
            return self._zero_score_result("Empty answer submitted.")

        prompt = self._build_prompt(
            question_text, ideal_answer, evaluation_rubric, answer_text
        )

        client = _get_client()
        response = client.chat.completions.create(
            model=self.MODEL,
            messages=[
                {"role": "system", "content": self._system_prompt()},
                {"role": "user",   "content": prompt},
            ],
            max_tokens=self.MAX_TOKENS,
            temperature=0.5,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content
        result = json.loads(raw)
        return self._validate_and_normalize(result)

    # ─── Prompt Construction ─────────────────────────────────────

    def _system_prompt(self) -> str:
        return (
            "You are a supportive, warm, and professional job interviewer dedicated to helping candidates learn. "
            "Your goal is to build candidate confidence while giving constructive, accurate, and fair evaluations. "
            "You assess candidate answers on 2 dimensions: technical_accuracy, depth. "
            "SCORING RULES:\n"
            "- If the answer is completely silent, blank, or states 'I don't know', score exactly 0 or 1.\n"
            "- If the candidate makes an honest attempt and demonstrates basic understanding or mentions relevant technical keywords/terms, be highly encouraging: award at least 4 to 5 points to reward their effort.\n"
            "- If they demonstrate a solid understanding of the core concepts, award a good score of 6 to 7.\n"
            "- If they provide a clear, accurate, and comprehensive explanation, reward them with a score of 8 to 9.\n"
            "- Reserve 9.5 to 10 for exceptionally deep answers with trade-offs or professional examples.\n"
            "- BREVITY EXEMPTION: Do NOT penalize short answers if the content is correct. If they say the right things in a single sentence, grade them on correctness and accuracy, not length.\n"
            "Each dimension is scored 0–10. Be positive, fair, and constructive. Always return valid JSON only."
        )

    def _build_prompt(
        self,
        question: str,
        ideal: str,
        rubric: Dict,
        answer: str,
    ) -> str:
        rubric_text = json.dumps(rubric, indent=2)
        return f"""
INTERVIEW QUESTION:
{question}

IDEAL ANSWER SUMMARY:
{ideal}

EVALUATION RUBRIC (what to check per dimension):
{rubric_text}

CANDIDATE'S ANSWER:
{answer}

Evaluate the candidate's answer. Return ONLY a JSON object with this exact structure:
{{
  "overall_score": <0-100 integer>,
  "dimensions": {{
    "technical_accuracy": {{"score": <0-10>, "feedback": "<1 sentence>"}},
    "depth":              {{"score": <0-10>, "feedback": "<1 sentence>"}}
  }},
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<gap 1>", "<gap 2>"],
  "follow_up_recommendation": "<1 natural follow-up question the interviewer should ask>",
  "feedback": "<2-3 sentence overall feedback paragraph>",
  "what_candidate_answered": "<1–2 sentence neutral summary of what they said>",
  "ideal_answer_summary": "<2-3 sentences on what a strong answer looks like>",
  "score_explanation": "<2-3 sentences in plain English explaining exactly why they got this score — what they did right, what was missing, what would have pushed it higher>"
}}

Score fairly and constructively. If the candidate tried, reward them with encouraging marks. If completely silent, they must be penalized.
""".strip()

    def generate_final_summary(self, answers, total_score: float) -> str:
        """
        Generate a cohesive, encouraging performance summary for the entire session.
        """
        if not answers:
            return "No performance data available."

        performance_data = []
        for a in answers:
            performance_data.append({
                "question": a.question.text,
                "score": a.score,
                "feedback": a.ai_feedback
            })

        prompt = f"""
        Evaluate the overall performance of a candidate who completed a mock interview.
        OVERALL SCORE: {total_score:.1f}/100
        
        DETAILED PERFORMANCE BY QUESTION:
        {json.dumps(performance_data, indent=2)}
        
        You MUST write your evaluation using this exact structure and headings. Do NOT add other headings or text:
        
        **Performance Summary:**
        [Write a warm, highly encouraging, and professional 2-3 sentence summary of their overall attempt. Highlight their effort and positive potential.]
        
        **Single Biggest Strength:**
        [Identify their absolute best technical understanding, concept, or communication strength in 1-2 positive, highly encouraging sentences.]
        
        **Single Biggest Area for Improvement:**
        [Provide a highly constructive, positive suggestion for their main growth area in 1-2 encouraging sentences, framing it as an exciting learning opportunity.]
        """

        try:
            client = _get_client()
            response = client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {"role": "system", "content": "You are a supportive senior hiring manager providing final feedback to a candidate."},
                    {"role": "user",   "content": prompt},
                ],
                max_tokens=350,
                temperature=0.5,
            )
            return response.choices[0].message.content.strip()
        except Exception as exc:
            logger.error(f"[AI_SUMMARY] Failed: {exc}")
            return f"Interview complete with an overall score of {total_score:.1f}/100. Manual review recommended."

    # ─── Validation & Normalisation ──────────────────────────────

    def _validate_and_normalize(self, result: Dict) -> Dict:
        """Ensure required keys exist and scores are in range."""
        dims = result.get("dimensions", {})
        for dim in ["technical_accuracy", "depth"]:
            if dim not in dims:
                dims[dim] = {"score": 0, "feedback": "Not assessed."}
            dims[dim]["score"] = max(0, min(10, int(dims[dim].get("score", 0))))
            dims[dim]["max"] = 10

        # Recompute overall_score: 60% technical_accuracy, 40% depth
        tech_score = dims["technical_accuracy"]["score"]
        depth_score = dims["depth"]["score"]
        computed = round((tech_score * 6) + (depth_score * 4))
        result["overall_score"] = max(0, min(100, computed))
        result["dimensions"] = dims
        result.setdefault("strengths", [])
        result.setdefault("weaknesses", [])
        result.setdefault("follow_up_recommendation", "")
        result.setdefault("feedback", "")
        result.setdefault("what_candidate_answered", "")
        result.setdefault("ideal_answer_summary", "")
        result.setdefault("score_explanation", "")
        result["confidence"] = 0.92
        return result

    # ─── Fallbacks ───────────────────────────────────────────────

    def _zero_score_result(self, reason: str) -> Dict:
        return {
            "overall_score": 0,
            "dimensions": {
                d: {"score": 0, "max": 10, "feedback": reason}
                for d in ["technical_accuracy", "depth"]
            },
            "strengths": [],
            "weaknesses": [reason],
            "follow_up_recommendation": "",
            "feedback": reason,
            "what_candidate_answered": "Empty answer submitted.",
            "ideal_answer_summary": "Candidate did not provide a response.",
            "score_explanation": "Answer was empty or invalid.",
            "confidence": 1.0,
        }

