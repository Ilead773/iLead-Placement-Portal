import uuid
from django.db import models
from core.models import User

class Job(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('closed', 'Closed'),
    ]
    JOB_TYPE_CHOICES = [
        ('internal', 'Internal'),
        ('external', 'External'),
    ]
    LISTING_TYPE_CHOICES = [
        ('job', 'Job'),
        ('internship', 'Internship'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_name = models.CharField(max_length=255)
    company_website = models.URLField(max_length=500, blank=True, null=True)
    role = models.CharField(max_length=255)
    description = models.TextField()
    package = models.DecimalField(max_digits=10, decimal_places=2)
    location = models.CharField(max_length=255)
    job_type = models.CharField(max_length=20, choices=JOB_TYPE_CHOICES, default='internal')
    listing_type = models.CharField(max_length=20, choices=LISTING_TYPE_CHOICES, default='job')
    external_link = models.URLField(blank=True, null=True)
    duration = models.CharField(max_length=100, blank=True, null=True)  # e.g. "3 months", "6 months"
    
    CATEGORY_CHOICES = [
        ('A', 'Category A'),
        ('B', 'Category B'),
        ('C', 'Category C'),
    ]
    category = models.CharField(max_length=2, choices=CATEGORY_CHOICES, default='C')
    openings_count = models.IntegerField(default=1)
    hr_email = models.EmailField(blank=True, null=True)

    # Stores: min_cgpa, allowed_branches (list), required_skills (list), allowed_years (list), no_backlog (bool)
    eligibility_rules = models.JSONField(default=dict)
    
    application_deadline = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_jobs')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.company_name} - {self.role}"

class JobRound(models.Model):
    ROUND_TYPE_CHOICES = [
        ('test', 'Test'),
        ('interview', 'Interview'),
        ('group_discussion', 'Group Discussion'),
        ('assignment', 'Assignment'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='rounds')
    round_number = models.IntegerField()
    round_name = models.CharField(max_length=255)
    round_type = models.CharField(max_length=50, choices=ROUND_TYPE_CHOICES)
    is_elimination = models.BooleanField(default=True)
    passing_score = models.IntegerField(null=True, blank=True)
    duration_minutes = models.IntegerField(null=True, blank=True)

    class Meta:
        unique_together = ('job', 'round_number')
        ordering = ['round_number']

    def __str__(self):
        return f"{self.job.company_name} - Round {self.round_number}: {self.round_name}"
