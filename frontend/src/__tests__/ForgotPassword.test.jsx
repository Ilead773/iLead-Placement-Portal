import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import ForgotPassword from '../pages/auth/ForgotPassword';
import axios from '../api/axios';

// Mock axios
vi.mock('../api/axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('ForgotPassword Component', () => {
  it('renders forgot password form initially', () => {
    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    expect(getByText('Forgot Password')).toBeDefined();
    expect(getByPlaceholderText('e.g. stu001 or john@example.com')).toBeDefined();
    expect(getByText('Send Reset Link')).toBeDefined();
  });

  it('renders check email screen after successful form submission', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        message: 'Password reset email sent successfully.',
        retry_after_seconds: 300
      }
    });

    const { getByText, getByPlaceholderText, queryByPlaceholderText } = render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    const input = getByPlaceholderText('e.g. stu001 or john@example.com');
    const submitBtn = getByText('Send Reset Link');

    fireEvent.change(input, { target: { value: 'stu001' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(getByText('Check Your Email')).toBeDefined();
    });

    expect(getByText('Password reset email sent successfully.')).toBeDefined();
    expect(queryByPlaceholderText('e.g. stu001 or john@example.com')).toBeNull();
  });
});
