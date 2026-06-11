import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Info,
  ListChecks
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const CHECK_LABELS = {
  profile_complete: 'Profile Information Completed',
  active_resume: 'Active Resume Available',
  cgpa: 'CGPA Requirement Met',
  attendance: 'Attendance Requirement Met',
  backlogs: 'Allowed Backlog Limit Met',
  branch: 'Course / Branch Eligible',
  category: 'Placement Category Eligible',
  skills: 'Required Skills Match',
  graduation_year: 'Graduation Batch Eligible',
  deadline: 'Before Application Deadline',
  job_active: 'Opportunity Posting Active',
  individual_selection: 'Individually Selected by Coordinator'
};

const JobCard = ({ job, eligibility, onApply }) => {
  const [showModal, setShowModal] = useState(false);
  const isEligible = eligibility?.eligible;
  const hasApplied = job.has_applied;
  const matchScore = (eligibility?.match_score * 100) || 0;

  const passingChecks = eligibility?.passing_checks || [];
  const failingChecks = eligibility?.failing_checks || [];

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowModal(false);
      }
    };
    if (showModal) {
      window.addEventListener('keydown', handleKeyDown);
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showModal]);

  return (
    <>
      <div 
        className="job-card card-tilt-perspective premium-3d-tilt-card cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="job-card-title">{job.role}</h3>
            <div className="flex items-center text-sm font-semibold mt-1">
              <Building2 size={16} className="mr-1.5 text-info" style={{ color: '#3b82f6' }} />
              {job.company_website ? (
                <a
                  href={job.company_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline font-bold"
                  style={{ color: '#3b82f6' }}
                  onClick={e => {
                    e.stopPropagation();
                  }}
                >
                  {job.company_name} <ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 2 }} />
                </a>
              ) : (
                <span className="text-secondary font-bold">{job.company_name}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {job.category && (
              <span className="category-badge">Cat {job.category}</span>
            )}
          </div>
        </div>

        <div className="job-meta-grid">
          <div className="job-meta-item">
            <MapPin size={15} className="meta-icon location" />
            <span className="meta-text">{job.location}</span>
          </div>
          
          <div className="job-meta-item">
            <IndianRupee size={15} className="meta-icon package text-emerald-500" style={{ color: '#10b981' }} />
            <span className="meta-text font-bold">
              {job.listing_type === 'internship' ? `₹${job.package} / mo` : `${job.package} LPA`}
            </span>
          </div>
          
          {job.listing_type === 'internship' ? (
            <div className="job-meta-item">
              <Clock size={15} className="meta-icon jobtype text-blue-500" style={{ color: '#3b82f6' }} />
              <span className="meta-text">Duration: {job.duration || 'N/A'}</span>
            </div>
          ) : (
            <div className="job-meta-item">
              <Briefcase size={15} className="meta-icon jobtype text-blue-500" style={{ color: '#3b82f6' }} />
              <span className="meta-text">{job.job_type}</span>
            </div>
          )}
          
          <div className="job-meta-item">
            <Clock size={15} className="meta-icon deadline text-amber-500" style={{ color: '#fbbf24' }} />
            <span className="meta-text">
              Deadline: <span className="deadline-date">{job.application_deadline ? format(new Date(job.application_deadline), 'MMM dd, yyyy') : 'No Deadline'}</span>
            </span>
          </div>
        </div>
        
        {!hasApplied && !isEligible && failingChecks.length > 0 && (
          <div className="mb-4 text-xs p-3 rounded-lg border bg-red-500/5 text-red-400 border-red-500/10">
            <strong className="text-red-500 font-bold">Not Eligible: </strong>
            {failingChecks[0].reason}
          </div>
        )}

        {hasApplied ? (
          <div className="w-full text-center py-2.5 rounded-xl font-bold text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider mt-auto cursor-default" onClick={e => e.stopPropagation()}>
            Applied ✓
          </div>
        ) : isEligible ? (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onApply(job.id);
            }}
            className="job-action-btn primary w-full text-center mt-auto btn-sweep-glow"
          >
            Apply Now <ArrowRight size={14} className="btn-arrow" />
          </button>
        ) : (
          <div className="w-full text-center py-2.5 rounded-xl font-bold text-xs bg-slate-500/5 text-secondary border border-slate-500/10 uppercase tracking-wider mt-auto cursor-not-allowed" onClick={e => e.stopPropagation()}>
            Not Eligible
          </div>
        )}
      </div>

      {/* Expanded Details Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            className="job-detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
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
                  onClick={() => setShowModal(false)}
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
                      {job.listing_type === 'internship' ? `₹${job.package} / mo` : `₹${job.package} LPA`}
                    </span>
                  </div>

                  <div className="job-detail-meta-card">
                    <div className="job-detail-meta-icon-box">
                      <MapPin size={18} className="text-rose-500" />
                    </div>
                    <span className="job-detail-meta-label">Location</span>
                    <span className="job-detail-meta-value">{job.location}</span>
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
                      {job.application_deadline ? format(new Date(job.application_deadline), 'MMM dd, yyyy') : 'No Deadline'}
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
                {/* Non-eligibility warning banner (only shown if not eligible and hasn't applied) */}
                {!hasApplied && !isEligible && failingChecks.length > 0 && (
                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-sm flex items-start gap-3">
                    <ShieldAlert size={18} className="mt-0.5 flex-shrink-0 text-red-500" />
                    <div>
                      <h4 className="font-bold text-red-500 m-0">Not Eligible to Apply</h4>
                      <p className="text-xs text-secondary mt-1 leading-relaxed">
                        {failingChecks[0].reason}
                      </p>
                    </div>
                  </div>
                )}

                {/* Selection rounds timeline */}
                {job.rounds && job.rounds.length > 0 && (
                  <div className="job-detail-rounds-section">
                    <h4 className="section-title">
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
                <div className="job-detail-description-wrap">
                  <h4 className="section-title">
                    <Info size={20} className="text-blue-500" /> Role Overview & Details
                  </h4>
                  <div className="job-detail-description p-4 bg-slate-500/5 rounded-xl border border-border-color/30">
                    {job.description || "No description provided."}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="job-detail-footer">
                {hasApplied ? (
                  <div className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider cursor-default">
                    Applied ✓
                  </div>
                ) : isEligible ? (
                  <button 
                    onClick={() => {
                      onApply(job.id);
                      setShowModal(false);
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
    </>
  );
};

export default JobCard;
