# apps/placement_sessions/views.py
"""
Placement Sessions API Views.

Endpoints:
  POST   /placement-sessions/schedule/          — Admin: create session + Zoom meeting
  GET    /placement-sessions/                   — List sessions (filtered per student role)
  GET    /placement-sessions/{id}/              — Get single session
  GET    /placement-sessions/{id}/join/         — Student: get SDK signature to join embedded
  GET    /placement-sessions/{id}/start/        — Admin: get host start URL
  GET    /placement-sessions/{id}/attendance/   — Admin: get attendance report for a session
  PATCH  /placement-sessions/{id}/attendance/{att_id}/ — Admin: manual override attendance
  POST   /placement-sessions/zoom-webhook/      — Zoom webhook (no auth, signature verified)
"""
import os
import hmac
import hashlib
import logging
from datetime import datetime

from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdminOrCoordinator
from apps.north_star.services import ZoomService
from .models import PlacementSession, SessionAttendanceEvent, SessionAttendance
from .serializers import PlacementSessionSerializer, SessionAttendanceSerializer
from .tasks import finalize_session_attendance

logger = logging.getLogger(__name__)
User = get_user_model()


# ─── Helper: get students targeted by a session ───────────────────────────────

def _get_targeted_students_qs(session):
    qs = User.objects.filter(role='student', is_active=True).select_related('student_profile')
    filters = Q()
    if session.target_courses:
        cq = Q()
        for c in session.target_courses:
            cq |= Q(student_profile__course__iexact=c)
        filters &= cq
    if session.target_streams:
        sq = Q()
        for s in session.target_streams:
            sq |= Q(student_profile__stream__iexact=s)
        filters &= sq
    if session.target_years:
        yq = Q()
        for y in session.target_years:
            yq |= Q(student_profile__year__iexact=y)
        filters &= yq
    if filters:
        return qs.filter(filters)
    return qs


# ─── ADMIN: Schedule a new session ────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAdminOrCoordinator])
def schedule_session(request):
    """
    POST /placement-sessions/schedule/
    Body: { title, description, session_type, start_time, end_time,
            target_courses[], target_streams[], target_years[] }
    Creates PlacementSession + Zoom meeting automatically.
    Schedules Celery finalize_session_attendance 15 min after end_time.
    """
    data = request.data

    title = data.get('title', '').strip()
    start_time_str = data.get('start_time')
    end_time_str = data.get('end_time')

    if not title or not start_time_str or not end_time_str:
        return Response({'detail': 'title, start_time, and end_time are required.'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
        
        # Ensure aware datetimes
        if timezone.is_naive(start_time):
            start_time = timezone.make_aware(start_time, timezone.get_current_timezone())
        if timezone.is_naive(end_time):
            end_time = timezone.make_aware(end_time, timezone.get_current_timezone())
    except ValueError:
        return Response({'detail': 'Invalid date format. Use ISO 8601.'}, status=status.HTTP_400_BAD_REQUEST)

    if end_time <= start_time:
        return Response({'detail': 'end_time must be after start_time.'}, status=status.HTTP_400_BAD_REQUEST)

    duration = int((end_time - start_time).total_seconds() / 60)

    # Create Zoom meeting
    zoom_service = ZoomService()
    try:
        meeting_details = zoom_service.create_meeting(
            topic=title,
            start_time=start_time,
            duration_minutes=duration,
            host_email=request.user.email
        )
    except Exception as e:
        logger.error(f"Zoom meeting creation failed: {e}")
        return Response({'detail': f'Zoom Error: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)

    session = PlacementSession.objects.create(
        title=title,
        description=data.get('description', ''),
        session_type=data.get('session_type', 'general'),
        start_time=start_time,
        end_time=end_time,
        host=request.user,
        target_courses=data.get('target_courses', []),
        target_streams=data.get('target_streams', []),
        target_years=data.get('target_years', []),
        zoom_meeting_id=meeting_details['zoom_meeting_id'],
        zoom_join_url=meeting_details['zoom_join_url'],
        zoom_start_url=meeting_details['zoom_start_url'],
    )

    # Schedule attendance finalization 15 min after session ends
    countdown_secs = int((end_time - timezone.now()).total_seconds()) + (15 * 60)
    if countdown_secs < 0:
        countdown_secs = 5
    finalize_session_attendance.apply_async(args=[str(session.id)], countdown=countdown_secs)
    logger.info(f"Scheduled attendance finalization for session {session.id} in {countdown_secs}s")

    return Response(PlacementSessionSerializer(session).data, status=status.HTTP_201_CREATED)


# ─── LIST sessions ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_sessions(request):
    """
    GET /placement-sessions/
    - Admin/coordinator: sees all sessions
    - Student: sees only sessions targeted at them
    """
    user = request.user

    if user.role in ['admin', 'coordinator']:
        sessions = PlacementSession.objects.all().order_by('-start_time')
    else:
        # Student: filter by their profile fields
        try:
            profile = user.student_profile
        except Exception:
            return Response([], status=status.HTTP_200_OK)

        student_course = profile.course or ''
        student_stream = profile.stream or ''
        student_year = profile.year or ''

        # A session targets this student if:
        # 1. Its filters are all empty (open to everyone), OR
        # 2. The student matches each non-empty filter
        all_sessions = PlacementSession.objects.filter(is_active=True).order_by('-start_time')
        matching = []
        for s in all_sessions:
            course_ok = not s.target_courses or any(c.lower() == student_course.lower() for c in s.target_courses)
            stream_ok = not s.target_streams or any(st.lower() == student_stream.lower() for st in s.target_streams)
            year_ok = not s.target_years or any(y.lower() == student_year.lower() for y in s.target_years)
            if course_ok and stream_ok and year_ok:
                matching.append(s)
        sessions = matching

    serializer = PlacementSessionSerializer(sessions, many=True)
    return Response(serializer.data)


# ─── GET single session ────────────────────────────────────────────────────────

@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def session_detail(request, session_id):
    try:
        session = PlacementSession.objects.get(id=session_id)
    except PlacementSession.DoesNotExist:
        return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        if request.user.role not in ['admin', 'coordinator']:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        session.is_active = False
        session.save(update_fields=['is_active'])
        return Response({'detail': 'Session cancelled.'}, status=status.HTTP_200_OK)

    return Response(PlacementSessionSerializer(session).data)


# ─── STUDENT: Join session (get SDK signature) ─────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def join_session(request, session_id):
    """
    GET /placement-sessions/{id}/join/
    Returns SDK signature + meeting details for embedded Zoom join.
    No Zoom login required on student side.
    """
    try:
        session = PlacementSession.objects.get(id=session_id, is_active=True)
    except PlacementSession.DoesNotExist:
        return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not session.zoom_meeting_id:
        return Response({'detail': 'No Zoom meeting linked to this session.'}, status=status.HTTP_400_BAD_REQUEST)

    zoom_service = ZoomService()
    try:
        role = 1 if request.user.role in ['admin', 'coordinator'] else 0
        signature = zoom_service.generate_sdk_signature(session.zoom_meeting_id, role=role)
    except Exception as e:
        logger.error(f"SDK signature generation failed: {e}")
        return Response({'detail': f'Zoom SDK Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({
        'meeting_number': session.zoom_meeting_id,
        'signature': signature,
        'sdk_key': zoom_service.get_sdk_key(),
        'role': role,
        'join_url': session.zoom_join_url,
        'session_title': session.title,
        'user_name': request.user.name or request.user.email,
        'user_email': request.user.email,
    })


# ─── ADMIN: Start session as host ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminOrCoordinator])
def start_session(request, session_id):
    """GET /placement-sessions/{id}/start/ — Returns host start URL."""
    try:
        session = PlacementSession.objects.get(id=session_id)
    except PlacementSession.DoesNotExist:
        return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

    zoom_service = ZoomService()
    try:
        # Return the full Zoom start URL including the ZAK parameter so the host can authenticate
        start_url = session.zoom_start_url or ''
            
        role = 1
        signature = zoom_service.generate_sdk_signature(session.zoom_meeting_id, role=role)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({
        'meeting_number': session.zoom_meeting_id,
        'signature': signature,
        'sdk_key': zoom_service.get_sdk_key(),
        'role': role,
        'start_url': start_url,
        'join_url': session.zoom_join_url,
        'session_title': session.title,
        'user_name': request.user.name or request.user.email,
        'user_email': request.user.email,
    })


@api_view(['POST'])
@permission_classes([IsAdminOrCoordinator])
def end_session(request, session_id):
    """POST /placement-sessions/{id}/end/ — Manually end placement session early."""
    try:
        session = PlacementSession.objects.get(id=session_id)
    except PlacementSession.DoesNotExist:
        return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

    session.end_time = timezone.now()
    session.save()

    # Trigger finalization task synchronously
    from apps.placement_sessions.tasks import finalize_placement_attendance
    finalize_placement_attendance(session.id)

    return Response({'detail': 'Session ended and attendance finalization triggered.'})


# ─── ADMIN: Get attendance report ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminOrCoordinator])
def session_attendance(request, session_id):
    """GET /placement-sessions/{id}/attendance/ — Full attendance report."""
    try:
        session = PlacementSession.objects.get(id=session_id)
    except PlacementSession.DoesNotExist:
        return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

    attendance_qs = SessionAttendance.objects.filter(session=session).select_related('student')
    serializer = SessionAttendanceSerializer(attendance_qs, many=True)

    # Summary stats
    total = attendance_qs.count()
    present = attendance_qs.filter(status='present').count()
    late = attendance_qs.filter(status='late').count()
    absent = attendance_qs.filter(status='absent').count()

    return Response({
        'session': PlacementSessionSerializer(session).data,
        'summary': {
            'total_students': total,
            'present': present,
            'late': late,
            'absent': absent,
            'attendance_rate': round(((present + late) / total * 100), 1) if total > 0 else 0,
        },
        'records': serializer.data
    })


# ─── ADMIN: Manual attendance override ────────────────────────────────────────

@api_view(['PATCH'])
@permission_classes([IsAdminOrCoordinator])
def override_attendance(request, session_id, attendance_id):
    """PATCH /placement-sessions/{id}/attendance/{att_id}/ — Manual override."""
    try:
        record = SessionAttendance.objects.get(id=attendance_id, session__id=session_id)
    except SessionAttendance.DoesNotExist:
        return Response({'detail': 'Record not found.'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status')
    if new_status not in ['present', 'late', 'absent']:
        return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

    record.status = new_status
    record.marked_via = 'manual'
    record.marked_by = request.user
    record.save(update_fields=['status', 'marked_via', 'marked_by', 'updated_at'])
    return Response(SessionAttendanceSerializer(record).data)


# ─── ZOOM WEBHOOK ──────────────────────────────────────────────────────────────

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def placement_zoom_webhook(request):
    """
    POST /placement-sessions/zoom-webhook/
    Receives Zoom participant join/leave events.
    Verifies HMAC-SHA256 signature for security.
    Logs events to SessionAttendanceEvent.
    """
    zoom_service = ZoomService()

    # Cache raw body BEFORE request.data is accessed to prevent RawPostDataException
    try:
        raw_body = request._request.body
    except Exception:
        raw_body = b''

    event_type = request.data.get('event')

    # Handle Zoom URL validation handshake
    if event_type == 'endpoint.url_validation':
        plain_token = request.data.get('payload', {}).get('plainToken', '')
        webhook_secret = os.environ.get('ZOOM_WEBHOOK_SECRET_TOKEN', '')
        if not webhook_secret:
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        encrypted_token = hmac.new(
            webhook_secret.encode('utf-8'),
            plain_token.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return Response({'plainToken': plain_token, 'encryptedToken': encrypted_token})

    # Verify signature for real events (pass pre-read bytes)
    if not zoom_service.verify_webhook_signature(request, raw_body):
        logger.warning("Placement session zoom webhook: invalid signature")
        return Response({'detail': 'Invalid signature'}, status=status.HTTP_401_UNAUTHORIZED)

    payload = request.data.get('payload', {})
    obj = payload.get('object', {})
    meeting_id = str(obj.get('id', ''))

    if event_type == 'meeting.ended':
        session = PlacementSession.objects.filter(zoom_meeting_id=meeting_id).first()
        if session:
            session.end_time = timezone.now()
            session.save()
            logger.info(f"Placement Session {session.title} ended early via Zoom webhook. Triggering finalization.")
            
            # Import and trigger the finalization task
            from apps.placement_sessions.tasks import finalize_placement_attendance
            finalize_placement_attendance(session.id)
            return Response({"detail": "Meeting ended processed successfully"}, status=status.HTTP_200_OK)
        return Response({"detail": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

    participant = obj.get('participant', {})
    email = participant.get('email', '')
    name = participant.get('user_name', '')

    if event_type in ['meeting.participant_joined', 'meeting.participant_left']:
        event_name = 'join' if event_type == 'meeting.participant_joined' else 'leave'
        time_str = participant.get('join_time' if event_name == 'join' else 'leave_time')

        try:
            timestamp = datetime.strptime(time_str, '%Y-%m-%dT%H:%M:%SZ') if time_str else timezone.now()
            if time_str:
                from datetime import timezone as dt_timezone
                timestamp = timezone.make_aware(timestamp, dt_timezone.utc)
        except Exception:
            timestamp = timezone.now()

        # Find matching PlacementSession by Zoom meeting ID
        session = PlacementSession.objects.filter(zoom_meeting_id=meeting_id).first()
        if not session:
            logger.warning(f"Webhook: no PlacementSession for meeting_id={meeting_id}")
            return Response({'detail': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        # Resolve student
        student_user = User.objects.filter(email__iexact=email).first()

        # Fallback 1: Resolve by email prefix (e.g. registration_number@student.ilead.edu -> registration_number)
        if not student_user and email:
            prefix = email.split('@')[0]
            student_user = User.objects.filter(login_id__iexact=prefix).first()
            if not student_user:
                from core.models import Student
                std_profile = Student.objects.filter(registration_number__iexact=prefix).first()
                if std_profile:
                    student_user = std_profile.user

        # Fallback 2: Check if participant name contains a registration number (e.g. "Jane Smith 28941623072")
        if not student_user and name:
            import re
            digits_match = re.search(r'\b\d{8,12}\b', name)
            if digits_match:
                reg_no = digits_match.group(0)
                from core.models import Student
                std_profile = Student.objects.filter(registration_number__iexact=reg_no).first()
                if std_profile:
                    student_user = std_profile.user

        # Fallback 3: Resolve by student name exact match
        if not student_user and name:
            student_user = User.objects.filter(name__iexact=name.strip(), role='student').first()
            if not student_user:
                from core.models import Student
                std_profile = Student.objects.filter(name__iexact=name.strip()).first()
                if std_profile:
                    student_user = std_profile.user

        SessionAttendanceEvent.objects.create(
            session=session,
            student=student_user,
            participant_email=email,
            participant_name=name,
            event_type=event_name,
            timestamp=timestamp,
            raw_payload=request.data
        )
        logger.info(f"Logged {event_name} for {email} in session '{session.title}'")
        return Response(status=status.HTTP_201_CREATED)

    return Response({'detail': 'Event not handled'}, status=status.HTTP_200_OK)
