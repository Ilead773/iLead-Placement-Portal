import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import EmailLogPanel from '../../components/EmailLogPanel';
import toast from 'react-hot-toast';

const JobApplications = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedIds, setSelectedIds] = useState([]);
  const [showEmailLog, setShowEmailLog] = useState(false);

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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(applications.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (appId) => {
    if (selectedIds.includes(appId)) {
      setSelectedIds(selectedIds.filter(i => i !== appId));
    } else {
      setSelectedIds([...selectedIds, appId]);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading applications...</div>;

  const selectedApplicationsData = applications
    .filter(a => selectedIds.includes(a.id))
    .map(a => ({
      id: a.id,
      student_name: a.student_name,
      student_stream: a.student_stream,
      student_year: a.student_year,
      student_category: a.student_category,
      cgpa: a.student_cgpa,
      resume_url: a.resume_url,
    }));

  const handleSendResumesNavigation = () => {
    if (job?.job_type === 'external') {
      toast.error('Off-campus jobs do not support bulk resume emailing.');
      return;
    }
    navigate(`/jobs/${id}/send-resumes`, {
      state: {
        selectedApplications: selectedApplicationsData,
        jobTitle: job?.role || job?.title || '',
        companyName: job?.company_name || '',
        hrEmail: job?.hr_email || ''
      }
    });
  };

  return (
    <div className="page-content">
      <div className="page-header mb-6">
        <div>
          <h1 className="text-2xl font-bold">Job Applications</h1>
          <p className="text-secondary mt-1">{job?.title || 'Loading job...'} • {job?.company_name || ''}</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowEmailLog(!showEmailLog)}
            className="btn btn-secondary"
          >
            {showEmailLog ? 'Hide Email History' : 'View Email History'}
          </button>
          <div className="badge badge-neutral">Total: {applications.length}</div>
        </div>
      </div>

      <EmailLogPanel jobId={id} isVisible={showEmailLog} />

       {selectedIds.length > 0 && (
         <div className="card border-primary-muted bg-primary/20 p-4 mb-6 flex justify-between items-center transition-all">
           <span className="text-primary font-medium">{selectedIds.length} students selected</span>
           <div className="flex gap-3">
            {job?.job_type !== 'external' && (
              <button 
                onClick={handleSendResumesNavigation}
                className="btn btn-primary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Compose Bulk Email
              </button>
            )}
          </div>
         </div>
       )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === applications.length && applications.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Student Name</th>
              <th>Branch/Course</th>
              <th>CGPA</th>
              <th>Criteria Check</th>
              <th>Status</th>
              <th>Current Round</th>
              <th>Resume</th>
              <th>Offer Letter</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id} className={selectedIds.includes(app.id) ? 'bg-card-hover' : ''}>
                <td>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(app.id)}
                    onChange={() => handleSelectOne(app.id)}
                  />
                </td>
                <td className="font-medium">{app.student_name}</td>
                <td className="text-secondary">{app.student_stream || 'N/A'}</td>
                <td className="text-secondary">{app.student_cgpa || 'N/A'}</td>
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
                <td className="text-secondary">
                  {app.current_round ? app.current_round.round_name : 'N/A'}
                </td>
                <td>
                  {app.resume_url ? (
                    <a href={app.resume_url} target="_blank" rel="noopener noreferrer" className="text-info hover:underline flex items-center">
                      📄 Resume
                    </a>
                  ) : (
                    <span className="text-secondary">No Resume</span>
                  )}
                </td>
                <td>
                  {app.offer_letter_file ? (
                    <a href={app.offer_letter_file} target="_blank" rel="noopener noreferrer" className="text-success hover:underline flex items-center gap-1 font-bold">
                      📁 Offer Letter
                    </a>
                  ) : app.status === 'selected' || app.status === 'accepted' ? (
                    <span className="text-warning text-xs italic font-semibold">Pending upload</span>
                  ) : (
                    <span className="text-secondary">—</span>
                  )}
                </td>
              </tr>
            ))}
            {applications.length === 0 && (
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
