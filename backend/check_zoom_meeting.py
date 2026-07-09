import os
import django
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.north_star.services import ZoomService

zoom_service = ZoomService()
meeting_id = "82337090452"

print(f"=== DIAGNOSING ZOOM MEETING: {meeting_id} ===")
token = zoom_service.get_access_token()

# Get Participant Report
url = f"https://api.zoom.us/v2/report/meetings/{meeting_id}/participants"
headers = {'Authorization': f'Bearer {token}'}
response = requests.get(url, headers=headers, timeout=10)
print(f"GET /report/meetings/{meeting_id}/participants status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    participants = data.get('participants', [])
    print(f"Found {len(participants)} participants in report:")
    for p in participants:
        print(f"  - Email: {p.get('user_email')}")
        print(f"    Name: {p.get('name')}")
        print(f"    Join Time: {p.get('join_time')}")
        print(f"    Leave Time: {p.get('leave_time')}")
        print(f"    Duration: {p.get('duration')}s")
else:
    print(f"Error Response: {response.text}")
print("=== DIAGNOSIS COMPLETE ===")
