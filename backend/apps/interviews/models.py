# apps/interviews/models.py
"""
AI-Powered Mock Interview System — Data Models

Models:
- InterviewDomain: Top-level grouping (Digital Marketing, CS, etc.)
- InterviewType: Specific interview format within a domain
- Competency: Skills required for an interview type
- Question: Pre-curated questions with AI evaluation rubrics
- MockInterviewSession: Interview session state
- InterviewAnswer: Student answer with full AI evaluation_json
- InterviewFeedback: Aggregated session feedback
- SkillGapAnalysis: Lightweight gap analysis using profile data
- QuickRoadmap: Pre-built learning path from gap analysis
"""

import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


# ─── Interview Domain ────────────────────────────────────────────

class InterviewDomain(models.Model):
    """
    Top-level grouping for interviews.
    e.g. "Digital Marketing", "Computer Science", "Business Analytics"
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, default='')
    icon = models.CharField(max_length=10, default='📋')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interview_domains'
        ordering = ['name']

    def __str__(self):
        return self.name


class InterviewType(models.Model):
    """
    Type of interview within a domain.
    e.g. "Marketing Strategy", "Data Structures", "Case Study"
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    domain = models.ForeignKey(InterviewDomain, on_delete=models.CASCADE, related_name='interview_types')
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    duration_minutes = models.IntegerField(default=30)
    questions_per_session = models.IntegerField(default=5)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interview_types'
        ordering = ['domain', 'name']

    def __str__(self):
        return f"{self.domain.name} → {self.name}"


# ─── Competencies & Questions ────────────────────────────────────

class Competency(models.Model):
    """Skills/competencies required for an interview type."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    interview_type = models.ForeignKey(InterviewType, on_delete=models.CASCADE, related_name='competencies')

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    weight = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.1), MaxValueValidator(2.0)]
    )

    # Keywords that indicate mastery (for display/roadmap, NOT for scoring)
    mastery_keywords = models.JSONField(default=list)

    learning_resources = models.JSONField(default=list)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interview_competencies'
        unique_together = [('interview_type', 'name')]
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.interview_type.name})"


class Question(models.Model):
    """
    Pre-made interview questions with AI evaluation rubrics.
    evaluation_rubric replaces expected_keywords — used by AI evaluator.
    """
    QUESTION_TYPE_CHOICES = [
        ('short_answer', 'Short Answer'),
        ('essay', 'Essay'),
        ('coding', 'Coding Problem'),
        ('interview', 'Interview Question'),
        ('scenario', 'Scenario Handling'),
        ('behavioral', 'Behavioral / STAR'),
    ]

    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
        ('expert', 'Expert'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    competency = models.ForeignKey(Competency, on_delete=models.CASCADE, related_name='questions')

    # Question content
    text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE_CHOICES, default='interview')
    difficulty_level = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='intermediate')

    # Ideal answer (sent to AI evaluator as reference)
    ideal_answer = models.TextField(blank=True, default='')

    # AI Evaluation rubric — sent directly to GPT-4.1-mini
    # Replaces expected_keywords entirely.
    evaluation_rubric = models.JSONField(default=dict)
    # {
    #   "technical_accuracy": {
    #     "weight": 40,
    #     "criteria": [
    #       "Correctly distinguishes correlation from causation",
    #       "No logical contradictions"
    #     ]
    #   },
    #   "depth": {
    #     "weight": 25,
    #     "criteria": [
    #       "Includes a real-world business example",
    #       "Discusses implications or tradeoffs"
    #     ]
    #   },
    #   "communication": {
    #     "weight": 20,
    #     "criteria": [
    #       "Clear and structured response",
    #       "Appropriate vocabulary"
    #     ]
    #   },
    #   "clarity": {
    #     "weight": 15,
    #     "criteria": [
    #       "Concise, not rambling",
    #       "Main point is immediately clear"
    #     ]
    #   }
    # }

    # Difficulty metadata for adaptive interviewing
    difficulty_metadata = models.JSONField(default=dict)
    # {
    #   "expected_duration_seconds": 120,
    #   "follow_up_if_strong": "Explain where you have applied this professionally.",
    #   "follow_up_if_weak": "Can you give me a simple everyday example of this concept?"
    # }

    max_score = models.IntegerField(default=100)

    # Legacy field kept for migration compatibility, no longer used for scoring
    expected_keywords = models.JSONField(default=dict)

    source = models.CharField(max_length=100, blank=True, default='internal')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interview_questions'
        indexes = [
            models.Index(fields=['competency', 'difficulty_level']),
            models.Index(fields=['question_type']),
            models.Index(fields=['is_active', 'difficulty_level']),
        ]
        ordering = ['difficulty_level', 'created_at']

    def __str__(self):
        return f"[{self.difficulty_level}] {self.text[:80]}..."


# ─── Roadmap Templates ──────────────────────────────────────────

class RoadmapTemplate(models.Model):
    """Pre-built learning roadmap templates."""
    DURATION_CHOICES = [
        ('4_weeks', '4 Weeks'),
        ('8_weeks', '8 Weeks'),
        ('12_weeks', '12 Weeks'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    domain = models.ForeignKey(InterviewDomain, on_delete=models.CASCADE, related_name='roadmap_templates')

    name = models.CharField(max_length=200)
    duration = models.CharField(max_length=20, choices=DURATION_CHOICES, default='8_weeks')
    difficulty_level = models.CharField(max_length=20, choices=Question.DIFFICULTY_CHOICES, default='intermediate')

    milestones_structure = models.JSONField(default=list)
    total_hours = models.IntegerField(default=40)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'roadmap_templates'
        unique_together = [('domain', 'name')]
        ordering = ['domain', 'duration']

    def __str__(self):
        return f"{self.name} ({self.duration})"


# ─── Interview Sessions ─────────────────────────────────────────

class MockInterviewSession(models.Model):
    """Interview session with voice support and adaptive state."""
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('abandoned', 'Abandoned'),
        ('pending_review', 'Pending Manual Review'),
    ]


    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('core.Student', on_delete=models.CASCADE, related_name='interview_sessions')
    interview_type = models.ForeignKey(InterviewType, on_delete=models.PROTECT, related_name='sessions')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Questions selected for this session (denormalised for performance)
    questions = models.JSONField(default=list)
    # [{id, text, difficulty, type}, ...]

    # Voice mode
    use_voice = models.BooleanField(default=True)

    # Conversation context — stores interviewer memory
    conversation_context = models.JSONField(default=list)
    # [{"role": "interviewer"|"candidate", "content": "...", "question_number": N}, ...]

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mock_interview_sessions'
        indexes = [
            models.Index(fields=['student', 'status']),
            models.Index(fields=['student', '-created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"Session {str(self.id)[:8]} — {self.student.name} ({self.status})"


class InterviewAnswer(models.Model):
    """Student answer with full AI evaluation stored as JSON."""
    EVAL_STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('evaluating', 'AI Evaluating'),
        ('evaluated', 'AI Evaluated'),
        ('reviewed', 'Manually Reviewed'),
        ('failed', 'Evaluation Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(MockInterviewSession, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.PROTECT, related_name='answers')

    question_number = models.IntegerField()

    # Answer content
    answer_text = models.TextField()

    # Evaluation status
    eval_status = models.CharField(max_length=20, choices=EVAL_STATUS_CHOICES, default='submitted')

    # Single score (0–100) computed from evaluation_json
    score = models.FloatField(null=True, blank=True)

    # Full AI evaluation — dimension-based scoring
    evaluation_json = models.JSONField(default=dict)
    # {
    #   "overall_score": 78,
    #   "dimensions": {
    #     "technical_accuracy": {"score": 8, "max": 10, "feedback": "Strong understanding"},
    #     "depth":              {"score": 7, "max": 10, "feedback": "Needs more examples"},
    #     "communication":      {"score": 7, "max": 10, "feedback": "Clear delivery"},
    #     "clarity":            {"score": 6, "max": 10, "feedback": "Slightly verbose"}
    #   },
    #   "strengths": ["..."],
    #   "weaknesses": ["..."],
    #   "follow_up_recommendation": "...",
    #   "feedback": "Overall 2-3 sentence paragraph",
    #   "confidence": 0.92
    # }

    # The AI-generated feedback summary (extracted from evaluation_json for fast queries)
    ai_feedback = models.TextField(blank=True, default='')

    # Conversational reaction from AIConversationService
    interviewer_reaction = models.TextField(blank=True, default='')

    # Confidence score (how confident the AI is in its evaluation, 0–1)
    confidence_score = models.FloatField(default=0.0)

    time_taken_seconds = models.IntegerField(default=0)

    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interview_answers'
        indexes = [
            models.Index(fields=['session', 'question_number']),
        ]
        ordering = ['question_number']

    def __str__(self):
        return f"Answer #{self.question_number} — Score: {self.score}"


class InterviewFeedback(models.Model):
    """Aggregated session feedback built from InterviewAnswer.evaluation_json."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.OneToOneField(MockInterviewSession, on_delete=models.CASCADE, related_name='feedback')

    total_score = models.FloatField(null=True, blank=True)

    # Per-competency scores {competency_name: avg_score}
    competency_scores = models.JSONField(default=dict)

    # Per-dimension averages across all answers
    dimension_averages = models.JSONField(default=dict)
    # {
    #   "technical_accuracy": {"avg": 7.2, "max": 10},
    #   "depth":              {"avg": 6.1, "max": 10},
    #   ...
    # }

    strengths = models.JSONField(default=list)
    weaknesses = models.JSONField(default=list)

    feedback_summary = models.TextField(blank=True, default='')

    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interview_feedback'
        ordering = ['-generated_at']

    def __str__(self):
        return f"Feedback for {self.session} — {self.total_score:.0f}/100"


# ─── Gap Analysis & Roadmaps ────────────────────────────────────

class SkillGapAnalysis(models.Model):
    """Lightweight gap analysis using profile data, not AI."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('core.Student', on_delete=models.CASCADE, related_name='gap_analyses')
    domain = models.ForeignKey(InterviewDomain, on_delete=models.PROTECT, related_name='gap_analyses')

    current_skills = models.JSONField(default=dict)
    skill_gaps = models.JSONField(default=list)
    competency_gaps = models.JSONField(default=dict)

    recommended_roadmap_template = models.ForeignKey(
        RoadmapTemplate,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='recommended_for'
    )

    analysis_summary = models.TextField(blank=True, default='')
    ai_generated = models.BooleanField(default=False)

    analyzed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'skill_gap_analyses'
        indexes = [
            models.Index(fields=['student', '-analyzed_at']),
        ]
        ordering = ['-analyzed_at']

    def __str__(self):
        return f"Gap Analysis: {self.student.name} — {self.domain.name}"


class QuickRoadmap(models.Model):
    """Lightweight roadmap using pre-built templates."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('core.Student', on_delete=models.CASCADE, related_name='quick_roadmaps')
    gap_analysis = models.OneToOneField(SkillGapAnalysis, on_delete=models.CASCADE, related_name='roadmap')

    template = models.ForeignKey(RoadmapTemplate, on_delete=models.PROTECT, related_name='instances')

    milestones = models.JSONField(default=list)

    start_date = models.DateField(auto_now_add=True)
    target_completion_date = models.DateField()

    total_hours = models.IntegerField(default=40)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'quick_roadmaps'
        ordering = ['-created_at']

    def __str__(self):
        return f"Roadmap: {self.student.name} — {self.template.name}"
