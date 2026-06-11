// src/api/jobFeed.js
import api from './axios';

export const jobFeedAPI = {
  // Student
  getFeed: (params) => api.get('/scraped-jobs/student/job-feed/', { params }),
  getJob: (jobId) => api.get(`/scraped-jobs/student/jobs/${jobId}/`),
  saveJob: (jobId) => api.post(`/scraped-jobs/student/jobs/${jobId}/save/`),
  unsaveJob: (jobId) => api.delete(`/scraped-jobs/student/jobs/${jobId}/save/`),
  getSavedJobs: (params) => api.get('/scraped-jobs/student/saved-jobs/', { params }),

  // Admin — scraping status / trigger
  getScrapingStatus: () => api.get('/scraped-jobs/admin/scraping/status/'),
  triggerScrape: () => api.post('/scraped-jobs/admin/scraping/trigger/'),
  getAdminScrapedJobs: (params) => api.get('/scraped-jobs/admin/scraping/jobs/', { params }),

  // Admin — approve / revoke
  approveJob: (jobId) => api.post(`/scraped-jobs/admin/scraping/jobs/${jobId}/approve/`),
  revokeApproval: (jobId) => api.delete(`/scraped-jobs/admin/scraping/jobs/${jobId}/approve/`),

  // Admin — edit
  getJobForEdit: (jobId) => api.get(`/scraped-jobs/admin/scraping/jobs/${jobId}/edit/`),
  editScrapedJob: (jobId, data) => api.patch(`/scraped-jobs/admin/scraping/jobs/${jobId}/edit/`, data),

  // LinkedIn Scraper
  getLinkedInStatus: () => api.get('/job_scraper/status/'),
  triggerLinkedInScrape: (data) => api.post('/job_scraper/trigger/', data),
};
