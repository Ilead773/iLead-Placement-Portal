from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JobViewSet

router = DefaultRouter()
router.register(r'jobs', JobViewSet, basename='job')
# Admin endpoints are mapped inside the viewset methods and via router for standard CRUD
router.register(r'admin/jobs', JobViewSet, basename='admin-job')

urlpatterns = [
    path('', include(router.urls)),
]
