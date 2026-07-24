// src/pages/ChangePassword.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const CHECKS = [
  { id: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'At least 1 uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'At least 1 lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'num', label: 'At least 1 number', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'At least 1 special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { changePassword, logout, user } = useAuthStore();
  const navigate = useNavigate();

  const allPassed = CHECKS.every((c) => c.test(newPwd)) && newPwd === confirm && newPwd.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allPassed) return;
    setError('');
    setLoading(true);
    try {
      await changePassword(current, newPwd, confirm);
      navigate(user?.role === 'student' ? '/student' : '/dashboard');
    } catch (err) {
      const data = err.response?.data;
      setError(data?.error || data?.new_password?.[0] || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card" style={{ maxWidth: 480 }}>
        <div className="auth-header">
          <h1>🔒 Change Password</h1>
          <p>You must set a new password before continuing.</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Current Password</label>
            <input type="password" className="input-field" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>New Password</label>
            <input type="password" className="input-field" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Confirm New Password</label>
            <input type="password" className={`input-field ${confirm && confirm !== newPwd ? 'input-error' : ''}`} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            {confirm && confirm !== newPwd && <span className="error-text">Passwords do not match.</span>}
          </div>
          <div className="pwd-checklist">
            {CHECKS.map((c) => (
              <div key={c.id} className={`pwd-check ${c.test(newPwd) ? 'pass' : 'fail'}`}>
                <span>{c.test(newPwd) ? '✓' : '○'}</span> {c.label}
              </div>
            ))}
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={!allPassed || loading}>
            {loading ? 'Changing...' : 'Set New Password'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-full"
            style={{ marginTop: '12px' }}
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            Cancel & Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}
