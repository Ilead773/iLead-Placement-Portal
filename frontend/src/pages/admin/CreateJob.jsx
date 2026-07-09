import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import { ILEAD_COURSES_OBJ } from '../../constants/courses';
import { 
  Building2, Briefcase, MapPin, GraduationCap, Users, 
  Mail, Settings, Zap, DollarSign, Calendar, ListOrdered, FileText,
  ChevronDown, Check, CheckCircle2
} from 'lucide-react';

const CreateJob = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cloneId = searchParams.get('clone');
  const useDraft = searchParams.get('use_draft');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdJobId, setCreatedJobId] = useState(null);
  const [aiJsonInput, setAiJsonInput] = useState('');
  const [aiParseError, setAiParseError] = useState(null);
  const [aiParseSuccess, setAiParseSuccess] = useState(false);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [courseSearch, setCourseSearch] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState({});

  // ── Advanced Targeting State ──
  const [targetingOpen, setTargetingOpen] = useState(false);
  const [targetingSearch, setTargetingSearch] = useState('');
  const [targetingCourse, setTargetingCourse] = useState('');
  const [targetingCgpa, setTargetingCgpa] = useState('');
  const [targetingSkillInput, setTargetingSkillInput] = useState('');
  const [targetingSkills, setTargetingSkills] = useState([]);
  const [targetingResults, setTargetingResults] = useState([]);
  const [targetingLoading, setTargetingLoading] = useState(false);

  const setCategoryCollapseState = (catName, isCollapsed) => {
    setCollapsedCategories(prev => ({ ...prev, [catName]: isCollapsed }));
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get('/north-star/courses/');
        const coursesList = Array.isArray(response.data) ? response.data : (response.data.courses || []);
        setAvailableCourses(coursesList);
      } catch (err) {
        console.error('Failed to fetch courses', err);
        setAvailableCourses(ILEAD_COURSES_OBJ);
      }
    };
    fetchCourses();
  }, []);

  const parsePackageValue = (pkg, listingType) => {
    if (!pkg) return { amount: '', unit: listingType === 'internship' ? '/ month' : 'LPA' };
    const pkgStr = String(pkg).trim();
    if (pkgStr === 'Unpaid') {
      return { amount: '', unit: pkgStr };
    }
    if (pkgStr.endsWith('/month') || pkgStr.endsWith('/ month') || pkgStr.endsWith('/mo') || pkgStr.endsWith('/ mo')) {
      const amount = pkgStr.replace(/\s*\/\s*(month|mo)$/, '').trim();
      return { amount, unit: '/ month' };
    }
    if (pkgStr.endsWith('Total Stipend') || pkgStr.endsWith('total stipend')) {
      const amount = pkgStr.replace(/\s*total stipend$/i, '').trim();
      return { amount, unit: 'Total Stipend' };
    }
    if (pkgStr.endsWith('LPA') || pkgStr.endsWith(' lpa')) {
      const amount = pkgStr.replace(/\s*LPA$/i, '').trim();
      return { amount, unit: 'LPA' };
    }
    return { amount: pkgStr, unit: 'Custom' };
  };

  useEffect(() => {
    if (cloneId) {
      const fetchCloneData = async () => {
        try {
          const response = await axios.get(`/jobs/jobs/${cloneId}/`, {
            params: { _t: Date.now() }
          });
          const data = response.data;
          
          const parsedPkg = parsePackageValue(data.package, data.listing_type || 'job');
          setSalaryAmount(parsedPkg.amount);
          setSalaryUnit(parsedPkg.unit);

          let deadlineStr = '';
          if (data.application_deadline) {
            const d = new Date(data.application_deadline);
            if (!isNaN(d.getTime())) {
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              const hours = String(d.getHours()).padStart(2, '0');
              const minutes = String(d.getMinutes()).padStart(2, '0');
              deadlineStr = `${year}-${month}-${day}T${hours}:${minutes}`;
            }
          }

          setFormData(prev => ({
            ...prev,
            company_name: data.company_name || '',
            company_website: data.company_website || '',
            role: data.role ? `${data.role} (Copy)` : '',
            description: data.description || '',
            package: data.package || '',
            location: data.location || '',
            job_type: data.job_type || 'internal',
            listing_type: data.listing_type || 'job',
            duration: data.duration || '',
            application_deadline: deadlineStr,
            external_link: data.external_link || '',
            category: data.category || 'C',
            openings_count: data.openings_count || 1,
            hr_email: data.hr_email || '',
            eligibility_rules: {
              min_cgpa: data.eligibility_rules?.min_cgpa === undefined || data.eligibility_rules?.min_cgpa === null || data.eligibility_rules?.min_cgpa === 0 ? '' : String(data.eligibility_rules.min_cgpa),
              min_attendance: data.eligibility_rules?.min_attendance === undefined || data.eligibility_rules?.min_attendance === null || data.eligibility_rules?.min_attendance === 0 ? '' : String(data.eligibility_rules.min_attendance),
              max_backlogs: data.eligibility_rules?.max_backlogs === undefined || data.eligibility_rules?.max_backlogs === null ? '' : String(data.eligibility_rules.max_backlogs),
              allowed_branches: data.eligibility_rules?.allowed_branches || [],
              allowed_years: data.eligibility_rules?.allowed_years || [],
              allowed_categories: data.eligibility_rules?.allowed_categories || [],
              allowed_students: []
            },
            rounds: (data.rounds || []).map(r => ({
              round_number: r.round_number,
              round_name: r.round_name,
              round_type: r.round_type,
              is_elimination: r.is_elimination,
              passing_score: r.passing_score,
              duration_minutes: r.duration_minutes
            }))
          }));

          const savedIds = data.eligibility_rules?.allowed_students || [];
          if (savedIds.length > 0) {
            try {
              const { data: studData } = await axios.get(`/students/?ids=${savedIds.join(',')}&limit=200`);
              const studentObjs = (studData.results || []).map(s => ({
                id: s.id, name: s.name, registration_number: s.registration_number
              }));
              setFormData(prev => ({
                ...prev,
                eligibility_rules: { ...prev.eligibility_rules, allowed_students: studentObjs }
              }));
            } catch (e) {
              console.error('Failed to pre-fill allowed_students for clone', e);
            }
          }
        } catch (err) {
          console.error('Failed to fetch clone details', err);
          setError('Failed to fetch original job details for cloning.');
        }
      };
      fetchCloneData();
    }
  }, [cloneId]);

  useEffect(() => {
    if (useDraft) {
      try {
        const draftStr = sessionStorage.getItem('temp_job_form');
        if (draftStr) {
          const parsed = JSON.parse(draftStr);
          if (parsed.salaryAmount) setSalaryAmount(parsed.salaryAmount);
          if (parsed.salaryUnit) setSalaryUnit(parsed.salaryUnit);
          if (parsed.formData) setFormData(parsed.formData);
          sessionStorage.removeItem('temp_job_form');
        }
      } catch (err) {
        console.error('Failed to load form draft', err);
      }
    }
  }, [useDraft]);

  const [formData, setFormData] = useState({
    company_name: '', company_website: '', role: '', description: '',
    package: '', location: '', job_type: 'internal', listing_type: 'job',
    application_deadline: '', external_link: '', category: 'C', openings_count: 1,
    hr_email: '',
    eligibility_rules: {
      min_cgpa: '', min_attendance: '', max_backlogs: '',
      allowed_branches: [], allowed_years: [], allowed_categories: [], allowed_students: []
    },
    rounds: []
  });

  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryUnit, setSalaryUnit] = useState('LPA');

  const [ppoStipend, setPpoStipend] = useState('');
  const [ppoDuration, setPpoDuration] = useState('3 months');
  const [ppoCtc, setPpoCtc] = useState('');

  const handlePpoChange = (stipend, duration, ctc) => {
    setPpoStipend(stipend);
    setPpoDuration(duration);
    setPpoCtc(ctc);
    const stipendStr = stipend ? `${stipend} / month` : 'Unpaid';
    const combined = `${stipendStr} (${duration} Internship) + ${ctc} LPA (PPO)`;
    setFormData(prev => ({ ...prev, package: combined }));
  };

  const handleSalaryChange = (amount, unit) => {
    setSalaryAmount(amount);
    setSalaryUnit(unit);
    if (unit === 'Custom') {
      setFormData(prev => ({ ...prev, package: amount }));
    } else if (unit === 'Internship + PPO') {
      handlePpoChange(ppoStipend, ppoDuration, ppoCtc);
    } else {
      setFormData(prev => ({ ...prev, package: amount ? `${amount} ${unit}` : '' }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenChatGPT = () => {
    if (!formData.company_name) return;
    const prompt = `Act as an expert recruitment corporate intelligence agent.
Provide accurate, comprehensive details for the company: "${formData.company_name}".
You must return ONLY a valid, standard JSON object (no markdown formatting, no backticks, no text outside the JSON) matching this exact format:
{
  "description": "<Provide a professional, detailed 3-4 sentence overview of ${formData.company_name}, their core industry, products, and developer culture>",
  "company_website": "<Official website URL of ${formData.company_name}, e.g. https://www.microsoft.com>"
}
Return only the JSON object.`;
    const chatGPTUrl = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
    window.open(chatGPTUrl, '_blank');
  };

  const handleAiJsonChange = (e) => {
    const val = e.target.value;
    setAiJsonInput(val);
    setAiParseError(null);
    setAiParseSuccess(false);
    if (!val.trim()) return;

    const stripMdLink = (str) => {
      if (!str) return str;
      const match = str.match(/^\[.*?\]\((.*?)\)$/);
      return match ? match[1] : str;
    };

    try {
      let cleanVal = val.trim();
      if (cleanVal.startsWith('```')) {
        cleanVal = cleanVal.replace(/^```(json)?\n/, '').replace(/\n```$/, '');
      }
      const parsed = JSON.parse(cleanVal);
      setFormData(prev => {
        const updated = { ...prev };
        if (parsed.description) updated.description = parsed.description;
        if (parsed.company_website) updated.company_website = stripMdLink(parsed.company_website);
        return updated;
      });
      setAiParseSuccess(true);
    } catch (err) {
      setAiParseError('Failed to parse JSON. Please make sure the JSON structure is valid.');
    }
  };

  const handleEligibilityChange = (field, value) => {
    setFormData(prev => ({
      ...prev, eligibility_rules: { ...prev.eligibility_rules, [field]: value }
    }));
  };

  const handleCourseToggle = (courseName) => {
    const currentSelected = formData.eligibility_rules.allowed_branches || [];
    let newSelected;
    if (currentSelected.includes(courseName)) {
      newSelected = currentSelected.filter(name => name !== courseName);
    } else {
      newSelected = [...currentSelected, courseName];
    }
    handleEligibilityChange('allowed_branches', newSelected);
  };

  const handleSelectAllCourses = (selectAll) => {
    if (selectAll) {
      const allNames = availableCourses.map(c => c.name);
      handleEligibilityChange('allowed_branches', allNames);
    } else {
      handleEligibilityChange('allowed_branches', []);
    }
  };

  const handleSelectCategory = (catName, selectAll) => {
    const catCourses = availableCourses.filter(c => (c.category || 'Other') === catName).map(c => c.name);
    const currentSelected = formData.eligibility_rules.allowed_branches || [];
    let newSelected;
    if (selectAll) {
      newSelected = Array.from(new Set([...currentSelected, ...catCourses]));
    } else {
      newSelected = currentSelected.filter(name => !catCourses.includes(name));
    }
    handleEligibilityChange('allowed_branches', newSelected);
  };

  const [hasSearched, setHasSearched] = useState(false);

  const searchTargetStudents = async () => {
    setTargetingLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({ limit: 10000 });
      if (targetingSearch) params.set('search', targetingSearch);
      if (targetingCourse) params.set('course', targetingCourse);
      if (targetingCgpa) params.set('cgpa_min', targetingCgpa);
      if (targetingSkills.length > 0) params.set('skill', targetingSkills.join(','));
      const { data } = await axios.get(`/students/?${params}`);
      setTargetingResults(data.results || []);
    } catch (err) {
      console.error('Failed to search students', err);
    } finally {
      setTargetingLoading(false);
    }
  };

  useEffect(() => {
    if (!targetingOpen) return;
    const delayDebounceFn = setTimeout(() => {
      searchTargetStudents();
    }, 450);
    return () => clearTimeout(delayDebounceFn);
  }, [targetingSearch, targetingCgpa, targetingCourse, targetingSkills, targetingOpen]);

  const toggleTargetStudent = (student) => {
    const already = (formData.eligibility_rules.allowed_students || []).some(s => s.id === student.id);
    if (already) {
      handleEligibilityChange('allowed_students', formData.eligibility_rules.allowed_students.filter(s => s.id !== student.id));
    } else {
      handleEligibilityChange('allowed_students', [
        ...(formData.eligibility_rules.allowed_students || []),
        { id: student.id, name: student.name, registration_number: student.registration_number }
      ]);
    }
  };

  const [submitType, setSubmitType] = useState('publish');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        eligibility_rules: {
          ...formData.eligibility_rules,
          min_cgpa: parseFloat(formData.eligibility_rules.min_cgpa) || 0,
          min_attendance: parseInt(formData.eligibility_rules.min_attendance) || 0,
          max_backlogs: formData.eligibility_rules.max_backlogs === '' || formData.eligibility_rules.max_backlogs === null
            ? null : parseInt(formData.eligibility_rules.max_backlogs),
          allowed_students: (formData.eligibility_rules.allowed_students || []).map(s => s.id)
        },
        rounds: (formData.rounds || []).map(r => {
          const { id, ...rest } = r;
          return rest;
        })
      };
      
      const response = await axios.post('/jobs/admin/jobs/', payload);
      const jobId = response.data.id;
      await axios.post(`/jobs/admin/jobs/${jobId}/publish/`);
      
      if (submitType === 'add_another') {
        toast.success(`Job drive for "${formData.role}" published successfully! 🎉 Form is reset for the next role.`);
        setFormData(prev => ({
          ...prev,
          role: '',
          package: '',
          application_deadline: '',
          openings_count: 1
        }));
        setSalaryAmount('');
        setSalaryUnit('LPA');
        setCreatedJobId(null);
      } else {
        toast.success('Job drive published successfully! 🎉');
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  const handleCloneToNewTab = () => {
    try {
      const dataToSave = {
        formData,
        salaryAmount,
        salaryUnit
      };
      sessionStorage.setItem('temp_job_form', JSON.stringify(dataToSave));
      window.open(window.location.pathname + '?use_draft=true', '_blank');
      toast.success('Form details cloned to new tab! 🎉');
    } catch (err) {
      console.error('Failed to clone form state to new tab', err);
      toast.error('Failed to clone form to new tab.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-body)] pb-20 relative">
      {/* Header with Actions */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border-color)] p-4 md:px-8 md:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-primary flex items-center gap-3 m-0 leading-none">
            <div className="p-2 rounded-xl bg-[var(--accent-soft)]">
              <Briefcase className="text-[var(--accent-primary)]" size={24} />
            </div>
            Create New Job Placement
          </h1>
          <p className="text-sm text-muted mt-2 m-0 ml-12">Publish a new job opportunity for students.</p>
        </div>
        <div className="flex items-center gap-4 self-end sm:self-auto">
          <button type="button" onClick={() => navigate('/admin/dashboard')} className="btn" style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleCloneToNewTab}
            className="btn btn-secondary px-6 flex items-center gap-2" 
            style={{ borderRadius: '10px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)' }}
          >
            Clone to New Tab
          </button>
          <button 
            type="submit" 
            form="create-job-form" 
            disabled={loading} 
            onClick={() => setSubmitType('add_another')}
            className="btn btn-secondary px-6 flex items-center gap-2" 
            style={{ borderRadius: '10px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)' }}
          >
            {loading && submitType === 'add_another' ? 'Processing...' : 'Publish & Add Another'}
          </button>
          <button 
            type="submit" 
            form="create-job-form" 
            disabled={loading} 
            onClick={() => setSubmitType('publish')}
            className="btn btn-primary px-6 flex items-center gap-2" 
            style={{ borderRadius: '10px', boxShadow: '0 4px 15px rgba(37,99,235,0.25)' }}
          >
            {loading && submitType === 'publish' ? 'Processing...' : 'Publish Job'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full p-4 md:p-8 mt-4">
        {error && <div className="alert alert-error mb-8 shadow-sm">{error}</div>}

        <form id="create-job-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
          
          {/* Card 1: Basic Information */}
          <section className="card p-8 border border-[var(--border-color)] rounded-2xl shadow-sm transition-shadow hover:shadow-md" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[var(--border-light)]">
              <div className="p-2 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-primary)]">
                <Building2 size={20} strokeWidth={2.5} />
              </div>
              <h2 className="text-lg font-extrabold text-primary m-0 tracking-wide uppercase text-[0.9rem]">Basic Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="input-group">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                  Company Name <span className="text-danger">*</span>
                </label>
                <input required type="text" name="company_name" value={formData.company_name} onChange={handleInputChange} className="input-field shadow-sm" placeholder="e.g. Google, Microsoft" />
              </div>
              <div className="input-group">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Company Website</label>
                <input type="url" name="company_website" value={formData.company_website} onChange={handleInputChange} className="input-field shadow-sm" placeholder="https://example.com" />
              </div>
              <div className="input-group">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                  Role / Job Title <span className="text-danger">*</span>
                </label>
                <input required type="text" name="role" value={formData.role} onChange={handleInputChange} className="input-field shadow-sm" placeholder="e.g. Software Engineer" />
              </div>
              <div className="input-group">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Company Category</label>
                <select name="category" value={formData.category} onChange={handleInputChange} className="input-field shadow-sm font-semibold">
                  <option value="A">Category A (Tier 1)</option>
                  <option value="B">Category B (Tier 2)</option>
                  <option value="C">Category C (Tier 3)</option>
                  <option value="Own">Own Category (Custom Eligibility)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Academic Criteria (Conditionally Rendered) */}
          {formData.category === 'Own' && (
            <section className="card p-8 border border-[var(--border-color)] rounded-2xl shadow-sm bg-[var(--bg-card)] animate-in slide-in-from-top-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[var(--warning)]"></div>
              <div className="flex flex-col mb-6 pb-5 border-b border-[var(--border-light)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[rgba(245,158,11,0.1)] text-[var(--warning)]">
                    <Settings size={20} strokeWidth={2.5} />
                  </div>
                  <h2 className="text-lg font-extrabold text-primary m-0 tracking-wide uppercase text-[0.9rem]">Academic & Attendance Criteria</h2>
                </div>
                <p className="text-xs text-muted mt-2 ml-11">Set minimum limits to filter eligible students automatically.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="input-group">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Minimum CGPA</label>
                  <input type="number" step="0.1" min="0" max="10" value={formData.eligibility_rules.min_cgpa} onChange={(e) => handleEligibilityChange('min_cgpa', e.target.value)} className="input-field shadow-sm" placeholder="e.g. 7.5" />
                </div>
                <div className="input-group">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Min Attendance (%)</label>
                  <input type="number" min="0" max="100" value={formData.eligibility_rules.min_attendance} onChange={(e) => handleEligibilityChange('min_attendance', e.target.value)} className="input-field shadow-sm" placeholder="e.g. 75" />
                </div>
                <div className="input-group">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Max Active Backlogs</label>
                  <input type="number" min="0" value={formData.eligibility_rules.max_backlogs} onChange={(e) => handleEligibilityChange('max_backlogs', e.target.value)} className="input-field shadow-sm" placeholder="e.g. 0" />
                </div>
              </div>
            </section>
          )}

          {/* Card 2: Job Details & Description */}
          <section className="card p-8 border border-[var(--border-color)] rounded-2xl shadow-sm transition-shadow hover:shadow-md" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[var(--border-light)]">
              <div className="p-2 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-primary)]">
                <FileText size={20} strokeWidth={2.5} />
              </div>
              <h2 className="text-lg font-extrabold text-primary m-0 tracking-wide uppercase text-[0.9rem]">Job Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="input-group">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                  <DollarSign size={14} /> Package / Salary <span className="text-danger">*</span>
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {salaryUnit !== 'Internship + PPO' && (
                    <input 
                      required 
                      type="text" 
                      value={salaryAmount} 
                      onChange={(e) => handleSalaryChange(e.target.value, salaryUnit)} 
                      className="input-field shadow-sm font-semibold text-[var(--accent-primary)]" 
                      placeholder={salaryUnit === 'Custom' ? "e.g. 15k/mo + 6.5 LPA" : "e.g. 6.5 or 5000-10000"} 
                      style={{ flex: 1 }} 
                    />
                  )}
                  {salaryUnit === 'Internship + PPO' && (
                    <div style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Configure Internship + PPO details below:
                    </div>
                  )}
                  <select 
                    value={salaryUnit} 
                    onChange={(e) => handleSalaryChange(salaryAmount, e.target.value)} 
                    className="input-field shadow-sm font-semibold text-[var(--text-primary)]" 
                    style={{ width: '150px', minWidth: '150px' }}
                  >
                    <option value="LPA">LPA</option>
                    <option value="/ month">/ month</option>
                    <option value="Internship + PPO">Internship + PPO</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                {salaryUnit === 'Internship + PPO' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: '100%', marginTop: '8px', padding: '12px', background: 'var(--bg-card-hover)', borderRadius: '8px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}>
                    <div className="input-group">
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] mb-1" style={{ display: 'block' }}>Stipend (Rupees)</label>
                      <input 
                        type="text" 
                        value={ppoStipend} 
                        onChange={(e) => handlePpoChange(e.target.value, ppoDuration, ppoCtc)} 
                        className="input-field shadow-sm text-xs font-semibold text-[var(--accent-primary)]" 
                        placeholder="e.g. 15000 (or blank for Unpaid)" 
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className="input-group">
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] mb-1" style={{ display: 'block' }}>Duration</label>
                      <select 
                        value={ppoDuration} 
                        onChange={(e) => handlePpoChange(ppoStipend, e.target.value, ppoCtc)} 
                        className="input-field shadow-sm text-xs font-semibold text-[var(--text-primary)]"
                        style={{ width: '100%' }}
                      >
                        <option value="2 months">2 months</option>
                        <option value="3 months">3 months</option>
                        <option value="6 months">6 months</option>
                        <option value="9 months">9 months</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] mb-1" style={{ display: 'block' }}>CTC (LPA)</label>
                      <input 
                        required 
                        type="text" 
                        value={ppoCtc} 
                        onChange={(e) => handlePpoChange(ppoStipend, ppoDuration, e.target.value)} 
                        className="input-field shadow-sm text-xs font-semibold text-[var(--accent-primary)]" 
                        placeholder="e.g. 6.5" 
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="input-group">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                  <MapPin size={14} /> Location <span className="text-danger">*</span>
                </label>
                <input required type="text" name="location" value={formData.location} onChange={handleInputChange} className="input-field shadow-sm" placeholder="e.g. Bangalore, Remote" />
              </div>
              <div className="input-group">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                  <ListOrdered size={14} /> Openings Count <span className="text-danger">*</span>
                </label>
                <input required type="number" min="1" name="openings_count" value={formData.openings_count} onChange={handleInputChange} className="input-field shadow-sm" />
              </div>
              <div className="input-group">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                  <Calendar size={14} /> Application Deadline <span className="text-danger">*</span>
                </label>
                <input required type="datetime-local" name="application_deadline" value={formData.application_deadline} onChange={handleInputChange} className="input-field shadow-sm" />
              </div>

              {/* Description */}
              <div className="col-span-1 md:col-span-2 mt-4">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                  Job Description <span className="text-danger">*</span>
                </label>
                <textarea required name="description" value={formData.description} onChange={handleInputChange} rows={6} className="input-field shadow-sm resize-y leading-relaxed" placeholder="Detailed responsibilities, requirements, and perks..."></textarea>
              </div>

              {/* AI Copilot Panel inside Job Details */}
              <div className="col-span-1 md:col-span-2 p-5 rounded-xl border flex flex-col gap-4 bg-[var(--bg-card-hover)] border-[var(--border-color)] mt-2 transition-all">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <span className="p-1.5 px-3 rounded-md font-black text-[var(--accent-primary)] bg-[var(--accent-soft)] text-[10px] uppercase tracking-widest flex items-center gap-1">
                      <Zap size={12} fill="currentColor" /> AI Copilot
                    </span>
                    <h3 className="text-sm font-bold text-primary">Auto-Fill Description & Info</h3>
                  </div>
                  {formData.company_name ? (
                    <button type="button" onClick={handleOpenChatGPT} className="btn btn-secondary py-1.5 px-4 text-xs rounded-lg shadow-sm font-bold">
                      🚀 Generate with ChatGPT
                    </button>
                  ) : (
                    <span className="text-xs text-muted italic">Type in a Company Name above to enable AI Copilot</span>
                  )}
                </div>
                
                {formData.company_name && (
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Paste ChatGPT JSON Response here:</label>
                    <textarea placeholder='{ "description": "...", "company_website": "..." }' value={aiJsonInput} onChange={handleAiJsonChange} rows={2} className="input-field text-xs font-mono shadow-inner bg-[var(--bg-input)] border-[var(--border-color)] rounded-lg p-3" />
                    <div className="flex items-center justify-between mt-1">
                      {aiParseError ? <span className="text-[11px] font-bold text-danger flex items-center gap-1">⚠️ {aiParseError}</span> : <span></span>}
                      {aiParseSuccess ? <span className="text-[11px] font-bold text-success flex items-center gap-1">✨ Successfully populated form!</span> : <span></span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Card 3: Contact Info */}
          <section className="card p-8 border border-[var(--border-color)] rounded-2xl shadow-sm transition-shadow hover:shadow-md" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[var(--border-light)]">
              <div className="p-2 rounded-lg bg-[rgba(16,185,129,0.1)] text-[var(--success)]">
                <Mail size={20} strokeWidth={2.5} />
              </div>
              <h2 className="text-lg font-extrabold text-primary m-0 tracking-wide uppercase text-[0.9rem]">Recruiter Contact Info</h2>
            </div>
            <div className="input-group">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Company HR Email <span className="text-[10px] font-normal text-muted lowercase normal-case ml-1">(Optional — will auto-fill when sending resumes)</span></label>
              <input type="email" name="hr_email" value={formData.hr_email} onChange={handleInputChange} className="input-field shadow-sm max-w-lg" placeholder="hr@company.com" />
            </div>
          </section>

          {/* Card 4: Target Courses Eligibility */}
          <section className="card p-8 border border-[var(--border-color)] rounded-2xl shadow-sm transition-shadow hover:shadow-md" style={{ background: 'var(--bg-card)' }}>
             <div className="flex flex-col gap-2 mb-6 pb-5 border-b border-[var(--border-light)]">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]">
                    <GraduationCap size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-primary m-0 tracking-wide uppercase text-[0.9rem]">Target Courses Eligibility</h2>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => handleSelectAllCourses(true)} className="btn bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white border-none shadow-md hover:shadow-lg rounded-lg text-xs font-black uppercase tracking-wider px-4 py-2 transition-all">
                    ⚡ Select All Courses
                  </button>
                  <button type="button" onClick={() => handleSelectAllCourses(false)} className="btn bg-[var(--bg-card-hover)] text-[var(--text-secondary)] border border-[var(--border-color)] rounded-lg text-xs font-black uppercase tracking-wider px-4 py-2 transition-all hover:bg-[var(--bg-disabled)]">
                    Clear All
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted ml-11">Only students belonging to the selected courses will see and be eligible to apply.</p>
            </div>

            {/* Course Search Bar */}
            <div className="flex flex-col gap-2 mt-2">
              <input type="text" placeholder="🔍 Search courses by name or department (e.g. BCA, Media Science)..." value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} className="input-field text-sm rounded-xl py-3 px-4 shadow-inner" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)' }} />
            </div>

            {/* Grouped Target Courses Grid */}
            <div className="flex flex-col gap-4 mt-4" style={{ maxHeight: '550px', overflowY: 'auto', paddingRight: '8px' }}>
              {(() => {
                const filteredCourses = availableCourses.filter(c => 
                  c.name.toLowerCase().includes(courseSearch.toLowerCase()) || 
                  (c.category && c.category.toLowerCase().includes(courseSearch.toLowerCase()))
                );

                const grouped = filteredCourses.reduce((acc, course) => {
                  const cat = course.category || 'Other';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(course);
                  return acc;
                }, {});

                if (Object.keys(grouped).length === 0) {
                  return <div className="text-sm text-muted text-center py-10 font-semibold">No matching courses found. Try a different search term.</div>;
                }

                return Object.keys(grouped).map(catName => {
                  const courses = grouped[catName];
                  const catCourseNames = courses.map(c => c.name);
                  const selectedInCat = (formData.eligibility_rules.allowed_branches || []).filter(name => catCourseNames.includes(name));
                  const isCollapsedByDefault = selectedInCat.length === 0;
                  const isCollapsed = courseSearch.trim().length > 0 ? false : (collapsedCategories[catName] !== undefined ? collapsedCategories[catName] : isCollapsedByDefault);

                  return (
                    <div 
                      key={catName} 
                      className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-card)] shadow-sm transition-all duration-200 hover:border-[var(--accent-soft)]"
                      style={{ flexShrink: 0 }}
                    >
                      {/* Category Header */}
                      <div onClick={() => setCategoryCollapseState(catName, !isCollapsed)} className={`flex justify-between items-center px-5 py-3 cursor-pointer select-none transition-colors ${isCollapsed ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-card-hover)]'}`}>
                        <div className="flex items-center gap-3">
                          <ChevronDown size={18} className={`text-muted transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                          <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">📁 {catName}</span>
                          <span className={`text-[10px] py-1 px-3 rounded-full font-bold border transition-colors ${selectedInCat.length > 0 ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] border-[var(--accent-soft)]' : 'bg-[var(--bg-card-hover)] text-muted border-[var(--border-color)]'}`}>
                            {selectedInCat.length} of {courses.length} selected
                          </span>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button type="button" onClick={() => handleSelectCategory(catName, true)} className="bg-[var(--accent-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary)] px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide hover:bg-[var(--accent-primary)] hover:text-white transition-colors">
                            Select All
                          </button>
                          <button type="button" onClick={() => handleSelectCategory(catName, false)} className="bg-[var(--bg-card)] text-muted border border-[var(--border-color)] px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide hover:bg-red-50 hover:text-red-500 hover:border-red-300 transition-colors">
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* Category Courses */}
                      {!isCollapsed && (
                        <div 
                          className="p-5 border-t border-[var(--border-color)] bg-[var(--bg-card-hover)]"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                            gap: '10px'
                          }}
                        >
                          {courses.map(course => {
                            const isChecked = (formData.eligibility_rules.allowed_branches || []).includes(course.name);
                            return (
                              <button 
                                key={course.name} 
                                type="button" 
                                onClick={() => handleCourseToggle(course.name)} 
                                className={`rounded-xl border text-xs font-bold cursor-pointer transition-all duration-200 outline-none ${isChecked ? 'bg-[var(--accent-soft)] border-[var(--accent-primary)] text-primary shadow-sm scale-[1.02]' : 'bg-[var(--bg-card)] border-[var(--border-color)] text-secondary shadow-sm hover:border-[var(--accent-primary)] hover:bg-[var(--bg-card-hover)]'}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '10px 16px',
                                  width: '100%',
                                  justifyContent: 'flex-start',
                                  textAlign: 'left',
                                  wordBreak: 'break-word',
                                  whiteSpace: 'normal'
                                }}
                              >
                                <div 
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 0.15s ease',
                                    background: isChecked ? 'var(--accent-primary)' : 'transparent',
                                    border: isChecked ? 'none' : '2px solid var(--border-color)',
                                    color: '#ffffff'
                                  }}
                                >
                                  {isChecked && <Check size={12} strokeWidth={4} />}
                                </div>
                                <span>{course.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </section>

          {/* Card 5: Advanced Targeting Section */}
          <section className="card border border-[var(--border-color)] rounded-2xl shadow-sm transition-shadow overflow-hidden bg-[var(--bg-card)]">
            <div onClick={() => setTargetingOpen(!targetingOpen)} className={`flex justify-between items-center px-8 py-5 cursor-pointer select-none transition-colors ${targetingOpen ? 'bg-[var(--bg-card-hover)]' : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]'}`}>
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-[rgba(236,72,153,0.1)] text-pink-500">
                  <Users size={20} strokeWidth={2.5} />
                </div>
                <h2 className="text-lg font-extrabold text-primary m-0 tracking-wide uppercase text-[0.9rem]">Advanced Student Targeting</h2>
                <span className="text-[10px] font-bold text-muted bg-[var(--bg-card)] border border-[var(--border-color)] px-2 py-0.5 rounded-full uppercase tracking-widest">Optional</span>
                {(formData.eligibility_rules.allowed_students || []).length > 0 && !targetingOpen && (
                  <span className="text-[10px] font-black text-white bg-[var(--accent-primary)] px-3 py-1 rounded-full uppercase shadow-sm">
                    {formData.eligibility_rules.allowed_students.length} student{formData.eligibility_rules.allowed_students.length !== 1 ? 's' : ''} targeted
                  </span>
                )}
              </div>
              <ChevronDown size={20} className={`text-muted transition-transform duration-300 ${targetingOpen ? '-rotate-180' : 'rotate-0'}`} />
            </div>

            {targetingOpen && (
              <div className="border-t border-[var(--border-color)]">
                <div className="px-8 py-3 bg-blue-50/50 dark:bg-blue-900/10 border-b border-[var(--border-color)]">
                  <p className="text-xs text-secondary m-0 leading-relaxed font-medium">
                    Filter specific students to bypass general rules. <strong className="text-[var(--accent-primary)]">If any students are selected, ONLY they will be eligible</strong>. Leave empty for normal rules.
                  </p>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6 bg-[var(--bg-card)] border-b border-[var(--border-color)]">
                  <div className="input-group">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted mb-2">🔍 Name / Reg No</label>
                    <input type="text" placeholder="Search student..." value={targetingSearch} onChange={e => setTargetingSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchTargetStudents(); } }} className="input-field text-sm shadow-sm" />
                  </div>
                  <div className="input-group">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted mb-2">📚 Course</label>
                    <select value={targetingCourse} onChange={e => setTargetingCourse(e.target.value)} className="input-field text-sm shadow-sm">
                      <option value="">All Courses</option>
                      {availableCourses.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted mb-2">📊 Min CGPA</label>
                    <input type="number" placeholder="e.g. 7.0" step="0.1" min="0" max="10" value={targetingCgpa} onChange={e => setTargetingCgpa(e.target.value)} className="input-field text-sm shadow-sm" />
                  </div>
                  <div className="input-group">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted mb-2">🛠 Skills (Enter to add)</label>
                    <input type="text" placeholder="e.g. React..." value={targetingSkillInput} onChange={e => setTargetingSkillInput(e.target.value)} onKeyDown={e => {
                        if ((e.key === 'Enter' || e.key === ',') && targetingSkillInput.trim()) {
                          e.preventDefault();
                          const val = targetingSkillInput.trim().replace(/,$/, '');
                          if (val && !targetingSkills.includes(val)) setTargetingSkills(prev => [...prev, val]);
                          setTargetingSkillInput('');
                        }
                      }} className="input-field text-sm shadow-sm" />
                    {targetingSkills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {targetingSkills.map(skill => (
                          <span key={skill} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(139,92,246,0.1)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '100px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
                            {skill}
                            <button type="button" onClick={() => setTargetingSkills(targetingSkills.filter(s => s !== skill))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-8 py-4 bg-[var(--bg-card-hover)] border-b border-[var(--border-color)] flex items-center justify-between flex-wrap gap-4">
                  <button type="button" onClick={searchTargetStudents} disabled={targetingLoading} className="btn bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white border-none shadow-md hover:shadow-lg rounded-lg text-xs font-black uppercase tracking-wider px-6 py-2.5 transition-all flex items-center gap-2">
                    {targetingLoading ? '⏳ Searching...' : '⚡ Search Students'}
                  </button>
                  {targetingResults.length > 0 && <span className="text-sm font-bold text-secondary">{targetingResults.length} found</span>}
                </div>

                {targetingLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '12px', borderBottom: '1px solid var(--border-color)' }}>
                    <div className="spinner" style={{ width: '28px', height: '28px' }}></div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Searching matching students...</span>
                  </div>
                ) : targetingResults.length > 0 ? (
                  <div className="overflow-x-auto">
                    <div className="max-h-80 overflow-y-auto bg-[var(--bg-card)] min-w-[600px]">
                      <div className="grid grid-cols-[44px_1fr_160px_72px] px-8 py-3 bg-[var(--bg-card-hover)] border-b border-[var(--border-color)] sticky top-0 z-10">
                        <input type="checkbox" className="w-4 h-4 cursor-pointer self-center"
                          checked={targetingResults.length > 0 && targetingResults.every(s => (formData.eligibility_rules.allowed_students || []).some(sel => sel.id === s.id))}
                          onChange={e => {
                            if (e.target.checked) {
                              const newOnes = targetingResults.filter(s => !(formData.eligibility_rules.allowed_students || []).some(sel => sel.id === s.id));
                              handleEligibilityChange('allowed_students', [...(formData.eligibility_rules.allowed_students || []), ...newOnes.map(s => ({ id: s.id, name: s.name, registration_number: s.registration_number }))]);
                            } else {
                              const rIds = new Set(targetingResults.map(s => s.id));
                              handleEligibilityChange('allowed_students', (formData.eligibility_rules.allowed_students || []).filter(s => !rIds.has(s.id)));
                            }
                          }} />
                        <span className="text-[10px] font-extrabold text-muted uppercase tracking-wider">Student</span>
                        <span className="text-[10px] font-extrabold text-muted uppercase tracking-wider">Course</span>
                        <span className="text-[10px] font-extrabold text-muted uppercase tracking-wider text-right">CGPA</span>
                      </div>
                      {targetingResults.map(student => {
                        const isSel = (formData.eligibility_rules.allowed_students || []).some(s => s.id === student.id);
                        return (
                          <div key={student.id} onClick={() => toggleTargetStudent(student)} className={`grid grid-cols-[44px_1fr_160px_72px] px-8 py-3 border-b border-[var(--border-light)] cursor-pointer transition-colors ${isSel ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'hover:bg-[var(--bg-card-hover)]'}`}>
                            <input type="checkbox" checked={isSel} onChange={() => toggleTargetStudent(student)} onClick={e => e.stopPropagation()} className="w-4 h-4 cursor-pointer self-center mt-1" />
                            <div>
                              <div className="font-bold text-[13px] text-primary">{student.name}</div>
                              <div className="text-[11px] text-muted mt-0.5">{student.registration_number}</div>
                            </div>
                            <span className="text-xs text-secondary self-center truncate pr-2">{student.course || '—'}</span>
                            <span className={`text-xs font-bold self-center text-right ${student.cgpa >= 7 ? 'text-emerald-500' : student.cgpa >= 5 ? 'text-amber-500' : 'text-red-500'}`}>
                              {student.cgpa != null ? Number(student.cgpa).toFixed(1) : '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : hasSearched ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '8px', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '1.8rem' }}>🔍</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>No students found</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '280px', textAlign: 'center', lineHeight: '1.4' }}>Try broadening your search term, changing the course filter, or removing skill tags.</span>
                  </div>
                ) : null}

                {(formData.eligibility_rules.allowed_students || []).length > 0 && (
                  <div className="p-8 border-t border-[var(--border-color)] bg-blue-50/30 dark:bg-blue-900/10">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[11px] font-black text-[var(--accent-primary)] uppercase tracking-wide flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> {formData.eligibility_rules.allowed_students.length} Student{formData.eligibility_rules.allowed_students.length !== 1 ? 's' : ''} Selected
                      </span>
                      <button type="button" onClick={() => handleEligibilityChange('allowed_students', [])} className="text-xs font-bold text-danger hover:underline">Clear All</button>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {formData.eligibility_rules.allowed_students.map(s => (
                        <span key={s.id} className="inline-flex items-center gap-2 bg-[var(--accent-soft)] text-[var(--accent-primary)] border border-blue-200 dark:border-blue-800/50 rounded-full py-1 pr-3 pl-1.5 text-xs font-bold shadow-sm">
                          <span className="w-5 h-5 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                            {s.name?.charAt(0)?.toUpperCase()}
                          </span>
                          {s.name} <span className="text-[10px] opacity-70 font-medium">({s.registration_number})</span>
                          <button type="button" onClick={() => handleEligibilityChange('allowed_students', formData.eligibility_rules.allowed_students.filter(x => x.id !== s.id))} className="text-[var(--accent-primary)] hover:text-blue-900 ml-1">×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Add a large bottom spacer so floating headers don't hide last card */}
          <div className="h-8"></div>
        </form>
      </div>
    </div>
  );
};
export default CreateJob;
