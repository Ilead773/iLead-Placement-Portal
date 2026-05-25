# apps/profiles/urls.py
"""URL routing for the profiles app."""

from django.urls import path
from . import views

app_name = 'profiles'

urlpatterns = [
    # Profile
    path('me/', views.ProfileViewSet.as_view({'get': 'get_profile', 'put': 'update_profile', 'patch': 'update_profile'})),
    path('me/completion/', views.ProfileViewSet.as_view({'get': 'completion'})),
    path('me/photo/', views.ProfileViewSet.as_view({'post': 'upload_photo', 'delete': 'remove_photo'})),

    # Skills
    path('me/skills/', views.SkillViewSet.as_view({'get': 'list_skills', 'post': 'add_skill'})),
    path('me/skills/<uuid:pk>/', views.SkillViewSet.as_view({'patch': 'update_skill', 'delete': 'remove_skill'})),

    # Experience
    path('me/experiences/', views.ExperienceViewSet.as_view({'get': 'list_experiences', 'post': 'add_experience'})),
    path('me/experiences/<uuid:pk>/', views.ExperienceViewSet.as_view({'patch': 'update_experience', 'delete': 'remove_experience'})),

    # Projects
    path('me/projects/', views.ProjectViewSet.as_view({'get': 'list_projects', 'post': 'add_project'})),
    path('me/projects/<uuid:pk>/', views.ProjectViewSet.as_view({'patch': 'update_project', 'delete': 'remove_project'})),

    # Education
    path('me/education/', views.EducationViewSet.as_view({'get': 'list_education', 'post': 'add_education'})),
    path('me/education/<uuid:pk>/', views.EducationViewSet.as_view({'patch': 'update_education', 'delete': 'remove_education'})),

    # Certifications
    path('me/certifications/', views.CertificationViewSet.as_view({'get': 'list_certifications', 'post': 'add_certification'})),
    path('me/certifications/<uuid:pk>/', views.CertificationViewSet.as_view({'patch': 'update_certification', 'delete': 'remove_certification'})),

    # Achievements / Awards
    path('me/achievements/', views.AchievementViewSet.as_view({'get': 'list_achievements', 'post': 'add_achievement'})),
    path('me/achievements/<uuid:pk>/', views.AchievementViewSet.as_view({'patch': 'update_achievement', 'delete': 'remove_achievement'})),
]
