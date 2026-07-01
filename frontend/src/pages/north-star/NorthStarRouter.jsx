import React from 'react';
import useAuthStore from '../../store/authStore';
import StudentDashboard from './student/Dashboard';
import AdminDashboard from './admin/AdminDashboard';

export default function NorthStarRouter() {
  const { user } = useAuthStore();

  if (user?.role === 'student') {
    return <StudentDashboard />;
  }
  
  // Admins and Placement Coordinators see the Admin view
  return <AdminDashboard />;
}
