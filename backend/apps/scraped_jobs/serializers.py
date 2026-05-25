# apps/scraped_jobs/serializers.py

from rest_framework import serializers
from .models import ScrapedJob, ScrapingRun, StudentSavedJob


class ScrapedJobSerializer(serializers.ModelSerializer):
    is_saved = serializers.SerializerMethodField()
    days_old = serializers.SerializerMethodField()
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    job_type_display = serializers.CharField(source='get_job_type_display', read_only=True)
    course_tags = serializers.SerializerMethodField()

    class Meta:
        model = ScrapedJob
        fields = [
            'id', 'title', 'company_name', 'company_logo_url',
            'location', 'is_remote', 'job_type', 'job_type_display',
            'is_internship', 'description_short', 'apply_url',
            'salary_display', 'required_skills', 'experience_required',
            'course_tags', 'posted_at', 'scraped_at', 'expires_at',
            'source', 'source_display', 'quality_score',
            'is_saved', 'days_old',
            'is_approved', 'approved_at',
        ]

    def get_is_saved(self, obj):
        saved_ids = self.context.get('saved_ids', set())
        return obj.id in saved_ids

    def get_days_old(self, obj):
        from django.utils import timezone
        if not obj.scraped_at:
            return ''
        hours = int((timezone.now() - obj.scraped_at).total_seconds() / 3600)
        if hours < 1:
            return 'Just now'
        if hours < 24:
            return f'{hours}h ago'
        return f'{hours // 24}d ago'

    def get_course_tags(self, obj):
        return list(obj.course_mappings.values_list('course_name', flat=True))


class ScrapedJobDetailSerializer(ScrapedJobSerializer):
    class Meta(ScrapedJobSerializer.Meta):
        fields = ScrapedJobSerializer.Meta.fields + ['description']


class AdminEditJobSerializer(serializers.ModelSerializer):
    """Write-capable serializer for admin edits on scraped jobs."""
    class Meta:
        model = ScrapedJob
        fields = [
            'title', 'company_name', 'company_logo_url',
            'location', 'is_remote', 'job_type', 'is_internship',
            'description_short', 'description', 'apply_url',
            'salary_min', 'salary_max', 'salary_currency', 'salary_display',
            'required_skills', 'experience_required',
        ]


class ScrapingRunSerializer(serializers.ModelSerializer):
    duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model = ScrapingRun
        fields = [
            'id', 'started_at', 'completed_at', 'status',
            'total_fetched', 'total_saved', 'total_duplicates_skipped',
            'total_expired_deactivated', 'courses_completed', 'courses_failed',
            'per_course_stats', 'api_calls_made', 'duration_minutes',
        ]

    def get_duration_minutes(self, obj):
        if obj.started_at and obj.completed_at:
            return round((obj.completed_at - obj.started_at).total_seconds() / 60, 1)
        return None


class StudentSavedJobSerializer(serializers.ModelSerializer):
    job = ScrapedJobSerializer(source='scraped_job', read_only=True)

    class Meta:
        model = StudentSavedJob
        fields = ['id', 'job', 'saved_at']
