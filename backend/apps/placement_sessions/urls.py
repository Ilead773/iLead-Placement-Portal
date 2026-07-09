from django.urls import path
from .views import (
    schedule_session,
    list_sessions,
    session_detail,
    join_session,
    start_session,
    end_session,
    session_attendance,
    override_attendance,
    placement_zoom_webhook,
)

urlpatterns = [
    # Admin: create session
    path('schedule/', schedule_session, name='ps-schedule'),

    # List all sessions (role-filtered)
    path('', list_sessions, name='ps-list'),

    # Single session
    path('<uuid:session_id>/', session_detail, name='ps-detail'),

    # Student: join embedded Zoom
    path('<uuid:session_id>/join/', join_session, name='ps-join'),

    # Admin: host start URL
    path('<uuid:session_id>/start/', start_session, name='ps-start'),

    # Admin: end session early
    path('<uuid:session_id>/end/', end_session, name='ps-end'),

    # Attendance report
    path('<uuid:session_id>/attendance/', session_attendance, name='ps-attendance'),

    # Manual override
    path('<uuid:session_id>/attendance/<uuid:attendance_id>/', override_attendance, name='ps-attendance-override'),

    # Zoom webhook (no auth)
    path('zoom-webhook/', placement_zoom_webhook, name='ps-zoom-webhook'),
]
