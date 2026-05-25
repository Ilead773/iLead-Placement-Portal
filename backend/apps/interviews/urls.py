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
    path('gap-analysis/', views.run_gap_analysis, name='gap-analysis-create'),
    path('gap-analysis/list/', views.list_gap_analyses, name='gap-analysis-list'),
    path('gap-analysis/<uuid:analysis_id>/roadmap/', views.create_roadmap, name='gap-analysis-roadmap'),
    path('roadmaps/', views.list_roadmaps, name='roadmap-list'),
    path('stats/', views.interview_stats, name='interview-stats'),
]
