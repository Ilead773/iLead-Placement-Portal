import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';

const BulkSendResumes = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  
  // Email Form State
  const [companyEmail, setCompanyEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [ccEmails, setCcEmails] = useState([]);
  const [ccInput, setCcInput] = useState('');
  
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      fetchApplications(selectedJobId);
      
      const job = jobs.find(j => j.id === selectedJobId);
      if (job) {
        setSubject(`Resumes — ${job.role || job.title} | Job Application`);
        setCompanyEmail(job.hr_email || '');
        setCcEmails([]);
        setErrors({});
        setResult(null);
      }
    } else {
      setApplications([]);
      setSelectedAppIds([]);
    }
  }, [selectedJobId]);

  useEffect(() => {
    if (selectedAppIds.length > 0 && selectedJobId) {
      const job = jobs.find(j => j.id === selectedJobId);
      const selectedApps = applications.filter(a => selectedAppIds.includes(a.id));
      const appsWithResume = selectedApps.filter(a => a.resume_url);
      
      const defaultBody = `Dear Hiring Team,\n\nPlease find attached the resumes of ${appsWithResume.length} student(s) who have applied for the ${job.role || job.title} position at ${job.company_name}.\n\nStudent Details:\n${appsWithResume.map((a, i) => `${i+1}. ${a.student_name} — ${a.student_stream || 'Unknown Branch'}, Year ${a.student_year || 'Unknown'}, Category ${a.student_category || 'N/A'}, CGPA: ${a.student_cgpa || 'N/A'}`).join('\n')}\n\nPlease find their resumes attached to this email.\n\nRegards,\nPlacement Cell`;
      
      setBody(defaultBody);
    } else {
      setBody('');
    }
  }, [selectedAppIds, applications, jobs, selectedJobId]);

  const fetchJobs = async () => {
    try {
      const response = await axios.get('/jobs/admin/jobs/');
      const allJobs = (response.data || []).filter(j => j.job_type !== 'external');

      const checks = await Promise.allSettled(
        allJobs.map(async (job) => {
          const appsRes = await axios.get(`/jobs/admin/jobs/${job.id}/applications/`, {
            params: { _t: Date.now() }
          });
          const apps = appsRes.data || [];
          const hasAnyResume = apps.some(a => !!a.resume_url);
          return hasAnyResume ? job : null;
        })
      );

      const filtered = checks
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);

      setJobs(filtered);
    } catch (err) {
      console.error('Error fetching jobs', err);
    }
  };

  const fetchApplications = async (jobId) => {
    setLoadingApps(true);
    try {
      const response = await axios.get(`/jobs/admin/jobs/${jobId}/applications/`);
      setApplications(response.data);
      setSelectedAppIds([]);
    } catch (err) {
      console.error('Error fetching applications', err);
    } finally {
      setLoadingApps(false);
    }
  };

  const handleSelectAllApps = (e) => {
    if (e.target.checked) {
      setSelectedAppIds(applications.map(a => a.id));
    } else {
      setSelectedAppIds([]);
    }
  };

  const handleSelectApp = (id) => {
    if (selectedAppIds.includes(id)) {
      setSelectedAppIds(selectedAppIds.filter(appId => appId !== id));
    } else {
      setSelectedAppIds([...selectedAppIds, id]);
    }
  };

  const handleAddCC = () => {
    const email = ccInput.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ ...errors, cc_emails: 'Invalid email format' });
      return;
    }
    if (ccEmails.includes(email)) {
      setErrors({ ...errors, cc_emails: 'Already added' });
      return;
    }
    if (ccEmails.length >= 5) {
      setErrors({ ...errors, cc_emails: 'Maximum 5 CC emails' });
      return;
    }
    setCcEmails([...ccEmails, email]);
    setCcInput('');
    setErrors({ ...errors, cc_emails: null });
  };

  const handleRemoveCC = (emailToRemove) => {
    setCcEmails(ccEmails.filter(e => e !== emailToRemove));
  };

  const handleSend = async () => {
    let finalCcEmails = [...ccEmails];
    
    // Automatically add pending CC if valid
    const pendingCc = ccInput.trim();
    if (pendingCc) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pendingCc) && !finalCcEmails.includes(pendingCc) && finalCcEmails.length < 5) {
        finalCcEmails.push(pendingCc);
        setCcEmails(finalCcEmails);
        setCcInput('');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pendingCc)) {
        setErrors({ ...errors, cc_emails: 'Invalid email in CC box. Please correct it or clear the box.' });
        return;
      }
    }

    if (isOffCampusJob) {
      setErrors({ general: 'Off-campus jobs do not support bulk resume emailing.' });
      return;
    }

    setSending(true);
    setErrors({});
    setResult(null);

    const payload = {
      company_email: companyEmail.trim(),
      subject: subject.trim(),
      body: body.trim(),
      application_ids: selectedAppIds,
      cc_emails: finalCcEmails,
    };

    try {
      const response = await axios.post(`/applications/admin/jobs/${selectedJobId}/send-resumes/`, payload);
      setResult({
        success: true,
        message: response.data.message,
        summary: response.data.summary,
      });
      setSelectedAppIds([]); // Clear selection on success
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.details) {
        setErrors(err.response.data.details);
      } else {
        setErrors({ general: err.response?.data?.error || err.response?.data?.message || 'Failed to send email. Please try again.' });
      }
    } finally {
      setSending(false);
    }
  };

  const selectedAppsData = applications.filter(a => selectedAppIds.includes(a.id));
  const appsWithResume = selectedAppsData.filter(a => a.resume_url);
  const appsWithoutResume = selectedAppsData.filter(a => !a.resume_url);
  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const isOffCampusJob = selectedJob?.job_type === 'external';

  if (result?.success) {
    return (
      <div className="page-content flex items-center justify-center min-h-[70vh]">
        <div className="card text-center max-w-2xl w-full p-10">
          <div className="text-success text-7xl mb-6">✓</div>
          <h2 className="text-3xl font-bold mb-4">Email Sent Successfully!</h2>
          
          <div className="bg-input border border-border-color rounded-lg p-6 my-8 text-left">
            <p className="mb-3 text-lg"><strong className="text-secondary">To:</strong> {result.summary.company_email}</p>
            <p className="text-lg"><strong className="text-secondary">Resumes attached:</strong> {result.summary.selected_students}</p>
          </div>

          <button 
            onClick={() => setResult(null)} 
            className="btn btn-primary px-8 py-3 text-lg"
          >
            Send Another Batch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header mb-8">
        <div>
          <h1 className="text-3xl font-bold">Bulk Send Resumes</h1>
          <p className="text-secondary mt-2 text-lg">
            Select a job, pick the students, and email their resumes directly to the company.
          </p>
        </div>
      </div>

      <div className="card mb-8">
        <label className="block text-sm font-semibold text-secondary mb-3 uppercase tracking-wide">Step 1: Select a Job Posting</label>
        <select 
          className="input-field max-w-xl"
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
        >
          <option value="">-- Choose a Job --</option>
      {jobs.map(job => (
          <option key={job.id} value={job.id}>
            {job.role || job.title} at {job.company_name}
          </option>
        ))}
        </select>
        {selectedJobId && !selectedJob && (
          <div className="text-warning text-xs mt-2 font-semibold">
            This job isn’t eligible for resume emailing (off-campus or no resumes available).
          </div>
        )}
      </div>

      {selectedJobId && isOffCampusJob && (
        <div className="card p-6 border border-warning/30 bg-warning/10">
          <div className="font-black uppercase tracking-wider text-xs text-warning mb-2">Off-Campus Job</div>
          <div className="text-primary font-bold text-lg mb-1">Bulk resume emailing is disabled</div>
          <div className="text-secondary text-sm">
            Off-campus (external) jobs donâ€™t use the placement-cell resume emailing flow.
          </div>
        </div>
      )}

      {selectedJobId && !isOffCampusJob && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side: Student Selection */}
          <div className="card p-0 flex flex-col h-[700px] overflow-hidden">
            <div className="p-4 border-b border-border-color bg-card flex justify-between items-center">
              <h3 className="font-semibold text-primary">Step 2: Select Students</h3>
              <span className="badge badge-info">{selectedAppIds.length} Selected</span>
            </div>
            
            <div className="overflow-y-auto flex-1 table-container border-none rounded-none">
              {loadingApps ? (
                <div className="p-8 text-center text-secondary">Loading applicants...</div>
              ) : applications.length === 0 ? (
                <div className="p-8 text-center text-secondary">No applications found for this job.</div>
              ) : (
                <table>
                  <thead className="sticky top-0 z-10 bg-card">
                    <tr>
                      <th className="w-12">
                        <input 
                          type="checkbox" 
                          checked={selectedAppIds.length === applications.length && applications.length > 0}
                          onChange={handleSelectAllApps}
                        />
                      </th>
                      <th>Student</th>
                      <th>Status</th>
                      <th>Resume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map(app => (
                      <tr key={app.id} className={selectedAppIds.includes(app.id) ? 'bg-primary/20' : ''}>
                        <td>
                          <input 
                            type="checkbox" 
                            checked={selectedAppIds.includes(app.id)}
                            onChange={() => handleSelectApp(app.id)}
                          />
                        </td>
                        <td>
                          <div className="font-medium text-primary text-sm">{app.student_name}</div>
                          <div className="text-xs text-secondary">{app.student_stream} • CGPA {app.student_cgpa}</div>
                        </td>
                        <td>
                          <span className="badge badge-neutral">
                            {app.status}
                          </span>
                        </td>
                        <td>
                          {app.resume_url ? (
                            <span className="text-success font-medium">✓ Yes</span>
                          ) : (
                            <span className="text-error font-medium">✗ No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* Warnings at the bottom of the table */}
            {selectedAppIds.length > 0 && appsWithoutResume.length > 0 && (
              <div className="p-4 bg-warning/5 border-t border-warning text-warning-muted text-sm">
                <strong className="text-warning">⚠ Warning:</strong> {appsWithoutResume.length} selected student(s) do not have a resume uploaded and will be excluded from the email.
              </div>
            )}
          </div>

          {/* Right Side: Email Form */}
          <div className="card p-0 flex flex-col h-[700px] overflow-hidden">
            <div className="p-4 border-b border-border-color bg-card">
              <h3 className="font-semibold text-primary">Step 3: Compose Email</h3>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {errors.general && (
                <div className="alert alert-error">
                  {errors.general}
                </div>
              )}

              <div className="input-group">
                <label>Company HR Email <span className="text-error">*</span></label>
                <input 
                  type="email" 
                  value={companyEmail} 
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="hr@company.com" 
                  className={`input-field ${errors.company_email ? 'input-error' : ''}`}
                />
                {errors.company_email && <p className="error-text">{errors.company_email}</p>}
              </div>

              <div className="input-group">
                <label>CC (optional, max 5)</label>
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    value={ccInput} 
                    onChange={(e) => setCcInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCC())}
                    placeholder="Add CC email" 
                    className="input-field flex-1"
                  />
                  <button type="button" onClick={handleAddCC} className="btn btn-secondary">Add</button>
                </div>
                {errors.cc_emails && <p className="error-text">{errors.cc_emails}</p>}
                
                {ccEmails.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ccEmails.map(email => (
                      <span key={email} className="badge badge-neutral flex items-center gap-1 py-1.5 px-3">
                        {email}
                        <button onClick={() => handleRemoveCC(email)} className="text-error hover:text-white transition-colors ml-1 leading-none text-lg">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="input-group">
                <label>Subject <span className="text-error">*</span></label>
                <input 
                  type="text" 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  className={`input-field ${errors.subject ? 'input-error' : ''}`}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.subject ? <p className="error-text">{errors.subject}</p> : <div></div>}
                  <span className="text-xs text-secondary">{subject.length}/200</span>
                </div>
              </div>

              <div className="input-group flex-1 flex flex-col min-h-[250px]">
                <label>Email Body <span className="text-error">*</span></label>
                <textarea 
                  value={body} 
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={5000}
                  className={`input-field flex-1 ${errors.body ? 'input-error' : ''}`}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.body ? <p className="error-text">{errors.body}</p> : <div></div>}
                  <span className="text-xs text-secondary">{body.length}/5000</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-border-color bg-card flex justify-between items-center">
              <span className="text-sm font-medium text-secondary">
                {appsWithResume.length} resume(s) will be attached
              </span>
              <button 
                onClick={handleSend} 
                disabled={sending || appsWithResume.length === 0 || !companyEmail.trim() || !subject.trim() || !body.trim()} 
                className="btn btn-primary"
              >
                {sending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Sending...
                  </>
                ) : 'Send Email Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkSendResumes;
