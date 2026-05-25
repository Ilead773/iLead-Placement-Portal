# apps/resumes/urls.py
from django.urls import path
from . import views

app_name = 'resumes'

urlpatterns = [
    # Built resumes
    path('', views.ResumeViewSet.as_view({'get': 'list_resumes', 'post': 'create_resume'})),
    path('<uuid:pk>/', views.ResumeViewSet.as_view({
        'get': 'get_resume', 
        'put': 'update_resume',
        'patch': 'update_resume',
        'delete': 'delete_resume'
    })),
    path('<uuid:pk>/set-primary/', views.ResumeViewSet.as_view({'post': 'set_primary'})),
    path('<uuid:pk>/download/', views.ResumeViewSet.as_view({'get': 'download'})),
    path('<uuid:pk>/html/', views.ResumeViewSet.as_view({'get': 'html'})),
    path('generate/', views.ResumeViewSet.as_view({'post': 'generate'})),
    path('<uuid:pk>/status/', views.ResumeViewSet.as_view({'get': 'check_status'})),

    # Uploads
    path('uploads/', views.ResumeUploadViewSet.as_view({'get': 'list_uploads', 'post': 'upload'})),
    path('uploads/<uuid:pk>/', views.ResumeUploadViewSet.as_view({
        'get': 'get_upload',
        'delete': 'delete_upload'
    })),
    path('uploads/<uuid:pk>/set-primary/', views.ResumeUploadViewSet.as_view({'post': 'set_primary'})),
    path('uploads/<uuid:pk>/download/', views.ResumeUploadViewSet.as_view({'get': 'download'})),
    path('uploads/<uuid:pk>/import_data/', views.ResumeUploadViewSet.as_view({'post': 'import_data'})),
]
