import api from './axios';

const NORTH_STAR_BASE = '/north-star';

export const northStarAPI = {
  // Courses
  getCourses: () => api.get(`${NORTH_STAR_BASE}/courses/`),
  createCourse: (data) => api.post(`${NORTH_STAR_BASE}/courses/`, data),
  getCourseDetail: (courseId) => api.get(`${NORTH_STAR_BASE}/courses/${courseId}/`),

  // Classes
  getClasses: () => api.get(`${NORTH_STAR_BASE}/classes/?_t=${Date.now()}`),
  scheduleClass: (data) => api.post(`${NORTH_STAR_BASE}/schedule-class/`, data),
  joinClass: (classId) => api.get(`${NORTH_STAR_BASE}/classes/${classId}/join/`),
  startClass: (classId) => api.get(`${NORTH_STAR_BASE}/classes/${classId}/start/`),
  endClass: (classId) => api.post(`${NORTH_STAR_BASE}/classes/${classId}/end/`),

  // Attendance
  getAttendance: (params) => api.get(`${NORTH_STAR_BASE}/attendance/`, { params }),
  getAttendanceMe: () => api.get(`${NORTH_STAR_BASE}/attendance/me/`),
  overrideAttendance: (id, status) => api.patch(`${NORTH_STAR_BASE}/attendance/${id}/override/`, { status }),
  getReconciliation: () => api.get(`${NORTH_STAR_BASE}/attendance/reconciliation/`),

  // Assignments
  getAssignments: () => api.get(`${NORTH_STAR_BASE}/assignments/`),
  getAssignmentDetail: (id) => api.get(`${NORTH_STAR_BASE}/assignments/${id}/`),
  createAssignment: (data) => {
    // If we have file uploads, we use FormData
    const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    return api.post(`${NORTH_STAR_BASE}/assignments/`, data, config);
  },

  // Submissions
  getSubmissions: () => api.get(`${NORTH_STAR_BASE}/submissions/`),
  mySubmissions: () => api.get(`${NORTH_STAR_BASE}/submissions/my_submissions/`),
  submitAssignment: (data) => {
    const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    return api.post(`${NORTH_STAR_BASE}/submissions/`, data, config);
  },
  gradeSubmission: (id, data) => api.patch(`${NORTH_STAR_BASE}/submissions/${id}/grade/`, data),

  // Progress
  getProgress: () => api.get(`${NORTH_STAR_BASE}/progress/`),
  getProgressMe: () => api.get(`${NORTH_STAR_BASE}/progress/me/`),

  // Dashboard
  getStudentDashboard: () => api.get(`${NORTH_STAR_BASE}/dashboard/student/?_t=${Date.now()}`),
  getAdminDashboard: () => api.get(`${NORTH_STAR_BASE}/dashboard/admin/?_t=${Date.now()}`),

  // Certificate Trigger
  generateCertificate: (studentId, courseId) => api.post(`${NORTH_STAR_BASE}/certificates/${studentId}/${courseId}/generate/`),
  releaseCourseCertificates: (courseId) => api.post(`${NORTH_STAR_BASE}/courses/${courseId}/release_certificates/`),

  // Bulk Email
  sendBulkEmail: (data) => api.post(`${NORTH_STAR_BASE}/send-email/`, data),
};

export default northStarAPI;
