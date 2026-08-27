import React, { useState, useEffect, useRef } from 'react';
import axios from '../../api/axios';
import logo from '../../logo.png';

const COOLDOWN_KEY = 'fp_cooldown_until'; // localStorage key

const ForgotPassword = () => {
    const [identity, setIdentity]     = useState('');
    const [message, setMessage]       = useState('');
    const [error, setError]           = useState('');
    const [loading, setLoading]       = useState(false);
    const [cooldown, setCooldown]     = useState(0); // seconds remaining
    const timerRef                    = useRef(null);

    // Calculate remaining seconds from a stored expiry timestamp
    const getRemainingSeconds = () => {
        const until = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0', 10);
        return Math.max(0, Math.ceil((until - Date.now()) / 1000));
    };

    // Tick the countdown every second, clearing when done
    const startTick = () => {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            const remaining = getRemainingSeconds();
            setCooldown(remaining);
            if (remaining <= 0) {
                clearInterval(timerRef.current);
                localStorage.removeItem(COOLDOWN_KEY);
            }
        }, 1000);
    };

    // On mount: restore any active cooldown from localStorage
    useEffect(() => {
        const remaining = getRemainingSeconds();
        if (remaining > 0) {
            setCooldown(remaining);
            startTick();
        }
        // Clean up interval on unmount
        return () => clearInterval(timerRef.current);
    }, []);

    // Start a fresh cooldown and persist expiry time
    const startCooldown = (seconds) => {
        const until = Date.now() + seconds * 1000;
        localStorage.setItem(COOLDOWN_KEY, String(until));
        setCooldown(seconds);
        startTick();
    };

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

