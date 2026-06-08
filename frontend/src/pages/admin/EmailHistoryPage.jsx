import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from '../../api/axios';
import { 
  Mail, 
  Calendar, 
  User, 
  Search, 
  Clock, 
  ArrowLeft, 
  ExternalLink, 
  X, 
  ChevronDown, 
  Check,
  FileText
} from 'lucide-react';

const EmailHistoryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const jobIdParam = searchParams.get('job_id') || '';

  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(jobIdParam);
  const [emailLogs, setEmailLogs] = useState([]);
  const [fetchingLogs, setFetchingLogs] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    setSelectedJobId(jobIdParam);
  }, [jobIdParam]);

  useEffect(() => {
    fetchLogs(selectedJobId);
  }, [selectedJobId]);

  const fetchJobs = async () => {
    try {
      const response = await axios.get('/jobs/admin/jobs/');
      const allJobs = (response.data || []).filter(j => j.job_type !== 'external');
      setJobs(allJobs);
    } catch (err) {
      console.error('Error fetching jobs', err);
    }
  };

  const fetchLogs = async (jobId = null) => {
    setFetchingLogs(true);
    try {
      const url = jobId 
        ? `/applications/admin/email-logs/?job_id=${jobId}` 
        : '/applications/admin/email-logs/';
      const response = await axios.get(url, { params: { _t: Date.now() } });
      setEmailLogs(response.data);
    } catch (e) {
      console.error('Failed to fetch email logs', e);
    } finally {
      setFetchingLogs(false);
    }
  };

  const handleJobFilterChange = (e) => {
    const val = e.target.value;
    setSelectedJobId(val);
    if (val) {
      setSearchParams({ job_id: val });
    } else {
      setSearchParams({});
    }
  };

  // Filtering logs based on user search term
  const filteredLogs = emailLogs.filter(log => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    
    return (
      (log.company_email || '').toLowerCase().includes(term) ||
      (log.subject || '').toLowerCase().includes(term) ||
      (log.job_title || '').toLowerCase().includes(term) ||
      (log.company_name || '').toLowerCase().includes(term) ||
      (log.sent_by_name || '').toLowerCase().includes(term) ||
      (log.student_names || []).some(name => name.toLowerCase().includes(term))
    );
  });

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      
      {/* Header */}
      <div className="page-header" style={{ position: 'relative', overflow: 'hidden', padding: '32px', borderRadius: '24px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.04, pointerEvents: 'none', color: 'var(--accent-primary)' }}>
          <Clock size={160} />
        </div>
        
        <div style={{ position: 'relative', zIndex: 10 }}>
          <button 
            onClick={() => navigate(-1)} 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '13px', 
              fontWeight: '700', 
              color: 'var(--accent-primary)',
              border: 'none', 
              background: 'none', 
              cursor: 'pointer', 
              marginBottom: '16px',
              padding: 0
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-heading)', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                Email Dispatch History
              </h1>
              <p className="text-secondary" style={{ marginTop: '6px', fontSize: '15px', maxWidth: '700px', lineHeight: '1.6' }}>
                Track and review resume emails sent by the placement cell office to employer partners.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Box */}
      <div className="card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', flex: 1, maxWidth: '800px' }}>
          
          {/* Search bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <input 
              type="text" 
              placeholder="Search recipient, subject, student..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ padding: '12px 12px 12px 36px', fontSize: '13px', borderRadius: '12px', border: '1px solid var(--border-color)', width: '100%' }}
            />
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
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

          {/* Job Dropdown Selector */}
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <select 
              className="input-field"
              style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', borderRadius: '12px', border: '1px solid var(--border-color)', appearance: 'none', width: '100%' }}
              value={selectedJobId}
              onChange={handleJobFilterChange}
            >
              <option value="">-- All Opportunities ({jobs.length}) --</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>
                  {job.listing_type === 'internship' ? '🎓 [Internship] ' : '💼 [Job] '} {job.role || job.title} at {job.company_name}
                </option>
              ))}
            </select>
            <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
              <ChevronDown size={18} />
            </div>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '650' }}>
          Total Dispatches: <strong style={{ color: 'var(--accent-primary)', fontSize: '15px' }}>{filteredLogs.length}</strong>
        </div>
      </div>

      {/* Logs Table Card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {fetchingLogs ? (
          <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px' }}>
            <div className="spinner" style={{ width: '32px', height: '32px' }}></div>
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Loading dispatches...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="card text-center" style={{ padding: '64px', color: 'var(--text-muted)', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
            <Mail size={48} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '16px', marginInline: 'auto' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '750', color: 'var(--text-primary)', marginBottom: '4px' }}>No Dispatches Found</h3>
            <p style={{ margin: 0, fontSize: '13px' }}>
              {selectedJobId ? 'No emails match the filter for this opportunity.' : 'No email dispatches have been registered in the system yet.'}
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-body)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Sent Date</th>
                    <th style={{ padding: '16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Opportunity</th>
                    <th style={{ padding: '16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Recipient HR</th>
                    <th style={{ padding: '16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Subject</th>
                    <th style={{ padding: '16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: 'center' }}>Resumes</th>
                    <th style={{ padding: '16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Status</th>
                    <th style={{ padding: '16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Sender</th>
                    <th style={{ padding: '16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr 
                      key={log.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border-light)',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-body)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {new Date(log.sent_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: '750' }}>
                        <div>{log.job_title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '500' }}>{log.company_name}</div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: '700', whiteSpace: 'nowrap' }}>
                        {log.company_email}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.subject}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-primary)', textAlign: 'center', fontWeight: '850' }}>
                        {log.resumes_attached}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        <span className={`badge ${
                          log.status === 'sent' ? 'badge-success' :
                          log.status === 'failed' ? 'badge-danger' : 'badge-neutral'
                        }`} style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '800' }}>
                          {log.status === 'sent' ? '✓ Sent' : log.status === 'failed' ? '✗ Failed' : '⧗ Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: '600' }}>
                        {log.sent_by_name || 'System'}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button 
                          onClick={() => setSelectedLog(log)}
                          className="btn btn-secondary text-xs"
                          style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '750', borderRadius: '8px' }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      {selectedLog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', padding: '16px', overflowY: 'auto' }}>
          <div className="card animate-in" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px', width: '100%', maxWidth: '750px', overflow: 'hidden', padding: 0, boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-body)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="text-xl font-bold" style={{ margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Email Log Details</h3>
                <p className="text-secondary" style={{ fontSize: '11px', margin: '4px 0 0', fontWeight: '500' }}>
                  Sent on {new Date(selectedLog.sent_at).toLocaleString()} by {selectedLog.sent_by_name || 'System'} ({selectedLog.sent_by_email || 'N/A'})
                </p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '32px', color: 'var(--text-muted)', lineHeight: '1', padding: '4px' }}
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Opportunity Target</span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    {selectedLog.job_title || 'N/A'} at {selectedLog.company_name || 'N/A'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Recipient HR</span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>{selectedLog.company_email}</span>
                </div>
                
                {selectedLog.cc_emails && selectedLog.cc_emails.length > 0 && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>CC Contacts</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedLog.cc_emails.map((email) => (
                        <span key={email} style={{ fontSize: '11px', fontFamily: 'monospace', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-body)', color: 'var(--text-secondary)' }}>
                          {email}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Status</span>
                  <div>
                    <span className={`badge ${
                      selectedLog.status === 'sent' ? 'badge-success' :
                      selectedLog.status === 'failed' ? 'badge-danger' : 'badge-neutral'
                    }`} style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '800', display: 'inline-block' }}>
                      {selectedLog.status === 'sent' ? '✓ Sent' : selectedLog.status === 'failed' ? '✗ Failed' : '⧗ Pending'}
                    </span>
                    {selectedLog.error_message && (
                      <p style={{ fontSize: '11px', color: 'var(--danger)', margin: '4px 0 0' }}>{selectedLog.error_message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Resumes Forwarded</span>
                  <span style={{ fontSize: '13px', fontWeight: '850', color: 'var(--text-primary)' }}>{selectedLog.resumes_attached} student(s)</span>
                </div>
              </div>

              {/* Shared Link */}
              <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-body)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Workspace Shareable Link</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    readOnly 
                    value={`${window.location.origin}/shared-resumes/${selectedLog.id}`} 
                    style={{ flex: 1, padding: '8px 12px', fontSize: '12px', fontFamily: 'monospace', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/shared-resumes/${selectedLog.id}`);
                      alert('Link copied to clipboard!');
                    }} 
                    className="btn btn-secondary text-xs"
                    style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '750', borderRadius: '8px' }}
                  >
                    Copy
                  </button>
                  <a
                    href={`/shared-resumes/${selectedLog.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary text-xs"
                    style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '800', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontStyle: 'normal' }}
                  >
                    Open ↗
                  </a>
                </div>
              </div>

              {/* Student Names */}
              {selectedLog.student_names && selectedLog.student_names.length > 0 && (
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Included Students ({selectedLog.student_names.length})</span>
                  <div style={{ maxHeight: '110px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '12px', backgroundColor: 'rgba(248, 250, 252, 0.3)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px' }}>
                    {selectedLog.student_names.map((name, i) => (
                      <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {i + 1}. {name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Email Message Cover</span>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', padding: '16px', backgroundColor: 'var(--bg-body)', fontSize: '13px', fontFamily: 'sans-serif', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--text-primary)', maxHeight: '200px', overflowY: 'auto' }}>
                  <div style={{ fontWeight: '800', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
                    Subject: {selectedLog.subject}
                  </div>
                  {selectedLog.body}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-body)', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setSelectedLog(null)}
                className="btn btn-secondary"
                style={{ padding: '10px 24px', fontSize: '12px', fontWeight: '800', borderRadius: '12px' }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailHistoryPage;
