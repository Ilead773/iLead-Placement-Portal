# Generated manually
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_externalclicklog_mark_selected_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='student',
            name='is_category_manual',
            field=models.BooleanField(default=False),
        ),
    ]
