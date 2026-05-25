import React, { useState } from 'react';
import axios from '../../api/axios';
import './Auth.css';

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
        <div className="auth-container">
            <div className="auth-card">
                <h2>Forgot Password</h2>
                <p className="auth-subtitle">Enter your Login ID or Email to reset your password.</p>

                {message && <div className="auth-alert success">{message}</div>}
                {error && <div className="auth-alert error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Login ID or Registered Email</label>
                        <input
                            type="text"
                            value={identity}
                            onChange={(e) => setIdentity(e.target.value)}
                            placeholder="e.g. stu001 or john@example.com"
                            required
                        />
                    </div>

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <div className="auth-footer">
                    <a href="/login">Back to Login</a>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
