// src/api/placementSessionsAPI.js
import api from './axios';

const BASE = '/placement-sessions';

const placementSessionsAPI = {
  // Admin: create session + auto Zoom meeting
  schedule: (data) => api.post(`${BASE}/schedule/`, data),

  // List sessions (auto-filtered per role)
  list: () => api.get(`${BASE}/`),

  // Get single session
  get: (id) => api.get(`${BASE}/${id}/`),

  // Cancel session
  cancel: (id) => api.delete(`${BASE}/${id}/`),

  // Student: get join token for embedded Zoom
  join: (id) => api.get(`${BASE}/${id}/join/`),

  // Admin: get host start token
  start: (id) => api.get(`${BASE}/${id}/start/`),

  // Admin: get attendance report for a session
  attendance: (id) => api.get(`${BASE}/${id}/attendance/`),

  // Admin: manually override a student's attendance
  overrideAttendance: (sessionId, attendanceId, newStatus) =>
    api.patch(`${BASE}/${sessionId}/attendance/${attendanceId}/`, { status: newStatus }),

  // Admin: manually end session early
  end: (id) => api.post(`${BASE}/${id}/end/`),
};

export default placementSessionsAPI;
