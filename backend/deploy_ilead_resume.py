#!/usr/bin/env python
"""
Standalone Deployment Script for iLEAD Kolkata Standard Template & Student Reset.
Run this script to update the template and clean up the demo student profile in production.
"""
import os
import sys
import django

# Setup Django env
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import transaction
from core.models import User, Student
from apps.profiles.models import StudentProfile, Skill, Education, Project, Experience, Certification, Achievement, ExtracurricularActivity
from apps.templates_engine.models import ResumeTemplate

HTML_TEMPLATE = """<div class="resume-container">
    <header class="resume-header">
        <div class="header-left">
            <div class="photo-frame">
                {% if personal.photo %}
                    <img src="{{ personal.photo }}" alt="" class="candidate-photo">
                {% else %}
                    <div class="photo-placeholder">Insert a <br>formal picture <br>(Current)</div>
                {% endif %}
            </div>
        </div>
        
        <div class="header-center">
            <h1 class="candidate-name">{{ personal.name|default:"Full Name" }}</h1>
            <div class="linkedin-link">
                {% if personal.linkedin %}
                    <a href="{{ personal.linkedin }}" target="_blank">{{ personal.linkedin }}</a>
                {% else %}
                    <a href="#" class="placeholder-link">LinkedIn Link (just add the link) - MANDATORY</a>
                {% endif %}
            </div>
            <div class="portfolio-link">
                {% if personal.portfolio %}
                    <a href="{{ personal.portfolio }}" target="_blank">{{ personal.portfolio }}</a>
                {% else %}
                    <a href="#" class="placeholder-link">Portfolio Link (For BMS, MSc Media, BMAGD, MMAGD, FTP Students)</a>
                {% endif %}
            </div>
            <div class="contact-row">
                <span>
                    <span class="icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></span>
                    {{ personal.phone|default:"Mobile Number" }}
                </span>
                <span>
                    |
                    <span class="icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></span>
                    {{ personal.email|default:"Email ID" }}
                </span>
                <span>
                    |
                    <span class="icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></span>
                    {{ personal.location|default:"City, State" }}
                </span>
            </div>
        </div>
        
        <div class="header-right">
            <div class="logo-container">
                {% if institute_logo %}
                    <img src="{{ institute_logo }}" alt="iLEAD Logo" class="institute-logo">
                {% else %}
                    <img src="data:image/png;base64,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" alt="iLEAD Logo" class="institute-logo">
                {% endif %}
            </div>
        </div>
    </header>

    <section class="resume-section">
        <h2 class="section-title">CAREER OBJECTIVE</h2>
        <p class="summary-text">{{ summary|default:"(Sample: A motivated and enthusiastic undergraduate student seeking opportunities to apply academic knowledge, develop professional skills, and contribute effectively to organizational goals while gaining industry exposure.)" }}</p>
    </section>

    <section class="resume-section">
        <table class="education-table">
            <thead>
                <tr>
                    <th><u>Qualification</u></th>
                    <th><u>Institution</u></th>
                    <th><u>Board/University</u></th>
                    <th><u>Year</u></th>
                    <th><u>CGPA/%</u></th>
                </tr>
            </thead>
            <tbody>
                {% if education %}
                    {% for edu in education %}
                    <tr>
                        <td class="bold-text">{{ edu.degree }}</td>
                        <td>
                            {% if edu.institution %}
                                {{ edu.institution }}
                            {% else %}
                                {% if "UG" in edu.degree %}iLEAD{% else %}School Name{% endif %}
                            {% endif %}
                        </td>
                        <td>
                            {% if edu.field %}
                                {{ edu.field }}
                            {% else %}
                                {% if "UG" in edu.degree %}MAKAUT{% else %}Board{% endif %}
                            {% endif %}
                        </td>
                        <td>
                            {% if edu.graduation_date %}
                                {% if "UG" in edu.degree %}
                                    {{ edu.graduation_date|slice:":4"|add:"-3" }} – Present
                                {% else %}
                                    {{ edu.graduation_date|slice:":4" }}
                                {% endif %}
                            {% else %}
                                {% if "UG" in edu.degree %}20XX – Present{% else %}Year{% endif %}
                            {% endif %}
                        </td>
                        <td class="bold-text">
                            {% if edu.gpa %}
                                {{ edu.gpa }}
                            {% else %}
                                {% if "UG" in edu.degree %}X.XX CGPA{% else %}XX%{% endif %}
                            {% endif %}
                        </td>
                    </tr>
                    {% endfor %}
                {% else %}
                    <tr>
                        <td class="bold-text">UG Degree (Specialization)</td>
                        <td>iLEAD</td>
                        <td>MAKAUT</td>
                        <td>20XX – Present</td>
                        <td class="bold-text">X.XX CGPA</td>
                    </tr>
                    <tr>
                        <td class="bold-text">Class XII</td>
                        <td>School Name</td>
                        <td>Board</td>
                        <td>Year</td>
                        <td class="bold-text">XX%</td>
                    </tr>
                    <tr>
                        <td class="bold-text">Class X</td>
                        <td>School Name</td>
                        <td>Board</td>
                        <td>Year</td>
                        <td class="bold-text">XX%</td>
                    </tr>
                {% endif %}
            </tbody>
        </table>
    </section>

    <table class="two-col-table">
        <tr>
            <td class="left-col">
                <div class="sidebar-section">
                    <h3 class="section-title">TECHNICAL SKILLS</h3>
                    <ul class="bullet-list">
                        {% if skills %}
                            {% for skill_group in skills %}
                                {% for item in skill_group.items %}
                                    <li>{{ item }}</li>
                                {% endfor %}
                            {% endfor %}
                        {% else %}
                            <li>MS Office Suite (Excel, Word, PowerPoint)</li>
                            <li>Industry-Specific Software (if applicable)</li>
                            <li>AI Tools (ChatGPT, Gemini, Canva AI, etc.)</li>
                            <li>Data Analysis / Design / Programming Tools (as applicable)</li>
                        {% endif %}
                    </ul>
                </div>

                <div class="sidebar-section">
                    <h3 class="section-title">CERTIFICATIONS <i>(if any)</i></h3>
                    <ul class="bullet-list">
                        {% if certifications %}
                            {% for cert in certifications %}
                                <li>{{ cert.name }}{% if cert.issuer %} – {{ cert.issuer }}{% endif %}</li>
                            {% endfor %}
                        {% else %}
                            <li>Certification Name – Issuing Organization</li>
                            <li>Certification Name – Issuing Organization</li>
                            <li>Certification Name – Issuing Organization</li>
                        {% endif %}
                    </ul>
                </div>

                <div class="sidebar-section">
                    <h3 class="section-title">ACHIEVEMENTS &amp; POSITIONS OF RESPONSIBILITY</h3>
                    <ul class="bullet-list">
                        {% if achievements %}
                            {% for ach in achievements %}
                                <li>
                                    <strong>{{ ach.title }}</strong>
                                    {% if ach.issuer %} – {{ ach.issuer }}{% endif %}
                                    {% if ach.description %}<div class="ach-desc">{{ ach.description }}</div>{% endif %}
                                </li>
                            {% endfor %}
                        {% else %}
                            <li>Achievement/Award</li>
                            <li>Club Coordinator / Event Volunteer / Team Lead</li>
                        {% endif %}
                    </ul>
                </div>

                {% if extra_curricular %}
                <div class="sidebar-section">
                    <h3 class="section-title">EXTRA-CURRICULAR ACTIVITIES</h3>
                    <ul class="bullet-list">
                        {% for activity in extra_curricular %}
                            <li>{{ activity }}</li>
                        {% endfor %}
                    </ul>
                </div>
                {% endif %}

                {% if strengths %}
                <div class="sidebar-section">
                    <h3 class="section-title">STRENGTHS</h3>
                    <ul class="bullet-list">
                        {% for s in strengths %}
                            <li>{{ s }}</li>
                        {% endfor %}
                    </ul>
                </div>
                {% endif %}

                {% if languages %}
                <div class="sidebar-section">
                    <h3 class="section-title">LANGUAGES KNOWN</h3>
                    <ul class="bullet-list">
                        {% for lang in languages %}
                            <li>{{ lang }}</li>
                        {% endfor %}
                    </ul>
                </div>
                {% endif %}
            </td>
            <td class="right-col">
                <div class="main-section">
                    <h3 class="section-title">EXPERIENCE</h3>
                    {% if experience %}
                        {% for exp in experience %}
                        <div class="experience-item">
                            <div class="exp-header">
                                <span class="company-name">{{ exp.company }}</span> |
                                <span class="designation"> {{ exp.position }}</span> |
                                <span class="duration">
                                    ({% if exp.duration.start %}{{ exp.duration.start|slice:":7" }}{% else %}{{ exp.start_date|default:"" }}{% endif %}
                                    –
                                    {% if exp.duration.current or not exp.duration.end %}Present{% else %}{{ exp.duration.end|slice:":7" }}{% endif %})
                                </span>
                            </div>
                            {% if exp.achievements %}
                            <ul class="bullet-list">
                                {% for achievement in exp.achievements %}
                                <li>{{ achievement }}</li>
                                {% endfor %}
                            </ul>
                            {% elif exp.description %}
                            <p class="exp-desc">{{ exp.description }}</p>
                            {% endif %}
                        </div>
                        {% endfor %}
                    {% else %}
                        {% for i in "123" %}
                        <div class="experience-item">
                            <div class="exp-header">
                                <span class="company-name">Company Name</span> |
                                <span class="designation"> Designation</span> |
                                <span class="duration"> Internship (Month Year – Month Year)</span>
                            </div>
                            <ul class="bullet-list">
                                <li>Responsibility/Achievement 1</li>
                                <li>Responsibility/Achievement 2</li>
                                <li>Responsibility/Achievement 3</li>
                            </ul>
                        </div>
                        {% endfor %}
                    {% endif %}
                </div>
            </td>
        </tr>
    </table>


    <footer class="resume-footer">
        Campus: 113, Matheswartola Road, Kolkata 700 046, West Bengal, India, Ph: +91.33.4018 2000/02 Fax: +91.33.4018 2016
    </footer>
</div>"""

CSS_STYLES = """:root {
    --primary-color: #1F4E79;
    --text-color: #000000;
    --muted-color: #475569;
    --border-color: #1F4E79;
    --bg-light: #EBF2F7;
}

@page {
    size: A4;
    margin: 15mm;
}

body {
    font-family: 'Arial', 'Helvetica', 'Calibri', sans-serif;
    color: var(--text-color);
    line-height: 1.3;
    margin: 0;
    padding: 0;
    font-size: 10pt;
}

.resume-container {
    max-width: 100%;
}

.resume-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--primary-color);
    padding-bottom: 8px;
    margin-bottom: 12px;
}

.header-left {
    flex: 0 0 90px;
}

.photo-frame {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    border: 1.5px dashed #000000;
    background-color: #f8fafc;
}

.candidate-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.photo-placeholder {
    font-size: 7.5pt;
    color: var(--primary-color);
    padding: 4px;
    line-height: 1.2;
    font-weight: bold;
    text-align: center;
}

.header-center {
    flex: 1;
    text-align: center;
    padding: 0 10px;
}

.candidate-name {
    font-size: 18pt;
    font-weight: bold;
    color: var(--primary-color);
    margin: 0 0 3px 0;
}

.linkedin-link, .portfolio-link {
    font-size: 9.5pt;
    margin-bottom: 2px;
}

.linkedin-link a, .portfolio-link a {
    color: #0077b5;
    text-decoration: none;
}

.linkedin-link a:hover, .portfolio-link a:hover {
    text-decoration: underline;
}

.placeholder-link {
    color: #dc2626 !important;
    font-weight: bold;
}

.contact-row {
    font-size: 9.5pt;
    margin-top: 4px;
    color: #333333;
}

.icon-circle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid #333333;
    margin-right: 3px;
    vertical-align: middle;
    background-color: transparent;
}

.icon-circle svg {
    width: 8px;
    height: 8px;
    color: #333333;
    vertical-align: middle;
    display: block;
}

.header-right {
    flex: 0 0 110px;
    display: flex;
    justify-content: flex-end;
}

.logo-container {
    width: 110px;
    height: auto;
}

.institute-logo {
    width: 100%;
    max-height: 55px;
    object-fit: contain;
}

.resume-section {
    margin-bottom: 10px;
    page-break-inside: avoid;
}

.section-title {
    font-size: 11pt;
    font-weight: bold;
    color: var(--primary-color);
    text-transform: uppercase;
    margin: 0 0 6px 0;
    letter-spacing: 0.5px;
}

.summary-text {
    font-size: 9.5pt;
    text-align: justify;
    margin: 0;
    line-height: 1.35;
}

.education-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
    font-size: 9.5pt;
}

.education-table th, .education-table td {
    border: 1px solid var(--border-color);
    padding: 4px 6px;
    text-align: center;
}

.education-table th {
    background-color: transparent;
    color: var(--primary-color);
    font-weight: bold;
    text-transform: uppercase;
    font-size: 9pt;
    text-decoration: underline;
}

.education-table tbody tr:nth-child(odd) {
    background-color: var(--bg-light);
}

.education-table tbody tr:nth-child(even) {
    background-color: #ffffff;
}

.bold-text {
    font-weight: bold;
}

.two-col-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 7px;
}

.left-col {
    width: 37%;
    vertical-align: top;
    padding-right: 10px;
}

.right-col {
    width: 63%;
    vertical-align: top;
    padding-left: 10px;
    border-left: 1.5px solid var(--primary-color);
}

.sidebar-section, .main-section {
    margin-bottom: 7px;
    page-break-inside: avoid;
}

.bullet-list {
    margin: 0;
    padding-left: 18px;
    font-size: 9.5pt;
}

.bullet-list li {
    margin-bottom: 2px;
}

.bullet-list li::marker {
    color: var(--primary-color);
}

.ach-desc {
    font-size: 8.5pt;
    color: var(--muted-color);
    margin-top: 1px;
}

.experience-item {
    margin-bottom: 8px;
    page-break-inside: avoid;
}

.exp-header {
    font-size: 9.5pt;
    font-weight: bold;
    color: var(--primary-color);
    margin-bottom: 3px;
}

.company-name {
    color: var(--primary-color);
}

.designation {
    color: var(--text-color);
}

.duration {
    color: var(--text-color);
    font-weight: normal;
}

.exp-desc {
    font-size: 9.5pt;
    margin: 3px 0 0 0;
    text-align: justify;
}

.resume-footer {
    text-align: center;
    font-size: 8pt;
    color: var(--muted-color);
    margin-top: 20px;
    border-top: 1px solid var(--primary-color);
    padding-top: 6px;
    line-height: 1.3;
    page-break-inside: avoid;
}
"""

def deploy():
    print("Starting iLEAD Kolkata template deployment and student profile cleanup...")
    
    with transaction.atomic():
        # 1. Update iLEAD Kolkata Standard template in database
        template, created = ResumeTemplate.objects.get_or_create(
            name="iLEAD Kolkata Standard",
            defaults={
                "description": "The official iLEAD Kolkata Standard template styled exactly according to university guidelines.",
                "html_template": HTML_TEMPLATE,
                "css_styles": CSS_STYLES,
                "is_active": True
            }
        )
        if not created:
            template.html_template = HTML_TEMPLATE
            template.css_styles = CSS_STYLES
            template.save()
            print("Successfully updated database template 'iLEAD Kolkata Standard'.")
        else:
            print("Successfully created database template 'iLEAD Kolkata Standard'.")

        # 2. Find and reset/fill demo student profile
        student_user = User.objects.filter(login_id="student").first()
        if student_user:
            student_rec, _ = Student.objects.update_or_create(
                user=student_user,
                defaults={
                    "name": "Arjun Mehta",
                    "registration_number": "REG-2026-BCA01",
                    "email": "arjun.mehta@student.ilead.edu.in",
                    "phone_number": "+91 98765 43210",
                    "passing_year": 2026,
                    "course": "BSc in Computer Application (BCA)",
                    "stream": "Technology",
                    "semester": 6,
                    "attendance": 92.5,
                    "cgpa": 8.85,
                    "year": 3,
                    "category": "General",
                    "backlogs": 0,
                }
            )
            
            profile, _ = StudentProfile.objects.update_or_create(
                student=student_rec,
                defaults={
                    "phone": "+91 98765 43210",
                    "location": "Kolkata, West Bengal",
                    "professional_summary": "A highly motivated and detail-oriented undergraduate student in Computer Applications. Strong foundation in software development, modern web technologies, and database management. Eager to contribute effectively to team success while gaining valuable industry exposure.",
                    "linkedin": "https://linkedin.com/in/arjun-mehta",
                    "github": "https://github.com/arjunmehta",
                    "portfolio": "https://arjunmehta.dev",
                    "strengths": ["Problem Solving", "Teamwork", "Effective Communication", "Adaptability"],
                    "languages_known": ["English (Fluent)", "Bengali (Native)", "Hindi (Proficient)"]
                }
            )
            
            # Clear previous entries to avoid duplicates
            from apps.profiles.models import Skill, Education, Project, Experience, Certification, Achievement, ExtracurricularActivity
            Skill.objects.filter(profile=profile).delete()
            Education.objects.filter(profile=profile).delete()
            Project.objects.filter(profile=profile).delete()
            Experience.objects.filter(profile=profile).delete()
            Certification.objects.filter(profile=profile).delete()
            Achievement.objects.filter(profile=profile).delete()
            ExtracurricularActivity.objects.filter(profile=profile).delete()
            
            # Seed Education
            from datetime import date
            Education.objects.create(
                profile=profile,
                institution="iLEAD - Institute of Leadership, Entrepreneurship and Development",
                degree="UG Degree (BCA)",
                field="MAKAUT",
                graduation_date=date(2026, 6, 30),
                gpa=8.85
            )
            Education.objects.create(
                profile=profile,
                institution="St. Xavier's Collegiate School",
                degree="Class XII (Science)",
                field="CISCE",
                graduation_date=date(2023, 5, 15),
                gpa=92.4
            )
            Education.objects.create(
                profile=profile,
                institution="St. Xavier's Collegiate School",
                degree="Class X",
                field="CISCE",
                graduation_date=date(2021, 5, 20),
                gpa=94.6
            )
            
            # Seed Skills
            skills_data = [
                ('Technical', 'Python'),
                ('Technical', 'JavaScript'),
                ('Technical', 'React.js'),
                ('Technical', 'Django'),
                ('Technical', 'SQL & PostgreSQL'),
                ('Technical', 'MS Office Suite (Excel, Word, PowerPoint)'),
                ('Soft Skill', 'Problem Solving'),
                ('Soft Skill', 'Effective Communication'),
                ('Language', 'English'),
                ('Language', 'Bengali'),
                ('Language', 'Hindi'),
            ]
            for category, name in skills_data:
                Skill.objects.create(profile=profile, category=category, name=name, proficiency='Advanced')
                
            # Seed Experiences
            Experience.objects.create(
                profile=profile,
                company="TechSolutions Private Limited",
                position="Web Development Intern",
                start_date=date(2025, 6, 1),
                end_date=date(2025, 8, 31),
                is_current=False,
                description="Worked in a team of 4 to design and develop responsive web pages using React.js. Participated in daily standups and code reviews.",
                achievements=["Developed and optimized 10+ UI components, reducing page load time by 15%", "Integrated REST APIs with front-end components using Axios", "Identified and fixed 20+ bug tickets during QA phase"]
            )
            Experience.objects.create(
                profile=profile,
                company="Innovate Media",
                position="Software Engineer Trainee",
                start_date=date(2025, 12, 1),
                end_date=date(2026, 2, 28),
                is_current=False,
                description="Gained hands-on experience in backend development using Django and PostgreSQL. Wrote API endpoints and database migrations.",
                achievements=["Designed and implemented 5 secure REST endpoints for user authentication", "Wrote unit tests achieving 90% code coverage", "Optimized database queries, reducing response time by 10%"]
            )
            
            # Seed Projects
            Project.objects.create(
                profile=profile,
                title="Smart Campus Placement Portal",
                description="A Django-based web application facilitating campus placements with student profiles, mock interviews, and resume generation.",
                technologies=["Python", "Django", "PostgreSQL", "React.js"],
                link="https://github.com/arjunmehta/placement-portal",
                date=date(2025, 11, 15)
            )
            
            # Seed Certifications
            Certification.objects.create(
                profile=profile,
                name="Python for Data Science",
                issuer="IBM & Coursera",
                date=date(2024, 4, 10)
            )
            Certification.objects.create(
                profile=profile,
                name="Full-Stack Web Development",
                issuer="Meta & Coursera",
                date=date(2024, 11, 20)
            )
            
            # Seed Achievements
            Achievement.objects.create(
                profile=profile,
                title="First Place - Hackathon Kolkata 2025",
                issuer="Kolkata Tech Council",
                date=date(2025, 3, 15),
                description="Led a team of 3 to build a smart trash management system using IoT and Python."
            )
            Achievement.objects.create(
                profile=profile,
                title="Class Representative & Coordinator",
                issuer="iLEAD Student Council",
                date=date(2024, 7, 1),
                description="Coordinated with faculty members and students to organize academic events and placement drives."
            )

            # Seed Extracurricular Activities
            ExtracurricularActivity.objects.create(
                profile=profile,
                title="Technical Head – iLEAD Tech Fest 2025",
                description="Led the technical committee for the annual college tech festival, managing event logistics, participant registrations, and hardware setup for 15+ events.",
                date=date(2025, 2, 10)
            )
            ExtracurricularActivity.objects.create(
                profile=profile,
                title="Member – Coding Club, iLEAD",
                description="Active participant in weekly competitive programming sessions and inter-college hackathons. Mentored junior students in Python fundamentals.",
                date=date(2024, 6, 1)
            )
            ExtracurricularActivity.objects.create(
                profile=profile,
                title="NSS Volunteer",
                description="Participated in community outreach programs including digital literacy drives and tree plantation camps organized by the National Service Scheme.",
                date=date(2023, 11, 15)
            )
            print("Successfully seeded full profile data for student Arjun Mehta.")
        else:
            print("Demo student user ('student') not found. Seeding core student record skipped.")

    print("Deployment and seed data cleanup completed successfully!")

if __name__ == "__main__":
    deploy()
