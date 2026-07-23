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
from core.models import Student, AuditLog
from apps.applications.models import Notification

User = get_user_model()

print("Connected to production database successfully.")

try:
    sneha = User.objects.get(login_id='28941624006')
    print(f"Sneha Podder account created at: {timezone.localtime(sneha.created_at)}")
    
    # Check if there are any notifications/emails sent to her
    notifications = Notification.objects.filter(user=sneha).order_by('created_at')
    print(f"\nNotifications sent to Sneha:")
    if not notifications.exists():
        print("  No notifications found.")
    else:
        for n in notifications:
            ist_dt = timezone.localtime(n.created_at)
            print(f"  - [{ist_dt}] Title: {n.title} | Status: {n.message[:60]}")
            
    # Check the audit log for student creation or welcome email
    creation_audit = AuditLog.objects.filter(details__icontains='28941624006').order_by('timestamp')
    print(f"\nCreation audit logs for Sneha:")
    if not creation_audit.exists():
        print("  No creation audit logs found.")
    else:
        for log in creation_audit:
            ist_dt = timezone.localtime(log.timestamp)
            print(f"  - [{ist_dt}] Action: {log.action} | Details: {log.details}")
            
except User.DoesNotExist:
    print("User not found.")
