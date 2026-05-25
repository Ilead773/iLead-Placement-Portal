// src/components/interview/LiveTranscript.jsx
import React, { useEffect, useRef } from 'react';

export default function LiveTranscript({ transcript = "" }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const lines = transcript ? transcript.split(/(?<=[.!?])\s+/) : [];

  return (
    <div className="lt-root card">
      {/* Header */}
      <div className="lt-header">
        <div className="lt-title">
          <span className="lt-status-dot" />
          <span>Live Console</span>
        </div>
        <span className="lt-badge">TRANSCRIPT</span>
      </div>

      {/* Terminal body */}
      <div className="lt-body" ref={scrollRef}>
        <div className="lt-prompt-line">
          <span className="lt-prompt-prefix">system@ilead-ai</span>
          <span className="lt-prompt-sep">:</span>
          <span className="lt-prompt-path">~/interview</span>
          <span className="lt-prompt-dollar">$</span>
          <span className="lt-cmd">start_session --live-transcript</span>
        </div>

        {transcript ? (
          <>
            <div className="lt-log-line">
              <span className="lt-ts">[LIVE]</span>
              <span className="lt-log-label">candidate_input</span>
              <span className="lt-sep">→</span>
            </div>
            {lines.map((line, i) => (
              <p key={i} className="lt-line">
                <span className="lt-gt">&gt;</span>
                <span>{line.trim()}</span>
              </p>
            ))}
            <p className="lt-line">
              <span className="lt-gt">&gt;</span>
              <span className="lt-cursor-blink">█</span>
            </p>
          </>
        ) : (
          <div className="lt-idle">
            <span className="lt-idle-prefix">[IDLE]</span>
            <span>awaiting candidate transmission…</span>
            <span className="lt-cursor-blink">█</span>
          </div>
        )}
      </div>
    </div>
  );
}
