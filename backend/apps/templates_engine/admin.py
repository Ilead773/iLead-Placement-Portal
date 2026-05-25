# apps/templates_engine/admin.py
"""Admin registration for template models."""

from django.contrib import admin
from .models import ResumeTemplate, ResumeSnapshot


@admin.register(ResumeTemplate)
class ResumeTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'version', 'is_active', 'created_by', 'created_at']
    list_filter = ['is_active', 'version']
    search_fields = ['name']
    readonly_fields = ['version', 'created_at']


@admin.register(ResumeSnapshot)
class ResumeSnapshotAdmin(admin.ModelAdmin):
    list_display = ['id', 'built_resume', 'template', 'created_at']
    readonly_fields = ['template_snapshot', 'rendered_html', 'created_at']
