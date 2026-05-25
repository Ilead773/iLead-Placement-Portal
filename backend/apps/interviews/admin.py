# apps/interviews/admin.py
from django.contrib import admin
from .models import (
    InterviewDomain, InterviewType, Competency, Question,
    RoadmapTemplate, MockInterviewSession, InterviewAnswer,
    InterviewFeedback, SkillGapAnalysis, QuickRoadmap,
)


@admin.register(InterviewDomain)
class InterviewDomainAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(InterviewType)
class InterviewTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'domain', 'code', 'duration_minutes', 'questions_per_session', 'is_active']
    list_filter = ['domain', 'is_active']
    search_fields = ['name', 'code']


@admin.register(Competency)
class CompetencyAdmin(admin.ModelAdmin):
    list_display = ['name', 'interview_type', 'weight', 'is_active']
    list_filter = ['interview_type__domain', 'is_active']
    search_fields = ['name']


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['text_preview', 'competency', 'question_type', 'difficulty_level', 'is_active']
    list_filter = ['difficulty_level', 'question_type', 'competency__interview_type__domain', 'is_active']
    search_fields = ['text']

    def text_preview(self, obj):
        return obj.text[:80] + '...' if len(obj.text) > 80 else obj.text
    text_preview.short_description = 'Question'


@admin.register(RoadmapTemplate)
class RoadmapTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'domain', 'duration', 'difficulty_level', 'total_hours', 'is_active']
    list_filter = ['domain', 'duration', 'is_active']


@admin.register(MockInterviewSession)
class MockInterviewSessionAdmin(admin.ModelAdmin):
    list_display = ['id_short', 'student', 'interview_type', 'status', 'use_voice', 'created_at']
    list_filter = ['status', 'use_voice', 'interview_type__domain']
    search_fields = ['student__name']
    readonly_fields = ['questions']

    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = 'ID'


@admin.register(InterviewAnswer)
class InterviewAnswerAdmin(admin.ModelAdmin):
    list_display = ['session_short', 'question_number', 'score', 'eval_status', 'submitted_at']
    list_filter = ['eval_status']

    def session_short(self, obj):
        return str(obj.session.id)[:8]
    session_short.short_description = 'Session'


@admin.register(InterviewFeedback)
class InterviewFeedbackAdmin(admin.ModelAdmin):
    list_display = ['session_short', 'total_score', 'generated_at']

    def session_short(self, obj):
        return str(obj.session.id)[:8]
    session_short.short_description = 'Session'


@admin.register(SkillGapAnalysis)
class SkillGapAnalysisAdmin(admin.ModelAdmin):
    list_display = ['student', 'domain', 'ai_generated', 'analyzed_at']
    list_filter = ['domain', 'ai_generated']


@admin.register(QuickRoadmap)
class QuickRoadmapAdmin(admin.ModelAdmin):
    list_display = ['student', 'template', 'start_date', 'target_completion_date', 'is_active']
    list_filter = ['is_active']
