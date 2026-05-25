# apps/scraped_jobs/urls.py

from django.urls import path
from .views import (
    StudentJobFeedView, ScrapedJobDetailView, SaveJobView, SavedJobsView,
    AdminScrapingDashboardView, AdminTriggerScrapeView, AdminScrapedJobsListView,
    AdminApproveJobView, AdminEditJobView,
)

urlpatterns = [
    # Student endpoints
    path('student/job-feed/', StudentJobFeedView.as_view(), name='student-job-feed'),
    path('student/jobs/<int:job_id>/', ScrapedJobDetailView.as_view(), name='scraped-job-detail'),
    path('student/jobs/<int:job_id>/save/', SaveJobView.as_view(), name='save-job'),
    path('student/saved-jobs/', SavedJobsView.as_view(), name='saved-jobs'),

    # Admin endpoints
    path('admin/scraping/status/', AdminScrapingDashboardView.as_view(), name='scraping-status'),
    path('admin/scraping/trigger/', AdminTriggerScrapeView.as_view(), name='trigger-scrape'),
    path('admin/scraping/jobs/', AdminScrapedJobsListView.as_view(), name='admin-scraped-jobs'),
    path('admin/scraping/jobs/<int:job_id>/approve/', AdminApproveJobView.as_view(), name='admin-approve-job'),
    path('admin/scraping/jobs/<int:job_id>/edit/', AdminEditJobView.as_view(), name='admin-edit-job'),
]
