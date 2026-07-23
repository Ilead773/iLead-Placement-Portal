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

from django.contrib.auth import get_user_model
from core.models import AuditLog

User = get_user_model()

print("Connected to production database successfully.")

# Query all audit logs from the last 24 hours
last_24h = timezone.now() - timezone.timedelta(hours=24)
recent_logs = AuditLog.objects.filter(timestamp__gte=last_24h).order_by('timestamp')

print(f"\nTotal events in the last 24 hours: {recent_logs.count()}")
print("--- Chronological Feed of Recent Activity ---")
for idx, log in enumerate(recent_logs, 1):
    ist_dt = timezone.localtime(log.timestamp)
    ist_str = ist_dt.strftime('%b %d, %Y at %I:%M:%S %p')
    user_str = f"{log.user.name} ({log.user.login_id})" if log.user else "Anonymous/System"
    print(f"{idx}. [{ist_str}] {user_str} -> Action: {log.action} | Details: {log.details} | IP: {log.ip_address}")
