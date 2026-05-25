from django.core.management.base import BaseCommand
from apps.templates_engine.models import ResumeTemplate

class Command(BaseCommand):
    help = 'Seed initial resume templates'

    def handle(self, *args, **options):
        default_html = """
<div class="resume">
    <header>
        <h1>{{ personal.name }}</h1>
        <p>{{ personal.email }} | {{ personal.phone }}</p>
        <p>{{ personal.location }}</p>
    </header>

    <section>
        <h2>Professional Summary</h2>
        <p>{{ summary }}</p>
    </section>

    <section>
        <h2>Experience</h2>
        {% for exp in experience %}
        <div class="item">
            <h3>{{ exp.position }} at {{ exp.company }}</h3>
            <p>{{ exp.duration.start }} - {% if exp.duration.current %}Present{% else %}{{ exp.duration.end }}{% endif %}</p>
            <p>{{ exp.description }}</p>
            <ul>
                {% for ach in exp.achievements %}
                <li>{{ ach }}</li>
                {% endfor %}
            </ul>
        </div>
        {% endfor %}
    </section>

    <section>
        <h2>Skills</h2>
        {% for skill_group in skills %}
        <p><strong>{{ skill_group.category }}:</strong> {{ skill_group.items|join:", " }}</p>
        {% endfor %}
    </section>
</div>
"""
        default_css = """
.resume { font-family: 'Arial', sans-serif; color: #333; line-height: 1.6; max-width: 800px; margin: auto; }
header { text-align: center; border-bottom: 2px solid #333; margin-bottom: 20px; }
h1 { margin-bottom: 5px; }
h2 { border-bottom: 1px solid #ccc; margin-top: 20px; color: #444; }
.item { margin-bottom: 15px; }
ul { margin-top: 5px; }
"""

        template, created = ResumeTemplate.objects.get_or_create(
            name="Modern Clean",
            defaults={
                "description": "A modern clean template for all roles.",
                "html_template": default_html,
                "css_styles": default_css,
                "version": 1,
                "is_active": True
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f'Successfully created template: {template.name}'))
        else:
            self.stdout.write(self.style.WARNING(f'Template {template.name} already exists'))
