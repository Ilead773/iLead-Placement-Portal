import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api/axios';
import { Download, UploadCloud, FileText, CheckCircle, XCircle, Trash2, Clock, AlertCircle } from 'lucide-react';

export default function CSVUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [toast, setToast] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedLogSummary, setSelectedLogSummary] = useState(null);
  const [defaultSemester, setDefaultSemester] = useState('');
  const fileInputRef = useRef(null);
  const [sendingEmails, setSendingEmails] = useState({});

  // Smart Email Dispatch Modal State
  const [emailModalLog, setEmailModalLog] = useState(null);
  const [loadingEmailPreview, setLoadingEmailPreview] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [emailLimit, setEmailLimit] = useState(300);
  const [selectedSender, setSelectedSender] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get('/students/upload-history/');
      setHistory(data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load upload history.', 'error');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const pollUploadStatus = (logId) => {
    let intervalId = setInterval(async () => {
      try {
        const { data } = await api.get(`/students/upload-status/${logId}/`);
        
        if (data.status !== 'pending' && data.status !== 'processing') {
          clearInterval(intervalId);
          setUploading(false);
          setUploadResult({ upload_log: data });
          
          if (data.status === 'success' || data.status === 'partial') {
            showToast(`Import complete! ${data.successful_records} students processed.`);
            fetchHistory();
            
            // Auto-download credentials Excel
            if (data.credentials_excel) {
              const byteCharacters = atob(data.credentials_excel);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `credentials_${Date.now()}.xlsx`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          } else {
            showToast(data.error_details || 'CSV processing failed.', 'error');
            fetchHistory();
          }
        } else {
          setUploadResult({
            upload_log: data,
            is_polling: true
          });
        }
      } catch (err) {
        clearInterval(intervalId);
        setUploading(false);
        showToast('Error checking upload status.', 'error');
      }
    }, 2000);
  };

  const processFile = async (file) => {
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      showToast('Please upload a valid .csv or .xlsx file.', 'error');
      return;
    }
    setUploading(true);
    setUploadResult(null);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('default_semester', defaultSemester);

    try {
      const { data } = await api.post('/students/import-csv/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setUploadResult(data);
      showToast("File upload successful. Processing in background...");
      pollUploadStatus(data.upload_log.id);
    } catch (err) {
      showToast(err.response?.data?.error || 'CSV upload failed.', 'error');
      setUploading(false);
    }
  };

  const handleDownloadCredentials = async (logId, fileName) => {
    try {
      const response = await api.get(`/students/${logId}/download-credentials/`, {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = fileName ? fileName.replace(/\.[^/.]+$/, "") : `credentials_${logId}`;
      a.download = `${cleanName}_credentials.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Credentials sheet downloaded successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to download credentials sheet. It may have expired or does not exist.', 'error');
    }
  };

  const handleRevert = async (logId) => {
    if (!window.confirm("Are you sure you want to revert this upload? This will permanently delete all newly created students from this upload.")) {
      return;
    }
    
    try {
      const { data } = await api.post(`/students/${logId}/revert-upload/`);
      showToast(data.message, 'success');
      fetchHistory();
    } catch (err) {
      if (err.response?.data?.blocked_students) {
        const studentNames = err.response.data.blocked_students.map(s => `${s.name} (${s.reasons.join(', ')})`).join('\n');
        alert(`Cannot revert this upload because the following students have active data:\n\n${studentNames}\n\nTo revert, you must delete their active applications/resumes first, or check their details.`);
      } else {
        showToast(err.response?.data?.error || 'Failed to revert upload.', 'error');
      }
    }
  };

  const openEmailModal = async (logId) => {
    setEmailModalLog(logId);
    setLoadingEmailPreview(true);
    setEmailPreviewData(null);
    try {
      const { data } = await api.get(`/students/upload-status/${logId}/preview-emails/`);
      setEmailPreviewData(data);
      setSelectedCourses(data.course_breakdown.map(c => c.course));
      setEmailLimit(data.daily_limit || 300);
      if (data.sender_options && data.sender_options.length > 0) {
        setSelectedSender(data.sender_options[0]);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to fetch email preview details.', 'error');
      setEmailModalLog(null);
    } finally {
      setLoadingEmailPreview(false);
    }
  };

  const handleDispatchConfiguredEmails = async () => {
    if (!emailModalLog) return;
    const logId = emailModalLog;
    
    setSendingEmails(prev => ({ ...prev, [logId]: true }));
    try {
      const payload = {
        courses: selectedCourses,
        limit: parseInt(emailLimit, 10) || undefined,
        sender_email: selectedSender?.email,
        sender_name: selectedSender?.name,
      };

      const { data } = await api.post(`/students/upload-status/${logId}/send-emails/`, payload);
      showToast(data.message, 'success');
      setEmailModalLog(null);

      // Update selected summary if open
      if (selectedLogSummary && selectedLogSummary.id === logId) {
        setSelectedLogSummary(prev => ({ ...prev, emails_sent: true, emails_sent_at: new Date().toISOString() }));
      }
      
      // Update uploadResult if open
      if (uploadResult && uploadResult.upload_log && uploadResult.upload_log.id === logId) {
        setUploadResult(prev => ({
          ...prev,
          upload_log: {
            ...prev.upload_log,
            emails_sent: true,
            emails_sent_at: new Date().toISOString()
          }
        }));
      }

      fetchHistory();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send welcome emails.', 'error');
    } finally {
      setSendingEmails(prev => ({ ...prev, [logId]: false }));
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "Name", "Registration Number", "Email ID", "Phone Number", 
      "Course", "Stream", "Semester", "Passing Year", "CGPA", 
      "Attendance", "Training Attendance", "Backlogs"
    ].join(',');
    
    const sampleData = [
      "John Doe,REG001,john@example.com,9876543210,BCA,Computer Science,5,2025,8.5,85.5,90,No",
      "Jane Smith,REG002,jane@example.com,9876543211,BBA,Finance,3,2026,9.2,95,100,No"
    ].join('\n');

    const csvContent = headers + '\n' + sampleData;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "ilead_student_upload_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container">
      {toast && (
        <div className={`toast toast-${toast.type} animate-in`}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}

      <div className="page-header" style={{ marginBottom: 32 }}>
        <h1>Student CSV / Excel Import</h1>
        <button onClick={downloadTemplate} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Download size={16} />
          Download Template
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        
        {/* Upload Zone */}
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 20 }}>Upload CSV or Excel File</h2>

          {/* Default Semester Selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Default Semester <span style={{ fontWeight: 400, marginLeft: 6, color: 'var(--text-muted)' }}>(Optional - applied to students with no semester in file)</span>
            </label>
            <select
              value={defaultSemester}
              onChange={e => setDefaultSemester(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: `1.5px solid ${defaultSemester ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: 'var(--bg-card)', color: 'var(--text-primary)',
                fontSize: '0.95rem', outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="">— Select Semester —</option>
              {[1,2,3,4,5,6,7,8].map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
          
          <div 
            style={{
              border: `2px dashed ${isDragging ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              borderRadius: '12px',
              padding: '48px 24px',
              textAlign: 'center',
              backgroundColor: isDragging ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-card-hover)',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              accept=".csv,.xlsx,.xls" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              hidden 
              disabled={uploading} 
            />
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ 
                width: 64, height: 64, borderRadius: '50%', 
                background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <UploadCloud size={32} />
              </div>
              
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {uploading ? 'Processing File...' : 'Click or Drag & Drop your file here'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Maximum file size: 5MB. Must be a valid .csv or .xlsx file.
                </p>
              </div>
            </div>
          </div>

          {/* Results Area */}
          {uploadResult && uploadResult.upload_log && (
            <div style={{ marginTop: 24, padding: 20, borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card-hover)' }}>
              {uploadResult.is_polling ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div className="spinner" style={{ width: 28, height: 28, border: '3px solid rgba(99, 102, 241, 0.1)', borderTop: '3px solid var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0, margin: 0 }} />
                    <div style={{ flexGrow: 1 }}>
                      <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)', fontWeight: 700 }}>
                        {uploadResult.upload_log.status === 'pending' ? '⏳ Queued in Worker Queue...' : '⚡ Processing CSV...'}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                        Processed {uploadResult.upload_log.successful_records + uploadResult.upload_log.failed_records} of {uploadResult.upload_log.total_records || '?'} student records...
                      </p>
                    </div>
                  </div>

                  {/* Real-time Progress Bar */}
                  {uploadResult.upload_log.total_records > 0 && (
                    <div style={{ width: '100%', height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${Math.min(100, Math.round(((uploadResult.upload_log.successful_records + uploadResult.upload_log.failed_records) / uploadResult.upload_log.total_records) * 100))}%`, 
                          background: 'linear-gradient(90deg, var(--accent-primary) 0%, #a855f7 100%)', 
                          borderRadius: 4, 
                          transition: 'width 0.4s ease-out' 
                        }} 
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', textAlign: 'center', minWidth: 80 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: '1.3rem', fontWeight: 800 }}>{uploadResult.upload_log.total_records}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 8, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)', textAlign: 'center', minWidth: 80 }}>
                      <div style={{ color: '#10b981', fontSize: '1.3rem', fontWeight: 800 }}>{uploadResult.upload_log.successful_records}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Success</div>
                    </div>
                    {uploadResult.upload_log.failed_records > 0 && (
                      <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', textAlign: 'center', minWidth: 80 }}>
                        <div style={{ color: '#ef4444', fontSize: '1.3rem', fontWeight: 800 }}>{uploadResult.upload_log.failed_records}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Failed</div>
                      </div>
                    )}
                  </div>

                  {/* Real-time console log details */}
                  {uploadResult.upload_log.error_details && (
                    <div style={{ background: '#0f172a', padding: 16, borderRadius: 8, border: '1px solid #334155', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)' }}>
                      <h4 style={{ fontSize: '0.82rem', color: '#38bdf8', marginBottom: 8, fontWeight: 700, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 8px 0' }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', animation: 'pulse 1.5s infinite' }}></span>
                        Live Processing Log (A-Z details)
                      </h4>
                      <pre 
                        ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}
                        style={{ fontSize: '0.75rem', color: '#cbd5e1', maxHeight: 150, overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'Courier New, monospace', margin: 0, textAlign: 'left' }}
                      >
                        {uploadResult.upload_log.error_details}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.05rem', marginBottom: 16 }}>
                    {uploadResult.upload_log.status === 'failed' ? <XCircle size={20} color="var(--danger)" /> : <CheckCircle size={20} color="var(--success)" />}
                    Upload Status: <span style={{ textTransform: 'capitalize', color: uploadResult.upload_log.status === 'success' ? '#10b981' : uploadResult.upload_log.status === 'partial' ? '#f59e0b' : '#ef4444' }}>{uploadResult.upload_log.status}</span>
                  </h3>
                  
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                    <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255, 255, 255, 0.05)', textAlign: 'center', minWidth: 80 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 800 }}>{uploadResult.upload_log.total_records}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total</div>
                    </div>
                    {uploadResult.upload_log.created_count > 0 && (
                      <div style={{ padding: 12, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center', minWidth: 90 }}>
                        <div style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 800 }}>{uploadResult.upload_log.created_count}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>🆕 New Added</div>
                      </div>
                    )}
                    {uploadResult.upload_log.updated_count > 0 && (
                      <div style={{ padding: 12, borderRadius: 8, background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', textAlign: 'center', minWidth: 90 }}>
                        <div style={{ color: '#818cf8', fontSize: '1.5rem', fontWeight: 800 }}>{uploadResult.upload_log.updated_count}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>✏️ Updated</div>
                      </div>
                    )}
                    {uploadResult.upload_log.failed_records > 0 && (
                      <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center', minWidth: 80 }}>
                        <div style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 800 }}>{uploadResult.upload_log.failed_records}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>❌ Failed</div>
                      </div>
                    )}
                  </div>

                  {/* Manual Welcome Emails Trigger */}
                  {uploadResult.upload_log.status !== 'failed' && uploadResult.upload_log.status !== 'reverted' && uploadResult.upload_log.created_count > 0 && (
                    <div style={{ 
                      marginBottom: 16, 
                      padding: '12px 16px', 
                      borderRadius: '8px', 
                      background: 'rgba(99, 102, 241, 0.05)', 
                      border: '1px solid rgba(99, 102, 241, 0.15)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12
                    }}>
                      <div style={{ textAlign: 'left' }}>
                        <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 2 }}>Student Welcome Emails</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {uploadResult.upload_log.emails_sent 
                            ? `Sent on ${new Date(uploadResult.upload_log.emails_sent_at).toLocaleString()}` 
                            : `Send login credentials to ${uploadResult.upload_log.created_count} new student accounts.`}
                        </span>
                      </div>
                      {uploadResult.upload_log.emails_sent ? (
                        <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.8rem' }}>✓ Sent</span>
                      ) : (
                        <button 
                          onClick={() => openEmailModal(uploadResult.upload_log.id)}
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: '0.8rem', border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer', borderRadius: '6px', fontWeight: 600 }}
                          disabled={sendingEmails[uploadResult.upload_log.id]}
                        >
                          {sendingEmails[uploadResult.upload_log.id] ? 'Sending...' : '⚙️ Configure & Send'}
                        </button>
                      )}
                    </div>
                  )}


                  {uploadResult.upload_log.error_details && (
                    <div style={{ background: '#0f172a', padding: 16, borderRadius: 8, border: '1px solid #334155', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)' }}>
                      <h4 style={{ fontSize: '0.85rem', color: '#38bdf8', marginBottom: 8, fontWeight: 700, fontFamily: 'monospace', margin: '0 0 8px 0', textAlign: 'left' }}>Detailed Processing Log & Results</h4>
                      <pre 
                        ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}
                        style={{ fontSize: '0.75rem', color: '#cbd5e1', maxHeight: 180, overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'Courier New, monospace', margin: 0, textAlign: 'left' }}
                      >
                        {uploadResult.upload_log.error_details}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Instructions / Info Panel */}
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 20 }}>How to format your File</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ color: 'var(--accent-primary)', marginTop: 2 }}><CheckCircle size={18} /></div>
              <div>
                <strong style={{ display: 'block', marginBottom: 4 }}>Required Columns</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <code style={{ background: 'var(--bg-body)', padding: '2px 6px', borderRadius: 4 }}>Name</code>, 
                  <code style={{ background: 'var(--bg-body)', padding: '2px 6px', borderRadius: 4, margin: '0 6px' }}>Registration Number</code>, 
                  <code style={{ background: 'var(--bg-body)', padding: '2px 6px', borderRadius: 4 }}>Email ID</code>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ color: '#f59e0b', marginTop: 2 }}><AlertCircle size={18} /></div>
              <div>
                <strong style={{ display: 'block', marginBottom: 4 }}>Auto-Calculated Categories</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  The system will automatically calculate the student's category (A/B/C) if you provide their 
                  <code style={{ background: 'var(--bg-body)', padding: '2px 6px', borderRadius: 4, margin: '0 6px' }}>CGPA</code> and 
                  <code style={{ background: 'var(--bg-body)', padding: '2px 6px', borderRadius: 4, margin: '0 6px' }}>Attendance</code>.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ color: '#8b5cf6', marginTop: 2 }}><FileText size={18} /></div>
              <div>
                <strong style={{ display: 'block', marginBottom: 4 }}>Updating Existing Students</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  If a student's Registration Number already exists, the system will update their details instead of creating a duplicate. Blank fields will not overwrite their existing data.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* History Table */}
      <div className="card" style={{ marginTop: 24, padding: '24px 0' }}>
        <div style={{ padding: '0 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={20} />
            Recent Upload History
          </h2>
          <button onClick={fetchHistory} className="btn btn-secondary btn-sm">Refresh</button>
        </div>

        {loadingHistory ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : history.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>No upload history found.</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>File Name</th>
                  <th>Status</th>
                  <th>Success</th>
                  <th>Failed</th>
                  <th>Welcome Emails</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{new Date(log.uploaded_at).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(log.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{log.file_name}</td>
                    <td>
                      <span className={`badge ${
                        log.status === 'success' ? 'badge-success' : 
                        log.status === 'partial' ? 'badge-warning' : 
                        log.status === 'reverted' ? 'badge-warning' : 
                        log.status === 'pending' ? 'badge-info' : 
                        log.status === 'processing' ? 'badge-info animate-pulse' : 'badge-danger'
                      }`} style={{ textTransform: 'capitalize' }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>{log.successful_records}</td>
                    <td style={{ color: '#ef4444', fontWeight: 600 }}>{log.failed_records}</td>
                    <td>
                      {log.status !== 'reverted' && log.status !== 'failed' && log.created_count > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {log.emails_sent && (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: 4, 
                              color: '#10b981', 
                              fontWeight: 600, 
                              fontSize: '0.82rem', 
                              background: 'rgba(16, 185, 129, 0.08)', 
                              padding: '4px 10px', 
                              borderRadius: '20px', 
                              border: '1px solid rgba(16, 185, 129, 0.2)' 
                            }} title={`Sent ${log.sent_emails_count || ''} emails on ${log.emails_sent_at ? new Date(log.emails_sent_at).toLocaleString() : ''}`}>
                              ✓ {log.sent_emails_count ? `${log.sent_emails_count} Sent` : 'Emails Sent'}
                            </span>
                          )}
                          <button 
                            onClick={() => openEmailModal(log.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: 6, 
                              padding: '4px 8px', 
                              fontSize: '0.75rem', 
                              cursor: 'pointer', 
                              border: '1px solid var(--accent-primary)', 
                              color: 'var(--accent-primary)', 
                              background: 'transparent',
                              borderRadius: '6px',
                              fontWeight: 600
                            }}
                            disabled={sendingEmails[log.id]}
                          >
                            {sendingEmails[log.id] ? 'Sending...' : log.emails_sent ? '⚙️ Send More' : '⚙️ Configure & Send'}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          {log.status === 'reverted' ? 'Reverted' : log.status === 'failed' ? 'Failed' : 'No new accounts'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button 
                          onClick={() => setSelectedLogSummary(log)}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          👁️ View Summary
                        </button>

                        {log.status !== 'reverted' && log.status !== 'failed' && (log.created_count > 0 || (log.created_count === 0 && log.updated_count === 0 && log.successful_records > 0)) && (
                          <button 
                            onClick={() => handleDownloadCredentials(log.id, log.file_name)}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer', border: '1px solid #10b981', color: '#10b981', background: 'transparent' }}
                            title="Download student credentials sheet"
                          >
                            📥 Credentials
                          </button>
                        )}

                        {log.status !== 'reverted' && log.status !== 'failed' && (
                          <button 
                            onClick={() => handleRevert(log.id)}
                            className="btn btn-danger btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer' }}
                            title="Delete newly created students from this upload"
                          >
                            <Trash2 size={14} /> Revert
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

         {selectedLogSummary && (
        <div className="modal-overlay" onClick={() => setSelectedLogSummary(null)} style={{ zIndex: 1200 }}>
          <div className="modal card animate-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620, padding: 24 }}>
            <div className="modal-header" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>📊 Import Summary: {selectedLogSummary.file_name}</h3>
              <button className="modal-close" onClick={() => setSelectedLogSummary(null)}>×</button>
            </div>

            {/* Status + timestamp */}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                padding: '4px 14px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 700,
                background: selectedLogSummary.status === 'success' ? 'rgba(16,185,129,0.15)' : selectedLogSummary.status === 'partial' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                color: selectedLogSummary.status === 'success' ? '#10b981' : selectedLogSummary.status === 'partial' ? '#f59e0b' : '#ef4444',
                border: `1px solid ${selectedLogSummary.status === 'success' ? 'rgba(16,185,129,0.3)' : selectedLogSummary.status === 'partial' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                {selectedLogSummary.status === 'success' ? '✅ Success' : selectedLogSummary.status === 'partial' ? '⚠️ Partial' : '❌ Failed'}
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {new Date(selectedLogSummary.uploaded_at).toLocaleString()}
              </span>
            </div>

            {/* Manual Welcome Emails Trigger in Modal */}
            {selectedLogSummary.status !== 'failed' && selectedLogSummary.status !== 'reverted' && selectedLogSummary.created_count > 0 && (
              <div style={{ 
                marginBottom: 20, 
                padding: '12px 16px', 
                borderRadius: '8px', 
                background: 'rgba(99, 102, 241, 0.05)', 
                border: '1px solid rgba(99, 102, 241, 0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12
              }}>
                <div style={{ textAlign: 'left' }}>
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 2 }}>Student Welcome Emails</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {selectedLogSummary.emails_sent 
                      ? `Sent on ${new Date(selectedLogSummary.emails_sent_at).toLocaleString()}` 
                      : `Send login details to ${selectedLogSummary.created_count} newly created student accounts.`}
                  </span>
                </div>
                {selectedLogSummary.emails_sent ? (
                  <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    ✓ Emails Sent
                  </span>
                ) : (
                  <button 
                    onClick={() => handleSendEmails(selectedLogSummary.id)}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.8rem', border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer', borderRadius: '4px' }}
                    disabled={sendingEmails[selectedLogSummary.id]}
                  >
                    {sendingEmails[selectedLogSummary.id] ? 'Sending...' : '✉ Send Emails'}
                  </button>
                )}
              </div>
            )}

            {selectedLogSummary.status !== 'failed' && selectedLogSummary.status !== 'reverted' && (selectedLogSummary.created_count > 0 || (selectedLogSummary.created_count === 0 && selectedLogSummary.updated_count === 0 && selectedLogSummary.successful_records > 0)) && (
              <div style={{ 
                marginBottom: 20, 
                padding: '12px 16px', 
                borderRadius: '8px', 
                background: 'rgba(16, 185, 129, 0.05)', 
                border: '1px solid rgba(16, 185, 129, 0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12
              }}>
                <div style={{ textAlign: 'left' }}>
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 2 }}>Credentials Sheet</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Download generated login credentials and passwords.
                  </span>
                </div>
                <button 
                  onClick={() => handleDownloadCredentials(selectedLogSummary.id, selectedLogSummary.file_name)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.8rem', border: '1px solid #10b981', color: '#10b981', background: 'transparent', cursor: 'pointer', borderRadius: '4px', fontWeight: 600 }}
                >
                  📥 Download Credentials
                </button>
              </div>
            )}

            {/* Stat boxes */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border-color)', textAlign: 'center', minWidth: 80 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>{selectedLogSummary.total_records}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
              </div>
              {selectedLogSummary.created_count > 0 ? (
                <div style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center', minWidth: 90 }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>{selectedLogSummary.created_count}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🆕 New Added</div>
                </div>
              ) : selectedLogSummary.successful_records > 0 && !selectedLogSummary.updated_count ? (
                <div style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center', minWidth: 90 }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>{selectedLogSummary.successful_records}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✅ Processed</div>
                </div>
              ) : null}
              {selectedLogSummary.updated_count > 0 && (
                <div style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', textAlign: 'center', minWidth: 90 }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#818cf8' }}>{selectedLogSummary.updated_count}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✏️ Updated</div>
                </div>
              )}
              {selectedLogSummary.failed_records > 0 && (
                <div style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', textAlign: 'center', minWidth: 80 }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ef4444' }}>{selectedLogSummary.failed_records}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>❌ Failed</div>
                </div>
              )}
            </div>

            {/* Error details — strip the summary header, only show actual row errors */}
            {(() => {
              const details = selectedLogSummary.error_details || '';
              const errIdx = details.indexOf('=== DETAILED ERRORS ===');
              const errorBlock = errIdx !== -1 ? details.slice(errIdx + 23).trim() : '';
              const isLegacyLog = selectedLogSummary.created_count === 0 && selectedLogSummary.updated_count === 0 && selectedLogSummary.successful_records > 0;
              if (!errorBlock) {
                return (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    {isLegacyLog
                      ? '📌 This import was processed before the new tracking was enabled. The New Added vs Updated breakdown is not available for older logs.'
                      : '✅ No row-level errors — all records were imported cleanly.'}
                  </div>
                );
              }
              return (
                <div style={{ background: '#0f172a', padding: 16, borderRadius: 8, border: '1px solid #334155' }}>
                  <h5 style={{ margin: '0 0 8px 0', fontSize: '0.82rem', color: '#f87171', fontWeight: 700, fontFamily: 'monospace' }}>
                    ⚠️ Row-Level Errors ({selectedLogSummary.failed_records})
                  </h5>
                  <pre style={{ margin: 0, fontSize: '0.75rem', color: '#cbd5e1', maxHeight: 220, overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'Courier New, monospace', textAlign: 'left' }}>
                    {errorBlock}
                  </pre>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Smart Email Dispatch Modal */}
      {emailModalLog && (
        <div className="modal-overlay" onClick={() => setEmailModalLog(null)} style={{ zIndex: 1200 }}>
          <div className="modal card animate-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580, padding: 24, borderRadius: 16 }}>
            <div className="modal-header" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                📧 Configure Welcome Email Dispatch
              </h3>
              <button className="modal-close" onClick={() => setEmailModalLog(null)} style={{ border: 'none', background: 'transparent', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
            </div>

            {loadingEmailPreview ? (
              <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div className="spinner" style={{ width: 32, height: 32, border: '3px solid rgba(99, 102, 241, 0.1)', borderTop: '3px solid var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span>Loading recipient courses and quota details...</span>
              </div>
            ) : emailPreviewData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                
                {/* Brevo Quota Banner */}
                {(() => {
                  const targetCount = emailPreviewData.course_breakdown
                    .filter(c => selectedCourses.includes(c.course))
                    .reduce((sum, c) => sum + c.count, 0);
                  const effectiveCount = Math.min(targetCount, parseInt(emailLimit, 10) || 0);
                  const dailyLimit = emailPreviewData.daily_limit || 300;
                  const pct = Math.min(100, Math.round((effectiveCount / dailyLimit) * 100));

                  return (
                    <div style={{ padding: 16, borderRadius: 12, background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Brevo Daily Quota Utilization</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: effectiveCount > dailyLimit ? '#ef4444' : 'var(--accent-primary)' }}>
                          {effectiveCount} / {dailyLimit} Emails ({pct}%)
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ width: '100%', height: 8, background: 'var(--bg-input, rgba(0,0,0,0.1))', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: effectiveCount > dailyLimit ? '#ef4444' : 'linear-gradient(90deg, #6366f1, #10b981)', borderRadius: 4, transition: 'width 0.3s ease' }} />
                      </div>

                      {emailPreviewData.sent_emails_count > 0 && (
                        <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>✓ Previously Sent: <strong>{emailPreviewData.sent_emails_count} emails</strong> for this upload.</span>
                        </div>
                      )}

                      {effectiveCount > dailyLimit && (
                        <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginTop: 6 }}>
                          ⚠️ Exceeds Brevo free daily cap of {dailyLimit}! Lower your course selection or hard limit.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Course Selection Checkboxes */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Select Courses to Include:
                  </label>
                  {emailPreviewData.course_breakdown.length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', italic: 'true' }}>No pending student emails found for this import.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxH: 160, overflowY: 'auto', padding: 10, background: 'var(--bg-card-hover)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      {emailPreviewData.course_breakdown.map((item) => {
                        const isChecked = selectedCourses.includes(item.course);
                        const alreadySent = (emailPreviewData.sent_courses || []).includes(item.course);
                        return (
                          <label 
                            key={item.course} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 8, 
                              fontSize: '0.82rem', 
                              cursor: 'pointer',
                              padding: '6px 8px',
                              borderRadius: 6,
                              background: alreadySent ? 'rgba(16, 185, 129, 0.05)' : isChecked ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                              border: alreadySent ? '1px solid rgba(16, 185, 129, 0.25)' : isChecked ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent'
                            }}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCourses([...selectedCourses, item.course]);
                                } else {
                                  setSelectedCourses(selectedCourses.filter(c => c !== item.course));
                                }
                              }}
                            />
                            <span style={{ fontWeight: 600, flexGrow: 1, color: 'var(--text-primary)' }}>
                              {item.course}
                            </span>
                            {alreadySent && (
                              <span style={{ fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
                                Sent ✓
                              </span>
                            )}
                            <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 10, color: 'var(--text-secondary)' }}>{item.count}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Dispatch Controls Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  
                  {/* Email Hard Limit */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                      Send Limit Cap (Max):
                    </label>
                    <input 
                      type="number"
                      min="1"
                      max={emailPreviewData.daily_limit || 300}
                      value={emailLimit}
                      onChange={(e) => setEmailLimit(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                        color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none'
                      }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Stops sending once this limit is hit today.</span>
                  </div>

                  {/* Sender Account Picker */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                      Sender Identity:
                    </label>
                    <select
                      value={selectedSender?.email || ''}
                      onChange={(e) => {
                        const s = emailPreviewData.sender_options.find(opt => opt.email === e.target.value);
                        if (s) setSelectedSender(s);
                      }}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                        color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none'
                      }}
                    >
                      {(emailPreviewData.sender_options || []).map(opt => (
                        <option key={opt.email} value={opt.email}>
                          {opt.name} ({opt.email})
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Verified email address in Brevo.</span>
                  </div>

                </div>

                {/* Modal Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                  <button 
                    onClick={() => setEmailModalLog(null)}
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDispatchConfiguredEmails}
                    className="btn btn-primary"
                    style={{ 
                      padding: '8px 20px', fontSize: '0.85rem', fontWeight: 700, 
                      background: 'var(--accent-primary)', border: 'none', color: '#fff', 
                      borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 
                    }}
                    disabled={
                      sendingEmails[emailModalLog] || 
                      selectedCourses.length === 0 || 
                      Math.min(
                        emailPreviewData.course_breakdown
                          .filter(c => selectedCourses.includes(c.course))
                          .reduce((sum, c) => sum + c.count, 0),
                        parseInt(emailLimit, 10) || 0
                      ) === 0
                    }
                  >
                    {sendingEmails[emailModalLog] ? 'Dispatching Emails...' : `✉️ Dispatch ${Math.min(
                      emailPreviewData.course_breakdown
                        .filter(c => selectedCourses.includes(c.course))
                        .reduce((sum, c) => sum + c.count, 0),
                      parseInt(emailLimit, 10) || 0
                    )} Emails`}
                  </button>
                </div>

              </div>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}
