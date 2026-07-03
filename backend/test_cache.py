# test_cache.py
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from django.core.files.storage import default_storage
from apps.resumes.models import BuiltResume

print("STORAGE BACKEND CONFIG:", getattr(settings, 'STORAGE_BACKEND', 'None'))
print("DEFAULT STORAGE CLASS:", default_storage.__class__.__name__)

try:
    resume = BuiltResume.objects.get(id='420221ed-518f-4ee0-8a81-6befda0f4256')
    print("Resume PDF Name in DB:", resume.generated_pdf.name)
    print("Resume PDF URL in DB:", resume.generated_pdf.url)
except Exception as e:
    print("Could not fetch resume:", e)
