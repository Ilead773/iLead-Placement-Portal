# apps/profiles/rules.py
"""
Layer 6: Rule-Based Profile Completion Validator

Configurable rules engine that determines:
- What profile sections are required
- Minimum counts for each section
- Whether a profile is complete enough for resume generation
- Completion score calculation

Rules are stored in a dict — easily loaded from DB or config file later.
"""

import logging

logger = logging.getLogger(__name__)


# ─── Default Completion Rules ────────────────────────────────────────────
# These can be overridden per institution via settings or DB config.
# NOTE: Academic metrics like CGPA and Attendance are intentionally excluded
# from the profile completion (fill %) rules since they are read-only college-synced data.

PROFILE_COMPLETION_RULES = {
    "personal": {
        "require_name": True,
        "require_email": True,
        "require_phone": True,
        "require_location": True,
        "weight": 0.20,  # 20% of completion score
    },
    "professional_summary": {
        "require": True,
        "min_length": 50,  # characters
        "weight": 0.10,
    },
    "experience": {
        "min_count": 1,
        "max_count": 10,
        "require_at_least_one": True,
        "weight": 0.15,
    },
    "projects": {
        "min_count": 1,
        "max_count": 15,
        "require_at_least_one": True,
        "weight": 0.15,
    },
    "skills": {
        "min_count": 3,
        "min_skills_per_category": 1,
        "max_skills": 50,
        "weight": 0.15,
    },
    "education": {
        "require_at_least_one": True,
        "max_count": 10,
        "weight": 0.15,
    },
    "certifications": {
        "min_count": 0,
        "weight": 0.05,
    },
    "links": {
        "require_linkedin": True,
        "require_github": True,
        "weight": 0.05,
    },
    "resume_generation": {
        "min_profile_completion": 0.50,  # 50% to allow resume generation
    },
}


# ─── Department-Specific Completion Rules ────────────────────────────────
DEPARTMENT_COMPLETION_RULES = {
    "Technology": {
        "personal": {
            "require_name": True,
            "require_email": True,
            "require_phone": True,
            "require_location": True,
            "weight": 0.15,
        },
        "professional_summary": {
            "require": True,
            "min_length": 50,
            "weight": 0.10,
        },
        "experience": {
            "min_count": 0,
            "require_at_least_one": False,
            "weight": 0.10,
        },
        "projects": {
            "min_count": 1,
            "require_at_least_one": True,
            "weight": 0.20,
        },
        "skills": {
            "min_count": 3,
            "weight": 0.15,
        },
        "education": {
            "require_at_least_one": True,
            "weight": 0.15,
        },
        "certifications": {
            "min_count": 0,
            "weight": 0.10,
        },
        "links": {
            "require_linkedin": True,
            "require_github": True,
            "require_portfolio": True,
            "weight": 0.05,
        },
        "resume_generation": {
            "min_profile_completion": 0.50,
        },
    },
    "Design & Media": {
        "personal": {
            "require_name": True,
            "require_email": True,
            "require_phone": True,
            "require_location": True,
            "weight": 0.15,
        },
        "professional_summary": {
            "require": True,
            "min_length": 50,
            "weight": 0.10,
        },
        "experience": {
            "min_count": 0,
            "require_at_least_one": False,
            "weight": 0.10,
        },
        "projects": {
            "min_count": 1,
            "require_at_least_one": True,
            "weight": 0.20,
        },
        "skills": {
            "min_count": 3,
            "weight": 0.15,
        },
        "education": {
            "require_at_least_one": True,
            "weight": 0.15,
        },
        "certifications": {
            "min_count": 0,
            "weight": 0.05,
        },
        "links": {
            "require_linkedin": True,
            "require_github": False,
            "require_portfolio": True,
            "weight": 0.10,
        },
        "resume_generation": {
            "min_profile_completion": 0.50,
        },
    },
    "Business & Management": {
        "personal": {
            "require_name": True,
            "require_email": True,
            "require_phone": True,
            "require_location": True,
            "weight": 0.20,
        },
        "professional_summary": {
            "require": True,
            "min_length": 50,
            "weight": 0.10,
        },
        "experience": {
            "min_count": 1,
            "require_at_least_one": True,
            "weight": 0.20,
        },
        "projects": {
            "min_count": 0,
            "require_at_least_one": False,
            "weight": 0.10,
        },
        "skills": {
            "min_count": 3,
            "weight": 0.15,
        },
        "education": {
            "require_at_least_one": True,
            "weight": 0.15,
        },
        "certifications": {
            "min_count": 0,
            "weight": 0.05,
        },
        "links": {
            "require_linkedin": True,
            "require_github": False,
            "require_portfolio": False,
            "weight": 0.05,
        },
        "resume_generation": {
            "min_profile_completion": 0.50,
        },
    },
    "Health Sciences": {
        "personal": {
            "require_name": True,
            "require_email": True,
            "require_phone": True,
            "require_location": True,
            "weight": 0.20,
        },
        "professional_summary": {
            "require": True,
            "min_length": 50,
            "weight": 0.10,
        },
        "experience": {
            "min_count": 1,
            "require_at_least_one": True,
            "weight": 0.20,
        },
        "projects": {
            "min_count": 0,
            "require_at_least_one": False,
            "weight": 0.10,
        },
        "skills": {
            "min_count": 3,
            "weight": 0.15,
        },
        "education": {
            "require_at_least_one": True,
            "weight": 0.15,
        },
        "certifications": {
            "min_count": 0,
            "weight": 0.05,
        },
        "links": {
            "require_linkedin": True,
            "require_github": False,
            "require_portfolio": False,
            "weight": 0.05,
        },
        "resume_generation": {
            "min_profile_completion": 0.50,
        },
    },
}


def get_department_by_course(course_str):
    if not course_str:
        return "Business & Management"  # default / fallback

    course_lower = course_str.lower()

    # 1. Technology
    if any(tech_term in course_lower for tech_term in ["bca", "computer", "data science", "cyber security", "it", "software"]):
        return "Technology"

    # 2. Design & Media
    if any(media_term in course_lower for media_term in ["media", "animation", "graphic", "multimedia", "film", "television", "interior design", "fashion", "gaming"]):
        return "Design & Media"

    # 3. Health Sciences
    if any(health_term in course_lower for health_term in ["optometry", "critical care", "cct", "laboratory", "bmlt", "hospital", "health"]):
        if "bba" in course_lower:
            return "Business & Management"
        return "Health Sciences"

    # 4. Business & Management
    return "Business & Management"


def get_relation_count(instance, relation_name):
    if hasattr(instance, '_prefetched_objects_cache') and relation_name in instance._prefetched_objects_cache:
        return len(getattr(instance, relation_name).all())
    # Support custom cached attribute names
    cached_attr = f'_cached_{relation_name}_count'
    if hasattr(instance, cached_attr):
        return getattr(instance, cached_attr)
    return getattr(instance, relation_name).count()


class ProfileCompletionValidator:
    """
    Rule-based profile validation engine.

    Configurable per institution/department. Returns:
    - is_valid (bool): meets all hard requirements
    - errors (list[str]): what's missing
    - completion (float): 0.0–1.0 completion score
    """

    def __init__(self, rules=None):
        self._default_rules = rules

    def get_rules_for_profile(self, profile):
        if self._default_rules:
            return self._default_rules
        course = getattr(profile.student, 'course', '')
        dept = get_department_by_course(course)
        return DEPARTMENT_COMPLETION_RULES.get(dept, PROFILE_COMPLETION_RULES)

    def validate_profile(self, profile):
        """
        Validate a StudentProfile against the configured rules.

        Args:
            profile: StudentProfile instance

        Returns:
            tuple: (is_valid, errors, completion_score)
        """
        rules = self.get_rules_for_profile(profile)
        errors = []
        section_scores = {}
        evaluated_sections = set()

        # ── Personal Section ─────────────────────────────────────
        personal_rules = rules['personal']
        personal_score = 0.0
        personal_checks = 0

        evaluated_sections.add('personal')

        if personal_rules['require_name']:
            personal_checks += 1
            if profile.student.name:
                personal_score += 1
            else:
                errors.append("Name is required.")

        if personal_rules['require_email']:
            personal_checks += 1
            if profile.student.email:
                personal_score += 1
            else:
                errors.append("Email is required.")

        if personal_rules['require_phone']:
            personal_checks += 1
            # Check both profile.phone and student.phone_number for safety
            if profile.phone or (profile.student and getattr(profile.student, 'phone_number', '')):
                personal_score += 1
            else:
                errors.append("Phone number is required.")

        if personal_rules['require_location']:
            personal_checks += 1
            if profile.location:
                personal_score += 1
            else:
                errors.append("Location is required.")

        section_scores['personal'] = (
            (personal_score / personal_checks) if personal_checks > 0 else 1.0
        )

        # ── Professional Summary ─────────────────────────────────
        summary_rules = rules['professional_summary']
        evaluated_sections.add('professional_summary')
        if profile.professional_summary and len(profile.professional_summary) >= summary_rules['min_length']:
            section_scores['professional_summary'] = 1.0
        elif profile.professional_summary:
            section_scores['professional_summary'] = 0.5
        else:
            section_scores['professional_summary'] = 0.0
            if summary_rules['require']:
                errors.append(
                    f"Professional summary required (min {summary_rules['min_length']} chars)."
                )

        # ── Skills ───────────────────────────────────────────────
        skill_rules = rules['skills']
        evaluated_sections.add('skills')
        skill_count = get_relation_count(profile, 'skills')
        if skill_count >= skill_rules['min_count']:
            section_scores['skills'] = min(1.0, skill_count / max(skill_rules['min_count'], 3))
        else:
            section_scores['skills'] = 0.0
            errors.append(
                f"Minimum {skill_rules['min_count']} skill(s) required "
                f"(have {skill_count})."
            )

        # ── Experience ───────────────────────────────────────────
        exp_rules = rules['experience']
        exp_count = get_relation_count(profile, 'experiences')
        if exp_rules['require_at_least_one']:
            evaluated_sections.add('experience')
            if exp_count == 0:
                section_scores['experience'] = 0.0
                errors.append("At least one experience entry is required.")
            else:
                section_scores['experience'] = 1.0
        else:
            # Optional section: evaluated only if filled
            if exp_count > 0:
                evaluated_sections.add('experience')
                section_scores['experience'] = 1.0

        # ── Projects ─────────────────────────────────────────────
        proj_rules = rules['projects']
        proj_count = get_relation_count(profile, 'projects')
        if proj_rules['require_at_least_one']:
            evaluated_sections.add('projects')
            if proj_count == 0:
                section_scores['projects'] = 0.0
                errors.append("At least one project is required.")
            else:
                section_scores['projects'] = 1.0
        else:
            # Optional section: evaluated only if filled
            if proj_count > 0:
                evaluated_sections.add('projects')
                section_scores['projects'] = 1.0

        # ── Education ────────────────────────────────────────────
        edu_rules = rules['education']
        evaluated_sections.add('education')
        edu_count = get_relation_count(profile, 'education_entries')
        if edu_rules['require_at_least_one'] and edu_count == 0:
            section_scores['education'] = 0.0
            errors.append("At least one education entry is required.")
        elif edu_count > 0:
            section_scores['education'] = 1.0
        else:
            section_scores['education'] = 0.0

        # ── Certifications ───────────────────────────────────────
        cert_rules = rules['certifications']
        cert_count = get_relation_count(profile, 'certifications')
        if cert_rules.get('require_at_least_one', False) or cert_rules.get('min_count', 0) > 0:
            evaluated_sections.add('certifications')
            min_c = cert_rules.get('min_count', 1)
            if cert_count >= min_c:
                section_scores['certifications'] = 1.0
            else:
                section_scores['certifications'] = 0.0
                errors.append(f"At least {min_c} certification(s) required.")
        else:
            # Optional section: evaluated only if filled
            if cert_count > 0:
                evaluated_sections.add('certifications')
                section_scores['certifications'] = 1.0

        # ── Links ────────────────────────────────────────────────
        link_rules = rules['links']
        link_score = 0.0
        link_checks = 0

        # Tech/Design/Business may require different links
        req_linkedin = link_rules.get('require_linkedin', True)
        req_github = link_rules.get('require_github', False)
        req_portfolio = link_rules.get('require_portfolio', False)

        # LinkedIn Check
        if req_linkedin:
            link_checks += 1
            if profile.linkedin:
                link_score += 1
            else:
                errors.append("LinkedIn URL is required.")
        elif profile.linkedin:
            link_checks += 1
            link_score += 1

        # GitHub Check
        if req_github:
            link_checks += 1
            if profile.github:
                link_score += 1
            else:
                errors.append("GitHub URL is required.")
        elif profile.github:
            link_checks += 1
            link_score += 1

        # Portfolio Check
        if req_portfolio:
            link_checks += 1
            if profile.portfolio:
                link_score += 1
            else:
                errors.append("Portfolio website URL is required.")
        elif profile.portfolio:
            link_checks += 1
            link_score += 1

        if link_checks > 0:
            evaluated_sections.add('links')
            section_scores['links'] = link_score / link_checks

        # ── Calculate weighted completion score (Dynamic Normalization) ──
        total_weight = sum(rules[sect].get('weight', 0.0) for sect in evaluated_sections)
        weighted_score = sum(section_scores.get(sect, 0.0) * rules[sect].get('weight', 0.0) for sect in evaluated_sections)

        if total_weight > 0:
            total_completion = weighted_score / total_weight
        else:
            total_completion = 1.0

        # Ensure score is 0.0–1.0
        total_completion = min(1.0, max(0.0, total_completion))

        is_valid = len(errors) == 0

        logger.debug(
            f"Profile validation: valid={is_valid}, "
            f"completion={total_completion:.2%}, errors={len(errors)}"
        )

        return (is_valid, errors, total_completion)

    def can_generate_resume(self, profile):
        """
        Check if profile meets minimum requirements for resume generation.

        Returns True if completion score >= configured minimum.
        """
        rules = self.get_rules_for_profile(profile)
        _, _, completion = self.validate_profile(profile)
        min_required = rules['resume_generation']['min_profile_completion']
        return completion >= min_required

    def get_suggestions(self, profile):
        """
        Get actionable suggestions to improve profile completion.

        Returns a list of suggestion strings.
        """
        rules = self.get_rules_for_profile(profile)
        _, errors, completion = self.validate_profile(profile)
        suggestions = []

        if not profile.professional_summary:
            suggestions.append(
                "Add a professional summary (2-3 sentences about your goals)."
            )
        if get_relation_count(profile, 'skills') < rules['skills'].get('min_count', 3):
            suggestions.append(f"Add at least {rules['skills'].get('min_count', 3)} skills to strengthen your profile.")

        if rules['projects'].get('require_at_least_one', False) and get_relation_count(profile, 'projects') == 0:
            suggestions.append("Add at least one project to showcase your work.")

        if rules['experience'].get('require_at_least_one', False) and get_relation_count(profile, 'experiences') == 0:
            suggestions.append("Add internship or work experience if applicable.")

        if not profile.linkedin and rules['links'].get('require_linkedin', False):
            suggestions.append("Add your LinkedIn profile URL.")

        if not profile.github and rules['links'].get('require_github', False):
            suggestions.append("Add your GitHub profile URL.")

        if not profile.portfolio and rules['links'].get('require_portfolio', False):
            suggestions.append("Add your Portfolio website URL.")

        return suggestions
