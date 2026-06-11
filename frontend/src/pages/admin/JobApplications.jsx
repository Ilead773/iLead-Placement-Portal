import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Activity, 
  Trash2, 
  AlertTriangle, 
  X, 
  Upload, 
  Check, 
  AlertCircle, 
  FileText, 
  Loader2, 
  Download 
} from 'lucide-react';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import EmailLogPanel from '../../components/EmailLogPanel';

// Offer Letter Review & Upload Modal
export const OfferLetterModal = ({ application, onClose, onSave }) => {
  const [file, setFile] = useState(null);
  const [feedback, setFeedback] = useState(application.offer_letter_feedback || '');
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleStatusUpdate = async (status, feedText = '') => {
    setSubmitting(true);
    setUploadError('');
    try {
      const payload = {
        offer_letter_status: status,
        offer_letter_feedback: feedText || null
      };
      await axios.patch(`/applications/applications/${application.id}/`, payload);
      toast.success(`Offer letter marked as ${status}!`);
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update offer letter status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setUploadError('');
    const toastId = toast.loading('Uploading offer letter on behalf of student...');
    try {
      const formData = new FormData();
      formData.append('offer_letter_file', file);
      formData.append('offer_letter_status', 'approved'); // Admin uploads are auto-approved
      
      await axios.patch(`/applications/applications/${application.id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Offer letter uploaded and approved successfully! 🎉', { id: toastId });
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      setUploadError('Failed to upload document.');
      toast.error('Failed to upload document.', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const isPdf = application.offer_letter_file?.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif)$/i.test(application.offer_letter_file || '');

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
    }} onClick={onClose}>
      <div className="modal-card" style={{
        width: '95%', maxWidth: '600px', maxHeight: '90vh', overflow: 'hidden',
        background: 'var(--bg-card, #ffffff)', borderRadius: '24px',
        border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex', flexDirection: 'column'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.05))',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h3 className="font-extrabold text-primary text-base m-0">Offer Letter Management</h3>
            <p className="text-[11px] text-secondary m-0 mt-1">
              Candidate: <strong>{application.student_name}</strong> • Role: {application.job_title}
            </p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-primary text-lg font-bold" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>&times;</button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }} className="space-y-6">
          {/* Status Display */}
          <div className="p-4 rounded-2xl border flex items-center justify-between" style={{
            background: 'var(--bg-input, rgba(0,0,0,0.02))',
            borderColor: 'var(--border-color, rgba(0,0,0,0.05))'
          }}>
            <div>
              <span className="text-[10px] text-secondary font-black uppercase tracking-widest block">Verification Status</span>
              <span className={`text-xs font-black mt-1 uppercase inline-block`}>
                {application.offer_letter_status === 'pending_upload' && '📂 Pending Student Upload'}
                {application.offer_letter_status === 'pending_verification' && '⏳ Pending Verification'}
                {application.offer_letter_status === 'approved' && '✅ Approved & Verified'}
                {application.offer_letter_status === 'rejected' && '❌ Rejected'}
              </span>
            </div>
            {application.offer_letter_feedback && (
              <div className="text-right max-w-xs">
                <span className="text-[10px] text-danger font-black uppercase tracking-widest block">Rejection Feedback</span>
                <span className="text-xs text-secondary block truncate mt-1">{application.offer_letter_feedback}</span>
              </div>
            )}
          </div>

          {/* Document Viewer (If uploaded) */}
          {application.offer_letter_file ? (
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-secondary tracking-widest block">Document Preview</label>
              
              <div className="border border-border-color rounded-2xl overflow-hidden bg-slate-900/5 dark:bg-dark-300/10 p-2 flex items-center justify-center min-h-[200px]">
                {isPdf ? (
                  <iframe src={application.offer_letter_file} className="w-full h-80 rounded-xl border-none" title="Offer Letter Preview" />
                ) : isImage ? (
                  <img src={application.offer_letter_file} className="max-w-full max-h-80 object-contain rounded-xl" alt="Offer Letter" />
                ) : (
                  <div className="p-8 text-center text-secondary text-xs flex flex-col items-center gap-2">
                    <FileText size={32} />
                    <span>Preview not available for this format.</span>
                    <a href={application.offer_letter_file} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm mt-2">
                      Download Document
                    </a>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-xs">
                <a href={application.offer_letter_file} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold flex items-center gap-1">
                  View full document in new tab ↗
                </a>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center border border-dashed border-border-color rounded-2xl bg-slate-50 dark:bg-dark-300/20 text-secondary text-xs">
              No offer letter has been uploaded yet. You can upload one on behalf of the student below.
            </div>
          )}

          {/* Admin Upload Section */}
          <form onSubmit={handleAdminUpload} className="pt-4 border-t border-border-color/60 space-y-4">
            <label className="text-[10px] font-black uppercase text-secondary tracking-widest block">Upload document on student's behalf</label>
            <div className="flex gap-3 items-center">
              <input 
                type="file" 
                onChange={(e) => setFile(e.target.files[0])} 
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="input-field text-xs flex-1" 
                style={{ height: '38px', padding: '6px 12px' }}
                disabled={submitting}
              />
              <button 
                type="submit" 
                className="btn btn-primary text-xs uppercase font-bold tracking-wider rounded-xl flex items-center gap-1.5"
                style={{ height: '38px', whiteSpace: 'nowrap' }}
                disabled={submitting || !file}
              >
                <Upload size={14} /> Upload & Approve
              </button>
            </div>
            {uploadError && <p className="text-xs text-danger font-medium m-0">{uploadError}</p>}
          </form>

          {/* Review actions (If uploaded) */}
          {application.offer_letter_file && (
            <div className="pt-4 border-t border-border-color/60 space-y-4">
              <label className="text-[10px] font-black uppercase text-secondary tracking-widest block">Review Decisions</label>
              
              <div className="flex flex-col gap-3">
                <textarea 
                  placeholder="Provide rejection reason if rejecting..." 
                  value={feedback} 
                  onChange={(e) => setFeedback(e.target.value)}
                  className="input-field text-xs w-full rounded-xl"
                  rows="3"
                  disabled={submitting}
                />
                
                <div className="flex gap-3 justify-end">
                  <button 
                    type="button"
                    onClick={() => handleStatusUpdate('rejected', feedback)}
                    className="btn btn-secondary border-danger/25 text-danger hover:bg-danger/10 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5"
                    disabled={submitting || !feedback.trim()}
                    title={!feedback.trim() ? 'Please provide feedback before rejecting.' : ''}
                  >
                    Reject Offer Letter
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleStatusUpdate('approved')}
                    className="btn btn-primary text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5"
                    disabled={submitting}
                  >
                    <Check size={14} /> Approve & Verify Offer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const JobApplications = () => {
  const { id } = useParams();
  const [applications, setApplications] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEmailLog, setShowEmailLog] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [selectedAppForOffer, setSelectedAppForOffer] = useState(null);

  // Always include placed (selected/accepted) students regardless of eligibility —
  // they have already been selected and must always be visible.
  const eligibleApplications = useMemo(() => {
    return applications.filter(app =>
      app.status === 'selected' ||
      app.status === 'accepted' ||
      app.job_type === 'external' ||
      app.current_eligibility?.eligible !== false
    );
  }, [applications]);

  // Only count as mismatched if not already placed
  const mismatchedApplicationsCount = useMemo(() => {
    return applications.filter(app =>
      app.job_type !== 'external' &&
      app.status !== 'selected' &&
      app.status !== 'accepted' &&
      app.current_eligibility?.eligible === false
    ).length;
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
                  {app.status === 'selected' || app.status === 'accepted' ? (
                    <span className="text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded border flex items-center gap-1 w-fit" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', borderColor: 'rgba(16,185,129,0.25)' }}>
                      🏆 Placed
                    </span>
                  ) : app.job_type === 'external' ? (
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
                  {['selected', 'accepted'].includes(app.status) ? (
                    app.offer_letter_status === 'pending_upload' ? (
                      <button
                        onClick={() => setSelectedAppForOffer(app)}
                        className="text-warning bg-warning/10 border border-warning/20 text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-warning/20 transition-colors cursor-pointer"
                        style={{ border: '1px solid rgba(245,158,11,0.2)' }}
                      >
                        📂 Upload Pending
                      </button>
                    ) : app.offer_letter_status === 'pending_verification' ? (
                      <button
                        onClick={() => setSelectedAppForOffer(app)}
                        className="text-info bg-info/10 border border-info/20 text-xs font-extrabold px-2.5 py-1 rounded-lg hover:bg-info/20 transition-all animate-pulse cursor-pointer"
                        style={{ border: '1px solid rgba(59,130,246,0.3)', boxShadow: '0 0 10px rgba(59,130,246,0.1)' }}
                      >
                        ⏳ Review Offer
                      </button>
                    ) : app.offer_letter_status === 'approved' ? (
                      <button
                        onClick={() => setSelectedAppForOffer(app)}
                        className="text-success bg-success/10 border border-success/20 text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-success/20 transition-colors cursor-pointer"
                        style={{ border: '1px solid rgba(16,185,129,0.2)' }}
                      >
                        ✅ Approved
                      </button>
                    ) : app.offer_letter_status === 'rejected' ? (
                      <button
                        onClick={() => setSelectedAppForOffer(app)}
                        className="text-danger bg-danger/10 border border-danger/20 text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-danger/20 transition-colors cursor-pointer"
                        style={{ border: '1px solid rgba(239,68,68,0.2)' }}
                      >
                        ❌ Rejected
                      </button>
                    ) : (
                      <span className="text-secondary">—</span>
                    )
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
      
      {selectedAppForOffer && (
        <OfferLetterModal 
          application={selectedAppForOffer}
          onClose={() => setSelectedAppForOffer(null)}
          onSave={() => {
            fetchApplications();
            fetchJobDetails();
          }}
        />
      )}
    </div>
  );
};

export default JobApplications;
