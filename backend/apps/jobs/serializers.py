from rest_framework import serializers
from django.utils import timezone as tz
from .models import Job, JobRound
from apps.applications.eligibility_engine import check_eligibility

class JobRoundSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobRound
        fields = '__all__'
        extra_kwargs = {'job': {'read_only': True}}

class JobSerializer(serializers.ModelSerializer):
    rounds = JobRoundSerializer(many=True, read_only=True)
    applications_count = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = ['id', 'company_name', 'company_website', 'role', 'description', 'package', 'location', 
                  'job_type', 'listing_type', 'duration', 'external_link', 'eligibility_rules', 
                  'application_deadline', 'status', 'rounds', 'applications_count',
                  'category', 'openings_count', 'hr_email', 'created_at', 'updated_at']

    def get_applications_count(self, obj):
        if hasattr(obj, 'applications_count_annotated'):
            return obj.applications_count_annotated
        return obj.applications.filter(is_deleted=False).count()

class JobCreateSerializer(serializers.ModelSerializer):
    rounds = JobRoundSerializer(many=True, required=False, default=[])

    class Meta:
        model = Job
        fields = ['id', 'company_name', 'company_website', 'role', 'description', 'package', 'location', 
                  'job_type', 'listing_type', 'duration', 'external_link', 'eligibility_rules', 
                  'application_deadline', 'status', 'rounds', 'category', 'openings_count', 'hr_email']

    def create(self, validated_data):
        rounds_data = validated_data.pop('rounds', [])
        job = Job.objects.create(**validated_data)
        for round_data in rounds_data:
            JobRound.objects.create(job=job, **round_data)
        return job

    def update(self, instance, validated_data):
        rounds_data = validated_data.pop('rounds', None)
        
        # Ensure application_deadline is timezone-aware
        deadline = validated_data.get('application_deadline')
        if deadline and tz.is_naive(deadline):
            validated_data['application_deadline'] = tz.make_aware(deadline)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if rounds_data is not None:
            instance.rounds.all().delete()
            for round_data in rounds_data:
                JobRound.objects.create(job=instance, **round_data)
        
        # Refresh to pick up auto_now updated_at and re-read from DB
        instance.refresh_from_db()
        return instance

class EligibilityCheckSerializer(serializers.Serializer):
    eligible = serializers.BooleanField()
    failing_checks = serializers.ListField(child=serializers.DictField())
    passing_checks = serializers.ListField(child=serializers.CharField())
    match_score = serializers.FloatField()
