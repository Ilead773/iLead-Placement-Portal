from django.db import migrations

def update_templates_migration(apps, schema_editor):
    from apps.templates_engine.seed_templates import seed_modern_template, seed_ilead_kolkata_template
    print("Running data migration to update resume templates with new icons and fonts...")
    seed_modern_template()
    seed_ilead_kolkata_template()

def rollback_templates_migration(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('templates_engine', '0002_seed_resume_templates'),
    ]

    operations = [
        migrations.RunPython(update_templates_migration, rollback_templates_migration),
    ]
