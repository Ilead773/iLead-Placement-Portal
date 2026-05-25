import os
import sys
from pathlib import Path

# Add backend to sys.path
backend_path = Path(r'c:\Users\shahi\OneDrive\Documents\iLEAD_Placement_portal\backend')
sys.path.append(str(backend_path))

try:
    import dotenv
    dotenv.load_dotenv(backend_path / '.env')
    print("Dotenv loaded")
except ImportError:
    print("Dotenv not found")

print(f"JSEARCH_API_KEY from env: {os.environ.get('JSEARCH_API_KEY')}")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.conf import settings
print(f"JSEARCH_API_KEY from settings: {settings.JSEARCH_API_KEY}")
