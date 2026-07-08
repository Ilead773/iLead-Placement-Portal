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
import JobDetailsModal from './JobDetailsModal';

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
              Deadline: <span className="deadline-date">{job.application_deadline ? format(new Date(job.application_deadline), 'MMM dd, yyyy, h:mm a') : 'No Deadline'}</span>
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

      <JobDetailsModal
        showModal={showModal}
        onClose={() => setShowModal(false)}
        job={job}
        eligibility={eligibility}
        onApply={onApply}
      />
    </>
  );
};

export default JobCard;
