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
from apps.resumes.models import BuiltResume
from apps.resume_engine.renderer import ResumeRenderer
from deploy_ilead_resume import deploy

print("=== 1. DEPLOYING MASTER TEMPLATE WITH PROJECTS SECTION ===")
deploy()

print("\n=== 2. RE-RENDERING ALL BUILT RESUMES IN PRODUCTION DB ===")
renderer = ResumeRenderer()
active_template = ResumeTemplate.objects.filter(is_active=True).first()

resumes = BuiltResume.objects.all()
print(f"Found {resumes.count()} BuiltResumes in production database.")

for br in resumes:
    if br.canonical_json:
        br.template = active_template
        clean_html = renderer.render_html(br.canonical_json, active_template)
        br.custom_html = clean_html
        br.state = 'draft'
        br.save()
        print(f"  - Re-rendered resume '{br.title}' (ID: {br.id}) for student '{br.student.name}'")

print("\n=== 3. PRODUCTION DB RESUMES SUCCESSFULLY UPDATED ===")
