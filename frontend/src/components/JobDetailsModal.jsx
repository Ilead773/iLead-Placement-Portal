import React, { useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  IndianRupee, 
  Clock, 
  ExternalLink, 
  ArrowRight,
  X,
  Calendar,
  Award,
  ShieldAlert,
  Info,
  ListChecks,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const JobDetailsModal = ({ 
  showModal, 
  onClose, 
  job, 
  isAdmin = false, 
  eligibility = null, 
  onApply = null 
}) => {
  const isEligible = eligibility?.eligible;
  const hasApplied = job?.has_applied;
  const failingChecks = eligibility?.failing_checks || [];

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (showModal) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showModal, onClose]);

  if (!job) return null;

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div 
          className="job-detail-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ zIndex: 9999 }}
        >
          <motion.div 
            className="job-detail-panel"
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="job-detail-header">
              <div className="job-detail-header-left">
                <div className="job-detail-title-row">
                  <h2 className="job-detail-title">{job.role}</h2>
                  {job.category && (
                    <span className="category-badge">Category {job.category}</span>
                  )}
                  <span className="round-type-tag capitalize">
                    {job.listing_type}
                  </span>
                  {job.openings_count > 0 && (
                    <span className="openings-badge">
                      {job.openings_count} {job.openings_count === 1 ? 'opening' : 'openings'}
                    </span>
                  )}
                </div>
                <div className="job-detail-company-row">
                  <Building2 size={16} className="text-info" />
                  {job.company_website ? (
                    <a
                      href={job.company_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="job-detail-company-link"
                    >
                      {job.company_name} <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span>{job.company_name}</span>
                  )}
                </div>
              </div>
              <button 
                className="job-detail-close-btn" 
                onClick={onClose}
                title="Close (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="job-detail-body">
              {/* Meta Grid */}
              <div className="job-detail-meta-grid">
                <div className="job-detail-meta-card">
                  <div className="job-detail-meta-icon-box">
                    <IndianRupee size={18} className="text-emerald-500" />
                  </div>
                  <span className="job-detail-meta-label">
                    {job.listing_type === 'internship' ? 'Stipend' : 'Package'}
                  </span>
                  <span className="job-detail-meta-value">
                    {job.listing_type === 'internship' 
                      ? (job.package ? `₹${Number(job.package).toLocaleString()} / mo` : 'Undisclosed')
                      : (job.package ? `₹${job.package} LPA` : 'Not Specified')}
                  </span>
                </div>

                <div className="job-detail-meta-card">
                  <div className="job-detail-meta-icon-box">
                    <MapPin size={18} className="text-rose-500" />
                  </div>
                  <span className="job-detail-meta-label">Location</span>
                  <span className="job-detail-meta-value">{job.location || 'Anywhere'}</span>
                </div>

                <div className="job-detail-meta-card">
                  <div className="job-detail-meta-icon-box">
                    <Briefcase size={18} className="text-blue-500" />
                  </div>
                  <span className="job-detail-meta-label">Job Type</span>
                  <span className="job-detail-meta-value capitalize">{job.job_type}</span>
                </div>

                <div className="job-detail-meta-card">
                  <div className="job-detail-meta-icon-box">
                    <Calendar size={18} className="text-amber-500" />
                  </div>
                  <span className="job-detail-meta-label">Deadline</span>
                  <span className="job-detail-meta-value">
                    {job.application_deadline ? format(new Date(job.application_deadline), 'MMM dd, yyyy, h:mm a') : 'No Deadline'}
                  </span>
                </div>

                {job.listing_type === 'internship' && job.duration && (
                  <div className="job-detail-meta-card">
                    <div className="job-detail-meta-icon-box">
                      <Clock size={18} className="text-indigo-500" />
                    </div>
                    <span className="job-detail-meta-label">Duration</span>
                    <span className="job-detail-meta-value">{job.duration}</span>
                  </div>
                )}
              </div>

              {/* Non-eligibility warning banner (only shown to student if not eligible and hasn't applied) */}
              {!isAdmin && !hasApplied && !isEligible && failingChecks.length > 0 && (
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-sm flex items-start gap-3 mt-4">
                  <ShieldAlert size={18} className="mt-0.5 flex-shrink-0 text-red-500" />
                  <div>
                    <h4 className="font-bold text-red-500 m-0">Not Eligible to Apply</h4>
                    <p className="text-xs text-secondary mt-1 leading-relaxed">
                      {failingChecks[0].reason}
                    </p>
                  </div>
                </div>
              )}

              {/* Eligibility Rules & Requirements */}
              <div className="job-detail-eligibility-wrap mt-6">
                <h4 className="section-title flex items-center gap-2 font-bold text-base mb-3">
                  <Award size={20} className="text-blue-500" /> Eligibility & Requirements
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-500/5 dark:bg-zinc-800/20 rounded-xl border border-border-color/30 text-sm">
                  <div>
                    <span className="text-secondary font-medium block mb-0.5">Eligible Courses</span>
                    <span className="font-bold text-primary">
                      {job.eligibility_rules?.allowed_branches && job.eligibility_rules.allowed_branches.length > 0
                        ? job.eligibility_rules.allowed_branches.join(', ')
                        : 'All Courses'}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary font-medium block mb-0.5">Minimum CGPA Required</span>
                    <span className="font-bold text-primary">
                      {job.eligibility_rules?.min_cgpa !== undefined && job.eligibility_rules.min_cgpa !== '' && Number(job.eligibility_rules.min_cgpa) !== 0
                        ? `${job.eligibility_rules.min_cgpa}`
                        : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary font-medium block mb-0.5">Minimum Attendance Required</span>
                    <span className="font-bold text-primary">
                      {job.eligibility_rules?.min_attendance !== undefined && job.eligibility_rules.min_attendance !== '' && Number(job.eligibility_rules.min_attendance) !== 0
                        ? `${job.eligibility_rules.min_attendance}%`
                        : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary font-medium block mb-0.5">Maximum Allowed Backlogs</span>
                    <span className="font-bold text-primary">
                      {job.eligibility_rules?.max_backlogs !== undefined && job.eligibility_rules.max_backlogs !== ''
                        ? `${job.eligibility_rules.max_backlogs}`
                        : 'No Limit'}
                    </span>
                  </div>
                  {job.eligibility_rules?.allowed_years && job.eligibility_rules.allowed_years.length > 0 && (
                    <div>
                      <span className="text-secondary font-medium block mb-0.5">Eligible Batches (Graduation Year)</span>
                      <span className="font-bold text-primary">
                        {job.eligibility_rules.allowed_years.join(', ')}
                      </span>
                    </div>
                  )}
                  {job.hr_email && (
                    <div>
                      <span className="text-secondary font-medium block mb-0.5">HR Email Contact</span>
                      <span className="font-bold text-primary flex items-center gap-1">
                        <Mail size={14} className="text-muted" /> {job.hr_email}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Selection rounds timeline */}
              {job.rounds && job.rounds.length > 0 && (
                <div className="job-detail-rounds-section mt-6">
                  <h4 className="section-title flex items-center gap-2 font-bold text-base mb-3">
                    <ListChecks size={20} className="text-blue-500" /> Selection Rounds
                  </h4>
                  <div className="rounds-timeline">
                    {job.rounds.map((round, idx) => (
                      <div key={round.id || idx} className="round-timeline-item">
                        <div className="round-timeline-dot" />
                        <div className="round-timeline-card">
                          <div className="round-card-header">
                            <div className="round-name-wrap">
                              <div className="round-number-badge">{round.round_number}</div>
                              <span className="round-name">{round.round_name}</span>
                            </div>
                            <div className="round-badges-wrap">
                              <span className="round-type-tag capitalize">{round.round_type}</span>
                              {round.is_elimination && (
                                <span className="round-elimination-tag">Elimination Round</span>
                              )}
                            </div>
                          </div>
                          <div className="round-card-meta">
                            {round.passing_score && (
                              <div className="round-meta-item">
                                <strong>Minimum Passing Score:</strong> {round.passing_score}%
                              </div>
                            )}
                            {round.duration_minutes && (
                              <div className="round-meta-item">
                                <strong>Duration:</strong> {round.duration_minutes} minutes
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Job Description */}
              <div className="job-detail-description-wrap mt-6">
                <h4 className="section-title flex items-center gap-2 font-bold text-base mb-3">
                  <Info size={20} className="text-blue-500" /> Role Description & Details
                </h4>
                <div className="job-detail-description p-4 bg-slate-500/5 dark:bg-zinc-800/20 rounded-xl border border-border-color/30 leading-relaxed text-sm">
                  {job.description || "No description provided."}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="job-detail-footer">
              {isAdmin ? (
                <button 
                  onClick={onClose}
                  className="job-action-btn primary px-8 py-3 text-xs shadow-lg"
                >
                  Close Details
                </button>
              ) : hasApplied ? (
                <div className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider cursor-default">
                  Applied ✓
                </div>
              ) : isEligible ? (
                <button 
                  onClick={() => {
                    if (onApply) onApply(job.id);
                    onClose();
                  }}
                  className="job-action-btn primary px-8 py-3 text-xs shadow-lg btn-sweep-glow"
                >
                  Apply for this Role <ArrowRight size={14} className="ml-1" />
                </button>
              ) : (
                <div className="px-6 py-2.5 rounded-xl font-bold text-xs bg-slate-500/5 text-secondary border border-slate-500/10 uppercase tracking-wider cursor-not-allowed">
                  Not Eligible
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default JobDetailsModal;
