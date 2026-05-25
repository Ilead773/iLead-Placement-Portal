# config/wsgi.py
import os
from django.core.wsgi import get_wsgi_application

try:
    import dotenv
    dotenv.load_dotenv()
except ImportError:
    pass

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
application = get_wsgi_application()
