import os, django

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
os.environ['SECRET_KEY'] = "yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP"
os.environ['DEBUG'] = "False"
os.environ['ALLOWED_HOSTS'] = "ilead-backend-production-20f7.up.railway.app"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, SentEmailLog

total_students = Student.objects.count()
print(f"Total students in database: {total_students}")

# Count students who have never logged in
never_logged_in = Student.objects.filter(user__last_login__isnull=True).count()
print(f"Students who never logged in: {never_logged_in}")

# Count students who have received a Welcome Email (all time)
sent_emails = SentEmailLog.objects.filter(subject__icontains='Welcome')
sent_recipients = set(sent_emails.values_list('recipient', flat=True))

students_with_welcome = Student.objects.filter(email__in=sent_recipients).count()
print(f"Students in DB who have a Welcome Email log: {students_with_welcome}")

students_without_welcome = Student.objects.exclude(email__in=sent_recipients)
print(f"Students in DB who DO NOT have a Welcome Email log: {students_without_welcome.count()}")

# Print first 10 students who don't have a welcome email log
print("\nFirst 10 students without a Welcome Email log in DB:")
for s in students_without_welcome[:10]:
    print(f"  - Name: {s.name:25} | Email: {s.email:30} | Reg: {s.registration_number}")
