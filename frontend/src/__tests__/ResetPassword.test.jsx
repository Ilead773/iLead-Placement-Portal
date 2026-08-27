import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import ResetPassword from '../pages/auth/ResetPassword';

// Mock axios
vi.mock('../../api/axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('ResetPassword Component', () => {
  it('renders without crashing', () => {
    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={['/reset-password/test-uid/test-token']}>
        <Routes>
          <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
        </Routes>
      </MemoryRouter>
    );

    expect(getByText('Set New Password')).toBeDefined();
    expect(getByPlaceholderText('Min. 8 characters')).toBeDefined();
    expect(getByPlaceholderText('Repeat password')).toBeDefined();
  });
});
