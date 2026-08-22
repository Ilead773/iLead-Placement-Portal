import os, django

os.environ['DATABASE_URL'] = 'postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres'
os.environ['SECRET_KEY'] = 'yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP'
os.environ['DEBUG'] = 'False'
os.environ['ALLOWED_HOSTS'] = 'ilead-backend-production-20f7.up.railway.app'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import SentEmailLog
from django.db import connection

User = get_user_model()
email = 'dasshirsha36@gmail.com'

try:
    user = User.objects.get(email__iexact=email)
    print("=== DATABASE RECORD ===")
    print(f"Name:             {user.name}")
    print(f"Login ID:         {user.login_id}")
    print(f"Email:            {user.email}")
    print(f"Is Active:        {user.is_active}")
    print(f"Temp Pass Flag:   {user.temp_password_flag}")
    print(f"Reset Required:   {user.password_reset_required}")
    print(f"Failed Attempts:  {user.failed_login_attempts}")
    print(f"Locked Until:     {user.locked_until}")
    
    # 1. Check SentEmailLog for all emails sent to her
    print("\n=== SENT EMAIL LOGS ===")
    emails = SentEmailLog.objects.filter(recipient__iexact=email).order_by('-sent_at')
    print(f"Total emails logged: {emails.count()}")
    for e in emails:
        print(f"  {e.sent_at} | Subject: '{e.subject}' | API Key: ...{e.api_key_used if e.api_key_used else 'None'}")
        
    # 2. Check Audit logs if they exist
    print("\n=== AUDIT LOGS ===")
    with connection.cursor() as cursor:
        try:
            cursor.execute("""
                SELECT action, details, ip_address, created_at 
                FROM audit_logs 
                WHERE user_id = %s 
                ORDER BY created_at DESC;
            """, [user.id])
            logs = cursor.fetchall()
            print(f"Total audit logs: {len(logs)}")
            for log in logs:
                print(f"  {log[3]} | Action: {log[0]} | Details: {log[1]} | IP: {log[2]}")
        except Exception as audit_err:
            print(f"Could not read audit logs: {audit_err}")
            
except User.DoesNotExist:
    print(f"No user found for email '{email}'")
