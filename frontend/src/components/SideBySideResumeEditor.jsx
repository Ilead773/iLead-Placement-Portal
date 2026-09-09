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
  const [templateHtml, setTemplateHtml] = useState('');
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
      achievements: [],
      strengths: [],
      extra_curricular: []
    };
  });

  const iframeRef = useRef(null);

  // Fetch complete resume details and HTML template on mount
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
        setCanonical(detailRes.data.canonical_json);
      }
      setTemplateHtml(htmlRes.data?.html || '');
    } catch (err) {
      console.error('Failed to load initial resume data', err);
      toast.error('Failed to load resume details');
    } finally {
      setLoading(false);
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
      if (field === 'technologies' && typeof value === 'string') {
        value = value.split(',').map(s => s.trim()).filter(Boolean);
      }
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, projects: updated };
    });
  };

  const removeProject = (index) => {
    setCanonical(prev => {
      const updated = (prev.projects || []).filter((_, i) => i !== index);
      return { ...prev, projects: updated };
    });
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

  // Languages & Strengths Helpers
  const updateCommaSeparated = (field, str) => {
    const items = str.split(',').map(s => s.trim()).filter(Boolean);
    setCanonical(prev => ({
      ...prev,
      [field]: items
    }));
  };

  // Helper to find a section container by heading keywords across templates
  const findSectionByHeader = (doc, keywords) => {
    const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, .section-title, .title'));
    for (const h of headings) {
      const text = h.textContent.trim().toUpperCase();
      if (keywords.some(kw => text.includes(kw.toUpperCase()))) {
        let container = h.closest('.resume-section, .sidebar-section, .main-section, .section, section') || h.parentElement;
        return { heading: h, container };
      }
    }
    return null;
  };

  // Render live HTML document into preview iframe
  useEffect(() => {
    renderLiveHtml();
  }, [canonical, templateHtml]);

  const renderLiveHtml = () => {
    if (!iframeRef.current) return;
    const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (!iframeDoc) return;

    if (!templateHtml) {
      iframeDoc.open();
      iframeDoc.write('<html><body style="font-family:sans-serif;padding:30px;color:#666;">Loading Live Preview...</body></html>');
      iframeDoc.close();
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(templateHtml, 'text/html');

    // 1. Personal Info Updates
    const personal = canonical.personal || {};
    if (personal.name !== undefined) {
      const nameEl = doc.querySelector('h1, .candidate-name');
      if (nameEl) nameEl.textContent = personal.name || 'Full Name';
    }

    const linkedinEl = doc.querySelector('.linkedin-link a, a[href*="linkedin"]');
    if (linkedinEl) {
      if (personal.linkedin) {
        linkedinEl.href = personal.linkedin;
        linkedinEl.textContent = 'LinkedIn Profile';
        if (linkedinEl.parentElement) linkedinEl.parentElement.style.display = '';
      } else if (linkedinEl.parentElement) {
        linkedinEl.parentElement.style.display = 'none';
      }
    }

    const githubEl = doc.querySelector('.github-link a, a[href*="github"]');
    if (githubEl) {
      if (personal.github) {
        githubEl.href = personal.github;
        githubEl.textContent = 'GitHub Profile';
        if (githubEl.parentElement) githubEl.parentElement.style.display = '';
      } else if (githubEl.parentElement) {
        githubEl.parentElement.style.display = 'none';
      }
    }

    const portfolioEl = doc.querySelector('.portfolio-link a, a[href*="portfolio"]');
    if (portfolioEl) {
      if (personal.portfolio) {
        portfolioEl.href = personal.portfolio;
        portfolioEl.textContent = 'Portfolio Link';
        if (portfolioEl.parentElement) portfolioEl.parentElement.style.display = '';
      } else if (portfolioEl.parentElement) {
        portfolioEl.parentElement.style.display = 'none';
      }
    }

    // 2. Summary Section
    const summarySec = findSectionByHeader(doc, ['CAREER OBJECTIVE', 'PROFESSIONAL SUMMARY', 'SUMMARY', 'OBJECTIVE']);
    if (summarySec) {
      if (!canonical.professional_summary?.trim()) {
        summarySec.container.style.display = 'none';
      } else {
        summarySec.container.style.display = '';
        const p = summarySec.container.querySelector('p, .summary-text');
        if (p) p.textContent = canonical.professional_summary;
      }
    }

    // 3. Education Section
    const eduSec = findSectionByHeader(doc, ['EDUCATION', 'QUALIFICATION', 'ACADEMIC BACKGROUND']);
    const eduList = Array.isArray(canonical.education) ? canonical.education : [];
    if (eduSec) {
      if (eduList.length === 0) {
        eduSec.container.style.display = 'none';
      } else {
        eduSec.container.style.display = '';
        const tbody = eduSec.container.querySelector('tbody');
        if (tbody) {
          tbody.innerHTML = eduList.map(edu => `
            <tr>
              <td class="bold-text">${edu.degree || '-'}</td>
              <td>${edu.institution || '-'}</td>
              <td>${edu.field || '-'}</td>
              <td>${edu.graduation_date || '-'}</td>
              <td class="bold-text">${edu.gpa || '-'}</td>
            </tr>
          `).join('');
        }
      }
    }

    // 4. Experience Section
    const expSec = findSectionByHeader(doc, ['EXPERIENCE', 'WORK EXPERIENCE', 'EMPLOYMENT']);
    const expList = Array.isArray(canonical.experience) ? canonical.experience : [];
    if (expSec) {
      if (expList.length === 0) {
        expSec.container.style.display = 'none';
      } else {
        expSec.container.style.display = '';
        const oldItems = expSec.container.querySelectorAll('.experience-item, .item, .resume-item');
        oldItems.forEach(el => el.remove());

        expList.forEach(exp => {
          const itemDiv = doc.createElement('div');
          itemDiv.className = 'experience-item resume-item';
          itemDiv.style.marginBottom = '12px';
          itemDiv.innerHTML = `
            <div class="exp-header item-header">
              <span class="company-name font-bold">${exp.company || ''}</span>
              ${exp.position ? ` | <span class="designation job-title">${exp.position}</span>` : ''}
              ${exp.duration?.start || exp.start_date ? ` | <span class="duration item-date">(${exp.duration?.start || exp.start_date || ''} – ${exp.duration?.current || !exp.duration?.end ? 'Present' : exp.duration?.end})</span>` : ''}
            </div>
            ${exp.description ? `<p class="exp-desc item-description" style="margin-top:4px;font-size:12px;color:#333;">${exp.description}</p>` : ''}
            ${Array.isArray(exp.achievements) && exp.achievements.length > 0 ? `
              <ul class="bullet-list" style="margin-top:4px;padding-left:18px;font-size:12px;">
                ${exp.achievements.map(a => `<li>${a}</li>`).join('')}
              </ul>
            ` : ''}
          `;
          expSec.container.appendChild(itemDiv);
        });
      }
    }

    // 5. Projects Section
    const projSec = findSectionByHeader(doc, ['PROJECTS', 'KEY PROJECTS', 'ACADEMIC & KEY PROJECTS']);
    const projList = Array.isArray(canonical.projects) ? canonical.projects : [];
    if (projSec) {
      if (projList.length === 0) {
        projSec.container.style.display = 'none';
      } else {
        projSec.container.style.display = '';
        const oldItems = projSec.container.querySelectorAll('.experience-item, .item, .resume-item');
        oldItems.forEach(el => el.remove());

        projList.forEach(proj => {
          const itemDiv = doc.createElement('div');
          itemDiv.className = 'experience-item resume-item';
          itemDiv.style.marginBottom = '10px';
          const techStr = Array.isArray(proj.technologies) ? proj.technologies.join(', ') : (proj.technologies || '');
          itemDiv.innerHTML = `
            <div class="exp-header item-header">
              <span class="company-name project-title font-bold">${proj.title || ''}</span>
              ${proj.date ? ` | <span class="duration item-date">(${proj.date})</span>` : ''}
            </div>
            ${proj.description ? `<p class="exp-desc item-description" style="margin-top:4px;font-size:12px;color:#333;">${proj.description}</p>` : ''}
            ${techStr ? `<div class="project-tech" style="font-size:11px;margin-top:2px;"><strong>Tech:</strong> ${techStr}</div>` : ''}
            ${proj.link ? `<div class="project-link" style="font-size:11px;margin-top:2px;"><a href="${proj.link}" target="_blank">${proj.link}</a></div>` : ''}
          `;
          projSec.container.appendChild(itemDiv);
        });
      }
    }

    // 6. Skills Section
    const skillsSec = findSectionByHeader(doc, ['TECHNICAL SKILLS', 'KEY SKILLS', 'SKILLS']);
    const skillsList = Array.isArray(canonical.skills) ? canonical.skills : [];
    const hasSkills = skillsList.some(s => (s.items && s.items.length > 0) || (typeof s === 'string' && s.trim()));
    if (skillsSec) {
      if (!hasSkills) {
        skillsSec.container.style.display = 'none';
      } else {
        skillsSec.container.style.display = '';
        const ul = skillsSec.container.querySelector('ul');
        if (ul) {
          const allItems = [];
          skillsList.forEach(s => {
            if (Array.isArray(s.items)) allItems.push(...s.items);
            else if (typeof s === 'string') allItems.push(s);
          });
          ul.innerHTML = allItems.map(item => `<li>${item}</li>`).join('');
        }
      }
    }

    // 7. Certifications Section
    const certSec = findSectionByHeader(doc, ['CERTIFICATIONS', 'CERTIFICATION']);
    const certList = Array.isArray(canonical.certifications) ? canonical.certifications : [];
    if (certSec) {
      if (certList.length === 0) {
        certSec.container.style.display = 'none';
      } else {
        certSec.container.style.display = '';
        const ul = certSec.container.querySelector('ul');
        if (ul) {
          ul.innerHTML = certList.map(c => `<li>${c.name || ''}${c.issuer ? ` – ${c.issuer}` : ''}</li>`).join('');
        }
      }
    }

    // 8. Languages Section
    const langSec = findSectionByHeader(doc, ['LANGUAGES KNOWN', 'LANGUAGES']);
    const langList = Array.isArray(canonical.languages) ? canonical.languages : [];
    if (langSec) {
      if (langList.length === 0) {
        langSec.container.style.display = 'none';
      } else {
        langSec.container.style.display = '';
        const ul = langSec.container.querySelector('ul');
        if (ul) {
          ul.innerHTML = langList.map(l => `<li>${l}</li>`).join('');
        }
      }
    }

    // 9. Strengths Section
    const strSec = findSectionByHeader(doc, ['STRENGTHS']);
    const strList = Array.isArray(canonical.strengths) ? canonical.strengths : [];
    if (strSec) {
      if (strList.length === 0) {
        strSec.container.style.display = 'none';
      } else {
        strSec.container.style.display = '';
        const ul = strSec.container.querySelector('ul');
        if (ul) {
          ul.innerHTML = strList.map(s => `<li>${s}</li>`).join('');
        }
      }
    }

    // Write updated HTML to iframe
    iframeDoc.open();
    iframeDoc.write(doc.documentElement.outerHTML);
    iframeDoc.close();
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
                    value={canonical.skills?.[0]?.items ? canonical.skills[0].items.join(', ') : ''} 
                    onChange={e => updateSkills(0, e.target.value)}
                    rows={6}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-orange-500"
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
                    value={Array.isArray(canonical.languages) ? canonical.languages.join(', ') : ''} 
                    onChange={e => updateCommaSeparated('languages', e.target.value)}
                    placeholder="e.g. English, Hindi, Bengali"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Strengths (comma separated)</label>
                  <input 
                    type="text" 
                    value={Array.isArray(canonical.strengths) ? canonical.strengths.join(', ') : ''} 
                    onChange={e => updateCommaSeparated('strengths', e.target.value)}
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
