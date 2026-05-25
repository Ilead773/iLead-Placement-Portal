// src/components/interview/InterviewControls.jsx
import React, { useState } from 'react';
import VoiceRecorder from './VoiceRecorder';

export default function InterviewControls({ onAnswer, isSubmitting, useVoice, liveTranscript, setLiveTranscript }) {
  const [activeTab, setActiveTab] = useState(useVoice ? 'voice' : 'text');
  const wordCount = liveTranscript.trim() ? liveTranscript.trim().split(/\s+/).filter(Boolean).length : 0;

  const handleTextSubmit = () => {
    if (liveTranscript.trim()) {
      onAnswer(liveTranscript.trim());
      setLiveTranscript('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  return (
    <div className="ic-root">
      {/* Tab Toggle */}
      <div className="ic-tabs">
        <button
          className={`ic-tab ${activeTab === 'voice' ? 'active' : ''}`}
          onClick={() => setActiveTab('voice')}
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          </svg>
          Voice
        </button>
        <button
          className={`ic-tab ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTab('text')}
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="17" y1="10" x2="3" y2="10"/>
            <line x1="21" y1="6" x2="3" y2="6"/>
            <line x1="21" y1="14" x2="3" y2="14"/>
            <line x1="13" y1="18" x2="3" y2="18"/>
          </svg>
          Text
        </button>
        <div className="ic-tab-indicator" style={{ transform: activeTab === 'voice' ? 'translateX(0)' : 'translateX(100%)' }} />
      </div>

      {/* Panels */}
      <div className="ic-panel">
        {activeTab === 'voice' ? (
          <VoiceRecorder
            onTranscriptionComplete={onAnswer}
            disabled={isSubmitting}
            liveTranscript={liveTranscript}
            setLiveTranscript={setLiveTranscript}
          />
        ) : (
          <div className="ic-text-panel">
            <div className="ic-text-header">
              <span className="ic-text-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                Type your answer
              </span>
              <span className="ic-char-count" style={{ color: wordCount > 300 ? 'var(--danger)' : wordCount > 150 ? 'var(--warning)' : 'var(--text-muted)' }}>
                {wordCount} words
              </span>
            </div>
            <textarea
              className="ic-textarea"
              value={liveTranscript}
              onChange={e => setLiveTranscript(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer here... Press Ctrl+Enter to submit quickly."
              disabled={isSubmitting}
              rows={6}
              autoFocus
            />
            <div className="ic-text-footer">
              <span className="ic-shortcut-hint">
                <kbd>Ctrl</kbd><span>+</span><kbd>↵</kbd> to submit
              </span>
              <button
                className="ic-submit-btn"
                onClick={handleTextSubmit}
                disabled={isSubmitting || !liveTranscript.trim()}
                type="button"
              >
                {isSubmitting ? (
                  <>
                    <span className="ic-spinner" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    Submit Answer
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Submitting overlay */}
      {isSubmitting && (
        <div className="ic-thinking-overlay">
          <div className="ic-thinking-content">
            <div className="ic-thinking-spinner" />
            <span>AI is analyzing your response…</span>
          </div>
        </div>
      )}
    </div>
  );
}
