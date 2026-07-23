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

# Get one log to inspect timezone
log = AuditLog.objects.filter(action='login_success').first()
if log:
    print(f"Raw timestamp: {log.timestamp}")
    print(f"Tzinfo: {log.timestamp.tzinfo}")
    
    # Let's convert to localtime using Django's timezone utility
    local_dt = timezone.localtime(log.timestamp)
    print(f"Django localtime: {local_dt}")
    print(f"Django localtime tzinfo: {local_dt.tzinfo}")
else:
    print("No logs found.")
