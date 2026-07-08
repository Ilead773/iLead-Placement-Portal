# apps/profiles/admin.py
"""Admin registration for profile models."""

from django.contrib import admin
from .models import StudentProfile, Skill, Experience, Project, Education, Certification, Achievement, ExtracurricularActivity


class SkillInline(admin.TabularInline):
    model = Skill
    extra = 1
    fields = ['category', 'name', 'proficiency']


class ExperienceInline(admin.StackedInline):
    model = Experience
    extra = 0


class ProjectInline(admin.StackedInline):
    model = Project
    extra = 0


class EducationInline(admin.StackedInline):
    model = Education
    extra = 0


class CertificationInline(admin.TabularInline):
    model = Certification
    extra = 0


class AchievementInline(admin.StackedInline):
    model = Achievement
    extra = 0


class ExtracurricularActivityInline(admin.StackedInline):
    model = ExtracurricularActivity
    extra = 0



@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = [
        'student', 'phone', 'location', 'completion_score',
        'created_at', 'is_deleted',
    ]
    list_filter = ['completion_score', 'is_deleted']
    search_fields = ['student__name', 'student__email']
    readonly_fields = ['completion_score', 'created_at', 'updated_at']
    inlines = [
        SkillInline, ExperienceInline, ProjectInline, 
        EducationInline, CertificationInline, AchievementInline, 
        ExtracurricularActivityInline
    ]


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'proficiency', 'profile']
    list_filter = ['category', 'proficiency']
    search_fields = ['name', 'category']


@admin.register(Experience)
class ExperienceAdmin(admin.ModelAdmin):
    list_display = ['position', 'company', 'start_date', 'end_date', 'is_current']
    list_filter = ['is_current']


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'profile', 'date']
    search_fields = ['title']


@admin.register(Education)
class EducationAdmin(admin.ModelAdmin):
    list_display = ['degree', 'institution', 'field', 'graduation_date']


@admin.register(Certification)
class CertificationAdmin(admin.ModelAdmin):
    list_display = ['name', 'issuer', 'date']


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ['title', 'issuer', 'date']


@admin.register(ExtracurricularActivity)
class ExtracurricularActivityAdmin(admin.ModelAdmin):
    list_display = ['title', 'profile', 'date']

