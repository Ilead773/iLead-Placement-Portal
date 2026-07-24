// src/store/authStore.js
import { create } from 'zustand';
import api from '../api/axios';
import { setCookie, getCookie, eraseCookie } from '../utils/cookies';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  passwordChangeRequired: false,

  login: async (login_id, password) => {
    const { data } = await api.post('/auth/login/', { login_id, password });
    if (data.access) {
      localStorage.setItem('access_token', data.access);
    }
    if (data.refresh) {
      localStorage.setItem('refresh_token', data.refresh);
    }
    setCookie('has_session', 'true', 7);
    const needsChange = data.user.temp_password_flag || data.user.password_reset_required;
    set({ user: data.user, isAuthenticated: true, passwordChangeRequired: needsChange });
    return data.user;
  },

  changePassword: async (current_password, new_password, confirm_password) => {
    const { data } = await api.post('/auth/change-password/', { current_password, new_password, confirm_password });
    if (data.access) {
      localStorage.setItem('access_token', data.access);
    }
    if (data.refresh) {
      localStorage.setItem('refresh_token', data.refresh);
    }
    setCookie('has_session', 'true', 7);
    set((s) => ({
      passwordChangeRequired: false,
      user: { ...s.user, temp_password_flag: false, password_reset_required: false },
    }));
  },

  logout: async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      await api.post('/auth/logout/', { refresh });
    } catch { /* */ }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    eraseCookie('has_session');
    try {
      const { default: useNotificationStore } = await import('./notificationStore');
      useNotificationStore.getState().stopPolling();
    } catch (e) {
      console.error(e);
    }
    set({ user: null, isAuthenticated: false, passwordChangeRequired: false });
  },

  initAuth: async () => {
    if (getCookie('has_session') !== 'true') return;
    try {
      const { data } = await api.get('/me/', { skipAuthRedirect: true });
      const needsChange = data.temp_password_flag || data.password_reset_required;
      set({ user: data, isAuthenticated: true, passwordChangeRequired: needsChange });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      eraseCookie('has_session');
      set({ user: null, isAuthenticated: false });
    }
  },
}));

export default useAuthStore;
