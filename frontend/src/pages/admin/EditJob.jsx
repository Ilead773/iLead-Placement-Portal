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
      min_cgpa: 0,
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
      // Build the payload with a proper ISO 8601 deadline
      const payload = { ...formData };
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
    <div className="page-content flex justify-center">
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
                  <label>Placement Type</label>
                  <select name="job_type" value={formData.job_type} onChange={handleInputChange} className="input-field">
                    <option value="internal">On-Campus (Internal)</option>
                    <option value="external">Off-Campus (External)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Company Category</label>
                  <select name="category" value={formData.category} onChange={handleInputChange} className="input-field">
                    <option value="A">Category A</option>
                    <option value="B">Category B</option>
                    <option value="C">Category C</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Openings Count</label>
                  <input required type="number" min="1" name="openings_count" value={formData.openings_count} onChange={handleInputChange} className="input-field" />
                </div>
                <div className="col-span-2 input-group">
                  <label>Company HR Email <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.85em' }}>(Optional — will auto-fill when sending resumes)</span></label>
                  <input type="email" name="hr_email" value={formData.hr_email} onChange={handleInputChange} className="input-field" placeholder="hr@company.com" />
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
