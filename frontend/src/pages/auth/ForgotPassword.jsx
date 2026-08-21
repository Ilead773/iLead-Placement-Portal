import React, { useState } from 'react';
import axios from '../../api/axios';
import logo from '../../logo.png';

const ForgotPassword = () => {
    const [identity, setIdentity] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await axios.post('/auth/forgot-password/', { identity });
            setMessage(response.data.message);
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong. Please try again.');
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
                        <span className="portal-text">Forgot Password</span>
                    </h1>
                    <p>Enter your Login ID or Email to reset your password</p>
                </div>

                {message && <div className="alert alert-success">{message}</div>}
                {error && <div className="alert alert-error">{error}</div>}

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
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
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
