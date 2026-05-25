import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { Plus, Trash2 } from 'lucide-react';

const CreateInternship = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
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
      min_cgpa: 0,
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
      let jobId = createdJobId;
      if (!jobId) {
        const response = await axios.post('/jobs/admin/jobs/', formData);
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
    <div className="page-content flex justify-center">
      <div className="card w-full max-w-4xl p-8">
        <h1 className="text-2xl font-bold text-primary mb-6">Create New Internship</h1>
        
        {/* Step Indicators */}
        <div className="flex mb-8">
          {[1, 2].map(num => (
            <div key={num} className={`flex-1 h-2 rounded-full mx-1 ${step >= num ? 'bg-info' : 'bg-border-light'}`} />
          ))}
        </div>

        {error && <div className="alert alert-error mb-6">{error}</div>}

        <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); setStep(step + 1); }}>
          
          {step === 1 && (
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
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-primary">Eligibility Rules</h2>
              <div className="input-group">
                <label>Minimum CGPA: {formData.eligibility_rules.min_cgpa}</label>
                <input type="range" min="0" max="10" step="0.1" value={formData.eligibility_rules.min_cgpa} onChange={(e) => handleEligibilityChange('min_cgpa', parseFloat(e.target.value))} className="w-full" />
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            {step > 1 ? (
              <button type="button" onClick={() => setStep(step - 1)} className="btn btn-secondary px-6">Back</button>
            ) : <div></div>}
            
            <button type="submit" disabled={loading} className="btn btn-primary px-6 flex items-center">
              {loading ? 'Processing...' : (step === 2 ? 'Publish Internship' : 'Next Step')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CreateInternship;
