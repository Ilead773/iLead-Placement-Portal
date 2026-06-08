from datetime import datetime, timezone
from decimal import Decimal
from apps.profiles.models import StudentProfile

def check_eligibility(student, job, ignore_profile_resume=False):
    """
    Evaluates a student against a job's eligibility rules.
    Takes a core.Student instance.
    
    Returns: { 'eligible': bool, 'failing_checks': [], 'passing_checks': [], 'match_score': float }
    """


    failing_checks = []
    passing_checks = []
    
    rules = job.eligibility_rules
    
    # 1. Profile Complete Check
    # Check if a StudentProfile exists and its completion_score
    try:
        profile = student.resume_profile
        completion_score = profile.completion_score
        
        if completion_score < 0.6: # Assume 60% is "complete enough"
            if not ignore_profile_resume:
                 failing_checks.append({
                    'check_name': 'profile_complete',
                    'reason': f'Your resume profile is only {completion_score:.0%} complete.',
                    'how_to_fix': 'Complete your professional summary, skills, and experience in your profile.'
                })
        else:
            passing_checks.append('profile_complete')
    except StudentProfile.DoesNotExist:
        if not ignore_profile_resume:
            failing_checks.append({
                'check_name': 'profile_complete',
                'reason': 'You have not created a professional resume profile.',
                'how_to_fix': 'Go to My Profile to set up your resume data.'
            })
        profile = None

    # 1.5 Active/Primary Resume Check
    from apps.resumes.models import BuiltResume, ResumeUpload
    has_primary_built = BuiltResume.objects.filter(student=student, is_primary=True, is_deleted=False).exists()
    has_primary_uploaded = ResumeUpload.objects.filter(student=student, is_primary=True, is_deleted=False).exists()
    if not (has_primary_built or has_primary_uploaded):
        if not ignore_profile_resume:
            failing_checks.append({
                'check_name': 'active_resume',
                'reason': 'You do not have an active resume.',
                'how_to_fix': 'Go to My Resumes to generate a resume or upload a PDF, and set it as active.'
            })
    else:
        passing_checks.append('active_resume')

    # 2. CGPA Check
    raw_min_cgpa = rules.get('min_cgpa', 0)
    try:
        min_cgpa = float(raw_min_cgpa) if raw_min_cgpa not in (None, "") else 0.0
    except (ValueError, TypeError):
        min_cgpa = 0.0

    if student.cgpa is None or float(student.cgpa) < min_cgpa:
        failing_checks.append({
            'check_name': 'cgpa',
            'reason': f'Your CGPA ({student.cgpa or 0}) is below the required minimum ({min_cgpa}).',
            'how_to_fix': 'Maintain higher academic standards.'
        })
    else:
        passing_checks.append('cgpa')

    # 2.5 Attendance Check
    raw_min_attendance = rules.get('min_attendance', 0)
    try:
        min_attendance = float(raw_min_attendance) if raw_min_attendance not in (None, "") else 0.0
    except (ValueError, TypeError):
        min_attendance = 0.0

    if min_attendance > 0:
        student_attendance = float(student.attendance or 0)
        if student_attendance < min_attendance:
            failing_checks.append({
                'check_name': 'attendance',
                'reason': f'Your Attendance ({student_attendance}%) is below the required minimum ({min_attendance}%).',
                'how_to_fix': f'Attend classes to improve your attendance above {min_attendance}%.'
            })
        else:
            passing_checks.append('attendance')
    else:
        passing_checks.append('attendance')

    # 2.6 Backlogs Check
    raw_max_backlogs = rules.get('max_backlogs', None)
    if raw_max_backlogs not in (None, ""):
        try:
            max_backlogs = int(raw_max_backlogs)
        except (ValueError, TypeError):
            max_backlogs = None
    else:
        max_backlogs = None

    if max_backlogs is not None:
        student_backlogs = int(student.backlogs_count or 0)
        if student_backlogs > max_backlogs:
            failing_checks.append({
                'check_name': 'backlogs',
                'reason': f'Your active backlogs count ({student_backlogs}) is above the allowed maximum ({max_backlogs}).',
                'how_to_fix': f'Clear your backlogs to meet the maximum limit of {max_backlogs}.'
            })
        else:
            passing_checks.append('backlogs')
    else:
        passing_checks.append('backlogs')

    # 3. Branch/Stream Check (Course eligibility verification)
    allowed_branches = rules.get('allowed_branches', [])
    if allowed_branches:
        student_course = (student.course or '').strip().lower()
        allowed_branches_lower = [b.strip().lower() for b in allowed_branches if b]
        if student_course not in allowed_branches_lower:
            failing_checks.append({
                'check_name': 'branch',
                'reason': f'Your course ({student.course or "Not specified"}) is not eligible for this role.',
                'how_to_fix': f'This job is only open to students in: {", ".join(allowed_branches)}.'
            })
        else:
            passing_checks.append('branch')
    else:
        passing_checks.append('branch')

    # 3.5 Category Check
    student_cat = student.category or 'C'
    job_cat = getattr(job, 'category', 'C') or 'C'
    
    is_cat_eligible = False
    if job_cat == 'Own':
        is_cat_eligible = True
    elif student_cat == 'A':
        is_cat_eligible = True
    elif student_cat == 'B':
        if job_cat in ['B', 'C']:
            is_cat_eligible = True
    elif student_cat == 'C':
        if job_cat == 'C':
            is_cat_eligible = True

    if not is_cat_eligible:
        failing_checks.append({
            'check_name': 'category',
            'reason': f'Your Category ({student_cat}) does not allow you to apply to a Category {job_cat} opportunity.',
            'how_to_fix': f'Category {student_cat} students can only apply to: ' + ('B and C' if student_cat == 'B' else 'C') + ' category companies.'
        })
    else:
        passing_checks.append('category')

    # 4. Skills Check
    # Check against the Skill model related to StudentProfile
    required_skills = [s.lower() for s in rules.get('required_skills', [])]
    if profile:
        student_skills = [s.name.lower() for s in profile.skills.all()]
        missing_skills = [s for s in required_skills if s not in student_skills]
        
        if missing_skills:
            failing_checks.append({
                'check_name': 'skills',
                'reason': f'Missing required skills: {", ".join(missing_skills)}.',
                'how_to_fix': 'Add these skills to your profile and resume.'
            })
        else:
            passing_checks.append('skills')
    else:
        if required_skills:
            failing_checks.append({
                'check_name': 'skills',
                'reason': 'Skills could not be verified (no profile found).',
                'how_to_fix': 'Create a profile to verify your skills.'
            })

    # 5. Graduation Year Check
    allowed_years = rules.get('allowed_years', [])
    if allowed_years and student.passing_year not in allowed_years:
        failing_checks.append({
            'check_name': 'graduation_year',
            'reason': f'Batch {student.passing_year} is not eligible for this role.',
            'how_to_fix': f'Eligible batches: {", ".join(map(str, allowed_years))}'
        })
    else:
        passing_checks.append('graduation_year')

    # 6. Deadline Check
    if datetime.now(timezone.utc) > job.application_deadline:
        failing_checks.append({
            'check_name': 'deadline',
            'reason': 'The deadline for this application has passed.',
            'how_to_fix': 'No further applications are being accepted.'
        })
    else:
        passing_checks.append('deadline')

    # 7. Job Active Check
    if job.status != 'active':
        failing_checks.append({
            'check_name': 'job_active',
            'reason': f'This job is currently {job.status}.',
            'how_to_fix': 'Wait for the status to change to active.'
        })
    else:
        passing_checks.append('job_active')

    # Calculate match_score
    skill_score = 1.0
    if required_skills and profile:
        matched = len([s for s in required_skills if s in student_skills])
        skill_score = matched / len(required_skills)
    elif required_skills:
        skill_score = 0.0
        
    cgpa_val = float(student.cgpa or 0)
    cgpa_score = min(cgpa_val / 10.0, 1.0)
    
    match_score = round((0.7 * skill_score) + (0.3 * cgpa_score), 3)

    return {
        'eligible': len(failing_checks) == 0,
        'failing_checks': failing_checks,
        'passing_checks': passing_checks,
        'match_score': match_score
    }
