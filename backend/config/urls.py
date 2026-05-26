from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
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
    
    # Career OS — AI Career Skill Intelligence System
    path('api/v1/career-os/', include('apps.career_os.urls')),
]

from django.urls import re_path
from django.views.static import serve

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    ]
