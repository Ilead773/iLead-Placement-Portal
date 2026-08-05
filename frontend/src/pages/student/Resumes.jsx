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
  Star,
  ChevronRight
} from 'lucide-react';
import OnScreenResumeEditor from '../../components/OnScreenResumeEditor';
import ConfirmModal from '../../components/ConfirmModal';
import ResumeGeneratingOverlay from '../../components/ResumeGeneratingOverlay';

export default function StudentResumes() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeResumeTab, setActiveResumeTab] = useState('templates');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  const [activeMenuId, setActiveMenuId] = useState(null);

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
      let errorMsg = 'Download failed';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          errorMsg = parsed.detail || parsed.error || errorMsg;
        } catch (e) {
          // ignore parsing error
        }
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      }
      toast.error(errorMsg, { id: 'download', duration: 6000 });
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
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                📋 Profile completeness required: <strong className="text-slate-800 dark:text-slate-200">50%</strong> (Current: <strong className={profileScore >= 0.50 ? "text-success" : "text-warning"}>{Math.round(profileScore * 100)}%</strong>)
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                ⏱️ Generation limit: <strong className="text-slate-800 dark:text-slate-200">3 / hour</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                📥 Download limit: <strong className="text-slate-800 dark:text-slate-200">3 / hour</strong>
              </span>
            </div>
          </div>
        </header>

        {isMobile ? (
          <div className="space-y-6">
            {/* Create New Resume Card */}
            <div className="card p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-border-color shadow-sm">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-border-color">
                <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                  <FileText size={18} className="text-blue-500" /> Create New Resume
                </h3>
                <ChevronRight size={16} className="text-muted" />
              </div>

              {/* Template Card Details */}
              {templates?.length > 0 ? (
                <div className="flex items-start gap-4">
                  {/* Left side: Template image preview */}
                  <div className="w-20 h-28 border border-border-color rounded-xl overflow-hidden shadow-sm shrink-0 bg-slate-50 dark:bg-zinc-800 p-1 flex items-center justify-center">
                    {/* Simplified preview mockup */}
                    <div className="w-full h-full p-2 space-y-1.5 bg-white dark:bg-zinc-950 rounded-lg">
                      <div className="w-2/3 h-1.5 bg-blue-500/20 rounded"></div>
                      <div className="w-1/2 h-1 bg-slate-200 dark:bg-zinc-850 rounded"></div>
                      <div className="pt-2.5 w-full h-1 bg-slate-100 dark:bg-zinc-900 rounded"></div>
                      <div className="w-3/4 h-1 bg-slate-100 dark:bg-zinc-900 rounded"></div>
                      <div className="w-5/6 h-1 bg-slate-100 dark:bg-zinc-900 rounded"></div>
                    </div>
                  </div>

                  {/* Right side: details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-black text-primary leading-none">{templates[0].name}</h4>
                      <span className="text-[8px] bg-blue-500/10 text-blue-500 font-bold px-1.5 py-0.5 rounded">V{templates[0].version}</span>
                    </div>
                    
                    <p className="text-[10px] text-muted mt-2 leading-relaxed line-clamp-3">
                      {templates[0].description}
                    </p>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      <span className="text-[8px] font-bold text-emerald-600 bg-emerald-500/5 border border-emerald-500/15 px-2 py-0.5 rounded-full">
                        ✓ ATS Friendly
                      </span>
                      <span className="text-[8px] font-bold text-purple-600 bg-purple-500/5 border border-purple-500/15 px-2 py-0.5 rounded-full">
                        ⌨ Professional
                      </span>
                      <span className="text-[8px] font-bold text-amber-600 bg-emerald-500/5 border border-emerald-500/15 px-2 py-0.5 rounded-full">
                        💡 iLEAD Approved
                      </span>
                    </div>

                    {/* Choose & Generate Button */}
                    <button 
                      onClick={() => handleGenerate(templates[0].id)}
                      disabled={isGenerating}
                      className="btn btn-primary w-full mt-4 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold rounded-xl cursor-pointer"
                    >
                      {isGenerating ? 'Generating...' : 'Choose Template & Generate →'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-muted italic text-xs">
                  No templates available.
                </div>
              )}
            </div>

            {/* My Resumes Card */}
            <div className="card p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-border-color shadow-sm">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-color/10">
                <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 text-blue-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  My Resumes ({resumes?.length || 0})
                </h3>
                <span className="text-[10px] font-bold text-blue-500 hover:underline">View All &gt;</span>
              </div>

              <div className="divide-y divide-border-color">
                {resumes?.length > 0 ? (
                  resumes.map(resume => (
                    <div key={resume.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/5 border border-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                          <FileText size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs truncate max-w-[130px] text-primary">{resume.title}</span>
                            {resume.is_primary && (
                              <span className="text-[8px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold inline-flex items-center gap-0.5 border border-emerald-500/15">
                                ● Active
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-muted font-semibold mt-0.5">
                            Updated {new Date(resume.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Action icons right aligned */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={() => handleDownload(resume.id, resume.title)} 
                          style={{ background: 'transparent', border: 'none', padding: '6px' }}
                          className="text-muted hover:text-blue-500 transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <Download size={14} />
                        </button>
                        <button 
                          onClick={() => handleEditClick(resume.id)}
                          style={{ background: 'transparent', border: 'none', padding: '6px' }}
                          className="text-muted hover:text-blue-500 transition-colors cursor-pointer"
                          title="Edit Resume"
                        >
                          <Edit size={14} />
                        </button>
                        
                        {/* Interactive Dropdown for actions */}
                        <div className="relative">
                          <button 
                            onClick={() => setActiveMenuId(activeMenuId === resume.id ? null : resume.id)}
                            style={{ background: 'transparent', border: 'none', padding: '6px' }}
                            className="text-muted hover:text-primary transition-colors cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5" />
                            </svg>
                          </button>
                          
                          {activeMenuId === resume.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                              <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-zinc-800 rounded-lg border border-border-color shadow-lg py-1 z-20">
                                {!resume.is_primary && (
                                  <button 
                                    onClick={() => {
                                      handleSetPrimary(resume.id);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-primary hover:bg-slate-50 dark:hover:bg-zinc-700 font-semibold cursor-pointer border-none bg-transparent"
                                  >
                                    Set Active
                                  </button>
                                )}
                                <button 
                                  onClick={() => {
                                    handleDelete(resume.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 font-semibold cursor-pointer border-none bg-transparent"
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-muted italic text-xs">
                    No resumes generated.
                  </div>
                )}
              </div>
            </div>

            {/* Pro Tip Card */}
            <div className="card p-4 bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl border border-blue-500/15 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <span className="text-base">💡</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-primary">Pro Tip</p>
                  <p className="text-[10px] text-muted leading-tight mt-0.5">Keep your resume updated and relevant for better opportunities.</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-muted" />
            </div>
          </div>
        ) : (
          <>
            {/* Desktop templates gallery */}
            <section className="mb-12">
              <div className="section-label label-caps">
                <Layout size={14} className="text-orange-500" /> Available Templates
              </div>
              <div className="template-grid">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="template-card">
                    <div className="template-preview" style={{ padding: '16px', background: 'white', position: 'relative', overflow: 'hidden' }}>
                      <div className="w-full h-full p-4 space-y-2 bg-white dark:bg-zinc-950 rounded-lg shadow-sm border border-border-color">
                        <div className="w-2/3 h-2.5 bg-blue-400 rounded"></div>
                        <div className="w-1/2 h-2 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                        <div className="pt-4 w-full h-2 bg-slate-100 dark:bg-zinc-900 rounded"></div>
                        <div className="w-3/4 h-2 bg-slate-100 dark:bg-zinc-900 rounded"></div>
                        <div className="w-5/6 h-2 bg-slate-100 dark:bg-zinc-900 rounded"></div>
                      </div>
                      <div className="template-hover-overlay">
                        <button 
                          onClick={() => handleGenerate(tpl.id)}
                          disabled={isGenerating}
                          className="btn btn-primary btn-sm"
                        >
                          {isGenerating ? 'Generating...' : 'Choose Template & Generate'}
                        </button>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="text-sm font-bold">{tpl.name}</h4>
                        <span className="label-caps font-bold" style={{ fontSize: '9px' }}>v{tpl.version}</span>
                      </div>
                      <p className="text-xs text-secondary font-light line-clamp-2">{tpl.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Desktop Document History */}
            <section className="mb-12">
              <div className="section-label label-caps mb-4">
                <History size={14} className="text-orange-500" /> Document History
              </div>
              <div className="table-container">
                <table className="w-full">
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
          </>
        )}


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
