import os, django
from django.db.models import Q

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
os.environ['SECRET_KEY'] = "yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP"
os.environ['DEBUG'] = "False"
os.environ['ALLOWED_HOSTS'] = "ilead-backend-production-20f7.up.railway.app"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student

print("=== ALL PAULS IN DATABASE ===")
all_pauls = Student.objects.filter(name__icontains="Paul")
for s in all_pauls:
    print(f"  - Name: {s.name:30} | Email: {s.email:35} | Reg: {s.registration_number}")

print("\n=== STUDENTS WITH 2003 IN EMAIL ===")
e_2003 = Student.objects.filter(email__icontains="2003")
for s in e_2003:
    print(f"  - Name: {s.name:30} | Email: {s.email:35} | Reg: {s.registration_number}")
