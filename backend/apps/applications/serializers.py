from rest_framework import serializers
from .models import Application, ApplicationRound, ApplicationStatusHistory, Notification, ResumeEmailLog
from .eligibility_engine import check_eligibility

class ApplicationRoundSerializer(serializers.ModelSerializer):
    round_name = serializers.CharField(source='job_round.round_name', read_only=True)
    
    class Meta:
        model = ApplicationRound
        fields = '__all__'

class ApplicationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_stream = serializers.CharField(source='student.stream', read_only=True)
    student_cgpa = serializers.FloatField(source='student.cgpa', read_only=True)
    job_title = serializers.CharField(source='job.role', read_only=True)
    company_name = serializers.CharField(source='job.company_name', read_only=True)
    job_type = serializers.CharField(source='job.job_type', read_only=True)
    current_round = serializers.SerializerMethodField()
    rounds = ApplicationRoundSerializer(many=True, read_only=True)
    resume_url = serializers.SerializerMethodField()
    current_eligibility = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = '__all__'

    def get_resume_url(self, obj):
        student = obj.student
        url = None
        
        # Check built resumes first
        primary_built = student.built_resumes.filter(is_primary=True, state__in=['active', 'generated']).first()
        if primary_built and primary_built.generated_pdf:
            url = primary_built.generated_pdf.url
        else:
            # Then check uploaded resumes
            primary_upload = student.resume_uploads.filter(is_primary=True, status='parsed').first()
            if primary_upload and primary_upload.file:
                url = primary_upload.file.url
                
        if url:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(url)
            return url
            
        return None

    def get_current_round(self, obj):
        latest = obj.rounds.filter(status__in=['pending', 'scheduled']).order_by('round_number').first()
        if latest:
            return ApplicationRoundSerializer(latest).data
        return None

    def get_current_eligibility(self, obj):
        # Re-check eligibility against CURRENT job rules
        return check_eligibility(obj.student, obj.job)

class ApplicationStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationStatusHistory
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class SendResumesSerializer(serializers.Serializer):
    """Validates the send-resumes request payload."""
    company_email = serializers.EmailField()
    subject = serializers.CharField(max_length=200)
    body = serializers.CharField(max_length=5000)
    application_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=50,
    )
    cc_emails = serializers.ListField(
        child=serializers.EmailField(),
        required=False,
        default=list,
        max_length=5,
    )

    def validate_application_ids(self, value):
        if len(set(value)) != len(value):
            raise serializers.ValidationError("Duplicate application IDs found.")
        return value

class ResumeEmailLogSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.CharField(source='sent_by.name', read_only=True)
    sent_by_email = serializers.CharField(source='sent_by.email', read_only=True)

    class Meta:
        model = ResumeEmailLog
        fields = [
            'id', 'sent_by_name', 'sent_by_email', 'job',
            'company_email', 'subject', 'body', 'cc_emails', 'application_ids',
            'student_names', 'resumes_attached', 'skipped_students',
            'status', 'error_message', 'sent_at',
        ]
        read_only_fields = fields
