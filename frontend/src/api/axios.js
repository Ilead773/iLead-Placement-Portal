// src/api/axios.js
import axios from 'axios';
import { getCookie, setCookie, eraseCookie } from '../utils/cookies';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({ baseURL: API_URL });

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  const token = getCookie('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const orig = error.config;
    const isLoginRequest = orig.url.includes('/auth/login/');
    const hasRefreshToken = !!getCookie('refresh_token');

    if (error.response?.status === 401 && !orig._retry && !isLoginRequest && hasRefreshToken) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          orig.headers.Authorization = `Bearer ${token}`;
          return api(orig);
        });
      }
      orig._retry = true;
      isRefreshing = true;
      try {
        const refresh = getCookie('refresh_token');
        const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh });
        setCookie('access_token', data.access);
        if (data.refresh) setCookie('refresh_token', data.refresh);
        processQueue(null, data.access);
        orig.headers.Authorization = `Bearer ${data.access}`;
        return api(orig);
      } catch (err) {
        processQueue(err, null);
        eraseCookie('access_token');
        eraseCookie('refresh_token');
        // Save session expired flag in localStorage so the Login component can render a beautiful toast alert on mount
        localStorage.setItem('session_expired', 'true');
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
