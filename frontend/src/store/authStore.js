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
    setCookie('access_token', data.access);
    setCookie('refresh_token', data.refresh);
    const needsChange = data.user.temp_password_flag || data.user.password_reset_required;
    set({ user: data.user, isAuthenticated: true, passwordChangeRequired: needsChange });
    return data.user;
  },

  changePassword: async (current_password, new_password, confirm_password) => {
    const { data } = await api.post('/auth/change-password/', { current_password, new_password, confirm_password });
    setCookie('access_token', data.access);
    setCookie('refresh_token', data.refresh);
    set((s) => ({
      passwordChangeRequired: false,
      user: { ...s.user, temp_password_flag: false, password_reset_required: false },
    }));
  },

  logout: async () => {
    try {
      const refresh = getCookie('refresh_token');
      await api.post('/auth/logout/', { refresh });
    } catch { /* */ }
    eraseCookie('access_token');
    eraseCookie('refresh_token');
    localStorage.clear(); // Keep this for other non-auth data if any
    set({ user: null, isAuthenticated: false, passwordChangeRequired: false });
  },

  initAuth: async () => {
    const token = getCookie('access_token');
    if (!token) return;
    try {
      const { data } = await api.get('/me/');
      const needsChange = data.temp_password_flag || data.password_reset_required;
      set({ user: data, isAuthenticated: true, passwordChangeRequired: needsChange });
    } catch {
      eraseCookie('access_token');
      eraseCookie('refresh_token');
      set({ user: null, isAuthenticated: false });
    }
  },
}));

export default useAuthStore;
