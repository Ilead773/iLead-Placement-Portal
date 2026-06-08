#!/usr/bin/env python
"""
Seed 40 real placements and internships for the iLEAD Placement Portal.
Deletes fake/mock jobs first to keep the database extremely clean.

Usage:
  python backend/seed_real_jobs.py
"""

import os
import django
from datetime import datetime, timedelta, timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.models import User
from apps.jobs.models import Job, JobRound

def seed_real_jobs():
    admin = User.objects.filter(role='admin').first()
    if not admin:
        # Fall back to any coordinator or create one if none exists
        admin = User.objects.first()
        if not admin:
            print("No user found in the database. Please run seed_full_mock_data.py first.")
            return

    print("Cleaning existing jobs...")
    Job.objects.all().delete()
    print("All old jobs deleted successfully.")

    # List of 40 real jobs
    jobs_data = [
        {
            "company_name": "Eastern Finance",
            "role": "HR Intern",
            "listing_type": "internship",
            "package": 0.0,
            "description": "Gain hands-on experience in recruiting, employee onboarding, database management, and payroll processes. Perfect opportunity for BBA HR students.",
            "location": "Kolkata, India",
            "allowed_branches": ["BBA", "BBA in Sports Management (BBA SM)", "BBA in Hospital Management (BBA HM)"],
            "category": "C"
        },
        {
            "company_name": "Alliance Vission",
            "role": "Digital Marketing, Sales, HR & Analytics Interns",
            "listing_type": "internship",
            "package": 1.20,
            "description": "Join our dynamic team for multifaceted exposure across Digital Marketing campaigns, Sales pipelines, Human Resources support, and Business Analytics dashboards. Academic credit/stipend up to ₹10,000.",
            "location": "Kolkata, India",
            "allowed_branches": [
                "BBA", 
                "BBA in Digital Marketing (BBA DM)", 
                "BBA in Entrepreneurship (BBA ENT)", 
                "BSc in Data Science",
                "BSc in Computer Application (BCA)"
            ],
            "category": "B"
        },
        {
            "company_name": "SVF",
            "role": "Summer Internship (Media & Management)",
            "listing_type": "internship",
            "package": 0.48,
            "description": "Premium summer internship at one of Eastern India's leading entertainment conglomerates. Work across movie production support, event execution, and content marketing operations.",
            "location": "Kolkata, India",
            "allowed_branches": [
                "BSc in Media Science (BMS)", 
                "MSc in Media Science", 
                "BSc in Film and Television Production (FTP)", 
                "BBA"
            ],
            "category": "A"
        },
        {
            "company_name": "Kolkata TV",
            "role": "Anchor cum Digital Desk Executive",
            "listing_type": "internship",
            "package": 0.60,
            "description": "Seeking energetic hosts and scriptwriters. Responsibility includes anchoring regional news broadcasts, managing digital news desks, and curating viral social media summaries.",
            "location": "Kolkata, India",
            "allowed_branches": ["BSc in Media Science (BMS)", "MSc in Media Science", "BSc in Film and Television Production (FTP)"],
            "category": "B"
        },
        {
            "company_name": "Mould Innovation",
            "role": "Junior Data & Operations Analyst",
            "listing_type": "internship",
            "package": 0.36,
            "description": "Manage database records, analyze daily operations KPIs, and prepare performance dashboards. Requires high proficiency in Excel and basic data management concepts.",
            "location": "Kolkata (On-site)",
            "allowed_branches": ["BSc in Data Science", "BSc in Computer Application (BCA)", "BBA"],
            "category": "C"
        },
        {
            "company_name": "Haldiram",
            "role": "Data Analyst & Inventory Management Intern",
            "listing_type": "internship",
            "package": 0.48,
            "description": "Excellent opportunity to learn Supply Chain and Inventory operations at a massive food product brand. Track stock levels, analyze logistical blockages, and build supply-chain spreadsheets.",
            "location": "Kolkata, India",
            "allowed_branches": ["BBA", "BSc in Data Science", "BSc in Computer Application (BCA)"],
            "category": "B"
        },
        {
            "company_name": "NBNS News",
            "role": "Anchor / Journalist Trainee",
            "listing_type": "internship",
            "package": 0.84,
            "description": "Ground reporting, telecast anchoring, and digital script editing. Candidate must have outstanding command over local regional languages and strong on-camera confidence.",
            "location": "Kolkata, India",
            "allowed_branches": ["BSc in Media Science (BMS)", "MSc in Media Science"],
            "category": "B"
        },
        {
            "company_name": "South City Mall",
            "role": "Operations & Facility Management Trainee",
            "listing_type": "internship",
            "package": 0.60,
            "description": "Join the operations desk at one of Kolkata's premier shopping hubs. Assist in vendor relations, footfall analysis, event scheduling, and general administration.",
            "location": "Kolkata, India",
            "allowed_branches": ["BBA", "BBA in Sports Management (BBA SM)", "BBA in Entrepreneurship (BBA ENT)"],
            "category": "C"
        },
        {
            "company_name": "StoryNest Communications",
            "role": "PR and Communications Intern",
            "listing_type": "internship",
            "package": 0.0,
            "description": "Design creative press releases, handle corporate newsletters, build media relation lists, and support brand strategy workshops for retail clients.",
            "location": "Remote / Kolkata",
            "allowed_branches": ["BSc in Media Science (BMS)", "MSc in Media Science", "BBA in Digital Marketing (BBA DM)"],
            "category": "C"
        },
        {
            "company_name": "Times of Bengal",
            "role": "Content Writing & Photography Trainee",
            "listing_type": "internship",
            "package": 0.0,
            "description": "Learn professional journalism, copy drafting, court news summarization, photography, and live event reporting. Highly dynamic work environment.",
            "location": "Kolkata, India",
            "allowed_branches": [
                "BSc in Media Science (BMS)", 
                "MSc in Media Science", 
                "BSc in Film and Television Production (FTP)"
            ],
            "category": "C"
        },
        {
            "company_name": "HCG Hospital",
            "role": "Healthcare Administrator Trainee",
            "listing_type": "internship",
            "package": 0.0,
            "description": "Support ICU administration desks, front desk patient relations, medical documentation, and healthcare logistics. Excellent launchpad for healthcare administration careers.",
            "location": "Kolkata, India",
            "allowed_branches": ["BBA in Hospital Management (BBA HM)", "BSc in Critical Care Technology (CCT)"],
            "category": "B"
        },
        {
            "company_name": "Kaarrayam Realty",
            "role": "Real Estate Operations Trainee",
            "listing_type": "internship",
            "package": 0.0,
            "description": "Handle client relationship management dashboards, property inspection schedules, customer feedback, and basic marketing campaigns for residential projects.",
            "location": "Kolkata, India",
            "allowed_branches": ["BBA", "BBA in Entrepreneurship (BBA ENT)"],
            "category": "C"
        },
        {
            "company_name": "Deal Squard",
            "role": "Business Development & Client Management Intern",
            "listing_type": "internship",
            "package": 0.0,
            "description": "Assisting the sales pipeline, qualifying retail leads, drafting custom B2B proposals, and coordinating merchant-support accounts.",
            "location": "Kolkata, India",
            "allowed_branches": ["BBA", "BBA in Entrepreneurship (BBA ENT)", "BBA in Digital Marketing (BBA DM)"],
            "category": "C"
        },
        {
            "company_name": "Manipal Hospital",
            "role": "Hospital Operations Executive",
            "listing_type": "internship",
            "package": 0.0,
            "description": "Undertake responsibility for emergency-care coordination, billing pipelines, diagnostic scheduling, and patient relation logs at a premier multi-specialty facility.",
            "location": "Kolkata, India",
            "allowed_branches": [
                "BBA in Hospital Management (BBA HM)", 
                "BSc in Critical Care Technology (CCT)", 
                "BSc in Medical Laboratory Technology (BMLT)"
            ],
            "category": "A"
        },
        {
            "company_name": "Diamond Beverages Pvt Ltd (Coca-Cola)",
            "role": "Frontline Sales Executive",
            "listing_type": "internship",
            "package": 1.20,
            "description": "Manage retail distribution points, evaluate distributor stock levels, and pitch promotions directly. Stipend includes competitive sales incentive commissions + ₹2,500 fuel allowances.",
            "location": "Kolkata Outskirts",
            "allowed_branches": ["BBA", "BBA in Entrepreneurship (BBA ENT)", "BBA in Sports Management (BBA SM)"],
            "category": "B"
        },
        {
            "company_name": "Senco Gold & Diamonds",
            "role": "Market Research Analyst",
            "listing_type": "internship",
            "package": 0.84,
            "description": "Conduct brand-awareness surveys, perform competitor retail benchmarking, and construct comprehensive customer-buying trends spreadsheets.",
            "location": "Kolkata, India",
            "allowed_branches": ["BBA", "BBA in Digital Marketing (BBA DM)", "BSc in Data Science"],
            "category": "B"
        },
        {
            "company_name": "HVAC",
            "role": "Graphic Designer Intern",
            "listing_type": "internship",
            "package": 1.08,
            "description": "Design stellar commercial brochures, corporate presentations, social banners, and layout prints. Experience in Adobe Photoshop/Illustrator is highly preferred.",
            "location": "Kolkata (On-site)",
            "allowed_branches": [
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)", 
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)",
                "BSc in Interior Design"
            ],
            "category": "B"
        },
        {
            "company_name": "SITI Network",
            "role": "Marketing Field Trainee",
            "listing_type": "internship",
            "package": 0.0,
            "description": "Execute offline customer surveys, drive local advertisement activations, manage retail cable partner signups, and evaluate local broadcast feedback.",
            "location": "Kolkata Districts",
            "allowed_branches": ["BBA", "BBA in Digital Marketing (BBA DM)", "BSc in Media Science (BMS)"],
            "category": "C"
        },
        {
            "company_name": "Recex",
            "role": "HR Sourcing Intern",
            "listing_type": "internship",
            "package": 0.60,
            "description": "Screen applicant profiles across job portals, schedule virtual technical interviews, compile recruiter feedback logs, and assist in college campus hiring campaigns.",
            "location": "Kolkata, India",
            "allowed_branches": ["BBA", "BBA in Hospital Management (BBA HM)"],
            "category": "C"
        },
        {
            "company_name": "Mould Innovation",
            "role": "Graphic Design Associate",
            "listing_type": "internship",
            "package": 0.48,
            "description": "Deliver modern interface assets, advertising banner sets, promotional visual aids, and product package print alignments.",
            "location": "Kolkata, India",
            "allowed_branches": [
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)", 
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)"
            ],
            "category": "C"
        },
        {
            "company_name": "Cubic HR",
            "role": "HR Recruiter & Marketing Intern",
            "listing_type": "internship",
            "package": 0.33,
            "description": "Dual profile focusing on candidate sourcing pipelines and corporate-brand LinkedIn promotion. Offers valuable agency-side recruitment environment exposure.",
            "location": "Kolkata, India",
            "allowed_branches": ["BBA", "BBA in Digital Marketing (BBA DM)"],
            "category": "C"
        },
        {
            "company_name": "Shopper Stop",
            "role": "Retail Operations Associate (HR/Sales)",
            "listing_type": "internship",
            "package": 0.0,
            "description": "Support store hiring operations, floor manager coordination, retail branding promotions, and customer relations management in our premier Kolkata stores.",
            "location": "Kolkata Mall Outlets",
            "allowed_branches": ["BBA", "BBA in Entrepreneurship (BBA ENT)", "BSc in Sustainable Fashion Design & Management"],
            "category": "B"
        },
        {
            "company_name": "Voice TV",
            "role": "Broadcast Journalist Intern",
            "listing_type": "internship",
            "package": 0.0,
            "description": "Learn rapid regional script curation, dynamic audio overlays, live telemetry report logs, and teleprompter read strategies under expert guidance.",
            "location": "Kolkata Studio",
            "allowed_branches": ["BSc in Media Science (BMS)", "MSc in Media Science", "BSc in Film and Television Production (FTP)"],
            "category": "C"
        },
        {
            "company_name": "Instruck Design Studio",
            "role": "Creative Graphic & Content Intern",
            "listing_type": "internship",
            "package": 0.0,
            "description": "Work in an architecture & interior studio. Build stunning portfolio catalog pages, write design descriptions, and handle social media visuals.",
            "location": "Kolkata, India",
            "allowed_branches": [
                "BSc in Interior Design", 
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "BSc in Media Science (BMS)"
            ],
            "category": "B"
        },
        {
            "company_name": "The Baklava Box",
            "role": "E-Commerce Marketing Intern",
            "listing_type": "internship",
            "package": 0.84,
            "description": "Support luxury product packaging design, catalog uploads on Amazon/Shopify, social promotion designs, and tracking dispatch logistics operations.",
            "location": "Kolkata, India",
            "allowed_branches": ["BBA in Digital Marketing (BBA DM)", "BBA in Entrepreneurship (BBA ENT)", "BSc in Multimedia, Animation, Graphic Design (BMAGD)"],
            "category": "B"
        },
        {
            "company_name": "Shyamoli Paribahn",
            "role": "Social Media Coordinator & Designer",
            "listing_type": "internship",
            "package": 1.20,
            "description": "Establish digital travel engagement templates, design schedule banners, track online customer bookings, and run localized Meta promotion setups.",
            "location": "Kolkata, India",
            "allowed_branches": [
                "BBA in Travel & Tourism Management (BBA TTM)", 
                "BBA in Digital Marketing (BBA DM)",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)"
            ],
            "category": "B"
        },
        {
            "company_name": "Kolaz Infotainment",
            "role": "Client Servicing & Graphic Intern",
            "listing_type": "internship",
            "package": 0.0,
            "description": "Coordinate premium entertainment account briefs, outline video specifications, support digital design requirements, and build project roadmaps.",
            "location": "Kolkata, India",
            "allowed_branches": [
                "BSc in Media Science (BMS)", 
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "BSc in Film and Television Production (FTP)"
            ],
            "category": "B"
        },
        {
            "company_name": "MCK Group",
            "role": "Field Marketing Intern",
            "listing_type": "internship",
            "package": 0.60,
            "description": "Support institutional corporate sales campaigns, prepare customer brochures, compile CRM spreadsheets, and arrange local promotions. Travel allowance provided.",
            "location": "Kolkata, India",
            "allowed_branches": ["BBA", "BBA in Entrepreneurship (BBA ENT)", "BBA in Sports Management (BBA SM)"],
            "category": "C"
        },
        {
            "company_name": "Kolkata TV Digital",
            "role": "Video Editor & Digital Desk Executive",
            "listing_type": "internship",
            "package": 0.66,
            "description": "Perform high-speed news cuts, generate subtitles, apply color filters, and manage live digital telemetry dashboards.",
            "location": "Kolkata, India",
            "allowed_branches": [
                "BSc in Film and Television Production (FTP)", 
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)",
                "BSc in Media Science (BMS)"
            ],
            "category": "B"
        },
        {
            "company_name": "Animatrix Multimedia",
            "role": "Video Editing & VFX Intern",
            "listing_type": "internship",
            "package": 0.72,
            "description": "Refine premium broadcast promo spots, arrange chroma key overlays, align background audio channels, and learn professional timeline workflows.",
            "location": "Kolkata, India",
            "allowed_branches": [
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)", 
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)",
                "BSc in Film and Television Production (FTP)"
            ],
            "category": "A"
        },
        {
            "company_name": "CloudHouse Animation Studios Pvt.",
            "role": "2D / 3D Animation Intern",
            "listing_type": "internship",
            "package": 0.0,
            "description": "Assist in building character walk cycles, rigging vector components, drafting vector storyboard pages, and render optimization checks.",
            "location": "Kolkata, India",
            "allowed_branches": [
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)", 
                "MSc in Multimedia, Animation, Graphic Design (MMAGD)"
            ],
            "category": "A"
        },
        {
            "company_name": "Dev Nagri (KR Group)",
            "role": "Social Media Manager",
            "listing_type": "internship",
            "package": 1.50,
            "description": "Establish complete social branding calendars, direct promotional photography schedules, respond to customer interactions, and compile growth spreadsheets.",
            "location": "Kolkata, India",
            "allowed_branches": ["BBA in Digital Marketing (BBA DM)", "BSc in Media Science (BMS)"],
            "category": "B"
        },
        {
            "company_name": "Brainlicious (StartUp Company)",
            "role": "HR Generalist Intern",
            "listing_type": "internship",
            "package": 0.0,
            "description": "Fast-paced startup setting. Setup modern Google Form surveys, organize virtual onboarding meetings, arrange employee directories, and coordinate weekly team fun activities.",
            "location": "Remote, India",
            "allowed_branches": ["BBA", "BBA in Entrepreneurship (BBA ENT)", "BBA in Hospital Management (BBA HM)"],
            "category": "C"
        },
        {
            "company_name": "Print O Post Media",
            "role": "Graphic Designer Trainee",
            "listing_type": "internship",
            "package": 0.60,
            "description": "Work in high-volume print media layout agency. Format retail package prints, customize flex brochures, convert vector assets, and align printer color sheets.",
            "location": "Kolkata, India",
            "allowed_branches": [
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)", 
                "BSc in Sustainable Fashion Design & Management"
            ],
            "category": "C"
        },
        {
            "company_name": "AI Academia",
            "role": "Business Development Associate",
            "listing_type": "internship",
            "package": 1.68,
            "description": "Pitch premium educational programs to students, manage pipeline spreadsheets, compile corporate outreach details, and handle retail enrollments.",
            "location": "Kolkata, India",
            "allowed_branches": ["BBA", "BBA in Entrepreneurship (BBA ENT)", "BSc in Data Science", "BSc in Computer Application (BCA)"],
            "category": "B"
        },
        {
            "company_name": "Blue Copper Technologies Pvt. Ltd",
            "role": "HR & Sales Coordinator Intern",
            "listing_type": "internship",
            "package": 0.0,
            "description": "Gain immense IT agency experience. Sourcing developer CVs, maintaining corporate communications, planning team allocations, and scheduling calls.",
            "location": "Kolkata, India",
            "allowed_branches": [
                "BSc in Computer Application (BCA)", 
                "BSc in Data Science", 
                "BBA"
            ],
            "category": "B"
        },
        {
            "company_name": "Envision X Innovations Pvt Ltd",
            "role": "Business Development & Media Intern",
            "listing_type": "internship",
            "package": 1.50,
            "description": "Coordinate enterprise client requirements, outline social promotional layouts, formulate marketing schedules, and run client review reports.",
            "location": "Kolkata, India",
            "allowed_branches": [
                "BBA in Digital Marketing (BBA DM)", 
                "BSc in Media Science (BMS)",
                "BSc in Computer Application (BCA)"
            ],
            "category": "B"
        },
        {
            "company_name": "NBNS",
            "role": "Regional Broadcast Anchor (Hindi/Bengali)",
            "listing_type": "internship",
            "package": 0.84,
            "description": "Deliver professional telecast broadcasts, voice-over for regional visual highlights, translate digital scripts, and anchor live event telecasts.",
            "location": "Kolkata Studio",
            "allowed_branches": ["BSc in Media Science (BMS)", "MSc in Media Science", "BSc in Film and Television Production (FTP)"],
            "category": "B"
        },
        {
            "company_name": "Iblix Digital",
            "role": "Script Writer & Video Editor Intern",
            "listing_type": "internship",
            "package": 0.54,
            "description": "Dual focus on regional visual storyboard writing and video edits for digital platforms. Exceptional opportunity for creative-media graduates.",
            "location": "Kolkata, India",
            "allowed_branches": [
                "BSc in Film and Television Production (FTP)", 
                "BSc in Media Science (BMS)",
                "BSc in Multimedia, Animation, Graphic Design (BMAGD)"
            ],
            "category": "B"
        },
        {
            "company_name": "Tenhard India Pvt Ltd",
            "role": "Management & Business Analytics Executive",
            "listing_type": "internship",
            "package": 1.92,
            "description": "Multidisciplinary management rotation. Track departmental KPIs, map finance spreadsheets, support operational pipelines, and present executive summaries.",
            "location": "Kolkata, India",
            "allowed_branches": [
                "BBA", 
                "BBA in Entrepreneurship (BBA ENT)", 
                "BSc in Data Science",
                "BSc in Computer Application (BCA)"
            ],
            "category": "A"
        }
    ]

    # Insert jobs
    created_count = 0
    for j_data in jobs_data:
        job = Job.objects.create(
            company_name=j_data["company_name"],
            role=j_data["role"],
            description=j_data["description"],
            package=j_data["package"],
            location=j_data["location"],
            job_type="internal",  # Normal/internal jobs as requested
            listing_type=j_data["listing_type"],
            category=j_data["category"],
            openings_count=2,
            hr_email=f"hr@{j_data['company_name'].lower().replace(' ', '').replace('.', '').replace(',', '')}.com",
            eligibility_rules={
                "min_cgpa": 6.0,
                "allowed_branches": j_data["allowed_branches"],
                "required_skills": ["Communication", "MS Office", "Problem Solving"],
                "allowed_years": [2025, 2026],
                "no_backlog": False
            },
            application_deadline=datetime.now(timezone.utc) + timedelta(days=60),
            status="active",
            created_by=admin
        )

        # Setup standard selection rounds
        JobRound.objects.create(
            job=job,
            round_number=1,
            round_name="Resume Shortlisting",
            round_type="test",
            is_elimination=True,
            duration_minutes=30
        )
        JobRound.objects.create(
            job=job,
            round_number=2,
            round_name="HR & Technical Interview",
            round_type="interview",
            is_elimination=True
        )

        created_count += 1

    print(f"Successfully seeded {created_count} real placement and internship jobs!")

if __name__ == "__main__":
    seed_real_jobs()
