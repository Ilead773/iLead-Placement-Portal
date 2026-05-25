import React from 'react';
import { Building2, MapPin, Briefcase, IndianRupee, Clock, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const JobCard = ({ job, eligibility, onApply }) => {
  const isEligible = eligibility?.eligible;
  const hasApplied = job.has_applied;
  const matchScore = (eligibility?.match_score * 100) || 0;
  
  const scoreColor = matchScore >= 80 ? 'text-green-600' : matchScore >= 50 ? 'text-yellow-600' : 'text-red-500';

  return (
    <div className="card p-6 flex flex-col hover:border-accent-primary transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-primary">{job.role}</h3>
          <div className="flex items-center text-secondary mt-1">
            <Building2 size={16} className="mr-1.5" />
            {job.company_website ? (
              <a
                href={job.company_website}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:underline"
                style={{ color: 'var(--accent-primary)' }}
                onClick={e => e.stopPropagation()}
              >
                {job.company_name} <ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 2 }} />
              </a>
            ) : (
              <span className="font-medium">{job.company_name}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-lg font-bold ${scoreColor}`}>{matchScore.toFixed(0)}% Match</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center text-sm text-secondary">
          <MapPin size={14} className="mr-2 text-muted" />
          {job.location}
        </div>
        <div className="flex items-center text-sm text-secondary">
          <IndianRupee size={14} className="mr-2 text-muted" />
          {job.package} LPA
        </div>
        <div className="flex items-center text-sm text-secondary">
          <Briefcase size={14} className="mr-2 text-muted" />
          {job.job_type}
        </div>
        <div className="flex items-center text-sm text-secondary">
          <Clock size={14} className="mr-2 text-muted" />
          {job.application_deadline ? format(new Date(job.application_deadline), 'MMM dd, yyyy') : 'No Deadline'}
        </div>
      </div>
      
      {!hasApplied && !isEligible && eligibility?.failing_checks?.length > 0 && (
        <div className="mb-4 text-xs alert alert-error py-2">
          <strong>Not Eligible: </strong>
          {eligibility.failing_checks[0].reason}
        </div>
      )}

      <button 
        onClick={() => onApply(job.id)}
        disabled={hasApplied || !isEligible}
        className={`w-full btn mt-auto ${
          hasApplied 
            ? 'btn-secondary text-success font-semibold opacity-80 cursor-not-allowed'
            : isEligible 
              ? 'btn-primary' 
              : 'btn-secondary opacity-50 cursor-not-allowed'
        }`}
      >
        {hasApplied ? 'Applied ✓' : isEligible ? 'Apply Now' : 'Not Eligible'}
      </button>
    </div>
  );
};
export default JobCard;
