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
ilead_kolkata_html = """
<div class="resume-container">
    <header class="resume-header">
        <div class="header-left">
            <div class="photo-frame">
                {% if personal.photo %}
                    <img src="{{ personal.photo }}" alt="" class="candidate-photo">
                {% else %}
                    <div class="photo-placeholder">Insert a formal picture (Current)</div>
                {% endif %}
            </div>
        </div>
        
        <div class="header-center">
            <h1 class="candidate-name">{{ personal.name|default:"Your Name" }}</h1>
            <div class="linkedin-link">
                {% if personal.linkedin %}
                    <a href="{{ personal.linkedin }}" target="_blank">{{ personal.linkedin }}</a>
                {% else %}
                    <a href="#" class="placeholder-link">LinkedIn Link (just add the link) - MANDATORY</a>
                {% endif %}
            </div>
            {% if personal.portfolio %}
            <div class="portfolio-link">
                <a href="{{ personal.portfolio }}" target="_blank">{{ personal.portfolio }}</a>
            </div>
            {% endif %}
            <div class="contact-row">
                {% if personal.phone %}
                <span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:3px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    {{ personal.phone }}
                </span>
                {% endif %}
                {% if personal.email %}
                <span>
                    {% if personal.phone %}|{% endif %}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:3px; margin-left:3px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    {{ personal.email }}
                </span>
                {% endif %}
                {% if personal.location %}
                <span>
                    {% if personal.phone or personal.email %}|{% endif %}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:3px; margin-left:3px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    {{ personal.location }}
                </span>
                {% endif %}
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

    {% if summary %}
    <section class="resume-section">
        <h2 class="section-title">CAREER OBJECTIVE</h2>
        <p class="summary-text">{{ summary }}</p>
    </section>
    {% endif %}

    {% if education %}
    <section class="resume-section">
        <table class="education-table">
            <thead>
                <tr>
                    <th>Qualification</th>
                    <th>Institution</th>
                    <th>Board/University</th>
                    <th>Year</th>
                    <th>CGPA/%</th>
                </tr>
            </thead>
            <tbody>
                {% for edu in education %}
                <tr>
                    <td class="bold-text">{% firstof edu.degree edu.qualification "—" %}</td>
                    <td>{% firstof edu.institution edu.school edu.college "—" %}</td>
                    <td>{% firstof edu.field edu.board edu.university "—" %}</td>
                    <td>
                        {% if edu.graduation_date %}
                            {{ edu.graduation_date|slice:":4" }}
                        {% else %}
                            {% firstof edu.year "—" %}
                        {% endif %}
                    </td>
                    <td class="bold-text">
                        {% firstof edu.gpa edu.cgpa edu.percentage "—" %}
                    </td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </section>
    {% endif %}

    <div class="two-column-body">
        <div class="left-column">
            {% if skills %}
            <div class="sidebar-section">
                <h3 class="section-title">TECHNICAL SKILLS</h3>
                <ul class="bullet-list">
                    {% for skill_group in skills %}
                        {% for item in skill_group.items %}
                            <li>{{ item }}</li>
                        {% endfor %}
                    {% endfor %}
                </ul>
            </div>
            {% endif %}

            {% if certifications %}
            <div class="sidebar-section">
                <h3 class="section-title">CERTIFICATIONS</h3>
                <ul class="bullet-list">
                    {% for cert in certifications %}
                        <li>{{ cert.name }}{% if cert.issuer %} – {{ cert.issuer }}{% endif %}</li>
                    {% endfor %}
                </ul>
            </div>
            {% endif %}

            {% if achievements %}
            <div class="sidebar-section">
                <h3 class="section-title">ACHIEVEMENTS & POSITIONS OF RESPONSIBILITY</h3>
                <ul class="bullet-list">
                    {% for ach in achievements %}
                        <li>
                            <strong>{{ ach.title }}</strong>
                            {% if ach.issuer %} – {{ ach.issuer }}{% endif %}
                            {% if ach.description %}<div class="ach-desc">{{ ach.description }}</div>{% endif %}
                        </li>
                    {% endfor %}
                </ul>
            </div>
            {% endif %}

            {% if extra_curricular %}
            <div class="sidebar-section">
                <h3 class="section-title">EXTRA-CURRICULAR ACTIVITIES</h3>
                <ul class="bullet-list">
                    {% for item in extra_curricular %}
                        <li>{{ item }}</li>
                    {% endfor %}
                </ul>
            </div>
            {% endif %}

            {% if strengths %}
            <div class="sidebar-section">
                <h3 class="section-title">STRENGTHS</h3>
                <ul class="bullet-list">
                    {% for item in strengths %}
                        <li>{{ item }}</li>
                    {% endfor %}
                </ul>
            </div>
            {% endif %}

            {% if languages %}
            <div class="sidebar-section">
                <h3 class="section-title">LANGUAGES KNOWN</h3>
                <ul class="bullet-list">
                    {% for item in languages %}
                        <li>{{ item }}</li>
                    {% endfor %}
                </ul>
            </div>
            {% endif %}
        </div>

        <div class="right-column">
            {% if experience %}
            <div class="main-section">
                <h3 class="section-title">EXPERIENCE</h3>
                {% for exp in experience %}
                <div class="experience-item">
                    <div class="exp-header">
                        <span class="company-name">{{ exp.company }}</span> | 
                        <span class="designation">{{ exp.position }}</span> | 
                        <span class="duration">
                            {% if exp.duration.start %}{{ exp.duration.start|slice:":7" }}{% endif %}
                            –
                            {% if exp.duration.current or not exp.duration.end %}Present{% else %}{{ exp.duration.end|slice:":7" }}{% endif %}
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
            </div>
            {% endif %}
        </div>
    </div>

    <footer class="resume-footer">
        Campus: 113, Matheswartola Road, Kolkata 700 046, West Bengal, India, Ph: +91.33.4018 2000/02 Fax: +91.33.4018 2016
    </footer>
</div>
"""

ilead_kolkata_css = """
:root {
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
    border: 2px dashed #cbd5e1;
    background-color: #f8fafc;
}

.candidate-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.photo-placeholder {
    font-size: 7pt;
    color: #64748b;
    padding: 4px;
    line-height: 1.1;
    font-weight: 500;
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
    background-color: var(--primary-color);
    color: white;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 9pt;
}

.education-table tr:nth-child(even) {
    background-color: var(--bg-light);
}

.education-table tr:nth-child(odd) {
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

