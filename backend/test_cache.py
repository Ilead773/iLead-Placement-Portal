# test_cache.py
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.cache import cache
try:
    print("Writing to cache...")
    cache.set('test_live_key', 'it works!', 30)
    print("Reading from cache...")
    val = cache.get('test_live_key')
    print("Value:", val)
except Exception as e:
    import traceback
    traceback.print_exc()
