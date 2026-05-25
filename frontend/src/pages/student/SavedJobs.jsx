// src/pages/student/SavedJobs.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Briefcase, ArrowRight } from 'lucide-react';
import { jobFeedAPI } from '../../api/jobFeed';
import ExternalJobCard from '../../components/ExternalJobCard';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function SavedJobs() {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSaved();
  }, []);

  const fetchSaved = async () => {
    setLoading(true);
    try {
      const { data } = await jobFeedAPI.getSavedJobs({ page_size: 50 });
      setSavedJobs(data.results || []);
      setTotalCount(data.count || 0);
    } catch {
      toast.error('Failed to load saved jobs.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (jobId) => {
    setSavedJobs(prev => prev.filter(j => j.id !== jobId));
    setTotalCount(prev => prev - 1);
    try {
      await jobFeedAPI.unsaveJob(jobId);
      toast.success('Removed from saved');
    } catch {
      fetchSaved();
      toast.error('Failed to remove. Try again.');
    }
  };

  return (
    <div className="dash-page">
      <div className="ext-feed__header">
        <div>
          <h1 className="ext-feed__title">
            <Bookmark size={28} style={{ color: 'var(--accent-primary)' }} /> Saved Jobs
          </h1>
          <p className="ext-feed__subtitle">
            {totalCount > 0 ? `${totalCount} saved opportunities` : 'Your bookmarked jobs'}
          </p>
        </div>
      </div>

      {loading && (
        <div className="ext-feed__skeleton-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton skeleton-card" style={{ height: 280, borderRadius: 16 }} />
          ))}
        </div>
      )}

      {!loading && savedJobs.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <Bookmark size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <h3 style={{ marginBottom: 8 }}>No saved jobs yet</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 20px' }}>
            Bookmark jobs from your feed to keep track of opportunities you're interested in.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/student/job-feed')}>
            <Briefcase size={14} /> Go to Job Feed <ArrowRight size={14} />
          </button>
        </div>
      )}

      {!loading && savedJobs.length > 0 && (
        <motion.div
          className="ext-feed__grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <AnimatePresence mode="popLayout">
            {savedJobs.map((job, idx) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3, delay: idx * 0.03 }}
              >
                <ExternalJobCard
                  job={job}
                  isSaved={true}
                  onSaveToggle={() => handleUnsave(job.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
