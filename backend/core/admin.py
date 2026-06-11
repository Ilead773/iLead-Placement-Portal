# core/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    AuditLog, CSVUploadLog, LearningAssignment, LearningQuestion, Placement,
    PlacementAssignment, Student, StudentLearningAssignment, User,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['login_id', 'email', 'name', 'role', 'is_active', 'temp_password_flag', 'created_at']
    list_filter = ['role', 'is_active', 'temp_password_flag']
    search_fields = ['login_id', 'email', 'name']
    ordering = ['-created_at']
    fieldsets = (
        (None, {'fields': ('login_id', 'email', 'password')}),
        ('Info', {'fields': ('name', 'role')}),
        ('Status', {'fields': ('is_active', 'is_staff', 'is_superuser', 'temp_password_flag', 'password_reset_required')}),
        ('Security', {'fields': ('failed_login_attempts', 'locked_until')}),
    )
    add_fieldsets = (
        (None, {'fields': ('login_id', 'email', 'name', 'role', 'password1', 'password2')}),
    )


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['name', 'registration_number', 'email', 'course', 'stream', 'semester', 'cgpa']
    list_filter = ['course', 'stream', 'semester', 'passing_year']
    search_fields = ['name', 'registration_number', 'email']


@admin.register(Placement)
class PlacementAdmin(admin.ModelAdmin):
    list_display = ['company_name', 'position', 'salary', 'required_cgpa', 'application_deadline', 'created_by']
    list_filter = ['created_at']
    search_fields = ['company_name', 'position']


@admin.register(PlacementAssignment)
class PlacementAssignmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'placement', 'status', 'assigned_by', 'assigned_date']
    list_filter = ['status']


class LearningQuestionInline(admin.TabularInline):
    model = LearningQuestion
    extra = 1


@admin.register(LearningAssignment)
class LearningAssignmentAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'duration_minutes', 'created_by', 'created_at']
    list_filter = ['course', 'created_at']
    search_fields = ['title', 'course']
    inlines = [LearningQuestionInline]


@admin.register(StudentLearningAssignment)
class StudentLearningAssignmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'assignment', 'status', 'score', 'total_points', 'due_at', 'submitted_at']
    list_filter = ['status', 'assignment__course']
    search_fields = ['student__name', 'student__registration_number', 'assignment__title']


@admin.register(CSVUploadLog)
class CSVUploadLogAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'uploaded_by', 'total_records', 'successful_records', 'failed_records', 'status', 'uploaded_at']
    list_filter = ['status']
    readonly_fields = ['uploaded_by', 'file_name', 'total_records', 'successful_records', 'failed_records', 'status', 'error_details', 'uploaded_at']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'ip_address', 'timestamp']
    list_filter = ['action']
    readonly_fields = ['user', 'action', 'details', 'ip_address', 'timestamp']
