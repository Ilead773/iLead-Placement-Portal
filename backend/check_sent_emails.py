import os
import django
from django.utils import timezone

# Set env vars to connect to production DB
os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
os.environ['SECRET_KEY'] = "yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP"
os.environ['DEBUG'] = "False"
os.environ['ALLOWED_HOSTS'] = "ilead-backend-production-20f7.up.railway.app"

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import CSVUploadLog, SentEmailLog

print("Connected to production database successfully.")

print("\n=== CSV UPLOAD LOGS ===")
upload_logs = CSVUploadLog.objects.all().order_by('-uploaded_at')
for log in upload_logs:
    local_uploaded_at = timezone.localtime(log.uploaded_at)
    print(f"ID: {log.id}")
    print(f"  File: {log.file_name}")
    print(f"  Total Records: {log.total_records} | Success: {log.successful_records}")
    print(f"  Emails Sent Flag: {log.emails_sent} | Count: {log.sent_emails_count}")
    if log.emails_sent_at:
        print(f"  Emails Sent At: {timezone.localtime(log.emails_sent_at)}")
    else:
        print("  Emails Sent At: None")
    print(f"  Status: {log.status}")
    print("-" * 50)

print("\n=== SENT EMAIL LOGS ===")
total_sent_email_logs = SentEmailLog.objects.count()
print(f"Total SentEmailLog records in DB: {total_sent_email_logs}")

# Group by subject and count
from django.db.models import Count
subject_counts = SentEmailLog.objects.values('subject').annotate(count=Count('id')).order_by('-count')
print("\nEmails grouped by Subject:")
for item in subject_counts:
    print(f"  - Subject: '{item['subject']}' | Count: {item['count']}")
    
# Let's inspect some of the most recent sent emails
recent_emails = SentEmailLog.objects.all().order_by('-sent_at')[:10]
print("\nMost recent 10 sent emails:")
for e in recent_emails:
    local_sent_at = timezone.localtime(e.sent_at)
    print(f"  - [{local_sent_at}] To: {e.recipient} | Subject: {e.subject}")
