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
        "min_profile_completion": 0.80,  # 80% to allow resume generation
    },
}


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

    Configurable per institution. Returns:
    - is_valid (bool): meets all hard requirements
    - errors (list[str]): what's missing
    - completion (float): 0.0–1.0 completion score
    """

    def __init__(self, rules=None):
        self.rules = rules or PROFILE_COMPLETION_RULES

    def validate_profile(self, profile):
        """
        Validate a StudentProfile against the configured rules.

        Args:
            profile: StudentProfile instance

        Returns:
            tuple: (is_valid, errors, completion_score)
        """
        errors = []
        section_scores = {}

        # ── Personal Section ─────────────────────────────────────
        personal_rules = self.rules['personal']
        personal_score = 0.0
        personal_checks = 0

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
            if profile.phone:
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
        summary_rules = self.rules['professional_summary']
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
        skill_rules = self.rules['skills']
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
        exp_rules = self.rules['experience']
        exp_count = get_relation_count(profile, 'experiences')
        if exp_rules['require_at_least_one'] and exp_count == 0:
            section_scores['experience'] = 0.0
            errors.append("At least one experience entry is required.")
        elif exp_count > 0:
            section_scores['experience'] = 1.0
        else:
            section_scores['experience'] = 0.0  # Not required, no penalty

        # ── Projects ─────────────────────────────────────────────
        proj_rules = self.rules['projects']
        proj_count = get_relation_count(profile, 'projects')
        if proj_rules['require_at_least_one'] and proj_count == 0:
            section_scores['projects'] = 0.0
            errors.append("At least one project is required.")
        elif proj_count > 0:
            section_scores['projects'] = 1.0
        else:
            section_scores['projects'] = 0.0

        # ── Education ────────────────────────────────────────────
        edu_rules = self.rules['education']
        edu_count = get_relation_count(profile, 'education_entries')
        if edu_rules['require_at_least_one'] and edu_count == 0:
            section_scores['education'] = 0.0
            errors.append("At least one education entry is required.")
        elif edu_count > 0:
            section_scores['education'] = 1.0
        else:
            section_scores['education'] = 0.0

        # ── Certifications ───────────────────────────────────────
        cert_count = get_relation_count(profile, 'certifications')
        section_scores['certifications'] = 1.0 if cert_count > 0 else 0.0

        # ── Links ────────────────────────────────────────────────
        link_rules = self.rules['links']
        link_score = 0.0
        link_checks = 0

        if link_rules['require_linkedin']:
            link_checks += 1
            if profile.linkedin:
                link_score += 1
            else:
                errors.append("LinkedIn URL is required.")
        elif profile.linkedin:
            link_checks += 1
            link_score += 1

        if link_rules['require_github']:
            link_checks += 1
            if profile.github:
                link_score += 1
            else:
                errors.append("GitHub URL is required.")
        elif profile.github:
            link_checks += 1
            link_score += 1

        if profile.portfolio:
            link_checks += 1
            link_score += 1

        section_scores['links'] = (link_score / link_checks) if link_checks > 0 else 0.0

        # ── Calculate weighted completion score ──────────────────
        total_completion = 0.0
        for section, score in section_scores.items():
            weight = self.rules.get(section, {}).get('weight', 0.0)
            total_completion += score * weight

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
        _, _, completion = self.validate_profile(profile)
        min_required = self.rules['resume_generation']['min_profile_completion']
        return completion >= min_required

    def get_suggestions(self, profile):
        """
        Get actionable suggestions to improve profile completion.

        Returns a list of suggestion strings.
        """
        _, errors, completion = self.validate_profile(profile)
        suggestions = []

        if not profile.professional_summary:
            suggestions.append(
                "Add a professional summary (2-3 sentences about your goals)."
            )
        if get_relation_count(profile, 'skills') < 3:
            suggestions.append("Add at least 3 skills to strengthen your profile.")
        if get_relation_count(profile, 'projects') == 0:
            suggestions.append("Add at least one project to showcase your work.")
        if not profile.linkedin:
            suggestions.append("Add your LinkedIn profile URL.")
        if not profile.github:
            suggestions.append("Add your GitHub profile URL.")
        if get_relation_count(profile, 'experiences') == 0:
            suggestions.append(
                "Add internship or work experience if applicable."
            )

        return suggestions
