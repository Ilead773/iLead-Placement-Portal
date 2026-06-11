// src/pages/admin/Placements.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Briefcase, Users, DollarSign, Award, Calendar, FileText, CheckCircle, XCircle, Send, Download, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { OfferLetterModal } from './JobApplications';

export default function Placements() {
  const navigate = useNavigate();
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedListingType, setSelectedListingType] = useState('all'); // 'all', 'job', 'internship'
  const [selectedCampusType, setSelectedCampusType] = useState('all'); // 'all', 'internal', 'external'
  const [toast, setToast] = useState(null);

  // States for viewing placed students modal
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobApplications, setJobApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState('applied');
  const [editingOffCampusPlacement, setEditingOffCampusPlacement] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedCourseRows, setExpandedCourseRows] = useState(new Set());
  const [selectedAppForOffer, setSelectedAppForOffer] = useState(null);

  const toggleCourseRow = (e, id) => {
    e.stopPropagation();
    setExpandedCourseRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  // Compute filtered candidates and counts by status tab for the interactive modal
  const modalTabsData = useMemo(() => {
    const counts = { applied: 0, placed: 0 };
    const items = { applied: [], placed: [] };

    jobApplications.forEach(app => {
      if (app.status === 'selected' || app.status === 'accepted') {
        counts.placed++;
        items.placed.push(app);
      } else {
        counts.applied++;
        items.applied.push(app);
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
    return placements.filter(p => {
      const matchesSeason = isInSeason(p, activeTab);
      const matchesType = selectedListingType === 'all' || p.listing_type === selectedListingType;
      const matchesCampus = selectedCampusType === 'all' || p.job_type === selectedCampusType;
      
      const company = p.company_name || '';
      const position = p.role || p.position || '';
      const matchesSearch = searchQuery === '' || 
        company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        position.toLowerCase().includes(searchQuery.toLowerCase());
        
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      
      return matchesSeason && matchesType && matchesCampus && matchesSearch && matchesCategory;
    });
  }, [placements, activeTab, selectedListingType, selectedCampusType, searchQuery, selectedCategory]);

  const stats = useMemo(() => {
    const total = filteredPlacements.length;
    let jobsCount = 0;
    let internshipsCount = 0;
    
    let totalSalary = 0;
    let maxSalary = 0;
    let salaryCount = 0;
    let totalAssignments = 0;

    filteredPlacements.forEach(p => {
      if (p.listing_type === 'internship') {
        internshipsCount++;
      } else {
        jobsCount++;
      }

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
      jobsCount,
      internshipsCount,
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
    setModalActiveTab('applied');
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

  const downloadSelectedExcel = async (job) => {
    if (!job?.id) return;
    try {
      const res = await api.get(`/jobs/admin/jobs/${job.id}/selected-excel/`, {
        responseType: 'blob',
        params: { status: ['selected', 'accepted'] },
      });

      const disposition = res.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename=\"([^\"]+)\"/i);
      const fallbackName = `selected_students_${(job.company_name || 'company').replaceAll(' ', '_')}.xlsx`;
      const filename = match?.[1] || fallbackName;

      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error(e);
      showToast('Failed to download Excel.', 'error');
    }
  };

  const downloadCycleSelectedExcel = async () => {
    try {
      const res = await api.get('/jobs/admin/jobs/cycle-selected-excel/', {
        responseType: 'blob',
        params: { season: activeTab, status: ['selected', 'accepted'] },
      });

      const disposition = res.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename=\"([^\"]+)\"/i);
      const filename = match?.[1] || `selected_students_cycle_${activeTab}.xlsx`;

      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error(e);
      showToast('Failed to download cycle Excel.', 'error');
    }
  };

  const downloadFilteredPlacementsExcel = () => {
    if (filteredPlacements.length === 0) {
      showToast('No opportunities to export.', 'error');
      return;
    }

    const headers = ['Company', 'Position', 'Type', 'Campus Type', 'Salary', 'Category', 'Eligible Courses', 'Deadline', 'Date Created', 'Placed Students'];
    const rows = filteredPlacements.map(p => {
      const branches = p.eligibility_rules?.allowed_branches;
      const courses = Array.isArray(branches) ? branches.join('; ') : (p.eligible_courses || 'All');
      const assignedCount = p.applications_count ?? p.assignment_count ?? 0;
      
      let pkgVal = '—';
      if (p.package || p.salary) {
        const rawPkg = Number(p.package || p.salary);
        const lpa = rawPkg < 100 ? rawPkg : rawPkg / 100000;
        pkgVal = `${lpa.toFixed(2).replace(/\.00$/, '')} LPA`;
      }

      return [
        p.company_name || '—',
        p.role || p.position || '—',
        p.listing_type === 'internship' ? 'Internship' : 'Job Placement',
        p.job_type === 'external' ? 'Off-Campus' : 'On-Campus',
        pkgVal,
        p.category || '—',
        courses,
        p.application_deadline ? new Date(p.application_deadline).toLocaleDateString() : '—',
        p.created_at ? new Date(p.created_at).toLocaleDateString() : '—',
        assignedCount
      ];
    });

    const worksheetData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Placements Report");
    XLSX.writeFile(wb, `placements_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Exported filtered placements successfully!');
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
        
        .premium-toggle-container {
          display: inline-flex;
          gap: 4px;
          padding: 5px;
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 100px;
          box-shadow: var(--shadow-sm), inset 0 2px 4px rgba(0, 0, 0, 0.02);
          margin-bottom: 24px;
          align-items: center;
          transition: all 0.3s ease;
        }

        .premium-select-container {
          display: inline-flex;
          position: relative;
          align-items: center;
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 100px;
          box-shadow: var(--shadow-sm), inset 0 2px 4px rgba(0, 0, 0, 0.02);
          transition: all 0.3s ease;
        }

        .premium-select-container:hover {
          border-color: var(--accent-primary, #2563eb);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08);
        }

        .premium-select {
          appearance: none;
          background: transparent;
          border: none;
          outline: none;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-secondary, #64748b);
          padding: 8px 32px 8px 16px;
          cursor: pointer;
          font-family: inherit;
          width: auto;
          min-width: 155px;
          font-weight: 800;
          transition: color 0.25s;
        }

        .premium-select:hover {
          color: var(--text-primary, #0f172a);
        }

        .premium-select-arrow {
          position: absolute;
          right: 14px;
          pointer-events: none;
          color: var(--text-secondary, #64748b);
          display: flex;
          align-items: center;
        }

        .premium-select option {
          background-color: var(--bg-card, #ffffff);
          color: var(--text-primary, #0f172a);
          font-weight: 500;
          text-transform: none;
        }

        [data-theme='dark'] .premium-select option {
          background-color: #1e293b;
          color: #f8fafc;
        }
        
        .premium-toggle-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border-radius: 100px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border: none;
          background: transparent;
          color: var(--text-secondary, #64748b);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }
        
        .premium-toggle-button:hover {
          color: var(--text-primary, #0f172a);
          background: var(--bg-card-hover, rgba(0, 0, 0, 0.03));
        }
        
        .premium-toggle-button.active {
          background: linear-gradient(135deg, var(--accent-primary, #2563eb) 0%, var(--info, #3b82f6) 100%);
          color: #ffffff !important;
          font-weight: 800;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .premium-toggle-button.active svg {
          stroke: #ffffff !important;
        }

        /* Premium Stats Grid Styles */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .premium-stats-card {
          position: relative;
          background: var(--bg-card, #ffffff);
          border-radius: 20px;
          border: 1px solid var(--border-color, #e2e8f0);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 1.25rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          cursor: pointer;
        }

        .premium-stats-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: transparent;
          transition: background 0.3s ease;
        }

        .ambient-glow {
          position: absolute;
          top: -30px;
          right: -30px;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          filter: blur(25px);
          opacity: 0.15;
          pointer-events: none;
          transition: all 0.35s ease;
        }

        /* Hover States for individual color themes */
        .premium-stats-card.theme-blue:hover {
          transform: translateY(-5px);
          border-color: rgba(37, 99, 235, 0.3);
          box-shadow: 0 12px 24px -8px rgba(37, 99, 235, 0.18), 0 4px 12px rgba(0, 0, 0, 0.02);
        }
        .premium-stats-card.theme-blue::before {
          background: linear-gradient(90deg, #3b82f6, #2563eb);
        }
        .premium-stats-card.theme-blue:hover .ambient-glow {
          opacity: 0.3;
          transform: scale(1.2);
        }

        .premium-stats-card.theme-purple:hover {
          transform: translateY(-5px);
          border-color: rgba(139, 92, 246, 0.3);
          box-shadow: 0 12px 24px -8px rgba(139, 92, 246, 0.18), 0 4px 12px rgba(0, 0, 0, 0.02);
        }
        .premium-stats-card.theme-purple::before {
          background: linear-gradient(90deg, #a78bfa, #7c3aed);
        }
        .premium-stats-card.theme-purple:hover .ambient-glow {
          opacity: 0.3;
          transform: scale(1.2);
        }

        .premium-stats-card.theme-emerald:hover {
          transform: translateY(-5px);
          border-color: rgba(16, 185, 129, 0.3);
          box-shadow: 0 12px 24px -8px rgba(16, 185, 129, 0.18), 0 4px 12px rgba(0, 0, 0, 0.02);
        }
        .premium-stats-card.theme-emerald::before {
          background: linear-gradient(90deg, #34d399, #059669);
        }
        .premium-stats-card.theme-emerald:hover .ambient-glow {
          opacity: 0.3;
          transform: scale(1.2);
        }

        .premium-stats-card.theme-indigo:hover {
          transform: translateY(-5px);
          border-color: rgba(99, 102, 241, 0.3);
          box-shadow: 0 12px 24px -8px rgba(99, 102, 241, 0.18), 0 4px 12px rgba(0, 0, 0, 0.02);
        }
        .premium-stats-card.theme-indigo::before {
          background: linear-gradient(90deg, #818cf8, #4f46e5);
        }
        .premium-stats-card.theme-indigo:hover .ambient-glow {
          opacity: 0.3;
          transform: scale(1.2);
        }

        .premium-stats-card.theme-amber:hover {
          transform: translateY(-5px);
          border-color: rgba(245, 158, 11, 0.3);
          box-shadow: 0 12px 24px -8px rgba(245, 158, 11, 0.18), 0 4px 12px rgba(0, 0, 0, 0.02);
        }
        .premium-stats-card.theme-amber::before {
          background: linear-gradient(90deg, #fbbf24, #d97706);
        }
        .premium-stats-card.theme-amber:hover .ambient-glow {
          opacity: 0.3;
          transform: scale(1.2);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-icon-wrapper {
          border-radius: 14px;
          padding: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .premium-stats-card:hover .card-icon-wrapper {
          transform: scale(1.1) rotate(4deg);
        }

        .card-content-wrapper {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .card-value {
          font-family: var(--font-heading);
          font-size: 1.85rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.2;
          letter-spacing: -0.5px;
        }

        .card-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .card-footer-info {
          font-size: 0.72rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
          border-top: 1px solid var(--border-light, #f1f5f9);
          padding-top: 0.6rem;
          margin-top: 0.2rem;
          font-weight: 500;
        }

        [data-theme='dark'] .card-footer-info {
          border-top-color: rgba(255, 255, 255, 0.05);
        }
      `}</style>

      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Placements & Drives</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Showing {filteredPlacements.length} of {placements.length} opportunities (Jobs & Internships)
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Dynamic Category Switcher (All / Jobs / Internships) */}
          <div className="premium-toggle-container" style={{ marginBottom: 0 }}>
            <button
              onClick={() => setSelectedListingType('all')}
              className={`premium-toggle-button ${selectedListingType === 'all' ? 'active' : ''}`}
            >
              All Opportunities
            </button>
            <button
              onClick={() => setSelectedListingType('job')}
              className={`premium-toggle-button ${selectedListingType === 'job' ? 'active' : ''}`}
            >
              Jobs
            </button>
            <button
              onClick={() => setSelectedListingType('internship')}
              className={`premium-toggle-button ${selectedListingType === 'internship' ? 'active' : ''}`}
            >
              Internships
            </button>
          </div>

          {/* Campus Type Switcher (All / On-Campus / Off-Campus Dropdown) */}
          <div className="premium-select-container">
            <select
              value={selectedCampusType}
              onChange={(e) => setSelectedCampusType(e.target.value)}
              className="premium-select"
            >
              <option value="all">All Placements</option>
              <option value="internal">On-Campus</option>
              <option value="external">Off-Campus</option>
            </select>
            <div className="premium-select-arrow">
              <ChevronDown size={14} />
            </div>
          </div>

          {/* Category Filter Dropdown */}
          <div className="premium-select-container">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="premium-select"
              style={{ minWidth: '165px' }}
            >
              <option value="all">All Categories</option>
              <option value="A">Category A</option>
              <option value="B">Category B</option>
              <option value="C">Category C</option>
              <option value="Own">Own Category</option>
            </select>
            <div className="premium-select-arrow">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search company or position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ 
                width: '100%', 
                borderRadius: '100px', 
                paddingLeft: '18px',
                paddingRight: '18px',
                height: '38px',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Export Filtered Excel Button */}
          <button
            className="btn btn-primary"
            onClick={downloadFilteredPlacementsExcel}
            style={{ 
              borderRadius: '100px', 
              height: '38px', 
              padding: '0 20px', 
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={14} />
            Export Filtered Excel
          </button>
        </div>
      </div>

      {/* Dynamic Statistics Grid */}
      <div className="stats-grid">
        {/* Card 1a: Placement Jobs */}
        <div className="premium-stats-card theme-blue">
          <div className="ambient-glow" style={{ background: '#3b82f6' }} />
          <div className="card-top">
            <span className="card-label">Placement Jobs</span>
            <div className="card-icon-wrapper" style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%)',
              color: '#3b82f6'
            }}>
              <Briefcase size={20} />
            </div>
          </div>
          <div className="card-content-wrapper">
            <div className="card-value">{stats.jobsCount}</div>
            <div className="card-footer-info">Active Recruitment Drives</div>
          </div>
        </div>

        {/* Card 1b: Internships */}
        <div className="premium-stats-card theme-purple">
          <div className="ambient-glow" style={{ background: '#a855f7' }} />
          <div className="card-top">
            <span className="card-label">Internships</span>
            <div className="card-icon-wrapper" style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(124, 58, 237, 0.05) 100%)',
              color: '#a855f7'
            }}>
              <Award size={20} />
            </div>
          </div>
          <div className="card-content-wrapper">
            <div className="card-value">{stats.internshipsCount}</div>
            <div className="card-footer-info">Student Internship Drives</div>
          </div>
        </div>

        {/* Card 2: Students Placed */}
        <div className="premium-stats-card theme-emerald">
          <div className="ambient-glow" style={{ background: '#10b981' }} />
          <div className="card-top">
            <span className="card-label">Placed Students</span>
            <div className="card-icon-wrapper" style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(4, 120, 87, 0.05) 100%)',
              color: '#10b981'
            }}>
              <Users size={20} />
            </div>
          </div>
          <div className="card-content-wrapper">
            <div className="card-value">{stats.totalAssignments}</div>
            <div className="card-footer-info">Active Applications / Shortlists</div>
          </div>
        </div>

        {/* Card 3: Average Salary */}
        <div className="premium-stats-card theme-indigo">
          <div className="ambient-glow" style={{ background: '#6366f1' }} />
          <div className="card-top">
            <span className="card-label">Average Salary</span>
            <div className="card-icon-wrapper" style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(79, 70, 229, 0.05) 100%)',
              color: '#6366f1'
            }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="card-content-wrapper">
            <div className="card-value">
              {stats.avgSalary ? `₹${stats.avgSalary.toLocaleString()}` : '—'}
            </div>
            <div className="card-footer-info">CTC Package Average</div>
          </div>
        </div>

        {/* Card 4: Highest Package */}
        <div className="premium-stats-card theme-amber">
          <div className="ambient-glow" style={{ background: '#f59e0b' }} />
          <div className="card-top">
            <span className="card-label">Highest Package</span>
            <div className="card-icon-wrapper" style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)',
              color: '#f59e0b'
            }}>
              <Award size={20} />
            </div>
          </div>
          <div className="card-content-wrapper">
            <div className="card-value">
              {stats.maxSalary ? `₹${stats.maxSalary.toLocaleString()}` : '—'}
            </div>
            <div className="card-footer-info">Record CTC Secured</div>
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
          onClick={downloadCycleSelectedExcel}
          disabled={loading}
          title="Download selected/accepted students across all companies for the current cycle tab"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Download size={16} />
          Download Cycle Selected Excel
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
                <th>Category</th>
                <th>Courses</th>
                <th>Deadline</th>
                <th>Date Created</th>
                <th>Placed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlacements.map((p) => {
                const branches = p.eligibility_rules?.allowed_branches;
                const branchList = Array.isArray(branches) 
                  ? branches 
                  : (p.eligible_courses ? p.eligible_courses.split(',').map(s => s.trim()).filter(Boolean) : []);
                
                const rawCgpa = p.eligibility_rules?.min_cgpa ?? p.required_cgpa;
                const minCgpa = (rawCgpa === 0 || rawCgpa === '0' || rawCgpa === '0.0' || !rawCgpa) ? '—' : rawCgpa;
                
                const positionName = p.role || p.position || '—';
                const assignedCount = p.applications_count ?? p.assignment_count ?? 0;
                
                // Format package to Lakhs Per Annum (LPA) presentation
                let pkgValue = '—';
                if (p.package || p.salary) {
                  const rawPkg = Number(p.package || p.salary);
                  const lpa = rawPkg < 100 ? rawPkg : rawPkg / 100000;
                  pkgValue = `₹${lpa.toFixed(2).replace(/\.00$/, '')} LPA`;
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
                    <td style={{ color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{positionName}</span>
                        {p.listing_type === 'internship' ? (
                          <span className="badge badge-info" style={{ width: 'fit-content', fontSize: '0.625rem', padding: '2px 8px', borderRadius: '4px' }}>
                            Internship
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ width: 'fit-content', fontSize: '0.625rem', padding: '2px 8px', borderRadius: '4px' }}>
                            Job Placement
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pkgValue}</td>
                    <td style={{ color: 'var(--text-primary)' }}>
                      {p.category ? (
                        <span className={`badge ${
                          p.category === 'A' ? 'badge-success' :
                          p.category === 'B' ? 'badge-info' :
                          p.category === 'C' ? 'badge-neutral' : 'badge-warning'
                        }`} style={{ fontSize: '0.72rem', padding: '3px 8px', fontWeight: 700 }}>
                          Category {p.category}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {branchList.length === 0 ? (
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>All Courses</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '240px', alignItems: 'center' }}>
                          {branchList.slice(0, expandedCourseRows.has(p.id) ? branchList.length : 2).map((course, idx) => {
                            const displayLabel = course.length > 20 ? course.substring(0, 18) + '...' : course;
                            return (
                              <span 
                                key={idx} 
                                className="badge badge-neutral" 
                                style={{ 
                                  fontSize: '0.7rem', 
                                  padding: '2px 6px',
                                  whiteSpace: 'nowrap'
                                }}
                                title={course}
                              >
                                {displayLabel}
                              </span>
                            );
                          })}
                          {branchList.length > 2 && !expandedCourseRows.has(p.id) && (
                            <span 
                              className="badge badge-info" 
                              style={{ 
                                fontSize: '0.7rem', 
                                padding: '2px 6px', 
                                cursor: 'pointer',
                                background: 'var(--accent-soft, rgba(37, 99, 235, 0.12))',
                                color: 'var(--accent-primary, #1d4ed8)',
                                fontWeight: 700
                              }}
                              onClick={(e) => toggleCourseRow(e, p.id)}
                              title="Click to view all courses"
                            >
                              +{branchList.length - 2} more
                            </span>
                          )}
                          {branchList.length > 2 && expandedCourseRows.has(p.id) && (
                            <span 
                              className="badge badge-neutral" 
                              style={{ 
                                fontSize: '0.7rem', 
                                padding: '2px 6px', 
                                cursor: 'pointer',
                                fontWeight: 700
                              }}
                              onClick={(e) => toggleCourseRow(e, p.id)}
                            >
                              Show Less
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {p.application_deadline ? (
                        new Date(p.application_deadline).toLocaleDateString(undefined, { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })
                      ) : '—'}
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
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPlacements.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No {selectedListingType === 'all' ? 'opportunities' : selectedListingType === 'internship' ? 'internships' : 'placement jobs'} found in this season.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/* Interactive Modal to view Placed Students */}
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
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Placed Candidates</h2>
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
                  No students are currently placed or applied to this placement drive.
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
                      { id: 'applied', label: 'Applied Candidates', count: modalTabsData.counts.applied, color: '#3b82f6', icon: Send },
                      { id: 'placed', label: 'Placed Candidates', count: modalTabsData.counts.placed, color: '#10b981', icon: CheckCircle }
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
                      No {modalActiveTab === 'placed' ? 'placed' : 'applied'} records found for this placement drive.
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
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {app.applied_at ? new Date(app.applied_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                              </td>
                              <td>
                                {['selected', 'accepted'].includes(app.status) ? (
                                  app.offer_letter_status === 'pending_upload' ? (
                                    <button
                                      onClick={() => setSelectedAppForOffer(app)}
                                      className="text-warning bg-warning/10 border border-warning/20 text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-warning/20 transition-colors cursor-pointer"
                                      style={{ border: '1px solid rgba(245,158,11,0.2)' }}
                                    >
                                      📂 Upload Pending
                                    </button>
                                  ) : app.offer_letter_status === 'pending_verification' ? (
                                    <button
                                      onClick={() => setSelectedAppForOffer(app)}
                                      className="text-info bg-info/10 border border-info/20 text-xs font-extrabold px-2.5 py-1 rounded-lg hover:bg-info/20 transition-all animate-pulse cursor-pointer"
                                      style={{ border: '1px solid rgba(59,130,246,0.3)', boxShadow: '0 0 10px rgba(59,130,246,0.1)' }}
                                    >
                                      ⏳ Review Offer
                                    </button>
                                  ) : app.offer_letter_status === 'approved' ? (
                                    <button
                                      onClick={() => setSelectedAppForOffer(app)}
                                      className="text-success bg-success/10 border border-success/20 text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-success/20 transition-colors cursor-pointer"
                                      style={{ border: '1px solid rgba(16,185,129,0.2)' }}
                                    >
                                      ✅ Approved
                                    </button>
                                  ) : app.offer_letter_status === 'rejected' ? (
                                    <button
                                      onClick={() => setSelectedAppForOffer(app)}
                                      className="text-danger bg-danger/10 border border-danger/20 text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-danger/20 transition-colors cursor-pointer"
                                      style={{ border: '1px solid rgba(239,68,68,0.2)' }}
                                    >
                                      ❌ Rejected
                                    </button>
                                  ) : (
                                    <span className="text-secondary">—</span>
                                  )
                                ) : (
                                  <span className="text-secondary">—</span>
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
                onClick={() => downloadSelectedExcel(selectedJob)}
                disabled={loadingApps}
                title="Download selected/accepted students as Excel"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <Download size={16} />
                Download Selected Excel
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

      {/* Off-Campus Job Edit Modal */}
      {editingOffCampusPlacement && (
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
            boxSizing: 'border-box',
            fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)'
          }}
        >
          {/* Backdrop */}
          <div 
            onClick={() => setEditingOffCampusPlacement(null)}
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
                await api.patch(`/jobs/jobs/${editingOffCampusPlacement.id}/`, payload);
                showToast('Off-campus details updated successfully! 🎉');
                setEditingOffCampusPlacement(null);
                fetchPlacements();
              } catch (err) {
                console.error(err);
                showToast('Failed to update off-campus details.', 'error');
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
                Edit Off-Campus Drive Details
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Update external placement details directly.
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Company Name</label>
                <input required type="text" name="company_name" defaultValue={editingOffCampusPlacement.company_name} className="input-field" style={{ width: '100%' }} />
              </div>
              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Role / Position</label>
                <input required type="text" name="role" defaultValue={editingOffCampusPlacement.role} className="input-field" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Package / Compensation</label>
                  <input required type="number" step="0.1" name="package" defaultValue={editingOffCampusPlacement.package} className="input-field" style={{ width: '100%' }} />
                </div>
                <div className="input-group">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Location</label>
                  <input required type="text" name="location" defaultValue={editingOffCampusPlacement.location} className="input-field" style={{ width: '100%' }} />
                </div>
              </div>
              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Apply Link (External URL)</label>
                <input required type="url" name="external_link" defaultValue={editingOffCampusPlacement.external_link} className="input-field" style={{ width: '100%' }} />
              </div>
              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>Application Deadline</label>
                <input required type="datetime-local" name="application_deadline" defaultValue={(() => {
                  if (!editingOffCampusPlacement.application_deadline) return '';
                  const d = new Date(editingOffCampusPlacement.application_deadline);
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
                onClick={() => setEditingOffCampusPlacement(null)}
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
      {selectedAppForOffer && (
        <OfferLetterModal 
          application={selectedAppForOffer}
          onClose={() => setSelectedAppForOffer(null)}
          onSave={() => {
            handleViewStudents(selectedJob);
            fetchPlacements();
          }}
        />
      )}
    </div>
  );
}
