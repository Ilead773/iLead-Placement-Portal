# config/asgi.py
import os
from django.core.asgi import get_asgi_application

try:
    import dotenv
    dotenv.load_dotenv()
except ImportError:
    pass

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
application = get_asgi_application()
