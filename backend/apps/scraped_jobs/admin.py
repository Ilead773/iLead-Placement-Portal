# apps/scraped_jobs/admin.py

from django.contrib import admin
from .models import (
    ScrapedJob, CourseJobMapping, CourseJobFeedCache, ScrapingRun,
    ScraperHealthMetric, FailedScrapeRecord, CourseSearchConfig,
    StudentSavedJob, StudentJobView,
)


class CourseJobMappingInline(admin.TabularInline):
    model = CourseJobMapping
    extra = 0
    readonly_fields = ('course_name', 'relevance_score', 'scraped_at')


@admin.register(ScrapedJob)
class ScrapedJobAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'title', 'company_name', 'source', 'is_internship',
        'quality_score', 'location', 'scraped_at', 'expires_at',
        'is_active', 'course_tags_display',
    ]
    list_filter = ['source', 'is_internship', 'is_active', 'is_remote']
    search_fields = ['title', 'company_name', 'location']
    readonly_fields = ['raw_data', 'dedup_hash', 'scraped_at', 'expires_at', 'quality_score']
    inlines = [CourseJobMappingInline]
    actions = ['mark_inactive']

    @admin.display(description='Course Tags')
    def course_tags_display(self, obj):
        tags = obj.course_mappings.values_list('course_name', flat=True)
        return ', '.join(tags) if tags else '—'

    @admin.action(description='Mark selected jobs as inactive')
    def mark_inactive(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} jobs marked inactive.')


@admin.register(ScrapingRun)
class ScrapingRunAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'started_at', 'status', 'total_fetched', 'total_saved',
        'total_duplicates_skipped', 'api_calls_display', 'duration_display',
    ]
    list_filter = ['status']
    readonly_fields = [
        'started_at', 'completed_at', 'status', 'total_fetched', 'total_saved',
        'total_duplicates_skipped', 'total_expired_deactivated',
        'courses_completed', 'courses_failed', 'per_course_stats',
        'error_log', 'api_calls_made',
    ]

    @admin.display(description='API Calls')
    def api_calls_display(self, obj):
        if not obj.api_calls_made:
            return '—'
        parts = [f"{k}: {v}" for k, v in obj.api_calls_made.items() if v]
        return ' | '.join(parts) if parts else '—'

    @admin.display(description='Duration')
    def duration_display(self, obj):
        if obj.started_at and obj.completed_at:
            delta = (obj.completed_at - obj.started_at).total_seconds()
            return f'{delta / 60:.1f} min'
        return 'In progress'


@admin.register(CourseJobMapping)
class CourseJobMappingAdmin(admin.ModelAdmin):
    list_display = ['course_name', 'scraped_job_title', 'relevance_score', 'scraped_at']
    list_filter = ['course_name']

    @admin.display(description='Job Title')
    def scraped_job_title(self, obj):
        return obj.scraped_job.title


@admin.register(CourseSearchConfig)
class CourseSearchConfigAdmin(admin.ModelAdmin):
    list_display = ['course_name', 'is_active', 'priority', 'keyword_count']
    list_filter = ['is_active']
    ordering = ['priority']

    @admin.display(description='Keywords')
    def keyword_count(self, obj):
        return len(obj.keywords)


@admin.register(ScraperHealthMetric)
class ScraperHealthMetricAdmin(admin.ModelAdmin):
    list_display = [
        'source', 'actual_api_calls', 'jobs_fetched',
        'failures', 'is_healthy', 'recorded_at',
    ]
    list_filter = ['source', 'is_healthy']


@admin.register(FailedScrapeRecord)
class FailedScrapeRecordAdmin(admin.ModelAdmin):
    list_display = ['source', 'failure_type', 'retry_count', 'resolved', 'created_at']
    list_filter = ['source', 'failure_type', 'resolved']
    actions = ['mark_resolved']

    @admin.action(description='Mark selected as resolved')
    def mark_resolved(self, request, queryset):
        count = queryset.update(resolved=True)
        self.message_user(request, f'{count} records marked resolved.')


@admin.register(CourseJobFeedCache)
class CourseJobFeedCacheAdmin(admin.ModelAdmin):
    list_display = [
        'course_name', 'total_jobs', 'total_internships',
        'scraping_run_id', 'generated_at',
    ]
    readonly_fields = [
        'course_name', 'job_ids', 'internship_ids',
        'scraping_run_id', 'total_jobs', 'total_internships', 'generated_at',
    ]


@admin.register(StudentSavedJob)
class StudentSavedJobAdmin(admin.ModelAdmin):
    list_display = ['student', 'scraped_job', 'saved_at']
    list_filter = ['saved_at']


@admin.register(StudentJobView)
class StudentJobViewAdmin(admin.ModelAdmin):
    list_display = ['student', 'scraped_job', 'viewed_at']
    list_filter = ['viewed_at']
