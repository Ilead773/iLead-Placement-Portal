# apps/resume_engine/__init__.py
"""
Resume Engine Domain Layer (Layer 15).

Core domain operations:
- Normalization (any format → canonical JSON)
- Rendering (canonical → HTML/PDF)
- Transformation (canonical → variants: ATS, one-page, academic)
"""

from .normalizer import ResumeNormalizer
from .renderer import ResumeRenderer
from .transformer import ResumeTransformer

__all__ = ['ResumeNormalizer', 'ResumeRenderer', 'ResumeTransformer']
