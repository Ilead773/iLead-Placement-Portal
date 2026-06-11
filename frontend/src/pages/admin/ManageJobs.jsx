import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import { Briefcase, Users, Calendar, MapPin, Plus, Edit, Activity, ExternalLink, ArrowRight, IndianRupee, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';


const ManageJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingOffCampusJob, setEditingOffCampusJob] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await axios.get('/jobs/jobs/', {
        params: { _t: Date.now(), listing_type: 'job' }
      });
      setJobs(response.data);
    } catch (err) {
      console.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const deleteJob = async (jobId, roleName) => {
    if (!window.confirm(`Are you sure you want to delete the job drive "${roleName}"? This action is permanent and cannot be undone.`)) {
      return;
    }
    const toastId = toast.loading('Deleting job...');
    try {
      await axios.delete(`/jobs/admin/jobs/${jobId}/`);
      toast.success('Job deleted successfully', { id: toastId });
      fetchJobs();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to delete job', { id: toastId });
    }
  };

  const toggleJobStatus = async (job) => {
    try {
      if (job.status === 'active') {
        await axios.post(`/jobs/admin/jobs/${job.id}/close/`);
      } else {
        await axios.post(`/jobs/admin/jobs/${job.id}/publish/`);
      }
      fetchJobs();
    } catch (err) {
      console.error('Failed to update job status', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="page-header mb-8 flex justify-between items-center">
          <div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-96 hidden sm:block"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 hidden sm:block"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="job-card bg-card border border-border-color p-5 rounded-xl flex flex-col min-h-[380px]">
              <div className="flex justify-between items-start mb-4">
                <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6"></div>
              
              <div className="grid grid-cols-2 gap-4 mb-auto">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>
              
              <div className="flex flex-col gap-2 mt-6">
                <div className="flex gap-2">
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-10"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-10"></div>
                </div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Manage Placement Jobs
          </h1>
          <p className="text-secondary text-sm mt-1">
            Track all active recruitment drives and student applications.
          </p>
        </div>
        <div className="flex gap-3 self-start sm:self-auto">
          <Link to="/admin/pipeline" className="btn btn-secondary">
            <Activity size={18} /> Job Pipeline
          </Link>
          <Link to="/jobs/create" className="btn btn-primary">
            <Plus size={20} /> Post New Job
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => (
          <div key={job.id} className={`job-card ${job.job_type === 'external' ? 'external-card' : ''}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="job-card-icon-container">
                <Briefcase size={22} />
              </div>
              {job.job_type !== 'external' && (
                <span className={`job-status-badge ${job.status}`}>
                  <span className="pulse-dot"></span>
                  {job.status}
                </span>
              )}
            </div>

            <h3 className="job-card-title">{job.role}</h3>
            <p className="job-card-company">{job.company_name}</p>

            <div className="job-meta-grid">
              <div className="job-meta-item">
                <MapPin size={15} className="meta-icon location" />
                <span className="meta-text">{job.location}</span>
                {job.job_type === 'external' && (
                  <span className="job-type-pill external">
                    <ExternalLink size={10} /> Off-Campus
                  </span>
                )}
              </div>
              
              <div className="job-meta-item">
                <Calendar size={15} className="meta-icon deadline" />
                <span className="meta-text">
                  Deadline: <span className="deadline-date">{new Date(job.application_deadline).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}</span>
                </span>
              </div>
              
              <div className="job-meta-item">
                <Users size={15} className="meta-icon applicants" />
                <span className="meta-text font-semibold">{job.applications_count} Applicants</span>
              </div>
              
              <div className="job-meta-item">
                <IndianRupee size={15} className="meta-icon package text-emerald-500" style={{ color: '#10b981' }} />
                <span className="meta-text font-bold">
                  {job.listing_type === 'internship'
                    ? (job.package ? `Stipend: ₹${Number(job.package).toLocaleString()}/month` : 'Stipend: Undisclosed')
                    : (job.package ? `Salary: ${job.package} LPA` : 'Salary: Not Specified')
                  }
                </span>
              </div>
              
              <div className="job-meta-item-pills">
                <span className="category-badge">Category {job.category || 'C'}</span>
                <span className="openings-badge">{job.openings_count || 1} Openings</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-auto">
              <div className="flex gap-2">
                <Link 
                  to={`/jobs/${job.id}/applications`}
                  className="job-action-btn primary flex-1"
                >
                  View Applications <ArrowRight size={14} className="btn-arrow" />
                </Link>
                {job.job_type === 'external' ? (
                  <button
                    onClick={() => setEditingOffCampusJob(job)}
                    className="job-action-btn edit-icon"
                    title="Edit Off-Campus Details"
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                  >
                    <Edit size={16} />
                  </button>
                ) : (
                  <Link 
                    to={`/jobs/${job.id}/edit`}
                    className="job-action-btn edit-icon"
                    title="Edit Job"
                  >
                    <Edit size={16} />
                  </Link>
                )}
                <button
                  onClick={() => deleteJob(job.id, job.role)}
                  className="job-action-btn edit-icon text-red-500 hover:text-red-700 hover:bg-red-500/10"
                  title="Delete Job"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--danger)' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {job.job_type !== 'external' && (
                <button
                  onClick={() => toggleJobStatus(job)}
                  className={`job-status-toggle-btn ${job.status}`}
                >
                  {job.status === 'active' ? 'Deactivate Job' : 'Activate Job'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {jobs.length === 0 && (
        <div className="text-center py-20 bg-card-hover rounded-xl border-2 border-dashed border-border-color">
          <p className="text-secondary">No jobs posted yet.</p>
        </div>
      )}

      {/* Off-Campus Job Edit Modal */}
      {editingOffCampusJob && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box'
          }}
        >
          {/* Backdrop */}
          <div 
            onClick={() => setEditingOffCampusJob(null)}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              transition: 'opacity 0.2s ease-in-out'
            }}
          />
          
          {/* Modal Card */}
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              const payload = {
                company_name: fd.get('company_name'),
                role: fd.get('role'),
                package: parseFloat(fd.get('package')) || 0,
                location: fd.get('location'),
                external_link: fd.get('external_link'),
                application_deadline: new Date(fd.get('application_deadline')).toISOString()
              };
              try {
                await axios.patch(`/jobs/jobs/${editingOffCampusJob.id}/`, payload);
                toast.success('Off-campus job updated successfully! 🎉');
                setEditingOffCampusJob(null);
                fetchJobs();
              } catch (err) {
                console.error(err);
                toast.error('Failed to update off-campus job.');
              }
            }}
            style={{
              position: 'relative',
              backgroundColor: 'var(--bg-card, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.05)',
              padding: '24px',
              overflow: 'hidden',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* Top visual accent */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '5px',
                background: 'linear-gradient(to right, #2563eb, #1d4ed8)'
              }}
            />

            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                Edit Off-Campus Opportunity
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Update external job listing details directly.
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Company Name</label>
                <input required type="text" name="company_name" defaultValue={editingOffCampusJob.company_name} className="input-field" style={{ width: '100%' }} />
              </div>
              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Role / Position</label>
                <input required type="text" name="role" defaultValue={editingOffCampusJob.role} className="input-field" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div className="input-group">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Package (LPA)</label>
                  <input required type="number" step="0.1" name="package" defaultValue={editingOffCampusJob.package} className="input-field" style={{ width: '100%' }} />
                </div>
                <div className="input-group">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Location</label>
                  <input required type="text" name="location" defaultValue={editingOffCampusJob.location} className="input-field" style={{ width: '100%' }} />
                </div>
              </div>
              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Apply Link (External URL)</label>
                <input required type="url" name="external_link" defaultValue={editingOffCampusJob.external_link} className="input-field" style={{ width: '100%' }} />
              </div>
              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Application Deadline</label>
                <input required type="datetime-local" name="application_deadline" defaultValue={(() => {
                  if (!editingOffCampusJob.application_deadline) return '';
                  const d = new Date(editingOffCampusJob.application_deadline);
                  const year = d.getFullYear();
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  const hours = String(d.getHours()).padStart(2, '0');
                  const minutes = String(d.getMinutes()).padStart(2, '0');
                  return `${year}-${month}-${day}T${hours}:${minutes}`;
                })()} className="input-field" style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <button 
                type="button" 
                onClick={() => setEditingOffCampusJob(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ManageJobs;
