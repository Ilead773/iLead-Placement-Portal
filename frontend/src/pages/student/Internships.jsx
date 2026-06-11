import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../api/axios';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import JobCard from '../../components/JobCard';

const InternshipCardSkeleton = () => {
  return (
    <div className="card p-0 flex flex-col animate-pulse pointer-events-none select-none border border-border-color/50">
      {/* Header */}
      <div className="p-6 pb-4 flex justify-between items-start border-b border-border-color/50 bg-card-hover/10">
        <div className="w-2/3 space-y-2">
          {/* Title skeleton */}
          <div className="h-6 bg-slate-200 dark:bg-zinc-800 rounded-lg w-5/6"></div>
          {/* Company skeleton */}
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6 flex-grow">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
            <div className="h-3.5 bg-slate-200 dark:bg-zinc-800 rounded-md w-16"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
            <div className="h-3.5 bg-slate-200 dark:bg-zinc-800 rounded-md w-20"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
            <div className="h-3.5 bg-slate-200 dark:bg-zinc-800 rounded-md w-16"></div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
          <div className="h-3.5 bg-slate-200 dark:bg-zinc-800 rounded-md w-32"></div>
        </div>
      </div>

      {/* Action */}
      <div className="p-6 pt-0 mt-auto">
        <div className="h-12 bg-slate-200 dark:bg-zinc-800 rounded-2xl w-full"></div>
      </div>
    </div>
  );
};

const ErrorState = ({ message, onRetry }) => {
  return (
    <div className="col-span-full flex flex-col items-center justify-center text-center py-16 px-6 bg-card border border-border-color rounded-2xl max-w-xl mx-auto shadow-md my-8">
      <div className="p-4 bg-red-500/10 dark:bg-red-500/20 text-red-500 rounded-full mb-4 animate-bounce">
        <AlertCircle size={40} />
      </div>
      <h3 className="text-xl font-bold text-primary mb-2">Failed to Load Internships</h3>
      <p className="text-secondary text-sm max-w-md mb-6 leading-relaxed">
        {message || "We encountered an issue while fetching the latest internship opportunities. Please try again later."}
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl inline-flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        style={{ backgroundColor: 'var(--accent-primary)' }}
      >
        <RefreshCw size={16} />
        Try Again
      </button>
    </div>
  );
};

const Internships = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/jobs/jobs/', {
        params: { _t: Date.now(), listing_type: 'internship' }
      });
      const sorted = (response.data || []).sort(
        (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
      );
      // Only show opportunities that are active and the student is eligible for or has already applied to
      const eligible = sorted.filter(
        job => job.status === 'active' && (job.eligibility?.eligible || job.has_applied)
      );
      setJobs(eligible);
    } catch (err) {
      setError('Failed to fetch internships. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    
    const handleVisChange = () => {
      if (document.visibilityState === 'visible') fetchJobs();
    };
    document.addEventListener('visibilitychange', handleVisChange);
    return () => document.removeEventListener('visibilitychange', handleVisChange);
  }, [fetchJobs]);

  const handleApply = async (jobId) => {
    const loadingToast = toast.loading('Submitting application...');
    try {
      await axios.post('/applications/applications/', { job_id: jobId });
      toast.success('Successfully applied for the internship! 🚀', { id: loadingToast });
      fetchJobs();
    } catch (err) {
      const respStatus = err.response?.status;
      const data = err.response?.data;
      
      if (respStatus === 409) {
        toast.error('You have already applied for this internship.', { id: loadingToast });
        fetchJobs();
      } else if (respStatus === 400 && data?.reasons) {
        toast.dismiss(loadingToast);
        toast.error((t) => (
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm text-red-600">Application Failed: Not Eligible</span>
            <ul className="list-disc pl-4 text-xs font-semibold text-slate-800 mt-1 space-y-1">
              {data.reasons.map((r, i) => (
                <li key={i}>{r.reason}</li>
              ))}
            </ul>
          </div>
        ), { duration: 6000 });
      } else {
        const errorMsg = data?.error || JSON.stringify(data) || err.message || 'Unknown error';
        toast.error(`Application error (${respStatus}): ${errorMsg}`, { id: loadingToast });
      }
    }
  };

  return (
    <div>
      <div className="page-header mb-8">
        <h1 className="text-3xl font-black text-primary tracking-tight">Internship Opportunities</h1>
        <p className="text-secondary mt-2 font-medium">Find and apply to the best matching internships for your profile.</p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchJobs} />
      ) : (
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" layout>
          <AnimatePresence mode="popLayout">
            {loading ? (
              Array(6).fill(null).map((_, i) => (
                <motion.div
                  key={`skeleton-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <InternshipCardSkeleton />
                </motion.div>
              ))
            ) : (
              jobs.map((job) => (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <JobCard 
                    job={job} 
                    eligibility={job.eligibility} 
                    onApply={handleApply} 
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
          {!loading && !error && jobs.length === 0 && (
            <div className="col-span-full py-32 text-center bg-card-hover/20 rounded-3xl border-2 border-dashed border-border-color/50">
              <div className="text-secondary text-lg font-medium">No internships available at the moment.</div>
              <p className="text-text-muted text-sm mt-1">Check back later for new opportunities!</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default Internships;
