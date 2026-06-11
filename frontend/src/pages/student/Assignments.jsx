import React, { useEffect, useMemo, useState, useRef } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  ClipboardList, 
  AlertTriangle, 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Lock, 
  Check, 
  Award,
  AlertCircle
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const badgeClass = {
  assigned: 'badge-info',
  submitted: 'badge-success',
  expired: 'badge-danger',
};

// SVG Circular Progress Chart for Results Page
const CircularProgress = ({ percentage, score, total, size = 160, strokeWidth = 12 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          stroke="var(--border-color, #e2e8f0)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke="var(--accent-primary, #2563eb)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{percentage}%</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{score} / {total} pts</span>
      </div>
    </div>
  );
};

export default function StudentAssignments() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [gridOpen, setGridOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Navigation & View States
  // 'list' = Dashboard/Grid of Assignments
  // 'intro' = Start/Instructions page for selected assignment
  // 'taking' = Active test-taking (fullscreen mode)
  // 'results' = Performance card / detail view of completed MCQ
  const [viewState, setViewState] = useState('list'); 
  const [assignments, setAssignments] = useState([]);
  const [active, setActive] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  // Active Test State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null); // in seconds
  const [infractions, setInfractions] = useState(0);
  const [warningVisible, setWarningVisible] = useState(false);
  const [visitedQuestions, setVisitedQuestions] = useState(new Set());

  // Refs for tracking values inside window listeners to avoid stale closures
  const answersRef = useRef({});
  const activeRef = useRef(null);
  const lastInfractionTime = useRef(0);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const loadAssignments = async () => {
    try {
      const { data } = await api.get('/me/learning-assignments/');
      setAssignments(data || []);
    } catch (err) {
      toast.error('Could not load assignments.');
    }
  };

  useEffect(() => {
    loadAssignments()
      .finally(() => setLoading(false));
  }, []);

  // Open an assignment, fetch details, and map viewState accordingly
  const openAssignment = async (id, targetState = null) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/me/learning-assignments/${id}/`);
      setActive(data);
      
      // Load existing answers if any
      const existing = {};
      (data.answers || []).forEach((answer) => {
        existing[answer.question] = answer.selected_option;
      });
      setAnswers(existing);

      if (targetState) {
        setViewState(targetState);
      } else {
        if (data.status === 'submitted') {
          setViewState('results');
        } else if (data.status === 'expired') {
          toast.error('This assignment has expired and cannot be taken.');
          setViewState('list');
        } else {
          setViewState('intro');
        }
      }
    } catch (err) {
      toast.error('Could not load assignment details.');
    } finally {
      setLoading(false);
    }
  };

  const activeQuestions = active?.questions || [];

  // Determine if all questions have been answered
  const allAnswered = useMemo(() => {
    return activeQuestions.length > 0 && activeQuestions.every((q) => answers[q.id] !== undefined);
  }, [activeQuestions, answers]);

  // Track visited questions to color navigation grid
  useEffect(() => {
    if (viewState === 'taking' && activeQuestions.length > 0) {
      const currentQId = activeQuestions[currentQuestionIndex]?.id;
      if (currentQId) {
        setVisitedQuestions((prev) => {
          const next = new Set(prev);
          next.add(currentQId);
          return next;
        });
      }
    }
  }, [viewState, currentQuestionIndex, activeQuestions]);

  // Timer countdown hook
  useEffect(() => {
    if (viewState !== 'taking' || timeRemaining === null) return;
    if (timeRemaining <= 0) {
      autoSubmitOnTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          autoSubmitOnTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [viewState, timeRemaining]);

  // Infraction Listeners (Visibility change, Window blurs, Fullscreen exits)
  useEffect(() => {
    if (viewState !== 'taking') return;

    const registerInfraction = () => {
      const now = Date.now();
      // Throttle infractions to 1.5 seconds to prevent multiple duplicate firings
      if (now - lastInfractionTime.current < 1500) return;
      lastInfractionTime.current = now;

      setInfractions((prev) => {
        const nextVal = prev + 1;
        if (nextVal >= 3) {
          autoSubmitOnInfractionsExceeded();
          return nextVal;
        } else {
          setWarningVisible(true);
          // Try to keep/re-request fullscreen if possible, or lock the UI
          return nextVal;
        }
      });
    };

    const handleFullscreenChange = () => {
      // If we exit fullscreen and the warning or test is active
      if (!document.fullscreenElement) {
        registerInfraction();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        registerInfraction();
      }
    };

    const handleBlur = () => {
      registerInfraction();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [viewState]);

  // Submit operations
  const submitExam = async (isAuto = false, infractionSub = false, timeOutSub = false) => {
    const currentActive = activeRef.current || active;
    const currentAnswers = answersRef.current || answers;
    
    if (!currentActive) return;

    try {
      // Exit fullscreen mode
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      
      setLoading(true);
      const { data } = await api.post(`/me/learning-assignments/${currentActive.id}/submit/`, { 
        answers: currentAnswers 
      });

      if (infractionSub) {
        toast.error('Assignment automatically submitted due to security violations.', { duration: 5000 });
      } else if (timeOutSub) {
        toast.success("Time's up! Your answers have been submitted.", { duration: 4000 });
      } else {
        toast.success(`Exam submitted successfully! Score: ${data.score}/${data.total_points}`);
      }

      await loadAssignments();
      
      // Pull fresh submitted details (which includes correct answer keys)
      const detailResp = await api.get(`/me/learning-assignments/${currentActive.id}/`);
      setActive(detailResp.data);
      setViewState('results');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not submit assignment.');
      setViewState('list');
    } finally {
      setLoading(false);
      setWarningVisible(false);
    }
  };

  const autoSubmitOnTimeUp = () => {
    submitExam(true, false, true);
  };

  const autoSubmitOnInfractionsExceeded = () => {
    submitExam(true, true, false);
  };

  // Launch test and trigger fullscreen
  const startExam = () => {
    if (!active) return;
    
    // Set timer from assignment minutes
    setTimeRemaining(active.duration_minutes * 60);
    setInfractions(0);
    setWarningVisible(false);
    setCurrentQuestionIndex(0);
    setVisitedQuestions(new Set());

    // Switch view
    setViewState('taking');

    // Trigger Fullscreen
    setTimeout(() => {
      const container = document.getElementById('exam-fullscreen-container');
      if (container && container.requestFullscreen) {
        container.requestFullscreen().catch(() => {
          toast.error('Fullscreen required. Please allow fullscreen mode.');
        });
      }
    }, 100);
  };

  // Resume/Re-enter Fullscreen button inside warning modal
  const resumeFullscreen = () => {
    const container = document.getElementById('exam-fullscreen-container');
    if (container && container.requestFullscreen) {
      container.requestFullscreen()
        .then(() => {
          setWarningVisible(false);
        })
        .catch(() => {
          toast.error('Could not re-enter fullscreen. Please try again.');
        });
    } else {
      setWarningVisible(false);
    }
  };

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    if (seconds === null) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading && viewState === 'list') {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. LIST VIEW (DASHBOARD)                                     */}
      {/* ──────────────────────────────────────────────────────────── */}
      {viewState === 'list' && (
        <div className="page-container">
          <div className="page-header" style={{ marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Learning Assessments</h1>
              <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Access your course MCQ assignments, track progress, and review scores.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Assigned Section */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                <div style={{ padding: 8, borderRadius: 8, background: 'rgba(37, 99, 235, 0.08)', color: 'var(--accent-primary)' }}>
                  <Play size={18} />
                </div>
                <h3 style={{ margin: 0, fontWeight: 700 }}>Pending Assessments</h3>
              </div>
              <div style={{ display: 'grid', gap: 14 }}>
                {assignments.filter(a => a.status === 'assigned').map((assignment) => (
                  <div 
                    key={assignment.id} 
                    style={{ 
                      padding: 16, 
                      borderRadius: 12, 
                      border: '1px solid var(--border-color)', 
                      background: 'var(--bg-body)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    className="hover-card"
                  >
                    <div>
                      <span className="badge badge-info" style={{ marginBottom: 8, fontSize: '0.75rem', fontWeight: 700 }}>{assignment.course}</span>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700 }}>{assignment.assignment_title}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {assignment.assignment_description || 'No description provided.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {assignment.duration_minutes} mins</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> Due: {assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : 'No deadline'}</span>
                    </div>

                    <button 
                      className="btn btn-primary" 
                      style={{ width: '100%', justifyContent: 'center', borderRadius: 8 }}
                      onClick={() => openAssignment(assignment.id)}
                    >
                      Start Assessment
                    </button>
                  </div>
                ))}
                {assignments.filter(a => a.status === 'assigned').length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={32} style={{ color: 'var(--success)', opacity: 0.6, marginBottom: 8 }} />
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>Awesome! You have no pending assignments.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Completed & Expired Section */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                <div style={{ padding: 8, borderRadius: 8, background: 'rgba(16, 185, 129, 0.08)', color: 'var(--success)' }}>
                  <Award size={18} />
                </div>
                <h3 style={{ margin: 0, fontWeight: 700 }}>Results & History</h3>
              </div>
              <div style={{ display: 'grid', gap: 14 }}>
                {assignments.filter(a => a.status !== 'assigned').map((assignment) => {
                  const isSubmitted = assignment.status === 'submitted';
                  return (
                    <div 
                      key={assignment.id} 
                      style={{ 
                        padding: 16, 
                        borderRadius: 12, 
                        border: '1px solid var(--border-color)', 
                        background: 'var(--bg-body)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <span className="badge badge-neutral" style={{ marginBottom: 8, fontSize: '0.75rem' }}>{assignment.course}</span>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700 }}>{assignment.assignment_title}</h4>
                        </div>
                        <span className={`badge ${badgeClass[assignment.status] || 'badge-neutral'}`} style={{ textTransform: 'capitalize' }}>
                          {assignment.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {isSubmitted && assignment.score !== null ? (
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-primary)' }}>
                              Score: {assignment.score}/{assignment.total_points} ({assignment.percentage}%)
                            </span>
                          ) : (
                            <span>Expired on: {assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : '-'}</span>
                          )}
                        </div>
                        
                        {isSubmitted ? (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', borderRadius: 6, fontSize: '0.82rem' }}
                            onClick={() => openAssignment(assignment.id, 'results')}
                          >
                            View Report
                          </button>
                        ) : (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', borderRadius: 6, fontSize: '0.82rem' }}
                            disabled
                          >
                            Locked
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {assignments.filter(a => a.status !== 'assigned').length === 0 && (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>No history records found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. INTRO VIEW (START PAGE WITH RULES)                        */}
      {/* ──────────────────────────────────────────────────────────── */}
      {viewState === 'intro' && active && (
        <div className="page-container" style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
          <button 
            onClick={() => setViewState('list')} 
            className="btn btn-secondary" 
            style={{ marginBottom: 20, alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 8 }}
          >
            <ChevronLeft size={16} /> Back to List
          </button>

          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, var(--accent-primary, #2563eb), #1d4ed8)', 
              color: '#ffffff', 
              padding: isMobile ? '24px 16px' : '36px 32px',
              position: 'relative'
            }}>
              <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', padding: '4px 10px', borderRadius: 12 }}>
                {active.course}
              </span>
              <h2 style={{ color: '#ffffff', margin: '12px 0 6px 0', fontSize: '2rem', fontWeight: 800 }}>{active.assignment_title}</h2>
              <p style={{ color: 'rgba(255,255,255,0.85)', margin: 0, fontSize: '1rem', lineHeight: 1.5 }}>
                {active.assignment_description || 'MCQ learning assessment to test your understanding of the course syllabus.'}
              </p>
            </div>

            <div style={{ padding: isMobile ? 16 : 32 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 32 }}>
                <div style={{ border: '1px solid var(--border-color)', padding: 14, borderRadius: 10, textAlign: 'center' }}>
                  <Clock size={20} style={{ color: 'var(--accent-primary)', marginBottom: 6 }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Time Limit</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{active.duration_minutes} Minutes</div>
                </div>
                <div style={{ border: '1px solid var(--border-color)', padding: 14, borderRadius: 10, textAlign: 'center' }}>
                  <ClipboardList size={20} style={{ color: 'var(--accent-primary)', marginBottom: 6 }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Questions</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{activeQuestions.length} MCQs</div>
                </div>
                <div style={{ border: '1px solid var(--border-color)', padding: 14, borderRadius: 10, textAlign: 'center' }}>
                  <Award size={20} style={{ color: 'var(--accent-primary)', marginBottom: 6 }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Points</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                    {activeQuestions.reduce((sum, q) => sum + (q.points || 1), 0)} Points
                  </div>
                </div>
              </div>

              {/* Rules & Warnings */}
              <div style={{ backgroundColor: 'var(--bg-body)', border: '1px dashed var(--warning)', borderRadius: 12, padding: 20, marginBottom: 32 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warning)', fontSize: '1.15rem', fontWeight: 700, margin: '0 0 14px 0' }}>
                  <AlertTriangle size={20} /> Integrity Rules & Guidelines
                </h3>
                <ul style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 10, fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                  <li>
                    <strong>Mandatory Fullscreen Mode:</strong> You must take this assessment in fullscreen. Do not exit fullscreen.
                  </li>
                  <li>
                    <strong>Focus Enforcement:</strong> Do not switch browser tabs, open other applications, or focus away from the test window.
                  </li>
                  <li>
                    <strong>3 Infractions Max Limit:</strong> Exiting fullscreen or switching windows 3 times will trigger **automatic instant submission** of whatever questions you have answered.
                  </li>
                  <li>
                    <strong>Timer:</strong> A countdown timer is active. If the timer reaches zero, the test will automatically submit.
                  </li>
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setViewState('list')} style={{ borderRadius: 8, padding: '10px 20px' }}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={startExam} style={{ borderRadius: 8, padding: '10px 24px', fontWeight: 700 }}>
                  <Play size={16} /> Enter Fullscreen & Start
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. ACTIVE TEST-TAKING ENVIRONMENT (FULLSCREEN)              */}
      {/* ──────────────────────────────────────────────────────────── */}
      {viewState === 'taking' && active && (
        <div 
          id="exam-fullscreen-container" 
          style={{ 
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-body, #f8fafc)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'row',
            overflow: 'hidden',
            fontFamily: 'var(--font-body)',
            color: 'var(--text-primary)'
          }}
        >
          {/* Mobile Backdrop Overlay when Grid is open */}
          {isMobile && gridOpen && (
            <div 
              onClick={() => setGridOpen(false)}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(2px)',
                zIndex: 99
              }}
            />
          )}

          {/* Left panel: Questions navigation grid */}
          <div style={{ 
            width: 280, 
            borderRight: isMobile ? 'none' : '1px solid var(--border-color)', 
            background: 'var(--bg-card)', 
            display: (!isMobile || gridOpen) ? 'flex' : 'none', 
            flexDirection: 'column', 
            overflowY: 'auto',
            padding: 24,
            flexShrink: 0,
            position: isMobile ? 'absolute' : 'relative',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 100,
            boxShadow: isMobile ? '0 10px 30px rgba(0,0,0,0.15)' : 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Question Grid</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>Jump directly to any question</p>
              </div>
              {isMobile && (
                <button 
                  onClick={() => setGridOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                >
                  <X size={20} />
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
              {activeQuestions.map((question, index) => {
                const isCurrent = index === currentQuestionIndex;
                const isAnswered = answers[question.id] !== undefined;
                const isVisited = visitedQuestions.has(question.id);

                let bg = 'transparent';
                let border = '2px solid var(--border-color)';
                let color = 'var(--text-primary)';

                if (isAnswered) {
                  bg = 'var(--accent-primary)';
                  border = '2px solid var(--accent-primary)';
                  color = '#ffffff';
                } else if (isVisited) {
                  bg = 'rgba(245, 158, 11, 0.1)';
                  border = '2px solid var(--warning)';
                  color = 'var(--warning)';
                }

                if (isCurrent) {
                  border = isAnswered ? '2px solid var(--text-primary)' : '2px solid var(--accent-primary)';
                  if (!isAnswered) {
                    color = 'var(--accent-primary)';
                  }
                }

                return (
                  <button
                    key={question.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    style={{
                      height: 44,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      background: bg,
                      border: border,
                      color: color,
                      transition: 'all 0.15s ease',
                      outline: 'none',
                      transform: isCurrent ? 'scale(1.05)' : 'none',
                      boxShadow: isCurrent ? '0 4px 10px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: 16, display: 'grid', gap: 10, fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--accent-primary)' }} />
                <span>Answered ({Object.keys(answers).length})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(245, 158, 11, 0.1)', border: '2px solid var(--warning)' }} />
                <span>Visited but Empty</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: 'transparent', border: '2px solid var(--border-color)' }} />
                <span>Unvisited</span>
              </div>
            </div>
          </div>

          {/* Right panel: Question screen */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Top Stats Bar */}
            <div style={{ 
              height: 70, 
              borderBottom: '1px solid var(--border-color)', 
              background: 'var(--bg-card)', 
              padding: isMobile ? '0 12px' : '0 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              {!isMobile ? (
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>{active.assignment_title}</h3>
                </div>
              ) : (
                <button 
                  onClick={() => setGridOpen(true)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 800 }}
                >
                  Grid
                </button>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 24 }}>
                {/* Security display */}
                <div style={{ 
                  display: isMobile ? 'none' : 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  backgroundColor: infractions > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                  padding: '6px 12px',
                  borderRadius: 6,
                  color: infractions > 0 ? 'var(--danger)' : 'var(--success)',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}>
                  <Lock size={14} />
                  <span>Violations: {infractions} / 3</span>
                </div>

                {/* Timer Display */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  color: (timeRemaining !== null && timeRemaining < 300) ? 'var(--danger)' : 'var(--text-primary)',
                  fontWeight: 800,
                  fontSize: isMobile ? '1rem' : '1.2rem',
                  fontFamily: 'monospace'
                }}>
                  <Clock size={18} style={{ color: (timeRemaining !== null && timeRemaining < 300) ? 'var(--danger)' : 'var(--accent-primary)' }} />
                  <span>{formatTime(timeRemaining)}</span>
                </div>

                <button 
                  className="btn btn-primary" 
                  onClick={() => submitExam(false)}
                  style={{ borderRadius: 6, padding: isMobile ? '6px 12px' : '8px 18px', fontSize: isMobile ? '0.78rem' : '1rem', fontWeight: 700 }}
                >
                  {isMobile ? 'Submit' : 'Submit Exam'}
                </button>
              </div>
            </div>

            {/* Time progress bar */}
            {active && timeRemaining !== null && (
              <div style={{ 
                height: 4, 
                width: '100%', 
                background: 'var(--border-color)', 
                flexShrink: 0 
              }}>
                <div style={{ 
                  height: '100%', 
                  width: `${(timeRemaining / (active.duration_minutes * 60)) * 100}%`,
                  background: timeRemaining < 300 ? 'var(--danger)' : 'var(--accent-primary)',
                  transition: 'width 1s linear'
                }} />
              </div>
            )}

            {/* Active Question Panel */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '48px 32px' }}>
              {activeQuestions.length > 0 && activeQuestions[currentQuestionIndex] && (
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'baseline', 
                    marginBottom: 16,
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }}>
                    <span>QUESTION {currentQuestionIndex + 1} OF {activeQuestions.length}</span>
                    <span>{activeQuestions[currentQuestionIndex].points || 1} Point(s)</span>
                  </div>

                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.4, marginBottom: 28 }}>
                    {activeQuestions[currentQuestionIndex].prompt}
                  </h2>

                  <div style={{ display: 'grid', gap: 14 }}>
                    {activeQuestions[currentQuestionIndex].options.map((option, optionIndex) => {
                      const isSelected = answers[activeQuestions[currentQuestionIndex].id] === optionIndex;
                      
                      return (
                        <div
                          key={optionIndex}
                          onClick={() => {
                            setAnswers((prev) => ({
                              ...prev,
                              [activeQuestions[currentQuestionIndex].id]: optionIndex
                            }));
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            padding: '18px 20px',
                            borderRadius: 12,
                            border: isSelected ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)',
                            background: isSelected ? 'var(--accent-soft)' : 'var(--bg-card)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            transform: isSelected ? 'translateY(-2px)' : 'none',
                            boxShadow: isSelected ? 'var(--shadow-md)' : 'none'
                          }}
                          className="hover-card"
                        >
                          <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            border: isSelected ? '6px solid var(--accent-primary)' : '2px solid var(--text-muted)',
                            background: '#ffffff',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                          }} />
                          <span style={{ fontSize: '1.05rem', fontWeight: isSelected ? 700 : 500 }}>
                            {option}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Nav Footer */}
            <div style={{ 
              height: 76, 
              borderTop: '1px solid var(--border-color)', 
              background: 'var(--bg-card)', 
              padding: '0 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                style={{ padding: '10px 18px', borderRadius: 8 }}
              >
                <ChevronLeft size={16} /> Previous
              </button>

              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Answered {Object.keys(answers).length} / {activeQuestions.length}
              </span>

              {currentQuestionIndex < activeQuestions.length - 1 ? (
                <button
                  className="btn btn-secondary"
                  onClick={() => setCurrentQuestionIndex(prev => Math.min(activeQuestions.length - 1, prev + 1))}
                  style={{ padding: '10px 18px', borderRadius: 8 }}
                >
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => submitExam(false)}
                  style={{ padding: '10px 24px', borderRadius: 8, fontWeight: 700 }}
                >
                  Finish Exam
                </button>
              )}
            </div>
          </div>

          {/* Warning Overlay Lockscreen Modal */}
          {warningVisible && (
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(9, 9, 11, 0.95)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24
            }}>
              <div className="card" style={{ 
                maxWidth: 480, 
                width: '100%', 
                padding: 32, 
                textAlign: 'center', 
                border: '1px solid var(--danger)',
                boxShadow: '0 20px 50px rgba(239, 68, 68, 0.15)' 
              }}>
                <div style={{ 
                  width: 64, 
                  height: 64, 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                  color: 'var(--danger)', 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20
                }}>
                  <AlertTriangle size={36} />
                </div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger)', margin: '0 0 10px 0' }}>
                  Security Violations Logged
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, margin: '0 0 24px 0' }}>
                  You exited fullscreen or switched tabs/windows. This is a security violation. 
                  If you violate focus rules again, your test will be **submitted immediately**.
                </p>
                <div style={{ 
                  backgroundColor: 'var(--bg-body)', 
                  padding: '12px 18px', 
                  borderRadius: 8, 
                  fontWeight: 700, 
                  marginBottom: 28,
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}>
                  Current Infraction: {infractions} / 3 Limits
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={resumeFullscreen}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', borderRadius: 8, fontWeight: 700 }}
                >
                  Resume in Fullscreen
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. PERFORMANCE RESULTS REPORT VIEW                           */}
      {/* ──────────────────────────────────────────────────────────── */}
      {viewState === 'results' && active && (
        <div className="page-container" style={{ maxWidth: 840, margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <button 
              onClick={() => setViewState('list')} 
              className="btn btn-secondary" 
              style={{ padding: '8px 14px', borderRadius: 8 }}
            >
              <ChevronLeft size={16} /> Back to Dashboard
            </button>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Completed: {active.submitted_at ? new Date(active.submitted_at).toLocaleString() : ''}
            </span>
          </div>

          {/* Results Summary Card */}
          <div className="card" style={{ padding: isMobile ? 16 : 32, marginBottom: 24, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: 32, alignItems: 'center' }}>
              <div>
                <span className="badge badge-success" style={{ marginBottom: 12, fontWeight: 800 }}>ASSESSMENT REPORT</span>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 8px 0' }}>{active.assignment_title}</h2>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0', fontSize: '0.95rem', lineHeight: 1.5 }}>
                  {active.assignment_description || 'Course learning metrics and correct answers review.'}
                </p>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ background: 'var(--bg-body)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Course</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{active.course}</span>
                  </div>
                  <div style={{ background: 'var(--bg-body)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Time Spent</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{active.duration_minutes} Minutes Max</span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
                <CircularProgress 
                  percentage={active.percentage || 0} 
                  score={active.score || 0} 
                  total={active.total_points || 0} 
                />
              </div>
            </div>
          </div>

          {/* Question Review Section */}
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
            Question Review & Answer Sheet
          </h3>

          <div style={{ display: 'grid', gap: 16 }}>
            {activeQuestions.map((question, index) => {
              const selectedOpt = answers[question.id];
              const correctOpt = question.correct_option;
              const isCorrect = selectedOpt === correctOpt;

              return (
                <div 
                  key={question.id}
                  style={{
                    padding: 24,
                    borderRadius: 12,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.4 }}>
                      {index + 1}. {question.prompt}
                    </h4>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      padding: '4px 10px', 
                      borderRadius: 12,
                      backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      color: isCorrect ? 'var(--success)' : 'var(--danger)',
                      border: isCorrect ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                      flexShrink: 0
                    }}>
                      {isCorrect ? `+${question.points || 1} Pts` : '0 Pts'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    {question.options.map((option, optionIndex) => {
                      const isSelected = selectedOpt === optionIndex;
                      const isCorrectAnswer = correctOpt === optionIndex;
                      const isIncorrectSelection = isSelected && !isCorrectAnswer;

                      let border = '1px solid var(--border-color)';
                      let background = 'transparent';
                      let color = 'var(--text-primary)';

                      if (isCorrectAnswer) {
                        border = '2px solid var(--success)';
                        background = 'rgba(16, 185, 129, 0.04)';
                        color = 'var(--success)';
                      } else if (isIncorrectSelection) {
                        border = '2px solid var(--danger)';
                        background = 'rgba(239, 68, 68, 0.04)';
                        color = 'var(--danger)';
                      }

                      return (
                        <div 
                          key={optionIndex}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 16px',
                            borderRadius: 8,
                            border: border,
                            backgroundColor: background,
                            color: color,
                            fontSize: '0.95rem',
                            fontWeight: (isSelected || isCorrectAnswer) ? 700 : 400
                          }}
                        >
                          {isCorrectAnswer ? (
                            <Check size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                          ) : isIncorrectSelection ? (
                            <X size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                          ) : (
                            <span style={{ width: 16, height: 16, border: '1px solid var(--text-muted)', borderRadius: '50%', flexShrink: 0 }} />
                          )}
                          
                          <span>{option}</span>

                          {isCorrectAnswer && (
                            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--success)', fontWeight: 800 }}>
                              Correct Option
                            </span>
                          )}

                          {isIncorrectSelection && (
                            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--danger)', fontWeight: 800 }}>
                              Your Answer (Incorrect)
                            </span>
                          )}

                          {isSelected && isCorrectAnswer && (
                            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--success)', fontWeight: 800 }}>
                              Your Answer (Correct)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
            <button 
              className="btn btn-primary" 
              onClick={() => setViewState('list')}
              style={{ padding: '12px 36px', borderRadius: 8, fontWeight: 700 }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
