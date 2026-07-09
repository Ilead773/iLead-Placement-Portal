import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from '../pages/Login';
import useAuthStore from '../store/authStore';

// Mock the auth store
vi.mock('../store/authStore', () => ({
  default: vi.fn(),
}));

// Mock the cookies utility so getCookie returns null in tests (no active session)
vi.mock('../utils/cookies', () => ({
  getCookie: vi.fn(() => null),
  setCookie: vi.fn(),
  eraseCookie: vi.fn(),
}));

describe('Login Page', () => {
  beforeEach(() => {
    // Ensure localStorage is fully mocked for all tests
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
  });

  it('renders login form correctly', () => {
    useAuthStore.mockReturnValue({ login: vi.fn() });
    
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByText('iLEAD Placement Portal')).toBeInTheDocument();
    expect(screen.getByLabelText('Login ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('updates input values on change', () => {
    useAuthStore.mockReturnValue({ login: vi.fn() });
    
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const loginInput = screen.getByLabelText('Login ID');
    fireEvent.change(loginInput, { target: { value: 'stu001' } });
    expect(loginInput.value).toBe('stu001');
  });

  it('shows error message on login failure', async () => {
    const mockLogin = vi.fn().mockRejectedValue({
      response: { data: { error: 'Invalid credentials.' } }
    });
    useAuthStore.mockReturnValue({ login: mockLogin });

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText('Login ID'), { target: { value: 'wrong' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    const errorMsg = await screen.findByText('Invalid credentials.');
    expect(errorMsg).toBeInTheDocument();
  });
});
