from django.urls import path
from . import views

urlpatterns = [
    path('students/profile/', views.submit_profile, name='submit_profile'),
    path('students/<uuid:profile_id>/gap-analysis/', views.get_gap_analysis, name='get_gap_analysis'),
    path('students/<uuid:profile_id>/roadmap/', views.get_roadmap, name='get_roadmap'),
    path('courses/', views.list_courses, name='list_courses'),
    path('courses/<uuid:course_id>/required-skills/', views.list_required_skills, name='list_required_skills'),
    path('me/', views.my_career_profile, name='my_career_profile'),
]
