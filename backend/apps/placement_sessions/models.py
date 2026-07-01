# apps/placement_sessions/models.py
"""
Placement Sessions — Zoom-powered session scheduling with automatic attendance tracking.

Models:
  - PlacementSession: A Zoom meeting scheduled by admin, targeted to specific students
  - SessionAttendanceEvent: Raw join/leave events from Zoom webhook
  - SessionAttendance: Aggregated per-student attendance record with % calculation
"""
import uuid
from django.db import models
from django.conf import settings


class PlacementSession(models.Model):
    SESSION_TYPE_CHOICES = [
        ('orientation', 'Orientation'),
        ('company_talk', 'Company Talk'),
        ('interview_prep', 'Interview Prep'),
        ('aptitude', 'Aptitude Training'),
        ('resume', 'Resume Workshop'),
        ('general', 'General Session'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    session_type = models.CharField(max_length=20, choices=SESSION_TYPE_CHOICES, default='general')

    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    # Who created/hosts this session
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='hosted_placement_sessions'
    )

    # Targeting filters — which students see this session
    # Empty = All students
    target_courses = models.JSONField(default=list, blank=True)   # e.g. ["BCA", "MBA"]
    target_streams = models.JSONField(default=list, blank=True)   # e.g. ["CS", "IT"]
    target_years = models.JSONField(default=list, blank=True)     # e.g. ["3rd", "4th"]

    # Zoom meeting details (auto-populated on creation)
    zoom_meeting_id = models.CharField(max_length=50, blank=True, default='')
    zoom_join_url = models.URLField(blank=True, default='')
    zoom_start_url = models.URLField(blank=True, default='')

    # Status
    is_active = models.BooleanField(default=True)
    attendance_finalized = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'placement_sessions'
        ordering = ['-start_time']

    def __str__(self):
        return f"{self.title} ({self.session_type}) — {self.start_time.strftime('%d %b %Y %H:%M')}"

    def duration_minutes(self):
        return int((self.end_time - self.start_time).total_seconds() / 60)


class SessionAttendanceEvent(models.Model):
    """Raw join/leave event captured from Zoom webhook."""
    EVENT_CHOICES = [('join', 'Join'), ('leave', 'Leave')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(PlacementSession, on_delete=models.CASCADE, related_name='events')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='placement_session_events'
    )
    participant_email = models.EmailField()
    participant_name = models.CharField(max_length=200, blank=True, default='')
    event_type = models.CharField(max_length=10, choices=EVENT_CHOICES)
    timestamp = models.DateTimeField()
    raw_payload = models.JSONField(default=dict)

    class Meta:
        db_table = 'placement_session_events'
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.participant_name} ({self.event_type}) — {self.session.title}"


class SessionAttendance(models.Model):
    """Aggregated per-student attendance record, computed after session ends."""
    STATUS_CHOICES = [
        ('present', 'Present'),   # >= 75% duration
        ('late', 'Late'),         # 30–75% duration
        ('absent', 'Absent'),     # < 30% duration
    ]
    MARKED_VIA_CHOICES = [
        ('zoom_auto', 'Zoom Auto'),
        ('manual', 'Manual Override'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(PlacementSession, on_delete=models.CASCADE, related_name='attendance')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='placement_session_attendance'
    )

    join_count = models.IntegerField(default=0)
    total_duration_minutes = models.IntegerField(default=0)
    attendance_percent = models.FloatField(default=0.0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='absent')
    marked_via = models.CharField(max_length=10, choices=MARKED_VIA_CHOICES, default='zoom_auto')
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='manual_session_marks'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'placement_session_attendance'
        unique_together = ('session', 'student')

    def __str__(self):
        return f"{self.student.email} — {self.session.title}: {self.status} ({self.attendance_percent:.0f}%)"
