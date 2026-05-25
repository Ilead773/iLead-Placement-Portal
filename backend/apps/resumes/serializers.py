# apps/resumes/serializers.py
"""DRF serializers for resume management."""

from rest_framework import serializers
from .models import BuiltResume, ResumeUpload


class BuiltResumeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = BuiltResume
        fields = [
            'id', 'student', 'student_name', 'title', 'description',
            'canonical_json', 'custom_html', 'template', 'template_name',
            'state', 'error_message', 'is_primary',
            'pdf_url', 'generated_at', 'downloaded_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'student', 'state', 'error_message',
            'generated_at', 'downloaded_count', 'created_at', 'updated_at',
        ]

    def get_pdf_url(self, obj):
        if obj.generated_pdf:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.generated_pdf.url)
            return obj.generated_pdf.url
        return None

    def validate(self, attrs):
        title = attrs.get('title')
        if title:
            request = self.context.get('request')
            student = None
            if self.instance:
                student = self.instance.student
            elif request and hasattr(request.user, 'student_profile'):
                student = request.user.student_profile
            
            if student:
                queryset = BuiltResume.all_objects.filter(student=student, title=title)
                if self.instance:
                    queryset = queryset.exclude(id=self.instance.id)
                if queryset.exists():
                    raise serializers.ValidationError({'title': 'A resume with this title already exists.'})
        return attrs


class BuiltResumeListSerializer(serializers.ModelSerializer):
    """Lightweight list serializer (no canonical_json payload)."""
    template_name = serializers.CharField(source='template.name', read_only=True)
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = BuiltResume
        fields = [
            'id', 'title', 'description', 'template_name',
            'state', 'is_primary', 'pdf_url', 'generated_at',
            'downloaded_count', 'created_at',
        ]

    def get_pdf_url(self, obj):
        if obj.generated_pdf:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.generated_pdf.url)
            return obj.generated_pdf.url
        return None


class BuiltResumeCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, default='')
    template_id = serializers.UUIDField()
    canonical_json = serializers.JSONField()


class ResumeUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeUpload
        fields = [
            'id', 'student', 'file', 'original_filename',
            'status', 'parsing_error', 'uploaded_at', 'parsed_at', 'is_primary'
        ]
        read_only_fields = [
            'id', 'student', 'original_filename',
            'status', 'parsing_error', 'uploaded_at', 'parsed_at', 'is_primary'
        ]
