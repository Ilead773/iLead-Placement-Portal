import os
import django
import requests
import traceback
from datetime import datetime
from django.utils import timezone

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.north_star.services import ZoomService
zoom_service = ZoomService()
meeting_id = "82337090452"

token = zoom_service.get_access_token()
url = f"https://api.zoom.us/v2/report/meetings/{meeting_id}/participants"
headers = {'Authorization': f'Bearer {token}'}
response = requests.get(url, headers=headers, timeout=10)
data = response.json()

for p in data.get('participants', []):
    join_time_str = p.get('join_time')
    print(f"Testing join_time_str: '{join_time_str}'")
    try:
        join_time = datetime.strptime(join_time_str, '%Y-%m-%dT%H:%M:%SZ')
        print(f"  Parsed successfully: {join_time}")
    except Exception as e:
        print(f"  PARSE FAILED: {e}")
        traceback.print_exc()
