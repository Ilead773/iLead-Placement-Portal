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
        <div class="candidate-title">{% if experience %}{{ experience.0.position }}{% else %}Professional Candidate{% endif %}</div>
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

# 4. iLEAD Kolkata Standard Template
ilead_kolkata_html = """<div class="resume-container">
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

ilead_kolkata_css = """:root {
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
}"""

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

try:
    tpl_kolkata = ResumeTemplate.objects.get(name='iLEAD Kolkata Standard')
    tpl_kolkata.html_template = ilead_kolkata_html
    tpl_kolkata.css_styles = ilead_kolkata_css
    tpl_kolkata.description = "The official iLEAD Kolkata Standard template styled exactly according to university guidelines."
    tpl_kolkata.save()
    print("Upgraded 'iLEAD Kolkata Standard' successfully.")
except ResumeTemplate.DoesNotExist:
    ResumeTemplate.objects.create(
        name='iLEAD Kolkata Standard',
        html_template=ilead_kolkata_html,
        css_styles=ilead_kolkata_css,
        description="The official iLEAD Kolkata Standard template styled exactly according to university guidelines.",
        version=1,
        is_active=True
    )
    print("Created 'iLEAD Kolkata Standard' successfully.")

print("All templates upgraded to premium high-fidelity successfully!")

