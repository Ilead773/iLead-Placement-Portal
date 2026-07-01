from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    NorthStarCourseViewSet,
    ScheduledClassViewSet,
    AttendanceViewSet,
    NorthStarAssignmentViewSet,
    AssignmentSubmissionViewSet,
    CourseProgressViewSet,
    schedule_class,
    zoom_webhook,
    generate_certificate,
    student_dashboard,
    admin_dashboard,
    send_bulk_email
)

router = DefaultRouter()
router.register(r'courses', NorthStarCourseViewSet, basename='course')
router.register(r'classes', ScheduledClassViewSet, basename='class')
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'assignments', NorthStarAssignmentViewSet, basename='assignment')
router.register(r'submissions', AssignmentSubmissionViewSet, basename='submission')
router.register(r'progress', CourseProgressViewSet, basename='progress')

urlpatterns = [
    path('', include(router.urls)),
    path('schedule-class/', schedule_class, name='schedule-class'),
    path('zoom-webhook/', zoom_webhook, name='zoom-webhook'),
    path('certificates/<uuid:student_id>/<uuid:course_id>/generate/', generate_certificate, name='generate-certificate'),
    path('dashboard/student/', student_dashboard, name='student-dashboard'),
    path('dashboard/admin/', admin_dashboard, name='admin-dashboard'),
    path('send-email/', send_bulk_email, name='send-email'),
]
