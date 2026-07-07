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
from apps.profiles.models import StudentProfile, Skill, Education, Project, Experience, Certification, Achievement
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
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:3px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    {{ personal.phone|default:"Mobile Number" }}
                </span>
                <span>
                    |
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:3px; margin-left:3px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    {{ personal.email|default:"Email ID" }}
                </span>
                <span>
                    |
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:3px; margin-left:3px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
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
                            {% if "UG" in edu.degree %}
                                20XX – Present
                            {% elif "Class" in edu.degree %}
                                Year
                            {% else %}
                                {% if edu.graduation_date %}{{ edu.graduation_date|slice:":4" }}{% else %}Year{% endif %}
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

    <div class="two-column-body">
        <div class="left-column">
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
                <h3 class="section-title">ACHIEVEMENTS & POSITIONS OF RESPONSIBILITY</h3>
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
        </div>

        <div class="right-column">
            <div class="main-section">
                <h3 class="section-title">EXPERIENCE</h3>
                {% if experience %}
                    {% for exp in experience %}
                    <div class="experience-item">
                        <div class="exp-header">
                            <span class="company-name">{{ exp.company }}</span> | 
                            <span class="designation">{{ exp.position }}</span> | 
                            <span class="duration">
                                {% if exp.job_type %}{{ exp.job_type }} {% endif %}
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
                            <span class="designation">Designation</span> | 
                            <span class="duration">Internship (Month Year – Month Year)</span>
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
        </div>
    </div>

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
    font-family: 'Times New Roman', Georgia, Times, serif;
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

.two-column-body {
    display: block;
    margin-top: 10px;
}

.two-column-body::after {
    content: "";
    display: table;
    clear: both;
}

.left-column {
    float: left;
    width: 37%;
    padding-right: 12px;
}

.right-column {
    float: right;
    width: 58%;
    padding-left: 15px;
    border-left: 1.5px solid var(--primary-color);
}

.sidebar-section, .main-section {
    margin-bottom: 10px;
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

        # 2. Find and reset demo student profile
        student_user = User.objects.filter(login_id="student").first()
        if student_user:
            student_rec, _ = Student.objects.update_or_create(
                user=student_user,
                defaults={
                    "name": "Demo Student",
                    "registration_number": "REG-2026-BCA01",
                    "email": "",
                    "phone_number": "",
                }
            )
            print("Reset core Student email/phone to empty values.")
            
            profile, _ = StudentProfile.objects.update_or_create(
                student=student_rec,
                defaults={
                    "phone": "",
                    "location": "",
                    "professional_summary": "",
                    "linkedin": "",
                    "github": "",
                    "portfolio": ""
                }
            )
            
            # Clear all related profile entities to force fallbacks
            Skill.objects.filter(profile=profile).delete()
            Education.objects.filter(profile=profile).delete()
            Project.objects.filter(profile=profile).delete()
            Experience.objects.filter(profile=profile).delete()
            Certification.objects.filter(profile=profile).delete()
            Achievement.objects.filter(profile=profile).delete()
            print("Cleared all sub-entries for Demo Student profile (skills, experiences, education, etc.) to trigger template fallbacks.")
        else:
            print("Demo student user ('student') not found. Seeding core student record skipped.")

    print("Deployment and seed data cleanup completed successfully!")

if __name__ == "__main__":
    deploy()
