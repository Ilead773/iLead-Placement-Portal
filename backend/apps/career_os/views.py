from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import CareerProfile, Course, Skill, StudentSkill, CourseSkill
from .services import calculate_gap_analysis, generate_roadmap
from core.models import Student

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_profile(request):
    """Submit student profile and skills."""
    data = request.data
    course_id = data.get('courseId')
    skills_data = data.get('skills', [])

    try:
        student = request.user.student_profile
    except Student.DoesNotExist:
        return Response({"error": "User does not have a student profile."}, status=400)

    course = get_object_or_404(Course, id=course_id)
    
    profile, created = CareerProfile.objects.get_or_create(student=student)
    profile.course = course
    profile.save()

    # Clear old skills and add new ones
    profile.skills.all().delete()
    for s_data in skills_data:
        # Dynamically find or create the skill to support any custom/placement profile skills
        skill_obj, _ = Skill.objects.get_or_create(
            name=s_data['name'],
            defaults={'category': 'Technical'}
        )
        StudentSkill.objects.create(
            profile=profile,
            skill=skill_obj,
            level=s_data['level']
        )

    return Response({
        "profileId": str(profile.id),
        "timestamp": profile.updated_at
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_gap_analysis(request, profile_id):
    profile = get_object_or_404(CareerProfile, id=profile_id)
    # Security check: only own profile or admin
    if profile.student.user != request.user and not request.user.is_staff:
        return Response({"error": "Unauthorized"}, status=403)
        
    result = calculate_gap_analysis(profile)
    return Response(result)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_roadmap(request, profile_id):
    profile = get_object_or_404(CareerProfile, id=profile_id)
    # Security check
    if profile.student.user != request.user and not request.user.is_staff:
        return Response({"error": "Unauthorized"}, status=403)
        
    result = generate_roadmap(profile)
    return Response(result)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_courses(request):
    courses = Course.objects.all().values('id', 'name', 'category')
    return Response({"courses": list(courses)})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_required_skills(request, course_id):
    course = get_object_or_404(Course, id=course_id)
    skills = CourseSkill.objects.filter(course=course).select_related('skill')
    result = [
        {
            "skillId": str(cs.skill.id),
            "name": cs.skill.name,
            "requiredLevel": cs.required_level,
            "weight": float(cs.weight)
        } for cs in skills
    ]
    return Response({"requiredSkills": result})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_career_profile(request):
    try:
        student = request.user.student_profile
        default_course_id = None
        if student.course:
            course_str = student.course.strip()
            # Clean dots for matching (e.g. "B.Sc" -> "BSc", "B.Tech" -> "BTech")
            clean_course = course_str.replace('.', '').strip()
            
            # 1. Try direct icontains match (e.g. "BCA" in "BSc in Computer Application (BCA)")
            matched_course = Course.objects.filter(name__icontains=clean_course).first()
            
            # 2. If no direct match, use smart fallback mapping for general streams
            if not matched_course:
                fallback_map = {
                    'MBA': 'BBA',  # Fallback business stream
                    'BTech': 'BSc in Cyber Security',  # Fallback tech stream
                    'BDes': 'BSc in Interior Design',  # Fallback design stream
                    'BA': 'BSc in Media Science',  # Fallback arts/media stream
                }
                fallback_name = fallback_map.get(clean_course)
                if fallback_name:
                    matched_course = Course.objects.filter(name__iexact=fallback_name).first()
            
            if matched_course:
                default_course_id = str(matched_course.id)

        # Get default skills (from existing CareerProfile or fall back to resume/placement StudentProfile)
        default_skills = []
        try:
            profile = CareerProfile.objects.get(student=student)
            default_skills = [
                {"name": s.skill.name, "level": s.level}
                for s in profile.skills.all().select_related('skill')
            ]
            return Response({
                "profileId": str(profile.id),
                "defaultCourseId": default_course_id or (str(profile.course.id) if profile.course else None),
                "defaultSkills": default_skills
            })
        except CareerProfile.DoesNotExist:
            from apps.profiles.models import StudentProfile
            try:
                res_profile = StudentProfile.objects.get(student=student)
                proficiency_map = {
                    'Beginner': 2,
                    'Intermediate': 3,
                    'Advanced': 4,
                    'Expert': 5
                }
                for ps in res_profile.skills.filter(is_deleted=False):
                    default_skills.append({
                        "name": ps.name,
                        "level": proficiency_map.get(ps.proficiency, 3)
                    })
            except StudentProfile.DoesNotExist:
                pass

            return Response({
                "profileId": None,
                "defaultCourseId": default_course_id,
                "defaultSkills": default_skills
            })
    except Student.DoesNotExist:
        return Response({"profileId": None, "defaultCourseId": None, "defaultSkills": []})
