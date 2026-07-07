# apps/scraped_jobs/models.py
"""
Models for the Daily Job Scraper + Student Job Feed system.

Stores scraped jobs from external APIs (JSearch, Adzuna, Greenhouse, Lever),
manages course-to-job mappings, feed caching, and student interactions.
"""

from django.db import models
from django.utils import timezone
from django.conf import settings


class ScrapedJob(models.Model):
    """
    A job scraped from an external API source.
    Course relationships live ONLY in CourseJobMapping — no course_tags here.
    """

    SOURCE_CHOICES = [
        ('jsearch', 'JSearch'),
        ('adzuna', 'Adzuna'),
        ('greenhouse', 'Greenhouse'),
        ('lever', 'Lever'),
        ('linkedin', 'LinkedIn'),
    ]

    JOB_TYPE_CHOICES = [
        ('fresher_job', 'Fresher Job'),
        ('full_time', 'Full Time'),
        ('part_time', 'Part Time'),
        ('internship', 'Internship'),
        ('contract', 'Contract'),
        ('freelance', 'Freelance'),
    ]

    id = models.BigAutoField(primary_key=True)
    external_job_id = models.CharField(max_length=500)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    title = models.CharField(max_length=500)
    company_name = models.CharField(max_length=300)
    company_logo_url = models.URLField(null=True, blank=True)
    location = models.CharField(max_length=300, null=True, blank=True)
    is_remote = models.BooleanField(default=False)
    job_type = models.CharField(
        max_length=20, choices=JOB_TYPE_CHOICES, default='full_time'
    )
    description = models.TextField(null=True, blank=True)
    description_short = models.CharField(max_length=500, null=True, blank=True)
    apply_url = models.URLField(max_length=1000)
    salary_min = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    salary_max = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    salary_currency = models.CharField(max_length=10, default='INR', null=True, blank=True)
    salary_display = models.CharField(max_length=200, null=True, blank=True)
    required_skills = models.JSONField(default=list)
    experience_required = models.CharField(max_length=100, null=True, blank=True)
    is_internship = models.BooleanField(default=False)
    posted_at = models.DateTimeField(null=True, blank=True)
    scraped_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    quality_score = models.FloatField(default=0.0)
    raw_data = models.JSONField(default=dict)
    dedup_hash = models.CharField(max_length=64, unique=True)

    # Admin approval workflow
    is_approved = models.BooleanField(
        default=False,
        help_text='Only approved jobs are shown to students in their job feed.',
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='approved_scraped_jobs',
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'scraped_jobs'
        indexes = [
            models.Index(fields=['is_active', '-scraped_at']),
            models.Index(fields=['source', 'posted_at']),
            models.Index(fields=['company_name']),
            models.Index(fields=['dedup_hash']),
            models.Index(fields=['source', 'external_job_id']),
            models.Index(fields=['scraped_at']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['is_active']),
            models.Index(fields=['job_type']),
            models.Index(fields=['is_internship']),
            models.Index(fields=['-quality_score', '-scraped_at']),
            models.Index(fields=['is_approved', '-scraped_at']),
        ]
        unique_together = [('external_job_id', 'source')]

    def __str__(self):
        return f"{self.title} at {self.company_name} ({self.source})"


class CourseJobMapping(models.Model):
    """
    Maps a scraped job to a course. Only created if relevance_score >= 0.3.
    """

    id = models.BigAutoField(primary_key=True)
    course_name = models.CharField(max_length=100)
    scraped_job = models.ForeignKey(
        ScrapedJob, on_delete=models.CASCADE, related_name='course_mappings'
    )
    relevance_score = models.FloatField(default=1.0)
    scraped_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'course_job_mappings'
        unique_together = [('course_name', 'scraped_job')]
        indexes = [
            models.Index(fields=['course_name', 'scraped_job']),
            models.Index(fields=['course_name']),
            models.Index(fields=['course_name', 'scraped_at']),
        ]

    def __str__(self):
        return f"{self.course_name} → {self.scraped_job.title}"


class CourseJobFeedCache(models.Model):
    """
    Course-level feed cache. ONE row per course — NOT per student.
    All students in same course share this row.
    Feed is stale if scraping_run_id != latest completed ScrapingRun.id.
    """

    id = models.BigAutoField(primary_key=True)
    course_name = models.CharField(max_length=100, unique=True)
    job_ids = models.JSONField(default=list)
    internship_ids = models.JSONField(default=list)
    scraping_run_id = models.IntegerField(null=True, blank=True)
    total_jobs = models.IntegerField(default=0)
    total_internships = models.IntegerField(default=0)
    generated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'course_job_feed_cache'

    def __str__(self):
        return f"{self.course_name}: {self.total_jobs} jobs, {self.total_internships} internships"


class ScrapingRun(models.Model):
    """
    Permanent audit trail of each scraping run. NEVER deleted.
    """

    STATUS_CHOICES = [
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('partial', 'Partial'),
    ]

    id = models.BigAutoField(primary_key=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='running')
    total_fetched = models.IntegerField(default=0)
    total_saved = models.IntegerField(default=0)
    total_duplicates_skipped = models.IntegerField(default=0)
    total_expired_deactivated = models.IntegerField(default=0)
    courses_completed = models.JSONField(default=list)
    courses_failed = models.JSONField(default=list)
    per_course_stats = models.JSONField(default=dict)
    error_log = models.TextField(null=True, blank=True)
    api_calls_made = models.JSONField(default=dict)

    class Meta:
        db_table = 'scraping_runs'

    def __str__(self):
        return f"Run #{self.id} ({self.status}) — {self.total_saved} saved"


class ScraperHealthMetric(models.Model):
    """Health metrics per source per scraping run."""

    id = models.BigAutoField(primary_key=True)
    scraping_run = models.ForeignKey(
        ScrapingRun, on_delete=models.CASCADE, related_name='health_metrics'
    )
    source = models.CharField(max_length=20)
    pool_name = models.CharField(max_length=100, null=True, blank=True)
    response_time_ms = models.IntegerField(null=True, blank=True)
    jobs_fetched = models.IntegerField(default=0)
    duplicates_found = models.IntegerField(default=0)
    failures = models.IntegerField(default=0)
    actual_api_calls = models.IntegerField(default=0)
    is_healthy = models.BooleanField(default=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'scraper_health_metrics'

    def __str__(self):
        return f"{self.source}: {self.jobs_fetched} fetched, {self.actual_api_calls} calls"


class FailedScrapeRecord(models.Model):
    """Dead-letter queue for silent parse/save failures."""

    FAILURE_TYPE_CHOICES = [
        ('parse_error', 'Parse Error'),
        ('validation_error', 'Validation Error'),
        ('dedup_error', 'Dedup Error'),
        ('save_error', 'Save Error'),
    ]

    id = models.BigAutoField(primary_key=True)
    scraping_run = models.ForeignKey(
        ScrapingRun, on_delete=models.CASCADE, related_name='failures'
    )
    source = models.CharField(max_length=20)
    pool_name = models.CharField(max_length=100, null=True, blank=True)
    raw_snippet = models.TextField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    failure_type = models.CharField(max_length=50, choices=FAILURE_TYPE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    retry_count = models.IntegerField(default=0)
    resolved = models.BooleanField(default=False)

    class Meta:
        db_table = 'failed_scrape_records'

    def __str__(self):
        return f"{self.source} {self.failure_type}: {self.error_message[:60] if self.error_message else 'N/A'}"


class CourseSearchConfig(models.Model):
    """DB-driven config for course search keywords. Admin editable."""

    id = models.BigAutoField(primary_key=True)
    course_name = models.CharField(max_length=100, unique=True)
    keywords = models.JSONField(default=list)
    internship_keywords = models.JSONField(default=list)
    exclude_keywords = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=5)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'course_search_configs'
        ordering = ['priority', 'course_name']

    def __str__(self):
        return f"{self.course_name} ({'active' if self.is_active else 'inactive'})"


class StudentSavedJob(models.Model):
    """Student bookmark for a scraped job."""

    id = models.BigAutoField(primary_key=True)
    student = models.ForeignKey(
        'core.Student', on_delete=models.CASCADE, related_name='saved_jobs'
    )
    scraped_job = models.ForeignKey(
        ScrapedJob, on_delete=models.CASCADE, related_name='saved_by'
    )
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'student_saved_jobs'
        unique_together = [('student', 'scraped_job')]
        indexes = [
            models.Index(fields=['student', '-saved_at']),
        ]

    def __str__(self):
        return f"{self.student.name} saved {self.scraped_job.title}"


class StudentJobView(models.Model):
    """Tracks when a student views a scraped job detail."""

    id = models.BigAutoField(primary_key=True)
    student = models.ForeignKey(
        'core.Student', on_delete=models.CASCADE, related_name='job_views'
    )
    scraped_job = models.ForeignKey(
        ScrapedJob, on_delete=models.CASCADE
    )
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'student_job_views'
        unique_together = [('student', 'scraped_job')]
        indexes = [
            models.Index(fields=['student', '-viewed_at']),
        ]

    def __str__(self):
        return f"{self.student.name} viewed {self.scraped_job.title}"
