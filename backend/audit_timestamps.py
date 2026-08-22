import os, django
from django.utils import timezone

os.environ['DATABASE_URL'] = 'postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres'
os.environ['SECRET_KEY'] = 'yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP'
os.environ['DEBUG'] = 'False'
os.environ['ALLOWED_HOSTS'] = 'ilead-backend-production-20f7.up.railway.app'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import SentEmailLog

User = get_user_model()

print("=== TIMESTAMP AUDIT (Checking if passwords were changed after emails) ===")
print()

# ── 1. AUDIT RUHI RANI KHATUN ───────────────────────────────────────────────
try:
    ruhi = User.objects.get(login_id='28942724005')
    print(f"Student: Ruhi Rani Khatun ({ruhi.login_id})")
    print(f"  Account Created: {timezone.localtime(ruhi.created_at)}")
    print(f"  Account Updated: {timezone.localtime(ruhi.updated_at)}")
    
    # Get welcome email sent timestamp
    email_log = SentEmailLog.objects.filter(recipient__iexact=ruhi.email, subject__icontains='Welcome').first()
    if email_log:
        print(f"  Welcome Email Sent: {timezone.localtime(email_log.sent_at)}")
        
        # Compare
        if ruhi.updated_at > email_log.sent_at:
            time_diff = ruhi.updated_at - email_log.sent_at
            print(f"  ⚠️ ALERT: Account was updated {time_diff} AFTER the welcome email was sent!")
            print("  This means the password was changed/overwritten after she got her email.")
        else:
            print("  Account has not been updated since the welcome email was sent.")
    else:
        print("  No welcome email log found for this email address.")
        
except User.DoesNotExist:
    print("Ruhi not found.")

print("\n" + "-"*60 + "\n")

# ── 2. AUDIT SHIRSHA DAS ────────────────────────────────────────────────────
try:
    shirsha = User.objects.get(login_id='28941624057')
    print(f"Student: Shirsha Das ({shirsha.login_id})")
    print(f"  Account Created: {timezone.localtime(shirsha.created_at)}")
    print(f"  Account Updated: {timezone.localtime(shirsha.updated_at)}")
    
    # Get welcome email sent timestamp
    email_log = SentEmailLog.objects.filter(recipient__iexact=shirsha.email, subject__icontains='Welcome').first()
    if email_log:
        print(f"  Welcome Email Sent: {timezone.localtime(email_log.sent_at)}")
        
        # Compare
        if shirsha.updated_at > email_log.sent_at:
            time_diff = shirsha.updated_at - email_log.sent_at
            print(f"  ⚠️ ALERT: Account was updated {time_diff} AFTER the welcome email was sent!")
            print("  This means the password was changed/overwritten after she got her email.")
        else:
            print("  Account has not been updated since the welcome email was sent.")
    else:
        print("  No welcome email log found for this email address.")
        
except User.DoesNotExist:
    print("Shirsha not found.")
