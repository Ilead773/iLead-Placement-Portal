from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ApplicationViewSet, NotificationViewSet, SendResumesToCompanyView, ResumeEmailLogView

router = DefaultRouter()
router.register(r'applications', ApplicationViewSet, basename='application')
router.register(r'admin/applications', ApplicationViewSet, basename='admin-application')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
    path('admin/jobs/<uuid:job_id>/send-resumes/', SendResumesToCompanyView.as_view(), name='send-job-resumes'),
    path('admin/jobs/<uuid:job_id>/email-log/', ResumeEmailLogView.as_view(), name='job-email-log'),
]
