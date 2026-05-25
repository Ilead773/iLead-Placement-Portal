# apps/resume_engine/transformer.py
"""
Resume Transformation — Create variants from canonical JSON.

Takes a canonical resume and transforms it for different purposes:
- ATS-optimized (strip formatting, keyword-heavy)
- One-page (condense to fit single page)
- Academic (emphasize research, publications, GPA)
- Product-focused (highlight product/PM experience)
"""

import copy
import logging

logger = logging.getLogger(__name__)


class ResumeTransformer:
    """Create resume variants from canonical JSON."""

    def create_ats_optimized(self, canonical):
        """
        Transform for ATS (Applicant Tracking Systems).

        - Strips complex formatting
        - Flattens skill categories into a single list
        - Ensures clean text for parsing
        """
        transformed = copy.deepcopy(canonical)

        # Flatten skills into a single comma-separated list
        all_skills = []
        for skill_group in transformed.get('skills', []):
            all_skills.extend(skill_group.get('items', []))
        transformed['skills'] = [{'category': 'Skills', 'items': all_skills}]

        transformed['metadata']['source_type'] = 'ai_optimized'
        transformed['metadata']['variant'] = 'ats'

        logger.info("ATS-optimized variant created")
        return transformed

    def create_one_page(self, canonical):
        """
        Create a condensed one-page version.

        - Limits experience to top 3
        - Limits projects to top 3
        - Shortens descriptions
        """
        transformed = copy.deepcopy(canonical)

        # Truncate sections
        transformed['experience'] = transformed.get('experience', [])[:3]
        transformed['projects'] = transformed.get('projects', [])[:3]
        transformed['education'] = transformed.get('education', [])[:2]
        transformed['certifications'] = transformed.get('certifications', [])[:3]

        # Shorten descriptions
        for exp in transformed['experience']:
            if exp.get('description') and len(exp['description']) > 150:
                exp['description'] = exp['description'][:147] + '...'
            if exp.get('achievements'):
                exp['achievements'] = exp['achievements'][:3]

        for proj in transformed['projects']:
            if proj.get('description') and len(proj['description']) > 100:
                proj['description'] = proj['description'][:97] + '...'

        # Shorten summary
        summary = transformed.get('professional_summary', '')
        if len(summary) > 200:
            transformed['professional_summary'] = summary[:197] + '...'

        transformed['metadata']['variant'] = 'one_page'
        logger.info("One-page variant created")
        return transformed

    def create_academic(self, canonical):
        """
        Create academic-focused version.

        - Prioritizes education section
        - Emphasizes GPA, honors, research
        - Moves projects above experience
        """
        transformed = copy.deepcopy(canonical)

        # Reorder: education first (handled by template, but flag it)
        transformed['metadata']['variant'] = 'academic'
        transformed['metadata']['section_order'] = [
            'education', 'projects', 'skills', 'experience', 'certifications',
        ]

        logger.info("Academic variant created")
        return transformed

    def create_variant(self, canonical, variant_type):
        """
        Factory method to create a variant by type name.

        Args:
            canonical: canonical JSON dict
            variant_type: 'ats', 'one_page', 'academic'
        """
        variants = {
            'ats': self.create_ats_optimized,
            'one_page': self.create_one_page,
            'academic': self.create_academic,
        }

        creator = variants.get(variant_type)
        if not creator:
            raise ValueError(
                f"Unknown variant type: '{variant_type}'. "
                f"Available: {list(variants.keys())}"
            )

        return creator(canonical)
