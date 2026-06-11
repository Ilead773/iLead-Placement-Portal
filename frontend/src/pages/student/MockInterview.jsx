// src/pages/student/MockInterview.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import interviewsAPI from '../../api/interviews';
import InterviewRoom from '../../components/interview/InterviewRoom';
import InterviewFeedback from '../../components/interview/InterviewFeedback';
import ProctoringInstructionGate from '../../components/interview/ProctoringInstructionGate';

export default function MockInterview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewSessionId = searchParams.get('view_session');

  // Setup state
  const [domains, setDomains] = useState([]);
  const [interviewTypes, setInterviewTypes] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState(() => sessionStorage.getItem('mi_selectedDomain') || '');
  const [selectedType, setSelectedType] = useState(() => sessionStorage.getItem('mi_selectedType') || '');
  const [useVoice, setUseVoice] = useState(() => {
    const val = sessionStorage.getItem('mi_useVoice');
    return val !== null ? JSON.parse(val) : true;
  });
  const [loading, setLoading] = useState(false);


  // Interview state
  // Note: 'history' and 'instructions' are view-only phases, do not restore them on reload
  const [phase, setPhase] = useState(() => {
    const saved = sessionStorage.getItem('mi_phase');
    if (!saved || saved === 'history' || saved === 'instructions' || saved === 'feedback' || saved === 'disqualified') return 'setup';
    return saved;
  });
  const [sessionId, setSessionId] = useState(() => {
    const val = sessionStorage.getItem('mi_sessionId');
    return val ? JSON.parse(val) : null;
  });
  const [currentQuestion, setCurrentQuestion] = useState(() => {
    const val = sessionStorage.getItem('mi_currentQuestion');
    return val ? JSON.parse(val) : null;
  });
  const [questionNumber, setQuestionNumber] = useState(() => {
    const val = sessionStorage.getItem('mi_questionNumber');
    return val ? parseInt(val, 10) : 0;
  });
  const [totalQuestions, setTotalQuestions] = useState(() => {
    const val = sessionStorage.getItem('mi_totalQuestions');
    return val ? parseInt(val, 10) : 0;
  });
  const [submitting, setSubmitting] = useState(false);
  const [interviewerReaction, setInterviewerReaction] = useState(() => sessionStorage.getItem('mi_interviewerReaction') || '');
  const [lastEvaluation, setLastEvaluation] = useState(() => {
    const val = sessionStorage.getItem('mi_lastEvaluation');
    return val ? JSON.parse(val) : null;
  });
  const [lastAnswerId, setLastAnswerId] = useState(() => {
    const val = sessionStorage.getItem('mi_lastAnswerId');
    return val ? JSON.parse(val) : null;
  });
  const [finalFeedback, setFinalFeedback] = useState(() => {
    const val = sessionStorage.getItem('mi_finalFeedback');
    return val ? JSON.parse(val) : null;
  });

  // History state
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Timer
  const [timer, setTimer] = useState(() => {
    const val = sessionStorage.getItem('mi_timer');
    return val ? parseInt(val, 10) : 0;
  });
  const timerRef = useRef(null);

  // Secure Proctoring & Fullscreen states & refs
  const [proctorWarnings, setProctorWarnings] = useState(() => {
    const val = sessionStorage.getItem('mi_proctorWarnings');
    return val ? parseInt(val, 10) : 0;
  });
  const [gazeStatus, setGazeStatus] = useState('Calibrating Gaze...');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastBlurWarningTime = useRef(0);
  const lastFaceWarningTime = useRef(0);
  const abandonSentRef = useRef(false);

  // Sync state to sessionStorage
  // Don't persist 'history' phase - it's a view-only state, always reset to 'setup' on reload
  useEffect(() => {
    if (phase === 'history') {
      sessionStorage.setItem('mi_phase', 'setup'); // reset so reload lands on setup
      fetchSessions();
    } else {
      sessionStorage.setItem('mi_phase', phase);
    }
  }, [phase]);

  // Intercept browser back button only during an active interview.
  // Do NOT block navigation on the rules/instructions screen; users should be able to leave normally.
  useEffect(() => {
    const handlePopState = (e) => {
      if (phase === 'active') {
        // Push state back so we stay on this page
        window.history.pushState(null, '', window.location.href);
        toast.error('You cannot leave during an active interview. Use the controls inside.', { icon: '🛡️', duration: 4000 });
      }
    };

    // Push initial state entry so back button fires popstate
    if (phase === 'active') {
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [phase]);

  useEffect(() => {
    if (selectedDomain) sessionStorage.setItem('mi_selectedDomain', selectedDomain);
    else sessionStorage.removeItem('mi_selectedDomain');
  }, [selectedDomain]);

  useEffect(() => {
    if (selectedType) sessionStorage.setItem('mi_selectedType', selectedType);
    else sessionStorage.removeItem('mi_selectedType');
  }, [selectedType]);

  useEffect(() => {
    sessionStorage.setItem('mi_useVoice', JSON.stringify(useVoice));
  }, [useVoice]);

  useEffect(() => {
    if (sessionId) sessionStorage.setItem('mi_sessionId', JSON.stringify(sessionId));
    else sessionStorage.removeItem('mi_sessionId');
  }, [sessionId]);

  useEffect(() => {
    if (currentQuestion) sessionStorage.setItem('mi_currentQuestion', JSON.stringify(currentQuestion));
    else sessionStorage.removeItem('mi_currentQuestion');
  }, [currentQuestion]);

  useEffect(() => {
    sessionStorage.setItem('mi_questionNumber', questionNumber.toString());
  }, [questionNumber]);

  useEffect(() => {
    sessionStorage.setItem('mi_totalQuestions', totalQuestions.toString());
  }, [totalQuestions]);

  useEffect(() => {
    sessionStorage.setItem('mi_interviewerReaction', interviewerReaction);
  }, [interviewerReaction]);

  useEffect(() => {
    if (lastEvaluation) sessionStorage.setItem('mi_lastEvaluation', JSON.stringify(lastEvaluation));
    else sessionStorage.removeItem('mi_lastEvaluation');
  }, [lastEvaluation]);

  useEffect(() => {
    if (lastAnswerId) sessionStorage.setItem('mi_lastAnswerId', JSON.stringify(lastAnswerId));
    else sessionStorage.removeItem('mi_lastAnswerId');
  }, [lastAnswerId]);

  useEffect(() => {
    if (finalFeedback) sessionStorage.setItem('mi_finalFeedback', JSON.stringify(finalFeedback));
    else sessionStorage.removeItem('mi_finalFeedback');
  }, [finalFeedback]);

  useEffect(() => {
    sessionStorage.setItem('mi_timer', timer.toString());
  }, [timer]);

  useEffect(() => {
    sessionStorage.setItem('mi_proctorWarnings', proctorWarnings.toString());
  }, [proctorWarnings]);

  useEffect(() => {
    fetchDomains();
  }, []);

  useEffect(() => {
    if (viewSessionId) {
      const loadSession = async () => {
        setLoading(true);
        try {
          const { data } = await interviewsAPI.getSessionDetail(viewSessionId);
          if (data.feedback) {
            setFinalFeedback(data.feedback);
            setPhase('feedback');
          } else {
            toast.error('Feedback is not generated for this session yet.');
          }
        } catch (e) {
          toast.error('Failed to load session details.');
        } finally {
          setLoading(false);
        }
      };
      loadSession();
    }
  }, [viewSessionId]);

  useEffect(() => {
    if (selectedDomain) {
      fetchInterviewTypes(selectedDomain);
    } else {
      setInterviewTypes([]);
      setSelectedType('');
    }
  }, [selectedDomain]);




  // Timer
  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [phase, questionNumber]);

  const fetchDomains = async () => {
    try {
      const { data } = await interviewsAPI.getDomains();
      setDomains(data);
    } catch (e) {
      toast.error('Failed to load domains');
    }
  };

  const fetchInterviewTypes = async (domainId) => {
    try {
      const { data } = await interviewsAPI.getInterviewTypes(domainId);
      setInterviewTypes(data);
    } catch (e) {
      toast.error('Failed to load interview types');
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const { data } = await interviewsAPI.getSessions();
      setSessions(data);
    } catch (e) {
      toast.error('Failed to load history');
    } finally {
      setLoadingSessions(false);
    }
  };

  const startInterview = async () => {
    if (!selectedType) return toast.error('Select an interview type');
    setLoading(true);
    try {
      const { data } = await interviewsAPI.startInterview(selectedType, useVoice);
      setSessionId(data.session_id);
      setCurrentQuestion(data.first_question);
      setQuestionNumber(1);
      setTotalQuestions(data.total_questions);
      setTimer(0);
      setInterviewerReaction(data.interviewer_intro || '');
      setLastEvaluation(null);
      setProctorWarnings(0);
      setGazeStatus('Calibrating Gaze...');
      setPhase('instructions');
      toast.success("Interview is ready. Please read the rules.");
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to start interview');
    } finally {
      setLoading(false);
    }
  };

  // Secure Fullscreen Launcher
  const launchSecureSession = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setPhase('active');
        toast.success("Interview started!");
      }).catch(err => {
        console.error("Fullscreen entry rejected:", err);
        toast.error("Failed to enter full screen. Please check browser settings.");
        // Fallback and allow them to take it anyway
        setPhase('active');
      });
    } else {
      setPhase('active');
    }
  };

  // 1. Fullscreen monitoring
  useEffect(() => {
    if (phase !== 'active') return;

    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      
      if (!isFull) {
        setProctorWarnings(w => {
          const nextW = w + 1;
          toast.error(`⚠️ Warning ${nextW} of 3: You left full screen! Please stay in full screen.`, {
            duration: 6000,
            icon: '🚨'
          });
          return nextW;
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    setIsFullscreen(!!document.fullscreenElement);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [phase]);

  // 2. Tab switching & window blur tracking
  useEffect(() => {
    if (phase !== 'active') return;

    const triggerBlurWarning = () => {
      const now = Date.now();
      if (now - lastBlurWarningTime.current < 4000) return;
      lastBlurWarningTime.current = now;

      setProctorWarnings(w => {
        const nextW = w + 1;
        toast.error(`⚠️ Warning ${nextW} of 3: Do not switch tabs or click away from the screen!`, {
          duration: 6000,
          icon: '🚫'
        });
        return nextW;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerBlurWarning();
      }
    };

    const handleWindowBlur = () => {
      triggerBlurWarning();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [phase]);

  // 3. Disqualification watchdog
  useEffect(() => {
    if (proctorWarnings >= 3 && phase === 'active') {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setPhase('disqualified');

      // Persist termination on backend so history doesn't keep showing "in_progress".
      if (sessionId && !abandonSentRef.current) {
        abandonSentRef.current = true;
        interviewsAPI.abandonSession(sessionId).catch(() => {});
      }
      toast.error("🚨 Interview closed: You had too many warnings.", {
        duration: 8000,
        icon: '🛑'
      });
    }
  }, [proctorWarnings, phase, sessionId]);

  // 4. Callback for MediaPipe Proctor events
  const handleProctorAlert = useCallback((type, message) => {
    if (phase !== 'active') return;
    const now = Date.now();
    
    if (type === 'face_absent') {
      if (now - lastFaceWarningTime.current < 6000) return;
      lastFaceWarningTime.current = now;

      setProctorWarnings(w => {
        const nextW = w + 1;
        toast.error(`⚠️ Warning ${nextW} of 3: Face not detected. Please look at the camera.`, {
          duration: 6000,
          icon: '👁️'
        });
        return nextW;
      });
    }
  }, [phase]);

  const handleGazeChange = useCallback((gaze) => {
    setGazeStatus(gaze);
  }, []);

  const preventMalpracticeDefaults = (e) => {
    e.preventDefault();
    toast.error("📋 Copying and pasting is not allowed.", {
      icon: '🔒'
    });
  };

  const preventContextMenu = (e) => {
    e.preventDefault();
    toast.error("🔒 Right-clicking is not allowed.", {
      icon: '🛡️'
    });
  };


  const pollForResults = async (answerId) => {
    try {
      const { data } = await interviewsAPI.checkAnswerStatus(answerId);
      
      if (data.status === 'done') {
        setLastEvaluation(data.evaluation);
        setInterviewerReaction(data.interviewer_reaction);
        setLastAnswerId(answerId);

        if (data.interview_complete) {
          if (data.final_feedback) {
            setFinalFeedback(data.final_feedback);
            setPhase('feedback');
            toast.success('Interview complete!');
            setSubmitting(false);
          } else {
            // Still generating final feedback, poll again
            setTimeout(() => pollForResults(answerId), 1500);
          }
        } else {
          // Move to next question after a short delay so they see the reaction
          setTimeout(() => {
            setCurrentQuestion(data.next_question);
            setQuestionNumber(data.next_question.number);
            setTimer(0);
            setSubmitting(false);
          }, 1000);
        }
      } else {
        // Still processing, poll again
        setTimeout(() => pollForResults(answerId), 1500);
      }
    } catch (e) {
      toast.error('Error polling for results');
      setSubmitting(false);
    }
  };

  const submitAnswer = async (answerText) => {
    if (submitting || !answerText.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await interviewsAPI.submitAnswer(
        sessionId, questionNumber, answerText, timer
      );

      // Start polling
      if (data.status === 'processing') {
        pollForResults(data.answer_id);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to submit answer');
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    // Clear all state in sessionStorage
    const keys = [
      'mi_phase', 'mi_selectedDomain', 'mi_selectedType', 'mi_useVoice',
      'mi_sessionId', 'mi_currentQuestion', 'mi_questionNumber', 'mi_totalQuestions',
      'mi_interviewerReaction', 'mi_lastEvaluation', 'mi_lastAnswerId',
      'mi_finalFeedback', 'mi_timer', 'mi_proctorWarnings'
    ];
    keys.forEach(k => sessionStorage.removeItem(k));

    setPhase('setup');
    setSelectedDomain('');
    setSelectedType('');
    setSessionId(null);
    setCurrentQuestion(null);
    setQuestionNumber(0);
    setTotalQuestions(0);
    setInterviewerReaction('');
    setLastEvaluation(null);
    setLastAnswerId(null);
    setFinalFeedback(null);
    setTimer(0);
    setProctorWarnings(0);
    navigate('/student/mock-interview');
  };

  const handleViewResults = async (sessionId) => {
    setLoading(true);
    try {
      const { data } = await interviewsAPI.getSessionDetail(sessionId);
      if (data.feedback) {
        setFinalFeedback(data.feedback);
        setPhase('feedback');
      } else {
        toast.error('Feedback is not generated for this session yet.');
      }
    } catch (e) {
      toast.error('Failed to load session details.');
    } finally {
      setLoading(false);
    }
  };

  const handleShowHistory = () => {
    setPhase('history');
    fetchSessions();
    navigate('/student/mock-interview');
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ─── RENDER: Setup Phase ──────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="dash-page animate-in">
        <div className="page-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="label-caps" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: 8, display: 'block' }}>
              ⚡ AI Mock Interview
            </span>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              🎯 Interview Prep Center
            </h1>
            <p className="text-relaxed" style={{ maxWidth: 650, marginTop: 8, color: 'var(--text-secondary)' }}>
              Evaluate your readiness with our advanced AI-driven mock interviewer. Real-time feedback, detailed dimension scoring, and behavioral assessment.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={handleShowHistory} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: 'var(--radius-md)' }}>
            📋 View History
          </button>
        </div>

        <div className="setup-layout-grid grid-responsive-1-6" style={{ alignItems: 'start' }}>
          
          {/* Left Column: Form Setup */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Step 1: Choose Domain */}
            <div className="card interview-setup-card" style={{ boxShadow: 'var(--shadow-md)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span style={{ background: 'var(--accent-soft)', color: 'var(--accent-primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.9rem' }}>1</span>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: '800' }}>Choose Professional Domain</h3>
              </div>
              <div className="domain-grid">
                {domains.map(d => (
                  <button
                    key={d.id}
                    className={`domain-card ${selectedDomain === d.id ? 'selected' : ''}`}
                    onClick={() => { setSelectedDomain(d.id); setSelectedType(''); }}
                    style={{
                      borderWidth: '2px',
                      borderRadius: 'var(--radius-md)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <span className="domain-icon" style={{ transform: selectedDomain === d.id ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.3s' }}>{d.icon}</span>
                    <span className="domain-name" style={{ marginTop: '4px' }}>{d.name}</span>
                    <span className="domain-meta">{d.interview_type_count} templates</span>
                    {selectedDomain === d.id && (
                      <span style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', background: 'var(--accent-primary)', borderRadius: '50%' }} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Choose Interview Type */}
            {selectedDomain && (
              <div className="card interview-setup-card" style={{ boxShadow: 'var(--shadow-md)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <span style={{ background: 'var(--accent-soft)', color: 'var(--accent-primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.9rem' }}>2</span>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: '800' }}>Select Interview Mode & Complexity</h3>
                </div>
                {interviewTypes.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No templates found for this domain.</p>
                ) : (
                  <div className="type-list">
                    {interviewTypes.map(t => (
                      <button
                        key={t.id}
                        className={`type-card ${selectedType === t.id ? 'selected' : ''}`}
                        onClick={() => setSelectedType(t.id)}
                        style={{
                          borderRadius: 'var(--radius-md)',
                          padding: '18px 24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div className="type-info">
                          <strong style={{ fontSize: '1.05rem', fontWeight: '800' }}>{t.name}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {selectedType === t.id && <span className="type-check" style={{ width: '24px', height: '24px', fontSize: '0.75rem' }}>✓</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Preferences */}
            {selectedType && (
              <div className="card interview-setup-card" style={{ boxShadow: 'var(--shadow-md)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <span style={{ background: 'var(--accent-soft)', color: 'var(--accent-primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.9rem' }}>3</span>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: '800' }}>Configure Preferences</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  <label className="voice-toggle-label" style={{ borderRadius: 'var(--radius-md)', padding: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'row', alignItems: 'start', gap: '16px' }}>
                    <input
                      type="checkbox"
                      checked={useVoice}
                      onChange={e => setUseVoice(e.target.checked)}
                      className="voice-checkbox"
                      style={{ marginTop: '4px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <span className="voice-toggle-text" style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                        🎤 Enable Voice Mode <span className="badge badge-success" style={{ marginLeft: 8, background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)' }}>Free Local Engine</span>
                      </span>
                      <span className="voice-toggle-hint" style={{ display: 'block', marginLeft: 0, marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Dictate answers directly via Google Chrome/Edge Web Speech API. Completely offline, high speed, and zero server usage.
                      </span>
                    </div>
                  </label>

                  <button
                    className="btn btn-primary btn-full"
                    style={{
                      marginTop: 12,
                      padding: '16px',
                      fontSize: '1.05rem',
                      fontWeight: '800',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--accent-gradient)',
                      border: 'none',
                      color: '#fff',
                      boxShadow: '0 8px 24px -6px rgba(249, 115, 22, 0.4)',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onClick={startInterview}
                    disabled={loading}
                  >
                    {loading ? 'Starting AI Session...' : '🚀 Start Official Session'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: AI Interviewer Profile (Visual Wow Factor) */}
          <div className="card" style={{ padding: '32px', boxShadow: 'var(--shadow-md)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '100px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', width: '110px', height: '110px', margin: '0 auto 16px' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb 0%, #dc2626 100%)', opacity: 0.12, filter: 'blur(8px)' }} />
                <div style={{ position: 'absolute', inset: '-4px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb 0%, #dc2626 100%)', padding: '3px' }}>
                  <div style={{ background: 'var(--bg-card)', width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                    🤖
                  </div>
                </div>
                <span style={{ position: 'absolute', bottom: '2px', right: '8px', width: '14px', height: '14px', background: 'var(--success)', border: '3px solid var(--bg-card)', borderRadius: '50%' }} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>iLEAD Placement Agent</h2>
              <span className="badge badge-success" style={{ display: 'inline-block', marginTop: '6px', fontSize: '0.7rem', fontWeight: '800', background: 'rgba(249, 115, 22, 0.08)', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Powered by Groq Llama-3
              </span>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>💡 Interview Guidelines</h4>
              <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: '1.5' }}>
                <li><strong>Technical Accuracy (60%):</strong> Prioritize factual correctness, frameworks, and system principles.</li>
                <li><strong>Response Depth (40%):</strong> Expand with design trade-offs, architecture, and structural rationale.</li>
                <li><strong>Honest AI Feedback:</strong> Evaluator grades with zero pity scores. Answers scored accurately based on standard industry criteria.</li>
                <li><strong>Voice Recognition:</strong> If Voice Mode is enabled, review transcripts before confirming each question.</li>
              </ul>
            </div>

            <div style={{ background: 'var(--border-light)', padding: '16px', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>🎯</span>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Your scores will contribute to your profile readiness index. A summary report is saved to your history feed instantly.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: Instructions Phase ──────────────────────────────
  if (phase === 'instructions') {
    const domainObj = domains.find(d => d.id === selectedDomain);
    const typeObj = interviewTypes.find(t => t.id === selectedType);
    return (
      <div className="dash-page secure-gate-page">
        <ProctoringInstructionGate
          onAccept={launchSecureSession}
          onCancel={handleRetry}
          domainName={domainObj?.name}
          typeName={typeObj?.name}
          loading={loading}
        />
      </div>
    );
  }

  // ─── RENDER: Active Interview ─────────────────────────────────
  if (phase === 'active') {
    return (
      <div 
        className="dash-page interview-room-page secure-fullscreen-wrapper"
        onCopy={preventMalpracticeDefaults}
        onCut={preventMalpracticeDefaults}
        onPaste={preventMalpracticeDefaults}
        onContextMenu={preventContextMenu}
      >
        <InterviewRoom 
          currentQuestion={currentQuestion}
          questionNumber={questionNumber}
          totalQuestions={totalQuestions}
          timer={timer}
          isSubmitting={submitting}
          interviewerReaction={interviewerReaction}
          onAnswerSubmit={submitAnswer}
          useVoice={useVoice}
          lastAnswerId={lastAnswerId}
          proctorWarnings={proctorWarnings}
          gazeStatus={gazeStatus}
          onProctorAlert={handleProctorAlert}
          onGazeChange={handleGazeChange}
          isActive={phase === 'active' && isFullscreen && proctorWarnings < 3}
        />

        {/* Fullscreen Exit Blocker Overlay */}
        {!isFullscreen && proctorWarnings < 3 && (
          <div className="fullscreen-exit-blocker-overlay animate-in">
            <div className="blocker-card glass-panel text-center">
              <div className="blocker-icon">🚨</div>
              <h2 className="blocker-title">Warning: Full Screen Closed</h2>
              <p className="blocker-desc">
                You closed full screen. The interview is paused.
                Please click the button below to go back to full screen and continue.
              </p>
              <button 
                className="btn btn-primary blocker-btn animate-pulse"
                onClick={() => {
                  const element = document.documentElement;
                  if (element.requestFullscreen) {
                    element.requestFullscreen().catch(() => {
                      toast.error("Failed to enter full screen. Please check browser settings.");
                    });
                  }
                }}
              >
                🔒 Go back to Full Screen
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── RENDER: Disqualified Phase ────────────────────────────────
  if (phase === 'disqualified') {
    return (
      <div className="disqualification-page animate-in">
        <div className="disqualification-card glass-panel text-center">
          <div className="dq-icon-box">
            <svg viewBox="0 0 24 24" width="72" height="72" stroke="var(--danger)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <span className="dq-badge">INTERVIEW STOPPED</span>
          <h1 className="dq-title">Interview Stopped</h1>
          <p className="dq-desc">
            Your interview was stopped because you got 
            <strong> {proctorWarnings} warnings</strong>.
          </p>

          <div className="dq-rules-list">
            <div className="dq-rule-status violated">
              <span className="status-bullet">❌</span>
              <div>
                <strong>Why did this happen?</strong>
                <p>You cannot switch tabs, minimize the window, leave the camera, or exit full screen mode during the interview.</p>
              </div>
            </div>
          </div>

          <div className="dq-divider" />

          <button 
            className="btn btn-secondary dq-btn"
            onClick={handleRetry}
          >
            ↩️ Go Back
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER: Feedback Phase ───────────────────────────────────
  if (phase === 'feedback' && finalFeedback) {
    return (
      <div className="dash-page">
        <InterviewFeedback
          feedback={finalFeedback}
          onRetry={handleRetry}
          onBackToHistory={handleShowHistory}
        />
      </div>
    );
  }

  // ─── RENDER: History Phase ────────────────────────────────────
  if (phase === 'history') {
    // Calculate simple metrics for the dashboard header
    const validScores = sessions.filter(s => s.total_score !== null && s.total_score !== undefined).map(s => s.total_score);
    const avgScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null;
    const maxScore = validScores.length > 0 ? Math.max(...validScores) : null;
    const completedCount = sessions.filter(s => s.status === 'completed').length;
    const voiceCount = sessions.filter(s => s.use_voice).length;

    return (
      <div className="dash-page animate-in">
        <div className="page-header" style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="label-caps" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>
              Candidate Dashboard
            </span>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              📋 Past Sessions
            </h1>
          </div>
          <button className="btn btn-primary" onClick={() => setPhase('setup')} style={{ padding: '12px 20px', borderRadius: 'var(--radius-md)' }}>
            + New Interview
          </button>
        </div>

        {/* Stats Overview */}
        {sessions.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '32px'
          }}>
            <div className="card" style={{ padding: '20px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Completed</span>
              <h3 style={{ margin: '6px 0 0', fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-primary)' }}>{completedCount} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/ {sessions.length}</span></h3>
            </div>
            <div className="card" style={{ padding: '20px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Average Rating</span>
              <h3 style={{ margin: '6px 0 0', fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                {avgScore !== null ? `${avgScore}%` : 'N/A'}
              </h3>
            </div>
            <div className="card" style={{ padding: '20px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Highest Score</span>
              <h3 style={{ margin: '6px 0 0', fontSize: '1.8rem', fontWeight: '900', color: 'var(--accent-primary)' }}>
                {maxScore !== null ? `${maxScore}%` : 'N/A'}
              </h3>
            </div>
            <div className="card" style={{ padding: '20px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Voice Interactions</span>
              <h3 style={{ margin: '6px 0 0', fontSize: '1.8rem', fontWeight: '900', color: 'var(--success)' }}>
                {voiceCount} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>sessions</span>
              </h3>
            </div>
          </div>
        )}

        {loadingSessions ? (
          <div className="loading-state">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '64px 32px', borderRadius: 'var(--radius-lg)' }}>
            <p style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎤</p>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: '800' }}>Start your first mock interview</h3>
            <p className="text-relaxed" style={{ maxWidth: '400px', margin: '8px auto 24px', color: 'var(--text-secondary)' }}>
              Practice answering professional domain-specific questions, receive instant scoring breakdown, and view target growth areas.
            </p>
            <button className="btn btn-primary" onClick={() => setPhase('setup')} style={{ padding: '12px 28px', borderRadius: 'var(--radius-md)' }}>
              Start Session Now
            </button>
          </div>
        ) : (
          <div className="sessions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {sessions.map(s => {
              const borderAccent = s.status === 'completed' 
                ? (s.total_score >= 70 ? 'var(--success)' : s.total_score >= 50 ? 'var(--warning)' : 'var(--danger)')
                : 'var(--border-color)';

              const statusBadgeClass = s.status === 'completed' ? 'badge-success' :
                s.status === 'pending_review' ? 'badge-warning' :
                s.status === 'in_progress' ? 'badge-warning' :
                s.status === 'abandoned' ? 'badge-danger' :
                'badge-neutral';

              const statusLabel = s.status === 'pending_review' ? 'pending review' :
                s.status === 'abandoned' ? 'terminated' :
                s.status === 'in_progress' ? 'in progress' :
                s.status;

              return (
                <div key={s.id} className="card session-card" style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between', 
                  minHeight: '170px',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--border-color)',
                  borderLeft: `5px solid ${borderAccent}`,
                  padding: '24px',
                  transition: 'all 0.3s'
                }}>
                  <div>
                    <div className="session-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <strong className="session-type" style={{ fontSize: '1.05rem', display: 'block', color: 'var(--text-primary)', fontWeight: '800' }}>{s.interview_type_name}</strong>
                        <span className="session-domain" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>{s.domain_name}</span>
                      </div>
                      <span className={`badge ${statusBadgeClass}`} style={{ textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: '800', whiteSpace: 'nowrap' }}>
                        {statusLabel}
                      </span>
                    </div>
                    {s.total_score !== null && s.total_score !== undefined && (
                      <div className="session-score" style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span className="session-score-value" style={{
                          fontSize: '1.8rem',
                          fontWeight: '900',
                          color: s.total_score >= 70 ? 'var(--success)' :
                                 s.total_score >= 50 ? 'var(--warning)' : 'var(--danger)'
                        }}>
                          {Math.round(s.total_score)}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>/100</span>
                      </div>
                    )}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '14px', marginTop: '16px' }}>
                    <div className="session-meta" style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>{s.use_voice ? '🎤 Voice Session' : '⌨️ Written Session'}</span>
                      <span>📅 {new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                    {(s.status === 'completed' || s.status === 'pending_review') && (
                      <button
                        className="btn btn-secondary btn-sm btn-full"
                        onClick={() => handleViewResults(s.id)}
                        style={{ padding: '10px', borderRadius: 'var(--radius-sm)', fontWeight: '700' }}
                      >
                        📊 View Results Dashboard
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ─── Text Answer Form (fallback for non-voice) ─────────────────

function TextAnswerForm({ onSubmit, disabled }) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    if (answer.trim()) {
      onSubmit(answer.trim());
      setAnswer('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <div className="text-answer-form">
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your answer here... (Ctrl+Enter to submit)"
        className="input-field text-answer-textarea"
        disabled={disabled}
      />
      <button
        className="btn btn-primary btn-full"
        onClick={handleSubmit}
        disabled={disabled || !answer.trim()}
      >
        {disabled ? 'Scoring...' : 'Submit Answer →'}
      </button>
    </div>
  );
}
