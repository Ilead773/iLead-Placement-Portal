import uuid
from django.core.management.base import BaseCommand
from core.models import User, Student
from apps.profiles.models import StudentProfile, Skill, Experience, Project, Education, Certification, Achievement, ExtracurricularActivity
from datetime import date


class Command(BaseCommand):
    help = 'Create a fully populated demo student account'

    def handle(self, *args, **options):
        # Check if demo student already exists
        try:
            existing = User.objects.get(login_id='demo.student')
            self.stdout.write(self.style.WARNING(f"Demo student already exists: {existing.login_id}"))
            return
        except User.DoesNotExist:
            pass
        
        # Create User account
        user = User.objects.create_user(
            login_id='demo.student',
            email='demo.student@ilead.com',
            password='Demo@12345',
            name='Demo Student',
            role='student',
            temp_password_flag=False,
            password_reset_required=False
        )
        self.stdout.write(self.style.SUCCESS(f"[+] User created: {user.login_id}"))
        
        # Create Student profile with all data
        student = Student.objects.create(
            user=user,
            name='Demo Student',
            registration_number=f'DEMO{uuid.uuid4().hex[:8].upper()}',
            email='demo.student@ilead.com',
            phone_number='9999999999',
            
            # Academic Info
            course='BBA (GEN)',
            stream='BBA General',
            semester=6,
            year='3rd',
            passing_year=2025,
            
            # Performance Metrics
            cgpa=8.5,
            attendance=85.0,
            training_attendance=92.5,
            
            # Backlog Info
            backlogs=False,
            backlogs_count=0,
        )
        
        # Auto-calculate category
        auto_category = student.calculate_category()
        student.category = auto_category
        student.save()
        
        self.stdout.write(self.style.SUCCESS(f"[+] Student profile created: {student.name}"))
        self.stdout.write(f"    - Registration: {student.registration_number}")
        self.stdout.write(f"    - Email: {student.email}")
        self.stdout.write(f"    - Course: {student.course}")
        self.stdout.write(f"    - Semester: {student.semester} (Year: {student.year})")
        self.stdout.write(f"    - CGPA: {student.cgpa}")
        self.stdout.write(f"    - Attendance: {student.attendance}%")
        self.stdout.write(f"    - Training Attendance: {student.training_attendance}%")
        self.stdout.write(f"    - Backlogs: {student.backlogs_count}")
        self.stdout.write(f"    - Category (Auto): {auto_category}")
        self.stdout.write(f"    - PACT Score: {student.pact_score}")
        
        # Create Resume Profile
        profile = StudentProfile.objects.create(
            student=student,
            phone='9999999999',
            location='New Delhi, India',
            professional_summary='Dedicated BBA student with strong academic performance and leadership skills. Passionate about business management and entrepreneurship.',
            linkedin='https://linkedin.com/in/demostudent',
            github='https://github.com/demostudent',
            portfolio='https://demostudent.com',
            completion_score=0.85,
            strengths=['Leadership', 'Problem Solving', 'Public Speaking', 'Team Collaboration'],
            languages_known=['English (Fluent)', 'Hindi (Native)', 'Bengali (Conversational)']
        )
        self.stdout.write(self.style.SUCCESS(f"[+] Resume profile created"))

        # Seed Skills
        skills_data = [
            ('Technical', 'Data Analysis', 'Advanced'),
            ('Technical', 'Financial Modeling', 'Intermediate'),
            ('Technical', 'Python', 'Beginner'),
        ]
        for category, name, proficiency in skills_data:
            Skill.objects.create(profile=profile, category=category, name=name, proficiency=proficiency)

        # Seed Extracurricular Activities
        ExtracurricularActivity.objects.create(
            profile=profile,
            title='Football Team Captain',
            description='Led the university football team, organizing practice sessions and inter-college tournaments.',
            date=date(2023, 8, 1)
        )
        ExtracurricularActivity.objects.create(
            profile=profile,
            title='Member – Entrepreneurship Club',
            description='Active member of the iLEAD Entrepreneurship Club. Participated in pitch competitions and startup workshops.',
            date=date(2023, 1, 15)
        )

        profile.recalculate_completion()
        self.stdout.write(f"    - Completion Score: {profile.completion_score:.0%}")
        
        # Print login credentials
        self.stdout.write("\n" + "="*70)
        self.stdout.write(self.style.SUCCESS("DEMO STUDENT LOGIN CREDENTIALS"))
        self.stdout.write("="*70)
        self.stdout.write(self.style.WARNING(f"Login ID: demo.student"))
        self.stdout.write(self.style.WARNING(f"Password: Demo@12345"))
        self.stdout.write(self.style.WARNING(f"Email:    demo.student@ilead.com"))
        self.stdout.write("="*70 + "\n")
        
        self.stdout.write(self.style.SUCCESS("✓ Demo student created successfully!"))
