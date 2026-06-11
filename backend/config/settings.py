import os
from pathlib import Path
from datetime import timedelta
try:
    import dj_database_url
except ImportError:
    dj_database_url = None

BASE_DIR = Path(__file__).resolve().parent.parent

try:
    import dotenv
    env_path = os.path.join(BASE_DIR, '.env')
    dotenv.load_dotenv(env_path)
except ImportError:
    pass

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-development-key-12345')

DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = [host.strip() for host in os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1,0.0.0.0').split(',') if host.strip()]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # 3rd Party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    
    # Local — existing
    'core',
    
    # Resume Engine — domain-driven apps (Layer 15)
    'apps.common',
    'apps.profiles',
    'apps.resumes',
    'apps.templates_engine',
    'apps.auditing',
    'apps.resume_engine',
    'apps.observability',
    'apps.jobs',
    'apps.applications',
    'apps.scraped_jobs',
    'apps.interviews',
    'apps.career_os',
    'django_celery_beat',
    'job_scraper',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.middleware.ForcePasswordChangeMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database - SQLite for local dev, Postgres in Render via DATABASE_URL
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL and dj_database_url:
    ssl_require = 'postgres' in DATABASE_URL or 'postgresql' in DATABASE_URL
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600, ssl_require=ssl_require),
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Session Security (30 Minute Timeout)
SESSION_COOKIE_AGE = 1800  # 30 minutes
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_SAVE_EVERY_REQUEST = True

# Cookie Policies
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── Resume Engine: Storage Backend (Layer 4 + 13) ──────────────
STORAGE_BACKEND = os.environ.get('STORAGE_BACKEND', 'local')  # 'local' or 's3'

# AWS S3 (if STORAGE_BACKEND='s3')
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME', '')
AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')
AWS_S3_CUSTOM_DOMAIN = os.environ.get('AWS_S3_CUSTOM_DOMAIN', '')

AUTH_USER_MODEL = 'core.User'

# REST Framework Config
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    # Layer 12: Rate Limiting
    'DEFAULT_THROTTLE_RATES': {
        'resume_generation': '10/hour',
        'resume_upload': '5/hour',
        'resume_download': '30/hour',
    },
}

# JWT Config
SIMPLE_JWT = {
    # Increased to 600 minutes (10 hours) for temporary testing convenience
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=600),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# CORS Config
# Keep local development permissive by default, while staying strict in production.
CORS_ALLOW_ALL_ORIGINS = os.environ.get(
    'CORS_ALLOW_ALL_ORIGINS',
    'True' if DEBUG else 'False'
) == 'True'
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
    if origin.strip()
]

# Email Configuration
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'core.email_backends.ResendEmailBackend')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'onboarding@resend.dev')

# Resend test mode: when True, ALL emails are redirected to RESEND_TEST_REDIRECT_EMAIL.
# Use this when your Resend account has no verified domain (free/testing tier).
# Set to False once you have a verified domain on resend.com/domains.
RESEND_TEST_MODE = os.environ.get('RESEND_TEST_MODE', 'True') == 'True'
RESEND_TEST_REDIRECT_EMAIL = os.environ.get('RESEND_TEST_REDIRECT_EMAIL', '')

# Frontend URL for password reset links
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# Force SSL in production
if not DEBUG:
    # Respect HTTPS forwarding headers from reverse proxies (Railway/Render).
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    USE_X_FORWARDED_HOST = True
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# Password Reset Expiration (in seconds) - 1 Hour
PASSWORD_RESET_TIMEOUT = 3600

# Brute Force Protection Settings
LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5
LOGIN_RATE_LIMIT_LOCKOUT_MINUTES = 1

# ─── Resume Engine: Celery / Async (Layer 2) ────────────────────
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0'))
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0'))
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_ROUTES = {
    'apps.applications.tasks.send_job_alert_task': {'queue': 'notifications'},
    'apps.applications.tasks.send_notification_email': {'queue': 'notifications'},
    'core.tasks.async_send_mail': {'queue': 'notifications'},
}
# Cache backend (used by rate limiting + scraper query caching)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        # For production with Redis:
        # 'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        # 'LOCATION': 'redis://localhost:6379/1',
    }
}

# ─── OneSignal Configuration ──────────────────────────────────────
ONESIGNAL_APP_ID = os.environ.get('ONESIGNAL_APP_ID', '97a17b7a-8d2b-4daf-bba5-a0b16d31a1bb')
ONESIGNAL_REST_API_KEY = os.environ.get('ONESIGNAL_REST_API_KEY', '')

# ─── Scraped Jobs: External API Keys ─────────────────────────────
JSEARCH_API_KEY = os.environ.get('JSEARCH_API_KEY', '')
APIFY_API_TOKEN = os.environ.get('APIFY_API_TOKEN', '')
ADZUNA_APP_ID = os.environ.get('ADZUNA_APP_ID', '')

ADZUNA_APP_KEY = os.environ.get('ADZUNA_APP_KEY', '')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'shahithu2004@gmail.com')
MAX_JOBS_AGE_HOURS = 48
JOBS_ARCHIVE_DAYS = 90
JOBS_PER_COURSE_TARGET = 25

# Centralized scraper timeouts (seconds)
SCRAPER_TIMEOUTS = {
    'jsearch': 15,
    'adzuna': 15,
    'greenhouse': 10,
    'lever': 10,
    'default': 12,
}

# ─── Resume Engine: Structured Logging (Layer 14) ───────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {message}',
            'style': '{',
        },
        'json': {
            'format': '{asctime} {levelname} {name} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.resumes': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'apps.resume_engine': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'apps.scraped_jobs': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
