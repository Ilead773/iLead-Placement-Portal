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
  Trophy,
  Flame,
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
  const [zoom, setZoom] = useState(85);
  const [deskTheme, setDeskTheme] = useState('dark');

  // Raw Text Input States (Preserves commas and trailing spaces while typing)
  const [skillsText, setSkillsText] = useState('');
  const [languagesText, setLanguagesText] = useState('');
  const [strengthsText, setStrengthsText] = useState('');
  const [extraCurricularText, setExtraCurricularText] = useState('');

  // Resume Data State
  const [canonical, setCanonical] = useState(() => {
    return initialData?.canonical_json || {
      personal: { name: '', email: '', phone: '', location: '', linkedin: '', github: '', portfolio: '' },
      professional_summary: '',
      education: [],
      experience: [],
      projects: [],
      skills: [],
      languages: [],
      certifications: [],
      achievements: [],
      strengths: [],
      extra_curricular: []
    };
  });

  const iframeRef = useRef(null);
  const previewTimer = useRef(null);

  const adjustIframeHeight = () => {
    if (!iframeRef.current) return;
    try {
      const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (iframeDoc && (iframeDoc.body || iframeDoc.documentElement)) {
        const scrollHeight = Math.max(
          iframeDoc.body?.scrollHeight || 0,
          iframeDoc.documentElement?.scrollHeight || 0,
          1122
        );
        iframeRef.current.style.height = `${scrollHeight + 30}px`;
      }
    } catch (err) {
      console.error('Failed to adjust iframe height', err);
    }
  };

  // Fetch complete resume details and initial HTML template on mount
  useEffect(() => {
    fetchInitialData();
  }, [resumeId]);

  const fetchInitialData = async () => {
    if (!resumeId) return;
    try {
      setLoading(true);
      const [detailRes, htmlRes] = await Promise.all([
        api.get(`resumes/${resumeId}/`),
        api.get(`resumes/${resumeId}/html/`)
      ]);

      const data = detailRes.data;
      if (data?.canonical_json) {
        const c = data.canonical_json;
        setCanonical(c);
        
        // Sync raw text inputs
        if (c.skills) {
          const list = [];
          c.skills.forEach(sg => {
            if (typeof sg === 'string') list.push(sg);
            else if (sg?.items && Array.isArray(sg.items)) list.push(...sg.items);
          });
          setSkillsText(list.join(', '));
        }

        if (Array.isArray(c.experience)) {
          c.experience.forEach(exp => {
            if (!exp.description && exp.achievements && Array.isArray(exp.achievements)) {
              exp.description = exp.achievements.join('\n');
            }
          });
        }
        if (c.projects && Array.isArray(c.projects)) {
          c.projects.forEach(proj => {
            if (!proj.description && proj.highlights && Array.isArray(proj.highlights)) {
              proj.description = proj.highlights.join('\n');
            }
          });
        }

        if (c.languages) {
          setLanguagesText(Array.isArray(c.languages) ? c.languages.join(', ') : (c.languages || ''));
        }
        if (c.strengths) {
          setStrengthsText(Array.isArray(c.strengths) ? c.strengths.join(', ') : (c.strengths || ''));
        }
        if (c.extra_curricular) {
          setExtraCurricularText(Array.isArray(c.extra_curricular) ? c.extra_curricular.join(', ') : (c.extra_curricular || ''));
        }
      }

      // Initial iframe write
      if (iframeRef.current && htmlRes.data?.html) {
        const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(htmlRes.data.html);
          iframeDoc.close();
          setTimeout(adjustIframeHeight, 40);
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
        setTimeout(adjustIframeHeight, 40);
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

  const updateEducation = (idx, field, value) => {
    setCanonical(prev => {
      const next = [...(prev.education || [])];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, education: next };
    });
  };

  const removeEducation = (idx) => {
    setCanonical(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== idx)
    }));
  };

  // Experience Helpers
  const addExperience = () => {
    setCanonical(prev => ({
      ...prev,
      experience: [
        ...(prev.experience || []),
        { company: '', position: '', duration: { start: '', end: '', current: false }, description: '', achievements: [] }
      ]
    }));
  };

  const updateExperience = (idx, field, value) => {
    setCanonical(prev => {
      const next = [...(prev.experience || [])];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, experience: next };
    });
  };

  const handleExperienceTextChange = (idx, text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    setCanonical(prev => {
      const next = [...(prev.experience || [])];
      next[idx] = { 
        ...next[idx], 
        description: text,
        achievements: lines 
      };
      return { ...prev, experience: next };
    });
  };

  const removeExperience = (idx) => {
    setCanonical(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== idx)
    }));
  };

  // Projects Helpers
  const addProject = () => {
    setCanonical(prev => ({
      ...prev,
      projects: [
        ...(prev.projects || []),
        { title: '', description: '', technologies: [], link: '', date: '', highlights: [] }
      ]
    }));
  };

  const updateProject = (idx, field, value) => {
    setCanonical(prev => {
      const next = [...(prev.projects || [])];
      if (field === 'technologies' && typeof value === 'string') {
        next[idx] = { 
          ...next[idx], 
          technologies: value.split(',').map(s => s.trim()).filter(Boolean) 
        };
      } else {
        next[idx] = { ...next[idx], [field]: value };
      }
      return { ...prev, projects: next };
    });
  };

  const handleProjectTextChange = (idx, text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    setCanonical(prev => {
      const next = [...(prev.projects || [])];
      next[idx] = { 
        ...next[idx], 
        description: text,
        highlights: lines 
      };
      return { ...prev, projects: next };
    });
  };

  const removeProject = (idx) => {
    setCanonical(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== idx)
    }));
  };

  // Skills Handler (Supports smooth comma typing)
  const handleSkillsTextChange = (str) => {
    setSkillsText(str);
    const items = str.split(',').map(s => s.trim()).filter(Boolean);
    setCanonical(prev => ({
      ...prev,
      skills: items.length > 0 ? [{ category: 'Key Skills', items }] : []
    }));
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

  const updateCertification = (idx, field, value) => {
    setCanonical(prev => {
      const next = [...(prev.certifications || [])];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, certifications: next };
    });
  };

  const removeCertification = (idx) => {
    setCanonical(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== idx)
    }));
  };

  // Achievements Helpers
  const addAchievement = () => {
    setCanonical(prev => ({
      ...prev,
      achievements: [
        ...(prev.achievements || []),
        { title: '', issuer: '', description: '' }
      ]
    }));
  };

  const updateAchievement = (idx, field, value) => {
    setCanonical(prev => {
      const next = [...(prev.achievements || [])];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, achievements: next };
    });
  };

  const removeAchievement = (idx) => {
    setCanonical(prev => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== idx)
    }));
  };

  // Extracurricular Handler (Supports smooth comma typing)
  const handleExtraCurricularChange = (str) => {
    setExtraCurricularText(str);
    const items = str.split(',').map(s => s.trim()).filter(Boolean);
    setCanonical(prev => ({
      ...prev,
      extra_curricular: items
    }));
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
    { id: 'personal', label: 'Personal', icon: User, count: canonical.personal?.name ? '✓' : '' },
    { id: 'summary', label: 'Summary', icon: Sparkles, count: canonical.professional_summary ? '✓' : '' },
    { id: 'education', label: 'Education', icon: GraduationCap, count: canonical.education?.length || 0 },
    { id: 'experience', label: 'Experience', icon: Briefcase, count: canonical.experience?.length || 0 },
    { id: 'projects', label: 'Projects', icon: FolderKanban, count: canonical.projects?.length || 0 },
    { id: 'skills', label: 'Skills', icon: Globe, count: skillsText ? skillsText.split(',').filter(Boolean).length : 0 },
    { id: 'certifications', label: 'Certs', icon: Award, count: canonical.certifications?.length || 0 },
    { id: 'achievements', label: 'Achievements', icon: Trophy, count: canonical.achievements?.length || 0 },
    { id: 'extracurricular', label: 'Activities', icon: Flame, count: extraCurricularText ? extraCurricularText.split(',').filter(Boolean).length : 0 },
    { id: 'more', label: 'Languages', icon: ListChecks, count: languagesText ? '✓' : '' },
  ];

  const deskBgClass = 
    deskTheme === 'dark' ? 'bg-[#090d16]' :
    deskTheme === 'slate' ? 'bg-[#182234]' :
    'bg-slate-200/90';

  return (
    <div 
      className="fixed inset-0 bg-[#070a12] text-slate-100 flex flex-col w-screen h-screen overflow-hidden select-none font-sans"
      style={{ zIndex: 999999, top: 0, left: 0, right: 0, bottom: 0 }}
    >
      
      {/* Top Bar Navigation */}
      <header className="h-16 bg-[#0b0f19] border-b border-slate-800/80 px-6 flex items-center justify-between shrink-0 shadow-lg z-30">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm md:text-base m-0 leading-tight text-white">Interactive Resume Studio</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">iLEAD Live</span>
            </div>
            <p className="text-[11px] text-slate-400 m-0 mt-0.5">Real-time bidirectional editing & authentic A4 print preview</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFullscreenPreview(!fullscreenPreview)}
            className="btn btn-sm text-xs py-2 px-3.5 bg-slate-800/70 border border-slate-700/80 hover:bg-slate-700 text-slate-200 flex items-center gap-2 rounded-xl font-medium cursor-pointer transition-all"
          >
            {fullscreenPreview ? <Minimize2 size={14} /> : <Maximize2 size={14} />} 
            <span className="hidden sm:inline">{fullscreenPreview ? 'Show Editor' : 'Fullscreen'}</span>
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-sm py-2 px-5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-none font-bold text-white shadow-lg shadow-orange-500/25 flex items-center gap-2 rounded-xl cursor-pointer text-xs transition-all active:scale-95"
          >
            <Save size={15} /> {isSaving ? 'Saving...' : 'Save & Regenerate PDF'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer ml-1"
            title="Close Editor"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-row overflow-hidden w-full h-[calc(100vh-64px)]">
        
        {/* Left Side: Form Editor Panel */}
        <div 
          style={{ 
            display: fullscreenPreview ? 'none' : 'flex'
          }}
          className="w-full md:w-[540px] xl:w-[600px] 2xl:w-[660px] bg-[#0b0f19] border-r border-slate-800/80 flex-col shrink-0 h-full overflow-hidden z-10"
        >
          
          {/* Tab Selection Bar (Clean Wrapped Pills - No Native Scrollbars) */}
          <div className="p-3 bg-[#0e1424] border-b border-slate-800/80 shrink-0">
            <div className="flex flex-wrap gap-1.5">
              {navTabs.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      active 
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 scale-[1.02]' 
                        : 'bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-700/50'
                    }`}
                  >
                    <Icon size={13} className={active ? 'text-white' : 'text-orange-400'} />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count !== '' && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${active ? 'bg-white/25 text-white' : 'bg-slate-700 text-slate-300'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 text-slate-200 select-text">
            
            {/* 1. Personal Info Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-4">
                <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                    <User size={14} /> Personal Contact Information
                  </h4>
                  <span className="text-[11px] text-slate-400">Header & Contact Row</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={canonical.personal?.name || ''} 
                      onChange={e => updatePersonal('name', e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-[#111726] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={canonical.personal?.email || ''} 
                      onChange={e => updatePersonal('email', e.target.value)}
                      placeholder="e.g. student@ilead.edu.in"
                      className="w-full bg-[#111726] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Phone Number</label>
                    <input 
                      type="text" 
                      value={canonical.personal?.phone || ''} 
                      onChange={e => updatePersonal('phone', e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-[#111726] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Location / City</label>
                    <input 
                      type="text" 
                      value={canonical.personal?.location || ''} 
                      onChange={e => updatePersonal('location', e.target.value)}
                      placeholder="e.g. Kolkata, West Bengal"
                      className="w-full bg-[#111726] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">LinkedIn URL</label>
                    <input 
                      type="text" 
                      value={canonical.personal?.linkedin || ''} 
                      onChange={e => updatePersonal('linkedin', e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full bg-[#111726] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Portfolio Link</label>
                    <input 
                      type="text" 
                      value={canonical.personal?.portfolio || ''} 
                      onChange={e => updatePersonal('portfolio', e.target.value)}
                      placeholder="https://myportfolio.com"
                      className="w-full bg-[#111726] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">GitHub URL (Optional - leave empty to hide)</label>
                    <input 
                      type="text" 
                      value={canonical.personal?.github || ''} 
                      onChange={e => updatePersonal('github', e.target.value)}
                      placeholder="https://github.com/... (Leave empty if not needed)"
                      className="w-full bg-[#111726] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-3">
                <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} /> Career Objective / Summary
                  </h4>
                  <span className="text-[11px] text-slate-400">2-3 sentences</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">Highlight your academic focus, leadership strengths, and aspirations.</p>
                
                <textarea 
                  value={canonical.professional_summary || ''} 
                  onChange={e => updateSummary(e.target.value)}
                  rows={6}
                  className="w-full bg-[#111726] border border-slate-700/80 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 leading-relaxed"
                  placeholder="e.g. Dedicated BBA student with strong academic performance and leadership skills. Passionate about business management and entrepreneurship..."
                />
              </div>
            )}

            {/* 3. Education & CGPA Tab */}
            {activeTab === 'education' && (
              <div className="space-y-4">
                <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                      <GraduationCap size={14} /> Education & CGPA Marks
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Renders in the standard university qualification table</p>
                  </div>
                  <button 
                    type="button"
                    onClick={addEducation}
                    className="btn btn-xs bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 border border-orange-500/30 flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                  >
                    <Plus size={13} /> Add Education
                  </button>
                </div>

                {canonical.education?.map((edu, idx) => (
                  <div key={edu.id || edu._id || `edu-${idx}`} className="p-4 bg-[#111726] border border-slate-800 hover:border-slate-700 rounded-xl relative space-y-3.5 shadow-sm transition-all">
                    <div className="flex items-center justify-between pr-8">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-800/90 px-2 py-0.5 rounded">Qualification #{idx + 1}</span>
                    </div>

                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        removeEducation(idx);
                      }}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors p-1.5 rounded-lg cursor-pointer"
                      title="Remove entry"
                    >
                      <Trash2 size={15} />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Degree / Course</label>
                        <input 
                          type="text" 
                          value={edu.degree || ''} 
                          onChange={e => updateEducation(idx, 'degree', e.target.value)}
                          placeholder="e.g. Bachelor of Business Administration"
                          className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Institution / School</label>
                        <input 
                          type="text" 
                          value={edu.institution || ''} 
                          onChange={e => updateEducation(idx, 'institution', e.target.value)}
                          placeholder="e.g. iLEAD, Kolkata"
                          className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Board / University</label>
                        <input 
                          type="text" 
                          value={edu.field || ''} 
                          onChange={e => updateEducation(idx, 'field', e.target.value)}
                          placeholder="e.g. MAKAUT / CBSE"
                          className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Graduation Year</label>
                        <input 
                          type="text" 
                          value={edu.graduation_date || ''} 
                          onChange={e => updateEducation(idx, 'graduation_date', e.target.value)}
                          placeholder="e.g. 2026 or 2024 - 2026"
                          className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-amber-400 mb-1">CGPA / Percentage Marks</label>
                        <input 
                          type="text" 
                          value={edu.gpa || ''} 
                          onChange={e => updateEducation(idx, 'gpa', e.target.value)}
                          placeholder="e.g. 8.75 or 85% (Leave blank to hide)"
                          className="w-full bg-[#0a0e1a] border border-amber-500/40 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-orange-500"
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
                <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                      <Briefcase size={14} /> Work & Internship Experience
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Press Enter to add responsibilities as bullet points</p>
                  </div>
                  <button 
                    type="button"
                    onClick={addExperience}
                    className="btn btn-xs bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 border border-orange-500/30 flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                  >
                    <Plus size={13} /> Add Experience
                  </button>
                </div>

                {canonical.experience?.map((exp, idx) => (
                  <div key={exp.id || exp._id || `exp-${idx}`} className="p-4 bg-[#111726] border border-slate-800 hover:border-slate-700 rounded-xl relative space-y-3.5 shadow-sm transition-all">
                    <div className="flex items-center justify-between pr-8">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-800/90 px-2 py-0.5 rounded">Experience #{idx + 1}</span>
                    </div>

                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        removeExperience(idx);
                      }}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors p-1.5 rounded-lg cursor-pointer"
                      title="Remove entry"
                    >
                      <Trash2 size={15} />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Company / Organization</label>
                        <input 
                          type="text" 
                          value={exp.company || ''} 
                          onChange={e => updateExperience(idx, 'company', e.target.value)}
                          placeholder="e.g. Tech Startup Inc."
                          className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Job Role / Position</label>
                        <input 
                          type="text" 
                          value={exp.position || ''} 
                          onChange={e => updateExperience(idx, 'position', e.target.value)}
                          placeholder="e.g. Marketing Intern"
                          className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Start Date</label>
                        <input 
                          type="text" 
                          value={exp.duration?.start || exp.start_date || ''} 
                          onChange={e => {
                            const val = e.target.value;
                            updateExperience(idx, 'duration', { ...(exp.duration || {}), start: val });
                            updateExperience(idx, 'start_date', val);
                          }}
                          placeholder="e.g. Jun 2024"
                          className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">End Date</label>
                        <input 
                          type="text" 
                          value={exp.duration?.end || exp.end_date || ''} 
                          onChange={e => {
                            const val = e.target.value;
                            updateExperience(idx, 'duration', { ...(exp.duration || {}), end: val });
                            updateExperience(idx, 'end_date', val);
                          }}
                          placeholder="e.g. Present or Aug 2024"
                          className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-300">
                          Responsibilities (One per line for bullet points)
                        </label>
                        <span className="text-[10px] text-orange-400 font-medium font-mono">Bullet Points</span>
                      </div>
                      <textarea 
                        value={exp.description !== undefined ? exp.description : (Array.isArray(exp.achievements) ? exp.achievements.join('\n') : '')} 
                        onChange={e => handleExperienceTextChange(idx, e.target.value)}
                        rows={4}
                        placeholder="• Increased social media engagement by 35%&#10;• Managed marketing budget for ad campaigns&#10;• Coordinated weekly campaigns with design team"
                        className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-orange-500 leading-relaxed font-sans"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 5. Projects Tab */}
            {activeTab === 'projects' && (
              <div className="space-y-4">
                <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                      <FolderKanban size={14} /> Key Academic & Tech Projects
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Press Enter to add project points as bullets</p>
                  </div>
                  <button 
                    type="button"
                    onClick={addProject}
                    className="btn btn-xs bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 border border-orange-500/30 flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                  >
                    <Plus size={13} /> Add Project
                  </button>
                </div>

                {canonical.projects?.map((proj, idx) => (
                  <div key={proj.id || proj._id || `proj-${idx}`} className="p-4 bg-[#111726] border border-slate-800 hover:border-slate-700 rounded-xl relative space-y-3.5 shadow-sm transition-all">
                    <div className="flex items-center justify-between pr-8">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-800/90 px-2 py-0.5 rounded">Project #{idx + 1}</span>
                    </div>

                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        removeProject(idx);
                      }}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors p-1.5 rounded-lg cursor-pointer"
                      title="Remove entry"
                    >
                      <Trash2 size={15} />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Project Title</label>
                        <input 
                          type="text" 
                          value={proj.title || ''} 
                          onChange={e => updateProject(idx, 'title', e.target.value)}
                          placeholder="e.g. Market Analysis Tool"
                          className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Tools & Technologies (comma separated)</label>
                        <input 
                          type="text" 
                          value={Array.isArray(proj.technologies) ? proj.technologies.join(', ') : (proj.technologies || '')} 
                          onChange={e => updateProject(idx, 'technologies', e.target.value)}
                          placeholder="e.g. Python, Pandas, BeautifulSoup"
                          className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Project Link / URL (Optional)</label>
                        <input 
                          type="text" 
                          value={proj.link || ''} 
                          onChange={e => updateProject(idx, 'link', e.target.value)}
                          placeholder="https://github.com/... or live demo"
                          className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-300">
                          Highlights & Points (One per line for bullet points)
                        </label>
                        <span className="text-[10px] text-orange-400 font-medium font-mono">Bullet Points</span>
                      </div>
                      <textarea 
                        value={proj.description !== undefined ? proj.description : (Array.isArray(proj.highlights) ? proj.highlights.join('\n') : '')} 
                        onChange={e => handleProjectTextChange(idx, e.target.value)}
                        rows={3}
                        placeholder="• Built automated web scraper for competitor analytics&#10;• Generated visual dashboards using Matplotlib&#10;• Deployed live on cloud container"
                        className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-orange-500 leading-relaxed font-sans"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 6. Skills Tab */}
            {activeTab === 'skills' && (
              <div className="space-y-3">
                <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                    <Globe size={14} /> Key Skills & Competencies
                  </h4>
                  <span className="text-[11px] text-slate-400">Comma Separated</span>
                </div>
                <p className="text-[11px] text-slate-400">Enter skills separated by commas. Clear the box completely if you wish to omit the Skills section.</p>
                
                <div>
                  <textarea 
                    value={skillsText} 
                    onChange={e => handleSkillsTextChange(e.target.value)}
                    rows={6}
                    className="w-full bg-[#111726] border border-slate-700/80 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 leading-relaxed"
                    placeholder="Python, React, Data Analysis, Financial Modeling, Public Speaking, Leadership..."
                  />
                </div>
              </div>
            )}

            {/* 7. Certifications Tab */}
            {activeTab === 'certifications' && (
              <div className="space-y-4">
                <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                      <Award size={14} /> Certifications & Courses
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Certificates from Coursera, Google, AWS, LinkedIn, etc.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={addCertification}
                    className="btn btn-xs bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 border border-orange-500/30 flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                  >
                    <Plus size={13} /> Add Certification
                  </button>
                </div>

                {canonical.certifications?.map((cert, idx) => (
                  <div key={cert.id || cert._id || `cert-${idx}`} className="p-4 bg-[#111726] border border-slate-800 hover:border-slate-700 rounded-xl relative space-y-3.5 shadow-sm transition-all">
                    <div className="flex items-center justify-between pr-8">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-800/90 px-2 py-0.5 rounded">Certification #{idx + 1}</span>
                    </div>

                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        removeCertification(idx);
                      }}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors p-1.5 rounded-lg cursor-pointer"
                      title="Remove entry"
                    >
                      <Trash2 size={15} />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Certification Name</label>
                        <input 
                          type="text" 
                          value={cert.name || ''} 
                          onChange={e => updateCertification(idx, 'name', e.target.value)}
                          placeholder="e.g. Google Digital Marketing"
                          className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Issuing Organization</label>
                        <input 
                          type="text" 
                          value={cert.issuer || ''} 
                          onChange={e => updateCertification(idx, 'issuer', e.target.value)}
                          placeholder="e.g. Google / Coursera"
                          className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 8. Achievements Tab */}
            {activeTab === 'achievements' && (
              <div className="space-y-4">
                <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                      <Trophy size={14} /> Achievements & Responsibility Roles
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Council roles, competitions, hackathons, sports awards</p>
                  </div>
                  <button 
                    type="button"
                    onClick={addAchievement}
                    className="btn btn-xs bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 border border-orange-500/30 flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                  >
                    <Plus size={13} /> Add Achievement
                  </button>
                </div>

                {canonical.achievements?.map((ach, idx) => (
                  <div key={ach.id || ach._id || `ach-${idx}`} className="p-4 bg-[#111726] border border-slate-800 hover:border-slate-700 rounded-xl relative space-y-3.5 shadow-sm transition-all">
                    <div className="flex items-center justify-between pr-8">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-800/90 px-2 py-0.5 rounded">Achievement #{idx + 1}</span>
                    </div>

                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        removeAchievement(idx);
                      }}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors p-1.5 rounded-lg cursor-pointer"
                      title="Remove entry"
                    >
                      <Trash2 size={15} />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Role / Achievement Title</label>
                        <input 
                          type="text" 
                          value={ach.title || ''} 
                          onChange={e => updateAchievement(idx, 'title', e.target.value)}
                          placeholder="e.g. Event Coordinator / 1st Place Hackathon"
                          className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Organization / Event</label>
                        <input 
                          type="text" 
                          value={ach.issuer || ''} 
                          onChange={e => updateAchievement(idx, 'issuer', e.target.value)}
                          placeholder="e.g. iLEAD Student Council"
                          className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Short Description</label>
                        <input 
                          type="text" 
                          value={ach.description || ''} 
                          onChange={e => updateAchievement(idx, 'description', e.target.value)}
                          placeholder="e.g. Led a team of 15 students for annual college symposium"
                          className="w-full bg-[#0a0e1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 9. Extracurricular Activities Tab */}
            {activeTab === 'extracurricular' && (
              <div className="space-y-3">
                <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                    <Flame size={14} /> Extra-Curricular Activities
                  </h4>
                  <span className="text-[11px] text-slate-400">Comma Separated</span>
                </div>
                <p className="text-[11px] text-slate-400">Enter activities separated by commas (e.g. clubs, volunteering, cultural events, sports).</p>
                
                <div>
                  <textarea 
                    value={extraCurricularText} 
                    onChange={e => handleExtraCurricularChange(e.target.value)}
                    rows={4}
                    placeholder="Technical Head – Tech Fest 2025, Member – Coding Club, NSS Volunteer"
                    className="w-full bg-[#111726] border border-slate-700/80 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* 10. Languages & Strengths Tab */}
            {activeTab === 'more' && (
              <div className="space-y-5">
                <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                    <ListChecks size={14} /> Languages & Key Strengths
                  </h4>
                  <span className="text-[11px] text-slate-400">Sidebar Items</span>
                </div>
                
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Languages Known (comma separated)</label>
                  <input 
                    type="text" 
                    value={languagesText} 
                    onChange={e => handleLanguagesTextChange(e.target.value)}
                    placeholder="e.g. English, Hindi, Bengali"
                    className="w-full bg-[#111726] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Strengths (comma separated)</label>
                  <input 
                    type="text" 
                    value={strengthsText} 
                    onChange={e => handleStrengthsTextChange(e.target.value)}
                    placeholder="e.g. Strategic Planning, Team Collaboration, Analytical Problem Solving"
                    className="w-full bg-[#111726] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Side: Real-Time Live Preview Workspace */}
        <div className={`flex-1 ${deskBgClass} flex flex-col h-full overflow-y-auto p-4 md:p-6 items-center justify-start relative transition-colors duration-200`}>
          
          {/* Floating Studio Control Bar */}
          <div className="sticky top-0 z-20 mb-6 px-4 py-2 rounded-full bg-[#0d1322]/90 backdrop-blur-md border border-slate-700/70 shadow-2xl flex items-center gap-3 sm:gap-4 text-xs">
            {/* Live indicator */}
            <div className="flex items-center gap-2 font-mono text-emerald-400 font-bold pr-3 border-r border-slate-700/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden sm:inline">Live Real-Time A4</span>
              <span className="sm:hidden">Live</span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 sm:gap-2 pr-3 border-r border-slate-700/80">
              <button 
                type="button" 
                onClick={() => setZoom(z => Math.max(50, z - 10))}
                className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 font-bold transition-all"
                title="Zoom Out"
              >
                -
              </button>
              <span className="text-[11px] font-mono font-semibold text-slate-200 w-10 text-center">{zoom}%</span>
              <button 
                type="button" 
                onClick={() => setZoom(z => Math.min(130, z + 10))}
                className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 font-bold transition-all"
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setZoom(85)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${zoom === 85 ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                Fit Page
              </button>
              <button
                type="button"
                onClick={() => setZoom(100)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${zoom === 100 ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                100%
              </button>
            </div>

            {/* Desk Canvas Theme Selector */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="hidden sm:inline">Desk:</span>
              <button
                type="button"
                onClick={() => setDeskTheme('dark')}
                className={`w-4 h-4 rounded-full bg-[#090d16] border cursor-pointer transition-all ${deskTheme === 'dark' ? 'border-orange-500 ring-2 ring-orange-500/30 scale-110' : 'border-slate-600'}`}
                title="Dark Studio"
              />
              <button
                type="button"
                onClick={() => setDeskTheme('slate')}
                className={`w-4 h-4 rounded-full bg-[#182234] border cursor-pointer transition-all ${deskTheme === 'slate' ? 'border-orange-500 ring-2 ring-orange-500/30 scale-110' : 'border-slate-500'}`}
                title="Slate Desk"
              />
              <button
                type="button"
                onClick={() => setDeskTheme('light')}
                className={`w-4 h-4 rounded-full bg-slate-300 border cursor-pointer transition-all ${deskTheme === 'light' ? 'border-orange-500 ring-2 ring-orange-500/30 scale-110' : 'border-slate-400'}`}
                title="Light Desk"
              />
            </div>
          </div>

          {/* Authentic Elevated A4 Document Sheet with Zoom Scaling */}
          <div 
            style={{ 
              transform: `scale(${zoom / 100})`, 
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out'
            }}
            className="w-full max-w-[840px] bg-white shadow-[0_25px_60px_rgba(0,0,0,0.45)] border border-slate-700/60 min-h-[1122px] shrink-0 mb-16 rounded-sm overflow-hidden"
          >
            <iframe
              ref={iframeRef}
              title="Resume Live Preview"
              onLoad={adjustIframeHeight}
              className="w-full min-h-[1122px] border-none bg-white block"
              style={{ height: '1122px' }}
            />
          </div>
        </div>

      </div>

    </div>
  );
}
