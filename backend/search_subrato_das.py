import os, django

os.environ['DATABASE_URL'] = 'postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres'
os.environ['SECRET_KEY'] = 'yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP'
os.environ['DEBUG'] = 'False'
os.environ['ALLOWED_HOSTS'] = 'ilead-backend-production-20f7.up.railway.app'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student

print("=== SEARCHING FOR 'SUBRATO DAS' ===")

# Try various spelling variations (Subrato, Subroto, Das)
query_variations = ["Subrato", "Subroto", "Subrata"]

for q in query_variations:
    res = Student.objects.filter(name__icontains=q)
    print(f"\nSearch for '{q}': found {res.count()} matches.")
    for s in res:
        print(f"  Name: {s.name} | Reg No: {s.registration_number} | Course: {s.course} | Sem: {s.semester}")

# Search for Das
das_res = Student.objects.filter(name__icontains="Das")
print(f"\nTotal students containing 'Das': {das_res.count()}")
print("First 15 'Das' students:")
for s in das_res[:15]:
    print(f"  Name: {s.name} | Reg No: {s.registration_number} | Course: {s.course} | Sem: {s.semester}")
