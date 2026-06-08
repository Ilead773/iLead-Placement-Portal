import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { Plus, Trash2 } from 'lucide-react';

const CreateInternship = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdJobId, setCreatedJobId] = useState(null);

  const [formData, setFormData] = useState({
    company_name: '',
    role: '',
    description: '',
    package: '', // Stored as stipend/package
    location: '',
    job_type: 'internal',
    listing_type: 'internship',
    duration: '', // e.g., "3 months"
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

      let jobId = createdJobId;
      if (!jobId) {
        const response = await axios.post('/jobs/admin/jobs/', payload);
        jobId = response.data.id;
        setCreatedJobId(jobId);
      }
      // Publish immediately
      await axios.post(`/jobs/admin/jobs/${jobId}/publish/`);
      navigate('/admin/internships');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create internship');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center">
      <div className="card w-full max-w-4xl p-8">
        <h1 className="text-2xl font-bold text-primary mb-6">Create New Internship</h1>
        
        {error && <div className="alert alert-error mb-6">{error}</div>}

        <form onSubmit={handleSubmit}>
          
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-primary">Internship Details</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="input-group">
                <label>Company Name</label>
                <input required type="text" name="company_name" value={formData.company_name} onChange={handleInputChange} className="input-field" />
              </div>
              <div className="input-group">
                <label>Role / Position</label>
                <input required type="text" name="role" value={formData.role} onChange={handleInputChange} className="input-field" />
              </div>
              <div className="col-span-2 input-group">
                <label>Description</label>
                <textarea required name="description" value={formData.description} onChange={handleInputChange} rows={4} className="input-field resize-y"></textarea>
              </div>
              <div className="input-group">
                <label>Stipend (Monthly / Total)</label>
                <input required type="number" step="0.1" name="package" value={formData.package} onChange={handleInputChange} className="input-field" />
              </div>
              <div className="input-group">
                <label>Duration (e.g., 3 Months)</label>
                <input required type="text" name="duration" value={formData.duration} onChange={handleInputChange} className="input-field" />
              </div>
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
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button type="submit" disabled={loading} className="btn btn-primary px-6 flex items-center">
              {loading ? 'Processing...' : 'Publish Internship'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CreateInternship;
