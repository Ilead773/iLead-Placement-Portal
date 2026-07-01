import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{
          padding: '2.5rem',
          margin: '4rem auto',
          maxWidth: '650px',
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid var(--border-color, #e2e8f0)',
          color: 'var(--text-primary, #0f172a)',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '800',
            color: '#ef4444',
            marginBottom: '1rem',
            letterSpacing: '-0.025em'
          }}>
            Something went wrong
          </h2>
          <p style={{
            fontSize: '1rem',
            lineHeight: '1.6',
            color: 'var(--text-muted, #475569)',
            marginBottom: '2rem'
          }}>
            An unexpected error occurred in this view. You can reload the page or navigate back to the home screen.
          </p>
          
          {this.state.error && (
            <div style={{ textAlign: 'left', marginBottom: '2.5rem' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: '#ef4444',
                letterSpacing: '0.05em',
                display: 'block',
                marginBottom: '0.5rem'
              }}>
                Technical Details
              </span>
              <pre style={{
                background: '#f8fafc',
                color: '#0f172a',
                padding: '1.25rem',
                borderRadius: '10px',
                overflowX: 'auto',
                fontSize: '0.85rem',
                fontFamily: 'Consolas, Monaco, monospace',
                border: '1px solid #e2e8f0',
                margin: 0
              }}>
                {this.state.error.toString()}
              </pre>
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem',
                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)'
              }}
            >
              Reload Page
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              style={{
                background: 'transparent',
                color: '#3b82f6',
                border: '1.5px solid #3b82f6',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
