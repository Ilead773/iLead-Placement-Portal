# apps/resumes/admin.py
from django.contrib import admin
from .models import BuiltResume, ResumeUpload


@admin.register(BuiltResume)
class BuiltResumeAdmin(admin.ModelAdmin):
    list_display = ['title', 'student', 'state', 'is_primary', 'template', 'generated_at', 'downloaded_count']
    list_filter = ['state', 'is_primary']
    search_fields = ['title', 'student__name']
    readonly_fields = ['id', 'celery_task_id', 'generated_at', 'downloaded_count', 'created_at', 'updated_at']


@admin.register(ResumeUpload)
class ResumeUploadAdmin(admin.ModelAdmin):
    list_display = ['original_filename', 'student', 'status', 'uploaded_at', 'parsed_at']
    list_filter = ['status']
    readonly_fields = ['id', 'uploaded_at', 'parsed_at']
