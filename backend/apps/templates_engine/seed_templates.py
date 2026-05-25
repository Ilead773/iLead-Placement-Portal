# apps/templates_engine/seed_templates.py
import os
import sys
import django

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.templates_engine.models import ResumeTemplate

def seed_modern_template():
    name = "Modern Professional"
    description = "A sleek, high-fidelity resume template designed for tech and corporate roles. Features clean typography and an authoritative layout."
    
    html_template = """
<div class="resume-wrapper">
    <header class="resume-header">
        <h1>{{ personal.name }}</h1>
        <div class="contact-info">
            {% if personal.email %}<span>{{ personal.email }}</span>{% endif %}
            {% if personal.phone %}<span>{{ personal.phone }}</span>{% endif %}
            {% if personal.location %}<span>{{ personal.location }}</span>{% endif %}
        </div>
        <div class="social-links">
            {% if personal.linkedin %}<span>LinkedIn: {{ personal.linkedin }}</span>{% endif %}
            {% if personal.github %}<span>GitHub: {{ personal.github }}</span>{% endif %}
            {% if personal.portfolio %}<span>Portfolio: {{ personal.portfolio }}</span>{% endif %}
        </div>
    </header>

    {% if summary %}
    <section class="section">
        <h2 class="section-title">Professional Summary</h2>
        <p class="summary-text">{{ summary }}</p>
    </section>
    {% endif %}

    {% if experience %}
    <section class="section">
        <h2 class="section-title">Work Experience</h2>
        {% for exp in experience %}
        <div class="item">
            <div class="item-header">
                <span class="item-title">{{ exp.position }}</span>
                <span class="item-date">{{ exp.duration.start }} — {{ exp.duration.end|default:"Present" }}</span>
            </div>
            <div class="item-subtitle">{{ exp.company }}</div>
            <div class="item-description">{{ exp.description }}</div>
            {% if exp.achievements %}
            <ul class="achievements-list">
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
    <section class="section">
        <h2 class="section-title">Key Projects</h2>
        {% for proj in projects %}
        <div class="item">
            <div class="item-header">
                <span class="item-title">{{ proj.title }}</span>
                <span class="item-date">{{ proj.date }}</span>
            </div>
            <div class="item-description">{{ proj.description }}</div>
            <div class="technologies">
                <strong>Tech:</strong> {{ proj.technologies|join:", " }}
            </div>
            {% if proj.link %}<div class="project-link">Link: {{ proj.link }}</div>{% endif %}
        </div>
        {% endfor %}
    </section>
    {% endif %}

    <div class="two-column">
        {% if skills %}
        <section class="section">
            <h2 class="section-title">Technical Skills</h2>
            {% for skill_group in skills %}
            <div class="skill-group">
                <strong>{{ skill_group.category }}:</strong> {{ skill_group.items|join:", " }}
            </div>
            {% endfor %}
        </section>
        {% endif %}

        {% if education %}
        <section class="section">
            <h2 class="section-title">Education</h2>
            {% for edu in education %}
            <div class="item">
                <div class="item-header">
                    <span class="item-title">{{ edu.degree }}</span>
                </div>
                <div class="item-subtitle">{{ edu.institution }}</div>
                <div class="item-date">Graduation: {{ edu.graduation_date }}</div>
                {% if edu.gpa %}<div class="gpa">CGPA: {{ edu.gpa }}</div>{% endif %}
            </div>
            {% endfor %}
        </section>
        {% endif %}
    </div>
</div>
"""

    css_styles = """
:root {
    --primary: #1e293b;
    --accent: #3b82f6;
    --text-main: #334155;
    --text-muted: #64748b;
    --border: #e2e8f0;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
    color: var(--text-main);
    margin: 0;
    padding: 0;
    background: white;
}

.resume-wrapper {
    max-width: 800px;
    margin: 40px auto;
    padding: 40px;
    background: white;
}

.resume-header {
    text-align: center;
    border-bottom: 2px solid var(--primary);
    padding-bottom: 20px;
    margin-bottom: 30px;
}

.resume-header h1 {
    margin: 0 0 10px 0;
    font-size: 32px;
    font-weight: 800;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: -1px;
}

.contact-info, .social-links {
    font-size: 11px;
    color: var(--text-muted);
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-bottom: 5px;
}

.section {
    margin-bottom: 25px;
}

.section-title {
    font-size: 14px;
    font-weight: 800;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 5px;
    margin-bottom: 15px;
}

.summary-text {
    font-size: 13px;
    text-align: justify;
}

.item {
    margin-bottom: 15px;
}

.item-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}

.item-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--primary);
}

.item-date {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
}

.item-subtitle {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-main);
    margin-bottom: 4px;
}

.item-description {
    font-size: 12px;
    color: var(--text-main);
}

.achievements-list {
    margin: 8px 0 0 0;
    padding-left: 20px;
    font-size: 12px;
}

.technologies, .gpa, .project-link {
    font-size: 11px;
    margin-top: 5px;
}

.two-column {
    display: grid;
    grid-template-cols: 1fr 1fr;
    gap: 40px;
}

.skill-group {
    font-size: 12px;
    margin-bottom: 8px;
}

@media print {
    .resume-wrapper {
        margin: 0;
        padding: 0;
    }
}
"""

    template, created = ResumeTemplate.objects.get_or_create(
        name=name,
        defaults={
            'description': description,
            'html_template': html_template,
            'css_styles': css_styles,
            'is_active': True
        }
    )
    
    if created:
        print(f"Created template: {name}")
    else:
        print(f"Template {name} already exists.")

if __name__ == "__main__":
    seed_modern_template()
