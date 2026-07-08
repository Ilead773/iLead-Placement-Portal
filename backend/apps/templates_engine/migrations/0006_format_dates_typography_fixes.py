from django.db import migrations


def format_dates_typography_fixes(apps, schema_editor):
    from apps.templates_engine.seed_templates import seed_ilead_kolkata_template
    print("Running migration: seed latest date format and typography fixes for iLEAD Kolkata Standard...")
    seed_ilead_kolkata_template()


def rollback(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('templates_engine', '0005_fix_two_column_layout'),
    ]

    operations = [
        migrations.RunPython(format_dates_typography_fixes, rollback),
    ]
