// src/components/SideBySideResumeEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  User, 
  GraduationCap, 
  Briefcase, 
  FolderKanban, 
  Sparkles, 
  Globe, 
  Award,
  ListChecks,
  Plus,
  Trash2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

export default function SideBySideResumeEditor({ resumeId, initialData, onClose, onSaveSuccess }) {
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);

  // Raw Text Input States (Preserves commas and trailing spaces while typing)
  const [skillsText, setSkillsText] = useState('');
  const [languagesText, setLanguagesText] = useState('');
  const [strengthsText, setStrengthsText] = useState('');

  // Resume Data State
  const [canonical, setCanonical] = useState(() => {
    return initialData?.canonical_json || {
      personal: { name: '', email: '', phone: '', location: '', linkedin: '', github: '', portfolio: '' },
      professional_summary: '',
      education: [],
      experience: [],
      projects: [],
      skills: [{ category: 'Technical Skills', items: [] }],
      languages: [],
      certifications: [],
      achievements: [],
      strengths: [],
      extra_curricular: []
    };
  });

  const iframeRef = useRef(null);
  const previewTimer = useRef(null);

  // Fetch complete resume details and initial HTML template on mount
  useEffect(() => {
    fetchInitialData();
  }, [resumeId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [detailRes, htmlRes] = await Promise.all([
        api.get(`resumes/${resumeId}/`),
        api.get(`resumes/${resumeId}/html/`)
      ]);

      if (detailRes.data?.canonical_json) {
        const c = detailRes.data.canonical_json;
        setCanonical(c);
        
        // Sync raw text inputs
        if (c.skills?.[0]?.items) {
          setSkillsText(Array.isArray(c.skills[0].items) ? c.skills[0].items.join(', ') : (c.skills[0].items || ''));
        }
        if (c.languages) {
          setLanguagesText(Array.isArray(c.languages) ? c.languages.join(', ') : (c.languages || ''));
        }
        if (c.strengths) {
          setStrengthsText(Array.isArray(c.strengths) ? c.strengths.join(', ') : (c.strengths || ''));
        }
      }

      // Initial iframe write
      if (iframeRef.current && htmlRes.data?.html) {
        const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(htmlRes.data.html);
          iframeDoc.close();
        }
      }
    } catch (err) {
      console.error('Failed to load initial resume data', err);
      toast.error('Failed to load resume details');
    } finally {
      setLoading(false);
    }
  };

  // Debounced Live Preview fetching from Backend Renderer
  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      fetchLivePreviewHtml();
    }, 150);

    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [canonical]);

  const fetchLivePreviewHtml = async () => {
    if (!iframeRef.current || !resumeId) return;
    const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (!iframeDoc) return;

    try {
      const previewRes = await api.post(`resumes/${resumeId}/preview/`, { canonical_json: canonical });
      const liveHtml = previewRes.data?.html;
      if (liveHtml) {
        iframeDoc.open();
        iframeDoc.write(liveHtml);
        iframeDoc.close();
      }
    } catch (err) {
      console.error('Failed to update live preview', err);
    }
  };

  // State Update Helpers
  const updatePersonal = (field, value) => {
    setCanonical(prev => ({
      ...prev,
      personal: {
        ...(prev.personal || {}),
        [field]: value
      }
    }));
  };

  const updateSummary = (value) => {
    setCanonical(prev => ({
      ...prev,
      professional_summary: value
    }));
  };

  // Education Helpers
  const addEducation = () => {
    setCanonical(prev => ({
      ...prev,
      education: [
        ...(prev.education || []),
        { degree: '', institution: '', field: '', graduation_date: '', gpa: '', honors: '' }
      ]
    }));
  };

  const updateEducation = (index, field, value) => {
    setCanonical(prev => {
      const updated = [...(prev.education || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, education: updated };
    });
  };

  const removeEducation = (index) => {
    setCanonical(prev => {
      const updated = (prev.education || []).filter((_, i) => i !== index);
      return { ...prev, education: updated };
    });
  };

  // Experience Helpers
  const addExperience = () => {
    setCanonical(prev => ({
      ...prev,
      experience: [
        ...(prev.experience || []),
        { company: '', position: '', duration: { start: '', end: '' }, description: '', achievements: [] }
      ]
    }));
  };

  const updateExperience = (index, field, value) => {
    setCanonical(prev => {
      const updated = [...(prev.experience || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, experience: updated };
    });
  };

  const removeExperience = (index) => {
    setCanonical(prev => {
      const updated = (prev.experience || []).filter((_, i) => i !== index);
      return { ...prev, experience: updated };
    });
  };

  // Projects Helpers
  const addProject = () => {
    setCanonical(prev => ({
      ...prev,
      projects: [
        ...(prev.projects || []),
        { title: '', description: '', technologies: [], link: '', date: '' }
      ]
    }));
  };

  const updateProject = (index, field, value) => {
    setCanonical(prev => {
      const updated = [...(prev.projects || [])];
      let valToSave = value;
      if (field === 'technologies' && typeof value === 'string') {
        valToSave = value.split(',').map(s => s.trim()).filter(Boolean);
      }
      updated[index] = { ...updated[index], [field]: valToSave };
      return { ...prev, projects: updated };
    });
  };

  const removeProject = (index) => {
    setCanonical(prev => {
      const updated = (prev.projects || []).filter((_, i) => i !== index);
      return { ...prev, projects: updated };
    });
  };

  // Skills Handler (Supports smooth comma typing)
  const handleSkillsTextChange = (str) => {
    setSkillsText(str);
    const items = str.split(',').map(s => s.trim()).filter(Boolean);
    setCanonical(prev => {
      const updated = [...(prev.skills || [])];
      if (!updated[0]) updated[0] = { category: 'Technical Skills', items: [] };
      updated[0] = { ...updated[0], items };
      return { ...prev, skills: updated };
    });
  };

  // Certifications Helpers
  const addCertification = () => {
    setCanonical(prev => ({
      ...prev,
      certifications: [
        ...(prev.certifications || []),
        { name: '', issuer: '', date: '' }
      ]
    }));
  };

  const updateCertification = (index, field, value) => {
    setCanonical(prev => {
      const updated = [...(prev.certifications || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, certifications: updated };
    });
  };

  const removeCertification = (index) => {
    setCanonical(prev => {
      const updated = (prev.certifications || []).filter((_, i) => i !== index);
      return { ...prev, certifications: updated };
    });
  };

  // Languages Handler (Supports smooth comma typing)
  const handleLanguagesTextChange = (str) => {
    setLanguagesText(str);
    const items = str.split(',').map(s => s.trim()).filter(Boolean);
    setCanonical(prev => ({
      ...prev,
      languages: items
    }));
  };

  // Strengths Handler (Supports smooth comma typing)
  const handleStrengthsTextChange = (str) => {
    setStrengthsText(str);
    const items = str.split(',').map(s => s.trim()).filter(Boolean);
    setCanonical(prev => ({
      ...prev,
      strengths: items
    }));
  };

  // Save changes back to API
  const handleSave = async () => {
    try {
      setIsSaving(true);
      toast.loading('Saving & re-generating PDF...', { id: 'save-resume' });
      
      await api.patch(`resumes/${resumeId}/`, {
        canonical_json: canonical
      });

      toast.success('Resume updated successfully! PDF queued.', { id: 'save-resume' });
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save resume updates', { id: 'save-resume' });
    } finally {
      setIsSaving(false);
    }
  };

  const navTabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'summary', label: 'Summary', icon: Sparkles },
    { id: 'education', label: 'Education & Marks', icon: GraduationCap },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'skills', label: 'Skills', icon: Globe },
    { id: 'certifications', label: 'Certifications', icon: Award },
    { id: 'more', label: 'Languages & Strengths', icon: ListChecks },
  ];

  return (
    <div 
      className="fixed inset-0 bg-slate-950 text-white flex flex-col w-screen h-screen overflow-hidden"
      style={{ zIndex: 999999, top: 0, left: 0, right: 0, bottom: 0 }}
    >
      
      {/* Top Bar Navigation */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 rounded-xl text-orange-400">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-bold text-base m-0 leading-tight text-white">Side-by-Side Live Resume Editor</h3>
            <p className="text-xs text-slate-400 m-0">Edit on the left pane • Real-time live A4 preview on the right</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFullscreenPreview(!fullscreenPreview)}
            className="btn btn-sm text-xs py-2 px-3 bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 rounded-lg font-semibold cursor-pointer"
          >
            {fullscreenPreview ? <Minimize2 size={14} /> : <Maximize2 size={14} />} 
            {fullscreenPreview ? 'Show Split Editor' : 'Fullscreen Preview'}
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-sm py-2 px-5 bg-orange-500 hover:bg-orange-600 border-none font-bold text-white shadow-lg shadow-orange-500/25 flex items-center gap-2 rounded-lg cursor-pointer text-xs"
          >
            <Save size={15} /> {isSaving ? 'Saving...' : 'Save & Regenerate PDF'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Editor"
          >
            <X size={22} />
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-row overflow-hidden w-full h-[calc(100vh-64px)]">
        
        {/* Left Side: Form Editor Panel */}
        <div 
          style={{ 
            width: fullscreenPreview ? '0px' : '440px', 
            minWidth: fullscreenPreview ? '0px' : '360px',
            display: fullscreenPreview ? 'none' : 'flex',
            flexDirection: 'column'
          }}
          className="bg-slate-950 border-r border-slate-800 shrink-0 h-full overflow-hidden"
        >
          
          {/* Tab Selection */}
          <div className="flex overflow-x-auto bg-slate-900/90 border-b border-slate-800 px-3 py-2.5 gap-1.5 scrollbar-none shrink-0">
            {navTabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    active 
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <Icon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Form Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200">
            
            {/* 1. Personal Info Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Personal Contact Information</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={canonical.personal?.name || ''} 
                      onChange={e => updatePersonal('name', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={canonical.personal?.email || ''} 
                      onChange={e => updatePersonal('email', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Phone Number</label>
                    <input 
                      type="text" 
                      value={canonical.personal?.phone || ''} 
                      onChange={e => updatePersonal('phone', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Location / City</label>
                    <input 
                      type="text" 
                      value={canonical.personal?.location || ''} 
                      onChange={e => updatePersonal('location', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">LinkedIn URL</label>
                    <input 
                      type="text" 
                      value={canonical.personal?.linkedin || ''} 
                      onChange={e => updatePersonal('linkedin', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">GitHub / Portfolio URL</label>
                    <input 
                      type="text" 
                      value={canonical.personal?.github || ''} 
                      onChange={e => updatePersonal('github', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Professional Summary</h4>
                <p className="text-[11px] text-slate-400">Highlight your career goals, strengths, and background in 2-3 sentences.</p>
                
                <textarea 
                  value={canonical.professional_summary || ''} 
                  onChange={e => updateSummary(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-orange-500 leading-relaxed"
                  placeholder="e.g. Ambitious Business Administration student with strong leadership and academic performance..."
                />
              </div>
            )}

            {/* 3. Education & CGPA Tab */}
            {activeTab === 'education' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Education & CGPA Marks</h4>
                  <button 
                    type="button"
                    onClick={addEducation}
                    className="btn btn-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-none flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    <Plus size={12} /> Add Education
                  </button>
                </div>

                {canonical.education?.map((edu, idx) => (
                  <div key={edu.id || edu._id || `edu-${idx}`} className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl relative space-y-3">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        removeEducation(idx);
                      }}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                      title="Remove entry"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Degree / Course</label>
                        <input 
                          type="text" 
                          value={edu.degree || ''} 
                          onChange={e => updateEducation(idx, 'degree', e.target.value)}
                          placeholder="e.g. BBA / Class XII"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Institution / School</label>
                        <input 
                          type="text" 
                          value={edu.institution || ''} 
                          onChange={e => updateEducation(idx, 'institution', e.target.value)}
                          placeholder="e.g. iLEAD / DPS"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Board / Specialization</label>
                        <input 
                          type="text" 
                          value={edu.field || ''} 
                          onChange={e => updateEducation(idx, 'field', e.target.value)}
                          placeholder="e.g. MAKAUT / Commerce"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Graduation Year</label>
                        <input 
                          type="text" 
                          value={edu.graduation_date || ''} 
                          onChange={e => updateEducation(idx, 'graduation_date', e.target.value)}
                          placeholder="e.g. 2026"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-orange-400 mb-1">CGPA / Percentage Marks (e.g. 8.75 or 85%)</label>
                        <input 
                          type="text" 
                          value={edu.gpa || ''} 
                          onChange={e => updateEducation(idx, 'gpa', e.target.value)}
                          placeholder="e.g. 8.75 CGPA or 85% (Leave blank to hide)"
                          className="w-full bg-slate-950 border border-orange-500/50 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 4. Experience Tab */}
            {activeTab === 'experience' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Work & Internship Experience</h4>
                  <button 
                    type="button"
                    onClick={addExperience}
                    className="btn btn-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-none flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    <Plus size={12} /> Add Experience
                  </button>
                </div>

                {canonical.experience?.map((exp, idx) => (
                  <div key={exp.id || exp._id || `exp-${idx}`} className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl relative space-y-3">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        removeExperience(idx);
                      }}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                      title="Remove entry"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Company / Organization</label>
                        <input 
                          type="text" 
                          value={exp.company || ''} 
                          onChange={e => updateExperience(idx, 'company', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Job Role / Position</label>
                        <input 
                          type="text" 
                          value={exp.position || ''} 
                          onChange={e => updateExperience(idx, 'position', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Description / Key Accomplishments</label>
                      <textarea 
                        value={exp.description || ''} 
                        onChange={e => updateExperience(idx, 'description', e.target.value)}
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 5. Projects Tab */}
            {activeTab === 'projects' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Key Projects</h4>
                  <button 
                    type="button"
                    onClick={addProject}
                    className="btn btn-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-none flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    <Plus size={12} /> Add Project
                  </button>
                </div>

                {canonical.projects?.map((proj, idx) => (
                  <div key={proj.id || proj._id || `proj-${idx}`} className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl relative space-y-3">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        removeProject(idx);
                      }}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                      title="Remove entry"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Project Title</label>
                        <input 
                          type="text" 
                          value={proj.title || ''} 
                          onChange={e => updateProject(idx, 'title', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Technologies Used (comma separated)</label>
                        <input 
                          type="text" 
                          value={Array.isArray(proj.technologies) ? proj.technologies.join(', ') : (proj.technologies || '')} 
                          onChange={e => updateProject(idx, 'technologies', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Project Summary</label>
                      <textarea 
                        value={proj.description || ''} 
                        onChange={e => updateProject(idx, 'description', e.target.value)}
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 6. Skills Tab */}
            {activeTab === 'skills' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Skills & Technical Competencies</h4>
                <p className="text-[11px] text-slate-400">Enter skills separated by commas.</p>
                
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Key Skills</label>
                  <textarea 
                    value={skillsText} 
                    onChange={e => handleSkillsTextChange(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-orange-500 leading-relaxed"
                    placeholder="Python, React, SQL, Problem Solving, Communication..."
                  />
                </div>
              </div>
            )}

            {/* 7. Certifications Tab */}
            {activeTab === 'certifications' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Certifications & Training</h4>
                  <button 
                    type="button"
                    onClick={addCertification}
                    className="btn btn-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-none flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    <Plus size={12} /> Add Certification
                  </button>
                </div>

                {canonical.certifications?.map((cert, idx) => (
                  <div key={cert.id || cert._id || `cert-${idx}`} className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl relative space-y-3">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        removeCertification(idx);
                      }}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                      title="Remove entry"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Certification Name</label>
                        <input 
                          type="text" 
                          value={cert.name || ''} 
                          onChange={e => updateCertification(idx, 'name', e.target.value)}
                          placeholder="e.g. AWS Certified Cloud Practitioner"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Issuing Organization</label>
                        <input 
                          type="text" 
                          value={cert.issuer || ''} 
                          onChange={e => updateCertification(idx, 'issuer', e.target.value)}
                          placeholder="e.g. Amazon Web Services"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 8. Languages & Strengths Tab */}
            {activeTab === 'more' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Languages & Strengths</h4>
                
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Languages Known (comma separated)</label>
                  <input 
                    type="text" 
                    value={languagesText} 
                    onChange={e => handleLanguagesTextChange(e.target.value)}
                    placeholder="e.g. English, Hindi, Bengali"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Strengths (comma separated)</label>
                  <input 
                    type="text" 
                    value={strengthsText} 
                    onChange={e => handleStrengthsTextChange(e.target.value)}
                    placeholder="e.g. Leadership, Analytical Thinking, Team Collaboration"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Side: Real-Time Live Preview Panel */}
        <div className="flex-1 bg-slate-900 flex flex-col h-full overflow-y-auto p-4 md:p-8 items-center justify-start relative">
          
          <div className="w-full max-w-[860px] bg-slate-950 border border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-400 rounded-t-xl mb-0 shrink-0 shadow-md">
            <span className="flex items-center gap-2 font-mono text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Real-Time A4 Preview
            </span>
            <span>A4 Print Scale: 100%</span>
          </div>

          <div className="w-full max-w-[860px] bg-white shadow-2xl rounded-b-xl overflow-hidden min-h-[1100px] shrink-0 my-auto border border-slate-800">
            <iframe
              ref={iframeRef}
              title="Resume Live Preview"
              className="w-full h-[1120px] border-none bg-white"
            />
          </div>
        </div>

      </div>

    </div>
  );
}
