import os
import sys
import csv
import django
import json
from uuid import UUID

# Setup Django
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from core.models import User, Student, Placement, PlacementAssignment, ExternalClickLog
from apps.jobs.models import Job, JobRound
from apps.applications.models import Application, ApplicationRound, ApplicationStatusHistory
from apps.profiles.models import StudentProfile, Skill, Project, Education, Certification, Achievement, Experience
from apps.templates_engine.models import ResumeTemplate
from apps.resumes.models import BuiltResume
from apps.interviews.models import (
    InterviewDomain, InterviewType, Competency, Question,
    MockInterviewSession, InterviewAnswer, InterviewFeedback
)

def clean_dict(d):
    """Recursively clean dict to convert UUIDs and datetimes to serializable types."""
    if isinstance(d, dict):
        return {k: clean_dict(v) for k, v in d.items()}
    elif isinstance(d, list):
        return [clean_dict(x) for x in d]
    elif isinstance(d, UUID):
        return str(d)
    elif hasattr(d, 'isoformat'):
        return d.isoformat()
    return d

def serialize_model(model_class, fields):
    data = []
    for obj in model_class.objects.all():
        row = {}
        for field in fields:
            val = getattr(obj, field)
            row[field] = clean_dict(val)
        data.append(row)
    return data

def main():
    print("Extracting data from local database...")

    # 1. Parse credentials CSV if available to make sure the student reg2025001 is included
    csv_student = None
    csv_path = os.path.join(os.path.dirname(__file__), '../../credentials_1779262820013.csv')
    if os.path.exists(csv_path):
        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get('Registration Number') or row.get('Registration Number') == 'REG2025001':
                        csv_student = {
                            'name': row.get('Name'),
                            'registration_number': row.get('Registration Number'),
                            'login_id': row.get('Login ID').lower(),
                            'email': row.get('Email'),
                            'password': row.get('Temporary Password')
                        }
                        print(f"Loaded student from CSV: {csv_student['name']} ({csv_student['login_id']})")
                        break
        except Exception as e:
            print(f"Warning: could not read CSV credentials: {e}")

    # Define fields to extract for each model
    users = serialize_model(User, [
        'id', 'login_id', 'email', 'name', 'role', 'is_staff', 'is_superuser',
        'temp_password_flag', 'password_reset_required', 'can_manage_students',
        'can_manage_placements', 'can_manage_resumes'
    ])
    
    # Set passwords for known users or default passwords
    for u in users:
        password = 'Student@1234'
        if u['login_id'] == 'admin':
            password = 'Admin@1234'
        elif u['login_id'] == 'coord01':
            password = 'Coord@1234'
        elif csv_student and u['login_id'] == csv_student['login_id']:
            password = csv_student['password']
        elif u['role'] == 'coordinator':
            password = 'Coord@1234'
        elif u['role'] == 'student':
            password = f"Student@{u['login_id'].upper()}"
        u['password'] = password

    # Ensure CSV student user is added
    if csv_student and not any(u['login_id'] == csv_student['login_id'] for u in users):
        csv_user_id = "00000000-0000-0000-0000-000000000001"
        users.append({
            'id': csv_user_id,
            'login_id': csv_student['login_id'],
            'email': csv_student['email'],
            'name': csv_student['name'],
            'role': 'student',
            'is_staff': False,
            'is_superuser': False,
            'temp_password_flag': True,
            'password_reset_required': True,
            'can_manage_students': False,
            'can_manage_placements': False,
            'can_manage_resumes': False,
            'password': csv_student['password']
        })
        print(f"Added CSV student {csv_student['login_id']} to User seed list")
    else:
        # Get existing user ID if present
        csv_user_id = next((u['id'] for u in users if u['login_id'] == csv_student['login_id']), None) if csv_student else None

    students = serialize_model(Student, [
        'id', 'user_id', 'name', 'registration_number', 'email', 'passing_year',
        'course', 'stream', 'semester', 'attendance', 'cgpa', 'phone_number',
        'year', 'category', 'is_category_manual', 'backlogs', 'backlogs_count',
        'training_attendance'
    ])

    # Ensure CSV student profile is added
    if csv_student and not any(s['registration_number'] == csv_student['registration_number'] for s in students):
        csv_student_id = "00000000-0000-0000-0000-000000000002"
        students.append({
            'id': csv_student_id,
            'user_id': csv_user_id,
            'name': csv_student['name'],
            'registration_number': csv_student['registration_number'],
            'email': csv_student['email'],
            'passing_year': 2025,
            'course': 'BCA',
            'stream': 'Computer Science',
            'semester': 6,
            'attendance': 85.0,
            'cgpa': 8.5,
            'phone_number': '',
            'year': '3rd',
            'category': 'A',
            'is_category_manual': False,
            'backlogs': False,
            'backlogs_count': 0,
            'training_attendance': 100.0
        })
        print(f"Added CSV student {csv_student['registration_number']} to Student seed list")

    profiles = serialize_model(StudentProfile, [
        'id', 'student_id', 'phone', 'location', 'professional_summary',
        'linkedin', 'github', 'portfolio'
    ])
    
    skills = serialize_model(Skill, ['id', 'profile_id', 'category', 'name', 'proficiency'])
    projects = serialize_model(Project, ['id', 'profile_id', 'title', 'description', 'technologies', 'link', 'date'])
    educations = serialize_model(Education, ['id', 'profile_id', 'institution', 'degree', 'field', 'graduation_date', 'gpa', 'honors'])
    certifications = serialize_model(Certification, ['id', 'profile_id', 'name', 'issuer', 'date', 'credential_url'])
    achievements = serialize_model(Achievement, ['id', 'profile_id', 'title', 'issuer', 'date', 'description'])
    experiences = serialize_model(Experience, ['id', 'profile_id', 'company', 'position', 'start_date', 'end_date', 'is_current', 'description', 'achievements'])

    templates = serialize_model(ResumeTemplate, ['id', 'name', 'version', 'description', 'html_template', 'css_styles', 'is_active', 'created_by_id'])
    resumes = serialize_model(BuiltResume, ['id', 'student_id', 'title', 'description', 'canonical_json', 'template_id', 'state', 'is_primary'])

    placements = serialize_model(Placement, [
        'id', 'company_name', 'position', 'salary', 'description', 'required_cgpa',
        'eligible_courses', 'eligible_semesters', 'application_deadline', 'created_by_id'
    ])
    placement_assignments = serialize_model(PlacementAssignment, ['id', 'placement_id', 'student_id', 'assigned_by_id', 'status'])

    jobs = serialize_model(Job, [
        'id', 'company_name', 'company_website', 'role', 'description', 'package',
        'location', 'job_type', 'listing_type', 'external_link', 'duration',
        'category', 'openings_count', 'hr_email', 'eligibility_rules',
        'application_deadline', 'status', 'email_sent', 'created_by_id'
    ])
    job_rounds = serialize_model(JobRound, ['id', 'job_id', 'round_number', 'round_name', 'round_type', 'is_elimination', 'passing_score', 'duration_minutes'])
    
    applications = serialize_model(Application, ['id', 'student_id', 'job_id', 'status', 'eligibility_snapshot', 'job_snapshot'])
    application_rounds = serialize_model(ApplicationRound, ['id', 'application_id', 'job_round_id', 'round_number', 'status', 'score'])

    domains = serialize_model(InterviewDomain, ['id', 'name', 'description', 'icon'])
    interview_types = serialize_model(InterviewType, ['id', 'domain_id', 'code', 'name', 'description', 'duration_minutes', 'questions_per_session'])
    competencies = serialize_model(Competency, ['id', 'interview_type_id', 'name', 'description', 'weight', 'mastery_keywords'])
    questions = serialize_model(Question, ['id', 'competency_id', 'text', 'question_type', 'difficulty_level', 'ideal_answer', 'evaluation_rubric', 'max_score'])
    sessions = serialize_model(MockInterviewSession, ['id', 'student_id', 'interview_type_id', 'status', 'started_at', 'completed_at', 'questions', 'use_voice'])
    answers = serialize_model(InterviewAnswer, ['id', 'session_id', 'question_id', 'question_number', 'answer_text', 'eval_status', 'score', 'evaluation_json', 'ai_feedback', 'confidence_score', 'time_taken_seconds'])
    feedbacks = serialize_model(InterviewFeedback, ['id', 'session_id', 'total_score', 'competency_scores', 'dimension_averages', 'strengths', 'weaknesses', 'feedback_summary'])

    output_code = f"""#!/usr/bin/env python
\"\"\"
Self-contained database seeding script for Railway deployment.
Seeds all 18+ users, 13+ student profiles, jobs, placements, applications,
and mock interview datasets.
\"\"\"
import os
import sys
import django
import json
from datetime import datetime
from django.utils import timezone

# Setup Django env
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import transaction
from core.models import User, Student, Placement, PlacementAssignment
from apps.jobs.models import Job, JobRound
from apps.applications.models import Application, ApplicationRound, ApplicationStatusHistory
from apps.profiles.models import StudentProfile, Skill, Project, Education, Certification, Achievement, Experience
from apps.templates_engine.models import ResumeTemplate
from apps.resumes.models import BuiltResume
from apps.interviews.models import (
    InterviewDomain, InterviewType, Competency, Question,
    MockInterviewSession, InterviewAnswer, InterviewFeedback
)

# JSON DATA REPRESENTATION
USERS = json.loads(r'''{json.dumps(users, indent=4)}''')
STUDENTS = json.loads(r'''{json.dumps(students, indent=4)}''')
PROFILES = json.loads(r'''{json.dumps(profiles, indent=4)}''')
SKILLS = json.loads(r'''{json.dumps(skills, indent=4)}''')
PROJECTS = json.loads(r'''{json.dumps(projects, indent=4)}''')
EDUCATIONS = json.loads(r'''{json.dumps(educations, indent=4)}''')
CERTIFICATIONS = json.loads(r'''{json.dumps(certifications, indent=4)}''')
ACHIEVEMENTS = json.loads(r'''{json.dumps(achievements, indent=4)}''')
EXPERIENCES = json.loads(r'''{json.dumps(experiences, indent=4)}''')

TEMPLATES = json.loads(r'''{json.dumps(templates, indent=4)}''')
RESUMES = json.loads(r'''{json.dumps(resumes, indent=4)}''')

PLACEMENTS = json.loads(r'''{json.dumps(placements, indent=4)}''')
PLACEMENT_ASSIGNMENTS = json.loads(r'''{json.dumps(placement_assignments, indent=4)}''')

JOBS = json.loads(r'''{json.dumps(jobs, indent=4)}''')
JOB_ROUNDS = json.loads(r'''{json.dumps(job_rounds, indent=4)}''')
APPLICATIONS = json.loads(r'''{json.dumps(applications, indent=4)}''')
APPLICATION_ROUNDS = json.loads(r'''{json.dumps(application_rounds, indent=4)}''')

DOMAINS = json.loads(r'''{json.dumps(domains, indent=4)}''')
INTERVIEW_TYPES = json.loads(r'''{json.dumps(interview_types, indent=4)}''')
COMPETENCIES = json.loads(r'''{json.dumps(competencies, indent=4)}''')
QUESTIONS = json.loads(r'''{json.dumps(questions, indent=4)}''')
SESSIONS = json.loads(r'''{json.dumps(sessions, indent=4)}''')
ANSWERS = json.loads(r'''{json.dumps(answers, indent=4)}''')
FEEDBACKS = json.loads(r'''{json.dumps(feedbacks, indent=4)}''')

def parse_date(date_str):
    if not date_str:
        return None
    try:
        if 'T' in date_str:
            clean_str = date_str.replace('Z', '+00:00')
            dt = datetime.fromisoformat(clean_str)
            if dt.tzinfo is None:
                from datetime import timezone as dt_timezone
                dt = timezone.make_aware(dt, dt_timezone.utc)
            return dt
        else:
            return datetime.fromisoformat(date_str).date()
    except Exception as e:
        print(f"Error parsing date {{date_str}}: {{e}}")
        return None

def seed_database():
    print("Starting database seeding...")
    
    with transaction.atomic():
        print("Cleaning old data...")
        
        def clear_model(model):
            if hasattr(model, 'all_objects'):
                model.all_objects.all().hard_delete()
            else:
                model.objects.all().delete()

        clear_model(InterviewFeedback)
        clear_model(InterviewAnswer)
        clear_model(MockInterviewSession)
        clear_model(Question)
        clear_model(Competency)
        clear_model(InterviewType)
        clear_model(InterviewDomain)
        
        clear_model(ApplicationRound)
        clear_model(ApplicationStatusHistory)
        clear_model(Application)
        clear_model(JobRound)
        clear_model(Job)
        
        clear_model(PlacementAssignment)
        clear_model(Placement)
        
        clear_model(BuiltResume)
        clear_model(ResumeTemplate)
        
        clear_model(Achievement)
        clear_model(Certification)
        clear_model(Education)
        clear_model(Project)
        clear_model(Skill)
        clear_model(Experience)
        clear_model(StudentProfile)
        clear_model(Student)
        clear_model(User)
        
        # 1. Create Users
        print("Creating Users...")
        for u in USERS:
            User.objects.create_user(
                id=u['id'],
                login_id=u['login_id'],
                email=u['email'],
                password=u['password'],
                name=u['name'],
                role=u['role'],
                temp_password_flag=u['temp_password_flag'],
                password_reset_required=u['password_reset_required'],
                is_staff=u['is_staff'],
                is_superuser=u['is_superuser'],
                can_manage_students=u['can_manage_students'],
                can_manage_placements=u['can_manage_placements'],
                can_manage_resumes=u['can_manage_resumes']
            )
            
        # 2. Create Students
        print("Creating Students...")
        for s in STUDENTS:
            Student.objects.create(
                id=s['id'],
                user_id=s['user_id'],
                name=s['name'],
                registration_number=s['registration_number'],
                email=s['email'],
                passing_year=s['passing_year'],
                course=s['course'],
                stream=s['stream'],
                semester=s['semester'],
                attendance=s['attendance'],
                cgpa=s['cgpa'],
                phone_number=s['phone_number'],
                year=s['year'],
                category=s['category'],
                is_category_manual=s['is_category_manual'],
                backlogs=s['backlogs'],
                backlogs_count=s['backlogs_count'],
                training_attendance=s['training_attendance']
            )

        # 3. Create Profiles, Skills, Projects, Educations, Certifications, Achievements, Experiences
        print("Creating Career Profiles & Student details...")
        for p in PROFILES:
            StudentProfile.objects.create(
                id=p['id'],
                student_id=p['student_id'],
                phone=p['phone'],
                location=p['location'],
                professional_summary=p['professional_summary'],
                linkedin=p['linkedin'],
                github=p['github'],
                portfolio=p['portfolio']
            )

        for sk in SKILLS:
            Skill.objects.create(
                id=sk['id'],
                profile_id=sk['profile_id'],
                category=sk['category'],
                name=sk['name'],
                proficiency=sk['proficiency']
            )

        for proj in PROJECTS:
            Project.objects.create(
                id=proj['id'],
                profile_id=proj['profile_id'],
                title=proj['title'],
                description=proj['description'],
                technologies=proj['technologies'],
                link=proj['link'],
                date=parse_date(proj['date'])
            )

        for edu in EDUCATIONS:
            Education.objects.create(
                id=edu['id'],
                profile_id=edu['profile_id'],
                institution=edu['institution'],
                degree=edu['degree'],
                field=edu['field'],
                graduation_date=parse_date(edu['graduation_date']),
                gpa=edu['gpa'],
                honors=edu['honors']
            )

        for cert in CERTIFICATIONS:
            Certification.objects.create(
                id=cert['id'],
                profile_id=cert['profile_id'],
                name=cert['name'],
                issuer=cert['issuer'],
                date=parse_date(cert['date']),
                credential_url=cert['credential_url']
            )

        for ach in ACHIEVEMENTS:
            Achievement.objects.create(
                id=ach['id'],
                profile_id=ach['profile_id'],
                title=ach['title'],
                issuer=ach['issuer'],
                date=parse_date(ach['date']),
                description=ach['description']
            )

        for exp in EXPERIENCES:
            Experience.objects.create(
                id=exp['id'],
                profile_id=exp['profile_id'],
                company=exp['company'],
                position=exp['position'],
                start_date=parse_date(exp['start_date']),
                end_date=parse_date(exp['end_date']),
                is_current=exp['is_current'],
                description=exp['description'],
                achievements=exp['achievements']
            )

        # 4. Create Templates & Resumes
        print("Creating Templates & Resumes...")
        for rt in TEMPLATES:
            ResumeTemplate.objects.create(
                id=rt['id'],
                name=rt['name'],
                version=rt['version'],
                description=rt['description'],
                html_template=rt['html_template'],
                css_styles=rt['css_styles'],
                is_active=rt['is_active'],
                created_by_id=rt['created_by_id']
            )

        for br in RESUMES:
            BuiltResume.objects.create(
                id=br['id'],
                student_id=br['student_id'],
                title=br['title'],
                description=br['description'],
                canonical_json=br['canonical_json'],
                template_id=br['template_id'],
                state=br['state'],
                is_primary=br['is_primary']
            )

        # 5. Create Placements & Assignments
        print("Creating Placement drives...")
        for pl in PLACEMENTS:
            Placement.objects.create(
                id=pl['id'],
                company_name=pl['company_name'],
                position=pl['position'],
                salary=pl['salary'],
                description=pl['description'],
                required_cgpa=pl['required_cgpa'],
                eligible_courses=pl['eligible_courses'],
                eligible_semesters=pl['eligible_semesters'],
                application_deadline=parse_date(pl['application_deadline']),
                created_by_id=pl['created_by_id']
            )

        for pa in PLACEMENT_ASSIGNMENTS:
            PlacementAssignment.objects.create(
                id=pa['id'],
                placement_id=pa['placement_id'],
                student_id=pa['student_id'],
                assigned_by_id=pa['assigned_by_id'],
                status=pa['status']
            )

        # 6. Create Jobs, JobRounds, Applications, ApplicationRounds
        print("Creating Jobs and Rounds...")
        for j in JOBS:
            Job.objects.create(
                id=j['id'],
                company_name=j['company_name'],
                company_website=j['company_website'],
                role=j['role'],
                description=j['description'],
                package=j['package'],
                location=j['location'],
                job_type=j['job_type'],
                listing_type=j['listing_type'],
                external_link=j['external_link'],
                duration=j['duration'],
                category=j['category'],
                openings_count=j['openings_count'],
                hr_email=j['hr_email'],
                eligibility_rules=j['eligibility_rules'],
                application_deadline=parse_date(j['application_deadline']),
                status=j['status'],
                email_sent=j['email_sent'],
                created_by_id=j['created_by_id']
            )

        for jr in JOB_ROUNDS:
            JobRound.objects.create(
                id=jr['id'],
                job_id=jr['job_id'],
                round_number=jr['round_number'],
                round_name=jr['round_name'],
                round_type=jr['round_type'],
                is_elimination=jr['is_elimination'],
                passing_score=jr['passing_score'],
                duration_minutes=jr['duration_minutes']
            )

        print("Creating Job Applications and application rounds...")
        for app in APPLICATIONS:
            Application.objects.create(
                id=app['id'],
                student_id=app['student_id'],
                job_id=app['job_id'],
                status=app['status'],
                eligibility_snapshot=app['eligibility_snapshot'],
                job_snapshot=app['job_snapshot']
            )

        for ar in APPLICATION_ROUNDS:
            ApplicationRound.objects.create(
                id=ar['id'],
                application_id=ar['application_id'],
                job_round_id=ar['job_round_id'],
                round_number=ar['round_number'],
                status=ar['status'],
                score=ar['score']
            )

        # 7. Create Interview Domain data
        print("Creating AI Mock Interview Domain dataset...")
        for d in DOMAINS:
            InterviewDomain.objects.create(
                id=d['id'],
                name=d['name'],
                description=d['description'],
                icon=d['icon']
            )

        for it in INTERVIEW_TYPES:
            InterviewType.objects.create(
                id=it['id'],
                domain_id=it['domain_id'],
                code=it['code'],
                name=it['name'],
                description=it['description'],
                duration_minutes=it['duration_minutes'],
                questions_per_session=it['questions_per_session']
            )

        for c in COMPETENCIES:
            Competency.objects.create(
                id=c['id'],
                interview_type_id=c['interview_type_id'],
                name=c['name'],
                description=c['description'],
                weight=c['weight'],
                mastery_keywords=c['mastery_keywords']
            )

        for q in QUESTIONS:
            Question.objects.create(
                id=q['id'],
                competency_id=q['competency_id'],
                text=q['text'],
                question_type=q['question_type'],
                difficulty_level=q['difficulty_level'],
                ideal_answer=q['ideal_answer'],
                evaluation_rubric=q['evaluation_rubric'],
                max_score=q['max_score']
            )

        for sess in SESSIONS:
            MockInterviewSession.objects.create(
                id=sess['id'],
                student_id=sess['student_id'],
                interview_type_id=sess['interview_type_id'],
                status=sess['status'],
                started_at=parse_date(sess['started_at']),
                completed_at=parse_date(sess['completed_at']),
                questions=sess['questions'],
                use_voice=sess['use_voice']
            )

        for ans in ANSWERS:
            InterviewAnswer.objects.create(
                id=ans['id'],
                session_id=ans['session_id'],
                question_id=ans['question_id'],
                question_number=ans['question_number'],
                answer_text=ans['answer_text'],
                eval_status=ans['eval_status'],
                score=ans['score'],
                evaluation_json=ans['evaluation_json'],
                ai_feedback=ans['ai_feedback'],
                confidence_score=ans['confidence_score'],
                time_taken_seconds=ans['time_taken_seconds']
            )

        for fb in FEEDBACKS:
            InterviewFeedback.objects.create(
                id=fb['id'],
                session_id=fb['session_id'],
                total_score=fb['total_score'],
                competency_scores=fb['competency_scores'],
                dimension_averages=fb['dimension_averages'],
                strengths=fb['strengths'],
                weaknesses=fb['weaknesses'],
                feedback_summary=fb['feedback_summary']
            )

    print("\\n=== DATABASE SEEDED SUCCESSFULLY ===")
    print("Users seeded: {{}}".format(len(USERS)))
    print("Students seeded: {{}}".format(len(STUDENTS)))
    print("Jobs seeded: {{}}".format(len(JOBS)))
    print("Applications seeded: {{}}".format(len(APPLICATIONS)))
    print("Mock Sessions seeded: {{}}".format(len(SESSIONS)))
    print("====================================\\n")

if __name__ == '__main__':
    seed_database()
"""

    # Write output script
    out_path = os.path.join(os.path.dirname(__file__), '../seed_deployment_data.py')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(output_code)

    print(f"Generated {out_path} successfully!")

if __name__ == '__main__':
    main()
