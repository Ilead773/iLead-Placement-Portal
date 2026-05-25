# apps/auditing/admin.py
from django.contrib import admin
from .models import ResumeAuditLog


@admin.register(ResumeAuditLog)
class ResumeAuditLogAdmin(admin.ModelAdmin):
    list_display = ['actor', 'action', 'resource_type', 'resource_id', 'created_at']
    list_filter = ['action', 'resource_type', 'created_at']
    search_fields = ['actor__login_id', 'resource_id']
    readonly_fields = ['actor', 'action', 'resource_type', 'resource_id', 'metadata', 'ip_address', 'user_agent', 'created_at']
    date_hierarchy = 'created_at'
