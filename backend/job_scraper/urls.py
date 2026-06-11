from django.urls import path
from .views import LinkedInScraperDashboardView, LinkedInTriggerScrapeView

urlpatterns = [
    path('status/', LinkedInScraperDashboardView.as_view(), name='linkedin-status'),
    path('trigger/', LinkedInTriggerScrapeView.as_view(), name='linkedin-trigger'),
]
