import os
import time
import hmac
import hashlib
import requests
import logging
from datetime import datetime
from django.conf import settings
import jwt

logger = logging.getLogger(__name__)

class ZoomService:
    """
    Server-to-Server OAuth for meeting creation, 
    SDK JWT signature generation for embedded client join,
    and webhook signature verification.
    """
    
    def __init__(self):
        self.account_id = os.environ.get('ZOOM_ACCOUNT_ID')
        self.client_id = os.environ.get('ZOOM_CLIENT_ID')
        self.client_secret = os.environ.get('ZOOM_CLIENT_SECRET')
        self.sdk_key = os.environ.get('ZOOM_SDK_KEY')
        self.sdk_secret = os.environ.get('ZOOM_SDK_SECRET')
        self.webhook_secret = os.environ.get('ZOOM_WEBHOOK_SECRET_TOKEN')

    def get_access_token(self) -> str:
        """
        Retrieves a Server-to-Server OAuth token with retries.
        """
        if not all([self.account_id, self.client_id, self.client_secret]):
            logger.error("Missing Zoom credentials in environment variables.")
            raise ValueError("Zoom S2S OAuth credentials are not fully configured.")
            
        url = f"https://zoom.us/oauth/token?grant_type=account_credentials&account_id={self.account_id}"
        
        max_retries = 3
        backoff = 1
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    url,
                    auth=(self.client_id, self.client_secret),
                    timeout=10
                )
                response.raise_for_status()
                data = response.json()
                return data.get('access_token')
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"Failed to fetch Zoom S2S access token after {max_retries} attempts: {e}")
                    raise RuntimeError(f"Zoom OAuth token fetch failed: {e}")
                logger.warning(f"Zoom token fetch attempt {attempt + 1} failed: {e}. Retrying in {backoff}s...")
                time.sleep(backoff)
                backoff *= 2

    def create_meeting(self, topic: str, start_time: datetime, duration_minutes: int, host_email: str) -> dict:
        """
        POST /users/{host_email}/meetings - creates a meeting and returns id, join_url, start_url.
        """
        token = self.get_access_token()
        url = f"https://api.zoom.us/v2/users/{host_email}/meetings"
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        # Formatted start_time in UTC format e.g. "2026-06-13T12:00:00Z"
        start_time_iso = start_time.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        payload = {
            "topic": topic,
            "type": 2,  # Scheduled meeting
            "start_time": start_time_iso,
            "duration": duration_minutes,
            "timezone": "UTC",
            "settings": {
                "join_before_host": False,
                "mute_upon_entry": True,
                "waiting_room": False,
                "jbh_time": 0
            }
        }
        
        # Try creating the meeting. If the host_email doesn't exist on this Zoom account (404),
        # we automatically fall back to 'me' (the account owner) to ensure the meeting is created successfully.
        max_retries = 3
        backoff = 1
        current_host = host_email
        
        for attempt in range(max_retries):
            current_url = f"https://api.zoom.us/v2/users/{current_host}/meetings"
            try:
                response = requests.post(current_url, headers=headers, json=payload, timeout=10)
                
                # Check for 404 User Not Found
                if response.status_code == 404 and current_host != 'me':
                    logger.warning(f"Zoom host {current_host} not found (404). Falling back to 'me'.")
                    current_host = 'me'
                    # Retry immediately with 'me' without incrementing attempt
                    continue
                    
                response.raise_for_status()
                data = response.json()
                
                return {
                    'zoom_meeting_id': str(data.get('id')),
                    'zoom_join_url': data.get('join_url', ''),
                    'zoom_start_url': data.get('start_url', '')
                }
            except Exception as e:
                # If we get a 404 and haven't tried 'me' yet, try falling back
                if isinstance(e, requests.HTTPError) and e.response.status_code == 404 and current_host != 'me':
                    logger.warning(f"Zoom meeting creation failed with 404 for {current_host}. Retrying with 'me'...")
                    current_host = 'me'
                    continue
                    
                if attempt == max_retries - 1:
                    logger.error(f"Failed to create Zoom meeting for host {current_host} after {max_retries} attempts: {e}")
                    # Fallback mock data in development if environment is not fully configured, 
                    # but in production raise the error.
                    if settings.DEBUG:
                        logger.warning("Falling back to simulated Zoom meeting ID for development/testing.")
                        simulated_id = str(int(time.time()))
                        return {
                            'zoom_meeting_id': simulated_id,
                            'zoom_join_url': f"https://zoom.us/j/{simulated_id}",
                            'zoom_start_url': f"https://zoom.us/s/{simulated_id}"
                        }
                    raise RuntimeError(f"Zoom meeting creation failed: {e}")
                logger.warning(f"Zoom meeting creation attempt {attempt + 1} failed: {e}. Retrying in {backoff}s...")
                time.sleep(backoff)
                backoff *= 2

    def get_sdk_key(self) -> str:
        """
        Returns the SDK Key (or Client ID) to use, with fallback for development.
        """
        key = self.sdk_key or self.client_id
        if not key and settings.DEBUG:
            return 'mock_sdk_key_for_dev'
        return key

    def generate_sdk_signature(self, meeting_number: str, role: int) -> str:
        """
        Generates SDK JWT signature for joining via the embedded Web SDK.
        role=0 for attendee, role=1 for host.
        """
        # FIX: strip spaces — Zoom SDK requires a plain numeric string (e.g. "84651234567")
        meeting_number = str(meeting_number).replace(' ', '').strip()

        # Guard: detect simulated/fake meeting IDs (10-digit Unix timestamps) created by
        # the DEBUG fallback in create_meeting(). These look like e.g. "1751234567".
        # Attempting to join a fake meeting will succeed at signature level but fail in
        # the browser SDK (black screen / white box). Log a clear warning.
        if len(meeting_number) == 10 and meeting_number.isdigit():
            logger.warning(
                f"[Zoom] generate_sdk_signature called with a likely SIMULATED meeting ID: {meeting_number}. "
                "This was probably created by the DEBUG fallback in create_meeting(). "
                "The embedded SDK will fail to join a meeting that doesn't exist on Zoom's servers. "
                "Please reschedule the class to generate a real Zoom meeting ID."
            )

        key = self.sdk_key or self.client_id
        secret = self.sdk_secret or self.client_secret

        if not key or not secret:
            if settings.DEBUG:
                logger.warning("Missing Zoom SDK credentials. Using simulated keys for development signature generation.")
                key = 'mock_sdk_key_for_dev'
                secret = 'mock_sdk_secret_for_dev'
            else:
                logger.error("Missing Zoom SDK credentials (key/secret or client_id/secret).")
                raise ValueError("Zoom Web SDK credentials not configured.")

        iat = int(time.time()) - 30
        exp = iat + 7200  # Token valid for 2 hours
        
        payload = {
            'appKey': key,
            'sdkKey': key,
            'mn': meeting_number,
            'role': int(role),
            'iat': iat,
            'exp': exp,
            'tokenExp': exp
        }
        
        headers = {
            'alg': 'HS256',
            'typ': 'JWT'
        }
        
        token = jwt.encode(payload, secret, algorithm='HS256', headers=headers)
        # Ensure we return a string (in PyJWT 2.0+ it returns string, older versions might return bytes)
        if isinstance(token, bytes):
            return token.decode('utf-8')
        return token

    def verify_webhook_signature(self, request, raw_body: bytes = b'') -> bool:
        """
        Verifies the Zoom webhook payload signature using ZOOM_WEBHOOK_SECRET_TOKEN.
        HMAC-SHA256 over (v0:x-zm-request-timestamp:request_body).

        raw_body must be passed in from the view BEFORE request.data is accessed,
        because DRF consumes the input stream when it parses request.data, making
        request.body inaccessible afterwards (RawPostDataException).
        """
        if not raw_body and hasattr(request, 'body'):
            try:
                raw_body = request.body
            except Exception:
                raw_body = b''

        if not self.webhook_secret:
            logger.warning("ZOOM_WEBHOOK_SECRET_TOKEN is not configured. Webhook verification skipped.")
            return False
            
        zm_signature = request.headers.get('x-zm-signature')
        zm_timestamp = request.headers.get('x-zm-request-timestamp')
        
        if not zm_signature or not zm_timestamp:
            logger.warning("Zoom signature headers missing.")
            return False
            
        # Check for replay attacks: timestamp should be within last 5 minutes
        try:
            request_time = int(zm_timestamp)
            if abs(int(time.time()) - request_time) > 300:
                logger.warning(f"Zoom webhook expired: timestamp {zm_timestamp} is outside the 5-min threshold.")
                return False
        except ValueError:
            logger.warning(f"Invalid timestamp header format: {zm_timestamp}")
            return False

        # Format message: v0:timestamp:body
        message = f"v0:{zm_timestamp}:".encode('utf-8') + raw_body
        
        # Calculate signature
        computed_signature = hmac.new(
            self.webhook_secret.encode('utf-8'),
            message,
            hashlib.sha256
        ).hexdigest()
        
        expected_signature = f"v0={computed_signature}"
        
        # Verify
        if not hmac.compare_digest(expected_signature, zm_signature):
            logger.warning("Zoom webhook signature mismatch.")
            return False
            
        return True

    def _is_simulated(self, meeting_id: str) -> bool:
        """
        Helper to check if a meeting ID is simulated/offline (dev mode fallback).
        Simulated IDs are usually 10-digit Unix timestamps.
        """
        meeting_id = str(meeting_id).replace(' ', '').strip()
        return len(meeting_id) == 10 and meeting_id.isdigit() and settings.DEBUG

    def get_meeting(self, meeting_id: str) -> dict:
        """
        GET /meetings/{meetingId} - Retrieves meeting details from Zoom.
        """
        if self._is_simulated(meeting_id):
            logger.info(f"Simulating Zoom get_meeting for ID {meeting_id}")
            return {
                'id': int(meeting_id),
                'topic': 'Simulated Meeting',
                'start_time': timezone.now().strftime('%Y-%m-%dT%H:%M:%SZ') if hasattr(timezone, 'now') else datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
                'duration': 60,
                'join_url': f"https://zoom.us/j/{meeting_id}",
                'start_url': f"https://zoom.us/s/{meeting_id}"
            }

        token = self.get_access_token()
        url = f"https://api.zoom.us/v2/meetings/{meeting_id}"
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()

    def update_meeting(self, meeting_id: str, topic: str, start_time: datetime, duration_minutes: int) -> bool:
        """
        PATCH /meetings/{meetingId} - Updates meeting details on Zoom.
        """
        if self._is_simulated(meeting_id):
            logger.info(f"Simulating Zoom update_meeting for ID {meeting_id}")
            return True

        token = self.get_access_token()
        url = f"https://api.zoom.us/v2/meetings/{meeting_id}"
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        start_time_iso = start_time.strftime('%Y-%m-%dT%H:%M:%SZ')
        payload = {
            "topic": topic,
            "start_time": start_time_iso,
            "duration": duration_minutes
        }
        
        response = requests.patch(url, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        return response.status_code == 204

    def delete_meeting(self, meeting_id: str) -> bool:
        """
        DELETE /meetings/{meetingId} - Deletes/cancels meeting on Zoom.
        """
        if self._is_simulated(meeting_id):
            logger.info(f"Simulating Zoom delete_meeting for ID {meeting_id}")
            return True

        token = self.get_access_token()
        url = f"https://api.zoom.us/v2/meetings/{meeting_id}"
        headers = {
            'Authorization': f'Bearer {token}'
        }
        
        try:
            response = requests.delete(url, headers=headers, timeout=10)
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            err_msg = e.response.text if e.response is not None else str(e)
            logger.error(f"Zoom delete_meeting failed for meeting {meeting_id}: {err_msg}")
            raise
        return response.status_code == 204

    def get_participant_report(self, meeting_id: str) -> list:
        """
        GET /report/meetings/{meetingId}/participants - Retrieves the participant report.
        Handles pagination and returns a combined list of participant dicts.
        """
        if self._is_simulated(meeting_id):
            logger.info(f"Simulating Zoom get_participant_report for ID {meeting_id}")
            # Return an empty list so finalization falls back to local webhook-logged events
            return []

        token = self.get_access_token()
        url = f"https://api.zoom.us/v2/report/meetings/{meeting_id}/participants"
        params = {'page_size': 300}
        participants = []

        while True:
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            participants.extend(data.get('participants', []))
            
            next_page_token = data.get('next_page_token')
            if not next_page_token:
                break
            params['next_page_token'] = next_page_token
            
        return participants

    def get_user_zak_token(self, host_email: str) -> str:
        """
        GET /users/{userId}/token?type=zak - retrieves a fresh ZAK token for the user.
        """
        token = self.get_access_token()
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        params = {'type': 'zak'}
        
        try:
            url = f"https://api.zoom.us/v2/users/{host_email}/token"
            response = requests.get(url, headers=headers, params=params, timeout=10)
            if response.status_code == 200:
                return response.json().get('token', '')
            else:
                logger.warning(f"Zoom ZAK token returned {response.status_code} for {host_email}. Falling back to 'me'...")
        except Exception as e:
            logger.warning(f"Failed to fetch Zoom ZAK token for host {host_email}: {e}. Trying fallback to 'me'...")

        try:
            url = "https://api.zoom.us/v2/users/me/token"
            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            return response.json().get('token', '')
        except Exception as e:
            logger.error(f"Failed to fetch Zoom ZAK token for 'me': {e}")
            return ''
