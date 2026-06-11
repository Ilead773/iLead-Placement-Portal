import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
   Building, Search, CheckCircle, XCircle, Clock, 
   ArrowRight, GraduationCap, Award, Briefcase, FileText, ChevronRight, ChevronDown,
   Sparkles, ListFilter, CheckSquare, Square, UserCheck, Users,
   RefreshCw, Check, AlertTriangle, AlertCircle, ExternalLink,
   TrendingUp, X, Trash2
 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function JobPipeline() {
  const [selectedListingType, setSelectedListingType] = useState('internship'); // 'internship' or 'job'
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [applications, setApplications] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingApps, setLoadingApps] = useState(false);
  const [activeTab, setActiveTab] = useState('applied'); // 'applied', 'shortlisted', 'interviewing', 'selected'
  
  // Selection and Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());

  // Recruiter Directory Table states
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'
  const [tableStatusFilter, setTableStatusFilter] = useState('applied');
  const [tableEligibilityFilter, setTableEligibilityFilter] = useState('all');
  const [sortField, setSortField] = useState('student_name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // 1. Fetch all jobs for selector based on listing type
  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const response = await axios.get('/jobs/admin/jobs/', {
        params: { 
          _t: Date.now(),
          listing_type: selectedListingType
        }
      });
      const data = response.data || [];
      setJobs(data);
      if (data.length > 0) {
        setSelectedJobId(data[0].id);
      } else {
        setSelectedJobId('');
        setApplications([]);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed to load recruitment ${selectedListingType === 'internship' ? 'internships' : 'jobs'}`);
    } finally {
      setLoadingJobs(false);
    }
  }, [selectedListingType]);

  // 2. Fetch applications for selected job
  const fetchApplications = useCallback(async (jobId) => {
    if (!jobId) return;
    setLoadingApps(true);
    try {
      const response = await axios.get(`/jobs/admin/jobs/${jobId}/applications/`, {
        params: { _t: Date.now() }
      });
      setApplications(response.data || []);
      setSelectedAppIds([]); // clear selection when job changes
    } catch (err) {
      console.error(err);
      toast.error('Failed to load candidate applications');
    } finally {
      setLoadingApps(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setJobSearch('');
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (selectedJobId) {
      fetchApplications(selectedJobId);
    }
  }, [selectedJobId, fetchApplications]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchApplications(selectedJobId);
  };

  // 3. Get current selected Job object
  const selectedJob = useMemo(() => {
    return jobs.find(j => j.id === selectedJobId) || null;
  }, [jobs, selectedJobId]);

  // 3.5 Filter jobs list by search term
  const filteredJobs = useMemo(() => {
    const term = jobSearch.toLowerCase().trim();
    if (!term) return jobs;
    return jobs.filter(job => 
      (job.company_name || '').toLowerCase().includes(term) ||
      (job.role || '').toLowerCase().includes(term) ||
      (job.title || '').toLowerCase().includes(term)
    );
  }, [jobs, jobSearch]);

  // 4. Update status helper
  const updateStatus = async (appId, newStatus) => {
    try {
      await axios.patch(`/applications/admin/applications/${appId}/`, { status: newStatus });
      toast.success(`Candidate status updated to ${newStatus}`);
      fetchApplications(selectedJobId);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.status?.[0] || 
                     err.response?.data?.non_field_errors?.[0] || 
                     err.response?.data?.error || 
                     'Failed to update candidate status';
      toast.error(errMsg);
    }
  };

  // 5. Bulk status updates
  const handleBulkUpdate = async (newStatus) => {
    if (selectedAppIds.length === 0) return;
    const toastId = toast.loading(`Updating ${selectedAppIds.length} candidates...`);
    try {
      await Promise.all(
        selectedAppIds.map(appId => 
          axios.patch(`/applications/admin/applications/${appId}/`, { status: newStatus })
        )
      );
      toast.success(`Successfully updated ${selectedAppIds.length} candidates to ${newStatus}`, { id: toastId });
      setSelectedAppIds([]);
      fetchApplications(selectedJobId);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.status?.[0] || 
                     err.response?.data?.non_field_errors?.[0] || 
                     err.response?.data?.error || 
                     'Bulk update failed. Some statuses might not have updated.';
      toast.error(errMsg, { id: toastId });
    }
  };

  // 5.5 Delete actions
  const deleteApplication = async (appId, studentName) => {
    if (deletingIds.has(appId)) return;
    if (!window.confirm(`Are you sure you want to delete ${studentName || 'this student'}'s application? This action is permanent and cannot be undone.`)) {
      return;
    }
    const toastId = toast.loading('Deleting application...');
    setDeletingIds(prev => new Set(prev).add(appId));
    try {
      await axios.delete(`/applications/admin/applications/${appId}/`);
      toast.success('Application deleted successfully', { id: toastId });
      fetchApplications(selectedJobId);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Failed to delete application';
      toast.error(errMsg, { id: toastId });
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(appId);
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAppIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedAppIds.length} selected student applications? This action is permanent and cannot be undone.`)) {
      return;
    }
    const toastId = toast.loading(`Deleting ${selectedAppIds.length} applications...`);
    try {
      await Promise.all(
        selectedAppIds.map(appId => 
          axios.delete(`/applications/admin/applications/${appId}/`)
        )
      );
      toast.success(`Successfully deleted ${selectedAppIds.length} applications`, { id: toastId });
      setSelectedAppIds([]);
      fetchApplications(selectedJobId);
    } catch (err) {
      console.error(err);
      toast.error('Bulk deletion failed. Some applications might not have been deleted.', { id: toastId });
    }
  };

  // 6. Multi-select handlers
  const handleSelectAll = (filteredApps) => {
    if (selectedAppIds.length === filteredApps.length) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(filteredApps.map(a => a.id));
    }
  };

  const handleSelectOne = (appId) => {
    if (selectedAppIds.includes(appId)) {
      setSelectedAppIds(selectedAppIds.filter(id => id !== appId));
    } else {
      setSelectedAppIds([...selectedAppIds, appId]);
    }
  };

  // Filter out mismatched candidates from active tracking
  // NOTE: Always include placed (selected/accepted) students regardless of current eligibility,
  // since they have already been selected and must appear in the Placed tab.
  const eligibleApplications = useMemo(() => {
    return applications.filter(app =>
      app.status === 'selected' ||
      app.status === 'accepted' ||
      app.job_type === 'external' ||
      app.current_eligibility?.eligible !== false
    );
  }, [applications]);

  // Only count as mismatched if not already placed (selected/accepted students should never show as mismatched)
  const mismatchedApplicationsCount = useMemo(() => {
    return applications.filter(app =>
      app.job_type !== 'external' &&
      app.status !== 'selected' &&
      app.status !== 'accepted' &&
      app.current_eligibility?.eligible === false
    ).length;
  }, [applications]);

  // 7. Partition applications by Tab categories (including rejected)
  const appliedApps = useMemo(() => {
    return eligibleApplications.filter(app => app.status === 'applied');
  }, [eligibleApplications]);

  const shortlistedApps = useMemo(() => {
    return eligibleApplications.filter(app => app.status === 'shortlisted');
  }, [eligibleApplications]);

  const interviewingApps = useMemo(() => {
    return eligibleApplications.filter(app => app.status === 'interviewing');
  }, [eligibleApplications]);

  const selectedApps = useMemo(() => {
    return eligibleApplications.filter(app => app.status === 'selected' || app.status === 'accepted');
  }, [eligibleApplications]);

  const rejectedApps = useMemo(() => {
    return eligibleApplications.filter(app => app.status === 'rejected');
  }, [eligibleApplications]);

  // Real-time search filtering across all lanes simultaneously
  const filteredApplied = useMemo(() => {
    let list = appliedApps;
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(app => 
      (app.student_name || '').toLowerCase().includes(term) || 
      (app.student_stream || '').toLowerCase().includes(term) ||
      (app.student_roll_number || '').toLowerCase().includes(term)
    );
  }, [appliedApps, searchTerm]);

  const filteredShortlisted = useMemo(() => {
    let list = shortlistedApps;
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(app => 
      (app.student_name || '').toLowerCase().includes(term) || 
      (app.student_stream || '').toLowerCase().includes(term) ||
      (app.student_roll_number || '').toLowerCase().includes(term)
    );
  }, [shortlistedApps, searchTerm]);

  const filteredInterviewing = useMemo(() => {
    let list = interviewingApps;
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(app => 
      (app.student_name || '').toLowerCase().includes(term) || 
      (app.student_stream || '').toLowerCase().includes(term) ||
      (app.student_roll_number || '').toLowerCase().includes(term)
    );
  }, [interviewingApps, searchTerm]);

  const filteredSelected = useMemo(() => {
    let list = selectedApps;
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(app => 
      (app.student_name || '').toLowerCase().includes(term) || 
      (app.student_stream || '').toLowerCase().includes(term) ||
      (app.student_roll_number || '').toLowerCase().includes(term)
    );
  }, [selectedApps, searchTerm]);

  const filteredRejected = useMemo(() => {
    let list = rejectedApps;
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(app => 
      (app.student_name || '').toLowerCase().includes(term) || 
      (app.student_stream || '').toLowerCase().includes(term) ||
      (app.student_roll_number || '').toLowerCase().includes(term)
    );
  }, [rejectedApps, searchTerm]);

  // Table filtering, sorting, and pagination logic
  const tableFilteredApps = useMemo(() => {
    let list = eligibleApplications;

    // 1. Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(app => 
        (app.student_name || '').toLowerCase().includes(term) || 
        (app.student_stream || '').toLowerCase().includes(term) ||
        (app.student_roll_number || '').toLowerCase().includes(term)
      );
    }

    // 2. Status filter
    if (tableStatusFilter !== 'all') {
      if (tableStatusFilter === 'selected') {
        list = list.filter(app => app.status === 'selected' || app.status === 'accepted');
      } else {
        list = list.filter(app => app.status === tableStatusFilter);
      }
    }

    // 3. Eligibility filter
    if (tableEligibilityFilter !== 'all') {
      list = list.filter(app => {
        const isEligible = app.current_eligibility?.eligible;
        return tableEligibilityFilter === 'eligible' ? isEligible : !isEligible;
      });
    }

    // 4. Sorting
    list = [...list].sort((a, b) => {
      let valA, valB;
      if (sortField === 'student_name') {
        valA = a.student_name || '';
        valB = b.student_name || '';
      } else if (sortField === 'student_cgpa') {
        valA = a.student_cgpa != null ? a.student_cgpa : 0;
        valB = b.student_cgpa != null ? b.student_cgpa : 0;
      } else if (sortField === 'student_stream') {
        valA = a.student_stream || '';
        valB = b.student_stream || '';
      } else if (sortField === 'status') {
        valA = a.status || '';
        valB = b.status || '';
      } else if (sortField === 'applied_at') {
        valA = a.applied_at || '';
        valB = b.applied_at || '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [eligibleApplications, searchTerm, tableStatusFilter, tableEligibilityFilter, sortField, sortDirection]);

  const paginatedApps = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return tableFilteredApps.slice(startIndex, startIndex + pageSize);
  }, [tableFilteredApps, currentPage, pageSize]);

  const totalPages = Math.ceil(tableFilteredApps.length / pageSize) || 1;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Statistics counters
  const stats = useMemo(() => {
    const total = applications.length;
    const applied = appliedApps.length;
    const shortlisted = shortlistedApps.length;
    const interviewing = interviewingApps.length;
    const selected = selectedApps.length;
    const rejected = rejectedApps.length;

    const conversionRate = total > 0 ? ((selected / total) * 100).toFixed(0) : 0;

    return { total, applied, shortlisted, interviewing, selected, rejected, conversionRate };
  }, [applications, appliedApps, shortlistedApps, interviewingApps, selectedApps, rejectedApps]);

  if (loadingJobs) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p className="text-secondary mt-4 font-bold">Loading {selectedListingType === 'internship' ? 'Internship' : 'Job'} Pipeline...</p>
      </div>
    );
  }

  return (
    <div className="dash-page job-pipeline-page max-w-7xl mx-auto p-4 md:p-6" style={{ paddingBottom: 80 }}>
      {/* Decorative Glows */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-20 left-10 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      {/* Page Header */}
      <div className="relative mb-8 pb-6 border-b border-border-color/60 flex flex-col md:flex-row md:justify-between md:items-center gap-4 job-pipeline-header">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary font-heading job-pipeline-title">
            Job <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Selection</span>
          </h1>
          <p className="text-secondary text-sm font-medium mt-2 max-w-2xl leading-relaxed job-pipeline-subtitle">
            Track student applications and manage job selections.
          </p>
        </div>
      </div>

      <style>{`
        /* Segment Toggle Switcher */
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

        /* Funnel Progress Panel */
        .unified-funnel-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 20px;
          box-shadow: var(--shadow-sm);
          margin-bottom: 28px;
        }

        .funnel-flow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .funnel-stage-pill {
          flex: 1;
          min-width: 140px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          border-radius: 14px;
          background: var(--bg-card-hover, rgba(0, 0, 0, 0.02));
          border: 1px solid var(--border-light, #e2e8f0);
          transition: all 0.25s ease;
        }

        .funnel-stage-pill:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }

        .funnel-arrow-icon {
          color: var(--text-muted, #94a3b8);
          display: flex;
          align-items: center;
        }

        /* Kanban Columns Container */
        .kanban-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 36px;
          align-items: start;
        }

        @media (max-width: 1200px) {
          .kanban-container {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .kanban-container {
            grid-template-columns: 1fr;
          }
        }

        /* Individual Kanban Swimlanes */
        .kanban-lane {
          background: rgba(37, 99, 235, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          min-height: 480px;
          transition: all 0.3s ease;
        }

        .kanban-lane-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 10px;
        }

        .kanban-lane-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-primary);
        }

        .kanban-count-badge {
          font-size: 0.65rem;
          font-weight: 900;
          padding: 2px 7px;
          border-radius: 99px;
          color: white;
        }

        .kanban-scroll-area {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-grow: 1;
        }

        /* High-Fidelity Candidate Cards */
        .candidate-card-premium {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 14px;
          box-shadow: var(--shadow-sm);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .candidate-card-premium:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--accent-primary);
        }

        .candidate-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .candidate-card-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.72rem;
          color: white;
          flex-shrink: 0;
        }

        .candidate-card-meta {
          border-top: 1px solid var(--border-light, #f1f5f9);
          padding-top: 10px;
          margin-top: 10px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          font-size: 0.68rem;
          color: var(--text-secondary);
        }

        .candidate-card-actions {
          display: flex;
          gap: 6px;
          margin-top: 12px;
          border-top: 1px dashed var(--border-color);
          padding-top: 10px;
        }

        /* Status Colors */
        .status-applied-bg { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
        .status-applied-border { border-bottom: 3px solid #3b82f6; }
        
        .status-shortlisted-bg { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .status-shortlisted-border { border-bottom: 3px solid #f59e0b; }
        
        .status-interviewing-bg { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
        .status-interviewing-border { border-bottom: 3px solid #8b5cf6; }
        
        .status-selected-bg { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .status-selected-border { border-bottom: 3px solid #10b981; }

        /* General Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 99px;
        }

        /* View Mode Switcher */
        .view-mode-container {
          display: inline-flex;
          gap: 4px;
          padding: 4px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          align-items: center;
        }
        .view-mode-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.72rem;
          font-weight: 700;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .view-mode-button.active {
          background: var(--bg-card-hover, rgba(0, 0, 0, 0.05));
          color: var(--text-primary);
          box-shadow: var(--shadow-sm);
        }

        /* Modern Recruiter Table Styles */
        .recruiter-table-wrapper {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          margin-bottom: 24px;
          transition: all 0.3s ease;
        }
        .recruiter-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .recruiter-table th {
          background: rgba(0, 0, 0, 0.02);
          padding: 14px 18px;
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          user-select: none;
        }
        .recruiter-table th:hover {
          color: var(--text-primary);
        }
        .recruiter-table td {
          padding: 14px 18px;
          font-size: 0.75rem;
          border-bottom: 1px solid var(--border-light, #f1f5f9);
          color: var(--text-primary);
          vertical-align: middle;
        }
        .recruiter-table tr:hover {
          background: rgba(37, 99, 235, 0.015);
        }
        .recruiter-table tr.selected {
          background: rgba(37, 99, 235, 0.03);
        }

        /* Bulk Action Bar */
        .bulk-actions-floating-bar {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(120px);
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 100px;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 1000;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3), 0 10px 10px -5px rgba(0,0,0,0.3);
          transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          color: white;
        }
        .bulk-actions-floating-bar.active {
          transform: translateX(-50%) translateY(0);
        }
        .bulk-action-btn {
          padding: 8px 16px;
          border-radius: 100px;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .bulk-action-btn-primary {
          background: #2563eb;
          color: white;
        }
        .bulk-action-btn-primary:hover {
          background: #1d4ed8;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        .bulk-action-btn-danger {
          background: #ef4444;
          color: white;
        }
        .bulk-action-btn-danger:hover {
          background: #dc2626;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        /* Pagination Controls */
        .pagination-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: var(--bg-card);
          border-top: 1px solid var(--border-color);
        }
        .pagination-btn {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.7rem;
          font-weight: 700;
          background: var(--bg-card-hover, rgba(0, 0, 0, 0.02));
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .pagination-btn:not(:disabled):hover {
          background: var(--border-color);
        }

        /* Recruitment Stage Tabs */
        .stage-tabs-container {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
        }
        .stage-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          outline: none;
        }
        .stage-tab:hover {
          border-color: var(--accent-primary);
          color: var(--text-primary);
          background: var(--bg-card-hover, rgba(0, 0, 0, 0.02));
        }
        .stage-tab.active {
          color: white;
          border-color: transparent;
        }
        .stage-tab.active.all { background: linear-gradient(135deg, #64748b 0%, #475569 100%); }
        .stage-tab.active.applied { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
        .stage-tab.active.shortlisted { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .stage-tab.active.interviewing { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
        .stage-tab.active.selected { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .stage-tab.active.rejected { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }

        .stage-tab-count {
          font-size: 0.65rem;
          font-weight: 900;
          padding: 2px 6px;
          border-radius: 99px;
          background: rgba(0, 0, 0, 0.06);
          color: inherit;
        }
        .stage-tab.active .stage-tab-count {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      {/* Listing Type Switcher (Jobs / Internships) */}
      <div className="premium-toggle-container animate-in">
        <button
          onClick={() => setSelectedListingType('internship')}
          className={`premium-toggle-button ${selectedListingType === 'internship' ? 'active' : ''}`}
        >
          <Award size={14} />
          Internships
        </button>
        <button
          onClick={() => setSelectedListingType('job')}
          className={`premium-toggle-button ${selectedListingType === 'job' ? 'active' : ''}`}
        >
          <Briefcase size={14} />
          Jobs
        </button>
      </div>

      {/* Immersive Job Selector Card (refined visual) */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 md:p-6 mb-6 rounded-xl shadow-md relative overflow-hidden group job-pipeline-selector-card animate-in"
      >
        <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-bl-full pointer-events-none transition-transform duration-500" />

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="flex-shrink-0 bg-gradient-to-tr from-blue-600 to-indigo-600 p-3 rounded-lg text-white flex items-center justify-center">
            {selectedListingType === 'internship' ? <Award size={28} /> : <Building size={28} />}
          </div>

          <div className="flex-1 min-w-0">
            <label className="text-xs font-black uppercase text-secondary tracking-widest block mb-2">
              Currently Selected {selectedListingType === 'internship' ? 'Internship' : 'Job'}
            </label>
            {jobs.length === 0 ? (
              <p className="text-error font-bold">No active {selectedListingType === 'internship' ? 'internships' : 'jobs'} found. Create {selectedListingType === 'internship' ? 'internships' : 'placement jobs'} first.</p>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search company or role..."
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="input-field pl-10 pr-10 py-3 text-sm"
                  />
                  <div className="search-input-icon" style={{ left: 12 }}>
                    <Search size={14} />
                  </div>
                  {jobSearch && (
                    <button
                      onClick={() => setJobSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                      style={{ background: 'none', border: 'none' }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="relative" style={{ flex: 1.5 }}>
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="input-field pl-4 pr-10 py-3 text-sm font-semibold"
                    style={{ appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="">-- Choose Listing ({filteredJobs.length} matches) --</option>
                    {filteredJobs.map(job => (
                      <option key={job.id} value={job.id}>
                        {job.company_name} - {job.role} ({job.job_type === 'external' ? 'Off-Campus' : 'On-Campus'})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none flex items-center">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedJob && (
            <div className="md:border-l border-border-color/80 md:pl-6 flex flex-col justify-center min-w-[180px] space-y-1">
              <span className="text-secondary uppercase tracking-widest block" style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                Submission Deadline
              </span>
              <span className="text-primary font-extrabold" style={{ fontSize: '18px', color: 'var(--accent-primary-dark)', margin: '2px 0' }}>
                {new Date(selectedJob.application_deadline).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric', year: 'numeric'
                })}
              </span>
              <span className="text-muted font-bold uppercase block" style={{ fontSize: '10px', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                {selectedJob.location || 'Remote'} • {selectedJob.openings_count ?? 1} {selectedJob.openings_count === 1 ? 'Vacancy' : 'Vacancies'}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {selectedJobId && (
        <>
          {mismatchedApplicationsCount > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-warning/5 border border-warning/20 text-warning flex items-start gap-3 animate-in">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-warning" />
              <div>
                <h4 className="font-bold text-sm m-0 text-warning">Mismatched Candidates Hidden</h4>
                <p className="text-xs text-secondary mt-1 leading-relaxed">
                  There are {mismatchedApplicationsCount} candidate(s) who no longer match the updated criteria for this job. They have been automatically filtered out of the active recruitment pipeline.
                </p>
              </div>
            </div>
          )}

          {/* Quick Metrics Strip Dashboard */}
          <div className="unified-funnel-card animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                Student Conversion Funnel
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', background: 'var(--accent-soft)', padding: '4px 10px', borderRadius: 20 }}>
                {stats.conversionRate}% Overall Conversion
              </span>
            </div>
            
            <div className="funnel-flow">
              <div className="funnel-stage-pill">
                <div>
                  <span style={{ display: 'block', fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Applied</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#3b82f6' }}>{stats.applied}</span>
                </div>
                <Clock size={16} style={{ color: '#3b82f6' }} />
              </div>
              
              <div className="funnel-arrow-icon"><ChevronRight size={16} /></div>

              <div className="funnel-stage-pill">
                <div>
                  <span style={{ display: 'block', fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Shortlisted</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b' }}>{stats.shortlisted}</span>
                </div>
                <CheckSquare size={16} style={{ color: '#f59e0b' }} />
              </div>

              <div className="funnel-arrow-icon"><ChevronRight size={16} /></div>

              <div className="funnel-stage-pill">
                <div>
                  <span style={{ display: 'block', fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Interview</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#8b5cf6' }}>{stats.interviewing}</span>
                </div>
                <Users size={16} style={{ color: '#8b5cf6' }} />
              </div>

              <div className="funnel-arrow-icon"><ChevronRight size={16} /></div>

              <div className="funnel-stage-pill" style={{ background: 'rgba(16, 185, 129, 0.03)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Placed</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>{stats.selected}</span>
                </div>
                <Award size={16} style={{ color: '#10b981' }} />
              </div>
            </div>
          </div>

          {/* Recruitment Stage Tabs Bar */}
          <div className="stage-tabs-container animate-in">
            <button 
              onClick={() => { setTableStatusFilter('applied'); setCurrentPage(1); }} 
              className={`stage-tab applied ${tableStatusFilter === 'applied' ? 'active' : ''}`}
            >
              <Clock size={13} />
              Applied <span className="stage-tab-count">{stats.applied}</span>
            </button>
            <button 
              onClick={() => { setTableStatusFilter('shortlisted'); setCurrentPage(1); }} 
              className={`stage-tab shortlisted ${tableStatusFilter === 'shortlisted' ? 'active' : ''}`}
            >
              <CheckSquare size={13} />
              Shortlisted <span className="stage-tab-count">{stats.shortlisted}</span>
            </button>
            <button 
              onClick={() => { setTableStatusFilter('interviewing'); setCurrentPage(1); }} 
              className={`stage-tab interviewing ${tableStatusFilter === 'interviewing' ? 'active' : ''}`}
            >
              <Users size={13} />
              Interviewing <span className="stage-tab-count">{stats.interviewing}</span>
            </button>
            <button 
              onClick={() => { setTableStatusFilter('selected'); setCurrentPage(1); }} 
              className={`stage-tab selected ${tableStatusFilter === 'selected' ? 'active' : ''}`}
            >
              <Award size={13} />
              Placed <span className="stage-tab-count">{stats.selected}</span>
            </button>
            <button 
              onClick={() => { setTableStatusFilter('rejected'); setCurrentPage(1); }} 
              className={`stage-tab rejected ${tableStatusFilter === 'rejected' ? 'active' : ''}`}
            >
              <XCircle size={13} />
              Declined <span className="stage-tab-count">{stats.rejected}</span>
            </button>
          </div>

          {/* Real-time search/filtering */}
          <div className="flex justify-between items-center gap-4 mb-6">
            <div className="relative flex-grow max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-secondary">
                <Search size={15} className="text-slate-400" />
              </span>
              <input 
                type="text" 
                placeholder="Search student by candidate name, stream, or roll number..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-9 pr-4 py-2 bg-card border-border-color rounded-xl hover:border-[#2563eb]/50 focus:border-[#2563eb] transition-all w-full text-xs font-semibold shadow-inner"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-secondary hover:text-primary text-xs font-bold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Dynamic Kanban column Board */}
          {loadingApps ? (
            <div className="py-24 text-center flex flex-col items-center justify-center">
              <div className="spinner mb-4" />
              <p className="text-secondary font-bold">Synchronizing applicant lists...</p>
            </div>
          ) : applications.length === 0 ? (
            /* Total Job-Level Empty State with Eligibility summary */
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 px-8 bg-card rounded-3xl border border-border-color shadow-sm flex flex-col items-center justify-center relative overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#2563eb]/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#dc2626]/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="p-4 rounded-full bg-slate-100 dark:bg-dark-300 text-secondary mb-4 shadow-inner">
                <Users size={36} className="text-slate-400 stroke-1.5 animate-pulse" />
              </div>
              <h3 className="text-xl font-extrabold text-primary font-heading tracking-tight">Student Pipeline is Empty</h3>
              <p className="text-secondary text-sm mt-2 px-4 leading-relaxed max-w-lg font-medium">
                No students have applied to this {selectedListingType === 'internship' ? 'internship opportunity' : 'placement job'} yet. Once students submit their applications, they will automatically appear here inside the live status board.
              </p>
            </motion.div>
          ) : (
            <>
              {/* Showing stats info */}
              <div className="flex justify-between items-center mb-4 text-secondary text-xs font-bold px-2">
                <div>
                  Showing <strong className="text-primary">{tableFilteredApps.length}</strong> of <strong className="text-primary">{applications.length}</strong> applicant(s)
                </div>
              </div>

              {/* Recruiter Table */}
              <div className="recruiter-table-wrapper animate-in">
                <div style={{ overflowX: 'auto' }}>
                  <table className="recruiter-table">
                    <thead>
                      <tr>
                        <th style={{ width: '48px', cursor: 'default' }}>
                          <input 
                            type="checkbox" 
                            checked={paginatedApps.length > 0 && paginatedApps.every(a => selectedAppIds.includes(a.id))}
                            onChange={() => {
                              const pageIds = paginatedApps.map(a => a.id);
                              const allSelectedOnPage = pageIds.every(id => selectedAppIds.includes(id));
                              if (allSelectedOnPage) {
                                setSelectedAppIds(prev => prev.filter(id => !pageIds.includes(id)));
                              } else {
                                setSelectedAppIds(prev => Array.from(new Set([...prev, ...pageIds])));
                              }
                            }}
                            className="rounded border-border-color text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th onClick={() => handleSort('student_name')} style={{ cursor: 'pointer' }}>
                          Candidate {sortField === 'student_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th onClick={() => handleSort('student_stream')} style={{ cursor: 'pointer' }}>
                          Stream {sortField === 'student_stream' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th onClick={() => handleSort('student_cgpa')} style={{ cursor: 'pointer' }}>
                          CGPA {sortField === 'student_cgpa' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                          Status {sortField === 'status' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="text-right" style={{ cursor: 'default' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedApps.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No candidates match your current filter settings
                          </td>
                        </tr>
                      ) : (
                        paginatedApps.map(app => {
                          const isSelected = selectedAppIds.includes(app.id);
                          const isEligible = app.current_eligibility?.eligible;
                          
                          // Determine status badges HSL tailered colors
                          let badgeBg = 'rgba(59, 130, 246, 0.08)';
                          let badgeColor = '#3b82f6';
                          if (app.status === 'shortlisted') {
                            badgeBg = 'rgba(245, 158, 11, 0.08)';
                            badgeColor = '#f59e0b';
                          } else if (app.status === 'interviewing') {
                            badgeBg = 'rgba(139, 92, 246, 0.08)';
                            badgeColor = '#8b5cf6';
                          } else if (app.status === 'selected' || app.status === 'accepted') {
                            badgeBg = 'rgba(16, 185, 129, 0.08)';
                            badgeColor = '#10b981';
                          } else if (app.status === 'rejected') {
                            badgeBg = 'rgba(239, 68, 68, 0.08)';
                            badgeColor = '#ef4444';
                          }

                          return (
                            <tr key={app.id} className={isSelected ? 'selected' : ''}>
                              <td>
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => handleSelectOne(app.id)}
                                  className="rounded border-border-color text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div 
                                    className="candidate-card-avatar" 
                                    style={{ 
                                      width: 32, 
                                      height: 32, 
                                      fontSize: '0.72rem', 
                                      background: badgeBg, 
                                      color: badgeColor,
                                      border: `1px solid ${badgeBg}`,
                                      borderRadius: '50%'
                                    }}
                                  >
                                    {(app.student_name || 'C').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{app.student_name}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Roll: {app.student_roll_number || 'N/A'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="font-semibold text-secondary">{app.student_stream || 'General'}</td>
                              <td className="font-black text-primary">{app.student_cgpa != null ? app.student_cgpa.toFixed(2) : 'N/A'}</td>
                              <td>
                                <span 
                                  style={{ 
                                    background: badgeBg, 
                                    color: badgeColor, 
                                    padding: '4px 10px', 
                                    borderRadius: '8px', 
                                    fontSize: '0.68rem', 
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    display: 'inline-block'
                                  }}
                                >
                                  {app.status === 'selected' || app.status === 'accepted' ? 'Placed' : app.status}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                  {app.status === 'applied' && (
                                    <>
                                      <button 
                                        onClick={() => updateStatus(app.id, 'shortlisted')} 
                                        className="action-btn-pill"
                                        style={{ background: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b', fontSize: '0.68rem', padding: '6px 12px' }}
                                      >
                                        Shortlist
                                      </button>
                                      <button 
                                        onClick={() => updateStatus(app.id, 'rejected')} 
                                        className="action-btn-pill"
                                        style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', fontSize: '0.68rem', padding: '6px 12px' }}
                                      >
                                        Decline
                                      </button>
                                    </>
                                  )}
                                  {app.status === 'shortlisted' && (
                                    <>
                                      <button 
                                        onClick={() => updateStatus(app.id, 'interviewing')} 
                                        className="action-btn-pill"
                                        style={{ background: 'rgba(139, 92, 246, 0.08)', color: '#8b5cf6', fontSize: '0.68rem', padding: '6px 12px' }}
                                      >
                                        Invite Round
                                      </button>
                                      <button 
                                        onClick={() => updateStatus(app.id, 'applied')} 
                                        className="action-btn-pill flex items-center justify-center"
                                        style={{ background: 'rgba(100, 116, 139, 0.08)', color: '#64748b', padding: '6px 8px' }}
                                        title="Revert to Applied"
                                      >
                                        <RefreshCw size={12} />
                                      </button>
                                      <button 
                                        onClick={() => updateStatus(app.id, 'rejected')} 
                                        className="action-btn-pill"
                                        style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', fontSize: '0.68rem', padding: '6px 12px' }}
                                      >
                                        Decline
                                      </button>
                                    </>
                                  )}
                                  {app.status === 'interviewing' && (
                                    <>
                                      <button 
                                        onClick={() => updateStatus(app.id, 'selected')} 
                                        className="action-btn-pill"
                                        style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', fontSize: '0.68rem', padding: '6px 12px' }}
                                      >
                                        Place
                                      </button>
                                      <button 
                                        onClick={() => updateStatus(app.id, 'shortlisted')} 
                                        className="action-btn-pill flex items-center justify-center"
                                        style={{ background: 'rgba(100, 116, 139, 0.08)', color: '#64748b', padding: '6px 8px' }}
                                        title="Revert to Shortlisted"
                                      >
                                        <RefreshCw size={12} />
                                      </button>
                                      <button 
                                        onClick={() => updateStatus(app.id, 'rejected')} 
                                        className="action-btn-pill"
                                        style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', fontSize: '0.68rem', padding: '6px 12px' }}
                                      >
                                        Decline
                                      </button>
                                    </>
                                  )}
                                  {(app.status === 'selected' || app.status === 'accepted') && (
                                    <>
                                      <button 
                                        onClick={() => updateStatus(app.id, 'interviewing')} 
                                        className="action-btn-pill"
                                        style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', fontSize: '0.68rem', padding: '6px 12px' }}
                                      >
                                        Revert Placement
                                      </button>
                                    </>
                                  )}
                                  {app.status === 'rejected' && (
                                    <>
                                      <button 
                                        onClick={() => updateStatus(app.id, 'applied')} 
                                        className="action-btn-pill"
                                        style={{ background: 'rgba(100, 116, 139, 0.08)', color: '#64748b', fontSize: '0.68rem', padding: '6px 12px' }}
                                      >
                                        Reconsider
                                      </button>
                                    </>
                                  )}
                                  {app.resume_url && (
                                    <a 
                                      href={app.resume_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="action-btn-pill flex items-center justify-center" 
                                      style={{ background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6', padding: '6px 8px' }}
                                      title="View CV"
                                    >
                                      <FileText size={12} />
                                    </a>
                                  )}
                                  <button 
                                    onClick={() => deleteApplication(app.id, app.student_name)}
                                    disabled={deletingIds.has(app.id)}
                                    className={`action-btn-pill flex items-center justify-center ${deletingIds.has(app.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', padding: '6px 8px', border: 'none', cursor: deletingIds.has(app.id) ? 'not-allowed' : 'pointer' }}
                                    title="Delete Application"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination Controls */}
                {totalPages > 1 && (
                  <div className="pagination-container">
                    <span className="text-secondary text-xs font-semibold">
                      Page <strong className="text-primary">{currentPage}</strong> of <strong className="text-primary">{totalPages}</strong>
                    </span>
                    <div className="flex gap-2">
                      <button 
                        disabled={currentPage === 1} 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="pagination-btn"
                      >
                        Previous
                      </button>
                      <button 
                        disabled={currentPage === totalPages} 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className="pagination-btn"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Floating Bulk Operations Drawer */}
          <div className={`bulk-actions-floating-bar ${selectedAppIds.length > 0 ? 'active' : ''}`}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>
              {selectedAppIds.length} candidate(s) selected
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleBulkUpdate('shortlisted')} className="bulk-action-btn bulk-action-btn-primary">
                Shortlist
              </button>
              <button onClick={() => handleBulkUpdate('interviewing')} className="bulk-action-btn bulk-action-btn-primary" style={{ background: '#8b5cf6' }}>
                Interview
              </button>
              <button onClick={() => handleBulkUpdate('selected')} className="bulk-action-btn bulk-action-btn-primary" style={{ background: '#10b981' }}>
                Place
              </button>
              <button onClick={() => handleBulkUpdate('rejected')} className="bulk-action-btn bulk-action-btn-danger">
                Decline
              </button>
              <button onClick={handleBulkDelete} className="bulk-action-btn bulk-action-btn-danger" style={{ background: '#dc2626' }}>
                Delete
              </button>
              <button onClick={() => setSelectedAppIds([])} className="bulk-action-btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
