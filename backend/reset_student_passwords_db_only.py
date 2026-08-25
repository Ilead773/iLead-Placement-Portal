import os, django, secrets, string

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
os.environ['SECRET_KEY'] = "yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP"
os.environ['DEBUG'] = "False"
os.environ['ALLOWED_HOSTS'] = "ilead-backend-production-20f7.up.railway.app"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, User

targets = [
    {"name_query": "Triparna das", "new_email": "triparnadas04@gmail.com"},
    {"name_query": "Sudipto Podder"},
    {"name_query": "Bishal Sardar"},
    {"name_query": "Talha Muzaffar"},
    {"name_query": "Purbita Biswas"},
    {"name_query": "Md Mobashir Nawab"},
    {"name_query": "Swapnanil Maity"},
    {"name_query": "Sk md shamir"},
    {"name_query": "Md Sharique Ullah"},
    {"name_query": "Dibyojoti Dutta"},
    {"name_query": "Khushnama Khatoon"},
    {"name_query": "Sohan Das"},
    {"email_query": "avikjana590@gmail.com"},
    {"name_query": "Farhana Sultana"}
]

alphabet = string.ascii_letters + string.digits

print("=== BATCH PASSWORD RESET (DATABASE ONLY - NO EMAILS SENT) ===")
print(f"{'Student Name':<25} | {'Email':<32} | {'Login ID':<12} | {'New Temp Password'}")
print("-" * 95)

reset_count = 0

for target in targets:
    s = None
    if "email_query" in target:
        s_qs = Student.objects.filter(email__iexact=target["email_query"])
        if s_qs.exists():
            s = s_qs.first()
    elif "name_query" in target:
        s_qs = Student.objects.filter(name__icontains=target["name_query"])
        if s_qs.exists():
            s = s_qs.first()
            
    if not s:
        print(f"FAILED TO FIND TARGET: {target}")
        continue
        
    u = s.user
    if not u:
        print(f"No user found for student: {s.name}")
        continue
        
    # Generate new temporary password
    temp_password = ''.join(secrets.choice(alphabet) for _ in range(10))
    
    # Apply email change if specified (e.g. Triparna Das)
    if "new_email" in target:
        s.email = target["new_email"]
        u.email = target["new_email"]
        
    # Reset credentials and flags to default state
    u.set_password(temp_password)
    u.temp_password_flag = True
    u.password_reset_required = True
    u.failed_login_attempts = 0
    u.locked_until = None
    
    # Save both models
    u.save()
    s.save()
    
    reset_count += 1
    print(f"{s.name[:25]:<25} | {s.email[:32]:<32} | {u.login_id:<12} | {temp_password}")

print("-" * 95)
print(f"Successfully reset credentials in database for {reset_count} students. NO EMAILS WERE SENT.")
