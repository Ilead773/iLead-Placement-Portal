# apps/profiles/serializers.py
"""DRF serializers for student profiles and completion metrics."""

from rest_framework import serializers
from .models import (
    StudentProfile, Skill, Experience, 
    Project, Education, Certification, Achievement,
    ExtracurricularActivity
)


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['id', 'name', 'category', 'proficiency']


class ExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experience
        fields = [
            'id', 'company', 'position',
            'start_date', 'end_date', 'is_current', 'description', 'achievements'
        ]


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            'id', 'title', 'description', 'technologies',
            'link', 'date'
        ]


class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = [
            'id', 'institution', 'degree', 'field',
            'graduation_date', 'gpa', 'honors'
        ]


class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = ['id', 'name', 'issuer', 'date', 'credential_url']


class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = ['id', 'title', 'issuer', 'date', 'description']


class AchievementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = ['title', 'issuer', 'date', 'description']


class ExtracurricularActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExtracurricularActivity
        fields = ['id', 'title', 'description', 'date']


class ExtracurricularActivityCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExtracurricularActivity
        fields = ['title', 'description', 'date']



class StudentProfileSerializer(serializers.ModelSerializer):
    skills = SkillSerializer(many=True, read_only=True)
    experiences = ExperienceSerializer(many=True, read_only=True)
    projects = ProjectSerializer(many=True, read_only=True)
    education_entries = EducationSerializer(many=True, read_only=True)
    certifications = CertificationSerializer(many=True, read_only=True)
    achievements = AchievementSerializer(many=True, read_only=True)
    extracurricular_activities = ExtracurricularActivitySerializer(many=True, read_only=True)
    
    # Completion metrics
    completion_score = serializers.FloatField(read_only=True)
    completion_details = serializers.JSONField(read_only=True)
    improvement_suggestions = serializers.ListField(child=serializers.CharField(), read_only=True)
    strengths = serializers.ListField(child=serializers.CharField(), read_only=True)
    languages_known = serializers.ListField(child=serializers.CharField(), read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            'id', 'student', 'phone', 'location',
            'professional_summary', 'linkedin', 'github', 'portfolio',
            'email_job_alerts',
            'profile_picture',
            'skills', 'experiences', 'projects', 'education_entries', 'certifications', 'achievements',
            'extracurricular_activities', 'strengths', 'languages_known',
            'completion_score', 'completion_details', 'improvement_suggestions',
            'created_at', 'updated_at',
            # Fields from core.Student
            'student_name', 'student_phone', 'student_year', 'student_category', 'student_backlogs'
        ]
        read_only_fields = ['id', 'student', 'completion_score', 'completion_details', 'improvement_suggestions']

    student_name = serializers.CharField(source='student.name', read_only=True)
    student_phone = serializers.CharField(source='student.phone_number', read_only=True)
    student_year = serializers.CharField(source='student.year', read_only=True)
    student_category = serializers.CharField(source='student.category', read_only=True)
    student_backlogs = serializers.BooleanField(source='student.backlogs', read_only=True)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        if request and request.user and getattr(request.user, 'role', '') == 'student':
            ret.pop('student_category', None)
        return ret



class ProfileSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing profiles."""
    student_name = serializers.CharField(source='student.name', read_only=True)
    
    class Meta:
        model = StudentProfile
        fields = ['id', 'student_name', 'location', 'completion_score', 'updated_at']


class StudentProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for partial profile updates including core student data."""
    strengths = serializers.ListField(child=serializers.CharField(), required=False)
    languages_known = serializers.ListField(child=serializers.CharField(), required=False)

    class Meta:
        model = StudentProfile
        fields = [
            'phone', 'location', 'professional_summary',
            'linkedin', 'github', 'portfolio', 'email_job_alerts',
            'strengths', 'languages_known'
        ]



class SkillCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['name', 'category', 'proficiency']


class ExperienceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experience
        fields = [
            'company', 'position',
            'start_date', 'end_date', 'is_current', 'description', 'achievements'
        ]


class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            'title', 'description', 'technologies', 'link', 'date'
        ]


class CertificationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = ['name', 'issuer', 'date', 'credential_url']
