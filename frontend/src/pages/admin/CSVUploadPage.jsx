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
  const fileInputRef = useRef(null);

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

  const processFile = async (file) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast('Please upload a valid .csv file.', 'error');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    const fd = new FormData();
    fd.append('file', file);

    try {
      const { data } = await api.post('/students/import-csv/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setUploadResult(data);
      showToast(data.message);
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
    } catch (err) {
      showToast(err.response?.data?.error || 'CSV upload failed.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
      showToast(err.response?.data?.error || 'Failed to revert upload.', 'error');
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
        <h1>Student CSV Import</h1>
        <button onClick={downloadTemplate} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Download size={16} />
          Download Template
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        
        {/* Upload Zone */}
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 20 }}>Upload CSV File</h2>
          
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
              accept=".csv" 
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
                  {uploading ? 'Processing File...' : 'Click or Drag & Drop your CSV here'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Maximum file size: 5MB. Must be a valid comma-separated .csv file.
                </p>
              </div>
            </div>
          </div>

          {/* Results Area */}
          {uploadResult && uploadResult.upload_log && (
            <div style={{ marginTop: 24, padding: 20, borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card-hover)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.05rem', marginBottom: 16 }}>
                {uploadResult.upload_log.status === 'failed' ? <XCircle size={20} color="var(--danger)" /> : <CheckCircle size={20} color="var(--success)" />}
                Upload Complete
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ padding: 12, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)' }}>
                  <div style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 800 }}>{uploadResult.upload_log.successful_records}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Success</div>
                </div>
                <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)' }}>
                  <div style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 800 }}>{uploadResult.upload_log.failed_records}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Failed</div>
                </div>
                <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 800 }}>{uploadResult.upload_log.total_records}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total</div>
                </div>
              </div>

              {uploadResult.upload_log.error_details && (
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: 12, borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#ef4444', marginBottom: 8, fontWeight: 700 }}>Error Logs</h4>
                  <pre style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxHeight: 150, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                    {uploadResult.upload_log.error_details}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions / Info Panel */}
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 20 }}>How to format your CSV</h2>
          
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
                        log.status === 'failed' ? 'badge-danger' : 
                        log.status === 'reverted' ? 'badge-warning' : 'badge-warning'
                      }`} style={{ textTransform: 'capitalize' }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>{log.successful_records}</td>
                    <td style={{ color: '#ef4444', fontWeight: 600 }}>{log.failed_records}</td>
                    <td>
                      {log.status !== 'reverted' && log.status !== 'failed' && (
                        <button 
                          onClick={() => handleRevert(log.id)}
                          className="btn btn-danger btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', fontSize: '0.8rem' }}
                          title="Delete newly created students from this upload"
                        >
                          <Trash2 size={14} /> Revert
                        </button>
                      )}
                      {log.status === 'reverted' && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Reverted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
