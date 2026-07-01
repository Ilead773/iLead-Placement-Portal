// src/App.jsx
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { Toaster } from 'react-hot-toast';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import AdminDashboard from './pages/admin/Dashboard';
import Students from './pages/admin/Students';
import CSVUploadPage from './pages/admin/CSVUploadPage';
import Placements from './pages/admin/Placements';
import Assignments from './pages/admin/Assignments';
import Coordinators from './pages/admin/Coordinators';
import StudentDashboard from './pages/student/Dashboard';
import Applications from './pages/student/Applications.jsx';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import StudentProfile from './pages/student/Profile.jsx';
import StudentResumes from './pages/student/Resumes.jsx';
import Jobs from './pages/student/Jobs.jsx';
import ApplicationDetail from './pages/student/ApplicationDetail.jsx';
import CreateJob from './pages/admin/CreateJob.jsx';
import EditJob from './pages/admin/EditJob.jsx';
import JobApplications from './pages/admin/JobApplications.jsx';
import JobPipeline from './pages/admin/JobPipeline.jsx';
import SendResumesPage from './pages/admin/SendResumesPage.jsx';
import BulkSendResumes from './pages/admin/BulkSendResumes.jsx';
import ManageJobs from './pages/admin/ManageJobs.jsx';
import EmailHistoryPage from './pages/admin/EmailHistoryPage.jsx';
import CreateInternship from './pages/admin/CreateInternship.jsx';
import ManageInternships from './pages/admin/ManageInternships.jsx';
import Internships from './pages/student/Internships.jsx';
import ExternalJobFeed from './pages/student/ExternalJobFeed.jsx';
import SavedJobs from './pages/student/SavedJobs.jsx';
import MockInterview from './pages/student/MockInterview.jsx';
import StudentAssignments from './pages/student/Assignments.jsx';
import ScrapingDashboard from './pages/admin/ScrapingDashboard.jsx';
import ExternalClicks from './pages/admin/ExternalClicks.jsx';
import Notifications from './pages/student/Notifications.jsx';
import SendNotifications from './pages/admin/SendNotifications.jsx';
import FAQ from './pages/FAQ.jsx';
import SharedResumes from './pages/SharedResumes.jsx';
import LinkedInScraper from './pages/admin/LinkedInScraper.jsx';
import NorthStarRouter from './pages/north-star/NorthStarRouter';
import StudentTakeTest from './pages/north-star/student/TakeTest.jsx';
import AdminPlacementSessions from './pages/admin/PlacementSessions.jsx';
import StudentPlacementSessions from './pages/student/PlacementSessions.jsx';

import useThemeStore from './store/themeStore';

export default function App() {
  const { initAuth, isAuthenticated, user, passwordChangeRequired } = useAuthStore();
  const { initTheme } = useThemeStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initTheme();
    initAuth().finally(() => setReady(true));
  }, [initAuth, initTheme]);

  if (!ready) return <div className="loading-screen"><div className="spinner" /><p style={{ color: 'var(--text-muted)' }}>Loading...</p></div>;

  return (
    <>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to={user?.role === 'student' ? '/student' : '/dashboard'} replace /> : <Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
        <Route path="/change-password" element={isAuthenticated ? <ChangePassword /> : <Navigate to="/login" replace />} />
        <Route path="/shared-resumes/:logId" element={<SharedResumes />} />

        {/* Shared North Star Route */}
        <Route element={<PrivateRoute roles={['admin', 'coordinator', 'student']}><Layout /></PrivateRoute>}>
          <Route path="/north-star" element={<NorthStarRouter />} />
          <Route path="/north_star" element={<NorthStarRouter />} />
        </Route>

        {/* Admin / Coordinator */}

        <Route element={<PrivateRoute roles={['admin', 'coordinator']}><Layout /></PrivateRoute>}>
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/admin/csv-upload" element={<CSVUploadPage />} />
          <Route path="/placements" element={<Placements />} />
          <Route path="/admin/jobs" element={<ManageJobs />} />
          <Route path="/admin/internships" element={<ManageInternships />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/coordinators" element={<Coordinators />} />
          <Route path="/jobs/create" element={<CreateJob />} />
          <Route path="/internships/create" element={<CreateInternship />} />
          <Route path="/jobs/:id/edit" element={<EditJob />} />
          <Route path="/jobs/:id/applications" element={<JobApplications />} />
          <Route path="/admin/pipeline" element={<JobPipeline />} />
          <Route path="/jobs/:id/send-resumes" element={<SendResumesPage />} />
          <Route path="/admin/send-resumes" element={<BulkSendResumes />} />
          <Route path="/admin/email-history" element={<EmailHistoryPage />} />
          <Route path="/admin/scraping" element={<ScrapingDashboard />} />
          <Route path="/admin/linkedin-scraper" element={<LinkedInScraper />} />
          <Route path="/admin/clicks" element={<ExternalClicks />} />
          <Route path="/admin/notifications" element={<SendNotifications />} />
          <Route path="/admin/inbox" element={<Notifications />} />
          <Route path="/admin/faq" element={<FAQ />} />
          <Route path="/admin/sessions" element={<AdminPlacementSessions />} />
        </Route>

        {/* Student */}
        <Route element={<PrivateRoute roles={['student']}><Layout /></PrivateRoute>}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/profile" element={<StudentProfile />} />
          <Route path="/student/resumes" element={<StudentResumes />} />
          <Route path="/student/jobs" element={<Jobs />} />
          <Route path="/student/internships" element={<Internships />} />
          <Route path="/student/job-feed" element={<ExternalJobFeed />} />
          <Route path="/student/saved-jobs" element={<SavedJobs />} />
          <Route path="/student/applications" element={<Applications />} />
          <Route path="/student/applications/:id" element={<ApplicationDetail />} />
          <Route path="/student/mock-interview" element={<MockInterview />} />
          <Route path="/student/assignments" element={<StudentAssignments />} />
          <Route path="/student/take-test/:assignmentId" element={<StudentTakeTest />} />
          <Route path="/student/notifications" element={<Notifications />} />
          <Route path="/student/faq" element={<FAQ />} />
          <Route path="/student/sessions" element={<StudentPlacementSessions />} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? (user?.role === 'student' ? '/student' : '/dashboard') : '/login'} replace />} />
      </Routes>
      <Toaster position="bottom-right" />
    </>
  );
}
