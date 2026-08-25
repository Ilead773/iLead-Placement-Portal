import os, django
from django.db.models import Q
from django.utils import timezone

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
os.environ['SECRET_KEY'] = "yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP"
os.environ['DEBUG'] = "False"
os.environ['ALLOWED_HOSTS'] = "ilead-backend-production-20f7.up.railway.app"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, SentEmailLog

print("=== PARTIAL MATCH SEARCHES ===")

# Search 1: Khusnama
q1 = Student.objects.filter(Q(name__icontains="Khusnama") | Q(email__icontains="khusnama") | Q(name__icontains="Khus"))
print(f"\nKhusnama searches (Found {q1.count()}):")
for s in q1:
    print(f"  - Name: {s.name} | Email: {s.email} | Reg: {s.registration_number}")

# Search 2: Debarshi / Debashi
q2 = Student.objects.filter(Q(name__icontains="Debar") | Q(name__icontains="Debas") | Q(email__icontains="debashi") | Q(email__icontains="debarshi"))
print(f"\nDebarshi searches (Found {q2.count()}):")
for s in q2[:10]:
    print(f"  - Name: {s.name} | Email: {s.email} | Reg: {s.registration_number}")

# Search 3: Sudipto Mondal
q3 = Student.objects.filter(name__icontains="Mondal")
print(f"\nMondal searches containing Sudipto (Found {q3.filter(name__icontains='Sudipto').count()}):")
for s in q3.filter(name__icontains="Sudipto"):
    print(f"  - Name: {s.name} | Email: {s.email} | Reg: {s.registration_number}")
