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
        ('Own', 'Own Category'),
    ]
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES, default='C')
    openings_count = models.IntegerField(default=1)
    hr_email = models.EmailField(blank=True, null=True)

    # Stores: min_cgpa, allowed_branches (list), required_skills (list), allowed_years (list), no_backlog (bool)
    eligibility_rules = models.JSONField(default=dict)
    
    application_deadline = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    email_sent = models.BooleanField(default=False)
    
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

    is_deleted = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['job', 'round_number'],
                condition=models.Q(is_deleted=False),
                name='unique_active_round_number'
            )
        ]
        ordering = ['round_number']

    def __str__(self):
        return f"{self.job.company_name} - Round {self.round_number}: {self.round_name}"


from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Job)
def trigger_job_alert_email(sender, instance, created, **kwargs):
    # Trigger when status becomes active and emails haven't been sent yet
    if instance.status == 'active' and not instance.email_sent:
        instance.email_sent = True
        # Save only the email_sent field to avoid re-triggering signal recursively
        instance.save(update_fields=['email_sent'])
        
        # Trigger background enqueuing of the email alert task after database commit
        from apps.applications.tasks import send_job_alert_task
        from django.db import transaction
        try:
            transaction.on_commit(lambda: send_job_alert_task.delay(instance.id))
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not queue job alert email for job {instance.id} (is Redis/Celery running?): {e}")

