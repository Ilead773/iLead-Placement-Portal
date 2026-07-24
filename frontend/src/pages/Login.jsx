// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { getCookie } from '../utils/cookies';
import logo from '../logo.png';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const sessionExpiredFlag = localStorage.getItem('session_expired') === 'true';
    // Always clean up the flag to prevent it persisting across refreshes
    localStorage.removeItem('session_expired');
    // Only show the toast if:
    //   1. The flag was explicitly set (meaning an actual 401 was received while logged in)
    //   2. AND the has_session cookie is now gone (confirms the session truly ended)
    // This prevents stale flags (e.g., from a DB blip or incognito) from showing a false warning.
    if (sessionExpiredFlag && !getCookie('has_session')) {
      toast.error('Your secure session has expired. Please log in again to continue.', {
        duration: 6000,
        id: 'session-expired-toast'
      });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(loginId, password);
      if (user.temp_password_flag || user.password_reset_required) {
        navigate('/change-password');
      } else if (user.role === 'student') {
        navigate('/student');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-header">
          <img src={logo} alt="iLEAD Logo" className="auth-logo-img" />
          <h1 className="branded-title">
            <span className="portal-text">iLEAD Placement Portal</span>
          </h1>
          <p>Sign in with your Login ID</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="login-id">Login ID</label>
            <input id="login-id" className="input-field" placeholder="e.g. stu001" value={loginId} onChange={(e) => setLoginId(e.target.value)} required autoFocus />
          </div>
          <div className="input-group">
            <label htmlFor="login-pwd">Password</label>
            <div className="password-input-container">
              <input 
                id="login-pwd" 
                type={showPassword ? 'text' : 'password'} 
                className="input-field" 
                placeholder="Enter password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              <button 
                type="button" 
                className="password-toggle-btn" 
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div style={{ textAlign: 'right', marginTop: '4px' }}>
                <a href="/forgot-password" style={{ fontSize: '0.85rem', color: '#8b5cf6', textDecoration: 'none' }}>
                    Forgot password?
                </a>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
