import os, django, secrets, string
from django.db import connection, transaction

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
os.environ['SECRET_KEY'] = "yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP"
os.environ['DEBUG'] = "False"
os.environ['ALLOWED_HOSTS'] = "ilead-backend-production-20f7.up.railway.app"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, User

remaining = [
    {"roll": "28941624117", "name": "Md Shihab Hossain", "email": "hossainmdshihab069@gmail.com"},
    {"roll": "28941624199", "name": "Subhadeep Guchhait", "email": "subhadeepguhhait@gmail.com"},
    {"roll": "28941624078", "name": "Bikrant Singh", "email": "vikrant44297@gmail.com"},
    {"roll": "28941624016", "name": "Subhrajit Dutta", "email": "duttasubhrajit45@gmail.com"},
    {"roll": "28941624024", "name": "Sujal Ghosh", "email": "arvsujal2@gmail.com"},
    {"roll": "28941624120", "name": "Mufaddal", "email": "muffidhanera2006@gmail.com"},
    {"roll": "28941624074", "name": "Dipanwita Mahajan", "email": "dipanwitamahajan28552@gmail.com"}
]

alphabet = string.ascii_letters + string.digits

print("=== REMAINING STUDENT PASSWORD RESET (CLOSE CONN PER ITERATION) ===")
print(f"{'Student Name':<25} | {'Email':<35} | {'Login ID':<12} | {'New Temp Password'}")
print("-" * 95)

reset_count = 0
not_found_list = []

for c in remaining:
    try:
        s_qs = Student.objects.filter(registration_number=c["roll"])
        if not s_qs.exists():
            not_found_list.append(c)
            connection.close()
            continue
            
        s = s_qs.first()
        u = s.user
        if not u:
            print(f"No user record for student: {s.name} ({s.registration_number})")
            connection.close()
            continue
            
        # Generate new temporary password
        temp_pass = ''.join(secrets.choice(alphabet) for _ in range(10))
        
        # Check if we should update email address in database
        c_email = c["email"].lower().strip()
        if s.email.lower().strip() != c_email:
            s.email = c_email
            u.email = c_email
            
        # Reset credentials and security parameters
        u.set_password(temp_pass)
        u.temp_password_flag = True
        u.password_reset_required = True
        u.failed_login_attempts = 0
        u.locked_until = None
        
        # Save both models
        with transaction.atomic():
            u.save()
            s.save()
        
        reset_count += 1
        print(f"{s.name[:25]:<25} | {s.email[:35]:<35} | {u.login_id:<12} | {temp_pass}")
    except Exception as e:
        print(f"Failed to reset {c['name']}: {e}")
    finally:
        connection.close() # Keep connections clean!

print("-" * 95)
print(f"Successfully reset credentials for {reset_count} remaining students.")

if not_found_list:
    print("\n=== NOT FOUND IN DATABASE ===")
    for c in not_found_list:
        print(f"  - Name: {c['name']:25} | Roll: {c['roll']:15} | Email: {c['email']}")
