import uuid
from django.db import models
from django.core.validators import FileExtensionValidator
from core.models import Student, User
from apps.jobs.models import Job, JobRound

class Application(models.Model):
    STATUS_CHOICES = [
        ('applied', 'Applied'),
        ('shortlisted', 'Shortlisted'),
        ('interviewing', 'Interviewing'),
        ('rejected', 'Rejected'),
        ('selected', 'Selected'),
        ('accepted', 'Accepted'),
        ('withdrawn', 'Withdrawn'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='job_applications')
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='applied')
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    eligibility_snapshot = models.JSONField(default=dict)
    job_snapshot = models.JSONField(default=dict)

    offer_letter_file = models.FileField(
        upload_to='offer_letters/%Y/%m/',
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'jpg', 'png'])]
    )
    offer_letter_uploaded = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if self.offer_letter_file:
            self.offer_letter_uploaded = True
        else:
            self.offer_letter_uploaded = False
        super().save(*args, **kwargs)

    class Meta:
        unique_together = ('student', 'job')
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.student.name} - {self.job.company_name} ({self.status})"

class ApplicationRound(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('scheduled', 'Scheduled'),
        ('cleared', 'Cleared'),
        ('failed', 'Failed'),
        ('skipped', 'Skipped'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='rounds')
    job_round = models.ForeignKey(JobRound, on_delete=models.CASCADE)
    round_number = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    score = models.IntegerField(null=True, blank=True)
    feedback = models.TextField(null=True, blank=True)
    scheduled_date = models.DateTimeField(null=True, blank=True)
    interview_link = models.URLField(null=True, blank=True)
    interviewer_name = models.CharField(max_length=255, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('application', 'job_round')
        ordering = ['round_number']

    def __str__(self):
        return f"{self.application.student.name} - {self.job_round.round_name} ({self.status})"

class ApplicationStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=20, null=True, blank=True)
    new_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

class Notification(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    metadata = models.JSONField(default=dict)
    action_url = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.title}"

class ResumeEmailLog(models.Model):
    """
    Records every time resumes were emailed to a company.
    """
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('pending', 'Pending'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sent_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='resume_emails_sent',
    )
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='email_logs')
    company_email = models.EmailField()
    subject = models.CharField(max_length=200)
    body = models.TextField()
    cc_emails = models.JSONField(default=list)
    application_ids = models.JSONField(default=list)
    student_names = models.JSONField(default=list)
    resumes_attached = models.IntegerField(default=0)
    skipped_students = models.JSONField(default=list)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(null=True, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f"Email to {self.company_email} — {self.resumes_attached} resumes — {self.status}"
