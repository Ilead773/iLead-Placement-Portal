# apps/interviews/serializers.py
"""
Serializers for the Mock Interview System.
"""

from rest_framework import serializers
from .models import (
    InterviewDomain, InterviewType, Competency, Question,
    RoadmapTemplate, MockInterviewSession, InterviewAnswer,
    InterviewFeedback, SkillGapAnalysis, QuickRoadmap
)


class InterviewDomainSerializer(serializers.ModelSerializer):
    interview_type_count = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = InterviewDomain
        fields = [
            'id', 'name', 'description', 'icon', 'is_active',
            'interview_type_count', 'question_count'
        ]

    def get_interview_type_count(self, obj):
        return obj.interview_types.filter(is_active=True).count()

    def get_question_count(self, obj):
        count = 0
        for it in obj.interview_types.filter(is_active=True):
            for comp in it.competencies.filter(is_active=True):
                count += comp.questions.filter(is_active=True).count()
        return count


class InterviewTypeSerializer(serializers.ModelSerializer):
    domain_name = serializers.CharField(source='domain.name', read_only=True)
    competency_count = serializers.SerializerMethodField()

    class Meta:
        model = InterviewType
        fields = [
            'id', 'code', 'name', 'description', 'domain', 'domain_name',
            'duration_minutes', 'questions_per_session', 'is_active',
            'competency_count'
        ]

    def get_competency_count(self, obj):
        return obj.competencies.filter(is_active=True).count()


class CompetencySerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Competency
        fields = [
            'id', 'interview_type', 'name', 'description', 'weight',
            'mastery_keywords', 'learning_resources', 'question_count'
        ]

    def get_question_count(self, obj):
        return obj.questions.filter(is_active=True).count()


class QuestionSerializer(serializers.ModelSerializer):
    competency_name = serializers.CharField(source='competency.name', read_only=True)

    class Meta:
        model = Question
        fields = [
            'id', 'competency', 'competency_name', 'text',
            'question_type', 'difficulty_level', 'max_score',
            'ideal_answer', 'evaluation_rubric', 'difficulty_metadata',
            'source', 'is_active'
        ]


class QuestionBriefSerializer(serializers.ModelSerializer):
    """Lightweight serializer for interview flow — no rubric/answers exposed."""
    class Meta:
        model = Question
        fields = ['id', 'text', 'question_type', 'difficulty_level']


# ─── Interview Session Serializers ───────────────────────────────

class StartInterviewSerializer(serializers.Serializer):
    interview_type_id = serializers.UUIDField()
    use_voice = serializers.BooleanField(default=True)
    num_questions = serializers.IntegerField(required=False, min_value=1, max_value=20)



class SubmitAnswerSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    question_number = serializers.IntegerField(min_value=1)
    answer_text = serializers.CharField(allow_blank=True)
    time_taken_seconds = serializers.IntegerField(default=0, min_value=0)


class InterviewAnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.text', read_only=True)

    class Meta:
        model = InterviewAnswer
        fields = [
            'id', 'question', 'question_text', 'question_number',
            'answer_text', 'eval_status', 'score',
            'evaluation_json', 'ai_feedback', 'interviewer_reaction',
            'confidence_score', 'time_taken_seconds', 'submitted_at'
        ]


class InterviewFeedbackSerializer(serializers.ModelSerializer):
    answers = InterviewAnswerSerializer(source='session.answers', many=True, read_only=True)

    class Meta:
        model = InterviewFeedback
        fields = [
            'id', 'total_score', 'competency_scores', 'dimension_averages',
            'strengths', 'weaknesses', 'feedback_summary',
            'generated_at', 'answers'
        ]



class MockInterviewSessionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    interview_type_name = serializers.CharField(source='interview_type.name', read_only=True)
    domain_name = serializers.CharField(source='interview_type.domain.name', read_only=True)
    answers = InterviewAnswerSerializer(many=True, read_only=True)
    feedback = InterviewFeedbackSerializer(read_only=True)
    answer_count = serializers.SerializerMethodField()

    class Meta:
        model = MockInterviewSession
        fields = [
            'id', 'student', 'student_name', 'interview_type',
            'interview_type_name', 'domain_name',
            'status', 'started_at', 'completed_at',
            'questions', 'use_voice', 'created_at',
            'answers', 'feedback', 'answer_count'
        ]

    def get_answer_count(self, obj):
        return obj.answers.count()


class SessionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for session lists."""
    interview_type_name = serializers.CharField(source='interview_type.name', read_only=True)
    domain_name = serializers.CharField(source='interview_type.domain.name', read_only=True)
    total_score = serializers.SerializerMethodField()

    class Meta:
        model = MockInterviewSession
        fields = [
            'id', 'interview_type_name', 'domain_name',
            'status', 'started_at', 'completed_at',
            'use_voice', 'created_at', 'total_score'
        ]

    def get_total_score(self, obj):
        try:
            return obj.feedback.total_score
        except (InterviewFeedback.DoesNotExist, AttributeError):
            return None


# ─── Gap Analysis & Roadmap Serializers ──────────────────────────

class StartGapAnalysisSerializer(serializers.Serializer):
    domain_id = serializers.UUIDField()


class SkillGapAnalysisSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    domain_name = serializers.CharField(source='domain.name', read_only=True)
    recommended_template_name = serializers.SerializerMethodField()

    class Meta:
        model = SkillGapAnalysis
        fields = [
            'id', 'student', 'student_name', 'domain', 'domain_name',
            'current_skills', 'skill_gaps', 'competency_gaps',
            'recommended_roadmap_template', 'recommended_template_name',
            'analysis_summary', 'ai_generated', 'analyzed_at'
        ]

    def get_recommended_template_name(self, obj):
        if obj.recommended_roadmap_template:
            return obj.recommended_roadmap_template.name
        return None


class QuickRoadmapSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)

    class Meta:
        model = QuickRoadmap
        fields = [
            'id', 'student', 'student_name', 'gap_analysis',
            'template', 'template_name', 'milestones',
            'start_date', 'target_completion_date',
            'total_hours', 'is_active', 'created_at'
        ]


class RoadmapTemplateSerializer(serializers.ModelSerializer):
    domain_name = serializers.CharField(source='domain.name', read_only=True)

    class Meta:
        model = RoadmapTemplate
        fields = [
            'id', 'domain', 'domain_name', 'name', 'duration',
            'difficulty_level', 'milestones_structure',
            'total_hours', 'description', 'is_active'
        ]
