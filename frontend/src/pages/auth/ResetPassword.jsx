import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import logo from '../../logo.png';
import { Eye, EyeOff } from 'lucide-react';

const RequirementItem = ({ met, label }) => (
    <li className={`req-item ${met ? 'met' : 'unmet'}`}>
        <span className="req-icon">{met ? '✓' : '○'}</span>
        <span>{label}</span>
    </li>
);

const ResetPassword = () => {
    const { uid, token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return setError('Passwords do not match.');
        }

        setLoading(true);
        setError('');

        try {
            await axios.post('/auth/reset-password-confirm/', {
                uid,
                token,
                new_password: password
            });
            setMessage('Password reset successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid or expired link.');
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
                        <span className="portal-text">Set New Password</span>
                    </h1>
                    <p>Choose a strong password for your account</p>
                </div>

                {message && <div className="alert alert-success">{message}</div>}
                {error && <div className="alert alert-error">{error}</div>}

                {!message && (
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label>New Password</label>
                            <div className="password-input-container">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min. 8 characters"
                                    className="input-field"
                                    required
                                    autoFocus
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
                        </div>

                        {password.length > 0 && (
                            <div className="password-requirements">
                                <p className="req-title">Password must contain:</p>
                                <ul className="req-list">
                                    <RequirementItem met={password.length >= 8} label="At least 8 characters" />
                                    <RequirementItem met={/[A-Z]/.test(password)} label="One uppercase letter (A-Z)" />
                                    <RequirementItem met={/[a-z]/.test(password)} label="One lowercase letter (a-z)" />
                                    <RequirementItem met={/[0-9]/.test(password)} label="One number (0-9)" />
                                    <RequirementItem met={/[^A-Za-z0-9]/.test(password)} label="One special character (!@#$...)" />
                                </ul>
                            </div>
                        )}

                        <div className="input-group">
                            <label>Confirm Password</label>
                            <div className="password-input-container">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repeat password"
                                    className="input-field"
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {confirmPassword.length > 0 && (
                                <p className={`password-match-hint ${password === confirmPassword ? 'match' : 'no-match'}`}>
                                    {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                                </p>
                            )}
                        </div>

                        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <a href="/login" style={{ fontSize: '0.9rem', color: '#8b5cf6', textDecoration: 'none' }}>
                        Back to Login
                    </a>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
