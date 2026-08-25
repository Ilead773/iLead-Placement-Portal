import os, django
from django.utils import timezone
from django.db.models import Q

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
os.environ['SECRET_KEY'] = "yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP"
os.environ['DEBUG'] = "False"
os.environ['ALLOWED_HOSTS'] = "ilead-backend-production-20f7.up.railway.app"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, SentEmailLog, User, AuditLog

complaining_emails = [
    "triparnadas04@gmail.com",
    "avikjana590@gmail.com",
    "pauldebashi2003@gmail.com",
    "Sultanafarha705@gmail.com"
]

complaining_names = [
    "Triparna das",
    "Sudipto Podder",
    "Bishal Sardar",
    "Talha Muzaffar",
    "Purbita Biswas",
    "Md Mobashir Nawab",
    "Swapnanil Maity",
    "Sk md Shamir",
    "Md. Sharique Ullah",
    "Dibyojoti Dutta",
    "Khusnama Khatoon",
    "Sohan Das",
    "Sudipto Mondal",
    "Avik Jana",
    "Debarshi Paul",
    "Farhana Sultana"
]

print("=== AUDIT OF COMPLAINING STUDENTS ===")
print()

# Helper to print info about a student
def print_student_info(s, name_query=None):
    u = s.user
    welcome_logs = SentEmailLog.objects.filter(recipient=s.email, subject__icontains="Welcome").order_by('-sent_at')
    reset_logs = SentEmailLog.objects.filter(recipient=s.email, subject__icontains="Reset").order_by('-sent_at')
    last_audit = AuditLog.objects.filter(user=u).order_by('-timestamp').first()
    
    print(f"Name:             {s.name} ({s.course} Sem {s.semester})")
    print(f"Registration No:  {s.registration_number}")
    print(f"Email:            {s.email}")
    print(f"Login ID:         {u.login_id if u else 'No User'}")
    print(f"Active:           {u.is_active if u else 'No User'}")
    print(f"Failed Attempts:  {u.failed_login_attempts if u else 0}")
    print(f"Locked Until:     {timezone.localtime(u.locked_until) if u and u.locked_until else 'Not locked'}")
    print(f"Temp Pass Flag:   {u.temp_password_flag if u else 'N/A'}")
    print(f"Reset Required:   {u.password_reset_required if u else 'N/A'}")
    
    # Email Logs
    if welcome_logs.exists():
        print(f"Welcome Email:    Sent at {timezone.localtime(welcome_logs.first().sent_at)}")
    else:
        print("Welcome Email:    NEVER SENT")
        
    if reset_logs.exists():
        print(f"Reset Emails:     {reset_logs.count()} sent. Most recent at {timezone.localtime(reset_logs.first().sent_at)}")
    else:
        print("Reset Emails:     NEVER SENT")
        
    # Last Activity
    if u and u.last_login:
        print(f"Last Login:       {timezone.localtime(u.last_login)}")
    else:
        print("Last Login:       Never logged in successfully")
        
    if last_audit:
        print(f"Last Action:      [{timezone.localtime(last_audit.timestamp)}] {last_audit.action} - {last_audit.details}")
    
    print("-" * 60)

# Check by email list
print("=== CHECK BY EMAIL MATCHES ===")
for email in complaining_emails:
    s_qs = Student.objects.filter(email__iexact=email)
    if s_qs.exists():
        for s in s_qs:
            print_student_info(s)
    else:
        # Search User by email
        u_qs = User.objects.filter(email__iexact=email)
        if u_qs.exists():
            for u in u_qs:
                print(f"Found User without student profile: Login ID={u.login_id} | Email={u.email}")
        else:
            print(f"NO RECORD FOUND FOR EMAIL: {email}")
            print("-" * 60)

# Check by Name matches
print("\n=== CHECK BY NAME MATCHES ===")
for name in complaining_names:
    s_qs = Student.objects.filter(Q(name__icontains=name) | Q(name__icontains=name.split()[0]))
    if s_qs.exists():
        for s in s_qs:
            print_student_info(s)
    else:
        print(f"NO STUDENT FOUND CONTAINING NAME: {name}")
        print("-" * 60)
