import os
import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from core.models import Student, User
from apps.jobs.models import Job, JobRound


def validate_offer_letter_signature(file):
    """
    Validates the file's binary signature to verify it is a genuine
    PDF, Word Doc/Docx, or Image (JPEG/PNG) rather than a renamed shell script.
    """
    initial_pos = file.tell()
    file.seek(0)
    header = file.read(8)
    file.seek(initial_pos)
    
    is_pdf = header.startswith(b'%PDF')
    is_jpg = header.startswith(b'\xff\xd8\xff')
    is_png = header.startswith(b'\x89PNG\r\n\x1a')
    is_zip_docx = header.startswith(b'PK\x03\x04')
    is_old_doc = header.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1')
    
    if not (is_pdf or is_jpg or is_png or is_zip_docx or is_old_doc):
         raise ValidationError("Unsupported file type or invalid file contents. Allowed files: PDF, Word (DOC/DOCX), JPEG, PNG.")

def validate_offer_letter_size(file):
    """
    Validates that the file size does not exceed 2MB.
    """
    limit = 2 * 1024 * 1024  # 2MB
    if file.size > limit:
        raise ValidationError("File size must not exceed 2MB.")

def get_offer_letter_upload_path(instance, filename):
    """
    Generates a secure, randomized UUID filename to prevent direct execution
    and filename guessing attacks in the uploads folder.
    """
    import uuid
    from django.utils import timezone
    ext = filename.split('.')[-1].lower()
    random_filename = f"{uuid.uuid4()}.{ext}"
    now = timezone.now()
    return os.path.join(f"offer_letters/{now.year}/{now.month:02d}/", random_filename)

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
        upload_to=get_offer_letter_upload_path,
        blank=True,
        null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'jpg', 'png']),
            validate_offer_letter_signature,
            validate_offer_letter_size
        ]
    )
    offer_letter_uploaded = models.BooleanField(default=False)


    OFFER_LETTER_STATUS_CHOICES = [
        ('pending_upload', 'Pending Upload'),
        ('pending_verification', 'Pending Verification'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    offer_letter_status = models.CharField(
        max_length=20,
        choices=OFFER_LETTER_STATUS_CHOICES,
        default='pending_upload'
    )
    offer_letter_feedback = models.TextField(blank=True, null=True)
    is_deleted = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        file_changed = False
        status_explicitly_changed = False
        
        if self.pk:
            try:
                orig = Application.objects.get(pk=self.pk)
                if orig.offer_letter_file != self.offer_letter_file:
                    file_changed = True
                if orig.offer_letter_status != self.offer_letter_status:
                    status_explicitly_changed = True
            except Application.DoesNotExist:
                pass
        else:
            if self.offer_letter_file:
                file_changed = True

        if self.offer_letter_file:
            self.offer_letter_uploaded = True
            if file_changed:
                if not status_explicitly_changed:
                    self.offer_letter_status = 'pending_verification'
            else:
                if self.offer_letter_status in ['pending_upload', 'rejected']:
                    self.offer_letter_status = 'pending_verification'
        else:
            self.offer_letter_uploaded = False
            self.offer_letter_status = 'pending_upload'
            self.offer_letter_feedback = None

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
    pin_code = models.CharField(max_length=6, null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']

    def save(self, *args, **kwargs):
        if not self.expires_at:
            from datetime import timedelta
            from django.utils import timezone
            # Set to 7 days from now (or sent_at time)
            self.expires_at = timezone.now() + timedelta(days=7)
        if not self.pin_code:
            import random
            self.pin_code = "".join([str(random.randint(0, 9)) for _ in range(6)])
        super().save(*args, **kwargs)


    def __str__(self):
        return f"Email to {self.company_email} — {self.resumes_attached} resumes — {self.status}"



from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

@receiver(post_save, sender=Notification)
def send_notification_email_trigger(sender, instance, created, **kwargs):
    if created:
        from .tasks import send_notification_email
        from django.db import transaction
        try:
            transaction.on_commit(lambda: send_notification_email.delay(instance.id))
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not queue notification email for notification {instance.id} (is Redis/Celery running?): {e}")


def sync_job_status(job):
    """
    Counts the number of selected/accepted applications for a job, and closes the job
    if the count meets or exceeds openings_count, or reopens it if it is below.
    """
    placed_count = Application.objects.filter(
        job=job,
        status__in=['selected', 'accepted'],
        is_deleted=False
    ).count()
    if placed_count >= job.openings_count:
        if job.status == 'active':
            job.status = 'closed'
            job.save(update_fields=['status'])
    else:
        if job.status == 'closed':
            job.status = 'active'
            job.save(update_fields=['status'])

@receiver(post_save, sender=Application)
def close_job_when_openings_filled(sender, instance, **kwargs):
    sync_job_status(instance.job)

@receiver(post_delete, sender=Application)
def reopen_job_on_application_delete(sender, instance, **kwargs):
    sync_job_status(instance.job)

