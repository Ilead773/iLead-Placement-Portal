from rest_framework import serializers
from .models import User, Student, Placement, PlacementAssignment, CSVUploadLog, AuditLog, ExternalClickLog
import re

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'login_id', 'email', 'name', 'role', 'temp_password_flag', 'password_reset_required', 'can_manage_students', 'can_manage_placements', 'can_manage_resumes']

class LoginSerializer(serializers.Serializer):
    login_id = serializers.CharField()
    password = serializers.CharField(write_only=True)

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters.")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not re.search(r'\d', value):
            raise serializers.ValidationError("Password must contain at least one digit.")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise serializers.ValidationError("Password must contain at least one special character.")
        return value

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data

class StudentSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    profile = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = '__all__'

    def get_profile(self, obj):
        try:
            profile = obj.resume_profile
            request = self.context.get('request')
            profile_picture_url = None
            if profile.profile_picture:
                if request:
                    profile_picture_url = request.build_absolute_uri(profile.profile_picture.url)
                else:
                    profile_picture_url = profile.profile_picture.url

            return {
                'id': profile.id,
                'phone': profile.phone,
                'location': profile.location,
                'professional_summary': profile.professional_summary,
                'linkedin': profile.linkedin,
                'github': profile.github,
                'portfolio': profile.portfolio,
                'profile_picture': profile_picture_url,
                'completion_score': profile.completion_score,
                'skills': [
                    {
                        'id': s.id,
                        'name': s.name,
                        'category': s.category,
                        'proficiency': s.proficiency
                    } for s in profile.skills.all()
                ],
                'experiences': [
                    {
                        'id': e.id,
                        'company': e.company,
                        'position': e.position,
                        'start_date': e.start_date.isoformat() if e.start_date else None,
                        'end_date': e.end_date.isoformat() if e.end_date else None,
                        'is_current': e.is_current,
                        'description': e.description,
                        'achievements': e.achievements
                    } for e in profile.experiences.all()
                ],
                'projects': [
                    {
                        'id': p.id,
                        'title': p.title,
                        'description': p.description,
                        'technologies': p.technologies,
                        'link': p.link,
                        'date': p.date.isoformat() if p.date else None
                    } for p in profile.projects.all()
                ],
                'education_entries': [
                    {
                        'id': edu.id,
                        'institution': edu.institution,
                        'degree': edu.degree,
                        'field': edu.field,
                        'graduation_date': edu.graduation_date.isoformat() if edu.graduation_date else None,
                        'gpa': edu.gpa,
                        'honors': edu.honors
                    } for edu in profile.education_entries.all()
                ],
                'certifications': [
                    {
                        'id': c.id,
                        'name': c.name,
                        'issuer': c.issuer,
                        'date': c.date.isoformat() if c.date else None,
                        'credential_url': c.credential_url
                    } for c in profile.certifications.all()
                ]
            }
        except Exception:
            return None

class PlacementSerializer(serializers.ModelSerializer):
    assignment_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Placement
        fields = '__all__'

class PlacementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Placement
        exclude = ['created_by']

class PlacementAssignmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_reg = serializers.CharField(source='student.registration_number', read_only=True)
    student_course = serializers.CharField(source='student.course', read_only=True)
    student_cgpa = serializers.FloatField(source='student.cgpa', read_only=True)
    company_name = serializers.CharField(source='placement.company_name', read_only=True)
    position = serializers.CharField(source='placement.position', read_only=True)

    class Meta:
        model = PlacementAssignment
        fields = '__all__'


class ExternalClickLogSerializer(serializers.ModelSerializer):
    user_login = serializers.CharField(source='user.login_id', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    student_name = serializers.CharField(source='user.student_profile.name', read_only=True, default='')
    student_reg = serializers.CharField(source='user.student_profile.registration_number', read_only=True, default='')

    class Meta:
        model = ExternalClickLog
        fields = '__all__'

class BulkAssignSerializer(serializers.Serializer):
    student_ids = serializers.ListField(child=serializers.UUIDField())

class AssignmentStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['assigned', 'applied', 'shortlisted', 'rejected', 'selected'])

class CSVUploadLogSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.name', read_only=True)
    
    class Meta:
        model = CSVUploadLog
        fields = '__all__'

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True, default='System')
    
    class Meta:
        model = AuditLog
        fields = '__all__'
