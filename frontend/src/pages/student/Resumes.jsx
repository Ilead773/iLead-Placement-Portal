// src/pages/student/Resumes.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
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
import ResumeGeneratingOverlay from '../../components/ResumeGeneratingOverlay';

export default function StudentResumes() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [profileWarning, setProfileWarning] = useState("");
  const [profileScore, setProfileScore] = useState(1.0);
  
  // Edit State
  const [editingResumeId, setEditingResumeId] = useState(null);
  const [editHtml, setEditHtml] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const iframeRef = React.useRef(null);

  // Title Edit State
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [editTitleVal, setEditTitleVal] = useState("");

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
      const [resumesRes, templatesRes] = await Promise.all([
        api.get(`resumes/?t=${Date.now()}`),
        api.get('templates/'),
      ]);
      
      const builtResumes = Array.isArray(resumesRes.data) ? resumesRes.data : (resumesRes.data.results || []);
      
      // Merge and tag for UI
      const allResumes = builtResumes.map(r => ({ ...r, type: 'built' }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setResumes(allResumes);
      setTemplates(Array.isArray(templatesRes.data) ? templatesRes.data : (templatesRes.data.results || []));

      // Check profile status (simulate profile check or use context if available)
      try {
        const profileRes = await api.get('profiles/me/');
        const score = profileRes.data.completion_score ?? 0;
        setProfileScore(score);
        if (score < 0.50) {
          setProfileWarning(`Your profile completion is at ${Math.round(score * 100)}%. You must reach at least 50% completion before you can create or generate a resume.`);
        } else if (!profileRes.data.phone || !profileRes.data.location) {
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
      const resumesRes = await api.get('resumes/');
      const builtResumes = Array.isArray(resumesRes.data) ? resumesRes.data : (resumesRes.data.results || []);
      
      const allResumes = builtResumes.map(r => ({ ...r, type: 'built' }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
        const retryAfter = err.response?.data?.retry_after;
        const detail    = err.response?.data?.detail;
        toast.error(
          detail ||
          `Limit reached — you can generate 3 resumes per hour.${ retryAfter ? ` Try again in ${retryAfter}.` : '' }`,
          { duration: 6000 }
        );
      } else {
        toast.error(err.response?.data?.error || 'Failed to start generation');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSetPrimary = async (resumeId) => {
    try {
      await api.post(`resumes/${resumeId}/set-primary/`);
      toast.success('Resume set as active for job applications!');
      fetchResumes();
    } catch (err) {
      toast.error('Failed to set active resume');
    }
  };

  const handleDelete = (resumeId) => {
    triggerConfirm(
      'Delete Resume',
      'Are you sure you want to delete this resume? This action is irreversible and will permanently remove this resume from your profile.',
      async () => {
        try {
          await api.delete(`resumes/${resumeId}/`);
          toast.success('Resume deleted successfully');
          fetchResumes();
        } catch (err) {
          toast.error('Failed to delete resume');
        }
      },
      'danger'
    );
  };

  const handleDownload = async (resumeId, resumeTitle) => {
    try {
      toast.loading('Downloading...', { id: 'download' });
      const endpoint = `resumes/${resumeId}/download/`;
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

  const handleSaveTitle = async (resumeId) => {
    if (!editTitleVal.trim()) {
      toast.error('Resume name cannot be empty');
      return;
    }
    try {
      await api.patch(`resumes/${resumeId}/`, { title: editTitleVal.trim() });
      toast.success('Resume name updated successfully!');
      setEditingTitleId(null);
      fetchResumes();
    } catch (err) {
      toast.error(err.response?.data?.title?.[0] || err.response?.data?.error || 'Failed to update resume name');
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

  const hasProcessing = resumes.some(r => ['processing', 'parsing', 'draft', 'pending'].includes(r.state));

  if (loading) return <div className="loading-state flex justify-center p-12">Loading Resume Engine...</div>;

  return (
    <>
    {/* Creative overlay shown while resume is processing */}
    <ResumeGeneratingOverlay visible={isGenerating || hasProcessing} />
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
                <div className="template-preview" style={{ padding: '16px', background: 'white', position: 'relative', overflow: 'hidden' }}>

                  {/* ── Classic Professional Preview ── */}
                  {(tpl.name === 'Classic Professional') && (
                    <div style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '182%', height: '182%', fontFamily: 'serif', color: '#1e293b', lineHeight: 1.4 }}>
                      <div style={{ textAlign: 'center', borderBottom: '1.5px solid #1e293b', paddingBottom: '8px', marginBottom: '10px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>JOHN SMITH</div>
                        <div style={{ fontSize: '8px', color: '#64748b', display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '4px' }}>
                          <span>john@email.com</span><span>|</span><span>+91 9876543210</span><span>|</span><span>Kolkata, India</span>
                        </div>
                        <div style={{ fontSize: '7px', color: '#94a3b8', marginTop: '2px' }}>LinkedIn • GitHub • Portfolio</div>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1e293b', paddingBottom: '2px', marginBottom: '5px' }}>Professional Summary</div>
                        <div style={{ fontSize: '7px', color: '#334155' }}>Detail-oriented BCA student with strong fundamentals in Python, Django, and React. Passionate about building real-world applications.</div>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1e293b', paddingBottom: '2px', marginBottom: '5px' }}>Education</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '8px', fontWeight: 700 }}>iLEAD Institute</span>
                          <span style={{ fontSize: '7px', color: '#64748b' }}>Grad: 2026</span>
                        </div>
                        <div style={{ fontSize: '7px', color: '#475569' }}>Bachelor of Computer Applications</div>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1e293b', paddingBottom: '2px', marginBottom: '5px' }}>Technical Skills</div>
                        <div style={{ fontSize: '7px' }}><strong>Technical:</strong> Python, Django, React, PostgreSQL</div>
                        <div style={{ fontSize: '7px', marginTop: '2px' }}><strong>Tools:</strong> Git, Docker, VS Code</div>
                      </div>
                    </div>
                  )}

                  {/* ── Modern Clean Preview ── */}
                  {(tpl.name === 'Modern Clean') && (
                    <div style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '182%', height: '182%', fontFamily: 'Inter, sans-serif', color: '#1e293b', lineHeight: 1.4 }}>
                      <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: '10px', marginBottom: '10px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.5px' }}>John Smith</div>
                        <div style={{ fontSize: '8px', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
                          <span>📧 john@email.com</span><span>📱 +91 9876543210</span><span>📍 Kolkata</span>
                        </div>
                        <div style={{ fontSize: '7px', color: '#64748b', marginTop: '3px' }}>🔗 LinkedIn &nbsp;&nbsp; 💻 GitHub</div>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', marginBottom: '5px' }}>Professional Summary</div>
                        <div style={{ fontSize: '7px', color: '#334155' }}>Detail-oriented BCA student with strong fundamentals in Python, Django, and React. Passionate about building real-world applications.</div>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', marginBottom: '5px' }}>Skills & Capabilities</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {['Python','Django','React','PostgreSQL','Git'].map(s => (
                            <span key={s} style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '2px 6px', borderRadius: '3px', fontSize: '7px', fontWeight: 600 }}>{s}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', marginBottom: '5px' }}>Education</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '8px', fontWeight: 700 }}>iLEAD Institute</span>
                          <span style={{ fontSize: '7px', color: '#64748b' }}>Grad: 2026</span>
                        </div>
                        <div style={{ fontSize: '7px', color: '#475569' }}>Bachelor of Computer Applications</div>
                      </div>
                    </div>
                  )}

                  {/* ── Modern Professional Preview (Sidebar layout) ── */}
                  {(tpl.name === 'Modern Professional') && (
                    <div style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '182%', height: '182%', fontFamily: 'Inter, sans-serif', color: '#1e293b', lineHeight: 1.4 }}>
                      <div style={{ background: '#1e3a8a', color: 'white', padding: '10px 14px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.5px' }}>John Smith</div>
                        <div style={{ fontSize: '7.5px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '2px' }}>Software Engineer</div>
                      </div>
                      <div style={{ display: 'flex', minHeight: '130px' }}>
                        <div style={{ width: '72px', background: '#f8fafc', padding: '8px', borderRight: '1px solid #cbd5e1', flexShrink: 0 }}>
                          <div style={{ fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', color: '#1e3a8a', borderBottom: '1px solid #cbd5e1', paddingBottom: '2px', marginBottom: '5px' }}>Contact</div>
                          <div style={{ fontSize: '6.5px', color: '#334155', marginBottom: '3px' }}>john@email.com</div>
                          <div style={{ fontSize: '6.5px', color: '#334155', marginBottom: '3px' }}>+91 9876543210</div>
                          <div style={{ fontSize: '6.5px', color: '#334155', marginBottom: '8px' }}>Kolkata, India</div>
                          <div style={{ fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', color: '#1e3a8a', borderBottom: '1px solid #cbd5e1', paddingBottom: '2px', marginBottom: '5px' }}>Skills</div>
                          {['Python','Django','React','PostgreSQL'].map(s => (
                            <div key={s} style={{ fontSize: '6.5px', color: '#334155' }}>{s}</div>
                          ))}
                        </div>
                        <div style={{ flex: 1, padding: '8px 10px' }}>
                          <div style={{ fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', color: '#1e3a8a', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '2px', marginBottom: '5px' }}>Profile Summary</div>
                          <div style={{ fontSize: '6.5px', color: '#334155', marginBottom: '8px' }}>Detail-oriented BCA student passionate about building real-world applications and delivering impact.</div>
                          <div style={{ fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', color: '#1e3a8a', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '2px', marginBottom: '5px' }}>Experience</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '7px', fontWeight: 700 }}>Software Intern</span>
                            <span style={{ fontSize: '6.5px', color: '#64748b' }}>Jan — May 2026</span>
                          </div>
                          <div style={{ fontSize: '6.5px', color: '#475569' }}>Tech Corp Ltd.</div>
                          <div style={{ fontSize: '6.5px', color: '#334155', marginTop: '2px' }}>Built REST APIs with Django REST Framework and PostgreSQL integration.</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback for any other template */}
                  {(tpl.name !== 'Classic Professional' && tpl.name !== 'Modern Clean' && tpl.name !== 'Modern Professional') && (
                    <div style={{ padding: '8px' }}>
                      <div className="template-mock-line accent" style={{ height: '8px' }}></div>
                      <div className="template-mock-line short" style={{ height: '6px', marginTop: '6px' }}></div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <div className="template-mock-circle"></div>
                        <div className="template-mock-line accent"></div>
                      </div>
                      <div className="template-mock-line" style={{ marginTop: '6px' }}></div>
                      <div className="template-mock-line" style={{ marginTop: '4px' }}></div>
                    </div>
                  )}

                  <div className="template-overlay">
                     <button
                       onClick={() => handleGenerate(tpl.id)}
                       disabled={isGenerating || hasProcessing || profileScore < 0.50}
                       className="btn btn-primary"
                       style={{ 
                         background: (profileScore < 0.50) ? '#e2e8f0' : (isGenerating || hasProcessing) ? '#f1f5f9' : 'white', 
                         color: (profileScore < 0.50) ? '#94a3b8' : (isGenerating || hasProcessing) ? '#94a3b8' : '#ea580c', 
                         border: 'none', 
                         padding: '12px 24px',
                         cursor: (profileScore < 0.50 || isGenerating || hasProcessing) ? 'not-allowed' : 'pointer'
                       }}
                     >
                       {isGenerating || hasProcessing ? 'Generating...' : (profileScore < 0.50) ? 'Profile Incomplete' : 'Use This Template'}
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
                          {editingTitleId === resume.id ? (
                            <div className="flex items-center gap-2 mt-1">
                              <input 
                                type="text" 
                                value={editTitleVal} 
                                onChange={(e) => setEditTitleVal(e.target.value)} 
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveTitle(resume.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingTitleId(null);
                                  }
                                }}
                                className="input-field"
                                style={{ 
                                  padding: '4px 8px', 
                                  fontSize: '13px', 
                                  width: '200px', 
                                  height: '32px',
                                  borderRadius: 'var(--radius-sm)'
                                }}
                                autoFocus
                              />
                              <button 
                                onClick={() => handleSaveTitle(resume.id)} 
                                className="btn btn-sm btn-primary px-3 py-1"
                                style={{ height: '32px', fontSize: '12px' }}
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => setEditingTitleId(null)} 
                                className="btn btn-sm btn-secondary px-3 py-1"
                                style={{ height: '32px', fontSize: '12px' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{resume.title}</span>
                              <button 
                                onClick={() => {
                                  setEditingTitleId(resume.id);
                                  setEditTitleVal(resume.title);
                                }}
                                className="text-gray-400 hover:text-orange-500 transition-colors p-1"
                                title="Edit Resume Name"
                              >
                                <Edit size={12} />
                              </button>
                              {resume.is_primary && (
                                <span className="status-badge status-generated" style={{ fontSize: '8px', padding: '2px 8px' }}>
                                  <Star size={8} fill="currentColor" /> Active
                                </span>
                              )}
                            </div>
                          )}
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
                                onClick={() => handleSetPrimary(resume.id)} 
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '10px' }}
                              >
                                Set Active
                              </button>
                            )}
                            <button 
                              onClick={() => handleDownload(resume.id, resume.title)} 
                              className="btn btn-sm btn-secondary"
                              title="Download PDF"
                            >
                              <Download size={14} />
                            </button>
                            <button 
                              onClick={() => handleEditClick(resume.id)}
                              className="btn btn-sm btn-primary"
                              style={{ fontSize: '10px' }}
                            >
                              Edit
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => handleDelete(resume.id)}
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
                generations to <strong>3 per hour</strong>. Need more? Contact your coordinator.
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
