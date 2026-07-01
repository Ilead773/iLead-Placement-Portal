# apps/interviews/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('domains/', views.list_domains, name='interview-domains'),
    path('types/', views.list_interview_types, name='interview-types'),
    path('start/', views.start_interview, name='interview-start'),
    path('submit-answer/', views.submit_answer, name='interview-submit-answer'),
    path('check-answer-status/<uuid:answer_id>/', views.check_answer_status, name='check-answer-status'),
    path('sessions/', views.list_sessions, name='interview-sessions'),
    path('sessions/<uuid:session_id>/', views.session_detail, name='interview-session-detail'),
    path('sessions/<uuid:session_id>/abandon/', views.abandon_session, name='interview-session-abandon'),
    path('stats/', views.interview_stats, name='interview-stats'),
]

