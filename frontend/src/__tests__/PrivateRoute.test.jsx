import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import PrivateRoute from '../components/PrivateRoute';
import useAuthStore from '../store/authStore';

vi.mock('../store/authStore', () => ({
  default: vi.fn(),
}));

describe('PrivateRoute Component', () => {
  it('redirects to login if not authenticated', () => {
    useAuthStore.mockReturnValue({ isAuthenticated: false });
    
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/dashboard" element={<PrivateRoute><div>Dashboard</div></PrivateRoute>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to change-password if required', () => {
    useAuthStore.mockReturnValue({ 
      isAuthenticated: true, 
      passwordChangeRequired: true 
    });
    
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/change-password" element={<div>Change Password Page</div>} />
          <Route path="/dashboard" element={<PrivateRoute><div>Dashboard</div></PrivateRoute>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Change Password Page')).toBeInTheDocument();
  });

  it('allows access if authenticated and no password change required', () => {
    useAuthStore.mockReturnValue({ 
      isAuthenticated: true, 
      passwordChangeRequired: false 
    });
    
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <PrivateRoute><div>Dashboard Content</div></PrivateRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });
});
