import os, django, secrets, string

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
os.environ['SECRET_KEY'] = "yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP"
os.environ['DEBUG'] = "False"
os.environ['ALLOWED_HOSTS'] = "ilead-backend-production-20f7.up.railway.app"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student

alphabet = string.ascii_letters + string.digits

# Find Sudipta Mondal
s = Student.objects.get(registration_number="28941924176")
u = s.user

temp_password = ''.join(secrets.choice(alphabet) for _ in range(10))

# Reset credentials and flags
u.set_password(temp_password)
u.temp_password_flag = True
u.password_reset_required = True
u.failed_login_attempts = 0
u.locked_until = None

u.save()
s.save()

print("=== RESET SUCCESSFUL ===")
print(f"Name:             {s.name}")
print(f"Email:            {s.email}")
print(f"Login ID:         {u.login_id}")
print(f"New Temp Pass:    {temp_password}")
