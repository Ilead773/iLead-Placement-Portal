import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../api/axios';
import JobCard from '../../components/JobCard';
import { toast } from 'react-hot-toast';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      // Cache-busting: always fetch fresh data from backend
      const response = await axios.get('/jobs/jobs/', {
        params: { _t: Date.now() }
      });
      // Sort by most recently updated so admin edits surface immediately
      const sorted = (response.data || []).sort(
        (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
      );
      setJobs(sorted);
      setError(null);
    } catch (err) {
      setError('Failed to fetch jobs. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Auto-refresh when student switches back to the tab (picks up admin edits)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchJobs();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchJobs]);

  const handleApply = async (jobId) => {
    const loadingToast = toast.loading('Submitting application...');
    try {
      await axios.post('/applications/applications/', { job_id: jobId });
      toast.success('Successfully applied for the job! 🚀', { id: loadingToast });
      fetchJobs();
    } catch (err) {
      const respStatus = err.response?.status;
      const data = err.response?.data;
      
      if (respStatus === 409) {
        toast.error('You have already applied for this job.', { id: loadingToast });
        fetchJobs();
      } else if (respStatus === 400 && data?.reasons) {
        toast.dismiss(loadingToast);
        toast.error((t) => (
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm text-red-600 dark:text-red-400">Application Failed: Not Eligible</span>
            <ul className="list-disc pl-4 text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1 space-y-1">
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

  if (loading) return <div className="p-8 text-center">Loading jobs...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="page-content">
      <div className="page-header mb-8">
        <div>
          <h1 className="text-3xl font-bold">Available Opportunities</h1>
          <p className="text-secondary mt-2">Find and apply to the best matching jobs for your profile.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map(job => (
          <JobCard 
            key={job.id} 
            job={job} 
            eligibility={job.eligibility} 
            onApply={handleApply} 
          />
        ))}
      </div>
      
      {jobs.length === 0 && (
        <div className="text-center py-12 bg-card border border-border-color rounded-lg">
          <p className="text-secondary text-lg">No active jobs available at the moment.</p>
        </div>
      )}
    </div>
  );
};
export default Jobs;
