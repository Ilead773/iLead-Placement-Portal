import os, django

os.environ['DATABASE_URL'] = 'postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres'
os.environ['SECRET_KEY'] = 'yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP'
os.environ['DEBUG'] = 'False'
os.environ['ALLOWED_HOSTS'] = 'ilead-backend-production-20f7.up.railway.app'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student

# Fetch the test student
student = Student.objects.get(registration_number='TESTBBA9999')

# Change a field slightly and save to update student.updated_at timestamp
student.name = "Test BBA Student Active"
student.save()

print(f"Test student updated_at has been updated to: {student.updated_at}")
print("This will force the Redis cache key to change and bypass cached values.")
