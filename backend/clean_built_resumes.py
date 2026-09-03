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

from apps.resumes.models import BuiltResume
from apps.resume_engine.renderer import ResumeRenderer
from apps.resumes.tasks import generate_resume_pdf

print("=== RE-CLEANING ALL ACTIVE BUILT RESUMES IN DATABASE ===")
resumes = BuiltResume.objects.all()
renderer = ResumeRenderer()

for br in resumes:
    if br.canonical_json and br.template:
        print(f"Re-rendering resume: {br.title} (ID: {br.id}) for student {br.student.name}")
        clean_html = renderer.render_html(br.canonical_json, br.template)
        br.custom_html = clean_html
        br.state = 'draft'
        br.save()
        generate_resume_pdf(str(br.id), str(br.template_id))

print("All active built resumes re-rendered and updated!")
