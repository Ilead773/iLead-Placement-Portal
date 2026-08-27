import React, { useState, useEffect, useRef } from 'react';
import axios from '../../api/axios';
import logo from '../../logo.png';

const ForgotPassword = () => {
    const [identity, setIdentity]     = useState('');
    const [message, setMessage]       = useState('');
    const [error, setError]           = useState('');
    const [loading, setLoading]       = useState(false);
    const [cooldown, setCooldown]     = useState(0); // seconds remaining
    const timerRef                    = useRef(null);

    // Start countdown timer
    const startCooldown = (seconds) => {
        setCooldown(seconds);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Clean up timer on unmount
    useEffect(() => () => clearInterval(timerRef.current), []);

    const formatCountdown = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (cooldown > 0) return; // extra guard
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await axios.post('/auth/forgot-password/', { identity });
            setMessage(response.data.message);
            // Start cooldown using retry_after_seconds from backend (default 5 min)
            const wait = response.data.retry_after_seconds || 300;
            startCooldown(wait);
        } catch (err) {
            const data = err.response?.data || {};
            setError(data.error || 'Something went wrong. Please try again.');
            // If rate-limited (429), start the countdown
            if (err.response?.status === 429 && data.retry_after_seconds) {
                startCooldown(data.retry_after_seconds);
            }
        } finally {
            setLoading(false);
        }
    };

    const isDisabled = loading || cooldown > 0;

    return (
        <div className="auth-page">
            <div className="auth-card card">
                <div className="auth-header">
                    <img src={logo} alt="iLEAD Logo" className="auth-logo-img" />
                    <h1 className="branded-title">
                        <span className="portal-text">Forgot Password</span>
                    </h1>
                    <p>Enter your Login ID or Email to reset your password</p>
                </div>

                {message && <div className="alert alert-success">{message}</div>}
                {error   && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Login ID or Registered Email</label>
                        <input
                            type="text"
                            value={identity}
                            onChange={(e) => setIdentity(e.target.value)}
                            placeholder="e.g. stu001 or john@example.com"
                            className="input-field"
                            required
                            autoFocus
                            disabled={isDisabled}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={isDisabled}
                    >
                        {loading ? 'Sending…' : cooldown > 0 ? `Resend in ${formatCountdown(cooldown)}` : 'Send Reset Link'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <a href="/login" style={{ fontSize: '0.9rem', color: '#8b5cf6', textDecoration: 'none' }}>
                        Back to Login
                    </a>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;

