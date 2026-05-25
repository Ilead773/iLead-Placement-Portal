import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import { Briefcase, Users, Calendar, MapPin, Plus, Edit, Activity, ExternalLink } from 'lucide-react';


const ManageJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="page-content">
      <div className="page-header mb-8">
        <div>
          <h1 className="text-2xl font-bold">Manage Placement Jobs</h1>
          <p className="text-secondary">Track all active recruitment drives and student applications.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
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
          <div key={job.id} className="card p-6 flex flex-col hover:border-accent-primary transition">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-info/20 p-3 rounded-lg text-info">
                <Briefcase size={24} />
              </div>
              <span className={`badge ${job.status === 'active' ? 'badge-success' : job.status === 'closed' ? 'badge-danger' : 'badge-neutral'}`}>
                {job.status}
              </span>
            </div>

            <h3 className="text-lg font-bold text-primary mb-1">{job.role}</h3>
            <p className="text-info font-medium text-sm mb-4">{job.company_name}</p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-secondary gap-2">
                <MapPin size={16} />
                {job.location}
                {job.job_type === 'external' && (
                  <span className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border border-slate-500/20 bg-slate-500/10 text-secondary">
                    <ExternalLink size={12} /> Off-Campus
                  </span>
                )}
              </div>
              <div className="flex items-center text-sm text-secondary gap-2">
                <Calendar size={16} />
                Deadline: {new Date(job.application_deadline).toLocaleDateString()}
              </div>
              <div className="flex items-center text-sm text-secondary gap-2 font-semibold">
                <Users size={16} className="text-info" />
                {job.applications_count} Applicants
              </div>
              <div className="flex items-center text-sm text-secondary gap-2">
                <span className="p-0.5 px-2 rounded font-black text-xs" style={{ background: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>Category {job.category || 'C'}</span>
                <span className="text-xs font-semibold text-secondary">• {job.openings_count || 1} Openings</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-auto">
              <div className="flex gap-2">
                <Link 
                  to={`/jobs/${job.id}/applications`}
                  className="flex-1 text-center btn btn-secondary py-2"
                >
                  View Applications
                </Link>
                <Link 
                  to={`/jobs/${job.id}/edit`}
                  className="btn btn-secondary px-3 py-2 flex items-center justify-center"
                  title="Edit Job"
                >
                  <Edit size={18} />
                </Link>
              </div>
              <button
                onClick={() => toggleJobStatus(job)}
                className="w-full btn py-2 text-sm font-bold transition-all duration-200"
                style={{
                  background: job.status === 'active' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: job.status === 'active' ? '#ef4444' : '#3b82f6',
                  border: job.status === 'active' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: 'var(--border-radius)'
                }}
              >
                {job.status === 'active' ? 'Deactivate Job' : 'Activate Job'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {jobs.length === 0 && (
        <div className="text-center py-20 bg-card-hover rounded-xl border-2 border-dashed border-border-color">
          <p className="text-secondary">No jobs posted yet.</p>
        </div>
      )}
    </div>
  );
};

export default ManageJobs;
