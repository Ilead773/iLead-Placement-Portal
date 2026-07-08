from django.db import migrations

def update_templates_compact_css(apps, schema_editor):
    from apps.templates_engine.seed_templates import seed_ilead_kolkata_template
    print("Running migration: compact CSS and font sizing for iLEAD Kolkata Standard...")
    seed_ilead_kolkata_template()

def rollback(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('templates_engine', '0003_update_templates_icons_font'),
    ]

    operations = [
        migrations.RunPython(update_templates_compact_css, rollback),
    ]
