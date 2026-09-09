// src/components/SideBySideResumeEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  Eye, 
  User, 
  GraduationCap, 
  Briefcase, 
  FolderKanban, 
  Sparkles, 
  Globe, 
  Plus,
  Trash2
} from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

export default function SideBySideResumeEditor({ resumeId, initialData, onClose, onSaveSuccess }) {
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [fullscreenPreview, setFullscreenPreview] = useState(false);

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
      achievements: []
    };
  });

  const iframeRef = useRef(null);

  // Fetch complete resume HTML on mount or when template changes
  useEffect(() => {
    fetchInitialHtml();
  }, [resumeId]);

  const fetchInitialHtml = async () => {
    try {
      setLoading(true);
      const res = await api.get(`resumes/${resumeId}/html/`);
      setPreviewHtml(res.data.html || '');
    } catch (err) {
      console.error('Failed to load initial HTML', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to update deeply nested canonical fields
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
    setCanonical(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
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
    setCanonical(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
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
      if (field === 'technologies' && typeof value === 'string') {
        value = value.split(',').map(s => s.trim()).filter(Boolean);
      }
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, projects: updated };
    });
  };

  const removeProject = (index) => {
    setCanonical(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }));
  };

  // Skills Helpers
  const updateSkills = (index, itemsStr) => {
    const items = itemsStr.split(',').map(s => s.trim()).filter(Boolean);
    setCanonical(prev => {
      const updated = [...(prev.skills || [])];
      if (!updated[index]) updated[index] = { category: 'Skills', items: [] };
      updated[index] = { ...updated[index], items };
      return { ...prev, skills: updated };
    });
  };

  // Synchronize Live Preview DOM whenever canonical state updates
  useEffect(() => {
    updatePreviewDOM();
  }, [canonical, previewHtml]);

  const updatePreviewDOM = () => {
    if (!iframeRef.current || !iframeRef.current.contentDocument) return;
    const doc = iframeRef.current.contentDocument;

    // If doc is empty, write initial HTML shell
    if (!doc.body || !doc.body.innerHTML) {
      doc.open();
      doc.write(previewHtml || '<html><body>Loading Live Preview...</body></html>');
      doc.close();
    }

    // Live update DOM elements inside iframe
    try {
      const personal = canonical.personal || {};

      // Name
      const nameEl = doc.querySelector('.resume-header h1, h1, .name-title');
      if (nameEl && personal.name) nameEl.textContent = personal.name;

      // Summary
      const summaryEl = doc.querySelector('.summary-text, .professional-summary p');
      if (summaryEl && canonical.professional_summary) summaryEl.textContent = canonical.professional_summary;

      // Email, Phone, Location
      const contactSpans = doc.querySelectorAll('.contact-info span, .contact-item');
      if (contactSpans.length > 0 && personal.email) {
        contactSpans[0].textContent = personal.email;
      }

    } catch (e) {
      console.warn("Live DOM update exception:", e);
    }
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
    } fontally {
      setIsSaving(false);
    }
  };

  const navTabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'summary', label: 'Summary', icon: Sparkles },
    { id: 'education', label: 'Education & CGPA', icon: GraduationCap },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'skills', label: 'Skills & Info', icon: Globe },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
      
      {/* Top Bar Navigation */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-bold text-base m-0 leading-tight">Live Resume Editor</h3>
            <p className="text-xs text-slate-400 m-0">Edit on the left • See live updates on the right</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFullscreenPreview(!fullscreenPreview)}
            className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs py-1.5 px-3 bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
          >
            <Eye size={14} /> {fullscreenPreview ? 'Exit Fullscreen' : 'Fullscreen Preview'}
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs py-1.5 px-4 bg-orange-500 hover:bg-orange-600 border-none font-bold text-white shadow-lg shadow-orange-500/20"
          >
            <Save size={14} /> {isSaving ? 'Saving...' : 'Save & Regenerate PDF'}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Form Editor Panel */}
        <div className={`${fullscreenPreview ? 'hidden' : 'w-full md:w-[48%] lg:w-[45%]'} flex flex-col bg-slate-950 border-r border-slate-800 shrink-0`}>
          
          {/* Tab Selection */}
          <div className="flex overflow-x-auto bg-slate-900/60 border-b border-slate-800 px-3 py-2 gap-1 scrollbar-none">
            {navTabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    active 
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
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
              <div className="space-y-4 animate-in fade-in duration-150">
                <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-4">Personal Contact Information</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={canonical.personal?.name || ''} 
                      onChange={e => updatePersonal('name', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={canonical.personal?.email || ''} 
                      onChange={e => updatePersonal('email', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                    <input 
                      type="text" 
                      value={canonical.personal?.phone || ''} 
                      onChange={e => updatePersonal('phone', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Location / City</label>
                    <input 
                      type="text" 
                      value={canonical.personal?.location || ''} 
                      onChange={e => updatePersonal('location', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">LinkedIn URL</label>
                    <input 
                      type="text" 
                      value={canonical.personal?.linkedin || ''} 
                      onChange={e => updatePersonal('linkedin', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">GitHub / Portfolio URL</label>
                    <input 
                      type="text" 
                      value={canonical.personal?.github || ''} 
                      onChange={e => updatePersonal('github', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">Professional Summary</h4>
                <p className="text-xs text-slate-400">Highlight your career goals, strengths, and background in 2-3 sentences.</p>
                
                <textarea 
                  value={canonical.professional_summary || ''} 
                  onChange={e => updateSummary(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-orange-500 leading-relaxed"
                  placeholder="e.g. Ambitious Computer Science graduate with hands-on experience in full-stack web development..."
                />
              </div>
            )}

            {/* 3. Education & CGPA Tab */}
            {activeTab === 'education' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Education & Academic Marks</h4>
                  <button 
                    onClick={addEducation}
                    className="btn btn-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-none flex items-center gap-1 font-bold"
                  >
                    <Plus size={12} /> Add Education
                  </button>
                </div>

                {canonical.education?.map((edu, idx) => (
                  <div key={idx} className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl relative space-y-3">
                    <button 
                      onClick={() => removeEducation(idx)}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors p-1"
                      title="Remove entry"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Degree / Course</label>
                        <input 
                          type="text" 
                          value={edu.degree || ''} 
                          onChange={e => updateEducation(idx, 'degree', e.target.value)}
                          placeholder="e.g. B.Tech Computer Science / Class XII"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Institution / School</label>
                        <input 
                          type="text" 
                          value={edu.institution || ''} 
                          onChange={e => updateEducation(idx, 'institution', e.target.value)}
                          placeholder="e.g. iLEAD / St. Xavier's"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Graduation Year / Duration</label>
                        <input 
                          type="text" 
                          value={edu.graduation_date || ''} 
                          onChange={e => updateEducation(idx, 'graduation_date', e.target.value)}
                          placeholder="e.g. 2026 or 2022 - 2026"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-orange-400 mb-1">CGPA / Percentage Marks</label>
                        <input 
                          type="text" 
                          value={edu.gpa || ''} 
                          onChange={e => updateEducation(idx, 'gpa', e.target.value)}
                          placeholder="e.g. 8.75 CGPA or 85%"
                          className="w-full bg-slate-950 border border-orange-500/40 rounded-lg px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 4. Experience Tab */}
            {activeTab === 'experience' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Work & Internship Experience</h4>
                  <button 
                    onClick={addExperience}
                    className="btn btn-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-none flex items-center gap-1 font-bold"
                  >
                    <Plus size={12} /> Add Experience
                  </button>
                </div>

                {canonical.experience?.map((exp, idx) => (
                  <div key={idx} className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl relative space-y-3">
                    <button 
                      onClick={() => removeExperience(idx)}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors p-1"
                      title="Remove entry"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Company / Organization</label>
                        <input 
                          type="text" 
                          value={exp.company || ''} 
                          onChange={e => updateExperience(idx, 'company', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Job Role / Position</label>
                        <input 
                          type="text" 
                          value={exp.position || ''} 
                          onChange={e => updateExperience(idx, 'position', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Description / Responsibilities</label>
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
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Key Projects</h4>
                  <button 
                    onClick={addProject}
                    className="btn btn-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-none flex items-center gap-1 font-bold"
                  >
                    <Plus size={12} /> Add Project
                  </button>
                </div>

                {canonical.projects?.map((proj, idx) => (
                  <div key={idx} className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl relative space-y-3">
                    <button 
                      onClick={() => removeProject(idx)}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Project Title</label>
                        <input 
                          type="text" 
                          value={proj.title || ''} 
                          onChange={e => updateProject(idx, 'title', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Technologies Used (comma separated)</label>
                        <input 
                          type="text" 
                          value={Array.isArray(proj.technologies) ? proj.technologies.join(', ') : (proj.technologies || '')} 
                          onChange={e => updateProject(idx, 'technologies', e.target.value)}
                          placeholder="e.g. React, Python, PostgreSQL"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Project Summary</label>
                      <textarea 
                        value={proj.description || ''} 
                        onChange={e => updateProject(idx, 'description', e.target.value)}
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 6. Skills Tab */}
            {activeTab === 'skills' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Skills & Technical Competencies</h4>
                <p className="text-xs text-slate-400">Enter skills separated by commas.</p>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Key Skills</label>
                  <textarea 
                    value={canonical.skills?.[0]?.items ? canonical.skills[0].items.join(', ') : ''} 
                    onChange={e => updateSkills(0, e.target.value)}
                    rows={4}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-orange-500"
                    placeholder="Python, React, SQL, Problem Solving, Communication..."
                  />
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Side: Live Document Preview Panel */}
        <div className="flex-1 bg-slate-900 flex flex-col overflow-hidden relative">
          
          <div className="bg-slate-950/80 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live HTML Preview
            </span>
            <span>Scale: 100%</span>
          </div>

          <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center bg-slate-900">
            <div className="w-full max-w-[820px] bg-white shadow-2xl rounded-sm overflow-hidden min-h-[1100px]">
              <iframe
                ref={iframeRef}
                title="Resume Live Preview"
                className="w-full h-[1120px] border-none bg-white"
              />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
