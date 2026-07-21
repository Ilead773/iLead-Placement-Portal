# core/models.py
import uuid
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


class Course(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)

    class Meta:
        db_table = 'courses'

    def __str__(self):
        return self.name


class UserManager(BaseUserManager):
    def create_user(self, login_id, email, password=None, **extra_fields):
        if not login_id:
            raise ValueError('Login ID is required.')
        if not email:
            raise ValueError('Email is required.')
        email = self.normalize_email(email)
        user = self.model(login_id=login_id.lower(), email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, login_id, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('temp_password_flag', False)
        extra_fields.setdefault('password_reset_required', False)
        return self.create_user(login_id, email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('coordinator', 'Placement Coordinator'),
        ('student', 'Student'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    login_id = models.CharField(max_length=100, unique=True, db_index=True)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=200, blank=True, default='')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    temp_password_flag = models.BooleanField(default=True)
    password_reset_required = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # Granular Permissions (primarily for coordinators)
    can_manage_students = models.BooleanField(default=False)
    can_manage_placements = models.BooleanField(default=False)
    can_manage_resumes = models.BooleanField(default=False)
    can_manage_assignments = models.BooleanField(default=False)
    can_send_notifications = models.BooleanField(default=False)
    can_view_scraping = models.BooleanField(default=False)
    can_view_clicks = models.BooleanField(default=False)

    # Rate limiting
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'login_id'
    REQUIRED_FIELDS = ['email']

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.login_id} ({self.role})'


class Student(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    name = models.CharField(max_length=200)
    registration_number = models.CharField(max_length=50, unique=True, db_index=True)
    email = models.EmailField(unique=True)
    passing_year = models.IntegerField(null=True, blank=True)
    course = models.CharField(max_length=100, blank=True, default='')
    stream = models.CharField(max_length=100, blank=True, null=True)
    semester = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(12)],
    )
    attendance = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    cgpa = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    
    phone_number = models.CharField(max_length=20, blank=True, default='')
    upload_log = models.ForeignKey('CSVUploadLog', null=True, blank=True, on_delete=models.SET_NULL, related_name='students_created')
    
    YEAR_CHOICES = [
        ('1st', '1st Year'),
        ('2nd', '2nd Year'),
        ('3rd', '3rd Year'),
        ('4th', '4th Year'),
    ]
    year = models.CharField(max_length=10, choices=YEAR_CHOICES, blank=True, null=True)
    
    CATEGORY_CHOICES = [
        ('A', 'Category A'),
        ('B', 'Category B'),
        ('C', 'Category C'),
        ('Own', 'Own Category'),
    ]
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES, blank=True, null=True)
    is_category_manual = models.BooleanField(default=False)
    
    backlogs = models.BooleanField(default=False)
    backlogs_count = models.IntegerField(default=0)
    training_attendance = models.FloatField(
        default=100.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_category(self):
        from apps.north_star.models import ScheduledClass
        has_classes = ScheduledClass.objects.exists()

        # Core conditions common to both scenarios:
        cond_a1 = (self.attendance >= 75.0) if self.attendance is not None else False
        cond_a2 = (self.cgpa >= 8.0) if self.cgpa is not None else False
        cond_a3 = (not self.backlogs and self.backlogs_count == 0)

        cond_b1 = (self.attendance >= 50.0) if self.attendance is not None else False
        cond_b2 = (self.cgpa >= 6.5) if self.cgpa is not None else False
        cond_b3 = (self.backlogs_count <= 2)

        if has_classes:
            # 4. training_attendance === 100%
            cond_a4 = (self.training_attendance >= 100.0) if self.training_attendance is not None else False
            score_a = sum([cond_a1, cond_a2, cond_a3, cond_a4])

            # 4. training_attendance >= 80%
            cond_b4 = (self.training_attendance >= 80.0) if self.training_attendance is not None else False
            score_b = sum([cond_b1, cond_b2, cond_b3, cond_b4])

            if score_a >= 3:
                return 'A'
            elif score_b >= 3:
                return 'B'
            else:
                return 'C'
        else:
            # Exclude training attendance, evaluate based on 3 conditions (need >= 2)
            score_a = sum([cond_a1, cond_a2, cond_a3])
            score_b = sum([cond_b1, cond_b2, cond_b3])

            if score_a >= 2:
                return 'A'
            elif score_b >= 2:
                return 'B'
            else:
                return 'C'

    @property
    def pact_score(self):
        from apps.north_star.models import ScheduledClass
        has_classes = ScheduledClass.objects.exists()

        cgpa_val = self.cgpa if self.cgpa is not None else 0.0
        attendance_val = self.attendance if self.attendance is not None else 0.0
        training_val = self.training_attendance if self.training_attendance is not None else 0.0
        backlog_count = self.backlogs_count if self.backlogs_count is not None else 0

        # CGPA normalized to 0-100 (weight 35%)
        performance_score = cgpa_val * 10.0
        
        # General attendance 0-100 (weight 25%)
        attendance_score = attendance_val
        
        # Standing score: 100 - 20 per backlog, minimum 0 (weight 15%)
        standing_score = max(0.0, 100.0 - (backlog_count * 20.0))

        if has_classes:
            # Training attendance 0-100 (weight 25%)
            training_score = training_val
            score = (
                (performance_score * 0.35) +
                (attendance_score * 0.25) +
                (training_score * 0.25) +
                (standing_score * 0.15)
            )
        else:
            # Redistribute 25% training attendance weight proportionally to performance (35%), attendance (25%), standing (15%)
            # Sum of remaining weights is 75%, so we divide by 0.75
            score = (
                (performance_score * 0.35) +
                (attendance_score * 0.25) +
                (standing_score * 0.15)
            ) / 0.75

        return round(score, 1)

    def save(self, *args, **kwargs):
        if not self.is_category_manual:
            self.category = self.calculate_category()
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'students'
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.registration_number})'


class Placement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_name = models.CharField(max_length=200)
    position = models.CharField(max_length=200)
    salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    description = models.TextField(blank=True, default='')
    required_cgpa = models.FloatField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    eligible_courses = models.CharField(
        max_length=500, blank=True, default='',
        help_text='Comma-separated list of eligible courses',
    )
    eligible_semesters = models.CharField(
        max_length=100, blank=True, default='',
        help_text='Comma-separated list of eligible semesters',
    )
    application_deadline = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_placements')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'placements'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.company_name} — {self.position}'

    @property
    def eligible_courses_list(self):
        return [c.strip() for c in self.eligible_courses.split(',') if c.strip()] if self.eligible_courses else []

    @property
    def eligible_semesters_list(self):
        return [int(s.strip()) for s in self.eligible_semesters.split(',') if s.strip()] if self.eligible_semesters else []


class PlacementAssignment(models.Model):
    STATUS_CHOICES = [
        ('assigned', 'Assigned'),
        ('applied', 'Applied'),
        ('shortlisted', 'Shortlisted'),
        ('rejected', 'Rejected'),
        ('selected', 'Selected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    placement = models.ForeignKey(Placement, on_delete=models.CASCADE, related_name='assignments')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='assignments')
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='assignments_made')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='assigned')
    assigned_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'placement_assignments'
        unique_together = [('placement', 'student')]
        ordering = ['-assigned_date']

    def __str__(self):
        return f'{self.student.name} → {self.placement.company_name} ({self.status})'

class LearningAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.CharField(max_length=100, db_index=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    duration_minutes = models.PositiveIntegerField(default=30)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='learning_assignments_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'learning_assignments'
        ordering = ['course', 'title']

    def __str__(self):
        return f'{self.course} - {self.title}'


class LearningQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(LearningAssignment, on_delete=models.CASCADE, related_name='questions')
    prompt = models.TextField()
    options = models.JSONField(default=list)
    correct_option = models.PositiveSmallIntegerField(default=0)
    points = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'learning_questions'
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.assignment.title} Q{self.order + 1}'


class StudentLearningAssignment(models.Model):
    STATUS_CHOICES = [
        ('assigned', 'Assigned'),
        ('submitted', 'Submitted'),
        ('expired', 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(LearningAssignment, on_delete=models.CASCADE, related_name='student_assignments')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='learning_assignments')
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='learning_assignments_assigned')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='assigned')
    due_at = models.DateTimeField(null=True, blank=True)
    score = models.FloatField(null=True, blank=True)
    total_points = models.PositiveIntegerField(default=0)
    submitted_at = models.DateTimeField(null=True, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_learning_assignments'
        ordering = ['-assigned_at']

    @property
    def percentage(self):
        if not self.total_points:
            return None
        return round((self.score or 0) * 100 / self.total_points, 1)

    def __str__(self):
        return f'{self.student.name} - {self.assignment.title} ({self.status})'


class StudentLearningAnswer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student_assignment = models.ForeignKey(StudentLearningAssignment, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(LearningQuestion, on_delete=models.CASCADE, related_name='student_answers')
    selected_option = models.PositiveSmallIntegerField(null=True, blank=True)
    is_correct = models.BooleanField(default=False)
    awarded_points = models.FloatField(default=0)

    class Meta:
        db_table = 'student_learning_answers'
        unique_together = [('student_assignment', 'question')]


class CSVUploadLog(models.Model):
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('partial', 'Partial'),
        ('failed', 'Failed'),
        ('reverted', 'Reverted'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='csv_uploads')
    file_name = models.CharField(max_length=255)
    total_records = models.IntegerField(default=0)
    successful_records = models.IntegerField(default=0)
    failed_records = models.IntegerField(default=0)
    created_count = models.IntegerField(default=0)   # New accounts created
    updated_count = models.IntegerField(default=0)   # Existing profiles updated
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='success')
    emails_sent = models.BooleanField(default=False)
    emails_sent_at = models.DateTimeField(null=True, blank=True)
    sent_emails_count = models.IntegerField(default=0)
    sent_courses = models.JSONField(default=list, blank=True)
    error_details = models.TextField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'csv_upload_logs'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f'{self.file_name} — {self.status} ({self.successful_records}/{self.total_records})'


class AuditLog(models.Model):
    """Tracks all important user actions for compliance."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=100)
    details = models.TextField(blank=True, default='')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.user} — {self.action} at {self.timestamp}'


class ExternalClickLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='external_clicks')
    job_title = models.CharField(max_length=255, blank=True, default='')
    company_name = models.CharField(max_length=255, blank=True, default='')
    external_url = models.URLField(max_length=1000)
    timestamp = models.DateTimeField(auto_now=True)
    is_marked_selected = models.BooleanField(default=False)
    marked_selected_at = models.DateTimeField(null=True, blank=True)
    click_count = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = 'external_click_logs'
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.user.login_id} clicked {self.company_name or "External Link"} - {self.timestamp}'


class StudentFeatureConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    feature_key = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    is_enabled = models.BooleanField(default=True)
    allowed_departments = models.JSONField(default=list, blank=True)
    allowed_years = models.JSONField(default=list, blank=True)
    allowed_courses = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'student_feature_configs'
        ordering = ['display_name']

    def __str__(self):
        return f'{self.display_name} ({self.feature_key})'

