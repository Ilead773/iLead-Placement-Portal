# apps/profiles/models.py
"""
Layer 6 + Layer 8: Student Resume Profile

Extends the core.Student model with resume-specific data:
- Professional summary, links, portfolio
- Completion scoring (rule-based, configurable)
- Soft-delete support
"""

import uuid

from django.db import models
from django.utils import timezone

from apps.common.models import SoftDeleteModel


class StudentProfile(SoftDeleteModel):
    """
    Resume-specific profile data for a student.

    Links to core.Student (one-to-one).
    Contains all the professional info needed to build a resume.

    The core.Student model already has: name, email, registration_number,
    course, stream, semester, cgpa, attendance.

    This model adds: professional_summary, phone, location, links,
    experience, and completion scoring.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.OneToOneField(
        'core.Student',
        on_delete=models.CASCADE,
        related_name='resume_profile',
    )

    # ─── Profile Picture ──────────────────────────────────────────
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        null=True,
        blank=True,
        help_text='Student profile photo.',
    )

    # ─── Contact & Location ──────────────────────────────────────
    phone = models.CharField(max_length=20, blank=True, default='')
    location = models.CharField(max_length=200, blank=True, default='')

    # ─── Professional Summary ────────────────────────────────────
    professional_summary = models.TextField(
        blank=True,
        default='',
        help_text='2-3 sentence professional summary for the resume header.',
    )

    # ─── Links ───────────────────────────────────────────────────
    linkedin = models.URLField(blank=True, default='')
    github = models.URLField(blank=True, default='')
    portfolio = models.URLField(blank=True, default='')

    # ─── Completion Tracking ─────────────────────────────────────
    completion_score = models.FloatField(
        default=0.0,
        help_text='Auto-calculated profile completion percentage (0.0 - 1.0).',
    )

    # ─── Timestamps ──────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_profiles'
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['completion_score']),
        ]
        verbose_name = 'Student Profile'
        verbose_name_plural = 'Student Profiles'

    def __str__(self):
        return f"Profile: {self.student.name} ({self.completion_score:.0%})"

    def recalculate_completion(self):
        """Recalculate and persist the completion score."""
        from .rules import ProfileCompletionValidator
        validator = ProfileCompletionValidator()
        _, _, score = validator.validate_profile(self)
        self.completion_score = score
        self.save(update_fields=['completion_score'])
        return score

    def can_generate_resume(self):
        """Check if profile is ready for resume generation."""
        from .rules import ProfileCompletionValidator
        validator = ProfileCompletionValidator()
        return validator.can_generate_resume(self)

    @property
    def improvement_suggestions(self):
        """Get actionable suggestions for this profile."""
        from .rules import ProfileCompletionValidator
        validator = ProfileCompletionValidator()
        return validator.get_suggestions(self)

    @property
    def completion_details(self):
        """Get section-by-section breakdown of completion."""
        from .rules import ProfileCompletionValidator
        validator = ProfileCompletionValidator()
        _, _, score = validator.validate_profile(self)
        # Simplified breakdown for frontend
        return {
            "score": score,
            "skills_count": self.skills.count(),
            "projects_count": self.projects.count(),
            "experience_count": self.experiences.count(),
        }


class Skill(SoftDeleteModel):
    """Student skill, grouped by category."""

    CATEGORY_CHOICES = [
        ('Technical', 'Technical'),
        ('Soft Skill', 'Soft Skill'),
        ('Language', 'Language'),
        ('Other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name='skills',
    )
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default='Technical',
    )
    name = models.CharField(max_length=100)
    proficiency = models.CharField(
        max_length=20,
        choices=[
            ('Beginner', 'Beginner'),
            ('Intermediate', 'Intermediate'),
            ('Advanced', 'Advanced'),
            ('Expert', 'Expert'),
        ],
        default='Intermediate',
    )

    class Meta:
        db_table = 'student_skills'
        ordering = ['category', 'name']
        unique_together = ('profile', 'category', 'name')

    def __str__(self):
        return f"{self.name} ({self.category})"


class Experience(SoftDeleteModel):
    """Work experience entry."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name='experiences',
    )
    company = models.CharField(max_length=200)
    position = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)
    description = models.TextField(blank=True, default='')
    achievements = models.JSONField(
        default=list,
        help_text='List of achievement bullet points.',
    )

    class Meta:
        db_table = 'student_experiences'
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.position} at {self.company}"


class Project(SoftDeleteModel):
    """Student project entry."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name='projects',
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    technologies = models.JSONField(
        default=list,
        help_text='List of technologies used.',
    )
    link = models.URLField(blank=True, default='')
    date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'student_projects'
        ordering = ['-date']

    def __str__(self):
        return self.title


class Education(SoftDeleteModel):
    """Education entry (beyond what core.Student already stores)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name='education_entries',
    )
    institution = models.CharField(max_length=200)
    degree = models.CharField(max_length=200)
    field = models.CharField(max_length=200, blank=True, default='')
    graduation_date = models.DateField(null=True, blank=True)
    gpa = models.FloatField(null=True, blank=True)
    honors = models.CharField(max_length=200, blank=True, default='')

    class Meta:
        db_table = 'student_education'
        ordering = ['-graduation_date']

    def __str__(self):
        return f"{self.degree} — {self.institution}"


class Certification(SoftDeleteModel):
    """Professional certification entry."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name='certifications',
    )
    name = models.CharField(max_length=200)
    issuer = models.CharField(max_length=200)
    date = models.DateField(null=True, blank=True)
    credential_url = models.URLField(blank=True, default='')

    class Meta:
        db_table = 'student_certifications'
        ordering = ['-date']

    def __str__(self):
        return f"{self.name} by {self.issuer}"


class Achievement(SoftDeleteModel):
    """Student award or achievement entry."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name='achievements',
    )
    title = models.CharField(max_length=200)
    issuer = models.CharField(max_length=200, blank=True, default='')
    date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'student_achievements'
        ordering = ['-date']

    def __str__(self):
        return self.title
