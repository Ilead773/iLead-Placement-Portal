from django.core.management.base import BaseCommand
from apps.career_os.models import Course, Skill, CourseSkill

class Command(BaseCommand):
    help = 'Loads 19 courses and basic skills into the AI Career Intelligence KB'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting to load KB...")

        # Define 19 Courses
        courses_data = [
            {"name": "BBA", "category": "Business & Management"},
            {"name": "BBA in Digital Marketing (BBA DM)", "category": "Business & Management"},
            {"name": "BBA in Travel & Tourism Management (BBA TTM)", "category": "Business & Management"},
            {"name": "BBA in Entrepreneurship (BBA ENT)", "category": "Business & Management"},
            {"name": "BBA in Sports Management (BBA SM)", "category": "Business & Management"},
            {"name": "BBA in Hospital Management (BBA HM)", "category": "Business & Management"},
            {"name": "BSc in Media Science (BMS)", "category": "Media & Creative"},
            {"name": "MSc in Media Science", "category": "Media & Creative"},
            {"name": "BSc in Multimedia, Animation, Graphic Design (BMAGD)", "category": "Media & Creative"},
            {"name": "MSc in Multimedia, Animation, Graphic Design (MMAGD)", "category": "Media & Creative"},
            {"name": "BSc in Film and Television Production (FTP)", "category": "Creative Production"},
            {"name": "BSc in Interior Design", "category": "Creative Production"},
            {"name": "BSc in Sustainable Fashion Design & Management", "category": "Creative Production"},
            {"name": "Bachelor in Optometry", "category": "Healthcare"},
            {"name": "BSc in Critical Care Technology (CCT)", "category": "Healthcare"},
            {"name": "BSc in Medical Laboratory Technology (BMLT)", "category": "Healthcare"},
            {"name": "BSc in Data Science", "category": "Technology"},
            {"name": "BSc in Cyber Security", "category": "Technology"},
            {"name": "BSc in Computer Application (BCA)", "category": "Technology"},
        ]

        # Define Skills
        skills_data = [
            # Data Science Skills
            {"name": "Python", "category": "language"},
            {"name": "SQL", "category": "database"},
            {"name": "Statistics", "category": "math"},
            {"name": "Machine Learning", "category": "ml"},
            {"name": "Deep Learning", "category": "ml"},
            {"name": "Data Visualization", "category": "tools"},
            {"name": "Big Data", "category": "advanced"},
            {"name": "Cloud (AWS/GCP)", "category": "tools"},
            
            # BCA / Cyber Security Skills
            {"name": "Java", "category": "language"},
            {"name": "C++", "category": "language"},
            {"name": "Network Security", "category": "security"},
            {"name": "Cryptography", "category": "security"},
            {"name": "Web Development", "category": "development"},
            {"name": "Database Management", "category": "database"},
            
            # General Business / Creative Skills
            {"name": "Digital Marketing", "category": "marketing"},
            {"name": "SEO/SEM", "category": "marketing"},
            {"name": "Business Strategy", "category": "business"},
            {"name": "Financial Accounting", "category": "business"},
            {"name": "Graphic Design", "category": "design"},
            {"name": "UI/UX Design", "category": "design"},
            {"name": "Video Editing", "category": "media"},
            {"name": "Content Writing", "category": "media"},
            
            # Healthcare
            {"name": "Medical Equipment Operation", "category": "healthcare"},
            {"name": "Patient Care", "category": "healthcare"},
            {"name": "Lab Diagnostics", "category": "healthcare"},
        ]

        Course.objects.all().delete()
        Skill.objects.all().delete()

        # Create Courses
        course_objs = {}
        for c_data in courses_data:
            c, _ = Course.objects.get_or_create(name=c_data["name"], defaults={"category": c_data["category"]})
            course_objs[c.name] = c
            
        # Create Skills
        skill_objs = {}
        for s_data in skills_data:
            s, _ = Skill.objects.get_or_create(name=s_data["name"], defaults={"category": s_data["category"]})
            skill_objs[s.name] = s

        self.stdout.write(f"Loaded {len(course_objs)} courses and {len(skill_objs)} skills.")

        # Map Skills to BSc in Data Science (As per prompt)
        ds_course = course_objs.get("BSc in Data Science")
        if ds_course:
            CourseSkill.objects.create(course=ds_course, skill=skill_objs["Python"], required_level=3, weight=0.15)
            CourseSkill.objects.create(course=ds_course, skill=skill_objs["SQL"], required_level=3, weight=0.12)
            CourseSkill.objects.create(course=ds_course, skill=skill_objs["Statistics"], required_level=2, weight=0.10)
            CourseSkill.objects.create(course=ds_course, skill=skill_objs["Machine Learning"], required_level=3, weight=0.15)
            CourseSkill.objects.create(course=ds_course, skill=skill_objs["Deep Learning"], required_level=2, weight=0.12)
            CourseSkill.objects.create(course=ds_course, skill=skill_objs["Data Visualization"], required_level=2, weight=0.08)
            CourseSkill.objects.create(course=ds_course, skill=skill_objs["Big Data"], required_level=1, weight=0.08)
            CourseSkill.objects.create(course=ds_course, skill=skill_objs["Cloud (AWS/GCP)"], required_level=1, weight=0.08)

        # Map some basic skills for BCA
        bca_course = course_objs.get("BSc in Computer Application (BCA)")
        if bca_course:
            CourseSkill.objects.create(course=bca_course, skill=skill_objs["Java"], required_level=3, weight=0.20)
            CourseSkill.objects.create(course=bca_course, skill=skill_objs["C++"], required_level=3, weight=0.20)
            CourseSkill.objects.create(course=bca_course, skill=skill_objs["Web Development"], required_level=3, weight=0.30)
            CourseSkill.objects.create(course=bca_course, skill=skill_objs["Database Management"], required_level=3, weight=0.30)

        # Map some basic skills for BBA
        bba_course = course_objs.get("BBA")
        if bba_course:
            CourseSkill.objects.create(course=bba_course, skill=skill_objs["Business Strategy"], required_level=4, weight=0.30)
            CourseSkill.objects.create(course=bba_course, skill=skill_objs["Financial Accounting"], required_level=3, weight=0.20)
            CourseSkill.objects.create(course=bba_course, skill=skill_objs["Digital Marketing"], required_level=3, weight=0.25)
            CourseSkill.objects.create(course=bba_course, skill=skill_objs["SEO/SEM"], required_level=2, weight=0.25)

        # You would map the rest as needed...

        # Add some Learning Resources
        resources_data = [
            {"skill": "Python", "title": "Python for Data Science", "platform": "Coursera", "hours": 40, "difficulty": "beginner", "url": "https://coursera.org"},
            {"skill": "SQL", "title": "Advanced SQL for Data Scientists", "platform": "DataCamp", "hours": 20, "difficulty": "intermediate", "url": "https://datacamp.com"},
            {"skill": "Statistics", "title": "Statistics for Data Science", "platform": "Coursera", "hours": 25, "difficulty": "beginner", "url": "https://coursera.org"},
            {"skill": "Machine Learning", "title": "Advanced Machine Learning", "platform": "Coursera", "hours": 35, "difficulty": "intermediate", "url": "https://coursera.org"},
            {"skill": "Deep Learning", "title": "Deep Learning Specialization", "platform": "Coursera", "hours": 50, "difficulty": "advanced", "url": "https://coursera.org"}
        ]
        
        from apps.career_os.models import LearningResource
        LearningResource.objects.all().delete()
        
        res_count = 0
        for r_data in resources_data:
            s_obj = skill_objs.get(r_data["skill"])
            if s_obj:
                LearningResource.objects.create(
                    skill=s_obj,
                    title=r_data["title"],
                    platform=r_data["platform"],
                    estimated_hours=r_data["hours"],
                    difficulty=r_data["difficulty"],
                    url=r_data["url"]
                )
                res_count += 1
                
        self.stdout.write(f"Loaded {res_count} learning resources.")

        self.stdout.write(self.style.SUCCESS("Successfully loaded Knowledge Base"))
