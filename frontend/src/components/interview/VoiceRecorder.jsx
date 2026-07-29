// src/components/interview/VoiceRecorder.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function VoiceRecorder({ onTranscriptionComplete, disabled, liveTranscript = "", setLiveTranscript }) {
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);
  const [supported, setSupported] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recognitionRef = useRef(null);
  const finalRef = useRef('');
  const timerRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      setError('Speech recognition not supported in this browser. Please type your answer below.');
      return;
    }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { setIsListening(true); setError(null); };
    recognition.onresult = (event) => {
      let interimText = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t + ' ';
        else interimText += t;
      }
      if (finalText) {
        finalRef.current = (finalRef.current + ' ' + finalText).trim();
        setLiveTranscript(finalRef.current);
      }
      setInterim(interimText);
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') setError('Microphone access blocked. Allow microphone in your browser settings.');
      else if (event.error === 'no-speech') setError('No speech detected. Try again or type your answer.');
      else if (event.error !== 'aborted') setError(`Mic error (${event.error}). Please try typing instead.`);
      setIsListening(false);
    };
    recognition.onend = () => { setIsListening(false); setInterim(''); };
    recognitionRef.current = recognition;
    return () => { try { recognitionRef.current?.abort(); } catch (e) {} };
  }, [setLiveTranscript]);

  // Duration timer
  useEffect(() => {
    if (isListening) {
      timerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isListening]);

  // Word count
  useEffect(() => {
    const text = (liveTranscript + ' ' + interim).trim();
    setWordCount(text ? text.split(/\s+/).filter(Boolean).length : 0);
  }, [liveTranscript, interim]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      finalRef.current = liveTranscript;
      setInterim('');
      setError(null);
      try { recognitionRef.current.start(); setIsListening(true); }
      catch (e) { setError('Could not start mic. Please type your answer.'); }
    }
  }, [isListening, liveTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const handleSubmit = () => {
    const text = (liveTranscript + (interim ? ' ' + interim : '')).trim();
    if (text && onTranscriptionComplete) {
      onTranscriptionComplete(text);
      finalRef.current = '';
      setLiveTranscript('');
      setInterim('');
    }
  };

  const handleClear = () => {
    finalRef.current = '';
    setLiveTranscript('');
    setInterim('');
  };

  const displayText = (liveTranscript + (interim ? ' ' + interim : '')).trim();

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="vr-root">
      {/* Header Row */}
      <div className="vr-header">
        <div className="vr-title">
          <span className="vr-title-icon">🎤</span>
          <span>Voice Answer Input</span>
          {!supported && <span className="badge badge-warning" style={{ marginLeft: 8, fontSize: '0.68rem' }}>Voice Unavailable</span>}
        </div>
        <div className="vr-meta">
          <span className="vr-word-count">{wordCount} words</span>
          {isListening && (
            <span className="vr-rec-timer">
              <span className="vr-rec-dot" />
              {formatDuration(recordingDuration)}
            </span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="vr-error-banner">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Central Recording Button */}
      {supported && (
        <div className="vr-center-controls">
          <button
            className={`vr-record-btn ${isListening ? 'recording' : ''}`}
            onClick={isListening ? stopListening : startListening}
            disabled={disabled}
            type="button"
            aria-label={isListening ? 'Stop recording' : 'Start recording'}
          >
            {/* Pulse rings while recording */}
            {isListening && (
              <>
                <span className="vr-pulse-ring ring-1" />
                <span className="vr-pulse-ring ring-2" />
                <span className="vr-pulse-ring ring-3" />
              </>
            )}
            <span className="vr-record-icon">
              {isListening ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23" strokeWidth="2" stroke="currentColor" fill="none"/>
                  <line x1="8" y1="23" x2="16" y2="23" strokeWidth="2" stroke="currentColor" fill="none"/>
                </svg>
              )}
            </span>
            <span className="vr-record-label">
              {isListening ? 'Stop' : 'Record'}
            </span>
          </button>

          {/* Waveform Visualizer */}
          {isListening && (
            <div className="vr-waveform" aria-hidden="true">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="vr-wave-bar" style={{ animationDelay: `${(i * 0.07).toFixed(2)}s` }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Live Transcript Edit Area */}
      <div className={`vr-transcript-area ${isListening ? 'active' : ''}`}>
        <div className="vr-transcript-label">
          {isListening ? (
            <span className="vr-listening-indicator">
              <span className="vr-dot-pulse" />
              Listening…
            </span>
          ) : (
            <span>Your answer — review &amp; edit before submitting</span>
          )}
          {displayText && !isListening && (
            <button className="vr-clear-btn" onClick={handleClear} type="button">✕ Clear</button>
          )}
        </div>
        <textarea
          className="vr-textarea"
          value={isListening ? displayText : liveTranscript}
          onChange={e => {
            setLiveTranscript(e.target.value);
            finalRef.current = e.target.value;
          }}
          placeholder={isListening
            ? '🔴 Transcribing your speech in real time…'
            : 'Your spoken words appear here. You can also type directly, or edit the transcript before submitting.'}
          disabled={disabled || isListening}
          rows={4}
        />
      </div>

      {/* Submit Row */}
      <button
        className="vr-submit-btn"
        onClick={handleSubmit}
        disabled={disabled || (!liveTranscript.trim() && !interim.trim()) || isListening}
        type="button"
      >
        <span>Submit Answer</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>

      <p className="vr-hint">
        💡 Speak clearly, then stop and review your transcript before submitting.
      </p>
    </div>
  );
}
