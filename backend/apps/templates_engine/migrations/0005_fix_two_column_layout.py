from django.db import migrations


def fix_two_column_layout(apps, schema_editor):
    from apps.templates_engine.seed_templates import seed_ilead_kolkata_template
    print("Running migration: fix two-column table layout for iLEAD Kolkata Standard...")
    seed_ilead_kolkata_template()


def rollback(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('templates_engine', '0004_compact_css_font_fix'),
    ]

    operations = [
        migrations.RunPython(fix_two_column_layout, rollback),
    ]
