import React, { useState, useEffect } from 'react';
import AIInterviewer from './AIInterviewer';
import CandidateVideo from './CandidateVideo';
import InterviewControls from './InterviewControls';

export default function InterviewRoom({
  currentQuestion,
  questionNumber,
  totalQuestions,
  timer,
  isSubmitting,
  interviewerReaction,
  onAnswerSubmit,
  useVoice,
  lastAnswerId,
  proctorWarnings,
  gazeStatus,
  onProctorAlert,
  onGazeChange,
  isActive
}) {
  const [liveTranscript, setLiveTranscript] = useState('');

  // Automatically reset the live system console when moving to the next question
  useEffect(() => {
    setLiveTranscript('');
  }, [questionNumber]);

  const completionPercentage = Math.round((questionNumber / totalQuestions) * 100);

  return (
    <div className="room-fullscreen-hud">
      {/* 1. Absolute Center-Stage AI Avatar */}
      <div className="fs-avatar-stage animate-in">
        <AIInterviewer 
          reaction={interviewerReaction} 
          question={currentQuestion?.text}
          isThinking={isSubmitting}
          evalId={lastAnswerId}
        />
      </div>

      {/* 2. Floating Top HUD Stats Bar */}
      <div className="fs-hud-top-bar glass-panel">
        <div className="fs-hud-logo">
          <span className="fs-hud-logo-dot"></span>
          <span className="fs-hud-logo-text">iLEAD SECURE HUD v2.5</span>
        </div>
        
        <div className="fs-hud-progress">
          <span className="fs-hud-q-label">Question {questionNumber} of {totalQuestions}</span>
          <div className="fs-hud-progress-track">
            <div 
              className="fs-hud-progress-fill" 
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <span className="fs-hud-percent">{completionPercentage}%</span>
        </div>

        <div className="fs-hud-stats">
          <div className="fs-hud-stat-pill timer">
            <span className="stat-dot pulse-amber"></span>
            <span className="stat-val">{formatTime(timer)}</span>
          </div>

          <div className={`fs-hud-stat-pill warnings ${proctorWarnings > 0 ? 'active' : ''}`}>
            <span className={`stat-dot ${proctorWarnings > 0 ? 'pulse-red' : 'green'}`}></span>
            <span className="stat-val">{proctorWarnings} / 3 Warnings</span>
          </div>
        </div>
      </div>

      {/* 3. Floating Left Column: Question Card & Transcript */}
      <div className="fs-left-panel">
        {/* Floating Question Card */}
        <div className="fs-question-card glass-panel animate-in">
          <div className="fs-card-header">
            <span className="fs-card-badge">CURRENT QUESTION</span>
          </div>
          <h2 className="fs-question-text">{currentQuestion?.text}</h2>
        </div>
      </div>

      {/* 4. Floating Right Column: Proctoring Camera HUD & Controls */}
      <div className="fs-right-panel">
        {/* Candidate Video containing the MediaPipe Canvas and Face Mesh */}
        <CandidateVideo 
          onProctorAlert={onProctorAlert}
          onGazeChange={onGazeChange}
          isActive={isActive}
        />



        {/* Floating Controls Console */}
        <InterviewControls 
          onAnswer={onAnswerSubmit}
          isSubmitting={isSubmitting}
          useVoice={useVoice}
          liveTranscript={liveTranscript}
          setLiveTranscript={setLiveTranscript}
        />
      </div>
    </div>
  );
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
