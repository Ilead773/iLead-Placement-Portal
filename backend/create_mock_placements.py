import os
import django
from datetime import datetime, timezone, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import User, Student
from apps.jobs.models import Job, JobRound
from apps.applications.models import Application

def create_mock_data():
    admin = User.objects.filter(role='admin').first()
    if not admin:
        print("No admin user found. Creating an admin user first...")
        admin = User.objects.create_superuser(
            login_id='admin',
            email='admin@ilead.edu',
            password='Password123!'
        )
        print("Admin user 'admin' created.")

    # Fetch some students to assign
    students = list(Student.objects.all()[:5])
    if not students:
        print("No students found in the database. Please import students first.")
        # Create a couple of mock students if none exist
        try:
            student_user1 = User.objects.create_user(login_id='stud1', email='stud1@ilead.edu', password='Password123!', role='student')
            student1 = Student.objects.create(user=student_user1, name='Aravind Swamy', registration_number='REG001', email='stud1@ilead.edu', cgpa=8.5, attendance=85)
            
            student_user2 = User.objects.create_user(login_id='stud2', email='stud2@ilead.edu', password='Password123!', role='student')
            student2 = Student.objects.create(user=student_user2, name='Janani Iyer', registration_number='REG002', email='stud2@ilead.edu', cgpa=9.1, attendance=92)
            
            students = [student1, student2]
            print(f"Created {len(students)} mock students.")
        except Exception as e:
            print(f"Error creating mock students: {e}")
            # Try to fetch whatever students might exist
            students = list(Student.objects.all())

    # Define mock placements with target creation months
    # 0 = Jan, 1 = Feb, 2 = Mar, 3 = Apr, 4 = May, 5 = Jun, 6 = Jul, 7 = Aug, 8 = Sep, 9 = Oct, 10 = Nov, 11 = Dec
    mock_placements_info = [
        # Mar - June (Spring/Summer Season)
        {
            'company_name': 'Microsoft',
            'position': 'Software Engineer',
            'salary': 18.0,  # 18 LPA
            'required_cgpa': 8.5,
            'eligible_courses': 'BCA, MCA, B.Tech',
            'description': 'Microsoft Spring Hiring Drive for full stack developers.',
            'created_month': 4, # May (Index 4)
            'created_year': 2026,
        },
        {
            'company_name': 'Tata Consultancy Services (TCS)',
            'position': 'Systems Engineer',
            'salary': 4.5,   # 4.5 LPA
            'required_cgpa': 6.0,
            'eligible_courses': 'BCA, B.Sc, MCA',
            'description': 'Mass recruitment drive for engineering graduates.',
            'created_month': 3, # April (Index 3)
            'created_year': 2026,
        },
        {
            'company_name': 'Razorpay',
            'position': 'Frontend Developer',
            'salary': 12.0,  # 12 LPA
            'required_cgpa': 7.5,
            'eligible_courses': 'BCA, MCA',
            'description': 'Build the future of payments using React and modern frontend stacks.',
            'created_month': 5, # June (Index 5)
            'created_year': 2026,
        },

        # Aug - Nov (Autumn/Winter Season)
        {
            'company_name': 'Amazon',
            'position': 'Software Development Engineer - I',
            'salary': 23.0,  # 23 LPA
            'required_cgpa': 8.0,
            'eligible_courses': 'MCA, M.Tech',
            'description': 'Fall recruiting drive. Work on massive-scale systems and web services.',
            'created_month': 8, # September (Index 8)
            'created_year': 2025,
        },
        {
            'company_name': 'Cognizant',
            'position': 'Programmer Analyst',
            'salary': 5.0,   # 5 LPA
            'required_cgpa': 6.5,
            'eligible_courses': 'BCA, BBA, B.Sc',
            'description': 'Entry level software development and support roles.',
            'created_month': 9, # October (Index 9)
            'created_year': 2025,
        },
        {
            'company_name': 'Wipro',
            'position': 'Project Engineer',
            'salary': 4.0,   # 4 LPA
            'required_cgpa': 6.0,
            'eligible_courses': 'BCA, MCA',
            'description': 'Join Wipro Turbo hiring for global client assignments.',
            'created_month': 10, # November (Index 10)
            'created_year': 2025,
        },

        # Jan - Mar (Winter/Spring Season)
        {
            'company_name': 'Infosys',
            'position': 'Power Programmer',
            'salary': 9.5,   # 9.5 LPA
            'required_cgpa': 8.0,
            'eligible_courses': 'MCA, B.Tech',
            'description': 'Specialized high-coding role with specialized packages.',
            'created_month': 0, # January (Index 0)
            'created_year': 2026,
        },
        {
            'company_name': 'Zoho Corporation',
            'position': 'Member Technical Staff',
            'salary': 8.0,   # 8 LPA
            'required_cgpa': 7.0,
            'eligible_courses': 'BCA, B.Sc, MCA',
            'description': 'Write neat, clean software in Java, JS, or C++.',
            'created_month': 1, # February (Index 1)
            'created_year': 2026,
        },
        {
            'company_name': 'Deloitte',
            'position': 'Technology Analyst Consultant',
            'salary': 7.2,   # 7.2 LPA
            'required_cgpa': 7.2,
            'eligible_courses': 'BBA, BCA, MCA',
            'description': 'Consulting role for technical implementation and architecture.',
            'created_month': 2, # March (Index 2)
            'created_year': 2026,
        }
    ]

    print("Cleaning up old mock job data...")
    company_names = [p['company_name'] for p in mock_placements_info]
    Job.objects.filter(company_name__in=company_names).delete()

    print("Creating mock jobs...")
    for p_info in mock_placements_info:
        # Construct eligibility rules
        branches = [b.strip() for b in p_info['eligible_courses'].split(',')] if p_info['eligible_courses'] else []
        eligibility = {
            "min_cgpa": p_info['required_cgpa'],
            "allowed_branches": branches,
            "required_skills": [],
            "allowed_years": [2025, 2026],
            "no_backlog": False
        }

        # Create Job object
        job = Job.objects.create(
            company_name=p_info['company_name'],
            role=p_info['position'],
            package=p_info['salary'],
            description=p_info['description'],
            location="Bangalore, India",
            job_type="internal",
            listing_type="job",
            eligibility_rules=eligibility,
            application_deadline=datetime.now(timezone.utc) + timedelta(days=30),
            status="active",
            created_by=admin
        )
        
        # Override created_at using update to bypass auto_now_add
        mock_date = datetime(year=p_info['created_year'], month=p_info['created_month'] + 1, day=15, hour=10, minute=0, tzinfo=timezone.utc)
        Job.objects.filter(pk=job.id).update(created_at=mock_date)

        # Create JobRounds so they are publishable
        JobRound.objects.create(
            job=job,
            round_number=1,
            round_name="Aptitude Test",
            round_type="test",
            is_elimination=True
        )
        JobRound.objects.create(
            job=job,
            round_number=2,
            round_name="Technical Interview",
            round_type="interview",
            is_elimination=True
        )
        
        # Create randomized Student Applications
        num_assignments = 0
        if students:
            import random
            num_assignments = random.randint(1, min(len(students), 3))
            assigned_students = random.sample(students, num_assignments)
            
            for student in assigned_students:
                Application.objects.get_or_create(
                    student=student,
                    job=job,
                    defaults={'status': random.choice(['applied', 'shortlisted', 'interviewing', 'selected', 'accepted'])}
                )

        print(f"Created Job: {job.company_name} - {job.role} | Date: {mock_date.strftime('%Y-%m-%d')} | Applications: {num_assignments}")

    print("\nMock data successfully seeded! Seasonal placement grouping and stats are now loaded directly from the jobs table.")

if __name__ == '__main__':
    create_mock_data()
