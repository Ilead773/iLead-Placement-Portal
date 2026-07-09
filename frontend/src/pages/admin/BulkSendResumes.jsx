import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Plus, 
  Search, 
  User, 
  FileText, 
  Check, 
  Filter, 
  ChevronRight, 
  GraduationCap, 
  Briefcase, 
  Sparkles, 
  X, 
  ChevronDown, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';

const BulkSendResumes = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  
  const [applications, setApplications] = useState([]);
  const [hasTotalApplications, setHasTotalApplications] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [oppSearch, setOppSearch] = useState('');
  
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [opportunityType, setOpportunityType] = useState('all'); // 'all', 'job', 'internship'
  
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
        const typeLabel = job.listing_type === 'internship' ? 'Internship' : 'Job';
        setSubject(`Resumes — ${job.role || job.title} | ${typeLabel} Application`);
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
      if (!job) return;

      const selectedApps = applications.filter(a => selectedAppIds.includes(a.id));
      const appsWithResume = selectedApps.filter(a => a.resume_url);
      
      const isInternship = job.listing_type === 'internship';
      
      let defaultBody = '';
      if (isInternship) {
        const stipendLabel = job.package ? `₹${Number(job.package).toLocaleString()}/month` : 'Undisclosed';
        const durationLabel = job.duration || 'Not specified';
        
        defaultBody = `Dear Hiring Team,\n\nPlease find attached the resumes of ${appsWithResume.length} student candidate(s) who have applied for the ${job.role || job.title} internship at ${job.company_name}.\n\nInternship Specification Details:\n- Role Profile: ${job.role || job.title}\n- Location: ${job.location || 'N/A'}\n- Internship Duration: ${durationLabel}\n- Monthly Stipend: ${stipendLabel}\n\nStudent Candidates Details:\n${appsWithResume.map((a, i) => `${i+1}. ${a.student_name} — Stream: ${a.student_stream || 'General'}, Year: ${a.student_year || 'Final Year'}, CGPA: ${a.student_cgpa || 'N/A'}`).join('\n')}\n\nPlease find their detailed candidate resumes attached to this email. We look forward to coordinating the next evaluation rounds with you.\n\nRegards,\nPlacement Cell Office\niLEAD Institution`;
      } else {
        const packageLabel = job.package ? `${job.package} LPA` : 'Not Specified';
        
        defaultBody = `Dear Hiring Team,\n\nPlease find attached the resumes of ${appsWithResume.length} student candidate(s) who have applied for the ${job.role || job.title} position at ${job.company_name}.\n\nJob Specification Details:\n- Role Profile: ${job.role || job.title}\n- Location: ${job.location || 'N/A'}\n- CTC Compensation Package: ${packageLabel}\n\nStudent Candidates Details:\n${appsWithResume.map((a, i) => `${i+1}. ${a.student_name} — Stream: ${a.student_stream || 'General'}, Year: ${a.student_year || 'Final Year'}, CGPA: ${a.student_cgpa || 'N/A'}`).join('\n')}\n\nPlease find their detailed candidate resumes attached to this email. We look forward to coordinating the next evaluation rounds with you.\n\nRegards,\nPlacement Cell Office\niLEAD Institution`;
      }
      
      setBody(defaultBody);
    } else {
      setBody('');
    }
  }, [selectedAppIds, applications, jobs, selectedJobId]);

  const fetchJobs = async () => {
    try {
      const response = await axios.get('/jobs/admin/jobs/');
      const allJobs = (response.data || []).filter(j => j.job_type !== 'external');
      setJobs(allJobs);
    } catch (err) {
      console.error('Error fetching jobs', err);
    }
  };

  const fetchApplications = async (jobId) => {
    setLoadingApps(true);
    try {
      const response = await axios.get(`/jobs/admin/jobs/${jobId}/applications/`);
      const rawApps = response.data || [];
      setHasTotalApplications(rawApps.length > 0);
      setApplications(rawApps);
      setSelectedAppIds([]);
    } catch (err) {
      console.error('Error fetching applications', err);
    } finally {
      setLoadingApps(false);
    }
  };

  const handleSelectAllApps = (e, filteredApps) => {
    const eligibleApps = filteredApps.filter(a => a.status === 'applied' || a.status === 'shortlisted');
    if (e.target.checked) {
      const allFilteredIds = eligibleApps.map(a => a.id);
      setSelectedAppIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    } else {
      const allFilteredIds = eligibleApps.map(a => a.id);
      setSelectedAppIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
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
      setErrors({ general: 'Off-campus opportunities do not support bulk resume emailing.' });
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
        shared_link: response.data.shared_link,
      });
      setSelectedAppIds([]);
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

  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    if (result?.shared_link) {
      navigator.clipboard.writeText(result.shared_link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Filtering Dropdown Options (Jobs vs Internships + Search filter)
  const filteredDropdownJobs = jobs.filter(job => {
    if (opportunityType !== 'all' && job.listing_type !== opportunityType) return false;
    const term = oppSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      (job.company_name || '').toLowerCase().includes(term) ||
      (job.role || '').toLowerCase().includes(term) ||
      (job.title || '').toLowerCase().includes(term)
    );
  });

  const selectedAppsData = applications.filter(a => selectedAppIds.includes(a.id));
  const appsWithResume = selectedAppsData.filter(a => a.resume_url);
  const appsWithoutResume = selectedAppsData.filter(a => !a.resume_url);
  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const isOffCampusJob = selectedJob?.job_type === 'external';

  // Searching Applicants list
  const filteredApplications = applications.filter(app => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      app.student_name?.toLowerCase().includes(term) ||
      app.student_stream?.toLowerCase().includes(term) ||
      app.student_cgpa?.toString().includes(term) ||
      app.status?.toLowerCase().includes(term)
    );
  });

  const segments = [
    { id: 'all', label: 'All Openings', icon: Sparkles, count: jobs.length },
    { id: 'job', label: 'Jobs Only 💼', icon: Briefcase, count: jobs.filter(j => j.listing_type === 'job').length },
    { id: 'internship', label: 'Internships Only 🎓', icon: GraduationCap, count: jobs.filter(j => j.listing_type === 'internship').length },
  ];

  if (result?.success) {
    return (
      <div className="animate-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', width: '100%' }}>
        <div className="card text-center glass-panel" style={{ maxWidth: '600px', width: '100%', padding: '40px', border: '1px solid rgba(16, 185, 129, 0.2)', boxShadow: 'var(--shadow-lg)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, rgba(16, 185, 129, 0.05), transparent)', pointerEvents: 'none' }}></div>
          
          <div style={{ margin: '0 auto 24px', width: '80px', height: '80px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16, 185, 129, 0.2)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)', position: 'relative', zIndex: 10 }}>
            <CheckCircle2 size={48} />
          </div>
          
          <h2 className="text-3xl font-extrabold" style={{ marginBottom: '12px', background: 'linear-gradient(to right, #10b981, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'var(--font-heading)', position: 'relative', zIndex: 10 }}>
            Resumes Dispatched!
          </h2>
          <p className="text-secondary" style={{ maxWidth: '450px', margin: '0 auto 32px', fontSize: '15px', position: 'relative', zIndex: 10 }}>
            The placement cell resume batch has been sent to the employer HR. The transaction has been securely logged.
          </p>
          
          <div className="bg-body border" style={{ border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '32px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Company Contact</span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{result.summary.company_email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Subject Line</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>{subject}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Candidates Sent</span>
              <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '900', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={12} strokeWidth={3} /> {result.summary.selected_students} Resumes
              </span>
            </div>

            {result.shared_link && (
              <div style={{ paddingTop: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Master Candidate Link</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    readOnly 
                    value={result.shared_link} 
                    className="input-field"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '12px', fontFamily: 'monospace', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                  />
                  <button 
                    onClick={handleCopyLink}
                    className="btn"
                    style={{ 
                      padding: '8px 16px', 
                      fontSize: '11px', 
                      fontWeight: '800', 
                      borderRadius: '8px', 
                      backgroundColor: copiedLink ? '#10b981' : 'var(--accent-primary)',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => {
              setResult(null);
              setSelectedJobId('');
            }} 
            className="btn btn-primary"
            style={{ padding: '12px 32px', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', borderRadius: '12px', transition: 'all 0.3s', display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '0 auto', boxShadow: 'var(--shadow-md)' }}
          >
            <Send size={14} />
            Send Another Batch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* Premium Header */}
      <div className="page-header" style={{ position: 'relative', overflow: 'hidden', padding: '32px', borderRadius: '24px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.04, pointerEvents: 'none', color: 'var(--accent-primary)' }}>
          <Mail size={160} />
        </div>
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={32} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: '800', letterSpacing: '1px', padding: '4px 10px' }}>
                  Employer Relations
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-heading)', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                Bulk Send Resumes
              </h1>
              <p className="text-secondary" style={{ marginTop: '6px', fontSize: '15px', maxWidth: '700px', lineHeight: '1.6' }}>
                Consolidate, review, and email student candidate resumes directly to company HR inboxes with high-fidelity formatting. Supports both jobs and internships.
              </p>
            </div>
          </div>
          <div>
            <button 
              type="button"
              onClick={() => navigate('/admin/email-history')}
              className="btn btn-secondary"
              style={{ 
                padding: '12px 24px', 
                borderRadius: '12px', 
                fontSize: '12px', 
                fontWeight: '800', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)'
              }}
            >
              <Clock size={16} />
              View Email History
            </button>
          </div>
        </div>
      </div>

      {/* Stepper Progress Indicator */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '16px', backgroundColor: !selectedJobId ? 'var(--accent-soft)' : 'transparent', borderLeft: !selectedJobId ? '4px solid var(--accent-primary)' : 'none', opacity: !selectedJobId ? 1 : 0.6 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '850', color: 'white', backgroundColor: selectedJobId ? 'var(--success)' : 'var(--accent-primary)', boxShadow: !selectedJobId ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none' }}>
            {selectedJobId ? <Check size={16} strokeWidth={3} /> : '1'}
          </div>
          <div>
            <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Step 1</div>
            <div style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-primary)' }}>Choose Opportunity</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '16px', backgroundColor: selectedJobId && selectedAppIds.length === 0 ? 'var(--accent-soft)' : 'transparent', borderLeft: selectedJobId && selectedAppIds.length === 0 ? '4px solid var(--accent-primary)' : 'none', opacity: selectedJobId ? 1 : 0.5 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '850', color: selectedJobId ? 'white' : 'var(--text-muted)', backgroundColor: selectedJobId && selectedAppIds.length > 0 ? 'var(--success)' : selectedJobId ? 'var(--accent-primary)' : 'var(--border-color)', boxShadow: selectedJobId && selectedAppIds.length === 0 ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none' }}>
            {selectedJobId && selectedAppIds.length > 0 ? <Check size={16} strokeWidth={3} /> : '2'}
          </div>
          <div>
            <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Step 2</div>
            <div style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-primary)' }}>Select Candidates</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '16px', backgroundColor: selectedJobId && selectedAppIds.length > 0 ? 'var(--accent-soft)' : 'transparent', borderLeft: selectedJobId && selectedAppIds.length > 0 ? '4px solid var(--accent-primary)' : 'none', opacity: selectedJobId && selectedAppIds.length > 0 ? 1 : 0.5 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '850', color: selectedJobId && selectedAppIds.length > 0 ? 'white' : 'var(--text-muted)', backgroundColor: selectedJobId && selectedAppIds.length > 0 ? 'var(--accent-primary)' : 'var(--border-color)', boxShadow: selectedJobId && selectedAppIds.length > 0 ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none' }}>
            3
          </div>
          <div>
            <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Step 3</div>
            <div style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-primary)' }}>Compose & Send</div>
          </div>
        </div>
      </div>

      {/* Step 1: Choose Opportunity */}
      <div className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px', borderRadius: '24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              Step 1: Filter & Choose Active Opportunity
            </label>
            {jobs.length === 0 && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Syncing open records...</span>
            )}
          </div>

          {/* Segment Filter for Jobs vs Internships */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {segments.map(seg => {
              const IconComponent = seg.icon;
              const isActive = opportunityType === seg.id;
              return (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => {
                    setOpportunityType(seg.id);
                    setSelectedJobId(''); // Reset selection on segment change
                  }}
                  className="btn"
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '12px', 
                    fontSize: '11px', 
                    fontWeight: '900', 
                    textTransform: 'uppercase', 
                    letterSpacing: '1px',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    background: isActive ? 'var(--accent-gradient)' : 'var(--bg-body)',
                    color: isActive ? 'white' : 'var(--text-primary)',
                    border: isActive ? 'none' : '1px solid var(--border-color)',
                    boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.15)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <IconComponent size={14} />
                  <span>{seg.label}</span>
                  <span style={{ 
                    fontSize: '10px', 
                    padding: '2px 8px', 
                    borderRadius: '8px', 
                    fontWeight: '900',
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'var(--border-color)',
                    color: isActive ? 'white' : 'var(--text-secondary)'
                  }}>
                    {seg.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', smDirection: 'row', gap: '12px', width: '100%', maxWidth: '600px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input 
                type="text" 
                placeholder="Search company or role..." 
                value={oppSearch}
                onChange={(e) => setOppSearch(e.target.value)}
                className="input-field"
                style={{ padding: '12px 12px 12px 36px', fontSize: '13px', borderRadius: '12px', border: '1px solid var(--border-color)', width: '100%' }}
              />
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              {oppSearch && (
                <button 
                  type="button" 
                  onClick={() => setOppSearch('')} 
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div style={{ position: 'relative', flex: 1.5 }}>
              <select 
                className="input-field"
                style={{ padding: '12px 40px 12px 16px', fontSize: '13px', fontWeight: '600', borderRadius: '12px', border: '1px solid var(--border-color)', appearance: 'none', width: '100%' }}
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
              >
                <option value="">-- Choose Listing ({filteredDropdownJobs.length} matches) --</option>
                {filteredDropdownJobs.map(job => {
                  const isDisabled = job.status !== 'active';
                  const labelSuffix = job.status !== 'active' ? ` (${job.status.toUpperCase()})` : '';
                  return (
                    <option key={job.id} value={job.id} disabled={isDisabled}>
                      {job.listing_type === 'internship' ? '🎓 [Internship] ' : '💼 [Job] '} {job.role || job.title} at {job.company_name}{labelSuffix}
                    </option>
                  );
                })}
              </select>
              <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                <ChevronDown size={18} />
              </div>
            </div>
          </div>

          {selectedJob && (
            <div className="animate-in" style={{ 
              marginTop: '8px', 
              padding: '20px', 
              borderRadius: '16px', 
              border: '1px solid var(--border-color)', 
              backgroundColor: 'var(--bg-body)', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Subtle accent glow line on top */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: selectedJob.listing_type === 'internship' ? 'linear-gradient(to right, #10b981, #06b6d4)' : 'linear-gradient(to right, #3b82f6, #6366f1)' }} />
              
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className="badge badge-neutral" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: '800', letterSpacing: '0.5px', padding: '4px 10px', backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)', border: '1px solid rgba(37, 99, 235, 0.15)' }}>
                    {selectedJob.listing_type === 'internship' ? '🎓 Internship Opportunity' : '💼 Full-Time Placement'}
                  </span>
                  <span className={`badge ${
                    selectedJob.category === 'A' ? 'badge-success' :
                    selectedJob.category === 'B' ? 'badge-info' : 'badge-neutral'
                  }`} style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: '800', letterSpacing: '0.5px', padding: '4px 10px' }}>
                    Category {selectedJob.category || 'C'}
                  </span>
                </div>
                
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  HR Contact: <strong style={{ color: 'var(--text-secondary)' }}>{selectedJob.hr_email || 'Not specified'}</strong>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '4px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>
                    Role Profile
                  </span>
                  <span style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    {selectedJob.role || selectedJob.title}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>
                    Employer Partner
                  </span>
                  <span style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    {selectedJob.company_name}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>
                    {selectedJob.listing_type === 'internship' ? 'Stipend Pay' : 'Annual CTC Compensation'}
                  </span>
                  <span style={{ fontSize: '14.5px', fontWeight: '850', color: 'var(--accent-primary)' }}>
                    {selectedJob.listing_type === 'internship' 
                      ? (selectedJob.package ? `₹${Number(selectedJob.package).toLocaleString()}/month` : 'Unpaid / Undisclosed')
                      : (selectedJob.package ? `${selectedJob.package} LPA` : 'Not Specified')
                    }
                  </span>
                </div>

                {selectedJob.listing_type === 'internship' && (
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>
                      Internship Duration
                    </span>
                    <span style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      {selectedJob.duration || '3-6 months (Standard)'}
                    </span>
                  </div>
                )}

                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>
                    Job Location
                  </span>
                  <span style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    {selectedJob.location || 'Multiple Locations'}
                  </span>
                </div>
              </div>

              {/* Eligibility Rules Row */}
              <div style={{ 
                borderTop: '1px solid var(--border-light)', 
                paddingTop: '12px', 
                display: 'flex', 
                flexWrap: 'wrap', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '12px',
                fontSize: '12.5px'
              }}>
                <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)' }}>
                  <span>🎓 Min CGPA: <strong style={{ color: 'var(--text-primary)', fontWeight: '750' }}>{selectedJob.eligibility_rules?.min_cgpa ?? '6.0'}</strong></span>
                  <span>⚠️ Backlogs: <strong style={{ color: 'var(--text-primary)', fontWeight: '750' }}>{selectedJob.eligibility_rules?.no_backlog ? 'Not Allowed' : 'Allowed'}</strong></span>
                  <span>📁 Openings: <strong style={{ color: 'var(--text-primary)', fontWeight: '750' }}>{selectedJob.openings_count ?? '1'} vacancy</strong></span>
                </div>
                
                {selectedJob.eligibility_rules?.allowed_branches && selectedJob.eligibility_rules.allowed_branches.length > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Eligible Streams: <strong style={{ color: 'var(--text-secondary)' }}>{selectedJob.eligibility_rules.allowed_branches.join(', ')}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedJobId && !selectedJob && (
            <div className="alert alert-error animate-in" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--danger)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <AlertCircle size={16} />
              This opportunity is not eligible for bulk resume sending.
            </div>
          )}
        </div>
      </div>

      {selectedJobId && isOffCampusJob && (
        <div className="card animate-in" style={{ padding: '24px', border: '1px solid rgba(245, 158, 11, 0.2)', backgroundColor: 'rgba(245, 158, 11, 0.04)', borderRadius: '24px', display: 'flex', items: 'start', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontWeight: '950', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '1.5px', color: 'var(--warning)', marginBottom: '4px' }}>Off-Campus Opening</div>
            <h3 className="text-xl font-bold" style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>Bulk Resume Emailing Disabled</h3>
            <p className="text-secondary" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6', maxWidth: '600px' }}>
              Off-campus (external) opportunities don't collect student applications in the placement-cell selector pipeline, so emailing resumes is not applicable.
            </p>
          </div>
        </div>
      )}

      {selectedJobId && !isOffCampusJob && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '32px' }}>
          {/* Left Side: Student Selection */}
          <div className="card animate-in" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '700px', overflow: 'hidden', borderRadius: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'between', gap: '12px', position: 'sticky', top: 0, zIndex: 20 }}>
              <div>
                <h3 className="font-extrabold text-primary" style={{ fontSize: '16px', fontFamily: 'var(--font-heading)', margin: 0 }}>Step 2: Select Candidates</h3>
                <p className="text-secondary" style={{ fontSize: '11px', margin: '2px 0 0' }}>Choose the students whose resumes will be forwarded.</p>
              </div>
              <span className="badge badge-info" style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '900' }}>
                {selectedAppIds.length} Selected
              </span>
            </div>
            
            {/* Search Bar */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(248, 250, 252, 0.3)' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type="text"
                  placeholder="Search by name, branch, or CGPA..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field"
                  style={{ padding: '10px 12px 10px 36px', fontSize: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', width: '100%' }}
                />
                <Search size={14} className="text-muted" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                {searchTerm && (
                  <button 
                    type="button" 
                    onClick={() => setSearchTerm('')} 
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="overflow-y-auto" style={{ flex: 1, position: 'relative', overflowX: 'auto' }}>
              {loadingApps ? (
                <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <div className="spinner" style={{ width: '32px', height: '32px' }}></div>
                  <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Loading applicants...</span>
                </div>
              ) : applications.length === 0 ? (
                <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ padding: '16px', backgroundColor: 'var(--border-light)', borderRadius: '50%', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    <User size={32} />
                  </div>
                  {hasTotalApplications ? (
                    <>
                      <span style={{ fontSize: '14px', fontWeight: '750', color: 'var(--text-primary)', marginBottom: '4px' }}>All Applications Processed</span>
                      <span style={{ fontSize: '12px', maxWidth: '280px', lineHeight: '1.5' }}>All student applications for this opportunity have already been processed (moved to Interviewing, Selected, or Rejected in the Selection Pipeline). No pending resumes to send!</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '14px', fontWeight: '750', color: 'var(--text-primary)', marginBottom: '4px' }}>No Applications Yet</span>
                      <span style={{ fontSize: '12px', maxWidth: '280px', lineHeight: '1.5' }}>No students have applied to this opportunity yet. Once applications are submitted, they will instantly populate here.</span>
                    </>
                  )}
                </div>
              ) : filteredApplications.length === 0 ? (
                <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ padding: '16px', backgroundColor: 'var(--border-light)', borderRadius: '50%', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    <Search size={32} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '750', color: 'var(--text-primary)', marginBottom: '4px' }}>No Search Matches</span>
                  <span style={{ fontSize: '12px', maxWidth: '280px' }}>No student profiles match the search term "{searchTerm}".</span>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-card)', boxShadow: '0 1px 0 var(--border-color)' }}>
                    <tr>
                      <th style={{ width: '48px', textAlign: 'center', padding: '12px' }}>
                        <input 
                          type="checkbox" 
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          checked={
                            filteredApplications.filter(a => a.status === 'applied' || a.status === 'shortlisted').length > 0 && 
                            filteredApplications.filter(a => a.status === 'applied' || a.status === 'shortlisted').every(a => selectedAppIds.includes(a.id))
                          }
                          onChange={(e) => handleSelectAllApps(e, filteredApplications)}
                        />
                      </th>
                      <th style={{ padding: '12px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Student Candidate</th>
                      <th style={{ padding: '12px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                      <th style={{ padding: '12px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>Resume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map(app => {
                      const isSelected = selectedAppIds.includes(app.id);
                      const isEligible = app.status === 'applied' || app.status === 'shortlisted';
                      return (
                        <tr 
                          key={app.id} 
                          onClick={() => isEligible && handleSelectApp(app.id)}
                          style={{ 
                            borderBottom: '1px solid var(--border-light)',
                            backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.04)' : 'transparent',
                            cursor: isEligible ? 'pointer' : 'not-allowed',
                            opacity: isEligible ? 1 : 0.6,
                            transition: 'background-color 0.2s'
                          }}
                        >
                          <td style={{ width: '48px', textAlign: 'center', padding: '12px' }} onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              style={{ width: '16px', height: '16px', cursor: isEligible ? 'pointer' : 'not-allowed' }}
                              checked={isSelected}
                              disabled={!isEligible}
                              onChange={() => isEligible && handleSelectApp(app.id)}
                            />
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '750', color: 'var(--text-primary)', fontSize: '13px' }}>{app.student_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '500' }}>
                              {app.student_stream || 'General'} • CGPA {app.student_cgpa || 'N/A'}
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className={`badge ${
                              app.status === 'selected' || app.status === 'accepted' ? 'badge-success' :
                              app.status === 'shortlisted' ? 'badge-info' :
                              app.status === 'rejected' ? 'badge-danger' : 'badge-neutral'
                            }`} style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {app.status}
                            </span>
                            {!isEligible && (
                              <span style={{ fontSize: '10px', fontWeight: '800', color: '#ef4444', marginLeft: '8px', textTransform: 'uppercase' }}>
                                (Resumes Locked)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            {app.resume_url ? (
                              <a 
                                href={app.resume_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="badge badge-success" 
                                style={{ fontSize: '10px', fontWeight: '800', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', cursor: 'pointer' }}
                              >
                                ✓ View Resume ↗
                              </a>
                            ) : (
                              <span className="badge badge-danger" style={{ fontSize: '10px', fontWeight: '800', padding: '4px 10px' }}>
                                ✗ No
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* Warnings at the bottom of the table */}
            {selectedAppIds.length > 0 && appsWithoutResume.length > 0 && (
              <div style={{ padding: '16px', borderTop: '1px solid rgba(245, 158, 11, 0.15)', backgroundColor: 'rgba(245, 158, 11, 0.04)', color: '#d97706', display: 'flex', alignItems: 'start', gap: '8px' }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '11px', fontWeight: '600', lineHeight: '1.4' }}>
                  <strong style={{ fontWeight: '900', textTransform: 'uppercase', marginRight: '4px' }}>Resume Alert:</strong> 
                  {appsWithoutResume.length} selected student(s) do not have a resume uploaded and will be skipped during email compilation.
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Email Form */}
          <div className="card animate-in" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '700px', overflow: 'hidden', borderRadius: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
              <h3 className="font-extrabold text-primary" style={{ fontSize: '16px', fontFamily: 'var(--font-heading)', margin: 0 }}>Step 3: Compose Email</h3>
              <p className="text-secondary" style={{ fontSize: '11px', margin: '2px 0 0' }}>Provide target HR address and customise subject/body details.</p>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {errors.general && (
                <div className="alert alert-error animate-in" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--danger)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  {errors.general}
                </div>
              )}

              <div className="input-group">
                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Company HR Email <span style={{ color: 'var(--danger)', fontWeight: '900' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="email" 
                    value={companyEmail} 
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="hr@company.com" 
                    className={`input-field ${errors.company_email ? 'input-error' : ''}`}
                    style={{ padding: '12px 12px 12px 36px', fontSize: '13px', fontWeight: '600', borderRadius: '12px', border: '1px solid var(--border-color)' }}
                  />
                  <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
                {errors.company_email && <p className="error-text" style={{ fontSize: '11px', fontWeight: '700', marginTop: '6px', margin: '6px 0 0' }}>{errors.company_email}</p>}
              </div>

              <div className="input-group">
                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
                  <span>CC Contacts (Optional, max 5)</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'none', fontWeight: '500' }}>Press Enter to add</span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="email" 
                    value={ccInput} 
                    onChange={(e) => setCcInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCC())}
                    placeholder="e.g. placements@ilead.edu" 
                    className="input-field"
                    style={{ padding: '12px', fontSize: '13px', fontWeight: '600', borderRadius: '12px', border: '1px solid var(--border-color)', flex: 1 }}
                  />
                  <button 
                    type="button" 
                    onClick={handleAddCC} 
                    className="btn btn-secondary"
                    style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
                {errors.cc_emails && <p className="error-text" style={{ fontSize: '11px', fontWeight: '700', marginTop: '6px', margin: '6px 0 0' }}>{errors.cc_emails}</p>}
                
                {ccEmails.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', backgroundColor: 'var(--bg-body)', padding: '10px', borderRadius: '14px', border: '1px solid var(--border-light)' }}>
                    {ccEmails.map(email => (
                      <span key={email} className="badge badge-neutral" style={{ padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px', fontWeight: '600' }}>{email}</span>
                        <button 
                          type="button"
                          onClick={() => handleRemoveCC(email)} 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', borderRadius: '50%', color: 'var(--text-muted)' }}
                        >
                          <X size={10} strokeWidth={3} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Subject Line <span style={{ color: 'var(--danger)', fontWeight: '900' }}>*</span>
                  </label>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', backgroundColor: 'var(--bg-body)', border: '1px solid var(--border-light)', padding: '2px 8px', borderRadius: '10px' }}>{subject.length}/200</span>
                </div>
                <input 
                  type="text" 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  className={`input-field ${errors.subject ? 'input-error' : ''}`}
                  style={{ padding: '12px', fontSize: '13px', fontWeight: '700', borderRadius: '12px', border: '1px solid var(--border-color)' }}
                />
                {errors.subject && <p className="error-text" style={{ fontSize: '11px', fontWeight: '700', marginTop: '6px', margin: '6px 0 0' }}>{errors.subject}</p>}
              </div>

              <div className="input-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '220px' }}>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Email Cover Message <span style={{ color: 'var(--danger)', fontWeight: '900' }}>*</span>
                  </label>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', backgroundColor: 'var(--bg-body)', border: '1px solid var(--border-light)', padding: '2px 8px', borderRadius: '10px' }}>{body.length}/5000</span>
                </div>
                <textarea 
                  value={body} 
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={5000}
                  className={`input-field ${errors.body ? 'input-error' : ''}`}
                  style={{ padding: '12px', fontSize: '13px', lineHeight: '1.6', fontWeight: '500', borderRadius: '12px', border: '1px solid var(--border-color)', flex: 1, resize: 'none' }}
                />
                {errors.body && <p className="error-text" style={{ fontSize: '11px', fontWeight: '700', marginTop: '6px', margin: '6px 0 0' }}>{errors.body}</p>}
              </div>
            </div>
            
            <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'between', gap: '12px', position: 'sticky', bottom: 0, zIndex: 20 }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} style={{ color: 'var(--accent-primary)' }} />
                <span>{appsWithResume.length} resume(s) will be attached</span>
              </span>
              <button 
                onClick={handleSend} 
                disabled={sending || appsWithResume.length === 0 || !companyEmail.trim() || !subject.trim() || !body.trim()} 
                className="btn btn-primary"
                style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-md)', transition: 'all 0.3s' }}
              >
                {sending ? (
                  <>
                    <svg className="spin" style={{ width: '14px', height: '14px', border: '2px solid transparent', borderTopColor: 'white', borderRadius: '50%' }} viewBox="0 0 24 24"></svg>
                    Dispatching...
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    Send Resumes Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Premium Email Sending Progress Overlay for Resumes */}
      {sending && (
        <div className="email-overlay-backdrop">
          <div className="email-overlay-card">
            <div className="airplane-container">
              <div className="wind-stream wind-1"></div>
              <div className="wind-stream wind-2"></div>
              <div className="wind-stream wind-3"></div>
              <span className="paper-airplane">✈</span>
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Dispatching Resumes</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Please wait while we pack candidate profiles, attach verify-checked resumes, and securely email the hiring team...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkSendResumes;


