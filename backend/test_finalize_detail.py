import os
import django
import requests
from datetime import datetime
from django.utils import timezone

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
    leave_time_str = p.get('leave_time')
    
    print(f"Testing join: '{join_time_str}' | leave: '{leave_time_str}'")
    
    try:
        join_time = datetime.strptime(join_time_str, '%Y-%m-%dT%H:%M:%SZ')
        join_time = timezone.make_aware(join_time, timezone.utc)
        print("  Join parsed successfully:", join_time)
    except Exception as e:
        print("  Join parse failed:", e)
        
    try:
        leave_time = datetime.strptime(leave_time_str, '%Y-%m-%dT%H:%M:%SZ')
        leave_time = timezone.make_aware(leave_time, timezone.utc)
        print("  Leave parsed successfully:", leave_time)
    except Exception as e:
        print("  Leave parse failed:", e)
