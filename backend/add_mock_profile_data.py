#!/usr/bin/env python
"""
Add mock profile data to a student (skills, experiences, projects, education, certifications).
"""
import os
import django
import sys
from datetime import datetime, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student
from apps.profiles.models import StudentProfile, Skill, Experience, Project, Education, Certification

def add_mock_data_to_student(login_id='demo001'):
    """Add comprehensive mock data to a student's profile."""
    
    try:
        # Get the student
        student = Student.objects.get(user__login_id=login_id)
        print(f"✅ Found student: {student.name} ({login_id})")
        
        # Get or create profile
        profile, created = StudentProfile.objects.get_or_create(student=student)
        if created:
            print(f"✅ Created StudentProfile for {student.name}")
        else:
            print(f"✅ Using existing StudentProfile for {student.name}")
        
        # Update basic profile info
        profile.phone = '+91-98765-43210'
        profile.location = 'Bangalore, India'
        profile.professional_summary = (
            'Passionate full-stack developer with expertise in building scalable web applications. '
            'Strong background in Python, JavaScript, and cloud technologies. '
            'Experienced in leading small development teams and mentoring junior developers.'
        )
        profile.linkedin = 'https://linkedin.com/in/demo-student'
        profile.github = 'https://github.com/demo-student'
        profile.portfolio = 'https://demo-portfolio.com'
        profile.save()
        print("✅ Updated profile info")
        
        # Add Skills
        skills_data = [
            {'name': 'Python', 'category': 'Technical', 'proficiency': 'Advanced'},
            {'name': 'JavaScript', 'category': 'Technical', 'proficiency': 'Advanced'},
            {'name': 'Django', 'category': 'Technical', 'proficiency': 'Advanced'},
            {'name': 'React', 'category': 'Technical', 'proficiency': 'Intermediate'},
            {'name': 'PostgreSQL', 'category': 'Technical', 'proficiency': 'Intermediate'},
            {'name': 'REST APIs', 'category': 'Technical', 'proficiency': 'Advanced'},
            {'name': 'Docker', 'category': 'Technical', 'proficiency': 'Intermediate'},
            {'name': 'AWS', 'category': 'Technical', 'proficiency': 'Beginner'},
            {'name': 'Communication', 'category': 'Soft Skill', 'proficiency': 'Advanced'},
            {'name': 'Team Leadership', 'category': 'Soft Skill', 'proficiency': 'Intermediate'},
            {'name': 'Problem Solving', 'category': 'Soft Skill', 'proficiency': 'Advanced'},
            {'name': 'English', 'category': 'Language', 'proficiency': 'Advanced'},
            {'name': 'Hindi', 'category': 'Language', 'proficiency': 'Advanced'},
        ]
        
        for skill_data in skills_data:
            skill, created = Skill.objects.get_or_create(
                profile=profile,
                name=skill_data['name'],
                defaults={'category': skill_data['category'], 'proficiency': skill_data['proficiency']}
            )
            if created:
                print(f"  ✓ Added skill: {skill_data['name']}")
        
        # Add Experiences
        exp_data = [
            {
                'company': 'TechCorp India',
                'position': 'Senior Software Developer',
                'start_date': datetime(2023, 6, 1).date(),
                'end_date': None,
                'is_current': True,
                'description': 'Led development of customer-facing APIs and microservices using Django and PostgreSQL.',
                'achievements': [
                    'Reduced API response time by 40% through optimization',
                    'Mentored 3 junior developers',
                    'Implemented CI/CD pipeline using Docker and GitHub Actions'
                ]
            },
            {
                'company': 'StartupXYZ',
                'position': 'Full Stack Developer',
                'start_date': datetime(2021, 9, 1).date(),
                'end_date': datetime(2023, 5, 31).date(),
                'is_current': False,
                'description': 'Built and maintained full-stack web applications serving 50k+ users.',
                'achievements': [
                    'Designed and implemented payment integration module',
                    'Achieved 99.9% uptime for production systems',
                    'Drove adoption of React for frontend development'
                ]
            },
            {
                'company': 'WebAgency Solutions',
                'position': 'Junior Developer',
                'start_date': datetime(2020, 6, 1).date(),
                'end_date': datetime(2021, 8, 31).date(),
                'is_current': False,
                'description': 'Developed and maintained client websites and web applications.',
                'achievements': [
                    'Delivered 15+ successful projects',
                    'Improved code quality through implementation of linting tools',
                    'Collaborated with designers to implement responsive UIs'
                ]
            }
        ]
        
        for exp in exp_data:
            experience, created = Experience.objects.get_or_create(
                profile=profile,
                company=exp['company'],
                position=exp['position'],
                defaults={
                    'start_date': exp['start_date'],
                    'end_date': exp['end_date'],
                    'is_current': exp['is_current'],
                    'description': exp['description'],
                    'achievements': exp['achievements']
                }
            )
            if created:
                print(f"  ✓ Added experience: {exp['position']} at {exp['company']}")
        
        # Add Projects
        project_data = [
            {
                'title': 'AI-Powered Resume Generator',
                'description': 'Developed an intelligent resume building platform using NLP and machine learning to auto-fill content and optimize for ATS.',
                'technologies': ['Python', 'Django', 'React', 'PostgreSQL', 'TensorFlow', 'Celery'],
                'link': 'https://github.com/demo-student/ai-resume-gen',
                'date': datetime(2024, 1, 15).date()
            },
            {
                'title': 'Real-Time Chat Application',
                'description': 'Built a scalable chat application with real-time messaging using WebSockets and Redis for high performance.',
                'technologies': ['Node.js', 'Socket.io', 'React', 'MongoDB', 'Redis'],
                'link': 'https://github.com/demo-student/realtime-chat',
                'date': datetime(2023, 8, 20).date()
            },
            {
                'title': 'E-Commerce Platform',
                'description': 'Created a full-featured e-commerce platform with payment integration, inventory management, and analytics dashboard.',
                'technologies': ['Django', 'React', 'PostgreSQL', 'Stripe', 'Celery', 'Docker'],
                'link': 'https://github.com/demo-student/ecommerce-platform',
                'date': datetime(2023, 3, 10).date()
            },
            {
                'title': 'Portfolio Website',
                'description': 'Designed and developed a modern portfolio website showcasing projects and skills with smooth animations.',
                'technologies': ['React', 'Tailwind CSS', 'JavaScript', 'Vercel'],
                'link': 'https://demo-portfolio.com',
                'date': datetime(2022, 12, 5).date()
            }
        ]
        
        for proj in project_data:
            project, created = Project.objects.get_or_create(
                profile=profile,
                title=proj['title'],
                defaults={
                    'description': proj['description'],
                    'technologies': proj['technologies'],
                    'link': proj['link'],
                    'date': proj['date']
                }
            )
            if created:
                print(f"  ✓ Added project: {proj['title']}")
        
        # Add Education
        edu_data = [
            {
                'institution': 'National Institute of Technology (NIT), Bangalore',
                'degree': 'Bachelor of Technology',
                'field': 'Computer Science and Engineering',
                'graduation_date': datetime(2020, 5, 30).date(),
                'gpa': 8.2,
                'honors': 'Cum Laude'
            },
            {
                'institution': 'Delhi Public School, Delhi',
                'degree': 'Senior Secondary (12th)',
                'field': 'Science',
                'graduation_date': datetime(2016, 3, 31).date(),
                'gpa': 9.1,
                'honors': 'Merit Certificate'
            }
        ]
        
        for edu in edu_data:
            education, created = Education.objects.get_or_create(
                profile=profile,
                institution=edu['institution'],
                degree=edu['degree'],
                defaults={
                    'field': edu['field'],
                    'graduation_date': edu['graduation_date'],
                    'gpa': edu['gpa'],
                    'honors': edu['honors']
                }
            )
            if created:
                print(f"  ✓ Added education: {edu['degree']} from {edu['institution']}")
        
        # Add Certifications
        cert_data = [
            {
                'name': 'AWS Certified Solutions Architect - Associate',
                'issuer': 'Amazon Web Services',
                'date': datetime(2023, 9, 15).date(),
                'credential_url': 'https://aws.amazon.com/verification/cert123'
            },
            {
                'name': 'Google Cloud Professional Data Engineer',
                'issuer': 'Google Cloud',
                'date': datetime(2023, 6, 1).date(),
                'credential_url': 'https://cloud.google.com/certification/verify/cert456'
            },
            {
                'name': 'Python for Data Science (Deep Learning Specialization)',
                'issuer': 'Coursera - Andrew Ng',
                'date': datetime(2023, 3, 10).date(),
                'credential_url': 'https://coursera.org/verify/specialization/cert789'
            }
        ]
        
        for cert in cert_data:
            certification, created = Certification.objects.get_or_create(
                profile=profile,
                name=cert['name'],
                defaults={
                    'issuer': cert['issuer'],
                    'date': cert['date'],
                    'credential_url': cert['credential_url']
                }
            )
            if created:
                print(f"  ✓ Added certification: {cert['name']}")
        
        # Recalculate profile completion
        profile.recalculate_completion()
        print(f"\n✅ Profile completion score updated: {profile.completion_score:.0%}")
        
        print("\n" + "="*60)
        print("🎓 STUDENT PROFILE POPULATED WITH MOCK DATA")
        print("="*60)
        print(f"Student: {student.name}")
        print(f"Login ID: {login_id}")
        print(f"Skills: 13 added")
        print(f"Experiences: 3 added")
        print(f"Projects: 4 added")
        print(f"Education: 2 added")
        print(f"Certifications: 3 added")
        print(f"Profile Completion: {profile.completion_score:.0%}")
        print("="*60)
        print("\n✨ Mock data successfully added!")
        print(f"📍 Login and check the profile at: http://localhost:3000/student/profile")
        
        return True
        
    except Student.DoesNotExist:
        print(f"❌ Student with login_id '{login_id}' not found!")
        return False
    except Exception as e:
        print(f"❌ Error adding mock data: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = add_mock_data_to_student()
    sys.exit(0 if success else 1)
