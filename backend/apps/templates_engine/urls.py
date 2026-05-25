# apps/templates_engine/urls.py
from django.urls import path
from . import views

app_name = 'templates_engine'

urlpatterns = [
    path('', views.TemplateViewSet.as_view({'get': 'list_templates', 'post': 'create_template'})),
    path('<uuid:pk>/', views.TemplateViewSet.as_view({'get': 'get_template', 'put': 'update_template', 'delete': 'delete_template'})),
]
