import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  title = 'Are you sure?', 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Yes, Proceed', 
  cancelText = 'Cancel', 
  type = 'danger' 
}) {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)'
      }}
    >
      {/* Backdrop */}
      <div 
        onClick={onCancel}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          transition: 'opacity 0.2s ease-in-out'
        }}
      />
      
      {/* Modal Card */}
      <div 
        style={{
          position: 'relative',
          backgroundColor: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.05)',
          padding: '24px',
          overflow: 'hidden',
          boxSizing: 'border-box',
          transform: 'scale(1)',
          transition: 'transform 0.2s ease-out'
        }}
      >
        {/* Top visual accent */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '5px',
            background: type === 'danger' 
              ? 'linear-gradient(to right, #ef4444, #f43f5e)' 
              : 'linear-gradient(to right, #2563eb, #1d4ed8)'
          }}
        />

        <div 
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
            marginTop: '8px'
          }}
        >
          {/* Icon Badge */}
          <div 
            style={{
              padding: '12px',
              borderRadius: '12px',
              flexShrink: 0,
              backgroundColor: type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(37, 99, 235, 0.1)',
              color: type === 'danger' ? '#ef4444' : '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {type === 'danger' ? <AlertTriangle size={22} /> : <HelpCircle size={22} />}
          </div>

          <div style={{ flex: 1 }}>
            <h3 
              style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: '800',
                color: 'var(--text-primary, #1e293b)',
                fontFamily: 'var(--font-heading, sans-serif)',
                lineHeight: 1.3
              }}
            >
              {title}
            </h3>
            <p 
              style={{
                margin: '8px 0 0 0',
                fontSize: '0.85rem',
                fontWeight: '500',
                color: 'var(--text-secondary, #64748b)',
                lineHeight: 1.5,
                whiteSpace: 'pre-line'
              }}
            >
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div 
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            opacity: 0.95
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #e2e8f0)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary, #64748b)',
              fontWeight: '700',
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = 'var(--bg-card-hover, #f8fafc)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: type === 'danger'
                ? 'linear-gradient(to right, #ef4444, #f43f5e)'
                : 'linear-gradient(to right, #2563eb, #1d4ed8)',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              cursor: 'pointer',
              boxShadow: type === 'danger'
                ? '0 4px 12px rgba(239, 68, 68, 0.2)'
                : '0 4px 12px rgba(37, 99, 235, 0.2)',
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.9'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
