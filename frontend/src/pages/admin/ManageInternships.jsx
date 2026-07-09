import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import { Briefcase, Calendar, MapPin, Users, Edit, Eye, ArrowRight, IndianRupee, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import JobDetailsModal from '../../components/JobDetailsModal';

const ManageInternships = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingOffCampusJob, setEditingOffCampusJob] = useState(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);

  const fetchJobs = async () => {
    try {
      const response = await axios.get('/jobs/jobs/', {
        params: { _t: Date.now(), listing_type: 'internship' }
      });
      setJobs(response.data);
    } catch (err) {
      console.error('Failed to fetch internships');
    } finally {
      setLoading(false);
    }
  };

  const deleteJob = async (jobId, roleName) => {
    if (!window.confirm(`Are you sure you want to delete the internship drive "${roleName}"? This action is permanent and cannot be undone.`)) {
      return;
    }
    const toastId = toast.loading('Deleting internship...');
    try {
      await axios.delete(`/jobs/admin/jobs/${jobId}/`);
      toast.success('Internship deleted successfully', { id: toastId });
      fetchJobs();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to delete internship', { id: toastId });
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const toggleJobStatus = async (job) => {
    try {
      if (job.status === 'active') {
        await axios.post(`/jobs/admin/jobs/${job.id}/close/`);
      } else {
        await axios.post(`/jobs/admin/jobs/${job.id}/publish/`);
      }
      fetchJobs();
    } catch (err) {
      console.error('Failed to update internship status', err);
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
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
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
            Manage Internships
          </h1>
          <p className="text-secondary text-sm mt-1">
            Track all active internship drives and student applications.
          </p>
        </div>
        <Link to="/internships/create" className="btn btn-primary flex items-center gap-2 self-start sm:self-auto">
          <Plus size={20} /> POST NEW INTERNSHIP
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => (
          <div key={job.id} className={`job-card ${job.job_type === 'external' ? 'external-card' : ''}`}>
            <div 
              onClick={() => setSelectedJobDetails(job)} 
              className="cursor-pointer flex flex-col flex-1"
              title="Click to view details"
            >
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
                </div>
                
                <div className="job-meta-item">
                  <Calendar size={15} className="meta-icon deadline" />
                  <span className="meta-text">
                    Deadline: <span className="deadline-date">{job.application_deadline ? format(new Date(job.application_deadline), 'MMM dd, yyyy, h:mm a') : 'No Deadline'}</span>
                  </span>
                </div>
                
                <div className="job-meta-item">
                  <Users size={15} className="meta-icon applicants" />
                  <span className="meta-text font-semibold">{job.applications_count} Applications</span>
                </div>

                {job.duration && (
                  <div className="job-meta-item">
                    <Briefcase size={15} className="meta-icon duration" style={{ color: 'var(--accent-primary)' }} />
                    <span className="meta-text font-bold text-xs" style={{ color: 'var(--accent-primary)' }}>{job.duration}</span>
                  </div>
                )}

                <div className="job-meta-item">
                  <IndianRupee size={15} className="meta-icon package text-emerald-500" style={{ color: '#10b981' }} />
                  <span className="meta-text font-bold">
                    {(() => {
                      if (!job.package) {
                        return job.listing_type === 'internship' ? 'Stipend: Undisclosed' : 'Salary: Not Specified';
                      }
                      const pkgStr = String(job.package).trim();
                      const isNumeric = /^\d+(\.\d+)?$/.test(pkgStr);
                      if (!isNumeric) return pkgStr;
                      return job.listing_type === 'internship' 
                        ? `Stipend: ₹${Number(pkgStr).toLocaleString()}/month` 
                        : `Salary: ${pkgStr} LPA`;
                    })()}
                  </span>
                </div>
                
                <div className="job-meta-item-pills">
                  <span className="category-badge">Category {job.category || 'C'}</span>
                  <span className="openings-badge">{job.openings_count || 1} Openings</span>
                </div>
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
                    title="Edit Internship"
                  >
                    <Edit size={16} />
                  </Link>
                )}
                <button
                  onClick={() => deleteJob(job.id, job.role)}
                  className="job-action-btn edit-icon text-red-500 hover:text-red-700 hover:bg-red-500/10"
                  title="Delete Internship"
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
                  {job.status === 'active' ? 'Deactivate Internship' : 'Activate Internship'}
                </button>
              )}
            </div>
          </div>
        ))}
        {jobs.length === 0 && (
          <div className="col-span-full text-center py-20 bg-card rounded-2xl border-2 border-dashed border-border-color">
            <p className="text-secondary text-lg">No internships posted yet.</p>
            <Link to="/internships/create" className="text-info font-bold mt-2 inline-block">Post your first internship drive</Link>
          </div>
        )}
      </div>

      {/* Job Details Modal */}
      <JobDetailsModal
        showModal={!!selectedJobDetails}
        onClose={() => setSelectedJobDetails(null)}
        job={selectedJobDetails}
        isAdmin={true}
      />

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
                toast.success('Off-campus internship updated successfully! 🎉');
                setEditingOffCampusJob(null);
                fetchJobs();
              } catch (err) {
                console.error(err);
                toast.error('Failed to update off-campus internship.');
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
                Edit Off-Campus Internship
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Update external internship details directly.
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
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Stipend (Flexible)</label>
                  <input required type="text" name="package" defaultValue={editingOffCampusJob.package} className="input-field" style={{ width: '100%' }} placeholder="e.g. 15000 or 5000-10000 /month" />
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

const Plus = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

export default ManageInternships;
