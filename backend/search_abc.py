import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

print("=== SEARCHING DATABASE FOR 'abc' OR 'contact@ilead.net.in' ===")

# Search by name exact or containing 'abc'
by_name = User.objects.filter(name__icontains='abc')
print(f"1. Students containing 'abc' in name ({by_name.count()} found):")
for u in by_name:
    print(f"   Name: {u.name} | Email: {u.email} | Role: {u.role}")

# Search by email exact or containing 'ilead.net.in'
by_email = User.objects.filter(email__icontains='ilead.net.in')
print(f"\n2. Users containing 'ilead.net.in' in email ({by_email.count()} found):")
for u in by_email:
    print(f"   Name: {u.name} | Email: {u.email} | Role: {u.role}")

print("=== SEARCH COMPLETE ===")
