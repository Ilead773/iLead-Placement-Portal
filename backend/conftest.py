from core.tests.conftest import *
import pytest
from unittest.mock import patch

@pytest.fixture(autouse=True)
def disable_rate_limits():
    with patch('rest_framework.throttling.SimpleRateThrottle.allow_request', return_value=True):
        yield

