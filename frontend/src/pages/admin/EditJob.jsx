import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../../api/axios';
import { ILEAD_COURSES_OBJ } from '../../constants/courses';
import { Plus, Trash2 } from 'lucide-react';

const EditJob = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
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
    setCollapsedCategories(prev => ({
      ...prev,
      [catName]: isCollapsed
    }));
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

  const [formData, setFormData] = useState({
    company_name: '',
    company_website: '',
    role: '',
    description: '',
    package: '',
    location: '',
    job_type: 'internal',
    application_deadline: '',
    external_link: '',
    category: 'C',
    openings_count: 1,
    hr_email: '',
    eligibility_rules: {
      min_cgpa: '',
      min_attendance: '',
      max_backlogs: '',
      allowed_branches: [],
      allowed_years: [],
      allowed_categories: [],
      allowed_students: []
    },
    rounds: []
  });

  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryUnit, setSalaryUnit] = useState('LPA');

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

  const handleSalaryChange = (amount, unit) => {
    setSalaryAmount(amount);
    setSalaryUnit(unit);
    if (unit === 'Unpaid') {
      setFormData(prev => ({ ...prev, package: unit }));
    } else if (unit === 'Custom') {
      setFormData(prev => ({ ...prev, package: amount }));
    } else {
      setFormData(prev => ({ ...prev, package: amount ? `${amount} ${unit}` : '' }));
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const response = await axios.get(`/jobs/jobs/${id}/`, {
        params: { _t: Date.now() }
      });
      const data = response.data;
      
      const parsedPkg = parsePackageValue(data.package, data.listing_type || 'job');
      setSalaryAmount(parsedPkg.amount);
      setSalaryUnit(parsedPkg.unit);

      // format datetime-local
      if (data.application_deadline) {
        const d = new Date(data.application_deadline);
        // Create local ISO string: YYYY-MM-DDTHH:mm
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        data.application_deadline = `${year}-${month}-${day}T${hours}:${minutes}`;
      }
      
      setFormData({
        company_name: data.company_name || '',
        company_website: data.company_website || '',
        role: data.role || '',
        description: data.description || '',
        package: data.package || '',
        location: data.location || '',
        job_type: data.job_type || 'internal',
        listing_type: data.listing_type || 'job',
        duration: data.duration || '',
        application_deadline: data.application_deadline || '',
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
          allowed_categories: data.eligibility_rules?.allowed_categories || []
        },
        rounds: data.rounds || []
      });

      // Pre-fill allowed_students: resolve saved IDs back to {id, name, registration_number} objects
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
          console.error('Failed to pre-fill allowed_students', e);
        }
      }
    } catch (err) {
      setError('Failed to fetch job details.');
    } finally {
      setFetching(false);
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

    // Strip markdown link format [text](url) → url
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
      ...prev,
      eligibility_rules: { ...prev.eligibility_rules, [field]: value }
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

  const addRound = () => {
    setFormData(prev => ({
      ...prev,
      rounds: [
        ...prev.rounds,
        { round_number: prev.rounds.length + 1, round_name: '', round_type: 'interview', is_elimination: true }
      ]
    }));
  };

  const updateRound = (index, field, value) => {
    const newRounds = [...formData.rounds];
    newRounds[index][field] = value;
    setFormData(prev => ({ ...prev, rounds: newRounds }));
  };

  const removeRound = (index) => {
    const newRounds = formData.rounds.filter((_, i) => i !== index).map((r, i) => ({ ...r, round_number: i + 1 }));
    setFormData(prev => ({ ...prev, rounds: newRounds }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Build the payload with a proper ISO 8601 deadline and parsed numbers
      const payload = { 
        ...formData,
        eligibility_rules: {
          ...formData.eligibility_rules,
          min_cgpa: parseFloat(formData.eligibility_rules.min_cgpa) || 0,
          min_attendance: parseInt(formData.eligibility_rules.min_attendance) || 0,
          max_backlogs: formData.eligibility_rules.max_backlogs === '' || formData.eligibility_rules.max_backlogs === null
            ? null
            : parseInt(formData.eligibility_rules.max_backlogs),
          allowed_students: (formData.eligibility_rules.allowed_students || []).map(s => s.id)
        }
      };
      if (payload.application_deadline) {
        const d = new Date(payload.application_deadline);
        if (!isNaN(d.getTime())) {
          payload.application_deadline = d.toISOString();
        }
      }
      await axios.put(`/jobs/admin/jobs/${id}/`, payload);
      // Redirect back to the correct list
      navigate(formData.listing_type === 'internship' ? '/admin/internships' : '/admin/jobs');
    } catch (err) {
      setError(err.response?.data?.error || JSON.stringify(err.response?.data) || 'Failed to update job');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="flex justify-center">
      <div className="card w-full max-w-4xl p-8">
        <h1 className="text-2xl font-bold text-primary mb-6">Edit {formData.listing_type === 'internship' ? 'Internship' : 'Job Placement'}</h1>

        {error && <div className="alert alert-error mb-6">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-primary">Details</h2>
            <div className="grid grid-cols-2 gap-6">
                <div className="input-group">
                  <label>Company Name</label>
                  <input required type="text" name="company_name" value={formData.company_name} onChange={handleInputChange} className="input-field" />
                </div>
                <div className="input-group">
                  <label>Company Website (Optional)</label>
                  <input type="url" name="company_website" value={formData.company_website} onChange={handleInputChange} className="input-field" placeholder="https://example.com" />
                </div>
                <div className="col-span-2 input-group">
                  <label>Role / Position</label>
                  <input required type="text" name="role" value={formData.role} onChange={handleInputChange} className="input-field" />
                </div>
                <div className="col-span-2 input-group">
                  <label>Description</label>
                  <textarea required name="description" value={formData.description} onChange={handleInputChange} rows={4} className="input-field resize-y"></textarea>
                </div>

                {/* AI Copilot Auto-Fill Panel */}
                <div className="col-span-2 p-4 rounded-xl flex flex-col gap-4 border" style={{ background: 'var(--bg-card-hover)', borderColor: 'var(--border-color)', marginVertical: 12 }}>
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 px-2 rounded font-black text-accent-primary" style={{ background: 'var(--accent-soft)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>AI Copilot</span>
                      <h3 className="text-xs uppercase tracking-wider font-bold">Auto-Fill Details</h3>
                    </div>
                    {formData.company_name ? (
                      <button
                        type="button"
                        onClick={handleOpenChatGPT}
                        className="btn btn-secondary py-1 px-3"
                        style={{ fontSize: '0.75rem', borderRadius: 8 }}
                      >
                        🚀 Generate & Open ChatGPT
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted italic">Type in a Company Name above to enable AI Copilot</span>
                    )}
                  </div>
                  
                  {formData.company_name && (
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Paste ChatGPT JSON here:</label>
                      <textarea
                        placeholder='Paste response here... E.g. { "description": "...", "company_website": "..." }'
                        value={aiJsonInput}
                        onChange={handleAiJsonChange}
                        rows={2}
                        className="input-field text-xs font-mono"
                        style={{ borderRadius: 8, padding: 8 }}
                      />
                      {aiParseError && <span className="text-[10px] font-bold text-danger">⚠️ {aiParseError}</span>}
                      {aiParseSuccess && <span className="text-[10px] font-bold text-success">✨ Form details successfully auto-populated!</span>}
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label>{formData.listing_type === 'internship' ? 'Stipend (Flexible)' : 'Package / Salary (Flexible)'}</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      required={salaryUnit !== 'Unpaid'} 
                      disabled={salaryUnit === 'Unpaid'} 
                      type="text" 
                      value={salaryAmount} 
                      onChange={(e) => handleSalaryChange(e.target.value, salaryUnit)} 
                      className="input-field" 
                      placeholder={salaryUnit === 'Custom' ? "e.g. 15k/mo + 6.5 LPA" : "e.g. 6.5 or 5000-10000"} 
                      style={{ flex: 1 }} 
                    />
                    <select 
                      value={salaryUnit} 
                      onChange={(e) => handleSalaryChange(salaryAmount, e.target.value)} 
                      className="input-field" 
                      style={{ width: '130px', minWidth: '130px' }}
                    >
                      {formData.listing_type === 'internship' ? (
                        <>
                          <option value="/ month">/ month</option>
                          <option value="Total Stipend">Total Stipend</option>
                          <option value="Unpaid">Unpaid</option>
                          <option value="Custom">Custom</option>
                        </>
                      ) : (
                        <>
                          <option value="LPA">LPA</option>
                          <option value="/ month">/ month</option>
                          <option value="Custom">Custom</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
                {formData.listing_type === 'internship' && (
                  <div className="input-group">
                    <label>Duration (e.g. 3 Months)</label>
                    <input required type="text" name="duration" value={formData.duration} onChange={handleInputChange} className="input-field" />
                  </div>
                )}
                <div className="input-group">
                  <label>Location</label>
                  <input required type="text" name="location" value={formData.location} onChange={handleInputChange} className="input-field" />
                </div>
                <div className="input-group">
                  <label>Application Deadline</label>
                  <input required type="datetime-local" name="application_deadline" value={formData.application_deadline} onChange={handleInputChange} className="input-field" />
                </div>

                <div className="input-group">
                  <label>Company Category</label>
                  <select name="category" value={formData.category} onChange={handleInputChange} className="input-field">
                    <option value="A">Category A</option>
                    <option value="B">Category B</option>
                    <option value="C">Category C</option>
                    <option value="Own">Own Category</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Openings Count</label>
                  <input required type="number" min="1" name="openings_count" value={formData.openings_count} onChange={handleInputChange} className="input-field" />
                </div>

                {formData.category === 'Own' && (
                  <div className="col-span-2 p-6 rounded-xl border flex flex-col gap-6 mt-4 animate-in" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-primary" style={{ letterSpacing: '1px' }}>Academic & Attendance Criteria</h3>
                      <p className="text-xs text-muted" style={{ marginTop: '2px', color: 'var(--text-secondary)' }}>Set minimum limits to filter eligible students automatically.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="input-group">
                        <label className="text-xs font-bold mb-1">Minimum CGPA (0.0 to 10.0)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          min="0" 
                          max="10" 
                          value={formData.eligibility_rules.min_cgpa} 
                          onChange={(e) => handleEligibilityChange('min_cgpa', e.target.value)} 
                          className="input-field" 
                          placeholder="E.g., 7.5"
                        />
                      </div>
                      
                      <div className="input-group">
                        <label className="text-xs font-bold mb-1">Minimum Attendance % (0 to 100)</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="100" 
                          value={formData.eligibility_rules.min_attendance} 
                          onChange={(e) => handleEligibilityChange('min_attendance', e.target.value)} 
                          className="input-field" 
                          placeholder="E.g., 75"
                        />
                      </div>
                      
                      <div className="input-group">
                        <label className="text-xs font-bold mb-1">Maximum Active Backlogs</label>
                        <input 
                          type="number" 
                          min="0" 
                          value={formData.eligibility_rules.max_backlogs} 
                          onChange={(e) => handleEligibilityChange('max_backlogs', e.target.value)} 
                          className="input-field" 
                          placeholder="E.g., 0"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="col-span-2 input-group">
                  <label>Company HR Email <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.85em' }}>(Optional — will auto-fill when sending resumes)</span></label>
                  <input type="email" name="hr_email" value={formData.hr_email} onChange={handleInputChange} className="input-field" placeholder="hr@company.com" />
                </div>

                {/* Target Courses Selection Panel */}
                <div className="col-span-2 p-6 rounded-xl border flex flex-col gap-6 mt-4 animate-in" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <h3 className="text-sm font-black uppercase tracking-wider text-primary" style={{ letterSpacing: '1px', color: 'var(--text-primary)' }}>Target Courses Eligibility</h3>
                      <p className="text-xs text-muted" style={{ marginTop: '2px', color: 'var(--text-secondary)' }}>Only students belonging to the selected courses will see and be eligible to apply for this job.</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleSelectAllCourses(true)}
                        className="btn"
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                          border: 'none',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          letterSpacing: '0.75px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 15px rgba(59, 130, 246, 0.2)',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.2)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        ⚡ Select All 19 Courses
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectAllCourses(false)}
                        className="btn"
                        style={{
                          background: 'var(--bg-card-hover)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          letterSpacing: '0.75px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-disabled)';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--bg-card-hover)';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Course Search Bar */}
                  <div className="flex flex-col gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="🔍 Search courses by name or department (e.g. BCA, Media Science, Technology)..."
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      className="input-field text-sm"
                      style={{ 
                        borderRadius: '10px', 
                        padding: '12px 16px', 
                        background: 'var(--bg-input)', 
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        outline: 'none',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)';
                        e.currentTarget.style.background = 'var(--bg-input)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                        e.currentTarget.style.background = 'var(--bg-input)';
                      }}
                    />
                  </div>

                  {/* Grouped Target Courses Grid */}
                  <div className="flex flex-col gap-3 mt-2" style={{ maxHeight: '550px', overflowY: 'auto', paddingRight: '6px' }}>
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
                        return <div className="text-xs text-muted text-center py-10" style={{ color: '#64748b' }}>No matching courses found. Try a different search term.</div>;
                      }

                      return Object.keys(grouped).map(catName => {
                        const courses = grouped[catName];
                        const catCourseNames = courses.map(c => c.name);
                        const selectedInCat = (formData.eligibility_rules.allowed_branches || []).filter(name => catCourseNames.includes(name));

                        const isCollapsedByDefault = selectedInCat.length === 0;
                        const isCollapsed = courseSearch.trim().length > 0
                          ? false
                          : (collapsedCategories[catName] !== undefined ? collapsedCategories[catName] : isCollapsedByDefault);

                        return (
                          <div 
                            key={catName} 
                            style={{ 
                              background: 'var(--bg-card)', 
                              border: '1px solid var(--border-color)', 
                              borderRadius: '12px',
                              boxShadow: 'var(--shadow-sm)',
                              overflow: 'hidden',
                              transition: 'all 0.2s ease',
                              flexShrink: 0
                            }}
                          >
                            {/* Category Header (Clicking it toggles collapse) */}
                            <div 
                              onClick={() => setCategoryCollapseState(catName, !isCollapsed)}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px 16px',
                                background: isCollapsed ? 'var(--bg-card)' : 'var(--bg-card-hover)',
                                cursor: 'pointer',
                                transition: 'background-color 0.15s ease',
                                userSelect: 'none'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--bg-card-hover)';
                              }}
                              onMouseLeave={(e) => {
                                if (isCollapsed) {
                                  e.currentTarget.style.background = 'var(--bg-card)';
                                }
                              }}
                            >
                              <div className="flex items-center gap-3">
                                {/* Chevron */}
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{
                                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease',
                                    color: 'var(--text-secondary)'
                                  }}
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                                
                                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                                  📁 {catName}
                                </span>
                                
                                <span className="text-[9px] py-0.5 px-2 rounded-full font-bold" style={{ 
                                  background: selectedInCat.length > 0 ? 'var(--accent-soft)' : 'var(--bg-card-hover)', 
                                  color: selectedInCat.length > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                  border: '1px solid var(--border-color)',
                                  transition: 'all 0.2s ease'
                                }}>
                                  {selectedInCat.length} of {courses.length} selected
                                </span>
                              </div>

                              <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleSelectCategory(catName, true)}
                                  style={{
                                    background: 'var(--accent-soft)',
                                    border: '1px solid var(--accent-primary)',
                                    color: 'var(--accent-primary)',
                                    padding: '4px 10px',
                                    borderRadius: '100px',
                                    fontSize: '9.5px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    outline: 'none',
                                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.04)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--accent-primary)';
                                    e.currentTarget.style.color = 'white';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'var(--accent-soft)';
                                    e.currentTarget.style.color = 'var(--accent-primary)';
                                  }}
                                >
                                  Select All
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectCategory(catName, false)}
                                  style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-secondary)',
                                    padding: '4px 10px',
                                    borderRadius: '100px',
                                    fontSize: '9.5px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    outline: 'none'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)';
                                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                                    e.currentTarget.style.color = '#ef4444';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'var(--bg-card)';
                                    e.currentTarget.style.borderColor = 'var(--border-color)';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                  }}
                                >
                                  Clear
                                </button>
                              </div>
                            </div>

                            {/* Category Courses (Expanded Panel) */}
                            {!isCollapsed && (
                              <div 
                                className="border-t" 
                                style={{ 
                                  borderColor: 'var(--border-color)', 
                                  background: 'var(--bg-card-hover)',
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                                  gap: '10px',
                                  padding: '16px 20px'
                                }}
                              >
                                {courses.map(course => {
                                  const isChecked = (formData.eligibility_rules.allowed_branches || []).includes(course.name);
                                  return (
                                    <button
                                      key={course.name}
                                      type="button"
                                      onClick={() => handleCourseToggle(course.name)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid',
                                        borderColor: isChecked ? 'var(--accent-primary)' : 'var(--border-color)',
                                        background: isChecked ? 'var(--accent-soft)' : 'var(--bg-card)',
                                        color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        fontSize: '12px',
                                        fontWeight: isChecked ? '700' : '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: isChecked ? '0 2px 8px rgba(59, 130, 246, 0.08)' : 'var(--shadow-sm)',
                                        outline: 'none',
                                        width: '100%',
                                        justifyContent: 'flex-start',
                                        textAlign: 'left',
                                        wordBreak: 'break-word',
                                        whiteSpace: 'normal'
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isChecked) {
                                          e.currentTarget.style.background = 'var(--bg-card-hover)';
                                          e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                          e.currentTarget.style.color = 'var(--text-primary)';
                                        } else {
                                          e.currentTarget.style.transform = 'scale(1.02)';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isChecked) {
                                          e.currentTarget.style.background = 'var(--bg-card)';
                                          e.currentTarget.style.borderColor = 'var(--border-color)';
                                          e.currentTarget.style.color = 'var(--text-secondary)';
                                        } else {
                                          e.currentTarget.style.transform = 'scale(1)';
                                        }
                                      }}
                                    >
                                      {/* Micro Checkbox indicator */}
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
                                        {isChecked && (
                                          <svg width="8" height="6" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="1.5 4 4 6.5 8.5 1.5" />
                                          </svg>
                                        )}
                                      </div>
                                      <span style={{ transition: 'color 0.15s ease' }}>{course.name}</span>
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
                </div>
              </div>
          </div>

          {/* ─── Advanced Targeting Section ─── */}
          <div className="col-span-2 mt-6">
            <div
              onClick={() => setTargetingOpen(!targetingOpen)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 20px', background: targetingOpen ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                border: '1px solid var(--border-color)', borderRadius: targetingOpen ? '12px 12px 0 0' : '12px',
                cursor: 'pointer', userSelect: 'none', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { if (!targetingOpen) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
              onMouseLeave={e => { if (!targetingOpen) e.currentTarget.style.background = 'var(--bg-card)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>🎯</span>
                <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Advanced Targeting</span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-card-hover)', padding: '2px 8px', borderRadius: '100px', border: '1px solid var(--border-color)' }}>Optional</span>
                {(formData.eligibility_rules.allowed_students || []).length > 0 && !targetingOpen && (
                  <span style={{ fontSize: '10px', fontWeight: 800, color: 'white', background: 'var(--accent-primary)', padding: '2px 10px', borderRadius: '100px' }}>
                    {formData.eligibility_rules.allowed_students.length} student{formData.eligibility_rules.allowed_students.length !== 1 ? 's' : ''} targeted
                  </span>
                )}
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: targetingOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', color: 'var(--text-secondary)' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {targetingOpen && (
              <div style={{ border: '1px solid var(--border-color)', borderTop: 'none', borderRadius: '0 0 12px 12px', background: 'var(--bg-card)', overflow: 'hidden' }}>
                <div style={{ padding: '10px 20px', background: 'rgba(59,130,246,0.04)', borderBottom: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                    Filter students below, then tick checkboxes to select.
                    <strong style={{ color: 'var(--accent-primary)' }}> If any students are selected, only they will be eligible</strong> for this job. Leave empty for normal eligibility.
                  </p>
                </div>

                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>🔍 Name / Reg No</label>
                    <input type="text" placeholder="Search student..." value={targetingSearch}
                      onChange={e => setTargetingSearch(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchTargetStudents(); } }}
                      className="input-field" style={{ fontSize: '12px', padding: '8px 12px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>📚 Course</label>
                    <select value={targetingCourse} onChange={e => setTargetingCourse(e.target.value)}
                      className="input-field" style={{ fontSize: '12px', padding: '8px 12px' }}>
                      <option value="">All Courses</option>
                      {availableCourses.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>📊 Min CGPA</label>
                    <input type="number" placeholder="e.g. 7.0" step="0.1" min="0" max="10"
                      value={targetingCgpa} onChange={e => setTargetingCgpa(e.target.value)}
                      className="input-field" style={{ fontSize: '12px', padding: '8px 12px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>🛠 Skills (Enter to add)</label>
                    <input type="text" placeholder="e.g. Python..." value={targetingSkillInput}
                      onChange={e => setTargetingSkillInput(e.target.value)}
                      onKeyDown={e => {
                        if ((e.key === 'Enter' || e.key === ',') && targetingSkillInput.trim()) {
                          e.preventDefault();
                          const val = targetingSkillInput.trim().replace(/,$/, '');
                          if (val && !targetingSkills.includes(val)) setTargetingSkills(prev => [...prev, val]);
                          setTargetingSkillInput('');
                        }
                      }}
                      className="input-field" style={{ fontSize: '12px', padding: '8px 12px' }} />
                    {targetingSkills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {targetingSkills.map(skill => (
                          <span key={skill} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(139,92,246,0.1)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '100px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
                            {skill}
                            <button type="button" onClick={() => setTargetingSkills(targetingSkills.filter(s => s !== skill))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', padding: 0, lineHeight: 1, display: 'flex' }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <button type="button" onClick={searchTargetStudents} disabled={targetingLoading}
                    style={{ background: 'linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%)', border: 'none', color: 'white', padding: '8px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', cursor: targetingLoading ? 'not-allowed' : 'pointer', opacity: targetingLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {targetingLoading ? '⏳ Searching...' : '⚡ Search Students'}
                  </button>
                  {targetingResults.length > 0 && <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{targetingResults.length} found</span>}
                </div>

                {targetingLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '12px', borderBottom: '1px solid var(--border-color)' }}>
                    <div className="spinner" style={{ width: '28px', height: '28px' }}></div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Searching matching students...</span>
                  </div>
                ) : targetingResults.length > 0 ? (
                  <div className="overflow-x-auto">
                    <div style={{ maxHeight: '300px', overflowY: 'auto', minWidth: '600px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 160px 72px', padding: '8px 20px', background: 'var(--bg-card-hover)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 2 }}>
                        <input type="checkbox" style={{ cursor: 'pointer', width: 15, height: 15 }}
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
                        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Student</span>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Course</span>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CGPA</span>
                      </div>
                      {targetingResults.map(student => {
                        const isSel = (formData.eligibility_rules.allowed_students || []).some(s => s.id === student.id);
                        return (
                          <div key={student.id} onClick={() => toggleTargetStudent(student)}
                            style={{ display: 'grid', gridTemplateColumns: '44px 1fr 160px 72px', padding: '10px 20px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s', background: isSel ? 'rgba(59,130,246,0.05)' : 'transparent' }}
                            onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                            onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                            <input type="checkbox" checked={isSel} onChange={() => toggleTargetStudent(student)} onClick={e => e.stopPropagation()} style={{ cursor: 'pointer', width: 15, height: 15, marginTop: 2 }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{student.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 1 }}>{student.registration_number}</div>
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', alignSelf: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{student.course || '—'}</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, alignSelf: 'center', color: student.cgpa >= 7 ? '#10b981' : student.cgpa >= 5 ? '#f59e0b' : '#ef4444' }}>
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
                  <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', background: 'rgba(59,130,246,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✅ {formData.eligibility_rules.allowed_students.length} Student{formData.eligibility_rules.allowed_students.length !== 1 ? 's' : ''} Selected</span>
                      <button type="button" onClick={() => handleEligibilityChange('allowed_students', [])} style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Clear All</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {formData.eligibility_rules.allowed_students.map(s => (
                        <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--accent-soft)', color: 'var(--accent-primary)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '100px', padding: '4px 10px 4px 6px', fontSize: '12px', fontWeight: 700 }}>
                          <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, flexShrink: 0 }}>{s.name?.charAt(0)?.toUpperCase()}</span>
                          {s.name} <span style={{ fontSize: '10px', opacity: 0.65 }}>({s.registration_number})</span>
                          <button type="button" onClick={() => handleEligibilityChange('allowed_students', formData.eligibility_rules.allowed_students.filter(x => x.id !== s.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', padding: 0, display: 'flex', alignItems: 'center', opacity: 0.75, lineHeight: 1 }}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end">
            <button type="submit" disabled={loading} className="btn btn-primary px-6 flex items-center">
              {loading ? 'Processing...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default EditJob;
