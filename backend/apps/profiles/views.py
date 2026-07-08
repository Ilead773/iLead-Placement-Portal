# apps/profiles/views.py
"""API views for student profile management."""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.conf import settings

from core.permissions import IsStudentUser
from .models import StudentProfile, Skill, Experience, Project, Education, Certification, Achievement, ExtracurricularActivity
from .serializers import (
    StudentProfileSerializer, StudentProfileUpdateSerializer,
    SkillSerializer, ExperienceSerializer, ProjectSerializer,
    EducationSerializer, CertificationSerializer, AchievementSerializer,
    ExtracurricularActivitySerializer,
)
from .rules import ProfileCompletionValidator


class ProfileViewSet(viewsets.ViewSet):
    """Student profile CRUD with completion tracking."""
    permission_classes = [IsAuthenticated]

    def get_profile(self, request):
        """GET /profiles/me/ — Get or create the current student's profile."""
        student = getattr(request.user, 'student_profile', None)
        if not student:
            return Response({'error': 'No student record found.'}, status=404)

        profile, created = StudentProfile.objects.get_or_create(student=student)
        if created:
            profile.recalculate_completion()

        serializer = StudentProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)

    def update_profile(self, request):
        """PUT /profiles/me/ — Update profile fields."""
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        serializer = StudentProfileUpdateSerializer(profile, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save()
        profile.recalculate_completion()
        return Response(StudentProfileSerializer(profile, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def completion(self, request):
        """GET /profiles/me/completion/ — Get detailed completion info."""
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        validator = ProfileCompletionValidator()
        is_valid, errors, score = validator.validate_profile(profile)
        suggestions = validator.get_suggestions(profile)
        return Response({
            'completion_score': score,
            'is_valid': is_valid,
            'errors': errors,
            'suggestions': suggestions,
            'can_generate_resume': validator.can_generate_resume(profile),
        })

    def upload_photo(self, request):
        """POST /profiles/me/photo/ — Upload a profile picture."""
        student = getattr(request.user, 'student_profile', None)
        if not student:
            return Response({'error': 'No student record found.'}, status=404)
        profile, _ = StudentProfile.objects.get_or_create(student=student)

        if 'profile_picture' not in request.FILES:
            return Response({'error': 'No image file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        file_obj = request.FILES['profile_picture']
        if file_obj.size > settings.MAX_PROFILE_PICTURE_SIZE:
            max_size_mb = settings.MAX_PROFILE_PICTURE_SIZE / (1024 * 1024)
            max_size_str = f"{max_size_mb:.0f}MB" if max_size_mb.is_integer() else f"{max_size_mb:.1f}MB"
            return Response(
                {'error': f'Profile picture size exceeds the maximum limit of {max_size_str}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delete old picture file if it exists
        if profile.profile_picture:
            profile.profile_picture.delete(save=False)

        profile.profile_picture = file_obj
        profile.save(update_fields=['profile_picture'])
        serializer = StudentProfileSerializer(profile, context={'request': request})
        return Response({'profile_picture': serializer.data.get('profile_picture')}, status=status.HTTP_200_OK)

    def remove_photo(self, request):
        """DELETE /profiles/me/photo/ — Remove the profile picture."""
        student = getattr(request.user, 'student_profile', None)
        if not student:
            return Response({'error': 'No student record found.'}, status=404)
        profile = get_object_or_404(StudentProfile, student=student)
        if profile.profile_picture:
            profile.profile_picture.delete(save=False)
            profile.profile_picture = None
            profile.save(update_fields=['profile_picture'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class SkillViewSet(viewsets.ViewSet):
    """CRUD for student skills."""
    permission_classes = [IsAuthenticated, IsStudentUser]

    def list_skills(self, request):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        skills = profile.skills.all()
        return Response(SkillSerializer(skills, many=True).data)

    def add_skill(self, request):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        serializer = SkillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(profile=profile)
        profile.recalculate_completion()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update_skill(self, request, pk=None):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        skill = get_object_or_404(Skill, id=pk, profile=profile)
        serializer = SkillSerializer(skill, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        profile.recalculate_completion()
        return Response(serializer.data)

    def remove_skill(self, request, pk=None):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        skill = get_object_or_404(Skill, id=pk, profile=profile)
        skill.soft_delete(user=request.user)
        profile.recalculate_completion()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ExperienceViewSet(viewsets.ViewSet):
    """CRUD for work experience."""
    permission_classes = [IsAuthenticated, IsStudentUser]

    def list_experiences(self, request):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        return Response(ExperienceSerializer(profile.experiences.all(), many=True).data)

    def add_experience(self, request):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        serializer = ExperienceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(profile=profile)
        profile.recalculate_completion()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update_experience(self, request, pk=None):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        exp = get_object_or_404(Experience, id=pk, profile=profile)
        serializer = ExperienceSerializer(exp, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        profile.recalculate_completion()
        return Response(serializer.data)

    def remove_experience(self, request, pk=None):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        exp = get_object_or_404(Experience, id=pk, profile=profile)
        exp.soft_delete(user=request.user)
        profile.recalculate_completion()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectViewSet(viewsets.ViewSet):
    """CRUD for student projects."""
    permission_classes = [IsAuthenticated, IsStudentUser]

    def list_projects(self, request):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        return Response(ProjectSerializer(profile.projects.all(), many=True).data)

    def add_project(self, request):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        serializer = ProjectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(profile=profile)
        profile.recalculate_completion()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update_project(self, request, pk=None):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        proj = get_object_or_404(Project, id=pk, profile=profile)
        serializer = ProjectSerializer(proj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        profile.recalculate_completion()
        return Response(serializer.data)

    def remove_project(self, request, pk=None):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        proj = get_object_or_404(Project, id=pk, profile=profile)
        proj.soft_delete(user=request.user)
        profile.recalculate_completion()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EducationViewSet(viewsets.ViewSet):
    """CRUD for student education."""
    permission_classes = [IsAuthenticated, IsStudentUser]

    def list_education(self, request):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        return Response(EducationSerializer(profile.education_entries.all(), many=True).data)

    def add_education(self, request):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        serializer = EducationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(profile=profile)
        profile.recalculate_completion()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update_education(self, request, pk=None):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        edu = get_object_or_404(Education, id=pk, profile=profile)
        serializer = EducationSerializer(edu, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        profile.recalculate_completion()
        return Response(serializer.data)

    def remove_education(self, request, pk=None):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        edu = get_object_or_404(Education, id=pk, profile=profile)
        edu.soft_delete(user=request.user)
        profile.recalculate_completion()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CertificationViewSet(viewsets.ViewSet):
    """CRUD for student certifications."""
    permission_classes = [IsAuthenticated, IsStudentUser]

    def list_certifications(self, request):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        return Response(CertificationSerializer(profile.certifications.all(), many=True).data)

    def add_certification(self, request):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        serializer = CertificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(profile=profile)
        profile.recalculate_completion()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update_certification(self, request, pk=None):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        cert = get_object_or_404(Certification, id=pk, profile=profile)
        serializer = CertificationSerializer(cert, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        profile.recalculate_completion()
        return Response(serializer.data)

    def remove_certification(self, request, pk=None):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        cert = get_object_or_404(Certification, id=pk, profile=profile)
        cert.soft_delete(user=request.user)
        profile.recalculate_completion()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AchievementViewSet(viewsets.ViewSet):
    """CRUD for student achievements."""
    permission_classes = [IsAuthenticated, IsStudentUser]

    def list_achievements(self, request):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        return Response(AchievementSerializer(profile.achievements.all(), many=True).data)

    def add_achievement(self, request):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        serializer = AchievementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(profile=profile)
        profile.recalculate_completion()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update_achievement(self, request, pk=None):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        ach = get_object_or_404(Achievement, id=pk, profile=profile)
        serializer = AchievementSerializer(ach, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        profile.recalculate_completion()
        return Response(serializer.data)

    def remove_achievement(self, request, pk=None):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        ach = get_object_or_404(Achievement, id=pk, profile=profile)
        ach.soft_delete(user=request.user)
        profile.recalculate_completion()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ExtracurricularActivityViewSet(viewsets.ViewSet):
    """CRUD for student extracurricular activities."""
    permission_classes = [IsAuthenticated, IsStudentUser]

    def list_activities(self, request):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        return Response(ExtracurricularActivitySerializer(profile.extracurricular_activities.all(), many=True).data)

    def add_activity(self, request):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        serializer = ExtracurricularActivitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(profile=profile)
        profile.recalculate_completion()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update_activity(self, request, pk=None):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        act = get_object_or_404(ExtracurricularActivity, id=pk, profile=profile)
        serializer = ExtracurricularActivitySerializer(act, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        profile.recalculate_completion()
        return Response(serializer.data)

    def remove_activity(self, request, pk=None):
        student = request.user.student_profile
        profile = get_object_or_404(StudentProfile, student=student)
        act = get_object_or_404(ExtracurricularActivity, id=pk, profile=profile)
        act.soft_delete(user=request.user)
        profile.recalculate_completion()
        return Response(status=status.HTTP_204_NO_CONTENT)


