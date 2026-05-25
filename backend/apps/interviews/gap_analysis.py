# apps/interviews/gap_analysis.py
"""
Lightweight Gap Analysis Service — Zero API Cost.

Analyzes student skill gaps using keyword matching:
- Extracts skills from student profile
- Compares against interview domain requirements
- Calculates gap scores and priorities
- Selects best roadmap template
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List

from .models import (
    InterviewDomain, Competency, RoadmapTemplate,
    SkillGapAnalysis, QuickRoadmap
)

logger = logging.getLogger(__name__)


class LightweightGapAnalysisService:
    """Analyze gaps using keyword matching, not AI."""

    def analyze(self, student, domain: InterviewDomain) -> SkillGapAnalysis:
        """
        Zero-API-call gap analysis.
        """
        logger.info(f"[GAP-ANALYSIS] Analyzing {student.name} for {domain.name}")

        # Extract student skills from profile
        current_skills = self._extract_student_skills(student)
        logger.info(f"Found {len(current_skills)} current skills")

        # Extract domain requirements
        required_skills = self._extract_domain_requirements(domain)
        logger.info(f"Found {len(required_skills)} required skills")

        # Calculate gaps
        skill_gaps = self._calculate_gaps(current_skills, required_skills)

        # Calculate competency gaps
        competency_gaps = self._calculate_competency_gaps(student, domain)

        # Select best roadmap template
        best_template = self._select_roadmap_template(skill_gaps, domain)

        # Generate summary
        summary = self._generate_summary(skill_gaps, competency_gaps)

        gap_analysis = SkillGapAnalysis.objects.create(
            student=student,
            domain=domain,
            current_skills=current_skills,
            skill_gaps=skill_gaps,
            competency_gaps=competency_gaps,
            recommended_roadmap_template=best_template,
            analysis_summary=summary,
            ai_generated=False,
        )

        logger.info(f"Created gap analysis {gap_analysis.id}")
        return gap_analysis

    def create_roadmap(self, gap_analysis: SkillGapAnalysis) -> QuickRoadmap:
        """Create roadmap by selecting template + minimal customization."""
        logger.info(f"[ROADMAP] Creating roadmap for {gap_analysis.student.name}")

        template = gap_analysis.recommended_roadmap_template
        if not template:
            template = RoadmapTemplate.objects.filter(
                domain=gap_analysis.domain,
                is_active=True
            ).first()

        if not template:
            logger.warning("No roadmap template found, creating a minimal one.")
            return None

        milestones = list(template.milestones_structure)

        weeks = int(template.duration.split('_')[0])
        start_date = datetime.now().date()
        target_date = start_date + timedelta(weeks=weeks)

        roadmap = QuickRoadmap.objects.create(
            student=gap_analysis.student,
            gap_analysis=gap_analysis,
            template=template,
            milestones=milestones,
            target_completion_date=target_date,
            total_hours=template.total_hours,
        )

        logger.info(f"[ROADMAP] Created roadmap {roadmap.id}")
        return roadmap

    # ─── Private Methods ─────────────────────────────────────────

    def _extract_student_skills(self, student) -> Dict:
        """Extract skills from student profile."""
        skills = {}

        # From resume profile skills
        if hasattr(student, 'resume_profile'):
            profile = student.resume_profile
            for skill in profile.skills.all():
                skills[skill.name.lower()] = {
                    'level': skill.proficiency.lower() if skill.proficiency else 'intermediate',
                    'source': 'profile',
                }

            # From projects
            for project in profile.projects.all():
                for tech in (project.technologies or []):
                    tech_lower = tech.lower()
                    if tech_lower not in skills:
                        skills[tech_lower] = {
                            'level': 'intermediate',
                            'source': 'project',
                        }

            # From experience
            for exp in profile.experiences.all():
                position = exp.position.lower()
                if position not in skills:
                    skills[position] = {
                        'level': 'advanced',
                        'source': 'experience',
                    }

        # From student course field
        if student.course:
            from apps.scraped_jobs.course_config import normalize_course_name
            norm_c = normalize_course_name(student.course)
            skills[norm_c.lower()] = {
                'level': 'intermediate',
                'source': 'enrollment',
            }

        return skills

    def _extract_domain_requirements(self, domain: InterviewDomain) -> Dict:
        """Extract domain skill requirements from competencies."""
        required = {}

        for interview_type in domain.interview_types.filter(is_active=True):
            for competency in interview_type.competencies.filter(is_active=True):
                comp_name = competency.name.lower()
                required[comp_name] = {
                    'level': 'advanced',
                    'importance': competency.weight,
                    'domain': domain.name,
                }

                for kw in (competency.mastery_keywords or []):
                    kw_lower = kw.lower()
                    if kw_lower not in required:
                        required[kw_lower] = {
                            'level': 'intermediate',
                            'importance': competency.weight * 0.7,
                            'domain': domain.name,
                        }

        return required

    def _calculate_gaps(self, current: Dict, required: Dict) -> List[Dict]:
        """Calculate gap between current and required skills."""
        gaps = []
        level_values = {'beginner': 1, 'intermediate': 2, 'advanced': 3, 'expert': 4}

        for skill, req_info in required.items():
            if skill in current:
                current_level = current[skill].get('level', 'beginner')
                current_val = level_values.get(current_level, 1)
                required_val = level_values.get(req_info['level'], 3)
                gap = max(0, (required_val - current_val) / 3.0)
            else:
                gap = 1.0
                current_level = 'not_started'

            importance = req_info.get('importance', 1.0)
            priority_score = gap * importance

            if priority_score > 0.8:
                priority = 'critical'
            elif priority_score > 0.6:
                priority = 'high'
            elif priority_score > 0.3:
                priority = 'medium'
            else:
                priority = 'low'

            gaps.append({
                'skill': skill,
                'current_level': current_level,
                'required_level': req_info['level'],
                'gap_score': round(gap, 2),
                'importance': round(importance, 2),
                'priority': priority,
                'domain': req_info.get('domain', 'General'),
            })

        priority_map = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}
        gaps.sort(key=lambda x: priority_map.get(x['priority'], 0), reverse=True)

        return gaps[:20]

    def _calculate_competency_gaps(self, student, domain: InterviewDomain) -> Dict:
        """Calculate gap score per competency."""
        competency_gaps = {}
        skills = self._extract_student_skills(student)
        student_kws = set(s.lower() for s in skills.keys())

        for interview_type in domain.interview_types.filter(is_active=True):
            for competency in interview_type.competencies.filter(is_active=True):
                mastery_kws = set(kw.lower() for kw in (competency.mastery_keywords or []))
                matched = len(mastery_kws & student_kws)
                gap_score = max(0, 1.0 - (matched / max(len(mastery_kws), 1)))
                competency_gaps[competency.name] = round(gap_score, 2)

        return competency_gaps

    def _select_roadmap_template(self, gaps: List[Dict], domain: InterviewDomain):
        """Select best roadmap template based on gap severity."""
        if not gaps:
            avg_gap = 0.5
        else:
            avg_gap = sum(g['gap_score'] for g in gaps) / len(gaps)

        if avg_gap > 0.7:
            duration = '12_weeks'
        elif avg_gap > 0.4:
            duration = '8_weeks'
        else:
            duration = '4_weeks'

        template = RoadmapTemplate.objects.filter(
            domain=domain,
            duration=duration,
            is_active=True
        ).first()

        # Fallback to any available template
        if not template:
            template = RoadmapTemplate.objects.filter(
                domain=domain,
                is_active=True
            ).first()

        return template

    def _generate_summary(self, skill_gaps: List, competency_gaps: Dict) -> str:
        """Generate a human-readable analysis summary."""
        critical = [g for g in skill_gaps if g['priority'] == 'critical']
        high = [g for g in skill_gaps if g['priority'] == 'high']
        low = [g for g in skill_gaps if g['priority'] == 'low']

        parts = [f"Analysis identified {len(skill_gaps)} skill areas to review."]

        if critical:
            parts.append(
                f"Critical gaps ({len(critical)}): "
                + ", ".join(g['skill'] for g in critical[:5]) + "."
            )

        if high:
            parts.append(
                f"High priority ({len(high)}): "
                + ", ".join(g['skill'] for g in high[:5]) + "."
            )

        if low:
            parts.append(f"{len(low)} skills are at an acceptable level.")

        return " ".join(parts)
