# apps/scraped_jobs/course_config.py
"""
Complete course search configuration for all 20 iLEAD courses.
Provides hardcoded defaults + DB-driven override via CourseSearchConfig model.
"""

COURSE_SEARCH_CONFIG = {
    "BBA": {
        "keywords": [
            "Business Development Executive", "Marketing Executive", "Sales Executive",
            "HR Executive / HR Recruiter", "Operations Executive", "Customer Relationship Executive",
            "Client Servicing Executive", "Digital Marketing Executive", "Social Media Executive",
            "Management Trainee", "Business Analyst (Entry Level)", "Retail Management Executive",
            "Financial Services Associate", "Banking Associate", "Administrative Executive",
            "Talent Acquisition Executive", "Brand Promotion Executive", "Event Management Executive",
            "Supply Chain / Logistics Executive", "E-commerce Executive", "Travel & Tourism Executive",
            "Hospital Administration Executive", "CRM Executive", "Market Research Associate",
        ],
        "internship_keywords": [
            "business intern", "sales intern", "marketing intern", "operations intern", "HR intern",
        ],
        "exclude_keywords": ["10+ years", "VP", "director"],
    },
    "BBA (Finance)": {
        "keywords": [
            "Finance Executive", "Financial Analyst (Entry Level)", "Accounts Executive",
            "Accounts Payable/Receivable Executive", "Banking Associate", "Relationship Manager",
            "Investment Banking Intern", "Equity Research Analyst Intern", "Taxation Executive",
            "Audit Associate", "Financial Planning Associate", "Insurance Advisor / Executive",
            "Loan Processing Executive", "Credit Analyst", "Wealth Management Associate",
            "Payroll Executive", "MIS Executive", "Treasury Operations Executive",
            "Risk & Compliance Associate", "Stock Market Analyst Intern", "Finance Operations Executive",
            "Corporate Finance Intern", "Billing Executive", "Junior Accountant", "Mutual Fund Advisor / Associate",
        ],
        "internship_keywords": [
            "finance intern", "accounts intern", "investment banking intern", "equity research intern", "corporate finance intern",
        ],
        "exclude_keywords": ["10+ years", "VP finance", "CFO", "director"],
    },
    "BBA in Digital Marketing (BBA DM)": {
        "keywords": [
            "Digital Marketing Executive", "Social Media Executive", "Social Media Manager",
            "SEO Executive", "SEM/PPC Executive", "Content Marketing Executive",
            "Performance Marketing Executive", "Email Marketing Executive", "Brand Marketing Executive",
            "Influencer Marketing Executive", "Content Creator", "Copywriter", "Marketing Executive",
            "Growth Marketing Executive", "E-commerce Marketing Executive", "Web Marketing Executive",
            "Google Ads Executive", "Meta Ads Executive", "CRM Marketing Executive", "Marketing Analyst",
            "Campaign Management Executive", "Affiliate Marketing Executive", "Online Reputation Management Executive",
            "Media Planning Executive", "Digital Strategy Associate",
        ],
        "internship_keywords": [
            "digital marketing intern", "social media intern", "SEO intern", "content marketing intern", "PPC intern",
        ],
        "exclude_keywords": ["10+ years", "VP marketing", "CMO"],
    },
    "BBA in Travel & Tourism Management (BBA TTM)": {
        "keywords": [
            "Travel Consultant", "Tour Executive", "Ticketing Executive", "Travel Coordinator",
            "Holiday Consultant", "Reservation Executive", "Visa Processing Executive",
            "Destination Specialist", "Travel Sales Executive", "Customer Support Executive",
            "Tour Planner", "Operations Executive", "Front Office Executive", "Airline Ground Staff",
            "Airport Operations Executive", "Cruise Line Executive", "Event & Travel Coordinator",
            "MICE Executive", "Hospitality Executive", "Guest Relations Executive",
            "Corporate Travel Consultant", "Travel Content Executive", "Itinerary Planner",
            "Travel Desk Executive", "Tourism Marketing Executive",
        ],
        "internship_keywords": [
            "travel intern", "tourism intern", "hospitality intern", "tour operations intern",
        ],
        "exclude_keywords": ["10+ years", "general manager"],
    },
    "BBA in Entrepreneurship (BBA ENT)": {
        "keywords": [
            "Business Development Executive", "Startup Operations Executive", "Entrepreneur / Startup Founder",
            "Management Trainee", "Operations Executive", "Project Coordinator", "Product Executive",
            "Sales & Marketing Executive", "Client Servicing Executive", "Growth Executive",
            "Innovation Associate", "Business Strategy Associate", "Vendor Management Executive",
            "E-commerce Executive", "Community Manager", "Market Research Analyst", "Brand Executive",
            "Partnership Executive", "Business Analyst (Entry Level)", "Customer Success Executive",
            "Franchise Development Executive", "Digital Marketing Executive", "Social Media Executive",
            "Event & Activation Executive", "Business Consultant (Entry Level)",
        ],
        "internship_keywords": [
            "startup intern", "entrepreneurship intern", "business development intern", "founder office intern",
        ],
        "exclude_keywords": ["10+ years", "CXO", "C-suite"],
    },
    "BBA in Sports Management (BBA SM)": {
        "keywords": [
            "Sports Management Executive", "Sports Operations Executive", "Event Management Executive",
            "Sports Marketing Executive", "Athlete Relations Executive", "Team Coordinator",
            "Tournament Coordinator", "Fitness Centre Manager", "Sports Facility Executive",
            "Sponsorship Executive", "Brand Partnership Executive", "Sports Analyst",
            "Community Engagement Executive", "Sports Sales Executive", "Public Relations Executive",
            "Sports Content Executive", "Social Media Executive – Sports", "Sports Event Coordinator",
            "Merchandising Executive", "League Operations Executive", "Sports Administration Executive",
            "Client Servicing Executive", "Esports Operations Executive", "Fan Engagement Executive",
            "Business Development Executive – Sports",
        ],
        "internship_keywords": [
            "sports intern", "sports management intern", "sports event intern", "sports marketing intern",
        ],
        "exclude_keywords": ["10+ years", "director"],
    },
    "BBA in Hospital Management (BBA HM)": {
        "keywords": [
            "Hospital Administration Executive", "Healthcare Operations Executive", "Patient Relationship Executive",
            "Front Office Executive", "Medical Coordinator", "Healthcare Administrator",
            "Hospital Operations Executive", "Admission Coordinator", "Billing Executive",
            "Insurance Claim Executive", "Medical Records Executive", "Patient Care Coordinator",
            "Clinic Manager", "Healthcare HR Executive", "Quality Assurance Executive – Healthcare",
            "Healthcare Marketing Executive", "Customer Support Executive – Healthcare", "Diagnostic Centre Executive",
            "Telemedicine Coordinator", "Pharmacy Operations Executive", "Healthcare Business Development Executive",
            "Hospital Duty Manager", "Vendor Management Executive – Healthcare", "Healthcare Compliance Executive",
            "Insurance TPA Coordinator",
        ],
        "internship_keywords": [
            "hospital management intern", "healthcare administration intern", "hospital operations intern",
        ],
        "exclude_keywords": ["doctor", "physician", "surgeon", "10+ years"],
    },
    "BSc in Media Science (BMS)": {
        "keywords": [
            "Content Writer", "Copywriter", "Video Editor", "Graphic Designer", "Social Media Executive",
            "Digital Marketing Executive", "Public Relations Executive", "Media Planner",
            "Client Servicing Executive", "News Reporter", "Anchor / Presenter", "Content Creator",
            "Script Writer", "Production Assistant", "Creative Executive", "Brand Communication Executive",
            "Corporate Communication Executive", "Radio Jockey (RJ)", "Television Production Executive",
            "Advertising Executive", "Event Management Executive", "Influencer Marketing Executive",
            "Journalist", "Media Research Executive", "Camera Assistant", "Podcast Producer / Executive",
        ],
        "internship_keywords": [
            "media intern", "journalism intern", "PR intern", "content creation intern", "video production intern",
        ],
        "exclude_keywords": ["editor in chief", "10+ years"],
    },
    "MSc in Media Science": {
        "keywords": [
            "Content Writer", "Copywriter", "Video Editor", "Graphic Designer", "Social Media Executive",
            "Digital Marketing Executive", "Public Relations Executive", "Media Planner",
            "Client Servicing Executive", "News Reporter", "Anchor / Presenter", "Content Creator",
            "Script Writer", "Production Assistant", "Creative Executive", "Brand Communication Executive",
            "Corporate Communication Executive", "Radio Jockey (RJ)", "Television Production Executive",
            "Advertising Executive", "Event Management Executive", "Influencer Marketing Executive",
            "Journalist", "Media Research Executive", "Camera Assistant", "Podcast Producer / Executive",
        ],
        "internship_keywords": [
            "media intern", "journalism intern", "PR intern", "content creation intern", "video production intern",
        ],
        "exclude_keywords": ["editor in chief", "10+ years"],
    },
    "BSc in Multimedia, Animation, Graphic Design (BMAGD)": {
        "keywords": [
            "Graphic Designer", "Motion Graphic Designer", "2D Animator", "3D Animator",
            "Multimedia Designer", "UI/UX Designer", "Video Editor", "Visual Designer",
            "Creative Designer", "Branding Executive", "Illustrator", "Digital Artist",
            "Character Designer", "Storyboard Artist", "VFX Artist", "Social Media Designer",
            "Web Designer", "Game Design Assistant", "Packaging Designer", "Content Creator",
            "Creative Executive", "Motion Graphics Editor", "Advertising Design Executive",
            "Presentation Designer", "Junior Art Director",
        ],
        "internship_keywords": [
            "animation intern", "graphic design intern", "multimedia intern", "UI/UX intern", "VFX intern",
        ],
        "exclude_keywords": ["senior", "lead", "manager", "director", "10+ years"],
    },
    "MSc in Multimedia, Animation, Graphic Design (MMAGD)": {
        "keywords": [
            "Graphic Designer", "Motion Graphic Designer", "2D Animator", "3D Animator",
            "Multimedia Designer", "UI/UX Designer", "Video Editor", "Visual Designer",
            "Creative Designer", "Branding Executive", "Illustrator", "Digital Artist",
            "Character Designer", "Storyboard Artist", "VFX Artist", "Social Media Designer",
            "Web Designer", "Game Design Assistant", "Packaging Designer", "Content Creator",
            "Creative Executive", "Motion Graphics Editor", "Advertising Design Executive",
            "Presentation Designer", "Junior Art Director",
        ],
        "internship_keywords": [
            "animation intern", "graphic design intern", "multimedia intern", "UI/UX intern", "VFX intern",
        ],
        "exclude_keywords": ["senior", "lead", "manager", "director", "10+ years"],
    },
    "BSc in Film and Television Production (FTP)": {
        "keywords": [
            "Video Editor", "Assistant Director", "Production Assistant", "Cinematographer",
            "Camera Assistant", "Script Writer", "Screenwriter", "Content Creator",
            "Creative Producer", "Line Producer", "Production Coordinator", "Sound Designer",
            "Lighting Technician", "Video Production Executive", "Post-Production Executive",
            "Film Editor", "Assistant Cinematographer", "Casting Assistant", "Art Direction Assistant",
            "Photography Executive", "Studio Operations Executive", "Broadcast Executive",
            "Television Production Executive", "Promo Producer", "OTT Content Executive",
        ],
        "internship_keywords": [
            "film production intern", "video editing intern", "cinematography intern", "assistant director intern",
        ],
        "exclude_keywords": ["senior director", "executive producer", "10+ years"],
    },
    "BSc in Interior Design": {
        "keywords": [
            "Interior Designer", "Junior Interior Designer", "Space Planner", "3D Visualizer",
            "Furniture Designer", "Design Consultant", "Residential Interior Designer",
            "Commercial Interior Designer", "Modular Kitchen Designer", "Set Designer",
            "Exhibition Designer", "Lighting Designer", "CAD Designer", "AutoCAD Draftsman",
            "Project Coordinator – Interior Design", "Site Supervisor", "Styling Consultant",
            "Retail Space Designer", "Visual Merchandiser", "Interior Decor Consultant",
            "Architectural Assistant", "Client Servicing Executive – Interior Projects",
            "Design Executive", "Material & Vendor Coordinator", "Interior Project Executive",
        ],
        "internship_keywords": ["interior design intern", "CAD intern", "3D visualizer intern", "space planning intern"],
        "exclude_keywords": ["senior architect", "10+ years"],
    },
    "BSc in Sustainable Fashion Design & Management": {
        "keywords": [
            "fashion design", "fashion designer", "sustainable fashion",
            "apparel merchandiser", "fashion stylist", "textile designer",
            "fashion management",
        ],
        "internship_keywords": [
            "fashion design intern", "fashion intern", "styling intern",
            "merchandising intern",
        ],
        "exclude_keywords": ["senior designer", "10+ years", "creative director"],
    },
    "Bachelor in Optometry": {
        "keywords": [
            "optometrist", "optometry", "optical", "vision care",
            "eye care specialist", "ophthalmic technician",
            "contact lens specialist",
        ],
        "internship_keywords": [
            "optometry intern", "optical intern", "vision care intern",
        ],
        "exclude_keywords": ["ophthalmologist MD", "10+ years"],
    },
    "BSc in Critical Care Technology (CCT)": {
        "keywords": [
            "critical care technician", "ICU technician", "medical equipment",
            "biomedical technician", "respiratory therapist",
            "dialysis technician",
        ],
        "internship_keywords": [
            "critical care intern", "biomedical intern",
            "medical technician intern",
        ],
        "exclude_keywords": ["doctor", "physician", "10+ years"],
    },
    "BSc in Medical Laboratory Technology (BMLT)": {
        "keywords": [
            "medical lab technician", "MLT", "laboratory technician",
            "pathology lab", "clinical lab", "diagnostic lab", "lab analyst",
        ],
        "internship_keywords": [
            "lab technician intern", "MLT intern", "pathology intern",
        ],
        "exclude_keywords": ["doctor", "physician", "10+ years"],
    },
    "BSc in Data Science": {
        "keywords": [
            "Data Analyst", "Business Analyst", "Junior Data Scientist",
            "Machine Learning Intern", "AI/ML Trainee", "BI (Business Intelligence) Analyst",
            "Data Engineer Intern", "Python Developer (Data-focused roles)",
        ],
        "internship_keywords": [
            "data science intern", "ML intern", "data analyst intern", "AI intern",
        ],
        "exclude_keywords": [
            "10+ years", "8+ years", "5+ years", "senior", "lead", "manager", "director",
            "principal", "staff", "III", "IV", "V", "architect", "expert",
        ],
    },
    "BSc in Cyber Security": {
        "keywords": [
            "SOC Level-1 Analyst", "Junior Penetration Tester", "Ethical Hacker",
            "Vulnerability Analyst", "Network Security Associate", "Compliance Service Associate",
        ],
        "internship_keywords": [
            "cybersecurity intern", "security intern", "SOC intern",
        ],
        "exclude_keywords": [
            "10+ years", "5+ years", "senior", "lead", "manager", "CISO", "head of",
            "principal", "III", "IV",
        ],
    },
    "BSc in Computer Application (BCA)": {
        "keywords": [
            "software developer fresher", "web developer", "junior developer",
            "full stack developer fresher", "PHP developer",
            "Java developer fresher", "React developer fresher",
        ],
        "internship_keywords": [
            "software intern", "web development intern",
            "coding intern", "developer intern",
        ],
        "exclude_keywords": [
            "senior", "lead", "manager", "principal", "staff", "architect", 
            "III", "IV", "VP", "Director", "10+ years", "8+ years",
        ],
    },
}


# ─── Course-to-department mapping ────────────────────────────────────────────
COURSE_TO_DEPARTMENT_MAP = {
    "BBA": "Business & Management",
    "BBA (Finance)": "Business & Management",
    "BBA in Digital Marketing (BBA DM)": "Business & Management",
    "BBA in Travel & Tourism Management (BBA TTM)": "Business & Management",
    "BBA in Entrepreneurship (BBA ENT)": "Business & Management",
    "BBA in Sports Management (BBA SM)": "Business & Management",
    "BBA in Hospital Management (BBA HM)": "Business & Management",
    "BSc in Media Science (BMS)": "Design & Media",
    "MSc in Media Science": "Design & Media",
    "BSc in Multimedia, Animation, Graphic Design (BMAGD)": "Design & Media",
    "MSc in Multimedia, Animation, Graphic Design (MMAGD)": "Design & Media",
    "BSc in Film and Television Production (FTP)": "Design & Media",
    "BSc in Interior Design": "Design & Media",
    "BSc in Sustainable Fashion Design & Management": "Design & Media",
    "Bachelor in Optometry": "Health Sciences",
    "BSc in Critical Care Technology (CCT)": "Health Sciences",
    "BSc in Medical Laboratory Technology (BMLT)": "Health Sciences",
    "BSc in Data Science": "Technology",
    "BSc in Cyber Security": "Technology",
    "BSc in Computer Application (BCA)": "Technology",
}


# ─── Per-course source priority — configurable waterfall ─────────────────────
SCRAPER_STRATEGIES = {
    "BSc in Data Science": ["jsearch", "greenhouse", "lever", "adzuna"],
    "BSc in Cyber Security": ["jsearch", "greenhouse", "adzuna"],
    "BSc in Computer Application (BCA)": ["jsearch", "greenhouse", "lever", "adzuna"],
    "BBA in Digital Marketing (BBA DM)": ["jsearch", "lever", "adzuna"],
    "BBA in Entrepreneurship (BBA ENT)": ["jsearch", "lever", "adzuna"],
    "BBA (Finance)": ["jsearch", "lever", "adzuna"],
    "DEFAULT": ["jsearch", "adzuna"],
}


# ─── Helper functions ────────────────────────────────────────────────────────

def normalize_course_name(course_str: str) -> str:
    """
    Maps legacy, short, or CSV course names (e.g. 'BCA', 'Data Science', 'BBA / Commerce')
    to the official 20 course names configured in COURSE_SEARCH_CONFIG.
    """
    if not course_str:
        return ""
    c_clean = course_str.strip()
    if c_clean in COURSE_SEARCH_CONFIG:
        return c_clean
        
    c_lower = c_clean.lower()
    
    # Explicit legacy/short mapping
    mapping = {
        'bba (general, sales, marketing, hr)': 'BBA',
        'bba / commerce': 'BBA',
        'commerce': 'BBA',
        'bba': 'BBA',
        'bba (finance)': 'BBA (Finance)',
        'bba finance': 'BBA (Finance)',
        'digital marketing': 'BBA in Digital Marketing (BBA DM)',
        'bba dm': 'BBA in Digital Marketing (BBA DM)',
        'bba in digital marketing': 'BBA in Digital Marketing (BBA DM)',
        'bba in digital marketing (bba dm)': 'BBA in Digital Marketing (BBA DM)',
        'travel & tourism': 'BBA in Travel & Tourism Management (BBA TTM)',
        'travel & toursim': 'BBA in Travel & Tourism Management (BBA TTM)',
        'bba ttm': 'BBA in Travel & Tourism Management (BBA TTM)',
        'bba in travel & tourism management (bba ttm)': 'BBA in Travel & Tourism Management (BBA TTM)',
        'bba in travel & toursim management (bba ttm)': 'BBA in Travel & Tourism Management (BBA TTM)',
        'bba in travel & tourism management': 'BBA in Travel & Tourism Management (BBA TTM)',
        'bba in travel & toursim management': 'BBA in Travel & Tourism Management (BBA TTM)',
        'entrepreneurship': 'BBA in Entrepreneurship (BBA ENT)',
        'bba ent': 'BBA in Entrepreneurship (BBA ENT)',
        'bba in entrepreneurship': 'BBA in Entrepreneurship (BBA ENT)',
        'bba in entrepreneurship (bba ent)': 'BBA in Entrepreneurship (BBA ENT)',
        'mba': 'BBA',
        'mba entrepreneurship': 'BBA in Entrepreneurship (BBA ENT)',
        'mba in entrepreneurship': 'BBA in Entrepreneurship (BBA ENT)',
        'b.tech data science': 'BSc in Data Science',
        'b.tech in data science': 'BSc in Data Science',
        'b.tech': 'BSc in Data Science',
        'sports management': 'BBA in Sports Management (BBA SM)',
        'bba sm': 'BBA in Sports Management (BBA SM)',
        'bba in sports management': 'BBA in Sports Management (BBA SM)',
        'bba in sports management (bba sm)': 'BBA in Sports Management (BBA SM)',
        'hospital management': 'BBA in Hospital Management (BBA HM)',
        'bba hm': 'BBA in Hospital Management (BBA HM)',
        'bba in hospital management': 'BBA in Hospital Management (BBA HM)',
        'bba in hospital management (bba hm)': 'BBA in Hospital Management (BBA HM)',
        'media science': 'BSc in Media Science (BMS)',
        'bms': 'BSc in Media Science (BMS)',
        'bsc in media science': 'BSc in Media Science (BMS)',
        'bsc in media science (bms)': 'BSc in Media Science (BMS)',
        'msc in media science': 'MSc in Media Science',
        'multimedia & animation': 'BSc in Multimedia, Animation, Graphic Design (BMAGD)',
        'bsc in multimedia, animation & graphic design (bmagd)': 'BSc in Multimedia, Animation, Graphic Design (BMAGD)',
        'bsc in multimedia, animation, graphic design (bmagd)': 'BSc in Multimedia, Animation, Graphic Design (BMAGD)',
        'bsc in multimedia, animation, graphic design': 'BSc in Multimedia, Animation, Graphic Design (BMAGD)',
        'bmagd': 'BSc in Multimedia, Animation, Graphic Design (BMAGD)',
        'mmagd': 'MSc in Multimedia, Animation, Graphic Design (MMAGD)',
        'msc in multimedia, animation, graphic design (mmagd)': 'MSc in Multimedia, Animation, Graphic Design (MMAGD)',
        'msc in multimedia, animation, graphic design': 'MSc in Multimedia, Animation, Graphic Design (MMAGD)',
        'film & television': 'BSc in Film and Television Production (FTP)',
        'bsc in film & television production (ftp)': 'BSc in Film and Television Production (FTP)',
        'bsc in film and television production (ftp)': 'BSc in Film and Television Production (FTP)',
        'bsc in film & television production': 'BSc in Film and Television Production (FTP)',
        'bsc in film and television production': 'BSc in Film and Television Production (FTP)',
        'ftp': 'BSc in Film and Television Production (FTP)',
        'interior design': 'BSc in Interior Design',
        'bsc in interior design': 'BSc in Interior Design',
        'sustainable fashion': 'BSc in Sustainable Fashion Design & Management',
        'fashion design': 'BSc in Sustainable Fashion Design & Management',
        'bsc in sustainable fashion design & management': 'BSc in Sustainable Fashion Design & Management',
        'optometry': 'Bachelor in Optometry',
        'bachelor in optometry': 'Bachelor in Optometry',
        'critical care tech': 'BSc in Critical Care Technology (CCT)',
        'bsc in critical care technology': 'BSc in Critical Care Technology (CCT)',
        'bsc in critical care technology (cct)': 'BSc in Critical Care Technology (CCT)',
        'cct': 'BSc in Critical Care Technology (CCT)',
        'medical lab tech (mlt)': 'BSc in Medical Laboratory Technology (BMLT)',
        'medical lab tech': 'BSc in Medical Laboratory Technology (BMLT)',
        'bsc in medical laboratory technology': 'BSc in Medical Laboratory Technology (BMLT)',
        'bsc in medical laboratory technology (bmlt)': 'BSc in Medical Laboratory Technology (BMLT)',
        'mlt': 'BSc in Medical Laboratory Technology (BMLT)',
        'bmlt': 'BSc in Medical Laboratory Technology (BMLT)',
        'data science': 'BSc in Data Science',
        'bsc in data science': 'BSc in Data Science',
        'cyber security': 'BSc in Cyber Security',
        'bsc in cyber security': 'BSc in Cyber Security',
        'bca & computer apps': 'BSc in Computer Application (BCA)',
        'bca': 'BSc in Computer Application (BCA)',
        'mca': 'BSc in Computer Application (BCA)',
        'bsc in computer application (bca)': 'BSc in Computer Application (BCA)',
        'bsc in computer application': 'BSc in Computer Application (BCA)',
    }
    
    if c_lower in mapping:
        return mapping[c_lower]
        
    # Fallback substring match against official names
    for official_name in COURSE_SEARCH_CONFIG.keys():
        if c_lower in official_name.lower():
            return official_name
            
    return c_clean


def get_all_course_names() -> list:
    """Returns list of all 20 course names."""
    return list(COURSE_SEARCH_CONFIG.keys())


def get_course_keywords(course_name: str) -> list:
    """Returns search keywords for a specific course."""
    config = COURSE_SEARCH_CONFIG.get(course_name, {})
    return config.get('keywords', [])


def get_course_internship_keywords(course_name: str) -> list:
    """Returns internship-specific keywords for a course."""
    config = COURSE_SEARCH_CONFIG.get(course_name, {})
    return config.get('internship_keywords', [])


def get_exclude_keywords(course_name: str) -> list:
    """Returns keywords that should exclude a job from this course."""
    config = COURSE_SEARCH_CONFIG.get(course_name, {})
    return config.get('exclude_keywords', [])


def get_primary_keyword(course_name: str) -> str:
    """Returns the first keyword for a course, or the course name itself."""
    keywords = get_course_keywords(course_name)
    return keywords[0] if keywords else course_name


def course_exists(course_name: str) -> bool:
    """Check if a course name is valid."""
    return course_name in COURSE_SEARCH_CONFIG


def get_active_config() -> dict:
    """
    Returns config from CourseSearchConfig DB model if populated.
    Falls back to hardcoded COURSE_SEARCH_CONFIG if table is empty or DB unreachable.
    Always returns a complete dict of {course_name: {keywords, internship_keywords, exclude_keywords}}.
    Automatically normalizes legacy DB course names to the new 20 course structure.
    """
    try:
        from apps.scraped_jobs.models import CourseSearchConfig
        db_configs = CourseSearchConfig.objects.filter(is_active=True)
        if db_configs.exists():
            config_dict = {}
            for c in db_configs:
                norm_name = normalize_course_name(c.course_name)
                config_dict[norm_name] = {
                    'keywords': c.keywords,
                    'internship_keywords': c.internship_keywords,
                    'exclude_keywords': c.exclude_keywords,
                }
            # Ensure any missing new courses get their defaults from COURSE_SEARCH_CONFIG
            for course_name, default_cfg in COURSE_SEARCH_CONFIG.items():
                if course_name not in config_dict:
                    config_dict[course_name] = default_cfg
            return config_dict
    except Exception:
        pass
    return COURSE_SEARCH_CONFIG

