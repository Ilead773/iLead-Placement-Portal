// src/pages/SharedResumes.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../api/axios';
import logo from '../logo.png';
import { Download, ExternalLink, FileText, Briefcase, Calendar, Mail, CheckCircle, Search, Sparkles, Copy, Check } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function SharedResumes() {
  const { logId } = useParams();
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchSharedResumes = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/applications/shared-resumes/${logId}/`);
        setData(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Shared resumes not found or link has expired.');
      } finally {
        setLoading(false);
      }
    };
    if (logId) {
      fetchSharedResumes();
    }
  }, [logId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="workspace-loading-screen">
        <div className="workspace-spinner-wrapper">
          <div className="workspace-spinner"></div>
          <Sparkles className="workspace-spinner-sparkle" size={20} />
        </div>
        <p className="workspace-loading-text">Initializing Secure Candidate Workspace...</p>
        
        <style>{`
          .workspace-loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #060913;
            color: #ffffff;
            font-family: 'Outfit', 'Inter', sans-serif;
          }
          .workspace-spinner-wrapper {
            position: relative;
            margin-bottom: 24px;
          }
          .workspace-spinner {
            width: 64px;
            height: 64px;
            border: 4px solid rgba(59, 130, 246, 0.1);
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            animation: workspace-spin 1s linear infinite;
          }
          .workspace-spinner-sparkle {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #60a5fa;
            animation: workspace-pulse 1.5s ease-in-out infinite;
          }
          .workspace-loading-text {
            color: #94a3b8;
            font-weight: 600;
            font-size: 1.1rem;
            letter-spacing: 0.05em;
          }
          @keyframes workspace-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes workspace-pulse {
            0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.8); }
            50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workspace-error-screen">
        <div className="workspace-error-card">
          <div className="workspace-error-icon">✕</div>
          <h2 className="workspace-error-title">Link Expired or Invalid</h2>
          <p className="workspace-error-desc">{error}</p>
          <a href="/login" className="workspace-error-btn">Return to Portal Login</a>
        </div>
        
        <style>{`
          .workspace-error-screen {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #060913;
            padding: 24px;
            font-family: 'Outfit', 'Inter', sans-serif;
          }
          .workspace-error-card {
            max-width: 440px;
            width: 100%;
            background: #0f1526;
            border: 1px solid rgba(239, 68, 68, 0.2);
            padding: 40px;
            border-radius: 24px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          }
          .workspace-error-icon {
            width: 72px;
            height: 72px;
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            font-weight: bold;
            margin: 0 auto 24px;
          }
          .workspace-error-title {
            font-size: 1.6rem;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 12px;
            letter-spacing: -0.02em;
          }
          .workspace-error-desc {
            color: #94a3b8;
            font-size: 0.95rem;
            line-height: 1.6;
            margin-bottom: 32px;
          }
          .workspace-error-btn {
            display: block;
            width: 100%;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: #ffffff;
            font-weight: 700;
            text-decoration: none;
            padding: 14px 24px;
            border-radius: 14px;
            transition: all 0.3s;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
          }
          .workspace-error-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
          }
        `}</style>
      </div>
    );
  }

  const { job, applications, company_email, subject, sent_at, body } = data;

  const filteredApplications = applications.filter((app) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (app.student_name || '').toLowerCase().includes(term) ||
      (app.student_stream || '').toLowerCase().includes(term) ||
      (app.student_cgpa || '').toString().includes(term)
    );
  });

  return (
    <div className="workspace-container">
      {/* Dynamic Background Glows */}
      <div className="glow-1"></div>
      <div className="glow-2"></div>

      <div className="workspace-content">
        
        {/* Header Hero Section */}
        <header className="workspace-header">
          <div className="header-left">
            <div className="logo-badge">
              <img src={logo} alt="iLEAD Logo" className="logo-img" />
            </div>
            <div>
              <h1 className="portal-title">iLEAD Placement Portal</h1>
              <p className="portal-subtitle">Shared Resumes & Recruitment Workspace</p>
            </div>
          </div>
          
          <div className="header-badges">
            {(user?.role === 'admin' || user?.role === 'coordinator') && (
              <button onClick={handleCopyLink} className="btn-copy">
                {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                {copied ? 'Copied Share Link!' : 'Copy Share Link'}
              </button>
            )}
            <span className="badge-status">
              <CheckCircle size={14} /> Live Workspace
            </span>
            <span className="badge-date">
              <Calendar size={14} /> Shared: {new Date(sent_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </span>
          </div>
        </header>

        {/* Email Context & Info Panel */}
        {(user?.role === 'admin' || user?.role === 'coordinator') && (
          <div className="workspace-info-grid">
            <div className="info-left-panel">
              <h3 className="panel-title">
                <Mail className="panel-title-icon" size={20} />
                <span>Email Context</span>
              </h3>
              
              <div className="grid-two-cols">
                <div>
                  <p className="field-label">Recipient Partner</p>
                  <p className="field-value">{company_email}</p>
                </div>
                <div>
                  <p className="field-label">Log UUID</p>
                  <p className="field-value-mono">{logId}</p>
                </div>
              </div>

              <div>
                <p className="field-label">Subject Line</p>
                <p className="field-value-subject">{subject}</p>
              </div>
              
              <div>
                <p className="field-label">Message Description</p>
                <div className="body-block">
                  "{body}"
                </div>
              </div>
            </div>

            <div className="info-right-panel">
              <div className="right-panel-glow"></div>
              <div>
                <span className="badge-opportunity">Opportunity Detail</span>
                <h2 className="opp-header">
                  <Briefcase className="opp-icon" size={24} />
                  <div>
                    <div className="opp-role">{job.role}</div>
                    <div className="opp-company">{job.company_name}</div>
                  </div>
                </h2>
              </div>
              
              <div className="opp-footer">
                <span className="opp-footer-label">Total Candidates:</span>
                <span className="opp-footer-value">{applications.length} Profiles</span>
              </div>
            </div>
          </div>
        )}

        {/* Resumes List Table Panel */}
        <div className="workspace-table-panel">
          
          {/* Table Header Controls */}
          <div className="table-panel-header">
            <h3 className="table-title">
              <FileText className="table-title-icon" size={22} /> Candidate Profiles & Resumes
            </h3>
            
            <div className="search-wrapper">
              <input 
                type="text"
                placeholder="Search candidates, stream, cgpa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <Search className="search-icon" size={16} />
            </div>
          </div>

          {/* Candidates List Table */}
          <div className="table-responsive">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Department / Stream</th>
                  <th>Batch Year</th>
                  <th className="text-center">CGPA Score</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => {
                  const student = app.student_name;
                  const stream = app.student_stream || 'N/A';
                  const cgpa = app.student_cgpa || 'N/A';
                  
                  return (
                    <tr key={app.id}>
                      <td className="candidate-name">{student}</td>
                      <td className="candidate-stream">{stream}</td>
                      <td className="candidate-year">{app.job_snapshot?.year || 'Final Year'}</td>
                      <td className="text-center">
                        <span className="cgpa-badge">{cgpa}</span>
                      </td>
                      <td className="text-right">
                        {app.resume_url ? (
                          <div className="actions-wrapper">
                            <a 
                              href={app.resume_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-view"
                            >
                              <ExternalLink size={14} /> View
                            </a>
                            <a 
                              href={app.resume_url} 
                              download
                              className="btn-download"
                            >
                              <Download size={14} /> Download
                            </a>
                          </div>
                        ) : (
                          <span className="no-resume-badge">No resume uploaded</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredApplications.length === 0 && (
            <div className="empty-state">
              <Search size={40} className="empty-state-icon" />
              <span>No matching candidate profiles found.</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* Self-Contained Workspace CSS - Premium Carbon Matte & Solid Borders */
        .workspace-container {
          min-height: 100vh;
          background-color: #060913;
          color: #f8fafc;
          padding: 48px 24px;
          font-family: 'Outfit', 'Inter', sans-serif;
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
        }
        .workspace-container *, .workspace-container *::before, .workspace-container *::after {
          box-sizing: border-box;
        }
        .glow-1, .glow-2 {
          display: none !important;
        }
        .workspace-content {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }
        
        /* Header Hero - Solid Carbon Panel */
        .workspace-header {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          background: #0b0f19;
          border: 1px solid #1e293b;
          padding: 24px;
          border-radius: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          margin-bottom: 32px;
          gap: 24px;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .logo-badge {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%);
          padding: 12px;
          border-radius: 16px;
          border: 1px solid #1e293b;
          display: flex;
          align-items: center;
        }
        .logo-img {
          height: 48px;
          width: auto;
        }
        .portal-title {
          font-size: 1.8rem;
          font-weight: 900;
          margin: 0;
          background: linear-gradient(90deg, #60a5fa, #c084fc, #ffffff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .portal-subtitle {
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.85rem;
          margin: 4px 0 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .header-badges {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
        }
        .btn-copy {
          background: #1e293b;
          color: #f8fafc;
          border: 1px solid #334155;
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-copy:hover {
          background: #334155;
          border-color: #475569;
        }
        .text-green {
          color: #10b981;
        }
        .badge-status {
          background: rgba(16, 185, 129, 0.08);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.2);
          font-size: 0.75rem;
          padding: 10px 18px;
          border-radius: 12px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .badge-date {
          background: #1e293b;
          color: #cbd5e1;
          border: 1px solid rgba(51, 65, 85, 0.5);
          font-size: 0.75rem;
          padding: 10px 18px;
          border-radius: 12px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        /* Info Grid - Solid layout elements */
        .workspace-info-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 32px;
          margin-bottom: 32px;
        }
        .info-left-panel {
          background: #0b0f19;
          border: 1px solid #1e293b;
          padding: 32px;
          border-radius: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .panel-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          padding-bottom: 12px;
          border-bottom: 1px solid #1e293b;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .panel-title-icon {
          color: #3b82f6;
        }
        .grid-two-cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .field-label {
          font-size: 0.7rem;
          color: #64748b;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 0 0 6px 0;
        }
        .field-value {
          font-weight: 700;
          color: #e2e8f0;
          margin: 0;
          font-size: 0.95rem;
        }
        .field-value-mono {
          font-family: monospace;
          font-weight: 600;
          color: #94a3b8;
          margin: 0;
          font-size: 0.85rem;
          word-break: break-all;
        }
        .field-value-subject {
          font-weight: 800;
          color: #f1f5f9;
          margin: 0;
          font-size: 1.1rem;
        }
        .body-block {
          background: #060913;
          border: 1px solid #1e293b;
          padding: 16px;
          border-radius: 16px;
          color: #cbd5e1;
          font-size: 0.9rem;
          line-height: 1.6;
          font-style: italic;
          white-space: pre-line;
        }
        
        /* Premium Opportunity Detail Card - Clean Borders, No Fuzz */
        .info-right-panel {
          background: #0b0f19;
          border: 1px solid #1e293b;
          border-left: 4px solid #3b82f6; /* Clean premium left boundary */
          padding: 32px;
          border-radius: 24px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }
        .right-panel-glow {
          display: none !important;
        }
        .badge-opportunity {
          background: rgba(59, 130, 246, 0.08);
          color: #93c5fd;
          border: 1px solid rgba(59, 130, 246, 0.15);
          font-size: 0.7rem;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: inline-block;
        }
        .opp-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin: 24px 0 0 0;
        }
        .opp-icon {
          color: #60a5fa;
          margin-top: 4px;
          flex-shrink: 0;
        }
        .opp-role {
          font-size: 1.5rem;
          font-weight: 900;
          color: #ffffff;
          line-height: 1.2;
        }
        .opp-company {
          font-size: 0.95rem;
          font-weight: 700;
          color: #94a3b8;
          margin-top: 4px;
        }
        .opp-footer {
          border-top: 1px solid #1e293b;
          padding-top: 24px;
          margin-top: 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .opp-footer-label {
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .opp-footer-value {
          font-size: 1.4rem;
          font-weight: 900;
          color: #60a5fa;
        }
        
        /* Table Panel - Solid Charcoal Panel */
        .workspace-table-panel {
          background: #0b0f19;
          border: 1px solid #1e293b;
          border-radius: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }
        .table-panel-header {
          padding: 24px 32px;
          border-bottom: 1px solid #1e293b;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }
        .table-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .table-title-icon {
          color: #3b82f6;
        }
        .search-wrapper {
          position: relative;
          width: 320px;
        }
        .search-input {
          width: 100%;
          background: #060913;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 10px 16px 10px 40px;
          font-size: 0.85rem;
          color: #ffffff;
          outline: none;
          transition: border-color 0.2s;
        }
        .search-input:focus {
          border-color: #3b82f6;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
        }
        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }
        .workspace-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .workspace-table th {
          background: #060913;
          border-bottom: 1px solid #1e293b;
          padding: 20px 32px;
          font-size: 0.7rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .workspace-table td {
          padding: 20px 32px;
          border-bottom: 1px solid #1e293b;
          font-size: 0.95rem;
          vertical-align: middle;
        }
        .workspace-table tr:last-child td {
          border-bottom: none;
        }
        .workspace-table tbody tr {
          transition: background-color 0.15s;
        }
        .workspace-table tbody tr:hover {
          background: rgba(30, 41, 59, 0.3);
        }
        .candidate-name {
          font-weight: 750;
          color: #ffffff;
        }
        .candidate-stream {
          color: #cbd5e1;
          font-weight: 500;
        }
        .candidate-year {
          color: #94a3b8;
          font-weight: 600;
        }
        .cgpa-badge {
          background: #060913;
          color: #60a5fa;
          border: 1px solid #1e293b;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 800;
          font-size: 0.85rem;
          display: inline-block;
        }
        .actions-wrapper {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .btn-view {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.2);
          padding: 10px 16px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          transition: all 0.2s;
        }
        .btn-view:hover {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
        }
        .btn-download {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 10px 16px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
        }
        .btn-download:hover {
          background: #1d4ed8;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
        }
        .no-resume-badge {
          background: rgba(245, 158, 11, 0.08);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.15);
          font-size: 0.75rem;
          padding: 6px 12px;
          border-radius: 10px;
          font-weight: 700;
        }
        
        .empty-state {
          padding: 64px 32px;
          text-align: center;
          color: #64748b;
          font-weight: 600;
          font-size: 1.1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .empty-state-icon {
          color: #334155;
        }
        
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        
        /* Responsive adjustments */
        @media (max-width: 992px) {
          .workspace-info-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .workspace-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .header-badges {
            width: 100%;
          }
          .table-panel-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .search-wrapper {
            width: 100%;
          }
          .workspace-table th, .workspace-table td {
            padding: 16px 20px;
          }
        }
      `}</style>
    </div>
  );
}
