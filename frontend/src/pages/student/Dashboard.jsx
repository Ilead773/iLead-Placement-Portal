// src/pages/student/Dashboard.jsx — Premium Student Command Center
import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import { Link, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, ChevronRight, Calendar, BrainCircuit, Award, 
  BarChart3, ArrowRight, MessageSquare, Play, 
  Edit, Bell, Sparkles, AlertCircle, 
  Clock, CheckCircle2, Compass, ArrowUpRight, ShieldAlert,
  Flame, ListChecks, Building2, X
} from 'lucide-react';
import useNotificationStore from '../../store/notificationStore';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 24
    }
  }
};

function DashboardSkeleton() {
  return (
    <div className="dashboard-container p-4 lg:p-8 relative skeleton-shimmer-container">
      {/* Greeting Header Skeleton */}
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <div className="skeleton-shimmer-item skeleton-text title" style={{ width: '220px', height: '32px' }} />
          <div className="skeleton-shimmer-item skeleton-text" style={{ width: '340px' }} />
        </div>
      </div>

      {/* Overview Stat Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton-card-mock flex items-center justify-between">
            <div className="flex-1">
              <div className="skeleton-shimmer-item skeleton-text" style={{ width: '100px', height: '10px' }} />
              <div className="skeleton-shimmer-item skeleton-text" style={{ width: '140px', height: '22px' }} />
            </div>
            <div className="skeleton-shimmer-item skeleton-circle" />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="skeleton-card-mock">
            <div className="skeleton-shimmer-item skeleton-text" style={{ width: '150px', height: '16px', marginBottom: '24px' }} />
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-24 bg-slate-100 dark:bg-zinc-850 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-8">
          <div className="skeleton-card-mock">
            <div className="skeleton-shimmer-item skeleton-text" style={{ width: '100px', height: '16px', marginBottom: '20px' }} />
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 mb-4">
                <div className="skeleton-shimmer-item skeleton-circle" style={{ width: '10px', height: '10px', marginTop: '4px' }} />
                <div className="flex-1">
                  <div className="skeleton-shimmer-item skeleton-text" style={{ width: '70%', height: '12px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const STATUS_BADGE = { 
  assigned: 'badge-status-assigned', 
  applied: 'badge-status-applied', 
  shortlisted: 'badge-status-shortlisted', 
  interviewing: 'badge-status-interviewing',
  rejected: 'badge-status-rejected', 
  selected: 'badge-status-selected',
  accepted: 'badge-status-accepted',
};


export default function StudentDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [interviewSessions, setInterviewSessions] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllApplications, setShowAllApplications] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const { notifications, fetchNotifications, markRead } = useNotificationStore();

  useEffect(() => {
    if (profile?.id) {
      const isDismissed = localStorage.getItem(`placed_banner_dismissed_${profile.id}`) === 'true';
      setBannerDismissed(isDismissed);
    }
  }, [profile]);

  const fetchData = useCallback(async () => {
    try {
      const cacheBust = { _t: Date.now() };
      const [profRes, placRes, compRes, interviewRes, appsRes] = await Promise.all([
        api.get('me/profile/', { params: cacheBust }),
        api.get('me/placements/', { params: cacheBust }),
        api.get('profiles/me/completion/', { params: cacheBust }),
        api.get('interviews/sessions/', { params: cacheBust }).catch(() => ({ data: [] })),
        api.get('applications/applications/', { params: cacheBust }).catch(() => ({ data: [] }))
      ]);

      setProfile(profRes.data);
      setPlacements(placRes.data || []);
      setCompletion(compRes.data);
      setInterviewSessions(interviewRes.data || []);
      
      // Sort applications by applied date descending
      const sortedApps = (appsRes.data || []).sort(
        (a, b) => new Date(b.applied_at) - new Date(a.applied_at)
      );
      setApplications(sortedApps);

      // Pull latest notifications
      fetchNotifications().catch(() => {});
    } catch (e) {
      console.error("Dashboard data load error", e);
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh when student switches back to this tab (picks up admin/profile edits)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchData]);

  const handleNotificationClick = async (note) => {
    if (!note.is_read) {
      await markRead(note.id);
    }
    navigate('/student/notifications', { state: { selectedId: note.id } });
  };

  if (loading) return <DashboardSkeleton />;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };



  // Find if student is placed
  const placedOffer = applications.find(
    app => app.status === 'selected' || app.status === 'accepted'
  ) || placements.find(
    p => p.status === 'selected' || p.status === 'accepted'
  );

  const getStatusStepIndex = (status) => {
    if (['applied', 'assigned'].includes(status)) return 0;
    if (status === 'shortlisted') return 1;
    if (status === 'interviewing') return 2;
    if (['selected', 'accepted'].includes(status)) return 3;
    return -1;
  };

  const getPipelineSteps = (status) => {
    if (status === 'rejected') {
      return [
        { label: 'Applied', state: 'completed' },
        { label: 'Rejected', state: 'failed' }
      ];
    }
    if (status === 'withdrawn') {
      return [
        { label: 'Applied', state: 'completed' },
        { label: 'Withdrawn', state: 'failed' }
      ];
    }
    
    const steps = ['Applied', 'Shortlisted', 'Interviewing', 'Placed'];
    const currentIndex = getStatusStepIndex(status);
    return steps.map((label, idx) => {
      let state = 'pending';
      if (idx < currentIndex) state = 'completed';
      else if (idx === currentIndex) state = 'active';
      return { label, state };
    });
  };

  return (
    <motion.div 
      className="dashboard-container p-4 lg:p-8 animate-in relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 🎉 Placement Celebration Banner (Flat, solid emerald theme) */}
      {placedOffer && !bannerDismissed && (
        <motion.div 
          className="mb-8 p-6 rounded-2xl bg-emerald-600 text-white shadow-md relative"
          variants={itemVariants}
        >
          {/* Close/Dismiss Button */}
          <button
            onClick={() => {
              if (profile?.id) {
                localStorage.setItem(`placed_banner_dismissed_${profile.id}`, 'true');
              }
              setBannerDismissed(true);
            }}
            className="absolute right-4 top-4 text-white/80 hover:text-white transition-colors cursor-pointer bg-white/10 hover:bg-white/20 p-1.5 rounded-full border-none flex items-center justify-center"
            title="Dismiss banner"
          >
            <X size={14} />
          </button>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pr-6">
            <div>
              <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-white/20 text-white tracking-wider">
                🎉 SELECTED OFFER RECEIVED
              </span>
              <h2 className="text-xl font-black mt-2 mb-1 text-white">Congratulations! You're Placed!</h2>
              <p className="text-white/90 text-xs max-w-xl">
                You have been selected for the role of <span className="font-bold text-white">{placedOffer.role || placedOffer.position}</span> at <span className="font-bold text-white">{placedOffer.company_name}</span>. 
                Please review the placement offer details and respond as required.
              </p>
            </div>
            <Link 
              to={placedOffer.role ? `/student/applications/${placedOffer.id}` : "/student/applications"}
              className="px-4 py-2 bg-white text-emerald-700 font-bold text-xs rounded-xl shadow-sm hover:bg-emerald-50 transition-all whitespace-nowrap"
            >
              View Offer Details
            </Link>
          </div>
        </motion.div>
      )}

      {/* Premium Welcome & Info Command Center */}
      <motion.div 
        className="mb-8 p-6 sm:p-8 student-hero-card"
        variants={itemVariants}
      >
        {/* Modern SaaS background overlays */}
        <div className="student-hero-card-grid-overlay" />
        <div className="student-hero-card-accent-glow" />

        <div className="student-hero-card-content flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <h1 className="student-hero-title flex flex-wrap items-center gap-2.5">
              <span>{getGreeting()},</span>
              <span className="student-hero-name">{profile?.name?.split(' ')[0]}</span>
              <span className="animate-bounce inline-block">👋</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">Monitor your career progress, applications, and evaluations in real time.</p>
            
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-white/10 text-xs font-semibold">
              <div className="student-hero-badge flex items-center gap-1.5">
                <GraduationCap size={14} className="text-blue-400" />
                <span className="text-slate-400 font-medium">Reg No:</span>
                <span className="text-white font-bold">{profile?.registration_number || 'N/A'}</span>
              </div>
              <div className="student-hero-badge flex items-center gap-1.5">
                <Calendar size={14} className="text-purple-400" />
                <span className="text-slate-400 font-medium">Graduation:</span>
                <span className="text-white font-bold">{profile?.passing_year || 'N/A'} Batch</span>
              </div>
            </div>
          </div>

          {/* Profile Completion Indicator (Modern Circular Gauge) */}
          <div className="flex items-center gap-4 shrink-0 bg-white/[0.04] border border-white/10 p-4 rounded-2xl backdrop-blur-md shadow-lg transition-all hover:bg-white/[0.08] hover:border-white/20">
            <div className="relative w-14 h-14">
              <svg viewBox="0 0 36 36" className="w-14 h-14" style={{ transform: 'rotate(-90deg)' }}>
                <path
                  className="text-white/10"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400"
                  strokeWidth="3.5"
                  strokeDasharray={`${Math.round((completion?.completion_score || 0) * 100)}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  style={{ transition: 'stroke-dasharray 0.8s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-black text-white">{Math.round((completion?.completion_score || 0) * 100)}%</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Profile Readiness</span>
              <Link to="/student/profile" className="text-xs text-blue-400 font-bold flex items-center gap-0.5 hover:text-blue-300 transition-colors">
                Complete <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Academic Snapshot Cards Grid (Premium Modular Layout) ─── */}
      <motion.div
        className="academic-snapshot-grid"
        variants={itemVariants}
      >
        {/* ── CGPA Card ── */}
        <div className="snapshot-stat-card cgpa-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-muted tracking-widest">CGPA</span>
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md border ${profile?.backlogs ? 'chip-backlog text-red-500 bg-red-500/10 border-red-500/20' : 'chip-clear text-emerald-500 bg-emerald-500/10 border-emerald-500/20'}`}>
              {profile?.backlogs ? '⚠ Backlogs' : '✓ Clear'}
            </span>
          </div>
          <div className="flex items-center gap-4 my-2">
            <div className="relative shrink-0 w-12 h-12">
              <svg viewBox="0 0 56 56" width="48" height="48" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="28" cy="28" r="22" fill="none" stroke="var(--border-color)" strokeWidth="4" />
                <circle
                  cx="28" cy="28" r="22" fill="none"
                  stroke="#3b82f6" strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - (profile?.cgpa || 0) / 10)}`}
                  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-primary">
                {profile?.cgpa?.toFixed(1) || '—'}
              </span>
            </div>
            <div>
              <p className="text-2xl font-black text-primary leading-none">
                {profile?.cgpa?.toFixed(2) || 'N/A'}
              </p>
              <span className="text-[10px] font-semibold text-muted">Out of 10.0</span>
            </div>
          </div>
        </div>

        {/* ── Attendance Card ── */}
        <div className="snapshot-stat-card attendance-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-muted tracking-widest">Attendance</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${(profile?.attendance || 0) >= 75 ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-red-500 bg-red-500/10 border-red-500/20'}`}>
              {(profile?.attendance || 0) >= 75 ? '▲ Safe' : '▼ At risk'}
            </span>
          </div>
          <div className="my-1">
            <p className="text-2xl font-black text-primary leading-none">
              {profile?.attendance || 0}%
            </p>
            <div className="relative h-2 bg-border-color rounded-full overflow-hidden w-full mt-2.5">
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(profile?.attendance || 0, 100)}%`,
                  backgroundColor: (profile?.attendance || 0) < 65 ? 'var(--danger)' : (profile?.attendance || 0) < 75 ? 'var(--warning)' : '#10b981'
                }}
              />
              <div className="absolute top-0 bottom-0 w-[1.5px] bg-slate-400/60" style={{ left: '75%' }} />
            </div>
            <p className="text-[9px] text-muted mt-1.5 font-medium">Target: 75% min requirement</p>
          </div>
        </div>

        {/* ── Programme Card ── */}
        <div className="snapshot-stat-card programme-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-muted tracking-widest">Programme</span>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              Active
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-primary leading-snug truncate" title={profile?.course}>
              {profile?.course || '—'}
            </p>
            <p className="text-[10px] text-secondary mt-0.5 truncate" title={profile?.stream}>
              {profile?.stream || '—'}
            </p>
            <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
              {profile?.semester && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-zinc-800 text-secondary border border-border-color">
                  Sem {profile.semester}
                </span>
              )}
              {profile?.passing_year && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                  Batch '{String(profile.passing_year).slice(-2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Applications Card ── */}
        <div className="snapshot-stat-card applications-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase text-muted tracking-widest">Applications</span>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-pink-500/10 text-pink-500 border border-pink-500/20">
              {applications.length} Total
            </span>
          </div>
          <div className="space-y-1 text-[10px] font-semibold mt-1">
            <div className="flex items-center justify-between text-secondary">
              <span>Shortlisted</span>
              <span className="font-bold text-primary">{applications.filter(a => ['shortlisted','interviewing'].includes(a.status)).length}</span>
            </div>
            <div className="flex items-center justify-between text-secondary">
              <span>Placed</span>
              <span className="font-bold text-emerald-500">{applications.filter(a => ['selected','accepted'].includes(a.status)).length}</span>
            </div>
            <div className="flex items-center justify-between text-secondary">
              <span>Rejected</span>
              <span className="font-bold text-danger">{applications.filter(a => a.status === 'rejected').length}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Section */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Profile Completion Suggestions (Compact Flat Checklist) */}
          {completion?.suggestions?.length > 0 && (
            <motion.div className="dash-card" variants={itemVariants}>
              <div className="dash-card-header">
                <h3 className="dash-card-title">
                  <Sparkles size={18} className="text-primary animate-pulse" /> Boost Your Profile
                </h3>
                <span className="badge badge-info">{completion.suggestions.length} Actions</span>
              </div>
              <div className="dash-card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
                {completion.suggestions.map((sug, i) => {
                  let targetTab = "/student/profile";
                  if (sug.toLowerCase().includes("skill")) targetTab = "/student/profile?tab=skills";
                  if (sug.toLowerCase().includes("project")) targetTab = "/student/profile?tab=projects";
                  if (sug.toLowerCase().includes("experience") || sug.toLowerCase().includes("internship")) targetTab = "/student/profile?tab=experience";
                  
                  return (
                    <div key={i} className="boost-item p-3 border border-border-color rounded-xl flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/50">
                      <div className="boost-checkbox-container flex items-center gap-2.5">
                        <div className="boost-checkbox w-4 h-4 rounded border border-border-color flex items-center justify-center shrink-0 bg-card">
                          {/* Empty checkbox */}
                        </div>
                        <span className="text-xs text-secondary font-medium">{sug}</span>
                      </div>
                      <Link to={targetTab} className="text-[10px] font-bold text-primary flex items-center gap-0.5 hover:underline flex-shrink-0">
                        Fix <ArrowRight size={10} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* AI Mock Interview Readiness Hub */}
          <motion.div className="dash-card" variants={itemVariants}>
            <div className="dash-card-header">
              <h3 className="dash-card-title">
                <BrainCircuit size={18} className="text-orange-500" /> AI Interview Readiness
              </h3>
              <Link to="/student/mock-interview" className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1">
                Mock Portal <ChevronRight size={14} />
              </Link>
            </div>

            <div className="dash-card-body">
              {interviewSessions.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 text-2xl mb-3 border border-orange-500/20">
                    🎯
                  </div>
                  <h4 className="font-bold text-base text-primary mb-1">Evaluate Your Domain Competencies</h4>
                  <p className="text-xs text-secondary max-w-sm mb-5 leading-relaxed">
                    Practice domain-specific mock interviews, pinpoint your gaps, and build a targeted learning path.
                  </p>
                  <Link to="/student/mock-interview" className="btn btn-primary btn-sm flex items-center gap-2 shadow-sm" style={{ backgroundColor: '#ea580c', borderColor: '#ea580c' }}>
                    <Play size={12} fill="currentColor" /> Start First Mock Interview
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Performance stats row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="ai-stat-widget score flex flex-col">
                      <span className="text-[10px] font-black uppercase text-muted tracking-wider">Avg Score</span>
                      <span className="text-xl font-bold text-primary mt-1">
                        {Math.round(
                          interviewSessions.filter(s => s.total_score !== null).reduce((acc, curr) => acc + curr.total_score, 0) / 
                          (interviewSessions.filter(s => s.total_score !== null).length || 1)
                        )}%
                      </span>
                    </div>
                    <div className="ai-stat-widget attempts flex flex-col">
                      <span className="text-[10px] font-black uppercase text-muted tracking-wider">Attempts</span>
                      <span className="text-xl font-bold text-primary mt-1">{interviewSessions.length}</span>
                    </div>
                    <div className="ai-stat-widget rating flex flex-col">
                      <span className="text-[10px] font-black uppercase text-muted tracking-wider">Top Rating</span>
                      <span className="text-xl font-bold text-primary mt-1">
                        {Math.round(
                          Math.max(...(interviewSessions.filter(s => s.total_score !== null).map(s => s.total_score) || [0]))
                        )}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Job Applications (Recruitment Pipeline Tracker) */}
          <motion.div className="dash-card" variants={itemVariants}>
            <div className="dash-card-header">
              <h3 className="dash-card-title">My Applications Pipeline</h3>
              <span className="badge badge-info">{applications.length} Total</span>
            </div>
            <div className="dash-card-body space-y-6">
              {applications.length === 0 ? (
                <div className="py-12 text-center text-secondary italic text-sm">You haven't applied to any jobs yet.</div>
              ) : (
                <>
                  <div className="space-y-6">
                    {(showAllApplications ? applications : applications.slice(0, 3)).map((app) => {
                      const pipelineSteps = getPipelineSteps(app.status);
                      const currentIndex = getStatusStepIndex(app.status);
                      
                      return (
                        <div key={app.id} className="pipeline-card">
                          {/* Card Header info */}
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-5 pb-4 border-b border-border-color/60">
                            <div>
                              <h4 className="font-bold text-sm text-primary flex items-center gap-1.5">
                                <Link to={`/student/applications/${app.id}`} className="hover:underline">
                                  {app.job_title || app.role}
                                </Link>
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-secondary mt-1 font-semibold">
                                <Building2 size={12} className="text-muted" />
                                <span>{app.company_name}</span>
                                <span className="text-muted">&bull;</span>
                                <span className="text-muted">Applied: {new Date(app.applied_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className={`badge ${STATUS_BADGE[app.status] || STATUS_BADGE.applied}`} style={{ textTransform: 'capitalize' }}>
                                {app.job_type === 'external' && app.status === 'selected' ? 'Placed (Off-Campus)' : app.status}
                              </span>
                              {app.job_status === 'closed' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-danger/10 text-danger border border-danger/20 tracking-wider uppercase">
                                  Closed
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Visual Stepper / Funnel */}
                          <div className="mb-5 px-2">
                            <div className="flex items-center justify-between w-full relative">
                              {/* Background Connector Lines */}
                              <div className="pipeline-connector-line">
                                <div 
                                  className="pipeline-connector-line-progress"
                                  style={{ width: `${currentIndex === -1 ? '0%' : currentIndex === 0 ? '0%' : currentIndex === 1 ? '33%' : currentIndex === 2 ? '66%' : '100%'}` }}
                                />
                              </div>
                              
                              {pipelineSteps.map((step, idx) => {
                                let stepStateClass = "pending";
                                let textClass = "text-muted font-medium";
                                
                                if (step.state === 'completed') {
                                  stepStateClass = "completed";
                                  textClass = "text-emerald-500 font-bold";
                                } else if (step.state === 'active') {
                                  stepStateClass = "active";
                                  textClass = "text-blue-500 font-bold";
                                } else if (step.state === 'failed') {
                                  stepStateClass = "failed";
                                  textClass = "text-red-500 font-bold";
                                }
                                
                                return (
                                  <div key={idx} className="flex flex-col items-center gap-2 relative z-10 bg-card px-2">
                                    <div className={`pipeline-step-node ${stepStateClass}`}>
                                      {step.state === 'completed' ? '✓' : idx + 1}
                                    </div>
                                    <span className={`text-[10px] tracking-tight ${textClass}`}>{step.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Upcoming / Scheduled round details */}
                          {app.current_round && (
                            <div className="active-round-banner text-xs space-y-2 mt-4">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-primary flex items-center gap-1.5">
                                  <Clock size={12} className="text-blue-500" /> 
                                  Upcoming: {app.current_round.round_name || `Round ${app.current_round.round_number}`}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold text-[9px] border border-blue-500/20 uppercase tracking-wider">
                                  {app.current_round.status}
                                </span>
                              </div>
                              <p className="text-secondary">
                                Scheduled on <span className="font-semibold text-primary">{new Date(app.current_round.scheduled_date).toLocaleString()}</span>
                                {app.current_round.interviewer_name && (
                                  <span> with <span className="font-semibold text-primary">{app.current_round.interviewer_name}</span></span>
                                )}
                              </p>
                              {app.current_round.interview_link && (
                                <div className="flex items-center gap-2 mt-2">
                                  <a 
                                    href={app.current_round.interview_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-colors text-[10px]"
                                    style={{ backgroundColor: 'var(--accent-primary)' }}
                                  >
                                    Join Video Interview <ArrowUpRight size={10} />
                                  </a>
                                  <span className="pulse-icon-dot" title="Interview is active" />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border-color/40">
                            <Link to={`/student/applications/${app.id}`} className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-border-color text-primary font-bold text-[10px] rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                              Details
                            </Link>
                            
                            {app.status === 'selected' && (
                              <Link 
                                to={app.job_type === 'external' ? `/student/applications/${app.id}` : "/student/applications"}
                                className="px-3 py-1.5 bg-success text-white font-bold text-[10px] rounded-lg hover:bg-emerald-600 transition-colors"
                              >
                                {app.job_type === 'external' ? 'Upload Offer Letter' : 'Respond to Offer'}
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {applications.length > 3 && (
                    <div className="p-4 text-center border-t border-border-color mt-4">
                      <button 
                        onClick={() => setShowAllApplications(!showAllApplications)}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        {showAllApplications ? 'Show Less' : `Show ${applications.length - 3} More Applications`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>

          {/* Placement Assignments (Direct Assignments) */}
          {placements.length > 0 && (
            <motion.div className="dash-card" variants={itemVariants}>
              <div className="dash-card-header">
                <h3 className="dash-card-title">Direct Assignments</h3>
                <span className="badge badge-neutral">{placements.length} Total</span>
              </div>
              <div className="dash-card-body p-0">
                <div className="dash-table-container">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Position</th>
                        <th>Salary</th>
                        <th>Status</th>
                        <th className="text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {placements.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <div className="flex items-center gap-2 text-secondary font-semibold">
                              <div className="company-logo-badge" style={{ width: '26px', height: '26px' }}>
                                <Building2 size={12} />
                              </div>
                              <span className="truncate">{p.company_name}</span>
                            </div>
                          </td>
                          <td className="text-secondary">{p.position}</td>
                          <td className="font-bold text-primary">₹{Number(p.salary).toLocaleString()}</td>
                          <td>
                            <span className={`badge ${STATUS_BADGE[p.status] || STATUS_BADGE.assigned}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="text-right text-xs text-muted">
                            {new Date(p.assigned_date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          
          {/* Notifications Inbox Mini feed */}
          <motion.div className="dash-card" variants={itemVariants}>
            <div className="dash-card-header">
              <h3 className="dash-card-title">
                <Bell size={18} className="text-primary" /> Inbox Alerts
              </h3>
              <Link to="/student/notifications" className="text-xs font-bold text-primary hover:underline">
                View All
              </Link>
            </div>

            <div className="dash-card-body flex flex-col gap-3">
              {notifications.length === 0 ? (
                <p className="text-xs text-muted italic py-4 text-center">No notifications found.</p>
              ) : (
                notifications.slice(0, 3).map((note) => {
                  const isUnread = !note.is_read;
                  
                  return (
                    <div 
                      key={note.id} 
                      onClick={() => handleNotificationClick(note)}
                      className={`inbox-alert-item ${isUnread ? 'unread' : ''}`}
                    >
                      <div className="inbox-alert-icon-wrapper">
                        {note.title?.toLowerCase().includes('job') || note.title?.toLowerCase().includes('opportunity') ? (
                          <Building2 size={16} />
                        ) : note.title?.toLowerCase().includes('interview') ? (
                          <Calendar size={16} />
                        ) : (
                          <Bell size={16} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-center gap-2 mb-1">
                          <h4 className={`text-xs truncate text-primary ${isUnread ? 'font-bold' : 'font-semibold'}`}>
                            {note.title}
                          </h4>
                          <span className="text-[9px] text-muted font-semibold whitespace-nowrap shrink-0">
                            {new Date(note.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                          </span>
                        </div>
                        <p className={`text-[11px] line-clamp-2 leading-relaxed ${isUnread ? 'text-secondary font-semibold' : 'text-muted'}`}>
                          {note.message}
                        </p>
                        
                        {isUnread && (
                          <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20">
                            <span className="w-1 h-1 rounded-full bg-blue-600" /> New Alert
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* Hot Opportunities */}
          <motion.div className="dash-card" variants={itemVariants}>
            <div className="dash-card-header">
              <h3 className="dash-card-title text-orange-500">
                <Flame size={18} className="text-orange-500" /> Hot Opportunities
              </h3>
              <Link to="/student/jobs" className="text-xs font-bold text-orange-500 hover:underline">
                View All
              </Link>
            </div>

            <div className="dash-card-body flex flex-col gap-4">
              {profile?.upcoming_jobs?.length === 0 ? (
                <p className="text-xs text-muted italic">No upcoming deadlines.</p>
              ) : (
                profile?.upcoming_jobs?.map(job => {
                  const isUrgent = new Date(job.deadline) - new Date() < 86400000 && !job.has_applied;
                  return (
                    <div 
                      key={job.id} 
                      onClick={() => navigate('/student/jobs')}
                      className="opp-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="company-logo-avatar shrink-0">
                          {job.company_name?.charAt(0) || 'J'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="opp-card-title truncate" title={job.role}>
                            {job.role}
                          </h4>
                          <p className="opp-card-company truncate">{job.company_name}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {job.has_applied ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            ✓ Applied
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-600 border border-orange-500/20 font-bold">
                            {(() => {
                              if (!job.package) return 'Not Specified';
                              const pkgStr = String(job.package).trim();
                              const isNumeric = /^\d+(\.\d+)?$/.test(pkgStr);
                              if (!isNumeric) return pkgStr;
                              if (job.listing_type === 'internship') {
                                return `₹${Number(pkgStr).toLocaleString('en-IN')}/mo`;
                              }
                              return pkgStr < 100 ? `₹${pkgStr} LPA` : `₹${Number(pkgStr).toLocaleString('en-IN')}`;
                            })()}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-zinc-800 text-secondary border border-border-color">
                          Full-time
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-3 mt-1 border-t border-border-color/40 text-[10px] font-medium text-muted">
                        <span className={`flex items-center gap-1 ${isUrgent ? 'text-danger font-semibold' : ''}`}>
                          <Calendar size={11} />
                          {job.deadline ? format(new Date(job.deadline), 'dd MMM, h:mm a') : 'No Deadline'}
                        </span>
                        {isUrgent ? (
                          <span className="text-danger font-black uppercase tracking-wider animate-pulse flex items-center gap-1 text-[10px]">
                            <Flame size={11} /> Urgent
                          </span>
                        ) : (
                          <span className="opp-card-apply-text text-primary font-bold flex items-center gap-0.5 text-[10px]">
                            Apply <ArrowRight size={11} />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
