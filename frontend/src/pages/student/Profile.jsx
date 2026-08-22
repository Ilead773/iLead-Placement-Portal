// src/pages/student/Profile.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import { MapPin, Phone, GraduationCap, ShieldCheck, ShieldAlert, Linkedin, Github, Quote, FileText, Download, User, Briefcase, FileCode, Award, ChevronRight, Edit } from 'lucide-react';

const getFullImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  const hostBase = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${hostBase}${cleanPath}`;
};

export default function StudentProfile() {
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completion, setCompletion] = useState(null);
  const fileInputRef = useRef(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeProfileTab, setActiveProfileTab] = useState('info');
  const [primaryResume, setPrimaryResume] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Crop Photo States
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [fitScale, setFitScale] = useState(1);

  // Modal States
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showBasicModal, setShowBasicModal] = useState(false);
  const [showExpModal, setShowExpModal] = useState(false);
  const [showProjModal, setShowProjModal] = useState(false);
  const [showEduModal, setShowEduModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showExtraModal, setShowExtraModal] = useState(false);

  // Editing States
  const [editingExpId, setEditingExpId] = useState(null);
  const [editingProjId, setEditingProjId] = useState(null);
  const [editingSkillId, setEditingSkillId] = useState(null);
  const [editingEduId, setEditingEduId] = useState(null);
  const [editingCertId, setEditingCertId] = useState(null);
  const [editingAwardId, setEditingAwardId] = useState(null);
  const [editingExtraId, setEditingExtraId] = useState(null);

  // Form States
  const [newSkill, setNewSkill] = useState({ name: '', category: 'Technical', proficiency: 'Intermediate' });
  const [basicInfo, setBasicInfo] = useState({ 
    phone_number: '', 
    location: '', 
    professional_summary: '', 
    linkedin: '', 
    github: '', 
    portfolio: '',
    email_job_alerts: true,
    year: '',
    category: '',
    backlogs: false
  });
  const [newExp, setNewExp] = useState({ company: '', position: '', start_date: '', end_date: '', is_current: false, description: '' });
  const [newProj, setNewProj] = useState({ title: '', description: '', technologies: '', link: '', date: '' });
  const [newEdu, setNewEdu] = useState({ institution: '', degree: '', field: '', graduation_date: '', start_year: '', end_year: '', gpa: '', honors: '' });
  const [newCert, setNewCert] = useState({ name: '', issuer: '', date: '', credential_url: '' });
  const [newAward, setNewAward] = useState({ title: '', issuer: '', date: '', description: '' });
  const [newExtra, setNewExtra] = useState({ title: '', description: '', date: '' });

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setFitScale(1);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    // Reset file input value to allow uploading the same file again
    e.target.value = null;
  };

  const handleSaveCrop = async () => {
    if (!cropImageSrc) return;

    try {
      setPhotoLoading(true);

      // Create an image object to load the natural dimensions
      const img = new Image();
      img.src = cropImageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Offscreen canvas at 400x400 px
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');

      // Fill white background (or transparent if desired, but white is standard for profile pictures)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 400);

      // Viewport size is 200, canvas size is 400.
      const canvasToViewportRatio = 2.0;
      const baseScale = 200 / Math.min(img.naturalWidth, img.naturalHeight);
      const finalScale = (zoom * baseScale) * canvasToViewportRatio;

      // 1. Move origin to canvas center
      ctx.translate(200, 200);

      // 2. Apply drag translation scaled up by canvas ratio
      ctx.translate(offset.x * canvasToViewportRatio, offset.y * canvasToViewportRatio);

      // 3. Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // 4. Apply zoom scale
      ctx.scale(finalScale, finalScale);

      // 5. Draw image centered around local origin
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      // Convert to blob and upload
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('Failed to process image.');
          setPhotoLoading(false);
          return;
        }

        const croppedFile = new File([blob], `profile_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('profile_picture', croppedFile);

        try {
          await api.post('profiles/me/photo/', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          toast.success('Profile photo uploaded!');
          setShowCropModal(false);
          setCropImageSrc(null);
          fetchProfile();
        } catch (err) {
          const errorMsg = err.response?.data?.error || 'Upload failed';
          toast.error(`Upload failed: ${errorMsg}`);
        } finally {
          setPhotoLoading(false);
        }
      }, 'image/jpeg', 0.95);
    } catch (err) {
      toast.error('Failed to load image for cropping');
      setPhotoLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;
    try {
      setPhotoLoading(true);
      await api.delete('profiles/me/photo/');
      toast.success('Profile photo removed!');
      fetchProfile();
    } catch (err) {
      toast.error('Failed to remove profile photo');
    } finally {
      setPhotoLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchResumesData();
  }, []);

  useEffect(() => {
    if (loading) return;

    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const focus = params.get('focus');

    if (tab) {
      if (tab === 'skills') setShowSkillModal(true);
      if (tab === 'projects') setShowProjModal(true);
      if (tab === 'experience') setShowExpModal(true);
    }

    if (focus) {
      if (['strengths', 'languages_known', 'summary', 'linkedin', 'github'].includes(focus)) {
        setShowBasicModal(true);
        setTimeout(() => {
          let inputId = 'strengths-input';
          if (focus === 'languages_known') inputId = 'languages-input';
          if (focus === 'summary') inputId = 'summary-input';
          if (focus === 'linkedin') inputId = 'linkedin-input';
          if (focus === 'github') inputId = 'github-input';

          const el = document.getElementById(inputId);
          if (el) el.focus();
        }, 300);
      }
    }
  }, [loading, location.search]);

  const handleSuggestionClick = (suggestion) => {
    const s = suggestion.toLowerCase();
    if (s.includes('strength')) {
      setShowBasicModal(true);
      setTimeout(() => {
        const el = document.getElementById('strengths-input');
        if (el) el.focus();
      }, 150);
    } else if (s.includes('language')) {
      setShowBasicModal(true);
      setTimeout(() => {
        const el = document.getElementById('languages-input');
        if (el) el.focus();
      }, 150);
    } else if (s.includes('summary')) {
      setShowBasicModal(true);
      setTimeout(() => {
        const el = document.getElementById('summary-input');
        if (el) el.focus();
      }, 150);
    } else if (s.includes('linkedin')) {
      setShowBasicModal(true);
      setTimeout(() => {
        const el = document.getElementById('linkedin-input');
        if (el) el.focus();
      }, 150);
    } else if (s.includes('github')) {
      setShowBasicModal(true);
      setTimeout(() => {
        const el = document.getElementById('github-input');
        if (el) el.focus();
      }, 150);
    } else if (s.includes('experience') || s.includes('internship')) {
      setShowExpModal(true);
    } else if (s.includes('extracurricular')) {
      setShowExtraModal(true);
    } else if (s.includes('project')) {
      setShowProjModal(true);
    } else if (s.includes('skill')) {
      setShowSkillModal(true);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const [profileRes, completionRes] = await Promise.all([
        api.get('profiles/me/'),
        api.get('profiles/me/completion/')
      ]);
      setProfile(profileRes.data);
      setCompletion(completionRes.data);
      setBasicInfo({
        phone_number: profileRes.data.student_phone || '',
        location: profileRes.data.location || '',
        professional_summary: profileRes.data.professional_summary || '',
        linkedin: profileRes.data.linkedin || '',
        github: profileRes.data.github || '',
        portfolio: profileRes.data.portfolio || '',
        email_job_alerts: profileRes.data.email_job_alerts !== undefined ? profileRes.data.email_job_alerts : true,
        year: profileRes.data.student_year || '',
        category: profileRes.data.student_category || '',
        backlogs: profileRes.data.student_backlogs || false,
        strengths: Array.isArray(profileRes.data.strengths) ? profileRes.data.strengths.join(', ') : '',
        languages_known: Array.isArray(profileRes.data.languages_known) ? profileRes.data.languages_known.join(', ') : '',
      });
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchResumesData = async () => {
    try {
      const [builtRes, uploadRes] = await Promise.all([
        api.get('resumes/'),
        api.get('resumes/uploads/')
      ]);
      
      const built = Array.isArray(builtRes.data) ? builtRes.data.map(r => ({ ...r, type: 'built' })) : [];
      const uploaded = Array.isArray(uploadRes.data) ? uploadRes.data.map(r => ({ ...r, type: 'uploaded' })) : [];
      
      const all = [...built, ...uploaded];
      const primary = all.find(r => r.is_primary === true);
      setPrimaryResume(primary || null);
    } catch (err) {
      console.error('Failed to load resumes on profile', err);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size exceeds 2MB limit');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingResume(true);
      const uploadRes = await api.post('resumes/uploads/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Resume PDF uploaded successfully!');
      
      await api.post(`resumes/uploads/${uploadRes.data.id}/set-primary/`);
      toast.success('Uploaded resume set as active!');
      
      fetchResumesData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload resume');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleDownloadResume = async (resume) => {
    try {
      const endpoint = resume.type === 'uploaded' 
        ? `resumes/uploads/${resume.id}/download/` 
        : `resumes/${resume.id}/download/`;
        
      const response = await api.get(endpoint, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', resume.title || resume.original_filename || 'resume.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to download resume');
    }
  };

  const handleUpdateBasic = async (e) => {
    e.preventDefault();
    try {
      const fixUrl = (url) => {
        if (!url || url.startsWith('http://') || url.startsWith('https://')) return url;
        return `https://${url}`;
      };

      const sanitizedInfo = {
        ...basicInfo,
        linkedin: fixUrl(basicInfo.linkedin),
        github: fixUrl(basicInfo.github),
        portfolio: fixUrl(basicInfo.portfolio),
        strengths: basicInfo.strengths ? basicInfo.strengths.split(',').map(s => s.trim()).filter(s => s !== '') : [],
        languages_known: basicInfo.languages_known ? basicInfo.languages_known.split(',').map(l => l.trim()).filter(l => l !== '') : [],
      };

      await api.patch('profiles/me/', sanitizedInfo);
      toast.success('Basic info updated!');
      setShowBasicModal(false);
      fetchProfile();
    } catch (err) {
      const errorMsg = err.response?.data ? Object.values(err.response.data)[0] : 'Update failed';
      toast.error(`Update failed: ${errorMsg}`);
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    try {
      if (editingSkillId) {
        await api.patch(`profiles/me/skills/${editingSkillId}/`, newSkill);
        toast.success('Skill updated!');
      } else {
        await api.post('profiles/me/skills/', newSkill);
        toast.success('Skill added!');
      }
      setShowSkillModal(false);
      setEditingSkillId(null);
      setNewSkill({ name: '', category: 'Technical', proficiency: 'Beginner' });
      fetchProfile();
    } catch (err) {
      const errorMsg = err.response?.data ? Object.values(err.response.data)[0] : 'Failed to save skill';
      toast.error(`Failed: ${errorMsg}`);
    }
  };

  const handleAddExperience = async (e) => {
    e.preventDefault();
    try {
      const expData = { ...newExp };
      if (!expData.start_date) delete expData.start_date;
      if (!expData.end_date) delete expData.end_date;
      
      if (editingExpId) {
        await api.patch(`profiles/me/experiences/${editingExpId}/`, expData);
        toast.success('Experience updated!');
      } else {
        await api.post('profiles/me/experiences/', expData);
        toast.success('Experience added!');
      }
      setShowExpModal(false);
      setEditingExpId(null);
      setNewExp({ company: '', position: '', start_date: '', end_date: '', is_current: false, description: '' });
      fetchProfile();
    } catch (err) {
      const errorMsg = err.response?.data ? Object.values(err.response.data)[0] : 'Failed to save experience';
      toast.error(`Failed: ${errorMsg}`);
    }
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    try {
      const fixUrl = (url) => {
        if (!url || url.startsWith('http://') || url.startsWith('https://')) return url;
        return `https://${url}`;
      };
      const projectData = {
        ...newProj,
        link: fixUrl(newProj.link),
        technologies: Array.isArray(newProj.technologies) ? newProj.technologies : newProj.technologies.split(',').map(t => t.trim()).filter(t => t !== ''),
        date: newProj.date || null
      };

      if (editingProjId) {
        await api.patch(`profiles/me/projects/${editingProjId}/`, projectData);
        toast.success('Project updated!');
      } else {
        await api.post('profiles/me/projects/', projectData);
        toast.success('Project added!');
      }
      setShowProjModal(false);
      setEditingProjId(null);
      setNewProj({ title: '', description: '', technologies: '', link: '', date: '' });
      fetchProfile();
    } catch (err) {
      const errorMsg = err.response?.data ? Object.values(err.response.data)[0] : 'Failed to save project';
      toast.error(`Failed: ${errorMsg}`);
    }
  };

  const startEditExperience = (exp) => {
    setNewExp(exp);
    setEditingExpId(exp.id);
    setShowExpModal(true);
  };

  const startEditProject = (proj) => {
    setNewProj({
      ...proj,
      technologies: Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies
    });
    setEditingProjId(proj.id);
    setShowProjModal(true);
  };

  const startEditSkill = (skill) => {
    setNewSkill(skill);
    setEditingSkillId(skill.id);
    setShowSkillModal(true);
  };

  const handleDeleteSkill = async (id) => {
    if (!window.confirm('Delete this skill?')) return;
    try {
      await api.delete(`profiles/me/skills/${id}/`);
      toast.success('Skill removed');
      fetchProfile();
    } catch (err) {
      toast.error('Failed to remove skill');
    }
  };

  const handleDeleteExperience = async (id) => {
    if (!window.confirm('Delete this experience?')) return;
    try {
      await api.delete(`profiles/me/experiences/${id}/`);
      toast.success('Experience removed');
      fetchProfile();
    } catch (err) {
      toast.error('Failed to remove experience');
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await api.delete(`profiles/me/projects/${id}/`);
      toast.success('Project removed');
      fetchProfile();
    } catch (err) {
      toast.error('Failed to remove project');
    }
  };

  const handleAddEducation = async (e) => {
    e.preventDefault();
    try {
      const eduData = { ...newEdu };
      if (!eduData.graduation_date) delete eduData.graduation_date;
      if (eduData.gpa === '') delete eduData.gpa;
      if (eduData.start_year === '') delete eduData.start_year;
      if (eduData.end_year === '') delete eduData.end_year;

      if (editingEduId) {
        await api.patch(`profiles/me/education/${editingEduId}/`, eduData);
        toast.success('Education entry updated!');
      } else {
        await api.post('profiles/me/education/', eduData);
        toast.success('Education entry added!');
      }
      setShowEduModal(false);
      setEditingEduId(null);
      setNewEdu({ institution: '', degree: '', field: '', graduation_date: '', start_year: '', end_year: '', gpa: '', honors: '' });
      fetchProfile();
    } catch (err) {
      const errorMsg = err.response?.data ? Object.values(err.response.data)[0] : 'Failed to save education';
      toast.error(`Failed: ${errorMsg}`);
    }
  };

  const handleAddCertification = async (e) => {
    e.preventDefault();
    try {
      const certData = { ...newCert };
      if (!certData.date) delete certData.date;
      if (certData.credential_url) {
        if (!certData.credential_url.startsWith('http://') && !certData.credential_url.startsWith('https://')) {
          certData.credential_url = `https://${certData.credential_url}`;
        }
      } else {
        delete certData.credential_url;
      }

      if (editingCertId) {
        await api.patch(`profiles/me/certifications/${editingCertId}/`, certData);
        toast.success('Certification updated!');
      } else {
        await api.post('profiles/me/certifications/', certData);
        toast.success('Certification added!');
      }
      setShowCertModal(false);
      setEditingCertId(null);
      setNewCert({ name: '', issuer: '', date: '', credential_url: '' });
      fetchProfile();
    } catch (err) {
      const errorMsg = err.response?.data ? Object.values(err.response.data)[0] : 'Failed to save certification';
      toast.error(`Failed: ${errorMsg}`);
    }
  };

  const handleAddAchievement = async (e) => {
    e.preventDefault();
    try {
      const awardData = { ...newAward };
      if (!awardData.date) delete awardData.date;

      if (editingAwardId) {
        await api.patch(`profiles/me/achievements/${editingAwardId}/`, awardData);
        toast.success('Award/Achievement updated!');
      } else {
        await api.post('profiles/me/achievements/', awardData);
        toast.success('Award/Achievement added!');
      }
      setShowAwardModal(false);
      setEditingAwardId(null);
      setNewAward({ title: '', issuer: '', date: '', description: '' });
      fetchProfile();
    } catch (err) {
      const errorMsg = err.response?.data ? Object.values(err.response.data)[0] : 'Failed to save achievement';
      toast.error(`Failed: ${errorMsg}`);
    }
  };

  const startEditEducation = (edu) => {
    setNewEdu(edu);
    setEditingEduId(edu.id);
    setShowEduModal(true);
  };

  const startEditCertification = (cert) => {
    setNewCert(cert);
    setEditingCertId(cert.id);
    setShowCertModal(true);
  };

  const startEditAchievement = (ach) => {
    setNewAward(ach);
    setEditingAwardId(ach.id);
    setShowAwardModal(true);
  };

  const handleDeleteEducation = async (id) => {
    if (!window.confirm('Delete this education entry?')) return;
    try {
      await api.delete(`profiles/me/education/${id}/`);
      toast.success('Education entry removed');
      fetchProfile();
    } catch (err) {
      toast.error('Failed to remove education entry');
    }
  };

  const handleDeleteCertification = async (id) => {
    if (!window.confirm('Delete this certification?')) return;
    try {
      await api.delete(`profiles/me/certifications/${id}/`);
      toast.success('Certification removed');
      fetchProfile();
    } catch (err) {
      toast.error('Failed to remove certification');
    }
  };

  const handleDeleteAchievement = async (id) => {
    if (!window.confirm('Delete this achievement?')) return;
    try {
      await api.delete(`profiles/me/achievements/${id}/`);
      toast.success('Award/Achievement removed');
      fetchProfile();
    } catch (err) {
      toast.error('Failed to remove achievement');
    }
  };

  const handleAddExtra = async (e) => {
    e.preventDefault();
    try {
      const extraData = { ...newExtra };
      if (!extraData.date) delete extraData.date;

      if (editingExtraId) {
        await api.patch(`profiles/me/extracurricular/${editingExtraId}/`, extraData);
        toast.success('Extracurricular activity updated!');
      } else {
        await api.post('profiles/me/extracurricular/', extraData);
        toast.success('Extracurricular activity added!');
      }
      setShowExtraModal(false);
      setEditingExtraId(null);
      setNewExtra({ title: '', description: '', date: '' });
      fetchProfile();
    } catch (err) {
      const errorMsg = err.response?.data ? Object.values(err.response.data)[0] : 'Failed to save activity';
      toast.error(`Failed: ${errorMsg}`);
    }
  };

  const startEditExtra = (act) => {
    setNewExtra(act);
    setEditingExtraId(act.id);
    setShowExtraModal(true);
  };

  const handleDeleteExtra = async (id) => {
    if (!window.confirm('Delete this extracurricular activity?')) return;
    try {
      await api.delete(`profiles/me/extracurricular/${id}/`);
      toast.success('Extracurricular activity removed');
      fetchProfile();
    } catch (err) {
      toast.error('Failed to remove extracurricular activity');
    }
  };

  if (loading) return <div className="loading-state">Loading Profile...</div>;

  return (
    <div className="profile-container p-4 md:p-6 animate-in">
      <div className="responsive-header-flex mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Professional Profile</h1>
          <p className="text-muted">Keep your profile updated to get better placement opportunities.</p>
        </div>
        
        {/* Profile Status Card */}
        <div className="completion-card glass-panel p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${completion?.suggestions?.length === 0 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
            {completion?.suggestions?.length === 0 ? '✓' : '⚠️'}
          </div>
          <div>
            <div className="text-sm font-semibold">Profile Status</div>
            <div className="text-xs text-muted">
              {completion?.suggestions?.length === 0 
                ? '✅ All details filled' 
                : '❌ Pending details to fill'}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Top Profile Cards */}
      {isMobile && (
        <div className="space-y-4 mb-6">
          {/* Avatar Details Card */}
          <div className="card p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-border-color shadow-sm">
            <div className="flex items-center gap-4">
              {/* Circular Avatar with blue border and green check */}
              <div className="relative shrink-0 cursor-pointer" onClick={handlePhotoClick}>
                <div className="w-20 h-20 rounded-full border-2 border-blue-500 p-0.5 overflow-hidden bg-white">
                  {photoLoading && (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                      <div className="spinner w-6 h-6 border-white border-t-transparent"></div>
                    </div>
                  )}
                  {profile?.profile_picture ? (
                    <img 
                      src={getFullImageUrl(profile.profile_picture)} 
                      alt={profile?.student_name}
                      className="w-full h-full rounded-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-2xl">
                      {(profile?.student_name || 'S').charAt(0)}
                    </div>
                  )}
                </div>
                {/* Green checkmark at bottom right */}
                <div className="absolute bottom-0 right-0 w-5.5 h-5.5 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-sm text-[9px] font-bold">
                  ✓
                </div>
              </div>

              {/* User Details */}
              <div className="min-w-0 flex-1">
                <div>
                  <h2 className="text-md font-bold text-primary leading-snug">{profile?.student_name || 'N/A'}</h2>
                  <p className="text-[11px] text-blue-500 font-bold mt-1">
                    {profile?.course} {profile?.stream ? `(${profile.stream})` : ''}
                  </p>
                </div>
                
                {/* Student ID Tag */}
                <div className="inline-block mt-1.5 px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded-md border border-border-color">
                  <span className="text-[9px] font-bold text-secondary">
                    Student ID: {profile?.student_id || 'N/A'}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1 mt-1.5 text-muted text-[10px] font-semibold">
                  <MapPin size={10} className="text-muted" />
                  <span>{profile?.location || 'Not Set'}</span>
                </div>

                {/* Edit Button */}
                <button 
                  onClick={() => setShowBasicModal(true)}
                  className="btn btn-primary btn-sm flex items-center gap-1.5 mt-3 py-1 px-3 text-[10px] rounded-xl font-bold cursor-pointer w-fit"
                >
                  <Edit size={10} /> Edit Profile
                </button>
              </div>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          {/* Profile Completion Card */}
          <div className="card p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-border-color shadow-sm">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold text-primary">Profile Completion</span>
              <span className="text-xs font-bold text-primary">{Math.round((completion?.completion_score || 0) * 100)}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.round((completion?.completion_score || 0) * 100)}%` }}
              />
            </div>
            
            <p className="text-[9px] text-muted mt-1.5 font-medium">
              {completion?.suggestions?.length === 0 ? 'Your profile is complete!' : 'Complete pending details to raise readiness.'}
            </p>
          </div>
        </div>
      )}

      {/* Mobile Profile Tab Bar */}
      {isMobile && (
        <div className="mobile-tabs-container">
          <button 
            onClick={() => setActiveProfileTab('info')}
            className={`mobile-tab-btn flex items-center justify-center gap-1.5 ${activeProfileTab === 'info' ? 'active' : ''}`}
          >
            <User size={14} /> Basic Info
          </button>
          <button 
            onClick={() => setActiveProfileTab('academics')}
            className={`mobile-tab-btn flex items-center justify-center gap-1.5 ${activeProfileTab === 'academics' ? 'active' : ''}`}
          >
            <GraduationCap size={14} /> Academics
          </button>
          <button 
            onClick={() => setActiveProfileTab('experience')}
            className={`mobile-tab-btn flex items-center justify-center gap-1.5 ${activeProfileTab === 'experience' ? 'active' : ''}`}
          >
            <Briefcase size={14} /> Experience ({profile?.experiences?.length || 0})
          </button>
          <button 
            onClick={() => setActiveProfileTab('projects')}
            className={`mobile-tab-btn flex items-center justify-center gap-1.5 ${activeProfileTab === 'projects' ? 'active' : ''}`}
          >
            <FileCode size={14} /> Projects
          </button>
          <button 
            onClick={() => setActiveProfileTab('activities')}
            className={`mobile-tab-btn flex items-center justify-center gap-1.5 ${activeProfileTab === 'activities' ? 'active' : ''}`}
          >
            <Award size={14} /> More
          </button>
        </div>
      )}

      {isMobile ? (
        <div className="space-y-6">
          {activeProfileTab === 'info' && (
            <div className="space-y-6">
              {/* Basic Information Card */}
              <div className="card p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-border-color shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-md font-bold flex items-center gap-2 text-primary">
                    <User size={18} className="text-blue-500" /> Basic Information
                  </h3>
                  <button 
                    onClick={() => setShowBasicModal(true)}
                    className="btn btn-outline btn-xs flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-primary border border-primary/20 bg-transparent text-[11px] font-bold cursor-pointer hover:bg-primary/5"
                  >
                    <Edit size={11} /> Edit
                  </button>
                </div>

                <div className="divide-y divide-border-color">
                  {/* Name Row */}
                  <div className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-border-color flex items-center justify-center text-muted">
                        <User size={14} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Name</p>
                        <p className="text-sm font-bold text-primary mt-0.5">{profile?.student_name || 'N/A'}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted/60" />
                  </div>

                  {/* Student ID Row */}
                  <div className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-border-color flex items-center justify-center text-muted">
                        <GraduationCap size={14} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Student ID</p>
                        <p className="text-sm font-bold text-primary mt-0.5">{profile?.student_id || 'N/A'}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted/60" />
                  </div>

                  {/* Email Row */}
                  <div className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-border-color flex items-center justify-center text-muted">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 17.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.626a2.25 2.25 0 0 1-2.06 0L3 8.908a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Email</p>
                        <p className="text-sm font-bold text-primary mt-0.5 break-all">{profile?.student_email || 'N/A'}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted/60" />
                  </div>

                  {/* Location Row */}
                  <div className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-border-color flex items-center justify-center text-muted">
                        <MapPin size={14} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Location</p>
                        <p className="text-sm font-bold text-primary mt-0.5">{profile?.location || 'N/A'}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted/60" />
                  </div>

                  {/* Course Row */}
                  <div className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-border-color flex items-center justify-center text-muted">
                        <GraduationCap size={14} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Course</p>
                        <p className="text-sm font-bold text-primary mt-0.5">{profile?.course || 'N/A'} {profile?.stream ? `(${profile.stream})` : ''}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted/60" />
                  </div>

                  {/* University Row */}
                  <div className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-border-color flex items-center justify-center text-muted">
                        <GraduationCap size={14} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">University / College</p>
                        <p className="text-sm font-bold text-primary mt-0.5">iLEAD Institution</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted/60" />
                  </div>
                </div>
              </div>


              {/* Social Profiles Grid */}
              <div className="card p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-border-color shadow-sm">
                <h4 className="text-xs font-bold text-primary mb-4 uppercase tracking-wider">Social Profiles</h4>
                <div className="flex flex-col gap-3">
                  {profile?.linkedin && (
                    <a href={profile.linkedin} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl hover:bg-blue-500/10 transition-colors">
                      <div className="flex items-center gap-2.5 text-blue-600 font-bold text-xs">
                        <Linkedin size={16} /> LinkedIn
                      </div>
                      <ChevronRight size={14} className="text-blue-500/60" />
                    </a>
                  )}
                  {profile?.github && profile?.student_department === 'Technology' && (
                    <a href={profile.github} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-zinc-800/5 border border-zinc-800/10 rounded-xl hover:bg-zinc-800/10 transition-colors">
                      <div className="flex items-center gap-2.5 text-primary font-bold text-xs">
                        <Github size={16} /> GitHub
                      </div>
                      <ChevronRight size={14} className="text-muted/60" />
                    </a>
                  )}
                  {profile?.portfolio && (
                    <a href={profile.portfolio} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl hover:bg-emerald-500/10 transition-colors">
                      <div className="flex items-center gap-2.5 text-emerald-600 font-bold text-xs">
                        <span className="text-sm">🌐</span> Portfolio
                      </div>
                      <ChevronRight size={14} className="text-emerald-500/60" />
                    </a>
                  )}
                </div>
              </div>

              {/* Profile Completion Suggestions */}
              <section className={`glass-panel p-5 border-l-4 rounded-2xl ${completion?.suggestions?.length > 0 ? 'border-warning bg-warning/5' : 'border-success bg-success/5'}`}>
                <h3 className="text-xs font-bold mb-3 flex items-center gap-2 text-primary">
                  <span>📋</span> Profile Status: {completion?.suggestions?.length > 0 ? 'Fill All Data' : 'All Data Filled'}
                </h3>
                {completion?.suggestions?.length > 0 ? (
                  <>
                    <p className="text-[11px] text-secondary mb-3 font-semibold">Please fill in the following details to complete your profile:</p>
                    <ul className="space-y-2">
                      {completion.suggestions.map((s, idx) => (
                        <li 
                          key={idx} 
                          onClick={() => handleSuggestionClick(s)}
                          className="text-[11px] text-warning-muted flex items-start gap-2 cursor-pointer hover:text-warning hover:translate-x-0.5 transition-all duration-200 group"
                        >
                          <span className="text-warning flex-shrink-0">☐</span>
                          <span className="leading-relaxed underline decoration-dotted decoration-warning/20 group-hover:decoration-warning">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-success font-bold">
                    <span>🎉</span>
                    <span>You have successfully filled all your profile data details!</span>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeProfileTab === 'academics' && (
            <div className="space-y-6">
              {/* Synced Academic Records Card */}
              <section className="glass-panel p-6">
                <h3 className="text-xl font-bold flex items-center gap-2 mb-4"><span>🏫</span> Synced Academic Records</h3>
                <div className="profile-info-fields space-y-4">
                  <div className="profile-info-item">
                    <div className="profile-info-content">
                      <span className="profile-info-label">Course / Program</span>
                      <span className="profile-info-value">{profile?.course || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="profile-info-item">
                    <div className="profile-info-content">
                      <span className="profile-info-label">Stream / Branch</span>
                      <span className="profile-info-value">{profile?.stream || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="profile-info-item">
                    <div className="profile-info-content">
                      <span className="profile-info-label">Current Semester</span>
                      <span className="profile-info-value">{profile?.semester ? `Semester ${profile.semester}` : 'N/A'}</span>
                    </div>
                  </div>
                  <div className="profile-info-item">
                    <div className="profile-info-content">
                      <span className="profile-info-label">Passing Year</span>
                      <span className="profile-info-value">{profile?.passing_year || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="profile-info-item">
                    <div className="profile-info-content">
                      <span className="profile-info-label">Current CGPA</span>
                      <span className="profile-info-value font-bold text-primary">{profile?.cgpa?.toFixed(2) || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="profile-info-item">
                    <div className="profile-info-content">
                      <span className="profile-info-label">Attendance</span>
                      <span className={`profile-info-value font-bold ${(profile?.attendance || 0) >= 75 ? 'text-emerald-500' : 'text-danger'}`}>
                        {profile?.attendance ? `${profile.attendance}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="profile-info-item">
                    <div className="profile-info-content">
                      <span className="profile-info-label">Active Backlogs</span>
                      <span className={`profile-info-value font-bold ${profile?.backlogs ? 'text-danger' : 'text-emerald-500'}`}>
                        {profile?.backlogs ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted mt-3 italic text-center">Synced from college academic database (Read-only). CGPA and Attendance are excluded from profile completion calculations.</p>
              </section>

              <section className="glass-panel p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2"><span>🎓</span> Education</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowEduModal(true)}>+ Add</button>
                </div>
              <div className="space-y-6">
                {profile?.education_entries?.length > 0 ? profile.education_entries.map(edu => (
                  <div key={edu.id} className="experience-card group">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">{edu.degree} {edu.field ? `in ${edu.field}` : ''}</h4>
                        <p className="text-sm text-primary">{edu.institution}</p>
                        {edu.gpa && <p className="text-xs text-muted mt-1">GPA: <span className="text-primary font-semibold">{edu.gpa}</span></p>}
                        {edu.honors && <p className="text-xs text-muted">Honors: {edu.honors}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs text-muted font-bold">
                          {edu.start_year ? `${edu.start_year} - ${edu.end_year || 'Present'}` : (edu.graduation_date || 'Ongoing')}
                        </span>
                        <div className="item-actions">
                          <span onClick={() => startEditEducation(edu)} className="action-link edit">Edit</span>
                          <span onClick={() => handleDeleteEducation(edu.id)} className="action-link delete">Delete</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : <div className="text-muted text-sm italic">No education entries added.</div>}
              </div>
            </section>
          </div>
        )}

          {activeProfileTab === 'experience' && (
            <section className="glass-panel p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><span>💼</span> Experience</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowExpModal(true)}>+ Add</button>
              </div>
              <div className="space-y-6">
                {profile?.experiences?.length > 0 ? profile.experiences.map(exp => (
                  <div key={exp.id} className="experience-card group">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">{exp.position}</h4>
                        <p className="text-sm text-primary">{exp.company}</p>
                        <p className="text-xs text-muted mt-1">{exp.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs text-muted font-bold">{exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}</span>
                        <div className="item-actions">
                          <span onClick={() => startEditExperience(exp)} className="action-link edit">Edit</span>
                          <span onClick={() => handleDeleteExperience(exp.id)} className="action-link delete">Delete</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : <div className="text-muted text-sm italic">No experience added.</div>}
              </div>
            </section>
          )}

          {activeProfileTab === 'projects' && (
            <div className="space-y-6">
              <section className="glass-panel p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2"><span>⚡</span> Skills</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowSkillModal(true)}>+ Add</button>
                </div>
                <div className="skills-list">
                  {profile?.skills?.length > 0 ? profile.skills.map(skill => (
                    <div key={skill.id} className="skill-badge group">
                      <span className="skill-name">{skill.name}</span>
                      <div className="item-actions">
                        <span onClick={() => startEditSkill(skill)} className="action-link edit">Edit</span>
                        <span onClick={() => handleDeleteSkill(skill.id)} className="action-link delete">Delete</span>
                      </div>
                    </div>
                  )) : <div className="text-muted text-sm italic">No skills added.</div>}
                </div>
              </section>

              {/* Strengths Card */}
              <section className="glass-panel p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2"><span>💪</span> Strengths</h3>
                  <button 
                    onClick={() => {
                      setShowBasicModal(true);
                      setTimeout(() => {
                        const el = document.getElementById('strengths-input');
                        if (el) el.focus();
                      }, 200);
                    }} 
                    className="btn btn-primary btn-sm"
                  >
                    {profile?.strengths?.length > 0 ? 'Edit' : '+ Add'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile?.strengths?.length > 0 ? (
                    profile.strengths.map((str, idx) => (
                      <span key={idx} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-xl font-semibold border border-primary/20">{str}</span>
                    ))
                  ) : (
                    <div className="text-muted text-sm italic">No strengths added.</div>
                  )}
                </div>
              </section>

              <section className="glass-panel p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2"><span>🚀</span> Projects</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowProjModal(true)}>+ Add</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile?.projects?.length > 0 ? profile.projects.map(proj => (
                    <div key={proj.id} className="project-card group">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold">{proj.title}</h4>
                        <div className="item-actions">
                          <span onClick={() => startEditProject(proj)} className="action-link edit">Edit</span>
                          <span onClick={() => handleDeleteProject(proj.id)} className="action-link delete">Delete</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted mb-3">{proj.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(proj.technologies) ? proj.technologies.map((t, i) => (
                          <span key={i} className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded">{t}</span>
                        )) : proj.technologies?.split(',').map((t, i) => (
                          <span key={i} className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded">{t.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )) : <div className="text-muted text-sm italic">No projects added.</div>}
                </div>
              </section>
            </div>
          )}

          {activeProfileTab === 'activities' && (
            <div className="space-y-6">
              <section className="glass-panel p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2"><span>📜</span> Certifications</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowCertModal(true)}>+ Add</button>
                </div>
                <div className="space-y-6">
                  {profile?.certifications?.length > 0 ? profile.certifications.map(cert => (
                    <div key={cert.id} className="experience-card group">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold">{cert.name}</h4>
                          <p className="text-sm text-primary">{cert.issuer}</p>
                          {cert.credential_url && (
                            <a href={cert.credential_url} target="_blank" rel="noreferrer" className="text-xs text-primary/80 hover:text-primary hover:underline mt-1 inline-flex items-center gap-1">
                              View Credential 🔗
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {cert.date && <span className="text-xs text-muted font-bold">{cert.date}</span>}
                          <div className="item-actions">
                            <span onClick={() => startEditCertification(cert)} className="action-link edit">Edit</span>
                            <span onClick={() => handleDeleteCertification(cert.id)} className="action-link delete">Delete</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : <div className="text-muted text-sm italic">No certifications added.</div>}
                </div>
              </section>

              <section className="glass-panel p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2"><span>🏆</span> Awards & Achievements</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAwardModal(true)}>+ Add</button>
                </div>
                <div className="space-y-6">
                  {profile?.achievements?.length > 0 ? profile.achievements.map(ach => (
                    <div key={ach.id} className="experience-card group">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold">{ach.title}</h4>
                          {ach.issuer && <p className="text-sm text-primary">{ach.issuer}</p>}
                          {ach.description && <p className="text-xs text-muted mt-1">{ach.description}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {ach.date && <span className="text-xs text-muted font-bold">{ach.date}</span>}
                          <div className="item-actions">
                            <span onClick={() => startEditAchievement(ach)} className="action-link edit">Edit</span>
                            <span onClick={() => handleDeleteAchievement(ach.id)} className="action-link delete">Delete</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : <div className="text-muted text-sm italic">No awards or achievements added.</div>}
                </div>
              </section>

              <section className="glass-panel p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2"><span>🏃</span> Extracurricular Activities</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowExtraModal(true)}>+ Add</button>
                </div>
                <div className="space-y-6">
                  {profile?.extracurricular_activities?.length > 0 ? profile.extracurricular_activities.map(act => (
                    <div key={act.id} className="experience-card group">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold">{act.title}</h4>
                          {act.description && <p className="text-xs text-muted mt-1">{act.description}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {act.date && <span className="text-xs text-muted font-bold">{act.date}</span>}
                          <div className="item-actions">
                            <span onClick={() => startEditExtra(act)} className="action-link edit">Edit</span>
                            <span onClick={() => handleDeleteExtra(act.id)} className="action-link delete">Delete</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : <div className="text-muted text-sm italic">No extracurricular activities added.</div>}
                </div>
              </section>

              {/* Languages Card */}
              <section className="glass-panel p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2"><span>🗣️</span> Languages Known</h3>
                  <button 
                    onClick={() => {
                      setShowBasicModal(true);
                      setTimeout(() => {
                        const el = document.getElementById('languages-input');
                        if (el) el.focus();
                      }, 200);
                    }} 
                    className="btn btn-primary btn-sm"
                  >
                    {profile?.languages_known?.length > 0 ? 'Edit' : '+ Add'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile?.languages_known?.length > 0 ? (
                    profile.languages_known.map((lang, idx) => (
                      <span key={idx} className="text-xs bg-secondary-light/10 text-secondary px-3 py-1.5 rounded-xl font-semibold border border-secondary/15">{lang}</span>
                    ))
                  ) : (
                    <div className="text-muted text-sm italic">No languages added.</div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <section className="glass-panel p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span>👤</span> Basic Info
                </h3>
                <button onClick={() => setShowBasicModal(true)} className="btn btn-secondary btn-sm">Edit</button>
              </div>

              <div className="avatar-upload-container">
                <div className="avatar-wrapper" onClick={handlePhotoClick}>
                  {photoLoading && (
                    <div className="avatar-spinner">
                      <div className="spinner w-8 h-8"></div>
                    </div>
                  )}
                  <div className="avatar-inner">
                    {profile?.profile_picture ? (
                      <img 
                        src={getFullImageUrl(profile.profile_picture)} 
                        alt="Student Profile" 
                        className="avatar-image" 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.parentNode.innerHTML = `<div class="avatar-fallback">${(profile?.student_name || 'S').charAt(0)}</div>`;
                        }}
                      />
                    ) : (
                      <div className="avatar-fallback">
                        {profile?.student_name ? profile.student_name.charAt(0) : 'S'}
                      </div>
                    )}
                    <div className="avatar-overlay">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mb-1">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                      </svg>
                      <span className="avatar-overlay-text">Upload</span>
                    </div>
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="avatar-info-text text-center mt-2">
                  <span className="text-[10px] text-muted">Click to change picture</span>
                </div>
              </div>

              <div className="profile-info-fields mt-6 space-y-4">
                <div className="profile-info-item">
                  <div className="profile-info-content">
                    <span className="profile-info-label">Student ID</span>
                    <span className="profile-info-value">{profile?.student_id || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="profile-info-item">
                  <div className="profile-info-content">
                    <span className="profile-info-label">Name</span>
                    <span className="profile-info-value">{profile?.student_name || 'N/A'}</span>
                  </div>
                </div>

                <div className="profile-info-item">
                  <div className="profile-info-content">
                    <span className="profile-info-label">Email</span>
                    <span className="profile-info-value">{profile?.student_email || 'N/A'}</span>
                  </div>
                </div>

                <div className="profile-info-item">
                  <div className="profile-info-content">
                    <span className="profile-info-label">Location</span>
                    <span className="profile-info-value">{profile?.location || 'N/A'}</span>
                  </div>
                </div>

                <div className="profile-info-item professional-summary mt-4">
                  <div className="profile-info-content">
                    <span className="profile-info-label font-bold text-xs uppercase text-muted block mb-1">Professional Summary</span>
                    {profile?.professional_summary ? (
                      <p className="text-xs leading-relaxed text-secondary font-medium">{profile.professional_summary}</p>
                    ) : (
                      <span className="text-xs text-muted italic">Not set</span>
                    )}
                  </div>
                </div>

                {/* Strengths */}
                <div className="profile-info-item strengths mt-4">
                  <div className="profile-info-content">
                    <div className="flex justify-between items-center mb-2">
                      <span className="profile-info-label font-bold text-xs uppercase text-muted block">Strengths</span>
                      <button 
                        onClick={() => {
                          setShowBasicModal(true);
                          setTimeout(() => {
                            const el = document.getElementById('strengths-input');
                            if (el) el.focus();
                          }, 200);
                        }} 
                        className="text-primary hover:underline text-[10px] font-bold uppercase transition-colors"
                      >
                        {profile?.strengths?.length > 0 ? 'Edit' : '+ Add'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {profile?.strengths?.length > 0 ? (
                        profile.strengths.map((str, idx) => (
                          <span key={idx} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">{str}</span>
                        ))
                      ) : (
                        <span className="text-xs text-muted italic">Not set</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Languages Known */}
                <div className="profile-info-item languages mt-4">
                  <div className="profile-info-content w-full">
                    <div className="flex justify-between items-center mb-2">
                      <span className="profile-info-label font-bold text-xs uppercase text-muted block">Languages Known</span>
                      <button 
                        onClick={() => {
                          setShowBasicModal(true);
                          setTimeout(() => {
                            const el = document.getElementById('languages-input');
                            if (el) el.focus();
                          }, 200);
                        }} 
                        className="text-primary hover:underline text-[10px] font-bold uppercase transition-colors"
                      >
                        {profile?.languages_known?.length > 0 ? 'Edit' : '+ Add'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {profile?.languages_known?.length > 0 ? (
                        profile.languages_known.map((lang, idx) => (
                          <span key={idx} className="text-[10px] bg-secondary-light/10 text-secondary px-2 py-0.5 rounded font-semibold border border-secondary/15">{lang}</span>
                        ))
                      ) : (
                        <span className="text-xs text-muted italic">Not set</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Social Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {profile?.linkedin && (
                    <a 
                      href={profile.linkedin} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center justify-center gap-2 flex-1 min-w-[80px] px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0a66c2] to-[#0077b5] hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                      <Linkedin size={14} />
                      LinkedIn
                    </a>
                  )}
                  {profile?.github && profile?.student_department === 'Technology' && (
                    <a 
                      href={profile.github} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center justify-center gap-2 flex-1 min-w-[80px] px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#24292e] to-[#171a1d] border border-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-black/30 transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                      <Github size={14} />
                      GitHub
                    </a>
                  )}
                  {profile?.portfolio && (
                    <a 
                      href={profile.portfolio} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center justify-center gap-2 flex-1 min-w-[80px] px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#10b981] to-[#059669] hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                      <span className="text-sm">🌐</span>
                      Portfolio
                    </a>
                  )}
                </div>
              </div>
            </section>

            {/* Resume Upload Card */}
            <section className="glass-panel p-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <span>📄</span> Professional Resume
              </h3>
              {primaryResume ? (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-lg shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate text-primary">{primaryResume.title || primaryResume.original_filename}</p>
                      <p className="text-[10px] text-muted uppercase tracking-wider font-semibold mt-0.5">
                        {primaryResume.type === 'uploaded' ? 'Uploaded PDF' : `Template: ${primaryResume.template_name || 'Classic'}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-dashed border-primary/10">
                    <button 
                      onClick={() => handleDownloadResume(primaryResume)}
                      className="btn btn-xs btn-secondary flex items-center gap-1"
                    >
                      <Download size={12} /> Download
                    </button>
                    {primaryResume.type === 'built' && (
                      <Link 
                        to="/student/resumes"
                        className="btn btn-xs btn-primary"
                      >
                        Edit Builder
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-border-color rounded-xl mb-4 bg-muted/5">
                  <span className="text-2xl">📭</span>
                  <p className="text-xs text-muted mt-2 italic">No active resume set.</p>
                </div>
              )}

              {/* Upload PDF Section */}
              <div className="space-y-3 mt-6 pt-4 border-t border-dashed border-border-color">
                <label className="text-[10px] font-black uppercase text-muted tracking-wider block">Upload Custom PDF Resume</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="file" 
                    id="profile-resume-file-desktop" 
                    accept=".pdf"
                    onChange={handleResumeUpload}
                    className="hidden" 
                  />
                  <button 
                    onClick={() => document.getElementById('profile-resume-file-desktop').click()}
                    className="btn btn-sm btn-secondary w-full flex items-center justify-center gap-2"
                    disabled={uploadingResume}
                  >
                    {uploadingResume ? 'Uploading...' : 'Upload PDF'}
                  </button>
                </div>
                <span className="text-[9px] text-muted block text-center mt-1">PDF only. Max size 2MB. Setting this active will display it to HR/recruiters.</span>
              </div>
            </section>

            <section className={`glass-panel p-6 border-l-4 ${completion?.suggestions?.length > 0 ? 'border-warning bg-warning/5' : 'border-success bg-success/5'}`}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-primary">
                <span>📋</span> Profile Status: {completion?.suggestions?.length > 0 ? 'Fill All Data' : 'All Data Filled'}
              </h3>
              {completion?.suggestions?.length > 0 ? (
                <>
                  <p className="text-xs text-secondary mb-3 font-semibold">Please fill in the following details to complete your profile:</p>
                  <ul className="space-y-2.5">
                    {completion.suggestions.map((s, idx) => (
                      <li 
                        key={idx} 
                        onClick={() => handleSuggestionClick(s)}
                        className="text-xs text-warning-muted flex items-start gap-2 cursor-pointer hover:text-warning hover:translate-x-0.5 transition-all duration-200 group"
                      >
                        <span className="text-warning flex-shrink-0 mt-0.5">☐</span>
                        <span className="leading-relaxed underline decoration-dotted decoration-warning/20 group-hover:decoration-warning">{s}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-success font-bold">
                  <span>🎉</span>
                  <span>You have successfully filled all your profile data details!</span>
                </div>
              )}
            </section>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-8">
            <section className="glass-panel p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><span>💼</span> Experience</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowExpModal(true)}>+ Add</button>
              </div>
              <div className="space-y-6">
                {profile?.experiences?.length > 0 ? profile.experiences.map(exp => (
                  <div key={exp.id} className="experience-card group">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">{exp.position}</h4>
                        <p className="text-sm text-primary">{exp.company}</p>
                        <p className="text-xs text-muted mt-1">{exp.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs text-muted font-bold">{exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}</span>
                        <div className="item-actions">
                          <span onClick={() => startEditExperience(exp)} className="action-link edit">Edit</span>
                          <span onClick={() => handleDeleteExperience(exp.id)} className="action-link delete">Delete</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : <div className="text-muted text-sm italic">No experience added.</div>}
              </div>
            </section>

            <section className="glass-panel p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><span>🎓</span> Education</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowEduModal(true)}>+ Add</button>
              </div>
              <div className="space-y-6">
                {profile?.education_entries?.length > 0 ? profile.education_entries.map(edu => (
                  <div key={edu.id} className="experience-card group">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">{edu.degree} {edu.field ? `in ${edu.field}` : ''}</h4>
                        <p className="text-sm text-primary">{edu.institution}</p>
                        {edu.gpa && <p className="text-xs text-muted mt-1">GPA: <span className="text-primary font-semibold">{edu.gpa}</span></p>}
                        {edu.honors && <p className="text-xs text-muted">Honors: {edu.honors}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs text-muted font-bold">
                          {edu.start_year ? `${edu.start_year} - ${edu.end_year || 'Present'}` : (edu.graduation_date || 'Ongoing')}
                        </span>
                        <div className="item-actions">
                          <span onClick={() => startEditEducation(edu)} className="action-link edit">Edit</span>
                          <span onClick={() => handleDeleteEducation(edu.id)} className="action-link delete">Delete</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : <div className="text-muted text-sm italic">No education entries added.</div>}
              </div>
            </section>

            <section className="glass-panel p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><span>⚡</span> Skills</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowSkillModal(true)}>+ Add</button>
              </div>
              <div className="skills-list">
                {profile?.skills?.length > 0 ? profile.skills.map(skill => (
                  <div key={skill.id} className="skill-badge group">
                    <span className="skill-name">{skill.name}</span>
                    <div className="item-actions">
                      <span onClick={() => startEditSkill(skill)} className="action-link edit">Edit</span>
                      <span onClick={() => handleDeleteSkill(skill.id)} className="action-link delete">Delete</span>
                    </div>
                  </div>
                )) : <div className="text-muted text-sm italic">No skills added.</div>}
              </div>
            </section>

            <section className="glass-panel p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><span>🚀</span> Projects</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowProjModal(true)}>+ Add</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile?.projects?.length > 0 ? profile.projects.map(proj => (
                  <div key={proj.id} className="project-card group">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold">{proj.title}</h4>
                      <div className="item-actions">
                        <span onClick={() => startEditProject(proj)} className="action-link edit">Edit</span>
                        <span onClick={() => handleDeleteProject(proj.id)} className="action-link delete">Delete</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted mb-3">{proj.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(proj.technologies) ? proj.technologies.map((t, i) => (
                        <span key={i} className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded">{t}</span>
                      )) : proj.technologies?.split(',').map((t, i) => (
                        <span key={i} className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded">{t.trim()}</span>
                      ))}
                    </div>
                  </div>
                )) : <div className="text-muted text-sm italic">No projects added.</div>}
              </div>
            </section>

            <section className="glass-panel p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><span>📜</span> Certifications</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCertModal(true)}>+ Add</button>
              </div>
              <div className="space-y-6">
                {profile?.certifications?.length > 0 ? profile.certifications.map(cert => (
                  <div key={cert.id} className="experience-card group">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">{cert.name}</h4>
                        <p className="text-sm text-primary">{cert.issuer}</p>
                        {cert.credential_url && (
                          <a href={cert.credential_url} target="_blank" rel="noreferrer" className="text-xs text-primary/80 hover:text-primary hover:underline mt-1 inline-flex items-center gap-1">
                            View Credential 🔗
                          </a>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {cert.date && <span className="text-xs text-muted font-bold">{cert.date}</span>}
                        <div className="item-actions">
                          <span onClick={() => startEditCertification(cert)} className="action-link edit">Edit</span>
                          <span onClick={() => handleDeleteCertification(cert.id)} className="action-link delete">Delete</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : <div className="text-muted text-sm italic">No certifications added.</div>}
              </div>
            </section>

            <section className="glass-panel p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><span>🏆</span> Awards & Achievements</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAwardModal(true)}>+ Add</button>
              </div>
              <div className="space-y-6">
                {profile?.achievements?.length > 0 ? profile.achievements.map(ach => (
                  <div key={ach.id} className="experience-card group">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">{ach.title}</h4>
                        {ach.issuer && <p className="text-sm text-primary">{ach.issuer}</p>}
                        {ach.description && <p className="text-xs text-muted mt-1">{ach.description}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {ach.date && <span className="text-xs text-muted font-bold">{ach.date}</span>}
                        <div className="item-actions">
                          <span onClick={() => startEditAchievement(ach)} className="action-link edit">Edit</span>
                          <span onClick={() => handleDeleteAchievement(ach.id)} className="action-link delete">Delete</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : <div className="text-muted text-sm italic">No awards or achievements added.</div>}
              </div>
            </section>

            {/* Extracurricular Activities */}
            <section className="glass-panel p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><span>🏃</span> Extracurricular Activities</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowExtraModal(true)}>+ Add</button>
              </div>
              <div className="space-y-6">
                {profile?.extracurricular_activities?.length > 0 ? profile.extracurricular_activities.map(act => (
                  <div key={act.id} className="experience-card group">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">{act.title}</h4>
                        {act.description && <p className="text-xs text-muted mt-1">{act.description}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {act.date && <span className="text-xs text-muted font-bold">{act.date}</span>}
                        <div className="item-actions">
                          <span onClick={() => startEditExtra(act)} className="action-link edit">Edit</span>
                          <span onClick={() => handleDeleteExtra(act.id)} className="action-link delete">Delete</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : <div className="text-muted text-sm italic">No extracurricular activities added.</div>}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Basic Info Modal */}
      {showBasicModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header"><h2>Edit Basic Info</h2><button className="modal-close" onClick={() => setShowBasicModal(false)}>&times;</button></div>
            <form onSubmit={handleUpdateBasic}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="input-group">
                  <label htmlFor="location-input">Location</label>
                  <input id="location-input" className="input-field" value={basicInfo.location} onChange={e => setBasicInfo({...basicInfo, location: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Phone Number</label>
                  <input className="input-field cursor-not-allowed bg-dark-200 opacity-60" disabled value={basicInfo.phone_number} />
                  <span className="text-[10px] text-muted block mt-1">Synced from academic records (read-only)</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="input-group">
                  <label>Year</label>
                  <select className="input-field cursor-not-allowed bg-dark-200 opacity-60" disabled value={basicInfo.year}>
                    <option value="">Select Year</option>
                    <option value="1st">1st Year</option>
                    <option value="2nd">2nd Year</option>
                    <option value="3rd">3rd Year</option>
                    <option value="4th">4th Year</option>
                  </select>
                  <span className="text-[10px] text-muted block mt-1">Synced from academic records (read-only)</span>
                </div>
                <div className="input-group flex flex-col justify-center">
                  <div className="flex items-center gap-2 cursor-not-allowed opacity-60 mt-4">
                    <input type="checkbox" id="backlogs-checkbox" disabled checked={basicInfo.backlogs} />
                    <label htmlFor="backlogs-checkbox" className="text-sm font-semibold select-none cursor-not-allowed">Active Backlogs (Read-only)</label>
                  </div>
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="summary-input">Professional Summary</label>
                <textarea id="summary-input" className="input-field" rows="3" value={basicInfo.professional_summary} onChange={e => setBasicInfo({...basicInfo, professional_summary: e.target.value})} />
              </div>
              {(() => {
                const dept = profile?.student_department || 'Business & Management';
                const showGithub = dept === 'Technology';
                return showGithub ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="input-group">
                        <label htmlFor="linkedin-input">LinkedIn</label>
                        <input id="linkedin-input" className="input-field" value={basicInfo.linkedin} onChange={e => setBasicInfo({...basicInfo, linkedin: e.target.value})} />
                      </div>
                      <div className="input-group">
                        <label htmlFor="github-input">GitHub (Required)</label>
                        <input id="github-input" className="input-field" value={basicInfo.github} onChange={e => setBasicInfo({...basicInfo, github: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="input-group">
                        <label htmlFor="portfolio-input">Portfolio Website (Required)</label>
                        <input id="portfolio-input" className="input-field" value={basicInfo.portfolio} onChange={e => setBasicInfo({...basicInfo, portfolio: e.target.value})} />
                      </div>
                      <div className="input-group flex flex-col justify-center">
                        <div className="flex items-center gap-2 mt-4 cursor-pointer">
                          <input 
                            type="checkbox" 
                            id="email-alerts-checkbox" 
                            checked={basicInfo.email_job_alerts} 
                            onChange={e => setBasicInfo({...basicInfo, email_job_alerts: e.target.checked})} 
                          />
                          <label htmlFor="email-alerts-checkbox" className="text-sm font-semibold select-none cursor-pointer">Receive Email Job Alerts</label>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="input-group">
                        <label htmlFor="linkedin-input">LinkedIn</label>
                        <input id="linkedin-input" className="input-field" value={basicInfo.linkedin} onChange={e => setBasicInfo({...basicInfo, linkedin: e.target.value})} />
                      </div>
                      <div className="input-group">
                        <label htmlFor="portfolio-input">
                          {dept === 'Design & Media' ? 'Portfolio Website (Required)' : 'Portfolio Website (Optional)'}
                        </label>
                        <input id="portfolio-input" className="input-field" value={basicInfo.portfolio} onChange={e => setBasicInfo({...basicInfo, portfolio: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="input-group flex flex-col justify-center">
                        <div className="flex items-center gap-2 mt-4 cursor-pointer">
                          <input 
                            type="checkbox" 
                            id="email-alerts-checkbox" 
                            checked={basicInfo.email_job_alerts} 
                            onChange={e => setBasicInfo({...basicInfo, email_job_alerts: e.target.checked})} 
                          />
                          <label htmlFor="email-alerts-checkbox" className="text-sm font-semibold select-none cursor-pointer">Receive Email Job Alerts</label>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="input-group">
                  <label htmlFor="strengths-input">Strengths (comma separated)</label>
                  <input 
                    id="strengths-input"
                    placeholder="e.g. Leadership, Problem Solving, Public Speaking" 
                    className="input-field" 
                    value={basicInfo.strengths} 
                    onChange={e => setBasicInfo({...basicInfo, strengths: e.target.value})} 
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="languages-input">Languages Known (comma separated)</label>
                  <input 
                    id="languages-input"
                    placeholder="e.g. English (Fluent), Hindi (Native)" 
                    className="input-field" 
                    value={basicInfo.languages_known} 
                    onChange={e => setBasicInfo({...basicInfo, languages_known: e.target.value})} 
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full mt-4">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* Experience Modal */}
      {showExpModal && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header"><h2>{editingExpId ? 'Edit Experience' : 'Add Experience'}</h2><button className="modal-close" onClick={() => { setShowExpModal(false); setEditingExpId(null); setNewExp({ company: '', position: '', start_date: '', end_date: '', is_current: false, description: '' }); }}>&times;</button></div>
            <form onSubmit={handleAddExperience}>
              <div className="input-group"><label>Company</label><input className="input-field" required value={newExp.company} onChange={e => setNewExp({...newExp, company: e.target.value})} /></div>
              <div className="input-group"><label>Position</label><input className="input-field" required value={newExp.position} onChange={e => setNewExp({...newExp, position: e.target.value})} /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="input-group"><label>Start Date</label><input type="date" className="input-field" required value={newExp.start_date} onChange={e => setNewExp({...newExp, start_date: e.target.value})} /></div>
                {!newExp.is_current && <div className="input-group"><label>End Date</label><input type="date" className="input-field" value={newExp.end_date} onChange={e => setNewExp({...newExp, end_date: e.target.value})} /></div>}
              </div>
              <div className="flex items-center gap-2 mb-4"><input type="checkbox" checked={newExp.is_current} onChange={e => setNewExp({...newExp, is_current: e.target.checked})} /><label className="text-sm">Currently working here</label></div>
              <div className="input-group"><label>Description</label><textarea className="input-field" rows="3" value={newExp.description} onChange={e => setNewExp({...newExp, description: e.target.value})} /></div>
              <button type="submit" className="btn btn-primary btn-full">Add Experience</button>
            </form>
          </div>
        </div>
      )}

      {/* Skill Modal */}
      {showSkillModal && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <h2>{editingSkillId ? 'Edit Skill' : 'Add New Skill'}</h2>
              <button className="modal-close" onClick={() => { 
                setShowSkillModal(false); 
                setEditingSkillId(null); 
                setNewSkill({ name: '', category: 'Technical', proficiency: 'Intermediate' }); 
              }}>&times;</button>
            </div>
            <form onSubmit={handleAddSkill}>
              <div className="input-group">
                <label htmlFor="skill-name-input">Skill Name</label>
                <input 
                  id="skill-name-input" 
                  className="input-field" 
                  required 
                  placeholder="e.g. Project Management, Python, Video Editing" 
                  value={newSkill.name} 
                  onChange={e => setNewSkill({...newSkill, name: e.target.value})} 
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full mt-4">Save Skill</button>
            </form>
          </div>
        </div>
      )}

      {/* Project Modal */}
      {showProjModal && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header"><h2>{editingProjId ? 'Edit Project' : 'Add Project'}</h2><button className="modal-close" onClick={() => { setShowProjModal(false); setEditingProjId(null); setNewProj({ title: '', description: '', technologies: '', link: '', date: '' }); }}>&times;</button></div>
            <form onSubmit={handleAddProject}>
              <div className="input-group"><label>Project Title</label><input className="input-field" required value={newProj.title} onChange={e => setNewProj({...newProj, title: e.target.value})} /></div>
              <div className="input-group"><label>Technologies (comma separated)</label><input className="input-field" value={newProj.technologies} onChange={e => setNewProj({...newProj, technologies: e.target.value})} /></div>
              <div className="input-group"><label>Description</label><textarea className="input-field" rows="3" value={newProj.description} onChange={e => setNewProj({...newProj, description: e.target.value})} /></div>
              <button type="submit" className="btn btn-primary btn-full">Add Project</button>
            </form>
          </div>
        </div>
      )}

      {/* Education Modal */}
      {showEduModal && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <h2>{editingEduId ? 'Edit Education' : 'Add Education'}</h2>
              <button className="modal-close" onClick={() => {
                setShowEduModal(false);
                setEditingEduId(null);
                setNewEdu({ institution: '', degree: '', field: '', graduation_date: '', start_year: '', end_year: '', gpa: '', honors: '' });
              }}>&times;</button>
            </div>
            <form onSubmit={handleAddEducation}>
              <div className="input-group">
                <label>Institution / School</label>
                <input className="input-field" required value={newEdu.institution} onChange={e => setNewEdu({...newEdu, institution: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Degree (e.g. B.Tech, High School)</label>
                <input className="input-field" required value={newEdu.degree} onChange={e => setNewEdu({...newEdu, degree: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Field of Study (e.g. Computer Science)</label>
                <input className="input-field" value={newEdu.field} onChange={e => setNewEdu({...newEdu, field: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="input-group">
                  <label htmlFor="start-year-input">Start Year</label>
                  <input 
                    id="start-year-input"
                    type="number" 
                    min="1900" 
                    max="2100" 
                    placeholder="e.g. 2023" 
                    className="input-field" 
                    value={newEdu.start_year || ''} 
                    onChange={e => setNewEdu({...newEdu, start_year: e.target.value})} 
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="end-year-input">End Year (or Expected)</label>
                  <input 
                    id="end-year-input"
                    type="number" 
                    min="1900" 
                    max="2100" 
                    placeholder="e.g. 2026" 
                    className="input-field" 
                    value={newEdu.end_year || ''} 
                    onChange={e => setNewEdu({...newEdu, end_year: e.target.value})} 
                  />
                </div>
              </div>
              <div className="input-group">
                <label>Honors / Achievements (e.g. Dean's List)</label>
                <input className="input-field" value={newEdu.honors} onChange={e => setNewEdu({...newEdu, honors: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary btn-full mt-4">
                {editingEduId ? 'Save Changes' : 'Add Education'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Certification Modal */}
      {showCertModal && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <h2>{editingCertId ? 'Edit Certification' : 'Add Certification'}</h2>
              <button className="modal-close" onClick={() => {
                setShowCertModal(false);
                setEditingCertId(null);
                setNewCert({ name: '', issuer: '', date: '', credential_url: '' });
              }}>&times;</button>
            </div>
            <form onSubmit={handleAddCertification}>
              <div className="input-group">
                <label>Certification Name</label>
                <input className="input-field" required value={newCert.name} onChange={e => setNewCert({...newCert, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Issuer (e.g. AWS, Coursera)</label>
                <input className="input-field" required value={newCert.issuer} onChange={e => setNewCert({...newCert, issuer: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="input-group">
                  <label>Date Earned</label>
                  <input type="date" className="input-field" value={newCert.date} onChange={e => setNewCert({...newCert, date: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Credential URL</label>
                  <input className="input-field" placeholder="https://" value={newCert.credential_url} onChange={e => setNewCert({...newCert, credential_url: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full mt-4">
                {editingCertId ? 'Save Changes' : 'Add Certification'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Awards & Achievements Modal */}
      {showAwardModal && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <h2>{editingAwardId ? 'Edit Award' : 'Add Award / Achievement'}</h2>
              <button className="modal-close" onClick={() => {
                setShowAwardModal(false);
                setEditingAwardId(null);
                setNewAward({ title: '', issuer: '', date: '', description: '' });
              }}>&times;</button>
            </div>
            <form onSubmit={handleAddAchievement}>
              <div className="input-group">
                <label>Award/Achievement Title</label>
                <input className="input-field" required value={newAward.title} onChange={e => setNewAward({...newAward, title: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Issuer / Organization (Optional)</label>
                <input className="input-field" value={newAward.issuer} onChange={e => setNewAward({...newAward, issuer: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Date Received</label>
                <input type="date" className="input-field" value={newAward.date} onChange={e => setNewAward({...newAward, date: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Description</label>
                <textarea className="input-field" rows="3" value={newAward.description} onChange={e => setNewAward({...newAward, description: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary btn-full mt-4">
                {editingAwardId ? 'Save Changes' : 'Add Award'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Extracurricular Activities Modal */}
      {showExtraModal && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <h2>{editingExtraId ? 'Edit Extracurricular Activity' : 'Add Extracurricular Activity'}</h2>
              <button className="modal-close" onClick={() => {
                setShowExtraModal(false);
                setEditingExtraId(null);
                setNewExtra({ title: '', description: '', date: '' });
              }}>&times;</button>
            </div>
            <form onSubmit={handleAddExtra}>
              <div className="input-group">
                <label>Activity Title / Role</label>
                <input className="input-field" required placeholder="e.g. Football Team Captain, Coding Club Member" value={newExtra.title} onChange={e => setNewExtra({...newExtra, title: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Date (Optional)</label>
                <input type="date" className="input-field" value={newExtra.date} onChange={e => setNewExtra({...newExtra, date: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Description (Optional)</label>
                <textarea className="input-field" rows="3" placeholder="Describe your achievements or role..." value={newExtra.description} onChange={e => setNewExtra({...newExtra, description: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary btn-full mt-4">
                {editingExtraId ? 'Save Changes' : 'Add Activity'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Crop Modal */}
      {showCropModal && (
        <div className="crop-modal-overlay">
          <div className="crop-modal">
            <div className="crop-modal-header">
              <h2>Edit & Crop Profile Photo</h2>
              <button className="crop-modal-close" onClick={() => { setShowCropModal(false); setCropImageSrc(null); }}>&times;</button>
            </div>
            
            <div className="crop-viewport-wrapper">
              <div 
                className="crop-viewport"
                onMouseDown={(e) => {
                  setIsDragging(true);
                  setDragStart({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => {
                  if (!isDragging) return;
                  const dx = e.clientX - dragStart.x;
                  const dy = e.clientY - dragStart.y;
                  setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
                  setDragStart({ x: e.clientX, y: e.clientY });
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    setIsDragging(true);
                    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
                  }
                }}
                onTouchMove={(e) => {
                  if (!isDragging || e.touches.length !== 1) return;
                  const dx = e.touches[0].clientX - dragStart.x;
                  const dy = e.touches[0].clientY - dragStart.y;
                  setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
                  setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
                }}
                onTouchEnd={() => setIsDragging(false)}
              >
                {cropImageSrc && (
                  <img 
                    src={cropImageSrc} 
                    alt="Crop preview" 
                    className="crop-image-preview"
                    onLoad={(e) => {
                      const img = e.target;
                      const calculatedScale = 200 / Math.min(img.naturalWidth, img.naturalHeight);
                      setFitScale(calculatedScale);
                    }}
                    style={{
                      left: '50%',
                      top: '50%',
                      userDrag: 'none',
                      WebkitUserDrag: 'none',
                      transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom * fitScale}) rotate(${rotation}deg)`
                    }}
                  />
                )}
                {/* Visual Circular Crop Selector Overlay */}
                <div className="crop-overlay-circle"></div>
              </div>
              <span className="crop-instruction">Drag photo to adjust, use controls below</span>
            </div>

            <div className="crop-controls">
              <div className="crop-control-group">
                <div className="crop-control-label">
                  <span>Zoom</span>
                  <span className="crop-control-value">{Math.round(zoom * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="crop-slider"
                />
              </div>

              <div className="crop-control-group">
                <div className="crop-control-label">
                  <span>Rotation</span>
                  <span className="crop-control-value">{rotation}°</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  step="1"
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  className="crop-slider"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="crop-control-group">
                  <div className="crop-control-label">
                    <span>X Offset</span>
                  </div>
                  <input 
                    type="range" 
                    min="-150" 
                    max="150" 
                    step="1"
                    value={offset.x}
                    onChange={(e) => setOffset(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                    className="crop-slider"
                  />
                </div>

                <div className="crop-control-group">
                  <div className="crop-control-label">
                    <span>Y Offset</span>
                  </div>
                  <input 
                    type="range" 
                    min="-150" 
                    max="150" 
                    step="1"
                    value={offset.y}
                    onChange={(e) => setOffset(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                    className="crop-slider"
                  />
                </div>
              </div>
            </div>

            <div className="crop-modal-footer">
              <button 
                type="button" 
                onClick={() => {
                  setShowCropModal(false);
                  setCropImageSrc(null);
                }} 
                className="btn btn-secondary btn-full"
                disabled={photoLoading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveCrop} 
                className="btn btn-primary btn-full flex items-center justify-center gap-2"
                disabled={photoLoading}
              >
                {photoLoading ? (
                  <>
                    <div className="spinner w-4 h-4"></div>
                    Applying...
                  </>
                ) : 'Save & Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
