# apps/placement_sessions/serializers.py
from rest_framework import serializers
from .models import PlacementSession, SessionAttendance, SessionAttendanceEvent


class PlacementSessionSerializer(serializers.ModelSerializer):
    host_name = serializers.CharField(source='host.name', read_only=True)
    duration_minutes = serializers.SerializerMethodField()
    attendance_count = serializers.SerializerMethodField()

    class Meta:
        model = PlacementSession
        fields = '__all__'
        read_only_fields = ['id', 'host', 'zoom_meeting_id', 'zoom_join_url', 'zoom_start_url',
                            'attendance_finalized', 'created_at', 'updated_at']

    def get_duration_minutes(self, obj):
        return obj.duration_minutes()

    def get_attendance_count(self, obj):
        return obj.attendance.filter(status__in=['present', 'late']).count()


class SessionAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    student_reg = serializers.SerializerMethodField()

    class Meta:
        model = SessionAttendance
        fields = '__all__'

    def get_student_reg(self, obj):
        try:
            return obj.student.student_profile.registration_number
        except Exception:
            return ''


class SessionAttendanceEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionAttendanceEvent
        fields = '__all__'
