import os, django
from django.db.models import Q
from django.utils import timezone

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
os.environ['SECRET_KEY'] = "yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP"
os.environ['DEBUG'] = "False"
os.environ['ALLOWED_HOSTS'] = "ilead-backend-production-20f7.up.railway.app"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, SentEmailLog, User, AuditLog

target_searches = [
    {"name": "Sudipto Podder"},
    {"name": "Bishal Sardar"},
    {"name": "Talha Muzaffar"},
    {"name": "Purbita Biswas"},
    {"name": "Md Mobashir Nawab"},
    {"name": "Swapnanil Maity"},
    {"name": "Shamir"},
    {"name": "Sharique"},
    {"name": "Dibyojoti Dutta"},
    {"name": "Khusnama Khatoon"},
    {"name": "Sohan Das"},
    {"name": "Sudipto Mondal"},
    {"name": "Debarshi Paul"},
    {"email": "pauldebashi2003@gmail.com"},
    {"email": "triparnadas04@gmail.com"}
]

print("=== SPECIFIC COMPLAINING STUDENTS AUDIT ===")
for search in target_searches:
    s_qs = Student.objects.none()
    if "name" in search:
        s_qs = Student.objects.filter(name__icontains=search["name"])
        print(f"\nSearch Name: '{search['name']}' (Found {s_qs.count()} matches)")
    elif "email" in search:
        s_qs = Student.objects.filter(email__iexact=search["email"])
        print(f"\nSearch Email: '{search['email']}' (Found {s_qs.count()} matches)")
        
    for s in s_qs:
        u = s.user
        welcome_logs = SentEmailLog.objects.filter(recipient=s.email, subject__icontains="Welcome").order_by('-sent_at')
        reset_logs = SentEmailLog.objects.filter(recipient=s.email, subject__icontains="Reset").order_by('-sent_at')
        
        print(f"  - Name:             {s.name} ({s.course} Sem {s.semester})")
        print(f"    Email:            {s.email}")
        print(f"    Login ID:         {u.login_id if u else 'No User'}")
        print(f"    Active:           {u.is_active if u else 'No User'}")
        # Check password hash type
        has_temp_flag = u.temp_password_flag if u else False
        has_reset_req = u.password_reset_required if u else False
        print(f"    Temp Flag:        {has_temp_flag} | Reset Req: {has_reset_req}")
        
        if welcome_logs.exists():
            print(f"    Welcome Email:    Sent at {timezone.localtime(welcome_logs.first().sent_at)}")
        else:
            print("    Welcome Email:    NEVER SENT")
            
        if reset_logs.exists():
            print(f"    Reset Emails:     {reset_logs.count()} sent. Most recent: {timezone.localtime(reset_logs.first().sent_at)}")
        else:
            print("    Reset Emails:     NEVER SENT")
            
        # Check failed attempts
        print(f"    Failed Attempts:  {u.failed_login_attempts if u else 0}")
        print(f"    Locked Until:     {timezone.localtime(u.locked_until) if u and u.locked_until else 'Not locked'}")
        print(f"    Last Login:       {timezone.localtime(u.last_login) if u and u.last_login else 'Never'}")
        print("-" * 50)
