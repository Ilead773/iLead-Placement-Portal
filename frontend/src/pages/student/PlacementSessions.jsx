// src/pages/student/PlacementSessions.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Video, Calendar, Clock, Users, CheckCircle, XCircle,
  AlertCircle, Play, Loader, BookOpen, ChevronDown, Award
} from 'lucide-react';
import placementSessionsAPI from '../../api/placementSessionsAPI';

import useAuthStore from '../../store/authStore';

const typeEmojis = {
  orientation: '🎓', company_talk: '🏢', interview_prep: '🎤',
  aptitude: '🧠', resume: '📄', general: '📋',
};

const typeLabels = {
  orientation: 'Orientation', company_talk: 'Company Talk',
  interview_prep: 'Interview Prep', aptitude: 'Aptitude Training',
  resume: 'Resume Workshop', general: 'General Session',
};

function StatusBadge({ status }) {
  const cfg = {
    present: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCircle size={11} />, label: 'Present' },
    late: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <AlertCircle size={11} />, label: 'Late' },
    absent: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle size={11} />, label: 'Absent' },
  };
  const c = cfg[status];
  if (!c) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${c.cls}`}>
      {c.icon} {c.label}
    </span>
  );
}

function Countdown({ targetDate }) {
  const [diff, setDiff] = useState(0);

  useEffect(() => {
    const update = () => setDiff(new Date(targetDate) - new Date());
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [targetDate]);

  if (diff <= 0) return null;

  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  return (
    <div className="flex items-center gap-1 text-xs text-blue-500 font-mono font-bold">
      <Clock size={11} />
      {hours > 0 && <span>{hours}h </span>}
      <span>{String(mins).padStart(2, '0')}m </span>
      <span>{String(secs).padStart(2, '0')}s</span>
    </div>
  );
}

export default function StudentPlacementSessions() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);

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

  const handleJoin = async (session) => {
    // Open a blank tab immediately to bypass browser popup blockers
    const newWindow = window.open('about:blank', '_blank', 'noopener,noreferrer');
    setJoiningId(session.id);
    const tid = toast.loading('Getting your join credentials...');
    
    try {
      const res = await placementSessionsAPI.join(session.id);
      const joinUrl = res.data.join_url || '';
      if (!joinUrl) {
        if (newWindow) newWindow.close();
        toast.error('No Zoom join link found for this session.', { id: tid });
        return;
      }
      toast.success('Opening Zoom session...', { id: tid });
      if (newWindow) {
        newWindow.location.href = joinUrl;
      } else {
        window.open(joinUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      if (newWindow) newWindow.close();
      toast.error(err?.response?.data?.detail || 'Failed to join session', { id: tid });
    } finally {
      setJoiningId(null);
    }
  };



  const getStatus = (s) => {
    const now = new Date();
    const start = new Date(s.start_time);
    const end = new Date(s.end_time);
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'live';
    return 'ended';
  };

  const canJoin = (s) => {
    const now = new Date();
    const start = new Date(s.start_time);
    const end = new Date(s.end_time);
    return now >= new Date(start.getTime() - 10 * 60 * 1000) && now <= end;
  };

  const liveSessions = sessions.filter(s => getStatus(s) === 'live');
  const upcomingSessions = sessions.filter(s => getStatus(s) === 'upcoming');
  const endedSessions = sessions.filter(s => getStatus(s) === 'ended');

  // Overall attendance stats from ended sessions
  const totalSessions = endedSessions.length;



  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Video size={26} className="text-primary" /> My Sessions
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Zoom sessions scheduled for you by the placement team. Join directly — no Zoom account needed.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader size={32} className="animate-spin text-primary" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 card rounded-2xl">
          <Video size={56} className="text-text-muted mx-auto mb-4 opacity-20" />
          <h3 className="font-semibold text-text-primary mb-1">No sessions yet</h3>
          <p className="text-text-muted text-sm">Your placement team hasn't scheduled any sessions for you yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Live Sessions */}
          {liveSessions.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="font-bold text-emerald-500 uppercase text-xs tracking-widest">Live Now</h2>
              </div>
              <div className="space-y-3">
                {liveSessions.map(s => (
                  <SessionCard key={s.id} session={s} statusLabel="live" onJoin={handleJoin}
                    joiningId={joiningId} canJoin={canJoin(s)} />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Sessions */}
          {upcomingSessions.length > 0 && (
            <section>
              <h2 className="font-bold text-blue-500 uppercase text-xs tracking-widest mb-3">Upcoming</h2>
              <div className="space-y-3">
                {upcomingSessions.map(s => (
                  <SessionCard key={s.id} session={s} statusLabel="upcoming" onJoin={handleJoin}
                    joiningId={joiningId} canJoin={canJoin(s)} />
                ))}
              </div>
            </section>
          )}

          {/* Past Sessions */}
          {endedSessions.length > 0 && (
            <section>
              <h2 className="font-bold text-text-muted uppercase text-xs tracking-widest mb-3">Past Sessions</h2>
              <div className="space-y-3">
                {endedSessions.map(s => (
                  <SessionCard key={s.id} session={s} statusLabel="ended" onJoin={handleJoin}
                    joiningId={joiningId} canJoin={canJoin(s)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SessionCard({ session, statusLabel, onJoin, joiningId, canJoin }) {
  const targetLabel = () => {
    const parts = [];
    if (session.target_courses?.length) parts.push(session.target_courses.join(', '));
    if (session.target_streams?.length) parts.push(session.target_streams.join(', '));
    if (session.target_years?.length) parts.push(session.target_years.join(', '));
    return parts.join(' · ') || 'All Students';
  };

  const isLive = statusLabel === 'live';
  const isUpcoming = statusLabel === 'upcoming';
  const isEnded = statusLabel === 'ended';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card rounded-2xl p-5 border-l-4 ${
        isLive ? 'border-emerald-500 bg-emerald-500/5' :
        isUpcoming ? 'border-blue-500' :
        'border-gray-300 dark:border-gray-600 opacity-75'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-2xl">{typeEmojis[session.session_type] || '📋'}</span>
            <div>
              <h3 className="font-bold text-text-primary text-base leading-tight">{session.title}</h3>
              <span className="text-xs text-text-muted">{typeLabels[session.session_type]}</span>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted mt-1">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {new Date(session.start_time).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {new Date(session.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              {' – '}
              {new Date(session.end_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>{session.duration_minutes} min</span>
          </div>

          {session.description && (
            <p className="text-xs text-text-muted mt-2 line-clamp-2">{session.description}</p>
          )}

          {isUpcoming && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-text-muted">Starts in: </span>
              <Countdown targetDate={session.start_time} />
            </div>
          )}
        </div>

        {/* Action area */}
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          {isLive && (
            <button
              onClick={() => onJoin(session)}
              disabled={!!joiningId}
              className="btn btn-primary flex items-center gap-2 text-sm px-5 py-2.5 animate-pulse"
            >
              {joiningId === session.id
                ? <><Loader size={14} className="animate-spin" /> Joining...</>
                : <><Play size={14} /> Join Now</>}
            </button>
          )}
          {isUpcoming && canJoin && (
            <button
              onClick={() => onJoin(session)}
              disabled={!!joiningId}
              className="btn btn-primary flex items-center gap-2 text-sm px-4 py-2"
            >
              {joiningId === session.id
                ? <><Loader size={14} className="animate-spin" /> Joining...</>
                : <><Play size={14} /> Join Early</>}
            </button>
          )}
          {isUpcoming && !canJoin && (
            <div className="text-center">
              <div className="text-xs text-text-muted bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5">
                Join button opens<br />10 min before start
              </div>
            </div>
          )}
          {isEnded && (
            <span className="text-xs text-text-muted italic">Session ended</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
