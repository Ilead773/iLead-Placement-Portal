// src/pages/student/Applications.jsx — Dedicated Applications Dashboard
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, Search, Award, CheckCircle, 
  Clock, AlertCircle, ChevronRight, Building2, 
  ArrowRight, ShieldAlert
} from 'lucide-react';

const STATUS_BADGE = { 
  assigned: 'badge-status-assigned', 
  applied: 'badge-status-applied', 
  shortlisted: 'badge-status-shortlisted', 
  interviewing: 'badge-status-interviewing',
  rejected: 'badge-status-rejected', 
  selected: 'badge-status-selected',
  accepted: 'badge-status-accepted',
  withdrawn: 'badge-status-withdrawn'
};

export default function Applications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'applied', 'shortlisted', 'placed', 'rejected', 'withdrawn'

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const cacheBust = Date.now();
      const response = await api.get(`/applications/applications/?_t=${cacheBust}`);
      
      // Sort by applied date descending
      const sorted = (response.data || []).sort(
        (a, b) => new Date(b.applied_at) - new Date(a.applied_at)
      );
      setApplications(sorted);
    } catch (err) {
      console.error('Failed to load student applications', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Auto-refresh on visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchApplications();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchApplications]);

  const getFilteredApplications = () => {
    return applications.filter(app => {
      // 1. Search Query filter (matches role or company)
      const matchesSearch = 
        app.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        app.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // 2. Status Tab Filter
      if (activeTab === 'all') return true;
      if (activeTab === 'applied') {
        return ['applied', 'assigned'].includes(app.status);
      }
      if (activeTab === 'shortlisted') {
        return ['shortlisted', 'interviewing'].includes(app.status);
      }
      if (activeTab === 'placed') {
        return ['selected', 'accepted'].includes(app.status);
      }
      if (activeTab === 'rejected') {
        return app.status === 'rejected';
      }
      if (activeTab === 'withdrawn') {
        return app.status === 'withdrawn';
      }
      return true;
    });
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const filteredApps = getFilteredApplications();

  // Summary Metrics
  const totalCount = applications.length;
  const appliedCount = applications.filter(a => ['applied', 'assigned'].includes(a.status)).length;
  const shortlistedCount = applications.filter(a => ['shortlisted', 'interviewing'].includes(a.status)).length;
  const placedCount = applications.filter(a => ['selected', 'accepted'].includes(a.status)).length;

  return (
    <div className="applications-page-container p-4 lg:p-8 animate-in relative">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Page Header */}
      <header className="page-header mb-8">
        <div>
          <h1 className="text-3xl font-black mb-1 tracking-tight">My Applications</h1>
          <p className="text-secondary text-sm">Track your progress, view rounds details, and manage received offers.</p>
        </div>
      </header>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-muted tracking-wider block mb-1">Total Applications</span>
            <span className="text-2xl font-black text-primary">{totalCount}</span>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <ClipboardList size={20} />
          </div>
        </div>

        <div className="card p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-muted tracking-wider block mb-1">Shortlisted & Interviewing</span>
            <span className="text-2xl font-black text-warning">{shortlistedCount}</span>
          </div>
          <div className="p-3 bg-warning/10 text-warning rounded-xl">
            <Clock size={20} />
          </div>
        </div>

        <div className="card p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-muted tracking-wider block mb-1">Offers Received / Placed</span>
            <span className="text-2xl font-black text-success">{placedCount}</span>
          </div>
          <div className="p-3 bg-success/10 text-success rounded-xl">
            <Award size={20} />
          </div>
        </div>
      </div>

      {/* Control Panel: Search & Filters */}
      <div className="card p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Filter Tabs */}
        <div className="tracker-tabs">
          {[
            { id: 'all', label: `All (${totalCount})` },
            { id: 'applied', label: `Applied (${appliedCount})` },
            { id: 'shortlisted', label: `Shortlisted (${shortlistedCount})` },
            { id: 'placed', label: `Placed/Offers (${placedCount})` },
            { id: 'rejected', label: 'Rejected' },
            { id: 'withdrawn', label: 'Withdrawn' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tracker-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="search-input-wrapper">
          <span className="search-input-icon">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Search role or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input-field"
          />
        </div>
      </div>

      {/* Applications Data Table */}
      <div className="dash-card">
        {filteredApps.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-slate-500/10 flex items-center justify-center text-secondary text-2xl mb-4">
              💼
            </div>
            <h4 className="font-bold text-base text-primary mb-1">No Applications Found</h4>
            <p className="text-xs text-secondary max-w-sm mb-6 leading-relaxed">
              {searchQuery || activeTab !== 'all' 
                ? 'Try adjusting your search query or filter tags to find matching records.' 
                : 'You have not submitted any job applications yet.'}
            </p>
            <Link to="/student/jobs" className="btn btn-primary btn-sm flex items-center gap-2 shadow-md">
              Explore Active Jobs <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="dash-table-container">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Job Role</th>
                  <th>Company</th>
                  <th>Applied At</th>
                  <th>Round Progress</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app) => (
                  <tr 
                    key={app.id} 
                    onClick={() => navigate(`/student/applications/${app.id}`)}
                  >
                    <td className="font-bold text-primary">
                      <div className="hover:underline">
                        {app.job_title}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5 text-secondary font-semibold">
                        <div className="company-logo-badge">
                          <Building2 size={14} />
                        </div>
                        <span>{app.company_name}</span>
                      </div>
                    </td>
                    <td className="text-xs text-muted">
                      {new Date(app.applied_at).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </td>
                    <td>
                      {/* Shortlisted rounds details are displayed only if they are shortlisted / interviewing */}
                      {['shortlisted', 'interviewing'].includes(app.status) ? (
                        app.current_round ? (
                          <span className="round-progress-bullet shortlisted">
                            <span className="round-bullet-dot animate-pulse" />
                            {app.current_round.round_name}
                          </span>
                        ) : (
                          <span className="round-progress-bullet shortlisted">
                            <span className="round-bullet-dot animate-pulse" />
                            Shortlisted
                          </span>
                        )
                      ) : ['selected', 'accepted'].includes(app.status) ? (
                        <span className="round-progress-bullet placed">
                          <span className="round-bullet-dot" />
                          Selected / Placed
                        </span>
                      ) : app.status === 'rejected' ? (
                        <span className="round-progress-bullet rejected">
                          <span className="round-bullet-dot" />
                          Not Selected
                        </span>
                      ) : app.status === 'withdrawn' ? (
                        <span className="round-progress-bullet withdrawn">
                          <span className="round-bullet-dot" />
                          Withdrawn
                        </span>
                      ) : (
                        <span className="round-progress-bullet pending">
                          <span className="round-bullet-dot" />
                          Pending Shortlist
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="status-badges-container">
                        <span className={`badge ${STATUS_BADGE[app.status] || STATUS_BADGE.applied}`} style={{ textTransform: 'capitalize' }}>
                          {app.job_type === 'external' && app.status === 'selected' ? 'Placed (Off-Campus)' : app.status}
                        </span>
                        {app.status === 'selected' && (
                          <span className="animate-pulse inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black bg-warning/20 text-warning border border-warning/30 tracking-wider uppercase">
                            {app.job_type === 'external' ? 'Upload Offer Letter' : 'Action Required'}
                          </span>
                        )}
                        {app.job_status === 'closed' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black bg-danger/10 text-danger border border-danger/20 tracking-wider uppercase">
                            Closed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Link 
                        to={`/student/applications/${app.id}`} 
                        className="btn btn-outline btn-xs py-1.5 px-3 rounded-lg text-[10px] font-bold"
                      >
                        {app.job_type === 'external' && app.status === 'selected' 
                          ? 'Upload Offer Letter' 
                          : app.status === 'selected' 
                            ? 'Respond to Offer' 
                            : 'Track Application'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
