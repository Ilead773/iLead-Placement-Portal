# Generated manually for MCQ learning assignments.
import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_externalclicklog_click_count_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='LearningAssignment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('course', models.CharField(db_index=True, max_length=100)),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True, default='')),
                ('duration_minutes', models.PositiveIntegerField(default=30)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='learning_assignments_created', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'learning_assignments',
                'ordering': ['course', 'title'],
            },
        ),
        migrations.CreateModel(
            name='LearningQuestion',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('prompt', models.TextField()),
                ('options', models.JSONField(default=list)),
                ('correct_option', models.PositiveSmallIntegerField(default=0)),
                ('points', models.PositiveIntegerField(default=1)),
                ('order', models.PositiveIntegerField(default=0)),
                ('assignment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='questions', to='core.learningassignment')),
            ],
            options={
                'db_table': 'learning_questions',
                'ordering': ['order', 'id'],
            },
        ),
        migrations.CreateModel(
            name='StudentLearningAssignment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('status', models.CharField(choices=[('assigned', 'Assigned'), ('submitted', 'Submitted'), ('expired', 'Expired')], default='assigned', max_length=20)),
                ('due_at', models.DateTimeField(blank=True, null=True)),
                ('score', models.FloatField(blank=True, null=True)),
                ('total_points', models.PositiveIntegerField(default=0)),
                ('submitted_at', models.DateTimeField(blank=True, null=True)),
                ('assigned_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('assigned_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='learning_assignments_assigned', to=settings.AUTH_USER_MODEL)),
                ('assignment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='student_assignments', to='core.learningassignment')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='learning_assignments', to='core.student')),
            ],
            options={
                'db_table': 'student_learning_assignments',
                'ordering': ['-assigned_at'],
                'unique_together': {('assignment', 'student')},
            },
        ),
        migrations.CreateModel(
            name='StudentLearningAnswer',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('selected_option', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('is_correct', models.BooleanField(default=False)),
                ('awarded_points', models.FloatField(default=0)),
                ('question', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='student_answers', to='core.learningquestion')),
                ('student_assignment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='answers', to='core.studentlearningassignment')),
            ],
            options={
                'db_table': 'student_learning_answers',
                'unique_together': {('student_assignment', 'question')},
            },
        ),
    ]
