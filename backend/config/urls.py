from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse, HttpResponseNotFound
from rest_framework.exceptions import NotFound
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

def custom_404_view(request, exception=None):
    # If the client does not accept HTML (e.g. React/Axios requesting API JSON data), return JSON
    if 'text/html' not in request.META.get('HTTP_ACCEPT', ''):
        return JsonResponse({
            'detail': 'Not found.'
        }, status=404)
    
    # If it is a human visiting in a browser, show a beautiful, clean error page
    html_content = """
    <!DOCTYPE html>
    <html>
        <head>
            <title>Page Not Found</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    background-color: #f8fafc;
                    color: #1e293b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 24px;
                    box-sizing: border-box;
                }
                .card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 32px 24px;
                    text-align: center;
                    max-width: 400px;
                    width: 100%;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                }
                .icon {
                    width: 48px;
                    height: 48px;
                    background: #fef2f2;
                    color: #ef4444;
                    border: 1px solid #fee2e2;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    font-weight: bold;
                    margin: 0 auto 16px;
                }
                h1 {
                    font-size: 18px;
                    font-weight: 700;
                    margin: 0 0 8px 0;
                    color: #0f172a;
                }
                p {
                    color: #475569;
                    font-size: 14px;
                    line-height: 1.5;
                    margin: 0 0 24px 0;
                }
                .btn {
                    display: inline-block;
                    background: #2563eb;
                    color: #ffffff;
                    text-decoration: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 14px;
                    transition: background 0.15s;
                }
                .btn:hover {
                    background: #1d4ed8;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <!-- Cute Confused SVG Cat -->
                <svg viewBox="0 0 200 200" width="120" height="120" style="margin: 0 auto 20px; display: block;">
                    <!-- Cat Head -->
                    <circle cx="100" cy="110" r="50" fill="#f8fafc" stroke="#cbd5e1" stroke-width="4"/>
                    <!-- Left Ear -->
                    <polygon points="60,80 80,105 50,110" fill="#f8fafc" stroke="#cbd5e1" stroke-width="4" stroke-linejoin="round"/>
                    <polygon points="65,85 78,103 57,106" fill="#fee2e2"/>
                    <!-- Right Ear -->
                    <polygon points="140,80 120,105 150,110" fill="#f8fafc" stroke="#cbd5e1" stroke-width="4" stroke-linejoin="round"/>
                    <polygon points="135,85 122,103 143,106" fill="#fee2e2"/>
                    <!-- Eyes -->
                    <ellipse cx="85" cy="110" rx="6" ry="10" fill="#0f172a"/>
                    <ellipse cx="115" cy="110" rx="6" ry="10" fill="#0f172a"/>
                    <circle cx="83" cy="108" r="2" fill="#ffffff"/>
                    <circle cx="113" cy="108" r="2" fill="#ffffff"/>
                    <!-- Nose & Mouth -->
                    <polygon points="100,122 96,118 104,118" fill="#ef4444"/>
                    <path d="M 96,126 Q 100,130 100,126 Q 100,130 104,126" fill="none" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>
                    <!-- Whiskers -->
                    <line x1="45" y1="120" x2="25" y2="118" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/>
                    <line x1="45" y1="128" x2="20" y2="130" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/>
                    <line x1="155" y1="120" x2="175" y2="118" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/>
                    <line x1="155" y1="128" x2="180" y2="130" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/>
                    <!-- Question Mark -->
                    <text x="145" y="70" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="32" font-weight="bold" fill="#3b82f6" transform="rotate(15 145 70)">?</text>
                </svg>
                <h1>Page Not Found</h1>
                <p>The page you are looking for does not exist or has been moved.</p>
                <a href="/" class="btn">Go Home</a>
            </div>
        </body>
    </html>
    """
    return HttpResponseNotFound(html_content, content_type='text/html')

@api_view(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])
@permission_classes([AllowAny])
def api_fallback_404_view(request, *args, **kwargs):
    # If a human visits the API URL in their web browser, render the beautiful HTML error page
    if 'text/html' in request.META.get('HTTP_ACCEPT', ''):
        return custom_404_view(request)
    raise NotFound()

handler404 = 'config.urls.custom_404_view'

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

    # API fallback catch-all for unmatched api/ URLs
    path('api/<path:unmatched>', api_fallback_404_view),
    path('api/', api_fallback_404_view),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
