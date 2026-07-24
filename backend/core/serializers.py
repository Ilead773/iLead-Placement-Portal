from rest_framework import serializers
from .models import (
    User, Student, Placement, PlacementAssignment, CSVUploadLog, AuditLog,
    ExternalClickLog, LearningAssignment, LearningQuestion,
    StudentLearningAssignment, StudentLearningAnswer, StudentFeatureConfig,
)
import re

class UserSerializer(serializers.ModelSerializer):
    features = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'login_id', 'email', 'name', 'role', 'temp_password_flag', 'password_reset_required',
            'can_manage_students', 'can_manage_placements', 'can_manage_resumes',
            'can_manage_assignments', 'can_send_notifications', 'can_view_scraping', 'can_view_clicks',
            'features'
        ]

    def get_features(self, obj):
        features_dict = {}
        from .models import StudentFeatureConfig
        student = getattr(obj, 'student_profile', None)
        course = student.course if student else None
        year_value = getattr(student, 'year', None)
        
        configs = StudentFeatureConfig.objects.all()
        for config in configs:
            if not config.is_enabled:
                features_dict[config.feature_key] = False
            else:
                # Course check (empty allowed_courses means all)
                course_ok = not getattr(config, 'allowed_courses', None) or (course and course in config.allowed_courses)
                # Year check (empty allowed_years means all)
                year_ok = not getattr(config, 'allowed_years', None) or (year_value and year_value in config.allowed_years)
                
                features_dict[config.feature_key] = (course_ok and year_ok)
        return features_dict


class LoginSerializer(serializers.Serializer):
    login_id = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)
    confirm_password = serializers.CharField(write_only=True, trim_whitespace=False)

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
    pact_score = serializers.ReadOnlyField()

    class Meta:
        model = Student
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        if request and request.user and getattr(request.user, 'role', '') == 'student':
            ret.pop('category', None)
        return ret

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
    
    package = serializers.SerializerMethodField()
    listing_type = serializers.SerializerMethodField()

    class Meta:
        model = ExternalClickLog
        fields = '__all__'

    def get_package(self, obj):
        from apps.jobs.models import Job
        job = Job.objects.filter(external_link=obj.external_url).first()
        if not job:
            job = Job.objects.filter(role__iexact=obj.job_title, company_name__iexact=obj.company_name).first()
        return job.numeric_package if job else 0.00

    def get_listing_type(self, obj):
        from apps.jobs.models import Job
        job = Job.objects.filter(external_link=obj.external_url).first()
        if not job:
            job = Job.objects.filter(role__iexact=obj.job_title, company_name__iexact=obj.company_name).first()
        return job.listing_type if job else 'job'

class BulkAssignSerializer(serializers.Serializer):
    student_ids = serializers.ListField(child=serializers.UUIDField())

class AssignmentStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['assigned', 'applied', 'shortlisted', 'rejected', 'selected'])


class LearningQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningQuestion
        fields = ['id', 'prompt', 'options', 'correct_option', 'points', 'order']

    def validate(self, attrs):
        options = attrs.get('options') or []
        correct_option = attrs.get('correct_option', 0)
        if len(options) < 2:
            raise serializers.ValidationError({'options': 'Add at least two options.'})
        if correct_option < 0 or correct_option >= len(options):
            raise serializers.ValidationError({'correct_option': 'Correct option must match one of the options.'})
        return attrs


class LearningAssignmentSerializer(serializers.ModelSerializer):
    questions = LearningQuestionSerializer(many=True)
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = LearningAssignment
        fields = ['id', 'course', 'title', 'description', 'duration_minutes', 'questions', 'question_count', 'created_at', 'updated_at']

    def get_question_count(self, obj):
        prefetched = getattr(obj, '_prefetched_objects_cache', {})
        if 'questions' in prefetched:
            return len(prefetched['questions'])
        return obj.questions.count()

    def create(self, validated_data):
        questions = validated_data.pop('questions', [])
        assignment = LearningAssignment.objects.create(**validated_data)
        for index, question in enumerate(questions):
            question.pop('order', None)
            LearningQuestion.objects.create(assignment=assignment, order=index, **question)
        return assignment

    def update(self, instance, validated_data):
        questions = validated_data.pop('questions', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if questions is not None:
            instance.questions.all().delete()
            for index, question in enumerate(questions):
                question.pop('order', None)
                LearningQuestion.objects.create(assignment=instance, order=index, **question)
        return instance


class StudentLearningAnswerSerializer(serializers.ModelSerializer):
    question_prompt = serializers.CharField(source='question.prompt', read_only=True)
    options = serializers.JSONField(source='question.options', read_only=True)
    correct_option = serializers.IntegerField(source='question.correct_option', read_only=True)

    class Meta:
        model = StudentLearningAnswer
        fields = ['id', 'question', 'question_prompt', 'options', 'selected_option', 'correct_option', 'is_correct', 'awarded_points']


class StudentLearningAssignmentSerializer(serializers.ModelSerializer):
    assignment_title = serializers.CharField(source='assignment.title', read_only=True)
    assignment_description = serializers.CharField(source='assignment.description', read_only=True)
    course = serializers.CharField(source='assignment.course', read_only=True)
    duration_minutes = serializers.IntegerField(source='assignment.duration_minutes', read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_reg = serializers.CharField(source='student.registration_number', read_only=True)
    student_course = serializers.CharField(source='student.course', read_only=True)
    percentage = serializers.ReadOnlyField()
    answers = StudentLearningAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = StudentLearningAssignment
        fields = [
            'id', 'assignment', 'assignment_title', 'assignment_description', 'course',
            'duration_minutes', 'student', 'student_name', 'student_reg', 'student_course',
            'status', 'due_at', 'score', 'total_points', 'percentage', 'submitted_at',
            'assigned_at', 'answers',
        ]


class LearningAssignmentSubmitSerializer(serializers.Serializer):
    answers = serializers.DictField(
        child=serializers.IntegerField(min_value=0),
        help_text='Map question id to selected option index.',
    )


class LearningAssignmentBulkAssignSerializer(serializers.Serializer):
    assignment_id = serializers.UUIDField()
    student_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)
    due_at = serializers.DateTimeField(required=False, allow_null=True)

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


class StudentFeatureConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentFeatureConfig
        fields = ['id', 'feature_key', 'display_name', 'description', 'is_enabled', 'allowed_departments', 'allowed_years', 'allowed_courses']

