import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
   Building, Search, CheckCircle, XCircle, Clock, 
   ArrowRight, GraduationCap, Award, FileText, ChevronRight, 
   Sparkles, ListFilter, CheckSquare, Square, UserCheck, Users,
   RefreshCw, Check, AlertTriangle, AlertCircle, ExternalLink,
   TrendingUp
 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function JobPipeline() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [applications, setApplications] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingApps, setLoadingApps] = useState(false);
  const [activeTab, setActiveTab] = useState('applied'); // 'applied', 'shortlisted', 'interviewing', 'selected'
  
  // Selection and Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Fetch all jobs for selector
  const fetchJobs = useCallback(async () => {
    try {
      const response = await axios.get('/jobs/admin/jobs/', {
        params: { _t: Date.now() }
      });
      setJobs(response.data || []);
      if (response.data && response.data.length > 0) {
        setSelectedJobId(response.data[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load recruitment jobs');
    } finally {
      setLoadingJobs(false);
    }
  }, []);

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

  // 4. Update status helper
  const updateStatus = async (appId, newStatus) => {
    try {
      await axios.patch(`/applications/admin/applications/${appId}/`, { status: newStatus });
      toast.success(`Candidate status updated to ${newStatus}`);
      fetchApplications(selectedJobId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update candidate status');
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
      toast.error('Bulk update failed. Some statuses might not have updated.', { id: toastId });
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

  // 7. Partition applications by 4 Tab categories
  const appliedApps = useMemo(() => {
    return applications.filter(app => app.status === 'applied');
  }, [applications]);

  const shortlistedApps = useMemo(() => {
    return applications.filter(app => app.status === 'shortlisted');
  }, [applications]);

  const interviewingApps = useMemo(() => {
    return applications.filter(app => app.status === 'interviewing');
  }, [applications]);

  const selectedApps = useMemo(() => {
    return applications.filter(app => app.status === 'selected' || app.status === 'accepted');
  }, [applications]);

  // Apply search filtering on currently active list
  const currentTabApps = useMemo(() => {
    let list = [];
    if (activeTab === 'applied') list = appliedApps;
    else if (activeTab === 'shortlisted') list = shortlistedApps;
    else if (activeTab === 'interviewing') list = interviewingApps;
    else if (activeTab === 'selected') list = selectedApps;

    if (!searchTerm.trim()) return list;

    const term = searchTerm.toLowerCase();
    return list.filter(app => 
      (app.student_name || '').toLowerCase().includes(term) || 
      (app.student_stream || '').toLowerCase().includes(term)
    );
  }, [activeTab, appliedApps, shortlistedApps, interviewingApps, selectedApps, searchTerm]);

  // Statistics counters
  const stats = useMemo(() => {
    const total = applications.length;
    const applied = applications.filter(a => a.status === 'applied').length;
    const shortlisted = applications.filter(a => a.status === 'shortlisted').length;
    const interviewing = applications.filter(a => a.status === 'interviewing').length;
    const selected = applications.filter(a => a.status === 'selected' || a.status === 'accepted').length;
    const rejected = applications.filter(a => a.status === 'rejected').length;

    const conversionRate = total > 0 ? ((selected / total) * 100).toFixed(0) : 0;

    return { total, applied, shortlisted, interviewing, selected, rejected, conversionRate };
  }, [applications]);

  if (loadingJobs) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p className="text-secondary mt-4 font-bold">Initializing Pipeline Panel...</p>
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
          <div className="flex items-center gap-2 mb-2 job-pipeline-kicker-row">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#dc2626]/10 text-[#dc2626] border border-[#dc2626]/20 job-pipeline-kicker">
              Recruitment Core
            </span>
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 border border-blue-500/20 job-pipeline-kicker job-pipeline-kicker-live">
              Live Status Board
            </span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary font-heading job-pipeline-title">
            Job Selection <span className="bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent">Pipeline</span>
          </h1>
          <p className="text-secondary text-sm font-medium mt-2 max-w-2xl leading-relaxed job-pipeline-subtitle">
            Track student submissions, qualify cohorts, invite candidates to interview rounds, and manage job selections.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-center">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefresh} 
            disabled={isRefreshing || !selectedJobId} 
            className="btn btn-secondary flex items-center gap-2 px-5 py-3 font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm border-border-color bg-card"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-primary' : 'text-primary'} />
            Sync Roster
          </motion.button>
        </div>
      </div>

      {/* Immersive Job Selector Card */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 md:p-8 mb-8 border border-blue-500/20 bg-gradient-to-r from-card via-card to-red-500/[0.02] rounded-3xl shadow-sm relative overflow-hidden group job-pipeline-selector-card"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500" />
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6">
          <div className="flex-shrink-0 bg-gradient-to-tr from-blue-600 to-red-600 p-4 rounded-2xl text-white flex items-center justify-center">
            <Building size={32} />
          </div>
          
          <div className="flex-1 min-w-0">
            <label className="text-xs font-black uppercase text-secondary tracking-widest block mb-2">
              Currently Selected Recruitment Drive
            </label>
            {jobs.length === 0 ? (
              <p className="text-error font-bold">No active jobs found. Create placement jobs first.</p>
            ) : (
              <select 
                value={selectedJobId} 
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="input-field py-3 px-4 text-lg font-bold bg-card border-border-color rounded-2xl hover:border-[#2563eb]/50 focus:border-[#2563eb] transition-all w-full shadow-inner cursor-pointer"
              >
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>
                    {job.company_name} - {job.role} ({job.job_type === 'external' ? 'Off-Campus' : 'On-Campus'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedJob && (
            <div className="md:border-l border-border-color/80 md:pl-6 flex flex-col justify-center min-w-[150px]">
              <span className="text-secondary text-[10px] font-black uppercase tracking-wider block">Submission Deadline</span>
              <span className="text-primary font-black text-lg mt-1 tracking-tight">
                {new Date(selectedJob.application_deadline).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric', year: 'numeric'
                })}
              </span>
              <span className="text-[10px] text-muted font-bold mt-1 uppercase">
                {selectedJob.location || 'Remote'}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {selectedJobId && (
        <>
          {/* Quick Metrics Strip Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="card p-5 flex flex-col justify-between border-border-color/80 bg-card rounded-2xl shadow-sm relative overflow-hidden group hover:border-[#2563eb]/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black text-secondary uppercase tracking-widest block">Total Roster</span>
                <span className="bg-info/10 text-info p-2 rounded-xl"><Users size={16} /></span>
              </div>
              <div>
                <span className="text-3xl font-black text-primary tracking-tight">{stats.total}</span>
                <span className="text-[9px] text-muted font-bold uppercase block mt-1">Submissions</span>
              </div>
            </div>

            <div className="card p-5 flex flex-col justify-between border-border-color/80 bg-card rounded-2xl shadow-sm relative overflow-hidden group hover:border-[#dc2626]/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black text-secondary uppercase tracking-widest block">Shortlisted</span>
                <span className="bg-warning/10 text-warning p-2 rounded-xl"><CheckSquare size={16} /></span>
              </div>
              <div>
                <span className="text-3xl font-black text-[#dc2626] tracking-tight">{stats.shortlisted}</span>
                <span className="text-[9px] text-muted font-bold uppercase block mt-1">Pre-Qualified</span>
              </div>
            </div>

            <div className="card p-5 flex flex-col justify-between border-border-color/80 bg-card rounded-2xl shadow-sm relative overflow-hidden group hover:border-[#2563eb]/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black text-secondary uppercase tracking-widest block">Interviewing</span>
                <span className="bg-purple-500/10 text-purple-500 p-2 rounded-xl"><Clock size={16} /></span>
              </div>
              <div>
                <span className="text-3xl font-black text-purple-600 tracking-tight">{stats.interviewing}</span>
                <span className="text-[9px] text-muted font-bold uppercase block mt-1">In Process</span>
              </div>
            </div>

            <div className="card p-5 flex flex-col justify-between border-emerald-500/20 bg-card rounded-2xl shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black text-secondary uppercase tracking-widest block">Selections</span>
                <span className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl"><Award size={16} /></span>
              </div>
              <div>
                <span className="text-3xl font-black text-emerald-500 tracking-tight">{stats.selected}</span>
                <span className="text-[9px] text-muted font-bold uppercase block mt-1">Offers Extended</span>
              </div>
            </div>

            <div className="col-span-2 md:col-span-1 card p-5 flex flex-col justify-between border-border-color/80 bg-card rounded-2xl shadow-sm relative overflow-hidden group transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black text-secondary uppercase tracking-widest block">Conversion</span>
                <span className="bg-[#dc2626]/10 text-[#dc2626] p-2 rounded-xl"><TrendingUp size={16} /></span>
              </div>
              <div>
                <span className="text-3xl font-black text-primary tracking-tight">{stats.conversionRate}%</span>
                <span className="text-[9px] text-muted font-bold uppercase block mt-1">Selection Rate</span>
              </div>
            </div>
          </div>

          {/* Sliding Bottom Border Navigation Tabs */}
          <div className="flex gap-2 overflow-x-auto border-b border-border-color/60 pb-0 mb-8 backdrop-blur-sm job-pipeline-tabs-wrap">
            <button 
              onClick={() => { setActiveTab('applied'); setSelectedAppIds([]); }}
              className={`flex items-center gap-2 px-6 py-4 font-black text-xs tracking-wider uppercase border-b-2 transition-all duration-300 job-pipeline-tab ${
                activeTab === 'applied' 
                  ? 'border-primary text-primary font-black job-pipeline-tab-active' 
                  : 'border-transparent text-secondary hover:text-primary hover:bg-slate-100/[0.02]'
              }`}
            >
              <Clock size={15} />
              Applied ({appliedApps.length})
            </button>
            
            <button 
              onClick={() => { setActiveTab('shortlisted'); setSelectedAppIds([]); }}
              className={`flex items-center gap-2 px-6 py-4 font-black text-xs tracking-wider uppercase border-b-2 transition-all duration-300 job-pipeline-tab ${
                activeTab === 'shortlisted' 
                  ? 'border-primary text-primary font-black job-pipeline-tab-active' 
                  : 'border-transparent text-secondary hover:text-primary hover:bg-slate-100/[0.02]'
              }`}
            >
              <CheckSquare size={15} />
              Shortlisted ({shortlistedApps.length})
            </button>
 
            <button 
              onClick={() => { setActiveTab('interviewing'); setSelectedAppIds([]); }}
              className={`flex items-center gap-2 px-6 py-4 font-black text-xs tracking-wider uppercase border-b-2 transition-all duration-300 job-pipeline-tab ${
                activeTab === 'interviewing' 
                  ? 'border-primary text-primary font-black job-pipeline-tab-active' 
                  : 'border-transparent text-secondary hover:text-primary hover:bg-slate-100/[0.02]'
              }`}
            >
              <Users size={15} />
              Interview ({interviewingApps.length})
            </button>
 
            <button 
              onClick={() => { setActiveTab('selected'); setSelectedAppIds([]); }}
              className={`flex items-center gap-2 px-6 py-4 font-black text-xs tracking-wider uppercase border-b-2 transition-all duration-300 job-pipeline-tab ${
                activeTab === 'selected' 
                  ? 'border-primary text-primary font-black job-pipeline-tab-active' 
                  : 'border-transparent text-secondary hover:text-primary hover:bg-slate-100/[0.02]'
              }`}
            >
              <UserCheck size={15} />
              Selected ({selectedApps.length})
            </button>
          </div>
 
          {/* Filtering and Search Controls + Slide-up Bulk panel */}
          <div className="flex justify-between items-center flex-wrap gap-4 mb-6 job-pipeline-controls">
            <div className="relative flex-1 max-w-md w-full job-pipeline-search-wrap">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-secondary job-pipeline-search-icon">
                <Search size={16} className="text-slate-400" />
              </span>
              <input 
                type="text" 
                placeholder="Search candidates by name, register number, or branch..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-9 pr-4 py-2.5 bg-card border-border-color rounded-xl hover:border-[#2563eb]/50 focus:border-[#2563eb] transition-all w-full text-xs font-medium shadow-inner job-pipeline-search-input"
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
 
            {/* Premium Framer Motion Bulk Action Bar */}
            <AnimatePresence>
              {selectedAppIds.length > 0 && (activeTab === 'applied' || activeTab === 'shortlisted') && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="flex items-center gap-3 bg-gradient-to-r from-[#2563eb]/10 to-[#dc2626]/10 border border-[#2563eb]/20 px-4 py-2.5 rounded-2xl shadow-md"
                >
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest pr-1">
                    {selectedAppIds.length} Selected Candidates
                  </span>
                  {activeTab === 'applied' ? (
                    <>
                      <button 
                        onClick={() => handleBulkUpdate('shortlisted')} 
                        className="btn btn-sm py-1.5 px-4 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-emerald-600 flex items-center gap-1 shadow-sm border border-emerald-400/20"
                      >
                        <Check size={13} strokeWidth={3} /> Shortlist
                      </button>
                      <button 
                        onClick={() => handleBulkUpdate('rejected')} 
                        className="btn btn-sm py-1.5 px-4 bg-red-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-red-600 flex items-center gap-1 border border-red-400/20"
                      >
                        <XCircle size={13} /> Reject
                      </button>
                    </>
                  ) : (
                      <>
                      <button 
                        onClick={() => handleBulkUpdate('interviewing')} 
                        className="btn btn-sm py-1.5 px-4 bg-[#2563eb] text-white font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-[#1d4ed8] flex items-center gap-1 shadow-sm border border-blue-400/20"
                      >
                        <Users size={13} /> Invite to Interview
                      </button>
                      <button 
                        onClick={() => handleBulkUpdate('rejected')} 
                        className="btn btn-sm py-1.5 px-4 bg-red-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-red-600 flex items-center gap-1 border border-red-400/20"
                      >
                        <XCircle size={13} /> Reject
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Roster Pipeline List Views */}
          {loadingApps ? (
            <div className="py-24 text-center flex flex-col items-center justify-center">
              <div className="spinner mb-4" />
              <p className="text-secondary font-bold">Synchronizing applicant lists...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {currentTabApps.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-20 bg-card rounded-3xl border-2 border-dashed border-border-color/80 shadow-sm flex flex-col items-center justify-center"
                >
                  <div className="p-4 rounded-full bg-slate-100 dark:bg-dark-300 text-secondary mb-3">
                    <AlertCircle size={28} />
                  </div>
                  <p className="text-primary font-black text-lg font-heading">No candidates found</p>
                  <p className="text-secondary text-sm mt-1 px-4 leading-relaxed max-w-sm">
                    {searchTerm 
                      ? 'No applications match your search query.' 
                      : `Currently there are no candidates in this stage of the recruitment process.`}
                  </p>
                </motion.div>
              ) : (
                <motion.div 
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  
                  {/* TAB 1 & 2: APPLIED / SHORTLISTED MODERN TABLE */}
                  {(activeTab === 'applied' || activeTab === 'shortlisted') && (
                    <div className="table-container rounded-2xl shadow-sm border border-border-color overflow-hidden bg-card">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: '48px' }}>
                              <button 
                                onClick={() => handleSelectAll(currentTabApps)}
                                className="flex items-center justify-center text-secondary hover:text-primary transition-all"
                              >
                                {selectedAppIds.length === currentTabApps.length ? (
                                  <CheckSquare size={20} className="text-primary" />
                                ) : (
                                  <Square size={20} />
                                )}
                              </button>
                            </th>
                            <th>Candidate Information</th>
                            <th>Major / Branch</th>
                            <th>CGPA</th>
                            <th>Eligibility Audit</th>
                            <th>Resume Portfolio</th>
                            <th className="text-right">Action Decision</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentTabApps.map((app) => {
                            const isRowSelected = selectedAppIds.includes(app.id);
                            return (
                              <tr 
                                key={app.id} 
                                className={`transition-all duration-300 ${
                                  isRowSelected 
                                    ? 'bg-blue-500/[0.02] border-l-4 border-l-[#2563eb]' 
                                    : 'hover:bg-slate-100/5'
                                }`}
                              >
                                <td>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleSelectOne(app.id); }}
                                    className="flex items-center justify-center text-secondary hover:text-primary transition-all"
                                  >
                                    {isRowSelected ? (
                                      <CheckSquare size={20} className="text-primary" />
                                    ) : (
                                      <Square size={20} />
                                    )}
                                  </button>
                                </td>
                                <td>
                                  <div className="font-extrabold text-primary">{app.student_name}</div>
                                </td>
                                <td className="text-secondary font-semibold text-xs">{app.student_stream || 'N/A'}</td>
                                <td className="text-primary font-black text-xs">
                                  {app.student_cgpa != null ? app.student_cgpa.toFixed(2) : 'N/A'}
                                </td>
                                <td>
                                  {selectedJob?.job_type === 'external' ? (
                                    <span className="badge badge-neutral text-[10px] font-black uppercase py-0.5 px-2 flex items-center gap-1 w-fit border border-slate-500/25">
                                      <ExternalLink size={10} strokeWidth={3} /> Off-Campus
                                    </span>
                                  ) : app.current_eligibility?.eligible ? (
                                    <span className="badge badge-success text-[10px] font-bold py-0.5 px-2 flex items-center gap-1 w-fit">
                                      <Check size={10} strokeWidth={3} /> Eligible
                                    </span>
                                  ) : (
                                    <span className="badge badge-danger text-[10px] font-black uppercase py-0.5 px-2 flex items-center gap-1 w-fit border border-danger/30">
                                      <AlertTriangle size={10} strokeWidth={3} /> Mismatch
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {app.resume_url ? (
                                    <a 
                                      href={app.resume_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="btn btn-secondary btn-xs py-1 px-3 text-info border-info/10 hover:border-info flex items-center gap-1.5 w-fit rounded-lg font-bold text-[10px]"
                                    >
                                      <FileText size={12} /> Portfolio
                                    </a>
                                  ) : (
                                    <span className="text-secondary text-xs italic">No resume</span>
                                  )}
                                </td>
                                <td className="text-right">
                                  <div className="flex gap-2 justify-end">
                                    {activeTab === 'applied' ? (
                                      <button 
                                        onClick={() => updateStatus(app.id, 'shortlisted')} 
                                        className="btn btn-secondary btn-xs text-success border-success/20 hover:border-success py-1.5 px-3 font-black uppercase text-[9px] tracking-wider rounded-lg"
                                      >
                                        Shortlist
                                      </button>
                                    ) : (
                                      <button 
                                        onClick={() => updateStatus(app.id, 'interviewing')} 
                                        className="btn btn-secondary btn-xs text-primary border-primary/20 hover:border-primary py-1.5 px-3 font-black uppercase text-[9px] tracking-wider rounded-lg"
                                      >
                                        Invite
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => updateStatus(app.id, 'rejected')} 
                                      className="btn btn-secondary btn-xs text-danger border-danger/25 hover:border-danger py-1.5 px-3 font-black uppercase text-[9px] tracking-wider rounded-lg"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TAB 3: MODERN INTERVIEWS TABLE */}
                  {activeTab === 'interviewing' && (
                    <div className="table-container rounded-2xl shadow-sm border border-border-color overflow-hidden bg-card">
                      <table>
                        <thead>
                          <tr>
                            <th>Candidate</th>
                            <th>Stream / Major</th>
                            <th>CGPA</th>
                            <th>Interview Stage</th>
                            <th>CV Portfolio</th>
                            <th className="text-right">Status Update</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentTabApps.map((app) => (
                            <tr key={app.id} className="hover:bg-slate-100/5">
                              <td className="font-extrabold text-primary">{app.student_name}</td>
                              <td className="text-secondary font-semibold text-xs">{app.student_stream || 'N/A'}</td>
                              <td className="text-primary font-black text-xs">
                                {app.student_cgpa != null ? app.student_cgpa.toFixed(2) : 'N/A'}
                              </td>
                              <td>
                                <div className="flex items-center gap-2">
                                  <span className="badge badge-warning text-[10px] font-black uppercase py-0.5 px-2.5 border border-warning/25">
                                    {app.current_round ? app.current_round.round_name : 'Initial Round'}
                                  </span>
                                  <ChevronRight size={12} className="text-secondary" />
                                </div>
                              </td>
                              <td>
                                {app.resume_url ? (
                                  <a 
                                    href={app.resume_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn btn-secondary btn-xs py-1 px-3 text-info border-info/10 hover:border-info flex items-center gap-1.5 w-fit rounded-lg font-bold text-[10px]"
                                  >
                                    <FileText size={12} /> Portfolio
                                  </a>
                                ) : (
                                  <span className="text-secondary text-xs italic">No resume</span>
                                )}
                              </td>
                              <td className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <button 
                                    onClick={() => updateStatus(app.id, 'selected')} 
                                    className="btn btn-secondary btn-xs text-success border-success/20 hover:border-success py-1.5 px-3 font-black uppercase text-[9px] tracking-wider rounded-lg flex items-center gap-1"
                                  >
                                    <Check size={11} strokeWidth={3} /> Select & Place
                                  </button>
                                  <button 
                                    onClick={() => updateStatus(app.id, 'rejected')} 
                                    className="btn btn-secondary btn-xs text-danger border-danger/25 hover:border-danger py-1.5 px-3 font-black uppercase text-[9px] tracking-wider rounded-lg"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TAB 4: SELECTED GRID ELITE SHOWCASE */}
                  {activeTab === 'selected' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {currentTabApps.map((app) => {
                        const initials = (app.student_name || 'C')
                          .split(' ')
                          .map(w => w[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase();

                        return (
                          <motion.div 
                            key={app.id}
                            className="card p-6 flex flex-col relative overflow-hidden border border-emerald-500/25 bg-card hover:border-emerald-500 hover:shadow-lg transition-all rounded-3xl"
                            whileHover={{ y: -4 }}
                          >
                            {/* Selected Radiant Aura Badge */}
                            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest py-1.5 px-4 rounded-bl-2xl flex items-center gap-1 shadow-sm">
                              <Sparkles size={10} className="animate-spin" style={{ animationDuration: '6s' }} /> Placed
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-white text-sm shadow-md">
                                {initials}
                              </div>
                              <div>
                                <h3 className="text-base font-extrabold text-primary line-clamp-1 font-heading">{app.student_name}</h3>
                                <p className="text-secondary text-[10px] font-black uppercase tracking-wider mt-0.5">{app.student_stream || 'N/A'}</p>
                              </div>
                            </div>

                            <div className="space-y-3.5 border-t border-border-light/60 pt-4 mb-5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-secondary font-medium">Placement Drive</span>
                                <span className="text-primary font-bold">{selectedJob?.company_name}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-secondary font-medium">Offered Position</span>
                                <span className="text-primary font-bold">{selectedJob?.role}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-secondary font-medium">Academic CGPA</span>
                                <span className="text-primary font-black">{app.student_cgpa != null ? app.student_cgpa.toFixed(2) : 'N/A'}</span>
                              </div>
                            </div>

                            <div className="flex gap-2.5 mt-auto w-full">
                              {app.resume_url ? (
                                <a 
                                  href={app.resume_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="btn btn-secondary btn-sm flex-1 text-center py-2.5 border-border-color rounded-xl flex justify-center items-center gap-1.5 font-bold text-xs bg-slate-100/50 hover:bg-slate-100"
                                >
                                  <FileText size={13} className="text-info" /> Portfolio CV
                                </a>
                              ) : (
                                <span className="text-secondary text-[10px] italic flex items-center justify-center flex-1 border border-border-color rounded-xl py-2.5 px-1 bg-slate-500/[0.01]">
                                  No CV Portfolio
                                </span>
                              )}
                              
                              {app.offer_letter_file ? (
                                <a 
                                  href={app.offer_letter_file} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="btn btn-success btn-sm flex-1 text-center py-2.5 rounded-xl flex justify-center items-center gap-1.5 font-bold text-xs shadow-sm border border-emerald-400/20"
                                >
                                  <FileText size={13} /> View Offer
                                </a>
                              ) : (
                                <div className="text-secondary text-[10px] italic flex items-center justify-center flex-1 border border-dashed border-border-color/80 rounded-xl py-2.5 px-1">
                                  Pending Offer
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                </motion.div>
              )}
            </AnimatePresence>
          )}
        </>
      )}
    </div>
  );
}
