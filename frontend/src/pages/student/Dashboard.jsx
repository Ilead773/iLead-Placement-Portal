// src/pages/student/Dashboard.jsx — Premium Student Command Center
import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import { Link, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, ChevronRight, Calendar, BrainCircuit, Award, 
  BarChart3, ArrowRight, MessageSquare, Play, 
  Edit, Bell, Sparkles, AlertCircle, 
  Clock, CheckCircle2, Compass, ArrowUpRight, ShieldAlert,
  Flame, ListChecks, Building2
} from 'lucide-react';
import useNotificationStore from '../../store/notificationStore';
import { motion } from 'framer-motion';

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
        <div className="flex gap-3">
          <div className="skeleton-shimmer-item" style={{ width: '120px', height: '38px', borderRadius: '16px' }} />
          <div className="skeleton-shimmer-item" style={{ width: '120px', height: '38px', borderRadius: '16px' }} />
        </div>
      </div>

      {/* Overview Stat Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="skeleton-card-mock flex items-center justify-between">
          <div className="flex-1">
            <div className="skeleton-shimmer-item skeleton-text" style={{ width: '100px', height: '10px' }} />
            <div className="skeleton-shimmer-item skeleton-text" style={{ width: '180px', height: '18px' }} />
            <div className="skeleton-shimmer-item skeleton-text" style={{ width: '140px', height: '12px' }} />
          </div>
          <div className="skeleton-shimmer-item skeleton-circle" />
        </div>
        <div className="skeleton-card-mock flex items-center justify-between">
          <div className="flex-1">
            <div className="skeleton-shimmer-item skeleton-text" style={{ width: '100px', height: '10px' }} />
            <div className="skeleton-shimmer-item skeleton-text" style={{ width: '140px', height: '22px' }} />
            <div className="skeleton-shimmer-item skeleton-text" style={{ width: '180px', height: '12px' }} />
          </div>
          <div className="skeleton-shimmer-item skeleton-circle" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Section Column Skeleton */}
        <div className="lg:col-span-2 space-y-8">
          {/* Academic Profile Card Mock */}
          <div className="skeleton-card-mock">
            <div className="skeleton-shimmer-item skeleton-text" style={{ width: '150px', height: '16px', marginBottom: '24px' }} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i}>
                  <div className="skeleton-shimmer-item skeleton-text" style={{ width: '80px', height: '10px' }} />
                  <div className="skeleton-shimmer-item skeleton-text" style={{ width: '160px', height: '14px' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Column Skeleton */}
        <div className="space-y-8">
          {/* Alerts Card Mock */}
          <div className="skeleton-card-mock">
            <div className="skeleton-shimmer-item skeleton-text" style={{ width: '100px', height: '16px', marginBottom: '20px' }} />
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 mb-4">
                <div className="skeleton-shimmer-item skeleton-circle" style={{ width: '10px', height: '10px', marginTop: '4px' }} />
                <div className="flex-1">
                  <div className="skeleton-shimmer-item skeleton-text" style={{ width: '70%', height: '12px' }} />
                  <div className="skeleton-shimmer-item skeleton-text" style={{ width: '90%', height: '10px' }} />
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
  rejected: 'badge-status-rejected', 
  selected: 'badge-status-selected',
  accepted: 'badge-status-accepted'
};

function ProgressRing({ radius, stroke, progress, max = 100, label, color = "var(--accent-primary)" }) {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / max) * circumference;

  return (
    <div className="progress-ring-container">
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="var(--border-color)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          className="progress-ring-circle"
          stroke={color}
          fill="transparent"
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          strokeLinecap="round"
        />
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          dy=".3em"
          className="progress-ring-text"
        >
          {progress}
        </text>
        <text
          x="50%"
          y="74%"
          textAnchor="middle"
          className="progress-ring-subtext"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}


export default function StudentDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [interviewSessions, setInterviewSessions] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllApplications, setShowAllApplications] = useState(false);

  const { notifications, fetchNotifications, markRead } = useNotificationStore();

  const fetchData = useCallback(async () => {
    try {
      const cacheBust = { _t: Date.now() };
      const [profRes, placRes, compRes, interviewRes, resumesRes, uploadsRes, roadmapsRes] = await Promise.all([
        api.get('me/profile/', { params: cacheBust }),
        api.get('me/placements/', { params: cacheBust }),
        api.get('profiles/me/completion/', { params: cacheBust }),
        api.get('interviews/sessions/', { params: cacheBust }).catch(() => ({ data: [] })),
        api.get('resumes/', { params: cacheBust }).catch(() => ({ data: [] })),
        api.get('resumes/uploads/', { params: cacheBust }).catch(() => ({ data: [] })),
        api.get('interviews/roadmaps/', { params: cacheBust }).catch(() => ({ data: [] })),
      ]);

      setProfile(profRes.data);
      setPlacements(placRes.data || []);
      setCompletion(compRes.data);
      setInterviewSessions(interviewRes.data || []);
      
      // Merge Built and Uploaded resumes to find primary/active one
      const built = Array.isArray(resumesRes.data) ? resumesRes.data : (resumesRes.data.results || []);
      const uploaded = Array.isArray(uploadsRes.data) ? uploadsRes.data : (uploadsRes.data.results || []);
      const allResumes = [
        ...built.map(r => ({ ...r, type: 'built' })),
        ...uploaded.map(u => ({ 
          id: u.id, 
          title: u.original_filename, 
          template_name: 'Original Upload',
          state: u.status,
          created_at: u.uploaded_at,
          type: 'upload',
          is_primary: u.is_primary,
          downloaded_count: u.downloaded_count || 0
        }))
      ];
      setResumes(allResumes);
      setRoadmaps(roadmapsRes.data || []);

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
    if (note.action_url) {
      navigate(note.action_url);
    }
  };

  if (loading) return <DashboardSkeleton />;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const totalApplicationsCount = profile?.job_applications?.length || 0;
  const activeRoadmap = roadmaps.length > 0 ? roadmaps[0] : null;

  // Notification styling matching priorities
  const notificationPriorityStyles = {
    critical: { bg: 'bg-red-500/10 text-red-500 border-red-500/20', dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]' },
    high: { bg: 'bg-orange-500/10 text-orange-500 border-orange-500/20', dot: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.7)]' },
    medium: { bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20', dot: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]' },
    low: { bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20', dot: 'bg-slate-400' }
  };
  // Find if student is placed
  const placedOffer = profile?.job_applications?.find(
    app => app.status === 'selected' || app.status === 'accepted'
  ) || placements.find(
    p => p.status === 'selected' || p.status === 'accepted'
  );


  return (
    <motion.div 
      className="dashboard-container p-4 lg:p-8 animate-in relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Subtle ambient non-transparent page glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Hero Welcome Header */}
      <motion.div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4" variants={itemVariants}>
        <div>
          <h1 className="text-3xl font-black mb-1 tracking-tight">
            {getGreeting()}, <span style={{ color: 'var(--accent-primary)' }}>{profile?.name?.split(' ')[0]}!</span>
          </h1>
          <p className="text-secondary text-sm">Monitor your career progress, applications, and evaluations in real time.</p>
        </div>
      </motion.div>

      {/* 🎉 Placement Celebration Banner */}
      {placedOffer && (
        <motion.div 
          className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg relative overflow-hidden"
          variants={itemVariants}
        >
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-white/20 text-white tracking-wider">
                🎉 SELECTED OFFER RECEIVED
              </span>
              <h2 className="text-xl font-black mt-2 mb-1 text-white">Congratulations! You're Placed!</h2>
              <p className="text-white/80 text-xs max-w-xl">
                You have been selected for the role of <span className="font-bold text-white">{placedOffer.role || placedOffer.position}</span> at <span className="font-bold text-white">{placedOffer.company_name}</span>. 
                Please review the placement offer details and respond as required.
              </p>
            </div>
            <Link 
              to={placedOffer.role ? `/student/applications/${placedOffer.id}` : "/student/applications"}
              className="px-4 py-2 bg-white text-emerald-600 font-bold text-xs rounded-xl shadow-md hover:bg-emerald-50 transition-all whitespace-nowrap"
            >
              View Offer Details
            </Link>
          </div>
        </motion.div>
      )}

      {/* 📊 Metrics Dashboard Grid (Replacing Clumsy Academic Card) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* CGPA Card */}
        <motion.div className="dash-card p-6 flex items-center justify-between" variants={itemVariants}>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black uppercase text-muted tracking-wider block mb-1">Academic CGPA</span>
            <span className="text-3xl font-black text-primary block mt-1">{profile?.cgpa?.toFixed(2) || 'N/A'}</span>
            <span className={`text-xs font-semibold mt-1.5 inline-flex items-center gap-1 ${profile?.backlogs ? 'text-danger' : 'text-success'}`}>
              {profile?.backlogs ? '⚠️ Active Backlogs' : '✓ No Backlogs'}
            </span>
          </div>
          <ProgressRing 
            radius={42} 
            stroke={4} 
            progress={profile?.cgpa ? parseFloat(profile.cgpa.toFixed(2)) : 0} 
            max={10} 
            label="" 
            color="var(--accent-primary)" 
          />
        </motion.div>

        {/* Attendance Card */}
        <motion.div className="dash-card p-6 flex items-center justify-between" variants={itemVariants}>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black uppercase text-muted tracking-wider block mb-1">Attendance Record</span>
            <span className="text-3xl font-black text-primary block mt-1">{profile?.attendance}%</span>
            <div className="progress-bar-track mt-3 w-32">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${profile?.attendance || 0}%`,
                  background: (profile?.attendance || 0) < 75 ? 'var(--danger)' : 'var(--success)'
                }} 
              />
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 text-xl flex-shrink-0">
            📅
          </div>
        </motion.div>

        {/* Course details Card */}
        <motion.div className="dash-card p-6 flex items-center justify-between" variants={itemVariants}>
          <div className="min-w-0 flex-1 pr-2">
            <span className="text-[10px] font-black uppercase text-muted tracking-wider block mb-1">Course & Stream</span>
            <span className="text-sm font-bold text-primary block mt-1 truncate leading-snug">{profile?.course}</span>
            <span className="text-xs text-secondary block mt-0.5 truncate">{profile?.stream}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xl flex-shrink-0">
            🎓
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Section */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Profile Completion Suggestions (Compact Grid Checklist) */}
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
                    <div key={i} className="boost-item p-3">
                      <div className="boost-checkbox-container">
                        <div className="boost-checkbox">
                          {/* Empty checklist checkbox */}
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

          {/* AI Mock Interview Readiness Hub & Gap Analysis / Roadmap */}
          <motion.div className="dash-card" variants={itemVariants}>
            <div className="dash-card-header">
              <h3 className="dash-card-title">
                <BrainCircuit size={18} className="text-orange-500" /> AI Interview Readiness & Roadmap
              </h3>
              <Link to="/student/mock-interview" className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1">
                Mock Portal <ChevronRight size={14} />
              </Link>
            </div>

            <div className="dash-card-body">
              {interviewSessions.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 text-2xl mb-3">
                    🎯
                  </div>
                  <h4 className="font-bold text-base text-primary mb-1">Evaluate Your Domain Competencies</h4>
                  <p className="text-xs text-secondary max-w-sm mb-5 leading-relaxed">
                    Practice domain-specific mock interviews, pinpoint your gaps, and build a targeted learning path.
                  </p>
                  <Link to="/student/mock-interview" className="btn btn-primary btn-sm flex items-center gap-2 shadow-md">
                    <Play size={12} fill="currentColor" /> Start First Mock Interview
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Performance stats row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="stat-pill info">
                      <span className="stat-pill-label">Avg Score</span>
                      <span className="stat-pill-value">
                        {Math.round(
                          interviewSessions.filter(s => s.total_score !== null).reduce((acc, curr) => acc + curr.total_score, 0) / 
                          (interviewSessions.filter(s => s.total_score !== null).length || 1)
                        )}%
                      </span>
                    </div>
                    <div className="stat-pill">
                      <span className="stat-pill-label">Attempts</span>
                      <span className="stat-pill-value">{interviewSessions.length}</span>
                    </div>
                    <div className="stat-pill success">
                      <span className="stat-pill-label">Top Rating</span>
                      <span className="stat-pill-value">
                        {Math.round(
                          Math.max(...(interviewSessions.filter(s => s.total_score !== null).map(s => s.total_score) || [0]))
                        )}%
                      </span>
                    </div>
                  </div>

                  {/* Career roadmap widget */}
                  {activeRoadmap ? (
                    <div className="p-5 border border-border-color rounded-2xl bg-primary/[0.01]">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-primary/10 text-primary tracking-wider">
                            Active Learning Roadmap
                          </span>
                          <h4 className="font-bold text-sm text-primary mt-2">{activeRoadmap.template_name}</h4>
                          <span className="text-xs text-secondary">
                            Target Completion: {new Date(activeRoadmap.target_completion_date).toLocaleDateString()} &bull; Duration: {activeRoadmap.total_hours} Hours
                          </span>
                        </div>
                        <Link to="/student/mock-interview" className="text-xs text-primary font-bold flex items-center hover:underline">
                          View Roadmap <ArrowUpRight size={14} />
                        </Link>
                      </div>

                      {/* Milestones preview */}
                      <div className="mt-4 space-y-2">
                        {Array.isArray(activeRoadmap.milestones) ? (
                          activeRoadmap.milestones.slice(0, 2).map((ms, index) => (
                            <div key={index} className="flex items-center gap-2.5 p-2 bg-card border border-border-color rounded-xl">
                              <div className={`p-1.5 rounded-lg ${ms.completed ? 'bg-success/15 text-success' : 'bg-slate-500/10 text-secondary'}`}>
                                <CheckCircle2 size={12} />
                              </div>
                              <div className="min-w-0">
                                <span className={`text-xs font-semibold block truncate ${ms.completed ? 'line-through text-muted' : 'text-primary'}`}>
                                  {ms.name}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted italic">No roadmap milestones set.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 border border-border-color rounded-2xl bg-orange-500/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest block mb-1">Career OS Suggestion</span>
                        <h4 className="font-bold text-sm text-primary mb-1">Identify Skill Gaps & Generate Roadmap</h4>
                        <p className="text-xs text-secondary leading-relaxed max-w-md">
                          Unlock a personalized roadmap based on your skill levels and test performance.
                        </p>
                      </div>
                      <Link 
                        to="/student/mock-interview" 
                        className="btn btn-outline btn-sm text-center"
                        style={{ color: '#ea580c', borderColor: '#ea580c' }}
                      >
                        Create Roadmap
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Job Applications (Expandable/Compact Table) */}
          <motion.div className="dash-card" variants={itemVariants}>
            <div className="dash-card-header">
              <h3 className="dash-card-title">My Applications</h3>
              <span className="badge badge-info">{totalApplicationsCount} Total</span>
            </div>
            <div className="dash-card-body p-0">
              {!profile?.job_applications || profile.job_applications.length === 0 ? (
                <div className="p-12 text-center text-secondary italic text-sm">You haven't applied to any jobs yet.</div>
              ) : (
                <>
                  <div className="dash-table-container">
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Job Role</th>
                          <th>Company</th>
                          <th>Status</th>
                          <th>Applied Date</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(showAllApplications ? profile.job_applications : profile.job_applications.slice(0, 3)).map((app) => (
                          <tr key={app.id} onClick={() => navigate(`/student/applications/${app.id}`)}>
                            <td className="font-bold text-primary">
                               <Link to={`/student/applications/${app.id}`} className="hover:underline">
                                {app.role}
                              </Link>
                            </td>
                            <td>
                              <div className="flex items-center gap-2 text-secondary font-semibold">
                                <div className="company-logo-badge" style={{ width: '26px', height: '26px' }}>
                                  <Building2 size={12} />
                                </div>
                                <span className="truncate">{app.company_name}</span>
                              </div>
                            </td>
                            <td>
                              <div className="status-badges-container">
                                <span className={`badge ${STATUS_BADGE[app.status] || STATUS_BADGE.applied}`} style={{ textTransform: 'capitalize' }}>
                                  {app.job_type === 'external' && app.status === 'selected' ? 'Placed (Off-Campus)' : app.status}
                                </span>
                                {app.status === 'selected' && (
                                  <span className="animate-pulse inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black bg-warning/20 text-warning border border-warning/30 tracking-wider uppercase">
                                    {app.job_type === 'external' ? 'Upload Offer Letter' : 'Action Required'}
                                  </span>
                                )}
                                {app.job_status === 'closed' && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black bg-danger/10 text-danger border border-danger/20 tracking-wider uppercase">
                                    Closed
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-xs text-muted">
                              {new Date(app.applied_at).toLocaleDateString()}
                            </td>
                            <td className="text-right" onClick={(e) => e.stopPropagation()}>
                              <Link to={`/student/applications/${app.id}`} className="btn btn-outline btn-xs py-1.5 px-3 rounded-lg text-[10px] font-bold">
                                {app.job_type === 'external' && app.status === 'selected' 
                                  ? 'Upload Offer Letter' 
                                  : app.status === 'selected' 
                                    ? 'Respond to Offer' 
                                    : 'Track Application'}
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {profile.job_applications.length > 3 && (
                    <div className="p-4 text-center border-t border-border-color">
                      <button 
                        onClick={() => setShowAllApplications(!showAllApplications)}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        {showAllApplications ? 'Show Less' : `Show ${profile.job_applications.length - 3} More Applications`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>

          {/* Placement Assignments */}
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
                  const prio = note.priority || 'medium';
                  
                  return (
                    <div 
                      key={note.id} 
                      onClick={() => handleNotificationClick(note)}
                      className="notif-card"
                    >
                      <div className={`notif-accent-strip notif-accent-${prio}`} />
                      {!note.is_read && <span className="notif-dot-pulse" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-xs font-bold text-primary truncate">{note.title}</span>
                          <span className="text-[8px] text-muted whitespace-nowrap">
                            {new Date(note.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                          </span>
                        </div>
                        <p className="text-[10px] text-secondary line-clamp-2 mt-0.5 leading-relaxed">{note.message}</p>
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
                      <div className="opp-header">
                        <span className="opp-title truncate mr-2">{job.role}</span>
                        {job.has_applied ? (
                          <span className="badge badge-success">✓ Applied</span>
                        ) : (
                          <span className="salary-chip">
                            ₹{job.package < 100 ? `${job.package} LPA` : Number(job.package).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-secondary mb-3 font-light truncate">{job.company_name}</div>
                      
                      <div className="flex justify-between items-center">
                        <span className={`deadline-badge ${isUrgent ? 'urgent' : ''}`}>
                          <Calendar size={10} /> 
                          {new Date(job.deadline).toLocaleDateString('en-IN', { 
                            day: 'numeric', month: 'short'
                          })}
                        </span>
                        {isUrgent && (
                          <span className="text-[10px] text-danger font-black uppercase animate-pulse">Urgent</span>
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
