from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.models import Course
from .models import (
    ScheduledClass,
    AttendanceEvent,
    Attendance,
    NorthStarAssignment,
    NorthStarQuestion,
    AssignmentSubmission,
    CourseProgress
)

User = get_user_model()

class UserSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'name', 'email', 'role')

class NorthStarCourseSerializer(serializers.ModelSerializer):
    # Support department field for frontend compatibility by mapping it to category
    department = serializers.CharField(source='category', required=False)

    class Meta:
        model = Course
        fields = ('id', 'name', 'category', 'department')
        extra_kwargs = {
            'category': {'required': False, 'allow_blank': True}
        }

    def create(self, validated_data):
        # Extract source field 'category' if written as 'category'
        # If write-only or passed as category via source mapping, it works automatically
        # Ensure category is set if category is missing but department is supplied
        if 'category' not in validated_data and 'department' in validated_data:
            validated_data['category'] = validated_data['department']
        return super().create(validated_data)

class ScheduledClassSerializer(serializers.ModelSerializer):
    courses_details = NorthStarCourseSerializer(source='courses', many=True, read_only=True)
    course_name = serializers.SerializerMethodField()
    host_name = serializers.CharField(source='host.name', read_only=True)
    is_ended = serializers.SerializerMethodField()

    class Meta:
        model = ScheduledClass
        fields = '__all__'
        read_only_fields = ('zoom_meeting_id', 'zoom_join_url', 'zoom_start_url', 'host')

    def get_course_name(self, obj):
        courses = list(obj.courses.values_list('name', flat=True))
        if not courses and obj.course:
            return obj.course.name
        return ", ".join(courses)

    def get_is_ended(self, obj):
        from django.utils import timezone
        return obj.end_time <= timezone.now()

class AttendanceEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceEvent
        fields = '__all__'

class AttendanceSerializer(serializers.ModelSerializer):
    student_details = UserSimpleSerializer(source='student', read_only=True)
    class_title = serializers.CharField(source='scheduled_class.title', read_only=True)
    class_start_time = serializers.DateTimeField(source='scheduled_class.start_time', read_only=True)
    course_name = serializers.SerializerMethodField()
    attendance_percent = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = '__all__'
        read_only_fields = ('marked_via', 'marked_by')

    def get_attendance_percent(self, obj):
        class_duration = int((obj.scheduled_class.end_time - obj.scheduled_class.start_time).total_seconds() / 60)
        if class_duration <= 0:
            class_duration = 60
        pct = (obj.total_duration_minutes / class_duration) * 100
        return round(min(100.0, max(0.0, pct)), 1)

    def get_course_name(self, obj):
        student_course = getattr(obj.student.student_profile, 'course', None) if hasattr(obj.student, 'student_profile') else None
        if student_course:
            return student_course
        if obj.scheduled_class.course:
            return obj.scheduled_class.course.name
        first_course = obj.scheduled_class.courses.first()
        return first_course.name if first_course else ""

class NorthStarQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = NorthStarQuestion
        fields = ('id', 'prompt', 'options', 'correct_option', 'points', 'order')

class NorthStarAssignmentSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.name', read_only=True)
    creator_name = serializers.CharField(source='created_by.name', read_only=True)
    questions = NorthStarQuestionSerializer(many=True, required=False)

    class Meta:
        model = NorthStarAssignment
        fields = '__all__'
        read_only_fields = ('created_by',)
        
    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        assignment = NorthStarAssignment.objects.create(**validated_data)
        
        for q_data in questions_data:
            NorthStarQuestion.objects.create(assignment=assignment, **q_data)
            
        return assignment

class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    student_details = UserSimpleSerializer(source='student', read_only=True)
    assignment_title = serializers.CharField(source='assignment.title', read_only=True)
    due_date = serializers.DateTimeField(source='assignment.due_date', read_only=True)

    class Meta:
        model = AssignmentSubmission
        fields = '__all__'
        read_only_fields = ('student', 'submitted_at', 'score', 'feedback', 'status')

class AssignmentGradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssignmentSubmission
        fields = ('score', 'feedback', 'status')

    def validate(self, data):
        # When grading, status must be set to 'graded' if not specified
        data['status'] = 'graded'
        return data

class CourseProgressSerializer(serializers.ModelSerializer):
    student_details = UserSimpleSerializer(source='student', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)

    class Meta:
        model = CourseProgress
        fields = '__all__'
