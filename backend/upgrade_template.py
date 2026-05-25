from apps.templates_engine.models import ResumeTemplate

css = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; background: white; }
header { border-bottom: 4px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
h1 { font-size: 32px; font-weight: 800; text-transform: uppercase; letter-spacing: -1px; margin: 0; color: #0f172a; }
.contact-info { display: flex; gap: 15px; font-size: 13px; color: #64748b; margin-top: 10px; }
section { margin-bottom: 30px; }
h2 { font-size: 16px; font-weight: 800; color: #6366f1; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 15px; }
.job-item { margin-bottom: 20px; }
.job-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; }
.job-title { font-weight: 700; font-size: 15px; color: #0f172a; }
.job-date { font-size: 12px; color: #94a3b8; }
.company { font-size: 14px; font-weight: 600; color: #475569; }
.description { font-size: 13px; color: #334155; margin-top: 8px; }
ul { padding-left: 20px; margin-top: 8px; }
li { font-size: 13px; margin-bottom: 4px; color: #334155; }
.skills-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.skill-tag { background: #f1f5f9; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; color: #475569; }
"""

html_template = """
<div class="resume-container">
    <header>
        <h1>{{ personal.name|default:"Your Name" }}</h1>
        <div class="contact-info">
            <span>📧 {{ personal.email }}</span>
            <span>📱 {{ personal.phone }}</span>
            <span>📍 {{ personal.location }}</span>
        </div>
    </header>

    {% if summary %}
    <section>
        <h2>Professional Summary</h2>
        <div class="description">{{ summary }}</div>
    </section>
    {% endif %}

    <section>
        <h2>Work Experience</h2>
        {% for exp in experience %}
        <div class="job-item">
            <div class="job-header">
                <span class="job-title">{{ exp.position }}</span>
                <span class="job-date">{{ exp.start_date }} — {{ exp.end_date|default:"Present" }}</span>
            </div>
            <div class="company">{{ exp.company }}</div>
            <div class="description">{{ exp.description }}</div>
        </div>
        {% endfor %}
    </section>

    <section>
        <h2>Skills</h2>
        <div class="skills-grid">
            {% for group in skills %}
                {% for item in group.items %}
                <span class="skill-tag">{{ item }}</span>
                {% endfor %}
            {% endfor %}
        </div>
    </section>
</div>
"""

t = ResumeTemplate.objects.get(name='Modern Clean')
t.css_styles = css
t.html_template = html_template
t.save()
print("Template 'Modern Clean' upgraded to premium version.")
