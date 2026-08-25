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

print("=== DEEP SEARCH FOR MISSING ===")

# 1. Search Sudipto
sudiptos = Student.objects.filter(name__icontains="Sudipto")
print(f"\nSudipto matches ({sudiptos.count()}):")
for s in sudiptos:
    print(f"  - {s.name} | {s.email} | {s.registration_number}")

# 2. Search Paul / debashi
pauls = Student.objects.filter(Q(name__icontains="Paul") | Q(email__icontains="paul") | Q(email__icontains="debashi"))
print(f"\nPaul matches ({pauls.count()}):")
for s in pauls[:15]:
    print(f"  - {s.name} | {s.email} | {s.registration_number}")

# 3. Check Khushnama Khatoon
khush = Student.objects.filter(email="khushnamakhatoon74@gmail.com")
if khush.exists():
    s = khush.first()
    w_logs = SentEmailLog.objects.filter(recipient=s.email, subject__icontains="Welcome")
    print(f"\nKhushnama Welcome Email logs ({w_logs.count()}):")
    for log in w_logs:
        print(f"  - Sent at: {timezone.localtime(log.sent_at)}")
