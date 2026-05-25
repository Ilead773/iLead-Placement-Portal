// src/pages/student/Resumes.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Upload, 
  FileText, 
  Download, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Layout,
  History,
  Star
} from 'lucide-react';
import OnScreenResumeEditor from '../../components/OnScreenResumeEditor';
import ConfirmModal from '../../components/ConfirmModal';

export default function StudentResumes() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileWarning, setProfileWarning] = useState("");
  
  // Edit State
  const [editingResumeId, setEditingResumeId] = useState(null);
  const [editHtml, setEditHtml] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const iframeRef = React.useRef(null);

  // Confirmation Modal State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmType, setConfirmType] = useState('danger');
  const [onConfirmAction, setOnConfirmAction] = useState(null);

  const triggerConfirm = (title, message, action, type = 'danger') => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setOnConfirmAction(() => action);
    setConfirmType(type);
    setConfirmOpen(true);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Poll if there are processing resumes
    const pollInterval = setInterval(() => {
      const hasProcessing = resumes.some(r => r.state === 'processing' || r.state === 'parsing' || r.state === 'draft' || r.state === 'pending');
      if (hasProcessing) {
        fetchResumes();
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [resumes]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resumesRes, templatesRes, uploadsRes] = await Promise.all([
        api.get(`resumes/?t=${Date.now()}`),
        api.get('templates/'),
        api.get(`resumes/uploads/?t=${Date.now()}`)
      ]);
      
      const builtResumes = Array.isArray(resumesRes.data) ? resumesRes.data : (resumesRes.data.results || []);
      const uploadedResumes = Array.isArray(uploadsRes.data) ? uploadsRes.data : (uploadsRes.data.results || []);
      
      // Merge and tag for UI
      const allResumes = [
        ...builtResumes.map(r => ({ ...r, type: 'built' })),
        ...uploadedResumes.map(u => ({ 
          id: u.id, 
          title: u.original_filename, 
          template_name: 'Original Upload',
          state: u.status,
          created_at: u.uploaded_at,
          type: 'upload',
          pdf_url: u.file, // The serializer should provide the file URL
          is_primary: u.is_primary
        }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setResumes(allResumes);
      setTemplates(Array.isArray(templatesRes.data) ? templatesRes.data : (templatesRes.data.results || []));

      // Check profile status (simulate profile check or use context if available)
      try {
        const profileRes = await api.get('profiles/me/');
        if (!profileRes.data.phone || !profileRes.data.location) {
          setProfileWarning("Your profile is missing contact details. Generating a resume without them may look incomplete.");
        }
      } catch (e) {
        // Ignore if profile check fails, or they don't have one yet
      }

    } catch (err) {
      toast.error('Failed to load resume data');
    } finally {
      setLoading(false);
    }
  };

  const fetchResumes = async () => {
    try {
      const [resumesRes, uploadsRes] = await Promise.all([
        api.get('resumes/'),
        api.get('resumes/uploads/')
      ]);
      
      const builtResumes = Array.isArray(resumesRes.data) ? resumesRes.data : (resumesRes.data.results || []);
      const uploadedResumes = Array.isArray(uploadsRes.data) ? uploadsRes.data : (uploadsRes.data.results || []);
      
      const allResumes = [
        ...builtResumes.map(r => ({ ...r, type: 'built' })),
        ...uploadedResumes.map(u => ({ 
          id: u.id, 
          title: u.original_filename, 
          template_name: 'Original Upload',
          state: u.status,
          created_at: u.uploaded_at,
          type: 'upload',
          pdf_url: u.file,
          is_primary: u.is_primary
        }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setResumes(allResumes);
    } catch (err) {
      console.error('Polling failed');
    }
  };

  const handleGenerate = async (templateId) => {
    try {
      setIsGenerating(true);
      await api.post('resumes/generate/', {
        template_id: templateId,
        title: `Resume - ${new Date().toLocaleDateString()}`
      });
      toast.success('Generation started! Please wait...');
      fetchResumes();
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error('Rate limit exceeded. Please wait a few minutes before generating more resumes.');
      } else {
        toast.error(err.response?.data?.error || 'Failed to start generation');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      await api.post('resumes/uploads/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Resume uploaded! Parsing in progress...');
      fetchResumes();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const handleSetPrimary = async (resumeId, type = 'built') => {
    try {
      if (type === 'upload') {
        await api.post(`resumes/uploads/${resumeId}/set-primary/`);
      } else {
        await api.post(`resumes/${resumeId}/set-primary/`);
      }
      toast.success('Resume set as active for job applications!');
      fetchResumes();
    } catch (err) {
      toast.error('Failed to set active resume');
    }
  };

  const handleDelete = (resumeId, type = 'built') => {
    triggerConfirm(
      'Delete Resume',
      'Are you sure you want to delete this resume? This action is irreversible and will permanently remove this resume from your profile.',
      async () => {
        try {
          if (type === 'upload') {
            await api.delete(`resumes/uploads/${resumeId}/`);
          } else {
            await api.delete(`resumes/${resumeId}/`);
          }
          toast.success('Resume deleted successfully');
          fetchResumes();
        } catch (err) {
          toast.error('Failed to delete resume');
        }
      },
      'danger'
    );
  };

  const handleDownload = async (resumeId, resumeTitle, type = 'built') => {
    try {
      toast.loading('Downloading...', { id: 'download' });
      const endpoint = type === 'upload' ? `resumes/uploads/${resumeId}/download/` : `resumes/${resumeId}/download/`;
      const response = await api.get(`${endpoint}?t=${Date.now()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${resumeTitle}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Downloaded!', { id: 'download' });
    } catch (err) {
      toast.error('Download failed', { id: 'download' });
      console.error(err);
    }
  };

  const handleEditClick = async (resumeId) => {
    try {
      const res = await api.get(`resumes/${resumeId}/html/`);
      setEditHtml(res.data.html || "");
      setEditingResumeId(resumeId);
      setUnsavedChanges(false);
    } catch (err) {
      toast.error('Failed to load resume details for editing');
    }
  };

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);
      if (!iframeRef.current || !iframeRef.current.contentDocument) {
        throw new Error("Cannot access editor content.");
      }
      
      const modifiedHtml = iframeRef.current.contentDocument.body.innerHTML;
      console.log("DEBUG: Saving resume", editingResumeId, "HTML length:", modifiedHtml.length);
      console.log("DEBUG: HTML Preview:", modifiedHtml.substring(0, 100));
      
      await api.put(`resumes/${editingResumeId}/`, { custom_html: modifiedHtml });
      toast.success('Resume updated! Generating new PDF...');
      setEditingResumeId(null);
      setUnsavedChanges(false);
      fetchResumes();
    } catch (err) {
      if (err.response?.status === 413) {
        toast.error('The resume content is too large to save (Max 2MB). Please remove large images.');
      } else {
        toast.error(err.response?.data?.error || err.message || 'Failed to save changes');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const attemptCloseModal = () => {
    if (unsavedChanges) {
      triggerConfirm(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to discard them? Any unsaved edits will be lost.',
        () => {
          setEditingResumeId(null);
        },
        'warning'
      );
    } else {
      setEditingResumeId(null);
    }
  };

  const getStatusBadge = (state) => {
    const states = {
      'generated': 'status-generated',
      'parsed': 'status-generated',
      'processing': 'status-processing',
      'parsing': 'status-processing',
      'failed': 'badge-danger',
    };
    return <span className={`status-badge ${states[state] || 'badge-neutral'}`}>{state}</span>;
  };

  if (loading) return <div className="loading-state flex justify-center p-12">Loading Resume Engine...</div>;

  return (
    <>
    <div className="resumes-container compact-layout p-4 md:p-6 animate-in">
      
      {profileWarning && (
        <div className="mb-6 p-4 bg-warning/10 border border-warning/30 text-warning-content rounded-lg flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <h4 className="font-bold">Missing Profile Data</h4>
            <p className="text-sm">{profileWarning}</p>
          </div>
        </div>
      )}

      <div className="dash-page animate-in">
        <header className="page-header mb-8">
          <div>
            <h1 className="text-3xl font-black mb-1 tracking-tight">Resume Engine</h1>
            <p className="text-secondary text-sm">Generate professional, high-fidelity resumes synced directly from your profile data.</p>
          </div>
        </header>

        {/* Templates Gallery */}
        <section className="mb-12">
          <div className="section-label label-caps">
            <Layout size={14} className="text-orange-500" /> Available Templates
          </div>
          <div className="template-grid">
            {templates.map((tpl) => (
              <div key={tpl.id} className="template-card">
                <div className="template-preview">
                   <div className="template-mock-line accent" style={{ height: '8px' }}></div>
                   <div className="template-mock-line short" style={{ height: '6px' }}></div>
                   <div className="flex gap-2 mt-4">
                      <div className="template-mock-circle"></div>
                      <div className="template-mock-line accent"></div>
                   </div>
                   <div className="template-mock-line"></div>
                   <div className="template-mock-line"></div>
                   
                   <div className="template-overlay">
                      <button 
                        onClick={() => handleGenerate(tpl.id)}
                        disabled={isGenerating}
                        className="btn btn-primary"
                        style={{ background: 'white', color: '#ea580c', border: 'none', padding: '12px 24px' }}
                      >
                        {isGenerating ? 'Generating...' : 'Use This Template'}
                      </button>
                   </div>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-sm">{tpl.name}</h4>
                    <span className="label-caps" style={{ fontSize: '9px' }}>v{tpl.version}</span>
                  </div>
                  <p className="text-xs text-secondary font-light line-clamp-2">{tpl.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* My Resumes List */}
        <section>
          <div className="section-label label-caps">
            <History size={14} className="text-orange-500" /> Document History
          </div>

          <div className="upload-bar">
            <div className="flex items-center gap-3">
              <Upload size={18} className="text-orange-500" />
              <div>
                <div className="text-xs font-black uppercase tracking-wider">External Resume?</div>
                <div className="text-[10px] text-muted">Upload a PDF to parse and import your data</div>
              </div>
            </div>
            <label className={`btn btn-secondary btn-sm flex items-center gap-2 cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
               {uploading ? 'Uploading...' : 'Choose PDF'}
               <input type="file" className="hidden" accept=".pdf" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Resume Details</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resumes?.length > 0 ? resumes.map(resume => (
                  <tr key={resume.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                          <FileText size={18} className="text-orange-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{resume.title}</span>
                            {resume.is_primary && (
                              <span className="status-badge status-generated" style={{ fontSize: '8px', padding: '2px 8px' }}>
                                <Star size={8} fill="currentColor" /> Active
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] font-bold text-muted uppercase tracking-wider">{resume.template_name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(resume.state)}
                    </td>
                    <td className="text-[11px] font-semibold text-secondary">
                      {new Date(resume.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        {(resume.state === 'generated' || resume.state === 'parsed') && (
                          <>
                            {!resume.is_primary && (
                              <button 
                                onClick={() => handleSetPrimary(resume.id, resume.type)} 
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '10px' }}
                              >
                                Set Active
                              </button>
                            )}
                            <button 
                              onClick={() => handleDownload(resume.id, resume.title, resume.type)} 
                              className="btn btn-sm btn-secondary"
                              title="Download PDF"
                            >
                              <Download size={14} />
                            </button>
                            {resume.type === 'built' && (
                              <button 
                                onClick={() => handleEditClick(resume.id)}
                                className="btn btn-sm btn-primary"
                                style={{ fontSize: '10px' }}
                              >
                                Edit
                              </button>
                            )}
                          </>
                        )}
                        <button 
                          onClick={() => handleDelete(resume.id, resume.type)}
                          className="btn btn-sm btn-danger p-2"
                          title="Delete Resume"
                        >
                           <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="py-16 text-center text-muted italic text-sm">
                       No resumes found. Generate one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

          {/* Tips Section (Layer 12 & 14) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="info-card bg-primary/5 border border-primary/20 p-4 rounded-xl">
              <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                <span>⭐</span> Pro Tip: Multi-Variant support
              </h4>
              <p className="text-xs text-muted leading-relaxed">
                You can create different versions of your resume for different roles (e.g. Frontend vs Backend). 
                Employers will always see your "Primary" resume by default.
              </p>
            </div>
            <div className="info-card bg-info/5 border border-info/20 p-4 rounded-xl">
              <h4 className="text-sm font-bold text-info mb-2 flex items-center gap-2">
                <span>⏱️</span> Rate Limiting
              </h4>
              <p className="text-xs text-muted leading-relaxed">
                Resume generation is a high-power operation. To ensure system stability, we limit 
                generations to 10 per hour. Need more? Contact your coordinator.
              </p>
            </div>
          </div>
      </div>
    </div>

    {/* Edit Resume Modal */}
      {editingResumeId && (
        <div className="editor-modal-overlay">
          <div className="editor-modal-container">
            
            {/* Header */}
            <div className="editor-modal-header">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-soft rounded-lg text-accent-primary">
                  <Edit size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold m-0 flex items-center gap-3">
                    Edit Resume Content
                    {isSaving && <span className="text-xs text-accent-primary font-bold animate-pulse bg-accent-soft px-2 py-1 rounded">Saving Changes...</span>}
                  </h2>
                  <p className="text-xs text-muted">Direct visual editing of your generated document</p>
                </div>
              </div>
              <button 
                onClick={attemptCloseModal}
                className="text-text-muted hover:text-text-primary transition-colors text-3xl font-light leading-none"
              >
                &times;
              </button>
            </div>
            
            {/* Editor Body */}
            <div className="editor-modal-body">
              <div className="editor-paper-container">
                <iframe 
                  ref={iframeRef}
                  srcDoc={editHtml}
                  style={{ 
                    width: '100%', 
                    height: '1122px', 
                    border: 'none', 
                    backgroundColor: 'white'
                  }}
                  onLoad={(e) => {
                    try {
                      const doc = e.target.contentDocument;
                      doc.designMode = 'on';
                      
                      // Add Editor Styles
                      const style = doc.createElement('style');
                      style.innerHTML = `
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
                        body { 
                          cursor: text; 
                          padding: 60px 80px !important; 
                          margin: 0 !important; 
                          background: white !important; 
                          font-family: 'Inter', sans-serif !important;
                          line-height: 1.5;
                        }
                        *:hover { outline: 1px dashed rgba(249, 115, 22, 0.3); outline-offset: 4px; }
                        * { transition: outline 0.1s; }
                        [contenteditable]:empty::before { content: 'Empty element...'; color: #ccc; }
                      `;
                      doc.head.appendChild(style);

                      // Attach Ctrl+S and input listeners
                      doc.addEventListener('keydown', (ev) => {
                        if ((ev.ctrlKey || ev.metaKey) && ev.key === 's') {
                          ev.preventDefault();
                          handleSaveEdit();
                        }
                      });

                      const markDirty = () => {
                        setUnsavedChanges(true);
                      };
                      doc.addEventListener('input', markDirty);
                      doc.addEventListener('keyup', markDirty);
                      doc.addEventListener('paste', markDirty);
                      doc.addEventListener('blur', markDirty);

                    } catch (err) {
                      console.error("Iframe access error", err);
                    }
                  }}
                  title="Resume Editor"
                />
              </div>
            </div>
            
            {/* Footer */}
            <div className="editor-modal-footer">
              <button 
                onClick={attemptCloseModal}
                className="btn btn-secondary px-8"
                disabled={isSaving}
              >
                Close
              </button>
              <button 
                onClick={handleSaveEdit}
                className="btn btn-primary px-10"
                disabled={isSaving}
              >
                {isSaving ? 'Processing...' : '✨ Save & Regenerate PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        type={confirmType}
        onConfirm={() => {
          if (onConfirmAction) onConfirmAction();
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
