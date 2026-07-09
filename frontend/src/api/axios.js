// src/api/axios.js
import axios from 'axios';
import { eraseCookie, getCookie } from '../utils/cookies';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({ 
  baseURL: API_URL,
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken'
});

// Request interceptor to manually attach CSRF token for cross-origin requests
api.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const orig = error.config;
    const isLoginRequest = orig.url.includes('/auth/login/');
    const isRefreshRequest = orig.url.includes('/auth/refresh/');
    const skipAuthRedirect = orig.skipAuthRedirect;

    if (error.response?.status === 401 && !orig._retry && !isLoginRequest && !isRefreshRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(orig);
        });
      }
      orig._retry = true;
      isRefreshing = true;
      try {
        await axios.post(`${API_URL}/auth/refresh/`, {}, { withCredentials: true });
        processQueue(null);
        return api(orig);
      } catch (err) {
        processQueue(err);
        if (!skipAuthRedirect) {
          const wasLoggedIn = getCookie('has_session') === 'true';
          eraseCookie('has_session');
          if (wasLoggedIn) {
            localStorage.setItem('session_expired', 'true');
          }
          window.location.href = '/login';
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401 && !isLoginRequest && !skipAuthRedirect) {
      const wasLoggedIn = getCookie('has_session') === 'true';
      eraseCookie('has_session');
      if (wasLoggedIn) {
        localStorage.setItem('session_expired', 'true');
      }
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
