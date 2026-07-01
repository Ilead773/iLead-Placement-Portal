import React, { useState, useEffect } from 'react';

export default function ProctoringInstructionGate({ onAccept, onCancel, domainName, typeName, loading }) {
  const [checked, setChecked] = useState(false);
  const [mediaStatus, setMediaStatus] = useState('pending'); // 'pending' | 'granted' | 'denied'
  const [loadingMedia, setLoadingMedia] = useState(false);

  const requestMediaAccess = async () => {
    setLoadingMedia(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // Stop all tracks to release resources for the actual interview room
      stream.getTracks().forEach(track => track.stop());
      setMediaStatus('granted');
    } catch (err) {
      console.error("Camera/Mic permission denied:", err);
      setMediaStatus('denied');
    } finally {
      setLoadingMedia(false);
    }
  };

  useEffect(() => {
    requestMediaAccess();
  }, []);

  return (
    <div className="proctor-gate-container animate-in">
      <div className="proctor-gate-card glass-panel">
        <div className="proctor-gate-header">
          <div className="shield-icon-box">
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="var(--accent-primary)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="secure-badge">SECURE INTERVIEW ENTRY</span>
          <h1 className="gate-title">Interview Rules</h1>
          <p className="gate-subtitle">
            You are starting a practice interview for <strong>{domainName || 'General'}</strong> &bull; <strong>{typeName}</strong>.
          </p>
        </div>

        <div className="gate-divider" />

        <div className="rules-grid">
          <div className="rule-item">
            <span className="rule-icon">🖥️</span>
            <div className="rule-info">
              <strong>Stay in Full Screen</strong>
              <p>You must keep the window in full screen mode. If you exit full screen or minimize the window, you will get a warning.</p>
            </div>
          </div>

          <div className="rule-item">
            <span className="rule-icon">🚫</span>
            <div className="rule-info">
              <strong>Do Not Switch Tabs</strong>
              <p>Do not switch to other tabs or open other apps. The system will count this as a warning.</p>
            </div>
          </div>

          <div className="rule-item">
            <span className="rule-icon">📋</span>
            <div className="rule-info">
              <strong>No Copy or Paste</strong>
              <p>You cannot copy, cut, or paste any text during this interview.</p>
            </div>
          </div>

          <div className="rule-item">
            <span className="rule-icon">👁️</span>
            <div className="rule-info">
              <strong>Camera Monitoring</strong>
              <p>The camera will make sure you stay in front of the screen. It checks:
                <br />&bull; If you leave the camera view.
                <br />&bull; If you look away from the screen.
              </p>
            </div>
          </div>

          <div className="rule-item">
            <span className="rule-icon">🎤</span>
            <div className="rule-info">
              <strong>Microphone Access</strong>
              <p>Ensure your microphone is enabled so you can record your voice answers for AI feedback.</p>
            </div>
          </div>

          <div className="rule-item">
            <span className="rule-icon">🤫</span>
            <div className="rule-info">
              <strong>Quiet Environment</strong>
              <p>Take the interview in a quiet and well-lit room to ensure accurate voice transcription and proctoring.</p>
            </div>
          </div>
        </div>

        <div className="gate-alert-box">
          <span className="alert-emoji">⚠️</span>
          <div className="alert-content">
            <strong>Maximum 3 Warnings</strong>
            <p>If you switch tabs, leave the camera, or exit full screen more than 3 times, the interview will close immediately.</p>
          </div>
        </div>

        <div className="consent-section">
          {mediaStatus === 'pending' && (
            <div className="camera-check-status pending">
              <span className="status-dot-amber"></span>
              <span>🔍 Checking camera &amp; microphone...</span>
            </div>
          )}
          {mediaStatus === 'granted' && (
            <div className="camera-check-status granted">
              <span className="status-dot-green"></span>
              <span>✅ Camera &amp; Microphone are Ready</span>
            </div>
          )}
          {mediaStatus === 'denied' && (
            <div className="camera-check-status denied">
              <span className="status-dot-red"></span>
              <span style={{ fontWeight: 800 }}>🚨 Camera &amp; Mic access is required!</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#fca5a5', textAlign: 'center', fontWeight: 500 }}>
                Please give permission to use both your camera and microphone. You cannot take the interview without them. Click the button below or check your browser settings to try again.
              </p>
              <button onClick={requestMediaAccess} className="retry-cam-btn" disabled={loadingMedia}>
                {loadingMedia ? 'Checking...' : '🔄 Try Again'}
              </button>
            </div>
          )}

          <label className="consent-checkbox-label" style={{ marginTop: '16px' }}>
            <input 
              type="checkbox" 
              checked={checked} 
              onChange={(e) => setChecked(e.target.checked)} 
              className="gate-checkbox"
            />
            <span className="consent-text">
              I agree to use the camera, stay in full screen, and follow all the rules. I know that if I break these rules, my interview will end.
            </span>
          </label>

          <div className="gate-actions-row" style={{ display: 'flex', gap: '16px', marginTop: '24px', width: '100%' }}>
            <button
              className="btn btn-secondary gate-cancel-btn"
              style={{ flex: 1, padding: '14px', borderRadius: 'var(--radius-md)', fontWeight: '700', cursor: 'pointer' }}
              onClick={onCancel}
              type="button"
            >
              ↩️ Cancel & Go Back
            </button>
            <button
              className={`btn btn-primary gate-action-btn ${!checked || mediaStatus !== 'granted' || loading ? 'disabled' : ''}`}
              style={{ flex: 1.5, padding: '14px', borderRadius: 'var(--radius-md)', fontWeight: '700', cursor: 'pointer' }}
              disabled={!checked || mediaStatus !== 'granted' || loading}
              onClick={onAccept}
            >
              {loading ? 'Starting...' : '🚀 Start Interview'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
