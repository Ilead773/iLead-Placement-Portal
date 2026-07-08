from django.db import migrations

def seed_templates_migration(apps, schema_editor):
    from apps.templates_engine.seed_templates import seed_modern_template, seed_ilead_kolkata_template
    print("Running data migration to seed/update resume templates...")
    seed_modern_template()
    seed_ilead_kolkata_template()

def rollback_templates_migration(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('templates_engine', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_templates_migration, rollback_templates_migration),
    ]
