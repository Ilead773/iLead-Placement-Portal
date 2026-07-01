from django.contrib import admin
from core.models import Course
from .models import (
    ScheduledClass,
    AttendanceEvent,
    Attendance,
    NorthStarAssignment,
    AssignmentSubmission,
    CourseProgress
)

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('name', 'category')
    list_filter = ('category',)
    search_fields = ('name', 'category')

@admin.register(ScheduledClass)
class ScheduledClassAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'start_time', 'end_time', 'zoom_meeting_id', 'host')
    list_filter = ('course', 'start_time', 'host')
    search_fields = ('title', 'course__name', 'zoom_meeting_id')

@admin.register(AttendanceEvent)
class AttendanceEventAdmin(admin.ModelAdmin):
    list_display = ('participant_name', 'participant_email', 'event_type', 'scheduled_class', 'timestamp')
    list_filter = ('event_type', 'timestamp', 'scheduled_class')
    search_fields = ('participant_name', 'participant_email', 'scheduled_class__title')

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('student', 'scheduled_class', 'status', 'total_duration_minutes', 'marked_via', 'updated_at')
    list_filter = ('status', 'marked_via', 'scheduled_class__course')
    search_fields = ('student__name', 'student__email', 'scheduled_class__title')

@admin.register(NorthStarAssignment)
class NorthStarAssignmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'due_date', 'max_score', 'created_by', 'created_at')
    list_filter = ('course', 'due_date')
    search_fields = ('title', 'course__name')

@admin.register(AssignmentSubmission)
class AssignmentSubmissionAdmin(admin.ModelAdmin):
    list_display = ('student', 'assignment', 'submitted_at', 'score', 'status')
    list_filter = ('status', 'assignment__course')
    search_fields = ('student__name', 'student__email', 'assignment__title')

@admin.register(CourseProgress)
class CourseProgressAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'completion_percent', 'attendance_percent', 'certificate_unlocked', 'last_updated')
    list_filter = ('certificate_unlocked', 'course')
    search_fields = ('student__name', 'student__email', 'course__name')
