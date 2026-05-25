// src/pages/student/Dashboard.jsx — Premium Student Command Center
import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import { Link } from 'react-router-dom';
import { GraduationCap, ChevronRight, Calendar, BrainCircuit, Award, BarChart3, ArrowRight, CheckCircle, MessageSquare, Play } from 'lucide-react';

const STATUS_BADGE = { 
  assigned: 'bg-info/20 text-info border-info/30', 
  applied: 'bg-dark-300 text-muted border-dark-400', 
  shortlisted: 'bg-warning/20 text-warning border-warning/30', 
  rejected: 'bg-danger/20 text-danger border-danger/30', 
  selected: 'bg-success/20 text-success border-success/30' 
};

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [interviewSessions, setInterviewSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const cacheBust = { _t: Date.now() };
      const [profRes, placRes, compRes, interviewRes] = await Promise.all([
        api.get('me/profile/', { params: cacheBust }),
        api.get('me/placements/', { params: cacheBust }),
        api.get('profiles/me/completion/', { params: cacheBust }),
        api.get('interviews/sessions/', { params: cacheBust }).catch(() => ({ data: [] })),
      ]);
      setProfile(profRes.data);
      setPlacements(placRes.data || []);
      setCompletion(compRes.data);
      setInterviewSessions(interviewRes.data || []);
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh when student switches back to this tab (picks up admin edits)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchData]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="dashboard-container p-4 lg:p-8 animate-in">
      {/* Hero Welcome Section */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black mb-1 tracking-tight">
            {getGreeting()}, <span style={{ color: 'var(--accent-primary)' }}>{profile?.name?.split(' ')[0]}!</span>
          </h1>
          <p className="text-secondary text-sm">Welcome to your placement command center.</p>
        </div>
        {completion?.completion_score < 100 && (
          <Link to="/student/profile" className="btn btn-primary btn-sm shadow-md">
            Complete Profile
          </Link>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Profile Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-border-color bg-card-hover">
               <h3 className="font-bold flex items-center gap-2 text-sm text-primary uppercase tracking-wider">
                 <GraduationCap size={18} className="text-primary" /> Academic Profile
               </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              <div className="profile-detail">
                <span className="detail-label">Registration</span>
                <span className="detail-value">{profile?.registration_number}</span>
              </div>
              <div className="profile-detail">
                <span className="detail-label">Course & Stream</span>
                <span className="detail-value">{profile?.course} — {profile?.stream}</span>
              </div>
              <div className="profile-detail">
                <span className="detail-label">Current Semester</span>
                <span className="detail-value">{profile?.semester}th Semester</span>
              </div>
              <div className="profile-detail">
                <span className="detail-label">Batch Year</span>
                <span className="detail-value">Class of {profile?.passing_year}</span>
              </div>
              <div className="profile-detail">
                <span className="detail-label">Attendance</span>
                <span className="detail-value">{profile?.attendance}%</span>
              </div>
              <div className="profile-detail">
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <span className="detail-label text-primary">Academic CGPA</span>
                  <div className="text-xl font-black text-primary">{profile?.cgpa?.toFixed(2) || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Mock Interview Hub */}
          <div className="card p-0 overflow-hidden relative group">
             {/* Neon subtle background glow */}
             <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 opacity-[0.03] blur-2xl group-hover:opacity-[0.06] transition-opacity pointer-events-none" />
             
             <div className="p-4 border-b border-border-color bg-card-hover flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2 text-sm text-primary uppercase tracking-wider">
                  <BrainCircuit size={18} className="text-orange-500 animate-pulse" /> AI Mock Interview Hub
                </h3>
                <Link to="/student/mock-interview" className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1">
                  Start New Session <ChevronRight size={14} />
                </Link>
             </div>
             
             {interviewSessions.length === 0 ? (
               <div className="p-10 text-center flex flex-col items-center justify-center">
                 <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 text-2xl mb-4">
                   🎯
                 </div>
                 <h4 className="font-bold text-base text-primary mb-1">Evaluate Your Readiness</h4>
                 <p className="text-xs text-secondary max-w-sm mb-6 leading-relaxed">
                   Practice domain-specific interviews, receive instant AI scoring, and review detailed growth analyses.
                 </p>
                 <Link to="/student/mock-interview" className="btn btn-primary btn-sm flex items-center gap-2 shadow-md">
                   <Play size={14} fill="currentColor" /> Start Your First Mock Interview
                 </Link>
               </div>
             ) : (
               <div className="p-6">
                 {/* Top Analytics Panel */}
                 <div className="grid md:grid-cols-3 gap-6 mb-6">
                   {/* Avg Score Card */}
                   <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-300 border border-dark-400 flex items-center justify-between">
                     <div>
                       <span className="text-[10px] font-black uppercase text-muted block mb-1">Average Score</span>
                       <span className="text-2xl font-black text-primary">
                         {Math.round(
                           interviewSessions.filter(s => s.total_score !== null).reduce((acc, curr) => acc + curr.total_score, 0) / 
                           (interviewSessions.filter(s => s.total_score !== null).length || 1)
                         )}%
                       </span>
                     </div>
                     <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                       <Award size={20} />
                     </div>
                   </div>
                   
                   {/* Attempted Sessions */}
                   <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-300 border border-dark-400 flex items-center justify-between">
                     <div>
                       <span className="text-[10px] font-black uppercase text-muted block mb-1">Total Attempted</span>
                       <span className="text-2xl font-black text-primary">{interviewSessions.length}</span>
                     </div>
                     <div className="p-2.5 rounded-xl bg-info/10 text-info">
                       <BarChart3 size={20} />
                     </div>
                   </div>

                   {/* Highest Score */}
                   <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-300 border border-dark-400 flex items-center justify-between">
                     <div>
                       <span className="text-[10px] font-black uppercase text-muted block mb-1">Highest Rating</span>
                       <span className="text-2xl font-black text-success">
                         {Math.round(
                           Math.max(...(interviewSessions.filter(s => s.total_score !== null).map(s => s.total_score) || [0]))
                         )}%
                       </span>
                     </div>
                     <div className="p-2.5 rounded-xl bg-success/10 text-success">
                       <CheckCircle size={20} />
                     </div>
                   </div>
                 </div>

                 {/* Latest Spotlight */}
                 {(() => {
                   const completedSessions = interviewSessions.filter(s => s.status === 'completed' || s.status === 'pending_review');
                   if (completedSessions.length === 0) return null;
                   const latest = completedSessions[0];
                   
                   return (
                     <div className="p-5 rounded-2xl border border-dark-300 bg-orange-500/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                       <div className="flex-1 space-y-2">
                         <div className="flex items-center gap-2">
                           <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-orange-500/10 text-orange-500 tracking-wider">
                             Latest AI Evaluation
                           </span>
                           <span className="text-[10px] text-muted font-light">
                             {new Date(latest.created_at).toLocaleDateString()}
                           </span>
                         </div>
                         <h4 className="font-bold text-lg text-primary tracking-tight">{latest.interview_type_name}</h4>
                         <span className="text-xs text-muted block uppercase font-bold tracking-wider">{latest.domain_name}</span>
                         {latest.total_score !== null ? (
                           <div className="flex items-baseline gap-1 mt-1">
                             <span className="text-3xl font-black text-primary leading-none">{Math.round(latest.total_score)}</span>
                             <span className="text-sm font-semibold text-muted">/100 Rating</span>
                           </div>
                         ) : (
                           <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-warning/10 text-warning uppercase mt-2">
                             AI Evaluation Pending
                           </span>
                         )}
                       </div>
                       
                       <div className="flex flex-col gap-3 min-w-[200px]">
                         <Link 
                           to={`/student/mock-interview?view_session=${latest.id}`}
                           className="btn btn-primary btn-sm flex items-center justify-center gap-2 w-full font-bold shadow-md hover:-translate-y-0.5 transition-transform"
                         >
                           <MessageSquare size={14} /> View Detailed Feedback
                         </Link>
                         <Link 
                           to="/student/mock-interview"
                           className="btn btn-outline btn-sm text-center w-full"
                         >
                           Mock History Feed
                         </Link>
                       </div>
                     </div>
                   );
                 })()}

                 {/* Minimal Recent Sessions List */}
                 {interviewSessions.length > 1 && (
                   <div>
                     <span className="text-[10px] font-black uppercase text-muted tracking-wider block mb-3">Other Past Sessions</span>
                     <div className="space-y-2.5">
                       {interviewSessions.slice(1, 4).map(session => (
                         <div key={session.id} className="p-3 border border-dark-400 rounded-xl flex items-center justify-between hover:bg-slate-100/5 transition-colors group">
                           <div className="flex items-center gap-3">
                             <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                             <div>
                               <span className="font-bold text-xs text-primary block group-hover:text-orange-500 transition-colors">{session.interview_type_name}</span>
                               <span className="text-[10px] text-muted">{new Date(session.created_at).toLocaleDateString()} &bull; {session.use_voice ? 'Voice' : 'Written'}</span>
                             </div>
                           </div>
                           <div className="flex items-center gap-4">
                             {session.total_score !== null ? (
                               <span className={`font-black text-sm px-2.5 py-1 rounded-lg ${
                                 session.total_score >= 70 ? 'bg-success/15 text-success' : 
                                 session.total_score >= 50 ? 'bg-warning/15 text-warning' : 'bg-danger/15 text-danger'
                               }`}>
                                 {Math.round(session.total_score)}%
                               </span>
                             ) : (
                               <span className="text-[10px] font-bold text-warning uppercase">Pending</span>
                             )}
                             <Link to={`/student/mock-interview?view_session=${session.id}`} className="text-secondary hover:text-primary transition-colors">
                               <ArrowRight size={14} />
                             </Link>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
             )}
          </div>

          {/* Job Applications (New System) */}
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-border-color bg-card-hover flex justify-between items-center">
                <h3 className="font-bold text-sm text-primary uppercase tracking-wider">My Applications</h3>
                <span className="badge badge-info">{profile?.job_applications?.length || 0} Total</span>
            </div>
            {!profile?.job_applications || profile.job_applications.length === 0 ? (
              <div className="p-12 text-center text-secondary italic text-sm">You haven't applied to any jobs yet.</div>
            ) : (
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Job Role</th>
                      <th>Company</th>
                      <th>Status</th>
                      <th>Applied</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.job_applications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-100/5 transition-colors">
                        <td className="font-bold text-primary">
                          <Link to={`/student/applications/${app.id}`} className="hover:underline transition-colors" style={{ color: 'var(--text-primary)' }}>
                            {app.role}
                          </Link>
                        </td>
                        <td className="text-secondary">{app.company_name}</td>
                        <td>
                          <span className={`badge badge-${app.status === 'selected' || app.status === 'accepted' ? 'success' : app.status === 'rejected' ? 'danger' : 'info'}`} style={{ textTransform: 'capitalize' }}>
                            {app.job_type === 'external' && app.status === 'selected' ? 'Placed (Off-Campus)' : app.status}
                          </span>
                          {app.status === 'selected' && (
                            <span className="ml-2 animate-pulse inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-warning/20 text-warning border border-warning/30 tracking-wider uppercase">
                              {app.job_type === 'external' ? 'Upload Offer Letter' : 'Action Required'}
                            </span>
                          )}
                        </td>
                        <td className="text-xs text-muted">
                          {new Date(app.applied_at).toLocaleDateString()}
                        </td>
                        <td className="text-right">
                          <Link to={`/student/applications/${app.id}`} className="btn btn-outline btn-xs py-1 px-2.5 rounded-lg text-[10px] font-bold">
                            {app.job_type === 'external' && app.status === 'selected' 
                              ? 'Upload Offer Letter' 
                              : app.status === 'selected' 
                                ? 'Respond to Offer' 
                                : 'View Pipeline'}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Placement Assignments (Direct assignments) */}
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-border-color bg-card-hover flex justify-between items-center">
               <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Direct Assignments</h3>
               <span className="badge badge-neutral">{placements.length} Total</span>
            </div>
            {placements.length === 0 ? (
              <div className="p-12 text-center text-secondary italic text-sm">No direct placements assigned.</div>
            ) : (
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table>
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
                        <td className="font-bold text-primary">{p.company_name}</td>
                        <td className="text-secondary">{p.position}</td>
                        <td className="font-bold text-primary">₹{Number(p.salary).toLocaleString()}</td>
                        <td>
                          <span className={`badge badge-${p.status === 'selected' ? 'success' : p.status === 'rejected' ? 'danger' : 'info'}`}>
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
            )}
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">

           {/* Hot Opportunities */}
           <div className="glass-panel p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <span>🔥</span> Hot Opportunities
              </h3>
              <div className="space-y-4">
                {profile?.upcoming_jobs?.length === 0 ? (
                  <p className="text-xs text-muted italic">No upcoming deadlines.</p>
                ) : (
                  profile?.upcoming_jobs?.map(job => (
                    <div key={job.id} className="p-4 border border-dark-300 rounded-2xl hover:bg-orange-500/5 transition-all group cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm text-primary tracking-tight">{job.role}</span>
                        {job.has_applied ? (
                          <span className="text-[10px] font-black text-success uppercase bg-success/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                            ✓ Applied
                          </span>
                        ) : (
                          <span className="text-xs font-black text-success">
                            ₹{job.package < 100 ? `${job.package} LPA` : Number(job.package).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-secondary mb-4 font-light">{job.company_name}</div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted flex items-center gap-1.5">
                          <Calendar size={10} /> 
                          {new Date(job.deadline).toLocaleDateString('en-IN', { 
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                        {new Date(job.deadline) - new Date() < 86400000 && (
                          <span className="text-[10px] text-danger font-black uppercase animate-pulse">Urgent</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
