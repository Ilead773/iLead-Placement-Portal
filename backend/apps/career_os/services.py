from typing import List, Dict, Any
from apps.career_os.models import CareerProfile, Course, Skill, CourseSkill, StudentSkill, Roadmap, RoadmapPhase, PhaseSkill, LearningResource
from .ai_enhancer import AICareerIntelligenceEnhancer

def calculate_gap_analysis(profile: CareerProfile) -> Dict[str, Any]:
    if not profile.course:
        return {"error": "Student has not selected a course."}

    course = profile.course
    student_skills_map = {ss.skill.name: ss.level for ss in profile.skills.select_related('skill').all()}
    
    required_skills = course.required_skills.select_related('skill').all()
    if not required_skills:
        return {"error": f"No required skills defined for course: {course.name}"}

    gaps = []
    skills_with_no_gap = 0
    total_skills = len(required_skills)

    for req in required_skills:
        student_level = student_skills_map.get(req.skill.name, 0)
        gap_size = req.required_level - student_level
        
        if gap_size > 0:
            priority = gap_size * float(req.weight)
            
            status = "LOW"
            if priority >= 0.20:
                status = "CRITICAL"
            elif priority >= 0.15:
                status = "HIGH"
            elif priority >= 0.10:
                status = "MEDIUM"

            gaps.append({
                "skill": req.skill.name,
                "currentLevel": student_level,
                "requiredLevel": req.required_level,
                "gapSize": gap_size,
                "weight": float(req.weight),
                "priority": priority,
                "status": status
            })
        else:
            skills_with_no_gap += 1

    # Sort gaps by priority DESC
    gaps.sort(key=lambda x: x["priority"], reverse=True)
    
    # Assign ranks
    for i, gap in enumerate(gaps):
        gap["rank"] = i + 1

    # Apply AI enhancement to gaps
    if gaps:
        try:
            student_name = profile.student.name
            course_name = course.name
            current_skills = [{"name": name, "level": lvl} for name, lvl in student_skills_map.items()]
            enhancer = AICareerIntelligenceEnhancer()
            gaps = enhancer.enhance_gaps(student_name, course_name, current_skills, gaps)
        except Exception as exc:
            logger.error(f"[AI_SERVICE] Failed to enhance gaps: {exc}")

    match_percentage = (skills_with_no_gap / total_skills * 100) if total_skills > 0 else 0

    # Generate AI motivational message
    motivation = {
        "message": f"Welcome back, {profile.student.name}! You have completed a solid match score of {round(match_percentage, 1)}%. Focus on your key gaps to progress further.",
        "nextStep": "Start with your first learning milestone today.",
        "progressTip": "Take it one phase at a time. Consistency beats intensity."
    }
    try:
        enhancer = AICareerIntelligenceEnhancer()
        motivation = enhancer.generate_motivational_message(
            profile.student.name,
            round(match_percentage, 1),
            len(gaps),
            gaps
        )
    except Exception as exc:
        pass

    return {
        "studentId": str(profile.student.id),
        "courseId": str(course.id),
        "gapAnalysis": {
            "totalGaps": len(gaps),
            "skillsWithNoGap": skills_with_no_gap,
            "skillsMatchPercentage": round(match_percentage, 1),
            "gaps": gaps,
            "summary": f"You have {len(gaps)} skill gaps. Focus on {gaps[0]['skill'] if gaps else 'nothing, you are great'} first.",
            "motivation": motivation
        }
    }


def generate_roadmap(profile: CareerProfile) -> Dict[str, Any]:
    gap_data = calculate_gap_analysis(profile)
    if "error" in gap_data:
        return gap_data

    gaps = gap_data["gapAnalysis"]["gaps"]
    
    # Simple deterministic phase distribution
    # Phase 1: Critical (Rank 1)
    # Phase 2: High (Rank 2, 3)
    # Phase 3: Medium (Rank 4, 5)
    # Phase 4: Low (Rank 6+)
    
    phases = [
        {"name": "Phase 1: Foundations", "duration_weeks": 4, "goal": "Master foundational gaps", "skills": []},
        {"name": "Phase 2: Core Skills", "duration_weeks": 6, "goal": "Master core gaps", "skills": []},
        {"name": "Phase 3: Advanced Skills", "duration_weeks": 7, "goal": "Master advanced gaps", "skills": []},
        {"name": "Phase 4: Specialization", "duration_weeks": 7, "goal": "Master specialized gaps", "skills": []},
    ]

    for gap in gaps:
        skill_obj = Skill.objects.get(name=gap["skill"])
        resources = LearningResource.objects.filter(skill=skill_obj)
        
        resources_list = [
            {
                "title": r.title,
                "platform": r.platform,
                "instructor": r.instructor,
                "estimatedHours": r.estimated_hours,
                "difficulty": r.difficulty,
                "link": r.url
            } for r in resources
        ]
        
        # Default hours if no resources
        total_hours = sum(r.estimated_hours for r in resources) if resources else (gap["gapSize"] * 20)
        
        skill_payload = {
            "rank": gap["rank"],
            "skillName": gap["skill"],
            "currentLevel": gap["currentLevel"],
            "targetLevel": gap["requiredLevel"],
            "learningResources": resources_list,
            "totalHours": total_hours,
            "milestones": [f"Learn basics of {gap['skill']}", f"Build a project with {gap['skill']}"]
        }
        
        if gap["status"] == "CRITICAL" or gap["rank"] == 1:
            phases[0]["skills"].append(skill_payload)
        elif gap["status"] == "HIGH" or gap["rank"] <= 3:
            phases[1]["skills"].append(skill_payload)
        elif gap["status"] == "MEDIUM" or gap["rank"] <= 5:
            phases[2]["skills"].append(skill_payload)
        else:
            phases[3]["skills"].append(skill_payload)

    # Clean up empty phases
    active_phases = []
    total_hours = 0
    total_weeks = 0
    for i, p in enumerate(phases):
        if p["skills"]:
            phase_hours = sum(s["totalHours"] for s in p["skills"])
            p["totalHours"] = phase_hours
            active_phases.append(p)
            total_hours += phase_hours
            total_weeks += p["duration_weeks"]

    # Enhance phases with AI personalization and week-by-week milestones
    if active_phases:
        try:
            student_name = profile.student.name
            course_name = profile.course.name
            current_skills = [{"name": name, "level": lvl} for name, lvl in student_skills_map.items()]
            enhancer = AICareerIntelligenceEnhancer()
            active_phases = enhancer.enhance_roadmap_phases(student_name, course_name, current_skills, active_phases)
        except Exception as exc:
            # Fallback to deterministic defaults
            for p in active_phases:
                p["personalizedDescription"] = p["goal"]
                p["whyNow"] = "Builds key prerequisite foundations."
                p["timelineMotivation"] = f"Spend {p['duration_weeks']} weeks focused on these milestones."
                for s in p["skills"]:
                    s["milestones"] = [
                        {
                            "week": w + 1,
                            "milestone": f"Week {w + 1} Focus",
                            "description": f"Master {s['skillName']} core concepts.",
                            "proof": "Complete practice quiz or write example script."
                        } for w in range(p["duration_weeks"])
                    ]

    return {
        "studentId": str(profile.student.id),
        "courseId": str(profile.course.id),
        "roadmap": {
            "totalPhases": len(active_phases),
            "estimatedWeeks": total_weeks,
            "estimatedHours": total_hours,
            "phases": active_phases,
            "summary": {
                "totalEstimatedWeeks": total_weeks,
                "totalEstimatedHours": total_hours,
                "hoursPerWeek": round(total_hours / total_weeks, 1) if total_weeks else 0,
                "skillsGainedCount": len(gaps),
            }
        }
    }
