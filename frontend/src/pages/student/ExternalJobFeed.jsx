// src/pages/student/ExternalJobFeed.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Briefcase, GraduationCap, Clock, AlertCircle, Search, SlidersHorizontal, Bookmark } from 'lucide-react';
import { jobFeedAPI } from '../../api/jobFeed';
import ExternalJobCard from '../../components/ExternalJobCard';
import toast from 'react-hot-toast';

export default function ExternalJobFeed() {
  const [jobs, setJobs] = useState([]);
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('jobs');
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [sort, setSort] = useState('-quality_score');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalInternships, setTotalInternships] = useState(0);
  const [studentCourse, setStudentCourse] = useState('');
  const [cacheFresh, setCacheFresh] = useState(true);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await jobFeedAPI.getFeed({ sort });
      setJobs(data.jobs.results || []);
      setInternships(data.internships.results || []);
      setTotalJobs(data.jobs.count || 0);
      setTotalInternships(data.internships.count || 0);
      setStudentCourse(data.course || '');
      setLastUpdated(data.last_updated);
      setCacheFresh(data.cache_fresh);
      const ids = new Set([
        ...(data.jobs.results || []).filter(j => j.is_saved).map(j => j.id),
        ...(data.internships.results || []).filter(j => j.is_saved).map(j => j.id),
      ]);
      setSavedJobIds(ids);
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.error === 'no_course') {
        setError('no_course');
      } else {
        setError('fetch_failed');
      }
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const handleSaveToggle = async (jobId, currentlySaved) => {
    const prev = new Set(savedJobIds);
    if (currentlySaved) {
      savedJobIds.delete(jobId);
    } else {
      savedJobIds.add(jobId);
    }
    setSavedJobIds(new Set(savedJobIds));
    try {
      if (currentlySaved) {
        await jobFeedAPI.unsaveJob(jobId);
        toast.success('Removed from saved');
      } else {
        await jobFeedAPI.saveJob(jobId);
        toast.success('Job saved!');
      }
    } catch {
      setSavedJobIds(prev);
      toast.error('Failed to update. Try again.');
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 3600) return 'Just now';
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const sortOptions = [
    { value: '-quality_score', label: 'Most Relevant' },
    { value: '-scraped_at', label: 'Newest First' },
    { value: '-salary_max', label: 'Highest Salary' },
  ];

  const activeItems = activeTab === 'jobs' ? jobs : internships;

  if (error === 'no_course') {
    return (
      <div className="dash-page">
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <AlertCircle size={48} style={{ color: 'var(--warning)', marginBottom: 16 }} />
          <h2 style={{ marginBottom: 8 }}>Course Not Configured</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
            Your enrolled course is not set up yet. Please contact your coordinator to get your course assigned.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-page">
      {/* Header */}
      <div className="ext-feed__header">
        <div>
          <h1 className="ext-feed__title">
            <Briefcase size={28} style={{ color: 'var(--accent-primary)' }} /> Job Feed
          </h1>
          <p className="ext-feed__subtitle">
            Fresh opportunities for <strong>{studentCourse || 'your course'}</strong> students
          </p>
          {lastUpdated && (
            <span className="ext-feed__updated">
              <Clock size={14} /> Updated {timeAgo(lastUpdated)}
            </span>
          )}
        </div>
        <div className="ext-feed__header-actions">
          {!cacheFresh && (
            <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
              Feed updating...
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={fetchFeed} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spinning' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error === 'fetch_failed' && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={36} style={{ color: 'var(--danger)', marginBottom: 12 }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Failed to load jobs. Please try again.</p>
          <button className="btn btn-primary btn-sm" onClick={fetchFeed}>Retry</button>
        </div>
      )}

      {loading && !error && (
        <div className="ext-feed__skeleton-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton skeleton-card" style={{ height: 280, borderRadius: 16 }} />
          ))}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Stats */}
          <div className="ext-feed__stats">
            <div className="ext-feed__stat">
              <Briefcase size={16} /> <strong>{totalJobs}</strong> Jobs
            </div>
            <div className="ext-feed__stat">
              <GraduationCap size={16} /> <strong>{totalInternships}</strong> Internships
            </div>
            <div className="ext-feed__stat">
              <Clock size={16} /> Last 48 hours
            </div>
          </div>

          {/* Controls */}
          <div className="ext-feed__controls">
            <div className="ext-feed__tabs">
              <button
                className={`ext-feed__tab ${activeTab === 'jobs' ? 'active' : ''}`}
                onClick={() => setActiveTab('jobs')}
              >
                Jobs ({totalJobs})
              </button>
              <button
                className={`ext-feed__tab ${activeTab === 'internships' ? 'active' : ''}`}
                onClick={() => setActiveTab('internships')}
              >
                Internships ({totalInternships})
              </button>
            </div>
            <div className="ext-feed__sort">
              <SlidersHorizontal size={14} />
              <select
                className="input-field"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '0.8rem', maxWidth: 180 }}
              >
                {sortOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid */}
          {activeItems.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
              <Briefcase size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
              <h3 style={{ marginBottom: 8 }}>
                No {activeTab === 'jobs' ? 'jobs' : 'internships'} found
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 20px' }}>
                New opportunities are scraped every night. Check back tomorrow!
              </p>
              <a href="/student/saved-jobs" className="btn btn-outline btn-sm">
                <Bookmark size={14} /> View Saved Jobs
              </a>
            </div>
          ) : (
            <motion.div
              className="ext-feed__grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence mode="popLayout">
                {activeItems.map((job, idx) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: idx * 0.03 }}
                  >
                    <ExternalJobCard
                      job={job}
                      isSaved={savedJobIds.has(job.id)}
                      onSaveToggle={handleSaveToggle}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
