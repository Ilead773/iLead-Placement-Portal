import os
import django
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.north_star.services import ZoomService

zoom_service = ZoomService()
meeting_id = "84305064286"

print(f"=== DIAGNOSING ZOOM MEETING: {meeting_id} ===")

# 1. Test S2S OAuth token
try:
    token = zoom_service.get_access_token()
    print(f"1. OAuth Access Token: SUCCESS (length {len(token)})")
except Exception as e:
    print(f"1. OAuth Access Token: FAILED - {e}")
    exit(1)

# 2. Get Meeting Details
try:
    url = f"https://api.zoom.us/v2/meetings/{meeting_id}"
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(url, headers=headers, timeout=10)
    print(f"2. GET /meetings/{meeting_id} status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   Topic: {data.get('topic')}")
        print(f"   Status: {data.get('status')}")
        print(f"   Start Time: {data.get('start_time')}")
        print(f"   Duration: {data.get('duration')} mins")
    else:
        print(f"   Error: {response.text}")
except Exception as e:
    print(f"2. GET /meetings/{meeting_id} failed: {e}")

# 3. Get Participant Report
try:
    url = f"https://api.zoom.us/v2/report/meetings/{meeting_id}/participants"
    response = requests.get(url, headers=headers, timeout=10)
    print(f"3. GET /report/meetings/{meeting_id}/participants status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        participants = data.get('participants', [])
        print(f"   Found {len(participants)} participants in report:")
        for p in participants:
            print(f"     - Email: {p.get('user_email')} | Name: {p.get('name')} | Duration: {p.get('duration')}s")
    else:
        print(f"   Error Response: {response.text}")
except Exception as e:
    print(f"3. GET /report/meetings/{meeting_id}/participants failed: {e}")

print("=== DIAGNOSIS COMPLETE ===")
