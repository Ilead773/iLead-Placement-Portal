import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import axios from '../../api/axios';

const SendResumesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: jobId } = useParams();

  const { selectedApplications = [], jobTitle = '', companyName = '', hrEmail = '' } = location.state || {};

  const [companyEmail, setCompanyEmail] = useState(hrEmail);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [ccEmails, setCcEmails] = useState([]);
  const [ccInput, setCcInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});
  const [jobType, setJobType] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);


  const appsWithResume = selectedApplications.filter(a => a.resume_url);
  const appsWithoutResume = selectedApplications.filter(a => !a.resume_url);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await axios.get(`/jobs/admin/jobs/${jobId}/`, { params: { _t: Date.now() } });
        setJobType(res.data?.job_type ?? null);
        setJobStatus(res.data?.status ?? null);
      } catch (e) {
        setJobType(null);
        setJobStatus(null);
      }
    };
    fetchJob();
  }, [jobId]);

  useEffect(() => {
    if (selectedApplications.length > 0) {
      setSubject(`Resumes — ${jobTitle} | Job Application`);
      
      const defaultBody = `Dear Hiring Team,\n\nPlease find attached the resumes of ${appsWithResume.length} student(s) who have applied for the ${jobTitle} position at ${companyName}.\n\nStudent Details:\n${appsWithResume.map((a, i) => `${i+1}. ${a.student_name} — ${a.student_stream || 'Unknown Branch'}, Year ${a.student_year || 'Unknown'}, Category ${a.student_category || 'N/A'}, CGPA: ${a.cgpa || 'N/A'}`).join('\n')}\n\nPlease find their resumes attached to this email.\n\nRegards,\nPlacement Cell`;
      
      setBody(defaultBody);
    }
  }, [jobTitle, companyName, appsWithResume.length, selectedApplications.length]);

  if (!location.state || selectedApplications.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-lg mb-4 text-lg">
          No students were selected or the session expired.
        </div>
        <Link to={`/jobs/${jobId}/applications`} className="text-blue-600 hover:underline">
          &larr; Go back to Job Applications and select students
        </Link>
      </div>
    );
  }

  if (jobStatus === 'closed') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-red-50 text-red-800 p-6 rounded-lg mb-4 text-lg border border-red-200">
          This opportunity is closed. Sending resumes is no longer active.
        </div>
        <Link to={`/jobs/${jobId}/applications`} className="text-blue-600 hover:underline">
          &larr; Back to Job Applications
        </Link>
      </div>
    );
  }

  if (jobType === 'external') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-yellow-50 text-yellow-800 p-6 rounded-lg mb-4 text-lg border border-yellow-200">
          Off-campus (external) jobs do not support bulk resume emailing.
        </div>
        <Link to={`/jobs/${jobId}/applications`} className="text-blue-600 hover:underline">
          &larr; Back to Job Applications
        </Link>
      </div>
    );
  }

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

  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    if (result?.shared_link) {
      navigator.clipboard.writeText(result.shared_link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSend = async () => {
    if (jobType === 'external') {
      setErrors({ general: 'Off-campus jobs do not support bulk resume emailing.' });
      return;
    }
    setLoading(true);
    setErrors({});
    setResult(null);

    const payload = {
      company_email: companyEmail.trim(),
      subject: subject.trim(),
      body: body.trim(),
      application_ids: selectedApplications.map(a => a.id),
      cc_emails: ccEmails,
    };

    try {
      const response = await axios.post(`/applications/admin/jobs/${jobId}/send-resumes/`, payload);
      setResult({
        success: true,
        message: response.data.message,
        summary: response.data.summary,
        shared_link: response.data.shared_link,
      });
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.details) {
        setErrors(err.response.data.details);
      } else {
        setErrors({ general: err.response?.data?.error || err.response?.data?.message || 'Failed to send email. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (result?.success) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]" style={{ width: '100%' }}>
        <div className="card text-center max-w-2xl w-full p-10 shadow-2xl rounded-3xl border border-emerald-500/10">
          <div className="text-emerald-500 bg-emerald-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-4xl border border-emerald-500/20 mb-6">✓</div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Email Sent Successfully!</h2>
          <p className="text-slate-500 dark:text-slate-400">The candidate resumes workspace has been generated and emailed.</p>
          
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 my-6 text-left space-y-3">
            <p className="text-sm"><strong className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs">Employer Email:</strong> <span className="font-semibold text-slate-800 dark:text-slate-200">{result.summary.company_email}</span></p>
            <p className="text-sm"><strong className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs">Selected Candidates:</strong> <span className="font-semibold text-slate-800 dark:text-slate-200">{result.summary.selected_students}</span></p>
            
            {result.shared_link && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Master Candidate Link</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={result.shared_link} 
                    className="input-field flex-1 text-xs bg-slate-100 dark:bg-slate-950 font-mono select-all border border-slate-200 dark:border-slate-800"
                  />
                  <button 
                    onClick={handleCopyLink} 
                    className={`btn text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 ${
                      copiedLink ? 'btn-success bg-emerald-500 text-white' : 'btn-secondary border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center space-x-4">
            <Link to={`/jobs/${jobId}/applications`} className="btn btn-secondary px-8 py-3 rounded-xl font-bold">
              Back to Applications
            </Link>
            <Link to="/admin/jobs" className="btn btn-primary px-8 py-3 rounded-xl font-bold">
              Go to Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="page-header mb-8 flex justify-between items-center flex-wrap gap-4">
        <div>
          <Link to={`/jobs/${jobId}/applications`} className="action-link mb-2 inline-block">
            &larr; Back to Applications
          </Link>
          <h1 className="text-3xl font-bold">Send Resumes to Company</h1>
          <p className="text-secondary mt-2 text-lg">
            Sending <span className="text-primary">{appsWithResume.length}</span> resumes for <strong className="text-primary">{jobTitle}</strong> at <strong className="text-primary">{companyName}</strong>.
          </p>
        </div>
        <div>
          <button 
            type="button"
            onClick={() => navigate(`/admin/email-history?job_id=${jobId}`)}
            className="btn btn-secondary flex items-center gap-2"
            style={{ fontWeight: '800' }}
          >
            📧 View History
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-2">
          <div className="card space-y-6">
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
                  placeholder="Add CC email and press Enter" 
                  className="input-field flex-1"
                />
                <button type="button" onClick={handleAddCC} className="btn btn-secondary">Add</button>
              </div>
              {errors.cc_emails && <p className="error-text">{errors.cc_emails}</p>}
              
              {ccEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
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

            <div className="input-group">
              <label>Email Body <span className="text-error">*</span></label>
              <textarea 
                value={body} 
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                maxLength={5000}
                className={`input-field ${errors.body ? 'input-error' : ''} resize-y`}
              />
              <div className="flex justify-between items-center mt-1">
                {errors.body ? <p className="error-text">{errors.body}</p> : <div></div>}
                <span className="text-xs text-secondary">{body.length}/5000</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border-color flex justify-end">
              <button 
                onClick={handleSend} 
                disabled={loading || appsWithResume.length === 0 || !companyEmail.trim() || !subject.trim() || !body.trim()} 
                className="btn btn-primary"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Sending {appsWithResume.length} Resumes...
                  </>
                ) : `Send ${appsWithResume.length} Resumes Now →`}
              </button>
            </div>

          </div>
        </div>

        {/* Right Column: Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="card p-0 sticky top-6 overflow-hidden">
            <div className="p-4 border-b border-border-color bg-card">
              <h3 className="font-semibold text-primary">Selected Students ({selectedApplications.length})</h3>
            </div>
            
            <div className="p-4">
              <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
                {selectedApplications.map((app, i) => (
                  <div key={app.id} className="text-sm border-b border-border-light pb-2 last:border-0">
                    <div className="flex justify-between items-start">
                      <strong className="text-primary">{i+1}. {app.student_name}</strong>
                      {!app.resume_url && <span className="badge badge-danger ml-2">No Resume</span>}
                    </div>
                    <div className="text-secondary mt-1 flex justify-between items-center">
                      <span>{app.student_stream || 'Unknown Branch'} • CGPA {app.cgpa || 'N/A'}</span>
                      {app.resume_url && (
                        <a 
                          href={app.resume_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-bold"
                          style={{ marginLeft: '12px' }}
                        >
                          View Resume ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {appsWithoutResume.length > 0 && (
                <div className="mt-6 p-4 bg-warning/5 border-l-4 border-warning">
                  <p className="text-sm font-semibold text-warning mb-2">
                    ⚠ {appsWithoutResume.length} student(s) will be skipped:
                  </p>
                  <p className="text-xs text-warning-muted leading-relaxed">
                    {appsWithoutResume.map(a => a.student_name).join(', ')}
                  </p>
                </div>
              )}

              {appsWithResume.length === 0 && (
                <div className="mt-6 alert alert-error">
                  Cannot send email. None of the selected students have a valid resume on file.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SendResumesPage;
