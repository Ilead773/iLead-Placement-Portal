from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path('api/v1/', include('core.urls')),

    # Resume Engine APIs (Layer 15: Domain-Driven Structure)
    path('api/v1/profiles/', include('apps.profiles.urls')),
    path('api/v1/resumes/', include('apps.resumes.urls')),
    path('api/v1/templates/', include('apps.templates_engine.urls')),
    
    # Newly created placement apps
    path('api/v1/jobs/', include('apps.jobs.urls')),
    path('api/v1/applications/', include('apps.applications.urls')),

    # Scraped Jobs — Daily Job Scraper + Student Feed
    path('api/v1/scraped-jobs/', include('apps.scraped_jobs.urls')),

    # Mock Interviews — Cost-Optimized Interview System
    path('api/v1/interviews/', include('apps.interviews.urls')),
    # LinkedIn Job Scraper Endpoint
    path('api/v1/job_scraper/', include('job_scraper.urls')),
    
    # Project North Star LMS Endpoint
    path('api/v1/north-star/', include('apps.north_star.urls')),

    # Placement Sessions — Zoom-powered sessions with attendance tracking
    path('api/v1/placement-sessions/', include('apps.placement_sessions.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
