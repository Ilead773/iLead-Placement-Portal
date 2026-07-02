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
    dotenv.load_dotenv(env_path, override=True)
except ImportError:
    pass

DEBUG = os.environ.get('DEBUG', 'False') == 'True'

SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-development-key-12345'
    else:
        raise ValueError("SECRET_KEY environment variable is required in production mode!")

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
    'apps.north_star',
    'apps.placement_sessions',
    'django_celery_beat',
    'job_scraper',
]

MIDDLEWARE = [
    'core.middleware.LimitUploadSizeMiddleware',  # Rejects massive uploads early
    'core.middleware.AdminIPRestrictionMiddleware',  # Protects Admin URL early
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'core.middleware.EnsureCsrfCookieMiddleware',  # Sets csrf cookie for frontend
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.middleware.ForcePasswordChangeMiddleware',
    'core.middleware.SecurityHeadersMiddleware',  # Injects security headers
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
    if not DEBUG:
        raise ValueError("DATABASE_URL environment variable is required in production mode!")
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
CSRF_COOKIE_HTTPONLY = False  # Required so JS frontend can read cookie for header validation
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
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

# AWS S3 / Cloudflare R2 (if STORAGE_BACKEND='s3')
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME', '')
AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')
AWS_S3_CUSTOM_DOMAIN = os.environ.get('AWS_S3_CUSTOM_DOMAIN', '')
AWS_S3_ENDPOINT_URL = os.environ.get('AWS_S3_ENDPOINT_URL', '')

AUTH_USER_MODEL = 'core.User'

# REST Framework Config
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'core.cookie_auth.JWTCookieAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    # Layer 12: Rate Limiting
    'DEFAULT_THROTTLE_RATES': {
        'resume_generation': '100/hour',
        'resume_upload': '5/hour',
        'resume_download': '30/hour',
        'mock_interview_start': '5/hour',
        'mock_interview_submit': '60/hour',
    },
}

# JWT Config
SIMPLE_JWT = {
    # Reduced from 600 minutes (10 hours) to 60 minutes for production security
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# CORS Config
# CORS with credentials requires explicit origins (cannot be wildcard '*')
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
    if origin.strip()
]
if DEBUG:
    CORS_ALLOWED_ORIGINS += [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
    ]

# CSRF Trusted Origins — include CORS origins + HTTPS versions of ALLOWED_HOSTS
# This ensures Railway's *.up.railway.app domains are trusted automatically.
CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS)
for _host in ALLOWED_HOSTS:
    if _host not in ('localhost', '127.0.0.1', '0.0.0.0', '*'):
        _https_origin = f'https://{_host}'
        _http_origin = f'http://{_host}'
        if _https_origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(_https_origin)
        if _http_origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(_http_origin)

# Also honour the RAILWAY_PUBLIC_DOMAIN variable Railway injects automatically
_railway_domain = os.environ.get('RAILWAY_PUBLIC_DOMAIN', '')
if _railway_domain:
    _r_origin = f'https://{_railway_domain}'
    if _r_origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(_r_origin)
    if _r_origin not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(_r_origin)

# Django Admin Security Config
ADMIN_URL = os.environ.get('DJANGO_ADMIN_URL', 'admin-secure-portal/')
ADMIN_IP_WHITELIST = [ip.strip() for ip in os.environ.get('ADMIN_IP_WHITELIST', '').split(',') if ip.strip()] or None

# Email Configuration
EMAIL_BACKEND_ENV = os.environ.get('EMAIL_BACKEND')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
BREVO_API_KEY = os.environ.get('BREVO_API_KEY', '')

if EMAIL_BACKEND_ENV:
    EMAIL_BACKEND = EMAIL_BACKEND_ENV
elif BREVO_API_KEY:
    EMAIL_BACKEND = 'core.email_backends.BrevoEmailBackend'
elif RESEND_API_KEY:
    EMAIL_BACKEND = 'core.email_backends.ResendEmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'onboarding@resend.dev')

# Resend test mode: when True, ALL emails are redirected to RESEND_TEST_REDIRECT_EMAIL.
# Use this when your Resend account has no verified domain (free/testing tier).
# Set to False once you have a verified domain on resend.com/domains.
RESEND_TEST_MODE = os.environ.get('RESEND_TEST_MODE', 'False') == 'True'
RESEND_TEST_REDIRECT_EMAIL = os.environ.get('RESEND_TEST_REDIRECT_EMAIL', '')

# Brevo test mode
BREVO_TEST_MODE = os.environ.get('BREVO_TEST_MODE', 'False') == 'True'
BREVO_TEST_REDIRECT_EMAIL = os.environ.get('BREVO_TEST_REDIRECT_EMAIL', '')

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
    SECURE_HSTS_SECONDS = 0
    SECURE_HSTS_INCLUDE_SUBDOMAINS = False
    SECURE_HSTS_PRELOAD = False

# Password Reset Expiration (in seconds) - 1 Hour
PASSWORD_RESET_TIMEOUT = 3600

# Brute Force Protection Settings
LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5
LOGIN_RATE_LIMIT_LOCKOUT_MINUTES = 1

# ─── Resume Engine: Celery / Async (Layer 2) ────────────────────
import sys
TESTING = 'test' in sys.argv or 'pytest' in sys.modules or any('pytest' in arg for arg in sys.argv)
if TESTING:
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True
else:
    CELERY_TASK_ALWAYS_EAGER = os.environ.get('CELERY_TASK_ALWAYS_EAGER', 'False').lower() == 'true'
    CELERY_TASK_EAGER_PROPAGATES = os.environ.get('CELERY_TASK_EAGER_PROPAGATES', 'False').lower() == 'true'
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0'))
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0'))
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_ROUTES = {
    'apps.applications.tasks.send_job_alert_task': {'queue': 'notifications'},
    'apps.applications.tasks.send_notification_email': {'queue': 'notifications'},
    'apps.applications.tasks.send_bulk_notification_emails': {'queue': 'notifications'},
    'core.tasks.async_send_mail': {'queue': 'notifications'},
}
# Cache backend (used by rate limiting + scraper query caching)
if TESTING:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/1'),
        }
    }

# ─── Scraped Jobs: External API Keys ─────────────────────────────
JSEARCH_API_KEY = os.environ.get('JSEARCH_API_KEY', '')
APIFY_API_TOKEN = os.environ.get('APIFY_API_TOKEN', '')
ADZUNA_APP_ID = os.environ.get('ADZUNA_APP_ID', '')

ADZUNA_APP_KEY = os.environ.get('ADZUNA_APP_KEY', '')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'shahithu2004@gmail.com')
MAX_JOBS_AGE_HOURS = 48
JOBS_ARCHIVE_DAYS = 90
JOBS_PER_COURSE_TARGET = 25

# ─── Resume Engine Limits ─────────────────────────────────────────
def _get_env_int(key, default):
    val = os.environ.get(key, '')
    if not val.strip():
        return default
    try:
        return int(val)
    except ValueError:
        return default

MAX_BUILT_RESUMES = _get_env_int('MAX_BUILT_RESUMES', 5)
MAX_UPLOADED_RESUMES = _get_env_int('MAX_UPLOADED_RESUMES', 5)
MAX_RESUME_UPLOAD_SIZE = _get_env_int('MAX_RESUME_UPLOAD_SIZE', 5 * 1024 * 1024)  # default: 5MB
MAX_PROFILE_PICTURE_SIZE = _get_env_int('MAX_PROFILE_PICTURE_SIZE', 2 * 1024 * 1024)  # default: 2MB



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

# Sentry Error Monitoring Integration
SENTRY_DSN = os.environ.get('SENTRY_DSN')
if SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.django import DjangoIntegration
        from sentry_sdk.integrations.celery import CeleryIntegration
        
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            integrations=[
                DjangoIntegration(),
                CeleryIntegration(),
            ],
            traces_sample_rate=1.0,
            send_default_pii=True,
        )
    except ImportError:
        pass
