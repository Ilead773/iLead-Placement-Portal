import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.templates_engine.models import ResumeTemplate

# 1. Classic Professional (ATS-Optimized Elegant Layout)
classic_html = """
<div class="resume-container">
    <header class="resume-header">
        <h1 class="candidate-name">{{ personal.name|default:"Your Name" }}</h1>
        <div class="contact-info">
            {% if personal.email %}<span>{{ personal.email }}</span>{% endif %}
            {% if personal.phone %}<span>{{ personal.phone }}</span>{% endif %}
            {% if personal.location %}<span>{{ personal.location }}</span>{% endif %}
        </div>
        <div class="social-links">
            {% if personal.linkedin %}<span><a href="{{ personal.linkedin }}" target="_blank">LinkedIn</a></span>{% endif %}
            {% if personal.github %}<span><a href="{{ personal.github }}" target="_blank">GitHub</a></span>{% endif %}
            {% if personal.portfolio %}<span><a href="{{ personal.portfolio }}" target="_blank">Portfolio</a></span>{% endif %}
        </div>
    </header>

    {% if summary %}
    <section class="resume-section">
        <h2 class="section-title">Professional Summary</h2>
        <p class="summary-text">{{ summary }}</p>
    </section>
    {% endif %}

    {% if education %}
    <section class="resume-section">
        <h2 class="section-title">Education</h2>
        {% for edu in education %}
        <div class="resume-item">
            <div class="item-header">
                <span class="institution-name">{{ edu.institution }}</span>
                <span class="item-date">Graduation: {{ edu.graduation_date|default:"N/A" }}</span>
            </div>
            <div class="item-subheader">
                <span class="degree-name">{{ edu.degree }}{% if edu.field %} in {{ edu.field }}{% endif %}</span>
                {% if edu.gpa %}<span class="gpa-score">CGPA: {{ edu.gpa }}</span>{% endif %}
            </div>
            {% if edu.honors %}
            <div class="item-details">{{ edu.honors }}</div>
            {% endif %}
        </div>
        {% endfor %}
    </section>
    {% endif %}

    {% if experience %}
    <section class="resume-section">
        <h2 class="section-title">Work Experience</h2>
        {% for exp in experience %}
        <div class="resume-item">
            <div class="item-header">
                <span class="company-name">{{ exp.company }}</span>
                <span class="item-date">
                    {{ exp.duration.start|default:"" }} — 
                    {% if exp.duration.current or not exp.duration.end %}Present{% else %}{{ exp.duration.end }}{% endif %}
                </span>
            </div>
            <div class="item-subheader">
                <span class="job-title">{{ exp.position }}</span>
            </div>
            {% if exp.description %}
            <p class="item-description">{{ exp.description }}</p>
            {% endif %}
            {% if exp.achievements %}
            <ul class="bullet-list">
                {% for achievement in exp.achievements %}
                <li>{{ achievement }}</li>
                {% endfor %}
            </ul>
            {% endif %}
        </div>
        {% endfor %}
    </section>
    {% endif %}

    {% if projects %}
    <section class="resume-section">
        <h2 class="section-title">Academic & Key Projects</h2>
        {% for proj in projects %}
        <div class="resume-item">
            <div class="item-header">
                <span class="project-title">
                    {{ proj.title }}
                    {% if proj.link %}<span class="project-link"> — <a href="{{ proj.link }}" target="_blank">Project Link</a></span>{% endif %}
                </span>
                {% if proj.date %}
                <span class="item-date">{{ proj.date }}</span>
                {% endif %}
            </div>
            {% if proj.technologies %}
            <div class="project-tech">
                <strong>Technologies:</strong> {{ proj.technologies|join:", " }}
            </div>
            {% endif %}
            <p class="item-description">{{ proj.description }}</p>
        </div>
        {% endfor %}
    </section>
    {% endif %}

    {% if skills %}
    <section class="resume-section">
        <h2 class="section-title">Technical Skills</h2>
        <div class="skills-container">
            {% for skill_group in skills %}
            <div class="skill-group">
                <strong class="skill-category">{{ skill_group.category }}:</strong>
                <span class="skill-items">{{ skill_group.items|join:", " }}</span>
            </div>
            {% endfor %}
        </div>
    </section>
    {% endif %}

    <div class="two-column-grid">
        {% if certifications %}
        <div class="col-6">
            <section class="resume-section">
                <h2 class="section-title">Certifications</h2>
                <ul class="bullet-list">
                    {% for cert in certifications %}
                    <li>
                        <strong>{{ cert.name }}</strong> — <span class="issuer">{{ cert.issuer }}</span>
                        {% if cert.date %}<span class="cert-date">({{ cert.date }})</span>{% endif %}
                    </li>
                    {% endfor %}
                </ul>
            </section>
        </div>
        {% endif %}

        {% if achievements %}
        <div class="col-6">
            <section class="resume-section">
                <h2 class="section-title">Achievements</h2>
                <ul class="bullet-list">
                    {% for ach in achievements %}
                    <li>
                        <strong>{{ ach.title }}</strong>
                        {% if ach.issuer %}<span class="issuer"> ({{ ach.issuer }})</span>{% endif %}
                        {% if ach.description %}<p class="ach-desc">{{ ach.description }}</p>{% endif %}
                    </li>
                    {% endfor %}
                </ul>
            </section>
        </div>
        {% endif %}
    </div>
</div>
"""

classic_css = """
@import "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";

:root {
    --primary-color: #1e293b;
    --text-color: #334155;
    --muted-color: #64748b;
    --border-color: #cbd5e1;
}

@page {
    size: A4;
    margin: 20mm;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: var(--text-color);
    line-height: 1.4;
    margin: 0;
    padding: 0;
    font-size: 10pt;
}

.resume-container {
    max-width: 100%;
}

.resume-header {
    text-align: center;
    margin-bottom: 20px;
}

.candidate-name {
    font-size: 20pt;
    font-weight: 700;
    color: var(--primary-color);
    margin: 0 0 6px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.contact-info, .social-links {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 15px;
    font-size: 9pt;
    color: var(--muted-color);
    margin-bottom: 4px;
}

.contact-info span, .social-links span {
    display: inline-block;
}

.social-links a {
    color: var(--muted-color);
    text-decoration: none;
    font-weight: 500;
}

.social-links a:hover {
    color: var(--primary-color);
    text-decoration: underline;
}

.resume-section {
    margin-bottom: 15px;
    page-break-inside: avoid;
}

.section-title {
    font-size: 11pt;
    font-weight: 700;
    color: var(--primary-color);
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 1px solid var(--primary-color);
    padding-bottom: 3px;
    margin: 0 0 10px 0;
}

.summary-text {
    font-size: 9.5pt;
    text-align: justify;
    margin: 0;
}

.resume-item {
    margin-bottom: 12px;
    page-break-inside: avoid;
}

.resume-item:last-child {
    margin-bottom: 0;
}

.item-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}

.institution-name, .company-name, .project-title {
    font-size: 10pt;
    font-weight: 700;
    color: var(--primary-color);
}

.project-link a {
    color: var(--muted-color);
    text-decoration: none;
    font-weight: normal;
}

.project-link a:hover {
    text-decoration: underline;
    color: var(--primary-color);
}

.item-date {
    font-size: 9pt;
    font-weight: 500;
    color: var(--muted-color);
}

.item-subheader {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 2px;
}

.degree-name, .job-title {
    font-size: 9.5pt;
    font-weight: 600;
    color: var(--text-color);
}

.gpa-score {
    font-size: 9pt;
    font-weight: 600;
}

.item-description {
    font-size: 9pt;
    margin: 4px 0 0 0;
    color: var(--text-color);
}

.bullet-list {
    margin: 4px 0 0 0;
    padding-left: 20px;
    font-size: 9pt;
}

.bullet-list li {
    margin-bottom: 2px;
}

.project-tech {
    font-size: 8.5pt;
    margin-top: 2px;
    color: var(--muted-color);
}

.skills-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.skill-group {
    font-size: 9.5pt;
}

.two-column-grid {
    display: flex;
    justify-content: space-between;
    gap: 20px;
}

.col-6 {
    flex: 1;
}

.issuer {
    color: var(--muted-color);
}

.cert-date {
    color: var(--muted-color);
    font-size: 8.5pt;
}

.ach-desc {
    margin: 2px 0 0 0;
    font-size: 8.5pt;
    color: var(--muted-color);
}
"""


# 2. Modern Clean (Sleek Clean Styling)
modern_clean_html = """
<div class="resume-container">
    <header class="resume-header">
        <h1 class="candidate-name">{{ personal.name|default:"Your Name" }}</h1>
        <div class="contact-grid">
            {% if personal.email %}<span>📧 {{ personal.email }}</span>{% endif %}
            {% if personal.phone %}<span>📱 {{ personal.phone }}</span>{% endif %}
            {% if personal.location %}<span>📍 {{ personal.location }}</span>{% endif %}
            {% if personal.linkedin %}<span>🔗 <a href="{{ personal.linkedin }}" target="_blank">LinkedIn</a></span>{% endif %}
            {% if personal.github %}<span>💻 <a href="{{ personal.github }}" target="_blank">GitHub</a></span>{% endif %}
            {% if personal.portfolio %}<span>🌐 <a href="{{ personal.portfolio }}" target="_blank">Portfolio</a></span>{% endif %}
        </div>
    </header>

    {% if summary %}
    <section class="resume-section">
        <h2 class="section-title">Professional Summary</h2>
        <div class="section-content">
            <p class="summary-text">{{ summary }}</p>
        </div>
    </section>
    {% endif %}

    {% if experience %}
    <section class="resume-section">
        <h2 class="section-title">Professional Experience</h2>
        <div class="section-content">
            {% for exp in experience %}
            <div class="resume-item">
                <div class="item-header">
                    <span class="company-name">{{ exp.company }}</span>
                    <span class="item-date">
                        {{ exp.duration.start|default:"" }} — 
                        {% if exp.duration.current or not exp.duration.end %}Present{% else %}{{ exp.duration.end }}{% endif %}
                    </span>
                </div>
                <div class="item-subheader">
                    <span class="job-title">{{ exp.position }}</span>
                </div>
                {% if exp.description %}
                <p class="item-description">{{ exp.description }}</p>
                {% endif %}
                {% if exp.achievements %}
                <ul class="bullet-list">
                    {% for achievement in exp.achievements %}
                    <li>{{ achievement }}</li>
                    {% endfor %}
                </ul>
                {% endif %}
            </div>
            {% endfor %}
        </div>
    </section>
    {% endif %}

    {% if projects %}
    <section class="resume-section">
        <h2 class="section-title">Featured Projects</h2>
        <div class="section-content">
            {% for proj in projects %}
            <div class="resume-item">
                <div class="item-header">
                    <span class="project-title">{{ proj.title }}</span>
                    {% if proj.date %}<span class="item-date">{{ proj.date }}</span>{% endif %}
                </div>
                <div class="item-subheader">
                    {% if proj.link %}<span class="project-link">🔗 <a href="{{ proj.link }}" target="_blank">View Project</a></span>{% endif %}
                </div>
                {% if proj.technologies %}
                <div class="project-tech">
                    <strong>Tech Stack:</strong> {{ proj.technologies|join:", " }}
                </div>
                {% endif %}
                <p class="item-description">{{ proj.description }}</p>
            </div>
            {% endfor %}
        </div>
    </section>
    {% endif %}

    {% if education %}
    <section class="resume-section">
        <h2 class="section-title">Education</h2>
        <div class="section-content">
            {% for edu in education %}
            <div class="resume-item">
                <div class="item-header">
                    <span class="institution-name">{{ edu.institution }}</span>
                    <span class="item-date">Grad: {{ edu.graduation_date|default:"N/A" }}</span>
                </div>
                <div class="item-subheader">
                    <span class="degree-name">{{ edu.degree }}{% if edu.field %} in {{ edu.field }}{% endif %}</span>
                    {% if edu.gpa %}<span class="gpa-score">GPA: {{ edu.gpa }}</span>{% endif %}
                </div>
                {% if edu.honors %}
                <div class="item-details honors">{{ edu.honors }}</div>
                {% endif %}
            </div>
            {% endfor %}
        </div>
    </section>
    {% endif %}

    {% if skills %}
    <section class="resume-section">
        <h2 class="section-title">Skills & Capabilities</h2>
        <div class="section-content">
            <div class="skills-grid">
                {% for skill_group in skills %}
                <div class="skill-card">
                    <div class="skill-category">{{ skill_group.category }}</div>
                    <div class="skill-items">{{ skill_group.items|join:", " }}</div>
                </div>
                {% endfor %}
            </div>
        </div>
    </section>
    {% endif %}

    <div class="two-column-grid">
        {% if certifications %}
        <div class="col-6">
            <section class="resume-section">
                <h2 class="section-title">Certifications</h2>
                <div class="section-content">
                    <ul class="bullet-list">
                        {% for cert in certifications %}
                        <li>
                            <strong>{{ cert.name }}</strong> — <span class="issuer">{{ cert.issuer }}</span>
                            {% if cert.date %}<span class="cert-date">({{ cert.date }})</span>{% endif %}
                        </li>
                        {% endfor %}
                    </ul>
                </div>
            </section>
        </div>
        {% endif %}

        {% if achievements %}
        <div class="col-6">
            <section class="resume-section">
                <h2 class="section-title">Achievements</h2>
                <div class="section-content">
                    <ul class="bullet-list">
                        {% for ach in achievements %}
                        <li>
                            <strong>{{ ach.title }}</strong>
                            {% if ach.issuer %}<span class="issuer"> ({{ ach.issuer }})</span>{% endif %}
                            {% if ach.description %}<p class="ach-desc">{{ ach.description }}</p>{% endif %}
                        </li>
                        {% endfor %}
                    </ul>
                </div>
            </section>
        </div>
        {% endif %}
    </div>
</div>
"""

modern_clean_css = """
@import "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap";

:root {
    --accent-color: #2563eb;  /* Royal Blue */
    --primary-color: #0f172a; /* Slate 900 */
    --text-color: #334155;    /* Slate 700 */
    --muted-color: #64748b;   /* Slate 500 */
    --border-color: #e2e8f0;  /* Slate 200 */
}

@page {
    size: A4;
    margin: 15mm;
}

body {
    font-family: 'Inter', sans-serif;
    color: var(--text-color);
    line-height: 1.45;
    margin: 0;
    padding: 0;
    font-size: 10pt;
}

.resume-container {
    max-width: 100%;
}

.resume-header {
    border-bottom: 2px solid var(--accent-color);
    padding-bottom: 12px;
    margin-bottom: 18px;
}

.candidate-name {
    font-size: 24pt;
    font-weight: 700;
    color: var(--primary-color);
    margin: 0 0 6px 0;
    letter-spacing: -0.5px;
}

.contact-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    font-size: 8.5pt;
    color: var(--muted-color);
}

.contact-grid span {
    display: inline-flex;
    align-items: center;
}

.contact-grid a {
    color: var(--muted-color);
    text-decoration: none;
}

.contact-grid a:hover {
    color: var(--accent-color);
    text-decoration: underline;
}

.resume-section {
    margin-bottom: 16px;
    page-break-inside: avoid;
}

.section-title {
    font-size: 11pt;
    font-weight: 700;
    color: var(--accent-color);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin: 0 0 8px 0;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 2px;
}

.section-content {
    padding-left: 2px;
}

.summary-text {
    font-size: 9.5pt;
    text-align: justify;
    margin: 0;
}

.resume-item {
    margin-bottom: 12px;
    page-break-inside: avoid;
}

.resume-item:last-child {
    margin-bottom: 0;
}

.item-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}

.company-name, .project-title, .institution-name {
    font-size: 10pt;
    font-weight: 700;
    color: var(--primary-color);
}

.item-date {
    font-size: 8.5pt;
    font-weight: 500;
    color: var(--muted-color);
}

.item-subheader {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 1px;
}

.job-title, .degree-name, .project-link {
    font-size: 9pt;
    font-weight: 600;
    color: var(--text-color);
}

.project-link a {
    color: var(--accent-color);
    text-decoration: none;
}

.project-link a:hover {
    text-decoration: underline;
}

.gpa-score {
    font-size: 9pt;
    font-weight: 700;
    color: var(--primary-color);
}

.item-description {
    font-size: 9pt;
    margin: 3px 0 0 0;
    color: var(--text-color);
}

.bullet-list {
    margin: 3px 0 0 0;
    padding-left: 18px;
    font-size: 9pt;
}

.bullet-list li {
    margin-bottom: 2px;
}

.project-tech {
    font-size: 8.5pt;
    margin-top: 2px;
    color: var(--muted-color);
}

.skills-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
    margin-top: 4px;
}

.skill-card {
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    border-radius: 4px;
    padding: 6px 10px;
}

.skill-category {
    font-size: 8.5pt;
    font-weight: 700;
    color: var(--primary-color);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
}

.skill-items {
    font-size: 9pt;
    color: var(--text-color);
}

.two-column-grid {
    display: flex;
    justify-content: space-between;
    gap: 16px;
}

.col-6 {
    flex: 1;
}

.issuer {
    color: var(--muted-color);
}

.cert-date {
    color: var(--muted-color);
    font-size: 8.5pt;
}

.ach-desc {
    margin: 1px 0 0 0;
    font-size: 8.5pt;
    color: var(--muted-color);
}
"""


# 3. Modern Professional (Premium Sidebar Two-Column Layout)
modern_prof_html = """
<div class="resume-container">
    <header class="resume-header">
        <h1 class="candidate-name">{{ personal.name|default:"Your Name" }}</h1>
        <div class="candidate-title">{% if experience %}{{ experience[0].position }}{% else %}Professional Candidate{% endif %}</div>
    </header>

    <div class="resume-body">
        <!-- Sidebar Column (Left) -->
        <div class="sidebar-column">
            <section class="resume-section">
                <h2 class="section-title">Contact</h2>
                <ul class="contact-list">
                    {% if personal.email %}<li>✉️ {{ personal.email }}</li>{% endif %}
                    {% if personal.phone %}<li>📞 {{ personal.phone }}</li>{% endif %}
                    {% if personal.location %}<li>📍 {{ personal.location }}</li>{% endif %}
                    {% if personal.linkedin %}<li>🔗 <a href="{{ personal.linkedin }}" target="_blank">LinkedIn</a></li>{% endif %}
                    {% if personal.github %}<li>💻 <a href="{{ personal.github }}" target="_blank">GitHub</a></li>{% endif %}
                    {% if personal.portfolio %}<li>🌐 <a href="{{ personal.portfolio }}" target="_blank">Portfolio</a></li>{% endif %}
                </ul>
            </section>

            {% if skills %}
            <section class="resume-section">
                <h2 class="section-title">Skills</h2>
                {% for skill_group in skills %}
                <div class="skill-group">
                    <div class="skill-category">{{ skill_group.category }}</div>
                    <div class="skill-items">{{ skill_group.items|join:", " }}</div>
                </div>
                {% endfor %}
            </section>
            {% endif %}

            {% if education %}
            <section class="resume-section">
                <h2 class="section-title">Education</h2>
                {% for edu in education %}
                <div class="education-item">
                    <div class="edu-degree">{{ edu.degree }}</div>
                    <div class="edu-institution">{{ edu.institution }}</div>
                    <div class="edu-date">Grad: {{ edu.graduation_date|default:"N/A" }}</div>
                    {% if edu.gpa %}<div class="edu-gpa">CGPA: {{ edu.gpa }}</div>{% endif %}
                </div>
                {% endfor %}
            </section>
            {% endif %}

            {% if certifications %}
            <section class="resume-section">
                <h2 class="section-title">Certifications</h2>
                <ul class="sidebar-list">
                    {% for cert in certifications %}
                    <li>
                        <strong>{{ cert.name }}</strong>
                        <div class="cert-details">{{ cert.issuer }} {% if cert.date %}({{ cert.date }}){% endif %}</div>
                    </li>
                    {% endfor %}
                </ul>
            </section>
            {% endif %}
        </div>

        <!-- Main Column (Right) -->
        <div class="main-column">
            {% if summary %}
            <section class="resume-section">
                <h2 class="section-title">Profile Summary</h2>
                <p class="summary-text">{{ summary }}</p>
            </section>
            {% endif %}

            {% if experience %}
            <section class="resume-section">
                <h2 class="section-title">Work Experience</h2>
                {% for exp in experience %}
                <div class="experience-item">
                    <div class="item-header">
                        <span class="job-title">{{ exp.position }}</span>
                        <span class="item-date">
                            {{ exp.duration.start|default:"" }} — 
                            {% if exp.duration.current or not exp.duration.end %}Present{% else %}{{ exp.duration.end }}{% endif %}
                        </span>
                    </div>
                    <div class="company-name">{{ exp.company }}</div>
                    {% if exp.description %}
                    <p class="item-description">{{ exp.description }}</p>
                    {% endif %}
                    {% if exp.achievements %}
                    <ul class="bullet-list">
                        {% for achievement in exp.achievements %}
                        <li>{{ achievement }}</li>
                        {% endfor %}
                    </ul>
                    {% endif %}
                </div>
                {% endfor %}
            </section>
            {% endif %}

            {% if projects %}
            <section class="resume-section">
                <h2 class="section-title">Projects</h2>
                {% for proj in projects %}
                <div class="project-item">
                    <div class="item-header">
                        <span class="project-title">{{ proj.title }}</span>
                        {% if proj.date %}<span class="item-date">{{ proj.date }}</span>{% endif %}
                    </div>
                    {% if proj.link %}
                    <div class="project-link">🔗 <a href="{{ proj.link }}" target="_blank">View Project</a></div>
                    {% endif %}
                    {% if proj.technologies %}
                    <div class="project-tech">Tech: {{ proj.technologies|join:", " }}</div>
                    {% endif %}
                    <p class="item-description">{{ proj.description }}</p>
                </div>
                {% endfor %}
            </section>
            {% endif %}

            {% if achievements %}
            <section class="resume-section">
                <h2 class="section-title">Key Achievements</h2>
                <ul class="bullet-list">
                    {% for ach in achievements %}
                    <li>
                        <strong>{{ ach.title }}</strong>
                        {% if ach.issuer %}<span class="issuer"> ({{ ach.issuer }})</span>{% endif %}
                        {% if ach.description %}<p class="ach-desc">{{ ach.description }}</p>{% endif %}
                    </li>
                    {% endfor %}
                </ul>
            </section>
            {% endif %}
        </div>
    </div>
</div>
"""

modern_prof_css = """
@import "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap";

:root {
    --primary-color: #1e3a8a;  /* Deep Navy */
    --accent-color: #3b82f6;   /* Royal Blue */
    --text-color: #1e293b;     /* Dark Slate */
    --muted-color: #64748b;    /* Slate 500 */
    --border-color: #cbd5e1;   /* Slate 300 */
    --sidebar-bg: #f8fafc;     /* Soft Cool Gray */
}

@page {
    size: A4;
    margin: 0;
}

body {
    font-family: 'Inter', sans-serif;
    color: var(--text-color);
    line-height: 1.4;
    margin: 0;
    padding: 0;
    font-size: 9.5pt;
    background: #ffffff;
}

.resume-container {
    width: 210mm;
    min-height: 297mm;
    box-sizing: border-box;
}

.resume-header {
    background: var(--primary-color);
    color: #ffffff;
    padding: 25px 30px;
}

.candidate-name {
    font-size: 26pt;
    font-weight: 700;
    margin: 0 0 4px 0;
    letter-spacing: -1px;
}

.candidate-title {
    font-size: 13pt;
    font-weight: 400;
    opacity: 0.9;
    text-transform: uppercase;
    letter-spacing: 1.5px;
}

.resume-body {
    display: table;
    width: 100%;
    table-layout: fixed;
}

.sidebar-column {
    display: table-cell;
    width: 70mm;
    background: var(--sidebar-bg);
    padding: 25px 20px;
    vertical-align: top;
    border-right: 1px solid var(--border-color);
}

.main-column {
    display: table-cell;
    width: 140mm;
    padding: 25px 30px;
    vertical-align: top;
}

.resume-section {
    margin-bottom: 20px;
    page-break-inside: avoid;
}

.sidebar-column .resume-section:last-child, 
.main-column .resume-section:last-child {
    margin-bottom: 0;
}

.section-title {
    font-size: 11pt;
    font-weight: 700;
    color: var(--primary-color);
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 4px;
    margin: 0 0 12px 0;
}

.sidebar-column .section-title {
    color: var(--primary-color);
    border-bottom-color: #cbd5e1;
}

.contact-list, .sidebar-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.contact-list li {
    font-size: 8.5pt;
    margin-bottom: 8px;
    word-break: break-all;
}

.contact-list a {
    color: var(--text-color);
    text-decoration: none;
}

.contact-list a:hover {
    text-decoration: underline;
    color: var(--accent-color);
}

.skill-group {
    margin-bottom: 10px;
}

.skill-category {
    font-size: 8.5pt;
    font-weight: 700;
    color: var(--primary-color);
    margin-bottom: 2px;
    text-transform: uppercase;
}

.skill-items {
    font-size: 8.5pt;
    color: var(--text-color);
}

.education-item {
    margin-bottom: 12px;
}

.edu-degree {
    font-size: 9pt;
    font-weight: 700;
    color: var(--primary-color);
}

.edu-institution {
    font-size: 8.5pt;
    font-weight: 600;
}

.edu-date, .edu-gpa {
    font-size: 8pt;
    color: var(--muted-color);
}

.sidebar-list li {
    margin-bottom: 10px;
}

.cert-details {
    font-size: 8pt;
    color: var(--muted-color);
}

.summary-text {
    font-size: 9pt;
    text-align: justify;
    margin: 0;
}

.experience-item, .project-item {
    margin-bottom: 15px;
    page-break-inside: avoid;
}

.experience-item:last-child, .project-item:last-child {
    margin-bottom: 0;
}

.item-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}

.job-title, .project-title {
    font-size: 10pt;
    font-weight: 700;
    color: var(--primary-color);
}

.company-name {
    font-size: 9pt;
    font-weight: 600;
    color: var(--text-color);
    margin-top: 1px;
}

.item-date {
    font-size: 8.5pt;
    color: var(--muted-color);
    font-weight: 500;
}

.item-description {
    font-size: 8.5pt;
    margin: 4px 0 0 0;
}

.bullet-list {
    margin: 4px 0 0 0;
    padding-left: 18px;
    font-size: 8.5pt;
}

.bullet-list li {
    margin-bottom: 2px;
}

.project-link {
    font-size: 8.5pt;
    margin-top: 2px;
}

.project-link a {
    color: var(--accent-color);
    text-decoration: none;
    font-weight: 600;
}

.project-link a:hover {
    text-decoration: underline;
}

.project-tech {
    font-size: 8pt;
    color: var(--muted-color);
    margin-top: 2px;
}

.ach-desc {
    margin: 1px 0 0 0;
    font-size: 8pt;
    color: var(--muted-color);
}

.issuer {
    color: var(--muted-color);
}
"""

# Upgrade existing templates
try:
    tpl_classic = ResumeTemplate.objects.get(name='Classic Professional')
    tpl_classic.html_template = classic_html
    tpl_classic.css_styles = classic_css
    tpl_classic.description = "A clean, traditional, ATS-optimized layout with authoritative styling."
    tpl_classic.save()
    print("Upgraded 'Classic Professional' successfully.")
except ResumeTemplate.DoesNotExist:
    ResumeTemplate.objects.create(
        name='Classic Professional',
        html_template=classic_html,
        css_styles=classic_css,
        description="A clean, traditional, ATS-optimized layout with authoritative styling.",
        version=1,
        is_active=True
    )
    print("Created 'Classic Professional' successfully.")

try:
    tpl_clean = ResumeTemplate.objects.get(name='Modern Clean')
    tpl_clean.html_template = modern_clean_html
    tpl_clean.css_styles = modern_clean_css
    tpl_clean.description = "A sleek, contemporary single-column layout with clean grid-based skills."
    tpl_clean.save()
    print("Upgraded 'Modern Clean' successfully.")
except ResumeTemplate.DoesNotExist:
    ResumeTemplate.objects.create(
        name='Modern Clean',
        html_template=modern_clean_html,
        css_styles=modern_clean_css,
        description="A sleek, contemporary single-column layout with clean grid-based skills.",
        version=1,
        is_active=True
    )
    print("Created 'Modern Clean' successfully.")

try:
    tpl_prof = ResumeTemplate.objects.get(name='Modern Professional')
    tpl_prof.html_template = modern_prof_html
    tpl_prof.css_styles = modern_prof_css
    tpl_prof.description = "A premium two-column layout with sidebar and prominent navy styling."
    tpl_prof.save()
    print("Upgraded 'Modern Professional' successfully.")
except ResumeTemplate.DoesNotExist:
    ResumeTemplate.objects.create(
        name='Modern Professional',
        html_template=modern_prof_html,
        css_styles=modern_prof_css,
        description="A premium two-column layout with sidebar and prominent navy styling.",
        version=1,
        is_active=True
    )
    print("Created 'Modern Professional' successfully.")

print("All templates upgraded to premium high-fidelity successfully!")
