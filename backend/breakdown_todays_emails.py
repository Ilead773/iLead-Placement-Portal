import requests
from collections import Counter

import os
API_KEY = os.environ.get("BREVO_API_KEY", "your-api-key-here")
HEADERS = {"api-key": API_KEY, "accept": "application/json"}
BASE = "https://api.brevo.com/v3"

# Pull all events today
all_events = []
offset = 0
limit = 100
while True:
    r = requests.get(f"{BASE}/smtp/statistics/events", headers=HEADERS, params={
        "startDate": "2026-08-23", "endDate": "2026-08-23",
        "limit": limit, "offset": offset, "sort": "asc"
    }, timeout=15)
    events = r.json().get('events', [])
    if not events:
        break
    all_events.extend(events)
    offset += limit
    if len(events) < limit:
        break

req_events = [e for e in all_events if e.get('event') == 'requests']
print(f"Total Requests Received by Brevo Today: {len(req_events)}")

# Group by Subject for Requests
subject_counter = Counter(e.get('subject', '') for e in req_events)
print("\n=== REQUESTS BY SUBJECT ===")
for subj, count in subject_counter.items():
    print(f"  - Subject: '{subj}' | Count: {count}")

# Group by Recipient for Welcome Emails
welcome_recipients = [e.get('email') for e in req_events if 'Welcome' in e.get('subject', '')]
print(f"\nWelcome Emails sent today to {len(welcome_recipients)} students:")
for i, email in enumerate(welcome_recipients, 1):
    print(f"  {i:3}. {email}")

# Group by Recipient for Password Resets
reset_recipients = [e.get('email') for e in req_events if 'Password' in e.get('subject', '')]
print(f"\nPassword Resets sent today to {len(reset_recipients)} students:")
# Group by recipient and count occurrences
reset_counter = Counter(reset_recipients)
for email, count in reset_counter.items():
    print(f"  - {email:40} | Count: {count}")
