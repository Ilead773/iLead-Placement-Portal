import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../api/axios';
import { 
  Briefcase, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const Internships = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/jobs/jobs/', {
        params: { _t: Date.now(), listing_type: 'internship' }
      });
      const sorted = (response.data || []).sort(
        (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
      );
      setJobs(sorted);
    } catch (err) {
      setError('Failed to fetch internships');
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

  if (loading) return <div className="p-8 text-center text-primary font-medium">Loading internships...</div>;
  if (error) return <div className="p-8 text-center text-error font-medium">{error}</div>;

  return (
    <div className="page-content">
      <div className="page-header mb-8">
        <h1 className="text-3xl font-black text-primary tracking-tight">Internship Opportunities</h1>
        <p className="text-secondary mt-2 font-medium">Find and apply to the best matching internships for your profile.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {jobs.map((job) => {
          const isEligible = job.eligibility?.eligible;
          const matchScore = job.eligibility?.match_score || 0;
          
          return (
            <div key={job.id} className={`card p-0 flex flex-col group transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border ${job.has_applied ? 'border-success/30' : 'border-border-color'}`}>
              {/* Header */}
              <div className="p-6 pb-4 flex justify-between items-start border-b border-border-color/50 bg-card-hover/30">
                <div>
                  <h3 className="text-xl font-bold text-primary group-hover:text-info transition-colors line-clamp-1">{job.role}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {job.company_website ? (
                      <a
                        href={job.company_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold hover:underline flex items-center gap-1"
                        style={{ color: 'var(--accent-primary)' }}
                        onClick={e => e.stopPropagation()}
                      >
                        {job.company_name} <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-secondary font-semibold text-sm">{job.company_name}</span>
                    )}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase ${matchScore > 80 ? 'bg-success/10 text-success' : 'bg-info/10 text-info'}`}>
                  {matchScore}% Match
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 flex-grow">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center text-sm text-secondary gap-1.5 font-medium">
                    <MapPin size={16} className="text-info" /> {job.location}
                  </div>
                  <div className="flex items-center text-sm text-secondary gap-1.5 font-medium">
                    <Briefcase size={16} className="text-info" /> ₹{job.package} / mo
                  </div>
                  <div className="flex items-center text-sm text-secondary gap-1.5 font-medium">
                    <Clock size={16} className="text-info" /> {job.duration || 'N/A'}
                  </div>
                </div>

                <div className="flex items-center text-sm text-secondary gap-1.5 font-medium">
                  <Calendar size={16} className="text-warning" />
                  Apply by: {new Date(job.application_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>

                {!job.has_applied && !isEligible && job.eligibility?.failing_checks?.length > 0 && (
                  <div className="bg-error/5 border border-error/20 p-3 rounded-xl">
                    <div className="flex items-center gap-2 text-error text-xs font-bold mb-1">
                      <AlertCircle size={14} /> NOT ELIGIBLE
                    </div>
                    <ul className="text-[11px] text-error/80 list-disc list-inside space-y-0.5">
                      {job.eligibility.failing_checks.map((c, i) => (
                        <li key={i}>{c.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="p-6 pt-0 mt-auto">
                {job.has_applied ? (
                  <div className="w-full py-3.5 bg-success/10 text-success rounded-2xl flex items-center justify-center gap-2 font-black text-sm uppercase tracking-widest border border-success/20">
                    <CheckCircle2 size={18} /> Applied ✓
                  </div>
                ) : !isEligible ? (
                  <button disabled className="w-full py-3.5 bg-border-color text-text-muted rounded-2xl font-black text-sm uppercase tracking-widest cursor-not-allowed">
                    Not Eligible
                  </button>
                ) : job.job_type === 'external' ? (
                  <a href={job.external_link} target="_blank" rel="noopener noreferrer" className="w-full py-3.5 bg-info text-white rounded-2xl flex items-center justify-center gap-2 font-black text-sm uppercase tracking-widest hover:bg-info/90 transition-all shadow-lg shadow-info/20">
                    Apply Externally <ExternalLink size={18} />
                  </a>
                ) : (
                  <button onClick={() => handleApply(job.id)} className="w-full py-3.5 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                    Apply Now
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {jobs.length === 0 && (
          <div className="col-span-full py-32 text-center bg-card-hover/20 rounded-3xl border-2 border-dashed border-border-color/50">
            <div className="text-secondary text-lg font-medium">No internships available at the moment.</div>
            <p className="text-text-muted text-sm mt-1">Check back later for new opportunities!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Internships;
