from rest_framework import serializers
from django.utils import timezone as tz
from .models import Job, JobRound
from apps.applications.eligibility_engine import check_eligibility

class JobRoundSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)

    class Meta:
        model = JobRound
        fields = '__all__'
        extra_kwargs = {'job': {'read_only': True}}

class JobSerializer(serializers.ModelSerializer):
    rounds = serializers.SerializerMethodField()
    applications_count = serializers.SerializerMethodField()
    placed_count = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = ['id', 'company_name', 'company_website', 'role', 'description', 'package', 'location', 
                  'job_type', 'listing_type', 'duration', 'external_link', 'eligibility_rules', 
                  'application_deadline', 'status', 'rounds', 'applications_count', 'placed_count',
                  'category', 'openings_count', 'hr_email', 'created_at', 'updated_at']

    def get_rounds(self, obj):
        active_rounds = obj.rounds.filter(is_deleted=False).order_by('round_number')
        return JobRoundSerializer(active_rounds, many=True).data

    def get_applications_count(self, obj):
        if hasattr(obj, 'applications_count_annotated'):
            return obj.applications_count_annotated
        return obj.applications.filter(is_deleted=False).count()

    def get_placed_count(self, obj):
        if hasattr(obj, 'placed_count_annotated'):
            return obj.placed_count_annotated
        return obj.applications.filter(status__in=['selected', 'accepted'], is_deleted=False).count()

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
            # 1. Fetch existing active rounds in DB for this job
            existing_rounds = {str(r.id): r for r in instance.rounds.filter(is_deleted=False)}
            
            incoming_round_ids = set()
            rounds_to_create = []
            rounds_to_update = []
            
            for round_data in rounds_data:
                round_id = round_data.get('id')
                if round_id and str(round_id) in existing_rounds:
                    incoming_round_ids.add(str(round_id))
                    rounds_to_update.append((existing_rounds[str(round_id)], round_data))
                else:
                    rounds_to_create.append(round_data)
            
            # 2. Check for rounds to delete
            rounds_to_delete_ids = set(existing_rounds.keys()) - incoming_round_ids
            
            # 3. To avoid unique constraint violation ('job', 'round_number') during shifting of numbers,
            # we temporarily set round numbers of existing active rounds to negative values.
            for i, r_obj in enumerate(existing_rounds.values(), start=1):
                r_obj.round_number = -i
                r_obj.save(update_fields=['round_number'])
            
            # 4. Perform updates
            for r_obj, r_data in rounds_to_update:
                r_obj.round_number = r_data.get('round_number', r_obj.round_number)
                r_obj.round_name = r_data.get('round_name', r_obj.round_name)
                r_obj.round_type = r_data.get('round_type', r_obj.round_type)
                r_obj.is_elimination = r_data.get('is_elimination', r_obj.is_elimination)
                r_obj.passing_score = r_data.get('passing_score', r_obj.passing_score)
                r_obj.duration_minutes = r_data.get('duration_minutes', r_obj.duration_minutes)
                r_obj.save()
            
            # 5. Perform deletions (soft-delete if student evaluations exist, hard-delete otherwise)
            from apps.applications.models import ApplicationRound
            for r_id in rounds_to_delete_ids:
                r_obj = existing_rounds[r_id]
                if ApplicationRound.objects.filter(job_round=r_obj).exists():
                    r_obj.is_deleted = True
                    r_obj.save()
                else:
                    r_obj.delete()
            
            # 6. Perform creations
            for r_data in rounds_to_create:
                # Pop id if it is null/blank to let UUID auto-generate
                r_data.pop('id', None)
                JobRound.objects.create(job=instance, **r_data)
        
        # Refresh to pick up auto_now updated_at and re-read from DB
        instance.refresh_from_db()
        return instance

class EligibilityCheckSerializer(serializers.Serializer):
    eligible = serializers.BooleanField()
    failing_checks = serializers.ListField(child=serializers.DictField())
    passing_checks = serializers.ListField(child=serializers.CharField())
    match_score = serializers.FloatField()
