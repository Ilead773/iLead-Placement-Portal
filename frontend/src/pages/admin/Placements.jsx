// src/pages/admin/Placements.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Briefcase, Users, DollarSign, Award, Calendar, FileText, CheckCircle, XCircle, Send, Download } from 'lucide-react';

export default function Placements() {
  const navigate = useNavigate();
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [toast, setToast] = useState(null);

  // States for viewing assigned students modal
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobApplications, setJobApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState('all');

  // Compute filtered candidates and counts by status tab for the interactive modal
  const modalTabsData = useMemo(() => {
    const counts = { all: 0, placed: 0, assigned: 0, applied: 0, rejected: 0 };
    const items = { all: [], placed: [], assigned: [], applied: [], rejected: [] };

    jobApplications.forEach(app => {
      counts.all++;
      items.all.push(app);

      if (app.status === 'selected' || app.status === 'accepted') {
        counts.placed++;
        items.placed.push(app);
      } else if (app.status === 'assigned' || app.status === 'shortlisted' || app.status === 'interviewing') {
        counts.assigned++;
        items.assigned.push(app);
      } else if (app.status === 'applied') {
        counts.applied++;
        items.applied.push(app);
      } else if (app.status === 'rejected') {
        counts.rejected++;
        items.rejected.push(app);
      } else {
        // Fallback for custom or unrecognized statuses
        counts.assigned++;
        items.assigned.push(app);
      }
    });

    return { counts, items };
  }, [jobApplications]);

  // Season checks based on month (0 = Jan, 11 = Dec)
  const isInSeason = (placement, season) => {
    if (!placement.created_at) return season === 'all';
    const date = new Date(placement.created_at);
    const month = date.getMonth();
    
    if (season === 'all') return true;
    if (season === 'jan_mar') {
      // January, February, and December of the placement season
      return month === 11 || month === 0 || month === 1;
    }
    if (season === 'mar_june') {
      // March, April, May, June, July
      return month >= 2 && month <= 6;
    }
    if (season === 'aug_nov') {
      // August, September, October, November
      return month >= 7 && month <= 10;
    }
    return false;
  };

  const filteredPlacements = useMemo(() => {
    return placements.filter(p => isInSeason(p, activeTab));
  }, [placements, activeTab]);

  const stats = useMemo(() => {
    const total = filteredPlacements.length;
    
    let totalSalary = 0;
    let maxSalary = 0;
    let salaryCount = 0;
    let totalAssignments = 0;

    filteredPlacements.forEach(p => {
      // package is stored in LPA (e.g. 12.0) or absolute (e.g. 1200000)
      if (p.package) {
        const pkg = Number(p.package);
        const sal = pkg < 100 ? pkg * 100000 : pkg;
        totalSalary += sal;
        if (sal > maxSalary) maxSalary = sal;
        salaryCount++;
      }
      if (p.applications_count) {
        totalAssignments += Number(p.applications_count);
      } else if (p.assignment_count) {
        totalAssignments += Number(p.assignment_count);
      }
    });

    const avgSalary = salaryCount > 0 ? Math.round(totalSalary / salaryCount) : 0;

    return {
      total,
      avgSalary,
      maxSalary,
      totalAssignments
    };
  }, [filteredPlacements]);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchPlacements = async () => {
    setLoading(true);
    try { 
      // Fetching unified jobs (recruitment drives) instead of legacy placements table
      const { data } = await api.get('/jobs/jobs/', {
        params: { _t: Date.now() }
      }); 
      setPlacements(data); 
    }
    catch { showToast('Failed to load opportunities.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPlacements(); }, []);

  const handleEdit = (p) => {
    // Redirect to unified job edit page
    navigate(`/jobs/${p.id}/edit`);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this placement drive?')) return;
    try { 
      await api.delete(`/jobs/jobs/${id}/`); 
      showToast('Placement drive deleted successfully!'); 
      fetchPlacements(); 
    }
    catch { showToast('Failed to delete placement drive.', 'error'); }
  };

  // Fetch student details in real time
  const handleViewStudents = async (job) => {
    setSelectedJob(job);
    setModalActiveTab('all');
    setLoadingApps(true);
    try {
      const { data } = await api.get(`/jobs/admin/jobs/${job.id}/applications/`, {
        params: { _t: Date.now() }
      });
      setJobApplications(data);
    } catch {
      showToast('Failed to load student details.', 'error');
    } finally {
      setLoadingApps(false);
    }
  };

  const downloadSelectedCsv = async (job) => {
    if (!job?.id) return;
    try {
      const res = await api.get(`/jobs/admin/jobs/${job.id}/selected-csv/`, {
        responseType: 'blob',
        params: { status: ['selected', 'accepted'] },
      });

      const disposition = res.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename=\"([^\"]+)\"/i);
      const fallbackName = `selected_students_${(job.company_name || 'company').replaceAll(' ', '_')}.csv`;
      const filename = match?.[1] || fallbackName;

      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error(e);
      showToast('Failed to download CSV.', 'error');
    }
  };

  const downloadCycleSelectedCsv = async () => {
    try {
      const res = await api.get('/jobs/admin/jobs/cycle-selected-csv/', {
        responseType: 'blob',
        params: { season: activeTab, status: ['selected', 'accepted'] },
      });

      const disposition = res.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename=\"([^\"]+)\"/i);
      const filename = match?.[1] || `selected_students_cycle_${activeTab}.csv`;

      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error(e);
      showToast('Failed to download cycle CSV.', 'error');
    }
  };

  return (
    <div className="page-container">
      {/* Dynamic Keyframe Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Placements Portal</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Showing {filteredPlacements.length} of {placements.length} opportunities
          </p>
        </div>
      </div>

      {/* Dynamic Statistics Grid */}
      <div className="stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Card 1: Total Jobs */}
        <div className="card stats-card" style={{
          background: 'var(--bg-card, rgba(255, 255, 255, 0.05))',
          borderRadius: '16px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <div className="icon-container" style={{
            background: 'linear-gradient(135deg, var(--accent-hover, #2563eb) 0%, var(--accent-primary, #1d4ed8) 100%)',
            color: 'white',
            borderRadius: '12px',
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Briefcase size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Jobs</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px', color: 'var(--text-primary)' }}>{stats.total}</div>
          </div>
        </div>

        {/* Card 2: Students Assigned */}
        <div className="card stats-card" style={{
          background: 'var(--bg-card, rgba(255, 255, 255, 0.05))',
          borderRadius: '16px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <div className="icon-container" style={{
            background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
            color: 'white',
            borderRadius: '12px',
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Students</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px', color: 'var(--text-primary)' }}>{stats.totalAssignments}</div>
          </div>
        </div>

        {/* Card 3: Average Salary */}
        <div className="card stats-card" style={{
          background: 'var(--bg-card, rgba(255, 255, 255, 0.05))',
          borderRadius: '16px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <div className="icon-container" style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            borderRadius: '12px',
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Average Salary</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px', color: 'var(--text-primary)' }}>
              {stats.avgSalary ? `₹${stats.avgSalary.toLocaleString()}` : '—'}
            </div>
          </div>
        </div>

        {/* Card 4: Highest Package */}
        <div className="card stats-card" style={{
          background: 'var(--bg-card, rgba(255, 255, 255, 0.05))',
          borderRadius: '16px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <div className="icon-container" style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
            color: 'white',
            borderRadius: '12px',
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Award size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Highest Package</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px', color: 'var(--text-primary)' }}>
              {stats.maxSalary ? `₹${stats.maxSalary.toLocaleString()}` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Glassmorphic Season Tabs */}
      <div className="season-tabs" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.25rem',
        background: 'var(--bg-input, rgba(0, 0, 0, 0.05))',
        borderRadius: '12px',
        padding: '0.375rem',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.05))',
        marginBottom: '1.5rem'
      }}>
        {[
          { id: 'all', label: 'All Seasons' },
          { id: 'mar_june', label: 'Mar - June' },
          { id: 'aug_nov', label: 'Aug - Nov' },
          { id: 'jan_mar', label: 'Jan - Mar' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: '1 1 auto',
                padding: '0.625rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'var(--accent-primary, #2563eb)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
              }}
            >
              <Calendar size={14} style={{ opacity: isActive ? 1 : 0.6 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.75rem', marginBottom: '1.5rem' }}>
        <button
          className="btn btn-secondary"
          onClick={downloadCycleSelectedCsv}
          disabled={loading}
          title="Download selected/accepted students across all companies for the current cycle tab"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Download size={16} />
          Download Cycle Selected CSV
        </button>
      </div>

      {loading ? <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div> : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Position</th>
                <th>Salary</th>
                <th>CGPA</th>
                <th>Courses</th>
                <th>Deadline</th>
                <th>Date Created</th>
                <th>Assigned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlacements.map((p) => {
                const branches = p.eligibility_rules?.allowed_branches;
                const formattedBranches = Array.isArray(branches) ? branches.join(', ') : (p.eligible_courses || 'All');
                const minCgpa = p.eligibility_rules?.min_cgpa ?? p.required_cgpa ?? '—';
                const positionName = p.role || p.position || '—';
                const assignedCount = p.applications_count ?? p.assignment_count ?? 0;
                
                // Format package to absolute rupees presentation
                let pkgValue = '—';
                if (p.package || p.salary) {
                  const rawPkg = Number(p.package || p.salary);
                  const absoluteRupees = rawPkg < 100 ? rawPkg * 100000 : rawPkg;
                  pkgValue = `₹${absoluteRupees.toLocaleString()}`;
                }

                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>
                      <button
                        onClick={() => handleViewStudents(p)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          margin: 0,
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s ease',
                          display: 'inline-block',
                          textDecoration: 'none'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.color = 'var(--accent-primary, #2563eb)';
                          e.target.style.textDecoration = 'underline';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.color = 'var(--text-primary)';
                          e.target.style.textDecoration = 'none';
                        }}
                        title="Click to view candidate details"
                      >
                        {p.company_name}
                      </button>
                    </td>
                    <td style={{ color: 'var(--text-primary)' }}>{positionName}</td>
                    <td style={{ color: 'var(--text-primary)' }}>{pkgValue}</td>
                    <td style={{ color: 'var(--text-primary)' }}>{minCgpa}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{formattedBranches}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {p.application_deadline ? new Date(p.application_deadline).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td style={{ color: 'var(--text-primary)' }}>
                      {assignedCount > 0 ? (
                        <button 
                          onClick={() => handleViewStudents(p)}
                          className="badge"
                          style={{
                            cursor: 'pointer',
                            border: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            fontWeight: 700,
                            background: 'var(--accent-soft, rgba(37, 99, 235, 0.12))',
                            color: 'var(--accent-primary, #1d4ed8)',
                            transition: 'all 0.2s ease',
                          }}
                          title="Click to view student list"
                        >
                          <Users size={12} />
                          {assignedCount} Students
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', paddingLeft: '8px' }}>0</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(p)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPlacements.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No placements found in this season.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/* Interactive Modal to view Assigned Students */}
      {selectedJob && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease'
        }} onClick={() => setSelectedJob(null)}>
          <div className="modal-card" style={{
            width: '90%',
            maxWidth: '850px',
            maxHeight: '85vh',
            overflow: 'hidden',
            background: 'var(--bg-card, rgba(25px, 25px, 35px, 0.95))',
            borderRadius: '24px',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.05))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Assigned Candidates</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {selectedJob.company_name} — {selectedJob.role || selectedJob.position}
                </p>
              </div>
              <button 
                onClick={() => setSelectedJob(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.75rem',
                  cursor: 'pointer',
                  padding: '4px',
                  lineHeight: 0.5,
                  transition: 'color 0.2s',
                }}
                onMouseOver={(e) => e.target.style.color = 'var(--text-primary)'}
                onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              padding: '1.5rem',
              overflowY: 'auto',
              flex: 1
            }}>
              {loadingApps ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                  <div className="spinner" />
                </div>
              ) : jobApplications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No students are currently assigned or applied to this placement drive.
                </div>
              ) : (
                <>
                  {/* Modal Sub-Tabs */}
                  <div className="modal-tabs" style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    paddingBottom: '1.25rem',
                    borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.05))',
                    marginBottom: '1.25rem',
                    overflowX: 'auto'
                  }}>
                    {[
                      { id: 'all', label: 'All Candidates', count: modalTabsData.counts.all, color: 'var(--text-primary)', icon: Users },
                      { id: 'placed', label: 'Placed', count: modalTabsData.counts.placed, color: '#10b981', icon: CheckCircle },
                      { id: 'assigned', label: 'Assigned', count: modalTabsData.counts.assigned, color: '#3b82f6', icon: Briefcase },
                      { id: 'applied', label: 'Applied', count: modalTabsData.counts.applied, color: '#f59e0b', icon: Send },
                      { id: 'rejected', label: 'Rejected', count: modalTabsData.counts.rejected, color: '#ef4444', icon: XCircle }
                    ].map(tab => {
                      const isActive = modalActiveTab === tab.id;
                      const TabIcon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setModalActiveTab(tab.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '0.5rem 1rem',
                            borderRadius: '10px',
                            border: isActive ? `1px solid ${tab.color}` : '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                            background: isActive ? `${tab.color}15` : 'transparent',
                            color: isActive ? tab.color : 'var(--text-muted)',
                            fontWeight: isActive ? 700 : 500,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <TabIcon size={14} style={{ color: isActive ? tab.color : 'var(--text-muted)', opacity: isActive ? 1 : 0.6 }} />
                          <span>{tab.label}</span>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '9999px',
                            background: isActive ? tab.color : 'var(--bg-input, rgba(255, 255, 255, 0.08))',
                            color: isActive ? '#ffffff' : 'var(--text-muted)',
                            marginLeft: '2px',
                            transition: 'all 0.2s ease'
                          }}>
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {modalTabsData.items[modalActiveTab].length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                      No {modalActiveTab === 'all' ? '' : modalActiveTab} candidates for this placement drive.
                    </div>
                  ) : (
                    <div className="table-container" style={{ margin: 0, boxShadow: 'none', border: 'none', background: 'transparent' }}>
                      <table style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th>Student Name</th>
                            <th>Course/Stream</th>
                            <th>CGPA</th>
                            <th>Status</th>
                            <th>Current Stage</th>
                            <th>Date Applied</th>
                            <th>Offer Letter</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modalTabsData.items[modalActiveTab].map((app) => (
                            <tr key={app.id}>
                              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{app.student_name}</td>
                              <td style={{ color: 'var(--text-primary)' }}>{app.student_stream || 'N/A'}</td>
                              <td style={{ color: 'var(--text-primary)' }}>{app.student_cgpa || 'N/A'}</td>
                              <td>
                                <span className={`badge ${
                                  app.status === 'selected' || app.status === 'accepted' ? 'badge-success' :
                                  app.status === 'shortlisted' || app.status === 'interviewing' ? 'badge-info' :
                                  app.status === 'applied' ? 'badge-neutral' : 'badge-danger'
                                }`} style={{ textTransform: 'capitalize' }}>
                                  {app.status}
                                </span>
                              </td>
                              <td style={{ color: 'var(--text-primary)' }}>
                                {app.current_round ? app.current_round.round_name : 'Initial Stage'}
                              </td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {app.applied_at ? new Date(app.applied_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                              </td>
                              <td>
                                {app.offer_letter_file ? (
                                  <a 
                                    href={app.offer_letter_file} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="badge badge-success"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      fontWeight: 'bold',
                                      textDecoration: 'none',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      transition: 'all 0.2s ease',
                                    }}
                                  >
                                    <FileText size={12} /> View Offer
                                  </a>
                                ) : app.status === 'selected' || app.status === 'accepted' ? (
                                  <span className="badge badge-warning" style={{ padding: '4px 10px', borderRadius: '6px' }}>
                                    Pending
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.05))',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              background: 'rgba(0, 0, 0, 0.15)'
            }}>
              <button
                className="btn btn-secondary"
                onClick={() => downloadSelectedCsv(selectedJob)}
                disabled={loadingApps}
                title="Download selected/accepted students as CSV"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <Download size={16} />
                Download Selected CSV
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setSelectedJob(null)}
              >
                Close View
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setSelectedJob(null);
                  navigate(`/jobs/${selectedJob.id}/applications`);
                }}
              >
                Manage Pipeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
