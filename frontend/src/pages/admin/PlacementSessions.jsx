// src/pages/admin/PlacementSessions.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Video, Plus, Calendar, Clock, Users, ChevronDown, ChevronRight,
  CheckCircle, XCircle, AlertCircle, Eye, Play, Trash2, BarChart2,
  Filter, X, UserCheck, UserX, Loader, BookOpen
} from 'lucide-react';
import placementSessionsAPI from '../../api/placementSessionsAPI';

import useAuthStore from '../../store/authStore';

const SESSION_TYPES = [
  { value: 'orientation', label: '🎓 Orientation' },
  { value: 'company_talk', label: '🏢 Company Talk' },
  { value: 'interview_prep', label: '🎤 Interview Prep' },
  { value: 'aptitude', label: '🧠 Aptitude Training' },
  { value: 'resume', label: '📄 Resume Workshop' },
  { value: 'general', label: '📋 General Session' },
];

const COURSE_OPTIONS = ['BCA', 'MCA', 'MBA', 'BBA', 'B.Tech', 'M.Tech', 'B.Sc', 'M.Sc', 'B.Com', 'M.Com'];
const STREAM_OPTIONS = ['CS', 'IT', 'EC', 'EE', 'ME', 'CE', 'Finance', 'Marketing', 'HR'];
const YEAR_OPTIONS = ['1st', '2nd', '3rd', '4th'];

function StatusBadge({ status }) {
  const styles = {
    present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    late: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const icons = { present: <CheckCircle size={12} />, late: <AlertCircle size={12} />, absent: <XCircle size={12} /> };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || ''}`}>
      {icons[status]} {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}

export default function AdminPlacementSessions() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [activeTab, setActiveTab] = useState('sessions'); // sessions | attendance | live


  const [form, setForm] = useState({
    title: '',
    description: '',
    session_type: 'general',
    start_time: '',
    end_time: '',
    target_courses: [],
    target_streams: [],
    target_years: [],
  });

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await placementSessionsAPI.list();
      setSessions(res.data);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFilter = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.start_time || !form.end_time) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    const tid = toast.loading('Creating session & generating Zoom meeting...');
    try {
      await placementSessionsAPI.schedule({
        ...form,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
      });
      toast.success('Session created! Zoom meeting generated ✅', { id: tid });
      setShowForm(false);
      setForm({ title: '', description: '', session_type: 'general', start_time: '', end_time: '', target_courses: [], target_streams: [], target_years: [] });
      fetchSessions();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create session', { id: tid });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewAttendance = async (session) => {
    setSelectedSession(session);
    setActiveTab('attendance');
    setLoadingAttendance(true);
    try {
      const res = await placementSessionsAPI.attendance(session.id);
      setAttendanceData(res.data);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleStartLive = async (session) => {
    const tid = toast.loading('Getting host credentials...');
    try {
      const res = await placementSessionsAPI.start(session.id);
      // Open the Zoom start_url directly in a new tab (auto-logs in as host)
      const startUrl = res.data.start_url || res.data.join_url || '';
      if (!startUrl) {
        toast.error('No Zoom start link found for this session.', { id: tid });
        return;
      }
      toast.success('Opening Zoom as host...', { id: tid });
      window.open(startUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to start session', { id: tid });
    }
  };

  const handleCancel = async (sessionId) => {
    if (!window.confirm('Cancel this session?')) return;
    try {
      await placementSessionsAPI.cancel(sessionId);
      toast.success('Session cancelled');
      fetchSessions();
    } catch {
      toast.error('Failed to cancel session');
    }
  };

  const handleOverride = async (sessionId, attendanceId, newStatus) => {
    try {
      await placementSessionsAPI.overrideAttendance(sessionId, attendanceId, newStatus);
      toast.success('Attendance updated');
      handleViewAttendance(selectedSession);
    } catch {
      toast.error('Failed to update attendance');
    }
  };

  const getSessionStatus = (s) => {
    const now = new Date();
    const start = new Date(s.start_time);
    const end = new Date(s.end_time);
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'live';
    return 'ended';
  };

  const upcomingSessions = sessions.filter(s => getSessionStatus(s) === 'upcoming');
  const liveSessions = sessions.filter(s => getSessionStatus(s) === 'live');
  const endedSessions = sessions.filter(s => getSessionStatus(s) === 'ended');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Video size={26} className="text-primary" /> Placement Sessions
          </h1>
          <p className="text-text-muted text-sm mt-1">Schedule Zoom sessions for students — attendance tracked automatically</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
          <Plus size={16} /> Schedule Session
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 mb-6 border-b border-border-color">
        {[
          { key: 'sessions', label: 'All Sessions', icon: <Calendar size={15} /> },
          { key: 'attendance', label: 'Attendance Report', icon: <BarChart2 size={15} /> },
          { key: 'live', label: 'Live Host', icon: <Play size={15} /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── SESSIONS TAB ── */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total', value: sessions.length, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Live Now', value: liveSessions.length, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'Upcoming', value: upcomingSessions.length, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Ended', value: endedSessions.length, color: 'text-text-muted', bg: 'bg-gray-500/10' },
            ].map(stat => (
              <div key={stat.label} className={`card p-4 rounded-xl flex items-center gap-3`}>
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
                </div>
                <span className="text-text-muted text-sm font-medium">{stat.label}</span>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader size={32} className="animate-spin text-primary" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-20 card rounded-2xl">
              <Video size={48} className="text-text-muted mx-auto mb-4 opacity-30" />
              <p className="text-text-muted">No sessions yet. Click "Schedule Session" to create one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Live first */}
              {liveSessions.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Now
                  </h3>
                  {liveSessions.map(s => <SessionCard key={s.id} session={s} status="live"
                    onViewAttendance={handleViewAttendance} onStartLive={handleStartLive} onCancel={handleCancel} />)}
                </div>
              )}
              {upcomingSessions.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">Upcoming</h3>
                  {upcomingSessions.map(s => <SessionCard key={s.id} session={s} status="upcoming"
                    onViewAttendance={handleViewAttendance} onStartLive={handleStartLive} onCancel={handleCancel} />)}
                </div>
              )}
              {endedSessions.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Ended</h3>
                  {endedSessions.map(s => <SessionCard key={s.id} session={s} status="ended"
                    onViewAttendance={handleViewAttendance} onStartLive={handleStartLive} onCancel={handleCancel} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {activeTab === 'attendance' && (
        <div>
          {!selectedSession ? (
            <div className="text-center py-20 card rounded-2xl">
              <BarChart2 size={48} className="text-text-muted mx-auto mb-4 opacity-30" />
              <p className="text-text-muted">Click "View Attendance" on any ended session</p>
            </div>
          ) : loadingAttendance ? (
            <div className="flex justify-center py-16"><Loader size={32} className="animate-spin text-primary" /></div>
          ) : attendanceData && (
            <div className="space-y-6">
              <div className="card rounded-2xl p-5">
                <h2 className="font-bold text-lg text-text-primary">{selectedSession.title}</h2>
                <p className="text-text-muted text-sm mt-1">{new Date(selectedSession.start_time).toLocaleString()}</p>
                <div className="grid grid-cols-4 gap-4 mt-4">
                  {[
                    { label: 'Total', value: attendanceData.summary.total_students },
                    { label: 'Present', value: attendanceData.summary.present, color: 'text-emerald-500' },
                    { label: 'Late', value: attendanceData.summary.late, color: 'text-amber-500' },
                    { label: 'Absent', value: attendanceData.summary.absent, color: 'text-red-500' },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <div className={`text-2xl font-bold ${s.color || 'text-primary'}`}>{s.value}</div>
                      <div className="text-xs text-text-muted">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-primary h-2 rounded-full transition-all"
                    style={{ width: `${attendanceData.summary.attendance_rate}%` }}
                  />
                </div>
                <p className="text-right text-xs text-text-muted mt-1">{attendanceData.summary.attendance_rate}% attendance rate</p>
              </div>

              <div className="card rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      {['Student', 'Duration', 'Join Count', 'Attendance %', 'Status', 'Override'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color">
                    {attendanceData.records.map(rec => (
                      <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3">
                          <div className="font-medium text-text-primary">{rec.student_name}</div>
                          <div className="text-xs text-text-muted">{rec.student_email}</div>
                        </td>
                        <td className="px-4 py-3 text-text-muted">{rec.total_duration_minutes} min</td>
                        <td className="px-4 py-3 text-text-muted">{rec.join_count}×</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 w-16">
                              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${rec.attendance_percent}%` }} />
                            </div>
                            <span className="text-xs font-bold">{rec.attendance_percent}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={rec.status} /></td>
                        <td className="px-4 py-3">
                          <select
                            value={rec.status}
                            onChange={e => handleOverride(selectedSession.id, rec.id, e.target.value)}
                            className="input-field text-xs py-1 px-2 w-24"
                          >
                            <option value="present">Present</option>
                            <option value="late">Late</option>
                            <option value="absent">Absent</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LIVE HOST TAB ── */}
      {activeTab === 'live' && (
        <div className="text-center py-20 card rounded-2xl">
          <Play size={48} className="text-text-muted mx-auto mb-4 opacity-30" />
          <p className="text-text-muted font-medium">Click <strong>"Start as Host"</strong> on any live or upcoming session.</p>
          <p className="text-text-muted text-sm mt-1">Zoom will open in a new tab — you'll be automatically logged in as host.</p>
        </div>
      )}

      {/* ── CREATE SESSION MODAL ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    <Video size={20} className="text-primary" /> Schedule Zoom Session
                  </h2>
                  <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Session Title *</label>
                    <input
                      className="input-field w-full"
                      placeholder="e.g. TCS Company Talk 2026"
                      value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
                    <textarea
                      className="input-field w-full h-20 resize-none"
                      placeholder="What is this session about?"
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Session Type</label>
                    <select
                      className="input-field w-full"
                      value={form.session_type}
                      onChange={e => setForm(p => ({ ...p, session_type: e.target.value }))}
                    >
                      {SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>

                  {/* Date/Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Start Time *</label>
                      <input
                        type="datetime-local"
                        className="input-field w-full"
                        value={form.start_time}
                        onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">End Time *</label>
                      <input
                        type="datetime-local"
                        className="input-field w-full"
                        value={form.end_time}
                        onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  {/* Targeting filters */}
                  <div className="border border-border-color rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <Filter size={14} className="text-primary" /> Student Filters
                      <span className="text-xs font-normal text-text-muted">(leave all empty = all students)</span>
                    </p>

                    <div>
                      <label className="block text-xs text-text-muted mb-1.5">By Course</label>
                      <div className="flex flex-wrap gap-1.5">
                        {COURSE_OPTIONS.map(c => (
                          <button
                            key={c} type="button"
                            onClick={() => handleToggleFilter('target_courses', c)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                              form.target_courses.includes(c)
                                ? 'bg-primary text-white border-primary'
                                : 'border-border-color text-text-muted hover:border-primary hover:text-primary'
                            }`}
                          >{c}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-text-muted mb-1.5">By Stream</label>
                      <div className="flex flex-wrap gap-1.5">
                        {STREAM_OPTIONS.map(s => (
                          <button
                            key={s} type="button"
                            onClick={() => handleToggleFilter('target_streams', s)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                              form.target_streams.includes(s)
                                ? 'bg-violet-600 text-white border-violet-600'
                                : 'border-border-color text-text-muted hover:border-violet-600 hover:text-violet-600'
                            }`}
                          >{s}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-text-muted mb-1.5">By Year</label>
                      <div className="flex gap-1.5">
                        {YEAR_OPTIONS.map(y => (
                          <button
                            key={y} type="button"
                            onClick={() => handleToggleFilter('target_years', y)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                              form.target_years.includes(y)
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'border-border-color text-text-muted hover:border-emerald-600 hover:text-emerald-600'
                            }`}
                          >{y} Year</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Selected filter summary */}
                  {(form.target_courses.length > 0 || form.target_streams.length > 0 || form.target_years.length > 0) && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-primary">
                      📢 This session will be visible to: {' '}
                      {form.target_courses.length > 0 && <strong>{form.target_courses.join(', ')} </strong>}
                      {form.target_streams.length > 0 && <span>({form.target_streams.join(', ')}) </span>}
                      {form.target_years.length > 0 && <span>{form.target_years.join(', ')} year</span>}
                      {' '} students only.
                    </div>
                  )}
                  {form.target_courses.length === 0 && form.target_streams.length === 0 && form.target_years.length === 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400">
                      ⚠️ No filters selected — this session will be visible to ALL students.
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">Cancel</button>
                    <button type="submit" disabled={submitting} className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                      {submitting ? <><Loader size={15} className="animate-spin" /> Creating...</> : <><Video size={15} /> Create & Generate Zoom</>}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SessionCard({ session, status, onViewAttendance, onStartLive, onCancel }) {
  const statusStyles = {
    live: 'border-l-4 border-emerald-500 bg-emerald-500/5',
    upcoming: 'border-l-4 border-blue-500',
    ended: 'border-l-4 border-gray-300 dark:border-gray-600 opacity-80',
  };
  const typeEmojis = {
    orientation: '🎓', company_talk: '🏢', interview_prep: '🎤',
    aptitude: '🧠', resume: '📄', general: '📋',
  };

  const targetLabel = () => {
    const parts = [];
    if (session.target_courses?.length) parts.push(session.target_courses.join(', '));
    if (session.target_streams?.length) parts.push(session.target_streams.join(', '));
    if (session.target_years?.length) parts.push(session.target_years.map(y => y + ' Year').join(', '));
    return parts.length ? parts.join(' · ') : 'All Students';
  };

  return (
    <div className={`card rounded-xl p-4 mb-2 ${statusStyles[status]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">{typeEmojis[session.session_type] || '📋'}</span>
            <h3 className="font-semibold text-text-primary">{session.title}</h3>
            {status === 'live' && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full font-bold animate-pulse">
                🔴 LIVE
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-text-muted flex-wrap">
            <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(session.start_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span className="flex items-center gap-1"><Clock size={11} /> {new Date(session.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} – {new Date(session.end_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="flex items-center gap-1"><Users size={11} /> {targetLabel()}</span>
            <span>{session.duration_minutes} min</span>
          </div>
          {session.description && <p className="text-xs text-text-muted mt-1 truncate">{session.description}</p>}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {status === 'ended' && (
            <button onClick={() => onViewAttendance(session)} className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
              <BarChart2 size={13} /> Attendance
            </button>
          )}
          {(status === 'live' || status === 'upcoming') && (
            <button onClick={() => onStartLive(session)} className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
              <Play size={13} /> {status === 'live' ? 'Host Live' : 'Start Early'}
            </button>
          )}
          {status !== 'ended' && (
            <button onClick={() => onCancel(session.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
