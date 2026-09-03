import os
import sys
import django

sys.stdout.reconfigure(encoding='utf-8')

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
os.environ['SECRET_KEY'] = "yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP"
os.environ['DEBUG'] = "False"
os.environ['ALLOWED_HOSTS'] = "ilead-backend-production-20f7.up.railway.app"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.templates_engine.models import ResumeTemplate

templates = ResumeTemplate.objects.filter(is_active=True)
for t in templates:
    print(f"=== TEMPLATE: {t.name} (ID: {t.id}) ===")
    print("--- HTML TEMPLATE SECTION AROUND SKILLS ---")
    lines = t.html_template.splitlines()
    for idx, line in enumerate(lines):
        if 'skills' in line.lower() or 'skill_group' in line.lower():
            start = max(0, idx - 3)
            end = min(len(lines), idx + 10)
            print(f"Around line {idx}:")
            for j in range(start, end):
                print(f"  {j}: {lines[j]}")
            print("="*40)
