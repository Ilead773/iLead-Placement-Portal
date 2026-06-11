// src/pages/admin/LinkedInScraper.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Play, Clock, CheckCircle, XCircle, AlertTriangle, Activity,
  Database, Zap, Search, Filter, ExternalLink, Briefcase, MapPin, DollarSign,
  Calendar, ChevronLeft, ChevronRight, Eye, X, Check, Edit2, Shield, ShieldOff,
  Loader, Save, AlertCircle, DownloadCloud,
} from 'lucide-react';
import { jobFeedAPI } from '../../api/jobFeed';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  completed: { bg: 'rgba(16,185,129,0.12)', color: 'var(--success)', icon: CheckCircle },
  failed:    { bg: 'rgba(239,68,68,0.12)',  color: 'var(--danger)',  icon: XCircle },
  partial:   { bg: 'rgba(245,158,11,0.12)', color: 'var(--warning)', icon: AlertTriangle },
  running:   { bg: 'rgba(59,130,246,0.12)', color: 'var(--info)',    icon: RefreshCw },
};

const JOB_TYPE_OPTIONS = [
  { value: 'full_time',  label: 'Full Time' },
  { value: 'part_time',  label: 'Part Time' },
  { value: 'internship', label: 'Internship' },
  { value: 'contract',   label: 'Contract' },
  { value: 'freelance',  label: 'Freelance' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.running;
  const Icon = s.icon;
  return (
    <span className="badge" style={{ background: s.bg, color: s.color }}>
      <Icon size={12} /> {status}
    </span>
  );
}

function ApprovalBadge({ approved }) {
  return approved ? (
    <span className="badge badge-success" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
      <CheckCircle size={11} /> Approved
    </span>
  ) : (
    <span className="badge badge-danger" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
      <Clock size={11} /> Pending
    </span>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditJobModal({ job, onClose, onSaved }) {
  const [form, setForm] = useState({
    title:              job.title || '',
    company_name:       job.company_name || '',
    company_logo_url:   job.company_logo_url || '',
    location:           job.location || '',
    is_remote:          job.is_remote || false,
    job_type:           job.job_type || 'full_time',
    is_internship:      job.is_internship || false,
    description_short:  job.description_short || '',
    description:        job.description || '',
    apply_url:          job.apply_url || '',
    salary_display:     job.salary_display || '',
    experience_required: job.experience_required || '',
    required_skills:    Array.isArray(job.required_skills) ? job.required_skills.join(', ') : '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        required_skills: form.required_skills
          ? form.required_skills.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      };
      await jobFeedAPI.editScrapedJob(job.id, payload);
      toast.success('Job updated successfully!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 16,
          width: 'min(720px, 95vw)',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Edit2 size={20} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Edit LinkedIn Job</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                ID #{job.id} · LinkedIn
              </p>
            </div>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Row: Title + Company */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Job Title *</label>
              <input className="form-control" name="title" value={form.title} onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Company Name *</label>
              <input className="form-control" name="company_name" value={form.company_name} onChange={handleChange} required />
            </div>
          </div>

          {/* Row: Location + Job Type */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Location</label>
              <input className="form-control" name="location" value={form.location} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Job Type</label>
              <select className="form-control" name="job_type" value={form.job_type} onChange={handleChange}>
                {JOB_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Row: Apply URL */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Apply URL *</label>
            <input className="form-control" name="apply_url" value={form.apply_url} onChange={handleChange} required />
          </div>

          {/* Row: Salary Display + Experience */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Salary Display</label>
              <input className="form-control" name="salary_display" value={form.salary_display} onChange={handleChange} placeholder="e.g. ₹8–12 LPA" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Experience Required</label>
              <input className="form-control" name="experience_required" value={form.experience_required} onChange={handleChange} placeholder="e.g. 1-3 years" />
            </div>
          </div>

          {/* Required Skills */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Required Skills <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(comma-separated)</span></label>
            <input className="form-control" name="required_skills" value={form.required_skills} onChange={handleChange} placeholder="Python, Django, REST APIs" />
          </div>

          {/* Short Description */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Short Description</label>
            <textarea
              className="form-control"
              name="description_short"
              value={form.description_short}
              onChange={handleChange}
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Full Description */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Full Description</label>
            <textarea
              className="form-control"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={5}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Checkboxes */}
          <div style={{ display: 'flex', gap: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="checkbox" name="is_remote" checked={form.is_remote} onChange={handleChange} />
              Remote Position
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="checkbox" name="is_internship" checked={form.is_internship} onChange={handleChange} />
              Is Internship
            </label>
          </div>

          {/* Logo URL */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Company Logo URL</label>
            <input className="form-control" name="company_logo_url" value={form.company_logo_url} onChange={handleChange} />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 8, borderTop: '1px solid var(--border-color)', marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><Loader size={15} className="spin" /> Saving...</> : <><Save size={15} /> Save Changes</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job, selectedCourse, onCourseClick, onApprove, onRevoke, onEdit, approving }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="card"
      style={{
        padding: 16,
        borderLeft: job.is_approved
          ? '4px solid var(--success)'
          : job.is_internship
            ? '4px solid var(--warning)'
            : '4px solid var(--accent-primary)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {job.title}
            {job.is_internship
              ? <span className="badge badge-warning">Internship</span>
              : <span className="badge badge-primary">{job.job_type_display || 'Full-time'}</span>
            }
            <ApprovalBadge approved={job.is_approved} />
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.company_name}</span>
            {job.location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={13} /> {job.location} {job.is_remote && <span className="badge badge-neutral">Remote</span>}
              </span>
            )}
            {job.salary_display && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontWeight: 600 }}>
                <DollarSign size={13} /> {job.salary_display}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={13} /> {job.days_old}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          <span className="badge badge-neutral" style={{ textTransform: 'uppercase', fontSize: '0.72rem' }}>
            LinkedIn
          </span>
          {job.quality_score > 0 && (
            <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
              {job.quality_score}% Match
            </span>
          )}

          {/* Edit */}
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => onEdit(job)}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            title="Edit job"
          >
            <Edit2 size={13} /> Edit
          </button>

          {/* Approve / Revoke */}
          {job.is_approved ? (
            <button
              className="btn btn-sm"
              onClick={() => onRevoke(job.id)}
              disabled={approving === job.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(239,68,68,0.12)', color: 'var(--danger)',
                border: '1px solid rgba(239,68,68,0.3)',
              }}
              title="Revoke approval"
            >
              {approving === job.id ? <Loader size={13} className="spin" /> : <ShieldOff size={13} />}
              Revoke
            </button>
          ) : (
            <button
              className="btn btn-sm"
              onClick={() => onApprove(job.id)}
              disabled={approving === job.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(16,185,129,0.12)', color: 'var(--success)',
                border: '1px solid rgba(16,185,129,0.3)',
              }}
              title="Approve job"
            >
              {approving === job.id ? <Loader size={13} className="spin" /> : <Shield size={13} />}
              Approve
            </button>
          )}

          {job.apply_url && (
            <a
              href={job.apply_url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <ExternalLink size={13} /> Apply
            </a>
          )}
        </div>
      </div>

      {job.description_short && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem', marginTop: 10, lineHeight: 1.5 }}>
          {job.description_short}
        </p>
      )}

      {job.course_tags && job.course_tags.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Matched Courses:</span>
          {job.course_tags.map((ct, idx) => (
            <span
              key={idx}
              className={`badge ${ct === selectedCourse ? 'badge-primary' : 'badge-neutral'}`}
              style={{ fontSize: '0.74rem', cursor: 'pointer' }}
              onClick={() => onCourseClick(ct)}
            >
              {ct}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LinkedInScraper() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef(null);
  const jobsViewerRef = useRef(null);

  // Jobs viewer state
  const [jobsData, setJobsData] = useState({ results: [], count: 0 });
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Approval tab: 'pending' | 'approved' | 'all'
  const [approvalTab, setApprovalTab] = useState('pending');

  // Per-job approve loading state
  const [approvingId, setApprovingId] = useState(null);

  // Edit modal
  const [editingJob, setEditingJob] = useState(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchStatus = async () => {
    try {
      const { data: d } = await jobFeedAPI.getLinkedInStatus();
      
      // If a run just finished, refresh the jobs list
      if (data && data.last_run && data.last_run.status === 'running' && d.last_run && d.last_run.status !== 'running') {
        fetchAdminJobs(1);
        setTriggering(false);
        setCountdown(0);
        if (d.last_run.status === 'completed') {
          toast.success('LinkedIn scraping completed successfully!');
        } else if (d.last_run.status === 'failed') {
          toast.error(`LinkedIn scraping failed: ${d.last_run.error_log || 'Unknown error'}`);
        }
      }
      
      setData(d);
    } catch {
      toast.error('Failed to load LinkedIn scraping status.');
    } finally {
      setLoading(false);
    }
  };


  const fetchAdminJobs = useCallback(async (pageNum = 1) => {
    setJobsLoading(true);
    try {
      const approvedParam = approvalTab === 'pending' ? 'false' : approvalTab === 'approved' ? 'true' : undefined;
      const params = {
        page: pageNum,
        page_size: 10,
        course:   selectedCourse || undefined,
        source:   'linkedin',
        type:     selectedType   || undefined,
        search:   searchQuery    || undefined,
        approved: approvedParam,
      };
      const { data: d } = await jobFeedAPI.getAdminScrapedJobs(params);
      setJobsData(d);
      setPage(pageNum);
    } catch {
      toast.error('Failed to load scraped LinkedIn jobs.');
    } finally {
      setJobsLoading(false);
    }
  }, [approvalTab, selectedCourse, selectedType, searchQuery]);

  useEffect(() => {
    fetchStatus();
  }, []);

  const lr = data?.last_run;
  const isRunning = lr?.status === 'running';

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const intervalTime = (isRunning || triggering) ? 4000 : 30000;
    intervalRef.current = setInterval(fetchStatus, intervalTime);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, triggering]);


  useEffect(() => {
    fetchAdminJobs(1);
  }, [approvalTab, selectedCourse, selectedType]);

  useEffect(() => {
    if (countdown <= 0) { setTriggering(false); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleTrigger = async () => {
    try {
      await jobFeedAPI.triggerLinkedInScrape();
      toast.success('LinkedIn scraping queued!');
      setTriggering(true);
      setCountdown(300);
      setTimeout(fetchStatus, 3000);
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('A LinkedIn scrape is already running.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to trigger LinkedIn scrape.');
      }
    }
  };


  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAdminJobs(1);
  };

  const handleApprove = async (jobId) => {
    setApprovingId(jobId);
    try {
      await jobFeedAPI.approveJob(jobId);
      toast.success('Job approved — students can now see it!');
      fetchAdminJobs(page);
      fetchStatus();
    } catch {
      toast.error('Failed to approve job.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRevoke = async (jobId) => {
    setApprovingId(jobId);
    try {
      await jobFeedAPI.revokeApproval(jobId);
      toast.success('Approval revoked.');
      fetchAdminJobs(page);
      fetchStatus();
    } catch {
      toast.error('Failed to revoke approval.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleEditSaved = () => {
    fetchAdminJobs(page);
  };

  const totalPages = Math.ceil((jobsData?.count || 0) / 10);


  if (loading) {
    return (
      <div className="dash-page">
        <div className="loading-screen"><div className="spinner" /><p style={{ color: 'var(--text-muted)' }}>Loading LinkedIn dashboard...</p></div>
      </div>
    );
  }

  return (
    <div className="dash-page" style={{ padding: 24 }}>
      {/* Edit Modal */}
      <AnimatePresence>
        {editingJob && (
          <EditJobModal
            key="edit-modal"
            job={editingJob}
            onClose={() => setEditingJob(null)}
            onSaved={handleEditSaved}
          />
        )}
      </AnimatePresence>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 0, fontSize: '1.8rem' }}>
            <Activity size={28} style={{ color: 'var(--accent-primary)' }} /> LinkedIn Jobs Scraper
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: '0.9rem' }}>
            Automated targeted job collection from LinkedIn — review &amp; approve jobs before they reach students
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999 }}>
            <DownloadCloud size={14} />
            <span>Apify Engine Connected</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchStatus}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Approval Summary Banner */}
      {data && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <div
            className="metric-card"
            style={{ flex: 1, minWidth: 160, padding: '16px 20px', cursor: 'pointer', border: approvalTab === 'pending' ? '2px solid var(--danger)' : '2px solid transparent' }}
            onClick={() => { setApprovalTab('pending'); jobsViewerRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
          >
            <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} style={{ color: 'var(--danger)' }} /> Pending Approval
            </span>
            <span className="metric-value" style={{ color: 'var(--danger)' }}>{data.total_pending_approval ?? 0}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click to review</span>
          </div>
          <div
            className="metric-card"
            style={{ flex: 1, minWidth: 160, padding: '16px 20px', cursor: 'pointer', border: approvalTab === 'approved' ? '2px solid var(--success)' : '2px solid transparent' }}
            onClick={() => { setApprovalTab('approved'); jobsViewerRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
          >
            <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={14} style={{ color: 'var(--success)' }} /> Approved (Live)
            </span>
            <span className="metric-value" style={{ color: 'var(--success)' }}>{data.total_approved_jobs ?? 0}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Visible to students</span>
          </div>
          <div className="metric-card" style={{ flex: 1, minWidth: 160, padding: '16px 20px' }}>
            <span className="metric-label">Total Active LinkedIn</span>
            <span className="metric-value">{data.total_active_jobs ?? 0}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All LinkedIn jobs</span>
          </div>
        </div>
      )}

      {/* Last Run + Trigger Form */}
      <div className="grid md:grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem', marginTop: 0 }}>
            <Database size={18} /> Last Scrape Details
          </h3>
          {lr ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusBadge status={lr.status} />
                {lr.completed_at && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(lr.completed_at).toLocaleTimeString()}</span>}
              </div>
              <div className="ext-feed__stats" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                <div className="ext-feed__stat" style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: '0.85rem' }}><strong>{lr.total_fetched}</strong> Fetched</div>
                <div className="ext-feed__stat" style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: '0.85rem' }}><strong>{lr.total_saved}</strong> Saved</div>
                <div className="ext-feed__stat" style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: '0.85rem' }}><strong>{lr.total_duplicates_skipped}</strong> Dupes</div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No scraper runs recorded yet.</p>
          )}
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem', marginTop: 0 }}>
            <Zap size={18} /> Trigger LinkedIn Scraper
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.85rem' }}>
            <Clock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Runs scrape across all active course configurations and search keywords.
          </p>
          <button
            onClick={handleTrigger}
            className="btn btn-primary"
            disabled={isRunning || triggering}
            style={{ width: '100%' }}
          >
            {triggering ? (
              <>
                <Loader size={16} className="spin" style={{ marginRight: 8 }} />
                <span>Running Scraper ({countdown}s)...</span>
              </>
            ) : isRunning ? (
              <>
                <Loader size={16} className="spin" style={{ marginRight: 8 }} />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play size={16} style={{ marginRight: 8 }} />
                <span>Manually Trigger LinkedIn Scrape</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Jobs by Course */}
      <div className="card" style={{ marginTop: 20, padding: 20 }}>
        <h3 style={{ marginBottom: 16, marginTop: 0, fontSize: '1.2rem' }}>LinkedIn Jobs by Course (Click to Filter)</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Active Jobs</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(data?.jobs_by_course || []).map(item => (
                <tr
                  key={item.course_name}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedCourse(item.course_name);
                    jobsViewerRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <td style={{ fontWeight: 600, color: selectedCourse === item.course_name ? 'var(--accent-primary)' : 'inherit' }}>
                    {item.course_name}
                  </td>
                  <td>{item.count}</td>
                  <td>
                    <span className={`badge ${item.count >= 3 ? 'badge-success' : 'badge-danger'}`}>
                      {item.count >= 3 ? 'Healthy' : 'Low'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn btn-sm ${selectedCourse === item.course_name ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCourse(item.course_name);
                        jobsViewerRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <Eye size={14} /> {selectedCourse === item.course_name ? 'Viewing' : 'View Jobs'}
                    </button>
                  </td>
                </tr>
              ))}
              {(!data?.jobs_by_course || data.jobs_by_course.length === 0) && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No LinkedIn jobs scraped yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Scraped Jobs Master List ─────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 20, padding: 20 }} ref={jobsViewerRef}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: '1.2rem' }}>
              <Briefcase size={20} style={{ color: 'var(--accent-primary)' }} /> Scraped LinkedIn Jobs
              <span className="badge badge-neutral" style={{ fontSize: '0.85rem' }}>
                {jobsData?.count || 0} jobs
              </span>
            </h3>
            {selectedCourse && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                Filtering by course: <strong style={{ color: 'var(--accent-primary)' }}>{selectedCourse}</strong>
                <button
                  className="btn btn-sm btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.75rem', height: 'auto' }}
                  onClick={() => setSelectedCourse('')}
                >
                  <X size={11} /> Clear
                </button>
              </p>
            )}
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flexGrow: 1, maxWidth: 380 }}>
            <div className="input-group" style={{ flexGrow: 1, margin: 0, display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search title or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ margin: 0 }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
        </div>

        {/* Approval Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--border-color)' }}>
          {[
            { key: 'pending',  label: '⏳ Pending Approval', count: data?.total_pending_approval },
            { key: 'approved', label: '✅ Approved (Live)',   count: data?.total_approved_jobs },
            { key: 'all',      label: 'All LinkedIn Jobs',   count: data?.total_active_jobs },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setApprovalTab(tab.key)}
              style={{
                padding: '8px 20px',
                fontSize: '0.88rem',
                fontWeight: 600,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: approvalTab === tab.key ? 'var(--accent-primary)' : 'var(--text-muted)',
                borderBottom: approvalTab === tab.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                marginBottom: -2,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
              {tab.count != null && (
                <span
                  className={`badge ${tab.key === 'pending' ? 'badge-danger' : tab.key === 'approved' ? 'badge-success' : 'badge-neutral'}`}
                  style={{ fontSize: '0.72rem' }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filters Bar */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filters:</span>
          </div>

          <select
            className="form-control"
            style={{ width: 'auto', minWidth: 150, padding: '4px 12px', height: 32, fontSize: '0.85rem' }}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">All Job Types</option>
            <option value="job">Full-time Jobs</option>
            <option value="internship">Internships</option>
          </select>

          <span className="badge badge-neutral" style={{ height: 'fit-content', alignSelf: 'center', fontSize: '0.8rem' }}>
            Source: LinkedIn
          </span>

          {(selectedCourse || selectedType || searchQuery) && (
            <button
              className="btn btn-sm btn-secondary"
              style={{ marginLeft: 'auto', height: 32 }}
              onClick={() => { setSelectedCourse(''); setSelectedType(''); setSearchQuery(''); }}
            >
              Reset All Filters
            </button>
          )}
        </div>

        {/* Pending notice */}
        {approvalTab === 'pending' && (
          <div style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.87rem',
            color: 'var(--warning)',
          }}>
            <AlertCircle size={16} />
            These jobs have <strong>not yet been approved</strong>. Students cannot see them. Click <strong>Approve</strong> to make a job live.
          </div>
        )}

        {/* Jobs List */}
        {jobsLoading ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div className="spinner" />
            <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Loading jobs...</p>
          </div>
        ) : jobsData?.results?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <AnimatePresence initial={false}>
              {jobsData.results.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  selectedCourse={selectedCourse}
                  onCourseClick={setSelectedCourse}
                  onApprove={handleApprove}
                  onRevoke={handleRevoke}
                  onEdit={setEditingJob}
                  approving={approvingId}
                />
              ))}
            </AnimatePresence>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Page {page} of {totalPages} ({jobsData.count} total)
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => fetchAdminJobs(page - 1)}>
                    <ChevronLeft size={15} /> Previous
                  </button>
                  <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => fetchAdminJobs(page + 1)}>
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Briefcase size={36} style={{ margin: '0 auto 12px', opacity: 0.5, display: 'block' }} />
            <p>
              {approvalTab === 'pending'
                ? 'No pending jobs — all scraped LinkedIn jobs have been reviewed! 🎉'
                : approvalTab === 'approved'
                  ? 'No approved jobs yet. Go to the Pending tab to approve jobs.'
                  : 'No scraped LinkedIn jobs found matching your filters.'}
            </p>
            {(selectedCourse || selectedType || searchQuery) && (
              <button className="btn btn-sm btn-secondary" style={{ marginTop: 12 }} onClick={() => { setSelectedCourse(''); setSelectedType(''); setSearchQuery(''); }}>
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recent Runs */}
      <div className="card" style={{ marginTop: 20, padding: 20 }}>
        <h3 style={{ marginBottom: 16, marginTop: 0, fontSize: '1.2rem' }}>Recent Scraper Runs (LinkedIn)</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Started</th>
                <th>Completed</th>
                <th>Status</th>
                <th>Fetched</th>
                <th>Saved</th>
                <th>Dupes</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_runs || []).map(run => (
                <tr key={run.id}>
                  <td>#{run.id}</td>
                  <td style={{ fontSize: '0.82rem' }}>{new Date(run.started_at).toLocaleString()}</td>
                  <td style={{ fontSize: '0.82rem' }}>{run.completed_at ? new Date(run.completed_at).toLocaleString() : '—'}</td>
                  <td><StatusBadge status={run.status} /></td>
                  <td>{run.total_fetched}</td>
                  <td>{run.total_saved}</td>
                  <td>{run.total_duplicates_skipped}</td>
                </tr>
              ))}
              {(!data?.recent_runs || data.recent_runs.length === 0) && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No runs recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Source Health */}
      <div className="card" style={{ marginTop: 20, padding: 20 }}>
        <h3 style={{ marginBottom: 16, marginTop: 0, fontSize: '1.2rem' }}>LinkedIn Integration Health</h3>
        <div className="ext-feed__stats" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {(data?.source_health || []).map((src, i) => (
            <div key={i} className="metric-card" style={{ minWidth: 200, padding: 16 }}>
              <span className="metric-label">{src.source}</span>
              <span className="metric-value" style={{ fontSize: '1.4rem', color: 'var(--accent-primary)' }}>{src.actual_api_calls} runs triggered</span>
              <span className={`badge badge-success`} style={{ marginTop: 8 }}>
                Connected
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Total active LinkedIn jobs: <strong style={{ color: 'var(--accent-primary)' }}>{data?.total_active_jobs || 0}</strong>
        {' · '}
        Approved &amp; live: <strong style={{ color: 'var(--success)' }}>{data?.total_approved_jobs || 0}</strong>
      </div>
    </div>
  );
}
