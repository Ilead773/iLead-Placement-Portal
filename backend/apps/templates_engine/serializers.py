# apps/templates_engine/serializers.py
"""DRF serializers for template management."""

from rest_framework import serializers
from .models import ResumeTemplate, ResumeSnapshot


class ResumeTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True, default='System')

    class Meta:
        model = ResumeTemplate
        fields = [
            'id', 'name', 'description', 'html_template', 'css_styles',
            'version', 'is_active', 'created_at', 'created_by', 'created_by_name',
        ]
        read_only_fields = ['id', 'version', 'created_at']


class ResumeTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing (no HTML/CSS payload)."""

    class Meta:
        model = ResumeTemplate
        fields = ['id', 'name', 'description', 'version', 'is_active', 'created_at']


class ResumeSnapshotSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True)

    class Meta:
        model = ResumeSnapshot
        fields = ['id', 'built_resume', 'template', 'template_name', 'rendered_html', 'created_at']
        read_only_fields = ['id', 'created_at']
