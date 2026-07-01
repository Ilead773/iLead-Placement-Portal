import pytest
import os
import time
import hmac
import hashlib
from unittest.mock import patch, MagicMock
from django.utils import timezone
from datetime import timedelta
from apps.north_star.services import ZoomService

@patch.dict(os.environ, {
    'ZOOM_ACCOUNT_ID': 'acc123',
    'ZOOM_CLIENT_ID': 'client123',
    'ZOOM_CLIENT_SECRET': 'secret123',
    'ZOOM_SDK_KEY': 'sdk123',
    'ZOOM_SDK_SECRET': 'sdk_secret123',
    'ZOOM_WEBHOOK_SECRET_TOKEN': 'webhook123'
})
def test_sdk_signature_generation():
    service = ZoomService()
    signature = service.generate_sdk_signature("123456789", role=0)
    assert isinstance(signature, str)
    assert len(signature) > 0

@patch.dict(os.environ, {
    'ZOOM_ACCOUNT_ID': 'acc123',
    'ZOOM_CLIENT_ID': 'client123',
    'ZOOM_CLIENT_SECRET': 'secret123',
    'ZOOM_SDK_KEY': 'sdk123',
    'ZOOM_SDK_SECRET': 'sdk_secret123',
    'ZOOM_WEBHOOK_SECRET_TOKEN': 'webhook123'
})
@patch('requests.post')
def test_oauth_token_fetch(mock_post):
    # Mock requests response
    mock_response = MagicMock()
    mock_response.json.return_value = {'access_token': 'test_oauth_token_val'}
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

    service = ZoomService()
    token = service.get_access_token()
    assert token == 'test_oauth_token_val'
    mock_post.assert_called_once()

@patch.dict(os.environ, {
    'ZOOM_ACCOUNT_ID': 'acc123',
    'ZOOM_CLIENT_ID': 'client123',
    'ZOOM_CLIENT_SECRET': 'secret123',
    'ZOOM_SDK_KEY': 'sdk123',
    'ZOOM_SDK_SECRET': 'sdk_secret123',
    'ZOOM_WEBHOOK_SECRET_TOKEN': 'webhook123'
})
@patch('requests.post')
def test_create_meeting(mock_post):
    # Mock S2S token call and create meeting call
    mock_response = MagicMock()
    mock_response.json.side_effect = [
        {'access_token': 'token123'},
        {'id': 123456789, 'join_url': 'http://join.com', 'start_url': 'http://start.com'}
    ]
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

    service = ZoomService()
    start_time = timezone.now()
    meeting = service.create_meeting("Class Test", start_time, 60, "host@example.com")
    
    assert meeting['zoom_meeting_id'] == '123456789'
    assert meeting['zoom_join_url'] == 'http://join.com'
    assert meeting['zoom_start_url'] == 'http://start.com'

@patch.dict(os.environ, {
    'ZOOM_ACCOUNT_ID': 'acc123',
    'ZOOM_CLIENT_ID': 'client123',
    'ZOOM_CLIENT_SECRET': 'secret123',
    'ZOOM_SDK_KEY': 'sdk123',
    'ZOOM_SDK_SECRET': 'sdk_secret123',
    'ZOOM_WEBHOOK_SECRET_TOKEN': 'webhook123'
})
def test_verify_webhook_signature():
    service = ZoomService()
    
    # Simulate a request object
    request = MagicMock()
    timestamp = str(int(time.time()))
    body = b'{"event":"meeting.participant_joined"}'
    
    message = f"v0:{timestamp}:".encode('utf-8') + body
    computed = hmac.new(b'webhook123', message, hashlib.sha256).hexdigest()
    
    request.headers = {
        'x-zm-signature': f"v0={computed}",
        'x-zm-request-timestamp': timestamp
    }
    request.body = body
    
    assert service.verify_webhook_signature(request) is True
