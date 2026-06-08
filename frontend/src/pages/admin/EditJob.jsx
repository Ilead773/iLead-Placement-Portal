import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../../api/axios';
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

  const setCategoryCollapseState = (catName, isCollapsed) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catName]: isCollapsed
    }));
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get('/career-os/courses/');
        setAvailableCourses(response.data.courses || []);
      } catch (err) {
        console.error('Failed to fetch courses', err);
        setAvailableCourses([
          { name: "BBA" },
          { name: "BBA in Digital Marketing (BBA DM)" },
          { name: "BBA in Travel & Tourism Management (BBA TTM)" },
          { name: "BBA in Entrepreneurship (BBA ENT)" },
          { name: "BBA in Sports Management (BBA SM)" },
          { name: "BBA in Hospital Management (BBA HM)" },
          { name: "BSc in Media Science (BMS)" },
          { name: "MSc in Media Science" },
          { name: "BSc in Multimedia, Animation, Graphic Design (BMAGD)" },
          { name: "MSc in Multimedia, Animation, Graphic Design (MMAGD)" },
          { name: "BSc in Film and Television Production (FTP)" },
          { name: "BSc in Interior Design" },
          { name: "BSc in Sustainable Fashion Design & Management" },
          { name: "Bachelor in Optometry" },
          { name: "BSc in Critical Care Technology (CCT)" },
          { name: "BSc in Medical Laboratory Technology (BMLT)" },
          { name: "BSc in Data Science" },
          { name: "BSc in Cyber Security" },
          { name: "BSc in Computer Application (BCA)" }
        ]);
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
      allowed_categories: []
    },
    rounds: []
  });

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const response = await axios.get(`/jobs/jobs/${id}/`, {
        params: { _t: Date.now() }
      });
      const data = response.data;
      
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
            : parseInt(formData.eligibility_rules.max_backlogs)
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
                  <label>{formData.listing_type === 'internship' ? 'Stipend' : 'Package (LPA)'}</label>
                  <input required type="number" step="0.1" name="package" value={formData.package} onChange={handleInputChange} className="input-field" />
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
                  <div className="flex flex-col gap-3 mt-2" style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '6px' }}>
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
                              transition: 'all 0.2s ease'
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
                              <div className="p-4 pt-1 flex flex-wrap gap-2 border-t" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card-hover)' }}>
                                {courses.map(course => {
                                  const isChecked = (formData.eligibility_rules.allowed_branches || []).includes(course.name);
                                  return (
                                    <button
                                      key={course.name}
                                      type="button"
                                      onClick={() => handleCourseToggle(course.name)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        border: '1px solid',
                                        borderColor: isChecked ? 'var(--accent-primary)' : 'var(--border-color)',
                                        background: isChecked ? 'var(--accent-soft)' : 'var(--bg-card)',
                                        color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        fontSize: '11.5px',
                                        fontWeight: isChecked ? '700' : '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: isChecked ? '0 2px 8px rgba(59, 130, 246, 0.08)' : 'var(--shadow-sm)',
                                        outline: 'none'
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
                                      <span style={{
                                        width: '14px',
                                        height: '14px',
                                        borderRadius: '50%',
                                        background: isChecked ? 'var(--accent-primary)' : 'transparent',
                                        border: isChecked ? 'none' : '1.5px solid var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.15s ease',
                                        flexShrink: 0
                                      }}>
                                        {isChecked && (
                                          <svg width="8" height="6" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="1.5 4 4 6.5 8.5 1.5" />
                                          </svg>
                                        )}
                                      </span>
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
