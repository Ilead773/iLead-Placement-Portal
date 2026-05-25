import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

# We link this to the existing core.Student model
from core.models import Student

class Course(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)

    class Meta:
        db_table = 'career_courses'

    def __str__(self):
        return self.name

class Skill(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=50)

    class Meta:
        db_table = 'career_skills'

    def __str__(self):
        return self.name

class CourseSkill(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='required_skills')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    required_level = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(5)])
    weight = models.DecimalField(max_digits=3, decimal_places=2)

    class Meta:
        db_table = 'career_course_skills'

class LearningResource(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='resources')
    title = models.CharField(max_length=255)
    platform = models.CharField(max_length=100)
    instructor = models.CharField(max_length=255, blank=True, null=True)
    estimated_hours = models.IntegerField()
    difficulty = models.CharField(max_length=50)
    url = models.URLField(max_length=500, blank=True, null=True)

    class Meta:
        db_table = 'career_learning_resources'

class CareerProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='career_profile')
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'career_profiles'

class StudentSkill(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(CareerProfile, on_delete=models.CASCADE, related_name='skills')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    level = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(5)])
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'career_student_skills'

class Roadmap(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.OneToOneField(CareerProfile, on_delete=models.CASCADE, related_name='roadmap')
    status = models.CharField(max_length=50, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    estimated_completion = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'career_roadmaps'

class RoadmapPhase(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    roadmap = models.ForeignKey(Roadmap, on_delete=models.CASCADE, related_name='phases')
    phase_number = models.IntegerField()
    name = models.CharField(max_length=255)
    duration_weeks = models.IntegerField()

    class Meta:
        db_table = 'career_roadmap_phases'
        ordering = ['phase_number']

class PhaseSkill(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phase = models.ForeignKey(RoadmapPhase, on_delete=models.CASCADE, related_name='skills_to_learn')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    target_level = models.IntegerField()
    total_hours = models.IntegerField()

    class Meta:
        db_table = 'career_phase_skills'
