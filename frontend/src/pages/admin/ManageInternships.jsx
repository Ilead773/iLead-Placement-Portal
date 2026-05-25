import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import { Briefcase, Calendar, MapPin, Users, Edit, Eye } from 'lucide-react';

const ManageInternships = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="page-content">
      <div className="page-header mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Manage Internships</h1>
          <p className="text-secondary mt-1">Track all active internship drives and student applications.</p>
        </div>
        <Link to="/internships/create" className="btn btn-primary flex items-center gap-2">
          <Plus size={20} /> POST NEW INTERNSHIP
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => (
          <div key={job.id} className="card p-6 flex flex-col hover:shadow-lg transition-all border border-border-color">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-primary leading-tight">{job.role}</h3>
                <p className="text-secondary text-sm font-medium">{job.company_name}</p>
              </div>
              <span className={`status-badge ${job.status === 'active' ? 'status-generated' : 'status-processing'}`}>
                {job.status}
              </span>
            </div>

            <div className="space-y-2 mb-6 flex-grow">
              <div className="flex items-center text-sm text-secondary gap-2">
                <MapPin size={16} /> {job.location}
              </div>
              <div className="flex items-center text-sm text-secondary gap-2">
                <Calendar size={16} /> Ends: {new Date(job.application_deadline).toLocaleDateString()}
              </div>
              <div className="flex items-center text-sm text-secondary gap-2">
                <Users size={16} /> {job.applications_count} Applications
              </div>
              {job.duration && (
                <div className="flex items-center text-sm text-info font-bold gap-2">
                  <Briefcase size={16} /> {job.duration}
                </div>
              )}
              <div className="flex items-center text-sm text-secondary gap-2 mt-2">
                <span className="p-0.5 px-2 rounded font-black text-xs" style={{ background: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>Category {job.category || 'C'}</span>
                <span className="text-xs font-semibold text-secondary">• {job.openings_count || 1} Openings</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-border-color mt-auto">
              <div className="flex gap-2">
                <Link to={`/jobs/${job.id}/applications`} className="btn btn-secondary flex-1 flex items-center justify-center gap-1 text-xs py-2">
                  <Eye size={14} /> APPS
                </Link>
                <Link to={`/jobs/${job.id}/edit`} className="btn btn-secondary flex-1 flex items-center justify-center gap-1 text-xs py-2">
                  <Edit size={14} /> EDIT
                </Link>
              </div>
              <button
                onClick={() => toggleJobStatus(job)}
                className="w-full btn py-1.5 text-xs font-bold transition-all duration-200"
                style={{
                  background: job.status === 'active' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: job.status === 'active' ? '#ef4444' : '#3b82f6',
                  border: job.status === 'active' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: 'var(--border-radius)'
                }}
              >
                {job.status === 'active' ? 'Deactivate Internship' : 'Activate Internship'}
              </button>
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
    </div>
  );
};

const Plus = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

export default ManageInternships;
