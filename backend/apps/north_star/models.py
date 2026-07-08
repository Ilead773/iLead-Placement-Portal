import uuid
from django.db import models
from django.conf import settings
from core.models import Course

class ScheduledClass(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='classes', null=True, blank=True)
    courses = models.ManyToManyField(Course, related_name='scheduled_classes', blank=True)
    title = models.CharField(max_length=200)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    zoom_meeting_id = models.CharField(max_length=50, blank=True, default='')
    zoom_join_url = models.URLField(max_length=1000, blank=True, default='')
    zoom_start_url = models.URLField(max_length=1000, blank=True, default='')
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='hosted_classes'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        course_name = self.course.name if self.course else "Multi-stream"
        return f"{self.title} ({course_name})"

class AttendanceEvent(models.Model):
    EVENT_CHOICES = [('join', 'Join'), ('leave', 'Leave')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scheduled_class = models.ForeignKey(ScheduledClass, on_delete=models.CASCADE, related_name='events')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='attendance_events'
    )
    participant_email = models.EmailField()
    participant_name = models.CharField(max_length=200, blank=True, default='')
    event_type = models.CharField(max_length=10, choices=EVENT_CHOICES)
    timestamp = models.DateTimeField()
    raw_payload = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.participant_name} ({self.event_type}) - Class: {self.scheduled_class.title}"

class Attendance(models.Model):
    STATUS_CHOICES = [('present','Present'),('late','Late'),('absent','Absent'),('excused','Excused')]
    MARKED_VIA_CHOICES = [('zoom_auto','Zoom Auto'),('manual','Manual Override')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scheduled_class = models.ForeignKey(ScheduledClass, on_delete=models.CASCADE, related_name='attendance')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='absent')
    total_duration_minutes = models.IntegerField(default=0)
    join_count = models.IntegerField(default=0)
    marked_via = models.CharField(max_length=10, choices=MARKED_VIA_CHOICES, default='zoom_auto')
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='manual_attendance_marks'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('scheduled_class', 'student')

    def __str__(self):
        return f"{self.student.email} - {self.scheduled_class.title}: {self.status}"

class NorthStarAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='assignments')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    attachment = models.FileField(upload_to='north_star/assignments/', blank=True, null=True)
    due_date = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=30)
    max_score = models.IntegerField(default=100)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='assignments_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.course.name})"

class NorthStarQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(NorthStarAssignment, on_delete=models.CASCADE, related_name='questions')
    prompt = models.TextField()
    options = models.JSONField(default=list)
    correct_option = models.PositiveSmallIntegerField(default=0)
    points = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.assignment.title} Q{self.order + 1}'

class AssignmentSubmission(models.Model):
    STATUS_CHOICES = [('submitted','Submitted'),('graded','Graded'),('late','Late'),('missing','Missing')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(NorthStarAssignment, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ns_submissions'
    )
    file = models.FileField(upload_to='north_star/submissions/', blank=True, null=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    score = models.IntegerField(null=True, blank=True)
    feedback = models.TextField(blank=True, default='')
    answers_data = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='missing')

    class Meta:
        unique_together = ('assignment', 'student')

    def __str__(self):
        return f"{self.student.email} submission for {self.assignment.title}"

class CourseProgress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ns_progress'
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='progress_records')
    completion_percent = models.FloatField(default=0)
    attendance_percent = models.FloatField(default=0)
    certificate_unlocked = models.BooleanField(default=False)
    certificate_url = models.URLField(blank=True, default='')
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'course')

    def __str__(self):
        return f"Progress: {self.student.email} in {self.course.name} ({self.completion_percent}%)"


from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

# Recalculate categories when ScheduledClass presence transitions between 0 and 1
@receiver(post_save, sender=ScheduledClass)
def handle_scheduled_class_save(sender, instance, created, **kwargs):
    if created:
        # Check if this is the first class
        if sender.objects.count() == 1:
            recalculate_student_categories()

@receiver(post_delete, sender=ScheduledClass)
def handle_scheduled_class_delete(sender, instance, **kwargs):
    # Check if there are no classes left
    if not sender.objects.exists():
        recalculate_student_categories()

def recalculate_student_categories():
    from core.models import Student
    students = Student.objects.filter(is_category_manual=False)
    for student in students:
        new_cat = student.calculate_category()
        if student.category != new_cat:
            student.category = new_cat
            student.save(update_fields=['category'])
