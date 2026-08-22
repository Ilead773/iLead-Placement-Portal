import os, django

os.environ['DATABASE_URL'] = 'postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres'
os.environ['SECRET_KEY'] = 'yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP'
os.environ['DEBUG'] = 'False'
os.environ['ALLOWED_HOSTS'] = 'ilead-backend-production-20f7.up.railway.app'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

students = [
    {"name": "Purbita Biswas", "query": "Purbita"},
    {"name": "Md Mobashir Nawab", "query": "Mobashir"},
    {"name": "Swapnanil Maity", "query": "Swapnanil"},
    {"name": "Sk md Shamir", "query": "Shamir"},
]

print("=== AUDITING SPECIFIC STUDENT ACCOUNTS ===")
print()

for s in students:
    print(f"Searching database for '{s['name']}'...")
    users = User.objects.filter(name__icontains=s['query'])
    
    if not users.exists():
        # Try searching email
        users = User.objects.filter(email__icontains=s['query'])
        
    if users.exists():
        for u in users:
            print(f"  MATCH FOUND:")
            print(f"    Name:             {u.name}")
            print(f"    Login ID:         {u.login_id}")
            print(f"    Email:            {u.email}")
            print(f"    Is Active:        {u.is_active}")
            print(f"    Temp Pass Flag:   {u.temp_password_flag}")
            print(f"    Reset Required:   {u.password_reset_required}")
            print(f"    Failed Attempts:  {u.failed_login_attempts}")
            print(f"    Locked Until:     {u.locked_until}")
    else:
        print(f"  ❌ No matching user found in the database.")
    print("-" * 50)
