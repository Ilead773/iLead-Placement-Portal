from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ApplicationViewSet, NotificationViewSet, SendResumesToCompanyView, ResumeEmailLogView, SharedResumeView

router = DefaultRouter()
router.register(r'applications', ApplicationViewSet, basename='application')
router.register(r'admin/applications', ApplicationViewSet, basename='admin-application')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    # Explicit paths MUST come before router include to avoid <pk> catch-all conflicts
    path('notifications/admin/create/', NotificationViewSet.as_view({'post': 'admin_create'}), name='admin-create-notification'),
    path('', include(router.urls)),
    path('admin/jobs/<uuid:job_id>/send-resumes/', SendResumesToCompanyView.as_view(), name='send-job-resumes'),
    path('admin/jobs/<uuid:job_id>/email-log/', ResumeEmailLogView.as_view(), name='job-email-log'),
    path('admin/email-logs/', ResumeEmailLogView.as_view(), name='email-logs-list'),
    path('shared-resumes/<uuid:log_id>/', SharedResumeView.as_view(), name='shared-resumes'),
]

