import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import './Auth.css';
import { Eye, EyeOff } from 'lucide-react';

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
        <div className="auth-container">
            <div className="auth-card">
                <h2>Set New Password</h2>
                <p className="auth-subtitle">Choose a strong password for your account.</p>

                {message && <div className="auth-alert success">{message}</div>}
                {error && <div className="auth-alert error">{error}</div>}

                {!message && (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>New Password</label>
                            <div className="password-input-container">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min. 8 characters"
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
                        </div>

                        <div className="form-group">
                            <label>Confirm Password</label>
                            <div className="password-input-container">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repeat password"
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
                        </div>

                        <button type="submit" className="auth-button" disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div className="auth-footer">
                    <a href="/login">Back to Login</a>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
