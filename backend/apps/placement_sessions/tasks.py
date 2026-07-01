# apps/placement_sessions/tasks.py
"""
Celery tasks for Placement Sessions attendance finalization.
Runs automatically 15 minutes after each session ends.
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(
    name='apps.placement_sessions.tasks.finalize_session_attendance',
    bind=True,
    max_retries=3,
    default_retry_delay=60
)
def finalize_session_attendance(self, session_id):
    """
    Aggregates join/leave events for a placement session.
    Calculates duration, join_count, attendance_percent, and status per student.
    Runs 15 minutes after session end_time.
    """
    from django.contrib.auth import get_user_model
    from .models import PlacementSession, SessionAttendanceEvent, SessionAttendance
    User = get_user_model()

    try:
        session = PlacementSession.objects.get(id=session_id)
    except PlacementSession.DoesNotExist:
        logger.error(f"PlacementSession {session_id} not found for attendance finalization.")
        return
    except Exception as exc:
        logger.warning(f"Error retrieving session {session_id}, retrying: {exc}")
        self.retry(exc=exc)

    logger.info(f"Finalizing attendance for session: {session.title}")

    session_duration = session.duration_minutes()
    if session_duration <= 0:
        session_duration = 60

    # Get all raw events for this session
    events = SessionAttendanceEvent.objects.filter(session=session).order_by('timestamp')

    # Group by resolved student
    student_events = {}
    for event in events:
        if event.student:
            sid = event.student.id
            student_events.setdefault(sid, []).append(event)

    # Determine which students should have been in this session
    targeted_students = _get_targeted_students(session, User)
    processed_ids = set()

    # Process students who have events (joined)
    for student_id, evs in student_events.items():
        try:
            student = User.objects.get(id=student_id)
        except User.DoesNotExist:
            continue

        processed_ids.add(student_id)

        total_duration = 0
        join_count = 0
        active_join = None

        for ev in evs:
            if ev.event_type == 'join':
                join_count += 1
                if active_join is None:
                    active_join = ev.timestamp
            elif ev.event_type == 'leave':
                if active_join is not None:
                    duration = (ev.timestamp - active_join).total_seconds() / 60
                    total_duration += max(0, int(duration))
                    active_join = None

        # If still joined when session ended
        if active_join is not None:
            leave_time = max(session.end_time, timezone.now())
            duration = (leave_time - active_join).total_seconds() / 60
            total_duration += max(0, int(duration))

        # Cap at session duration
        total_duration = min(total_duration, session_duration)

        # Calculate percentage
        attendance_percent = round((total_duration / session_duration) * 100, 1) if session_duration > 0 else 0.0

        # Determine status
        if attendance_percent >= 75:
            status = 'present'
        elif attendance_percent >= 30:
            status = 'late'
        else:
            status = 'absent'

        SessionAttendance.objects.update_or_create(
            session=session,
            student=student,
            defaults={
                'join_count': join_count,
                'total_duration_minutes': total_duration,
                'attendance_percent': attendance_percent,
                'status': status,
                'marked_via': 'zoom_auto',
            }
        )
        logger.info(f"Attendance: {student.email} → {status} ({attendance_percent}%)")

    # Mark targeted students who never joined as absent
    for student in targeted_students:
        if student.id not in processed_ids:
            SessionAttendance.objects.update_or_create(
                session=session,
                student=student,
                defaults={
                    'join_count': 0,
                    'total_duration_minutes': 0,
                    'attendance_percent': 0.0,
                    'status': 'absent',
                    'marked_via': 'zoom_auto',
                }
            )
            logger.info(f"Absent (no-show): {student.email}")

    # Mark session as finalized
    session.attendance_finalized = True
    session.save(update_fields=['attendance_finalized'])
    logger.info(f"Attendance finalized for session: {session.title}")


def _get_targeted_students(session, User):
    """Returns queryset of students targeted by this session's filters."""
    from django.db.models import Q

    qs = User.objects.filter(role='student', is_active=True).select_related('student_profile')

    filters = Q()

    if session.target_courses:
        course_q = Q()
        for c in session.target_courses:
            course_q |= Q(student_profile__course__iexact=c)
        filters &= course_q

    if session.target_streams:
        stream_q = Q()
        for s in session.target_streams:
            stream_q |= Q(student_profile__stream__iexact=s)
        filters &= stream_q

    if session.target_years:
        year_q = Q()
        for y in session.target_years:
            year_q |= Q(student_profile__year__iexact=y)
        filters &= year_q

    if filters:
        return qs.filter(filters)
    return qs


@shared_task(name='apps.placement_sessions.tasks.sweep_unfinalized_sessions')
def sweep_unfinalized_sessions():
    """
    Sweeper task that runs periodically to catch and finalize any sessions
    whose scheduled finalization task was missed/lost.
    """
    from django.utils import timezone
    from .models import PlacementSession
    
    # Check sessions that ended at least 15 mins ago
    cutoff = timezone.now() - timezone.timedelta(minutes=15)
    unfinalized = PlacementSession.objects.filter(
        end_time__lte=cutoff,
        attendance_finalized=False,
        is_active=True
    )
    
    if unfinalized.exists():
        logger.info(f"Sweeper: found {unfinalized.count()} unfinalized sessions.")
        for s in unfinalized:
            logger.info(f"Sweeper: triggering finalization for session: {s.title} ({s.id})")
            finalize_session_attendance.delay(str(s.id))

