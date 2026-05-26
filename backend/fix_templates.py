import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.templates_engine.models import ResumeTemplate

for template in ResumeTemplate.objects.all():
    # Only the inner HTML is needed, not html/body tags
    template.html_template = """
<div class="resume">
    <h1>{{ personal.name|default:"Your Name" }}</h1>
    <p>{{ personal.email }} | {{ personal.phone }}</p>
    
    <h2>Professional Summary</h2>
    <p>{{ summary }}</p>
    
    {% if experience %}
    <h2>Experience</h2>
    {% for exp in experience %}
        <div>
            <h3>{{ exp.position }} at {{ exp.company }}</h3>
            <p>{{ exp.duration.start }} - {{ exp.duration.end|default:"Present" }}</p>
            <p>{{ exp.description }}</p>
        </div>
    {% endfor %}
    {% endif %}
    
    {% if education %}
    <h2>Education</h2>
    {% for edu in education %}
        <div>
            <h3>{{ edu.degree }} in {{ edu.field }}</h3>
            <p>{{ edu.institution }} | {{ edu.graduation_date }}</p>
        </div>
    {% endfor %}
    {% endif %}
    
    {% if skills %}
    <h2>Skills</h2>
    <ul>
    {% for skill_group in skills %}
        <li><strong>{{ skill_group.category }}:</strong> {{ skill_group.items|join:", " }}</li>
    {% endfor %}
    </ul>
    {% endif %}
</div>
"""
    # Better CSS for WeasyPrint
    template.css_styles = """
    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; line-height: 1.5; margin: 0; padding: 20px; }
    h1 { font-size: 24px; color: #2c3e50; margin-bottom: 5px; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
    h2 { font-size: 18px; color: #2980b9; margin-top: 15px; margin-bottom: 10px; text-transform: uppercase; }
    h3 { font-size: 16px; margin: 0; color: #34495e; }
    p { margin: 5px 0; }
    ul { margin: 5px 0; padding-left: 20px; }
    .resume { max-width: 800px; margin: 0 auto; }
    """
    template.save()

print("Templates updated successfully!")
