import os, django
from django.db.models import Q

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
os.environ['SECRET_KEY'] = "yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP"
os.environ['DEBUG'] = "False"
os.environ['ALLOWED_HOSTS'] = "ilead-backend-production-20f7.up.railway.app"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student

print("=== DEEP SEARCH FOR SUDIPTO MONDAL ===")
s_mondal_qs = Student.objects.filter(
    Q(name__icontains="sudipto") | 
    Q(name__icontains="mondal") | 
    Q(email__icontains="sudipto") | 
    Q(email__icontains="mondal")
)
print(f"Found {s_mondal_qs.count()} partial matches:")
for s in s_mondal_qs:
    print(f"  - Name: {s.name:30} | Email: {s.email:35} | Reg: {s.registration_number}")

print("\n=== DEEP SEARCH FOR DEBARSHI PAUL ===")
d_paul_qs = Student.objects.filter(
    Q(name__icontains="debarshi") | 
    Q(name__icontains="debashi") |
    Q(name__icontains="debar") |
    Q(email__icontains="debarshi") | 
    Q(email__icontains="debashi") |
    Q(email__icontains="debar") |
    Q(email__icontains="pauldeb")
)
print(f"Found {d_paul_qs.count()} partial matches:")
for s in d_paul_qs:
    print(f"  - Name: {s.name:30} | Email: {s.email:35} | Reg: {s.registration_number}")
