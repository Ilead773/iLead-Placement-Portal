import os
import json
import logging
from typing import List, Dict, Any, Optional
from core.ai_client import ai_client_wrapper

logger = logging.getLogger(__name__)

def _get_client():
    return ai_client_wrapper.client

class AICareerIntelligenceEnhancer:
    """
    AI Career Intelligence Enhancer — Groq or DeepSeek V3 Based.
    
    Adds friendly analogies, personalized roadmap explanations, and creative weekly milestones
    to the deterministic core output. Falls back to deterministic baselines if API fails.
    """
    
    @property
    def MODEL(self) -> str:
        return ai_client_wrapper.model or 'llama-3.1-8b-instant'
    
    def enhance_gaps(self, student_name: str, course_name: str, current_skills: List[Dict], gaps: List[Dict]) -> List[Dict]:
        """
        Enhance each gap with a friendly explanation and intuitive analogy.
        """
        client = _get_client()
        if not client or not gaps:
            # Safe baseline fallback
            for g in gaps:
                g["explanation"] = f"This is a {g['gapSize']}-level gap in {g['skill']} required for {course_name}."
                g["analogy"] = f"Learning {g['skill']} is a key stepping stone for your future career."
            return gaps

        gaps_to_enhance = [
            {
                "skill": g["skill"],
                "gapSize": g["gapSize"],
                "requiredLevel": g["requiredLevel"],
                "currentLevel": g["currentLevel"]
            } for g in gaps
        ]

        prompt = f"""
        Student: {student_name}
        Target Course: {course_name}
        Current Skills: {json.dumps(current_skills)}
        Gaps: {json.dumps(gaps_to_enhance)}

        For each gap, generate:
        1. A warm, encouraging, human-like explanation of why this gap exists and why it matters.
        2. A creative and intuitive real-world analogy to help the student visualize the concept.

        Return ONLY a JSON object with this exact structure:
        {{
          "enhanced_gaps": [
            {{
              "skill": "<skill_name>",
              "explanation": "<friendly, inspiring explanation>",
              "analogy": "<creative, visual analogy>"
            }}
          ]
        }}
        """

        try:
            response = client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {"role": "system", "content": "You are a friendly, highly encouraging academic advisor who excels at using analogies to explain tech/business concepts. Keep explanations under 3 sentences. Output valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=800,
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            raw = response.choices[0].message.content
            result = json.loads(raw)
            enhancements = {item["skill"]: item for item in result.get("enhanced_gaps", [])}
            
            for g in gaps:
                enh = enhancements.get(g["skill"])
                if enh:
                    g["explanation"] = enh["explanation"]
                    g["analogy"] = enh["analogy"]
                else:
                    g["explanation"] = f"This is a {g['gapSize']}-level gap in {g['skill']} required for {course_name}."
                    g["analogy"] = f"Learning {g['skill']} is a key stepping stone for your future career."
            return gaps

        except Exception as exc:
            logger.error(f"[AI_ENHANCER] Gaps enhancement failed: {exc}")
            for g in gaps:
                g["explanation"] = f"This is a {g['gapSize']}-level gap in {g['skill']} required for {course_name}."
                g["analogy"] = f"Learning {g['skill']} is a key stepping stone for your future career."
            return gaps

    def enhance_roadmap_phases(self, student_name: str, course_name: str, current_skills: List[Dict], phases: List[Dict]) -> List[Dict]:
        """
        Enhance roadmap phases with personalized motivational descriptions, timelines, and weekly milestones.
        """
        client = _get_client()
        if not client or not phases:
            return phases

        # Make a separate prompt call or compact JSON prompt to keep tokens reasonable
        for idx, phase in enumerate(phases):
            skills_payload = [
                {
                    "skillName": s["skillName"],
                    "currentLevel": s["currentLevel"],
                    "targetLevel": s["targetLevel"],
                    "weeks": phase["duration_weeks"]
                } for s in phase["skills"]
            ]
            
            prompt = f"""
            Student: {student_name}
            Target Course: {course_name}
            Current Skills: {json.dumps(current_skills)}
            Phase Number: {idx + 1}
            Phase Name: {phase['name']}
            Goal: {phase['goal']}
            Duration: {phase['duration_weeks']} weeks
            Skills to Learn: {json.dumps(skills_payload)}

            Generate a motivating, highly personalized description for this phase.
            Explain why these specific skills matter now for the student's journey.
            For each skill in this phase, create {phase['duration_weeks']} week-by-week engaging milestones with a practical 'proof of progress' trigger.

            Return ONLY a JSON object with this exact structure:
            {{
              "phaseDescription": "<inspiring description specifically explaining why this phase matches their background>",
              "whyNow": "<explanation of why this phase is scheduled first/next>",
              "timelineMotivation": "<encouraging words about the duration>",
              "skills": [
                {{
                  "skillName": "<skill_name>",
                  "milestones": [
                    {{
                      "week": 1,
                      "milestone": "<creative name + emoji>",
                      "description": "<what to learn>",
                      "proof": "<practical proof of progress trigger>"
                    }}
                  ]
                }}
              ]
            }}
            """

            try:
                response = client.chat.completions.create(
                    model=self.MODEL,
                    messages=[
                        {"role": "system", "content": "You are an inspiring mentor. You create exciting, non-generic descriptions and week-by-week learning milestones with visual proof. Keep descriptions focused and avoid clichés. Output valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=1000,
                    temperature=0.7,
                    response_format={"type": "json_object"}
                )
                raw = response.choices[0].message.content
                result = json.loads(raw)
                
                phase["personalizedDescription"] = result.get("phaseDescription", phase["goal"])
                phase["whyNow"] = result.get("whyNow", "Builds key prerequisite foundations.")
                phase["timelineMotivation"] = result.get("timelineMotivation", f"Spend {phase['duration_weeks']} weeks focused on these milestones.")
                
                # Update milestones for each skill
                skills_map = {item["skillName"]: item["milestones"] for item in result.get("skills", [])}
                for s in phase["skills"]:
                    ms = skills_map.get(s["skillName"])
                    if ms:
                        s["milestones"] = ms
                        
            except Exception as exc:
                logger.error(f"[AI_ENHANCER] Phase {idx+1} enhancement failed: {exc}")
                # Defaults
                phase["personalizedDescription"] = phase["goal"]
                phase["whyNow"] = "Builds key prerequisite foundations."
                phase["timelineMotivation"] = f"Spend {phase['duration_weeks']} weeks focused on these milestones."

        return phases

    def generate_motivational_message(self, student_name: str, match_percentage: float, total_gaps: int, gaps: List[Dict]) -> Dict:
        """
        Generate a highly personalized, honest, and motivating message for the dashboard.
        """
        client = _get_client()
        default_res = {
            "message": f"Welcome back, {student_name}! You have completed a solid match score of {match_percentage}%. Focus on your key gaps to progress further.",
            "nextStep": "Start with your first learning milestone today.",
            "progressTip": "Take it one phase at a time. Consistency beats intensity."
        }
        
        if not client:
            return default_res

        prompt = f"""
        Student: {student_name}
        Match Score: {match_percentage}%
        Total Gaps: {total_gaps}
        Gaps List: {[g['skill'] for g in gaps[:3]]}

        Write a personalized, encouraging but highly honest motivational message for their dashboard.
        Do not use clichés. Acknowledge what they already know. Provide a clear next step and a progress tip.

        Return ONLY a JSON object with this exact structure:
        {{
          "message": "<honest, personal motivation message>",
          "nextStep": "<clear next action>",
          "progressTip": "<actionable study habit tip>"
        }}
        """

        try:
            response = client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {"role": "system", "content": "You are a professional executive career coach. You give honest, constructive, and highly motivating advice. Do not use generic quotes. Output valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=350,
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            raw = response.choices[0].message.content
            return json.loads(raw)
        except Exception as exc:
            logger.error(f"[AI_ENHANCER] Motivation generation failed: {exc}")
            return default_res
