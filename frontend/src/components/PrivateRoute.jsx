// src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function PrivateRoute({ children, roles }) {
  const { isAuthenticated, user, passwordChangeRequired } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (passwordChangeRequired) return <Navigate to="/change-password" replace />;
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to={user?.role === 'student' ? '/student' : '/dashboard'} replace />;
  }
  return children;
}
