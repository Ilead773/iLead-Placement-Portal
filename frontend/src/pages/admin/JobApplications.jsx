import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Activity, Trash2, AlertTriangle } from 'lucide-react';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import EmailLogPanel from '../../components/EmailLogPanel';

const JobApplications = () => {
  const { id } = useParams();
  const [applications, setApplications] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEmailLog, setShowEmailLog] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());

  const eligibleApplications = useMemo(() => {
    return applications.filter(app => app.job_type === 'external' || app.current_eligibility?.eligible !== false);
  }, [applications]);

  const mismatchedApplicationsCount = useMemo(() => {
    return applications.filter(app => app.job_type !== 'external' && app.current_eligibility?.eligible === false).length;
  }, [applications]);

  const fetchJobDetails = useCallback(async () => {
    try {
      const response = await axios.get(`/jobs/admin/jobs/${id}/`, {
        params: { _t: Date.now() }
      });
      setJob(response.data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const fetchApplications = useCallback(async () => {
    try {
      const response = await axios.get(`/jobs/admin/jobs/${id}/applications/`, {
        params: { _t: Date.now() }
      });
      setApplications(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const deleteApplication = async (appId, studentName) => {
    if (deletingIds.has(appId)) return;
    if (!window.confirm(`Are you sure you want to delete ${studentName || 'this student'}'s application? This action is permanent and cannot be undone.`)) {
      return;
    }
    const toastId = toast.loading('Deleting application...');
    setDeletingIds(prev => new Set(prev).add(appId));
    try {
      await axios.delete(`/applications/admin/applications/${appId}/`);
      toast.success('Application deleted successfully', { id: toastId });
      setApplications(prev => prev.filter(app => app.id !== appId));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to delete application', { id: toastId });
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(appId);
        return next;
      });
    }
  };

  useEffect(() => {
    fetchJobDetails();
    fetchApplications();
  }, [fetchJobDetails, fetchApplications]);

  // Auto-refresh when admin switches back to this tab
  useEffect(() => {
    const handleVisChange = () => {
      if (document.visibilityState === 'visible') {
        fetchApplications();
      }
    };
    document.addEventListener('visibilitychange', handleVisChange);
    return () => document.removeEventListener('visibilitychange', handleVisChange);
  }, [fetchApplications]);

  if (loading) return <div className="p-8 text-center">Loading applications...</div>;

  return (
    <div>
      <div className="page-header mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Job Applications
          </h1>
          <p className="text-secondary text-sm mt-1">
            {job ? (
              <>
                Managing applications for <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>{job.role || job.title}</span> at <span className="font-bold text-primary">{job.company_name}</span>
              </>
            ) : (
              'Loading recruitment campaign details...'
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/pipeline" className="btn btn-secondary btn-sm flex items-center gap-2">
            <Activity size={14} /> Job Pipeline
          </Link>
          <button 
            onClick={() => setShowEmailLog(!showEmailLog)}
            className="btn btn-secondary btn-sm"
          >
            {showEmailLog ? 'Hide Email History' : 'View Email History'}
          </button>
          <span className="badge badge-neutral px-3 py-1 text-xs font-bold">Total: {eligibleApplications.length}</span>
        </div>
      </div>

      <EmailLogPanel jobId={id} isVisible={showEmailLog} />

      {mismatchedApplicationsCount > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-warning/5 border border-warning/20 text-warning flex items-start gap-3 animate-in">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-warning" />
          <div>
            <h4 className="font-bold text-sm m-0 text-warning">Mismatched Candidates Hidden</h4>
            <p className="text-xs text-secondary mt-1 leading-relaxed">
              There are {mismatchedApplicationsCount} candidate(s) who no longer match the updated criteria for this job. They have been automatically filtered out of the active applications view.
            </p>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Branch/Course</th>
              <th>CGPA</th>
              <th>Criteria Check</th>
              <th>Status</th>
              <th>Current Round</th>
              <th>Resume</th>
              <th>Offer Letter</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {eligibleApplications.map((app) => (
              <tr key={app.id}>
                <td className="font-bold text-primary">{app.student_name}</td>
                <td className="text-secondary font-medium">{app.student_stream || 'N/A'}</td>
                <td className="font-bold text-primary">{app.student_cgpa ? app.student_cgpa.toFixed(2) : 'N/A'}</td>
                <td>
                  {app.job_type === 'external' ? (
                    <span className="text-secondary text-[10px] font-black uppercase tracking-tighter bg-slate-500/10 px-2 py-1 rounded border border-slate-500/20 flex items-center gap-1 w-fit">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 3h7v7m0-7L10 14m-4 7h7a2 2 0 002-2v-7M6 7a2 2 0 012-2h7" /></svg>
                      Off-Campus
                    </span>
                  ) : app.current_eligibility?.eligible ? (
                    <span className="text-success text-xs font-bold flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      Eligible
                    </span>
                  ) : (
                    <span className="text-error text-[10px] font-black uppercase tracking-tighter bg-error/10 px-2 py-1 rounded border border-error/20 flex items-center gap-1 w-fit">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Mismatch
                    </span>
                  )}
                </td>
                <td>
                  <span className={`badge 
                    ${app.status === 'applied' ? 'badge-neutral' : 
                      app.status === 'shortlisted' ? 'badge-info' : 
                      app.status === 'selected' || app.status === 'accepted' ? 'badge-success' : 
                      'badge-danger'}`} style={{ textTransform: 'capitalize' }}>
                    {app.status}
                  </span>
                </td>
                <td className="text-secondary font-medium">
                  {app.current_round ? app.current_round.round_name : 'N/A'}
                </td>
                <td>
                  {app.resume_url ? (
                    <a href={app.resume_url} target="_blank" rel="noopener noreferrer" className="text-info hover:underline flex items-center gap-1 font-bold">
                      📄 Resume
                    </a>
                  ) : (
                    <span className="text-secondary">—</span>
                  )}
                </td>
                <td>
                  {app.offer_letter_file ? (
                    <a href={app.offer_letter_file} target="_blank" rel="noopener noreferrer" className="text-success hover:underline flex items-center gap-1 font-bold">
                      📁 Offer Letter
                    </a>
                  ) : app.status === 'selected' || app.status === 'accepted' ? (
                    <span className="text-warning text-xs italic font-bold animate-pulse bg-warning/5 border border-warning/10 px-2 py-0.5 rounded-full inline-block">Pending upload</span>
                  ) : (
                    <span className="text-secondary">—</span>
                  )}
                </td>
                <td className="text-right">
                  <button 
                    onClick={() => deleteApplication(app.id, app.student_name)}
                    disabled={deletingIds.has(app.id)}
                    className={`p-1.5 text-red-500 hover:bg-red-500/10 hover:text-red-700 rounded-xl transition-all ${deletingIds.has(app.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ border: 'none', background: 'transparent', cursor: deletingIds.has(app.id) ? 'not-allowed' : 'pointer' }}
                    title="Delete Application"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {eligibleApplications.length === 0 && (
              <tr>
                <td colSpan="9" className="text-center text-secondary py-8">No applications found for this job.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default JobApplications;
