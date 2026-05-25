// src/components/ExternalJobCard.jsx
import React from 'react';
import { Bookmark, MapPin, Clock, ExternalLink, Briefcase, Zap } from 'lucide-react';
import api from '../api/axios';

const SOURCE_LABELS = {
  jsearch: 'JSearch', adzuna: 'Adzuna',
  greenhouse: 'Greenhouse', lever: 'Lever',
};

const SOURCE_COLORS = {
  jsearch: 'rgba(59,130,246,0.12)', adzuna: 'rgba(16,185,129,0.12)',
  greenhouse: 'rgba(249,115,22,0.12)', lever: 'rgba(168,85,247,0.12)',
};

export default function ExternalJobCard({ job, isSaved, onSaveToggle }) {
  const initials = (job.company_name || '?').slice(0, 2).toUpperCase();
  const freshness = job.days_old;
  const isFresh = freshness === 'Just now' || (freshness && freshness.endsWith('h ago'));

  return (
    <div className="ext-job-card" id={`ext-job-${job.id}`}>
      <div className="ext-job-card__top">
        <div className="ext-job-card__logo-wrap">
          {job.company_logo_url ? (
            <img src={job.company_logo_url} alt={job.company_name} className="ext-job-card__logo" loading="lazy" />
          ) : (
            <div className="ext-job-card__initials">{initials}</div>
          )}
        </div>
        <div className="ext-job-card__actions">
          <span className="ext-job-card__source" style={{ background: SOURCE_COLORS[job.source] || 'var(--bg-card-hover)' }}>
            via {SOURCE_LABELS[job.source] || job.source}
          </span>
          <button
            className={`ext-job-card__bookmark ${isSaved ? 'saved' : ''}`}
            onClick={(e) => { e.stopPropagation(); onSaveToggle(job.id, isSaved); }}
            title={isSaved ? 'Remove from saved' : 'Save this job'}
          >
            <Bookmark size={18} fill={isSaved ? 'var(--accent-primary)' : 'none'} stroke={isSaved ? 'var(--accent-primary)' : 'var(--text-muted)'} />
          </button>
        </div>
      </div>

      <h3 className="ext-job-card__title">{job.title}</h3>
      <p className="ext-job-card__company">{job.company_name}</p>

      <div className="ext-job-card__pills">
        <span className="ext-job-card__pill location">
          <MapPin size={12} /> {job.location || 'India'}
        </span>
        {job.is_remote && <span className="ext-job-card__pill remote">Remote</span>}
        <span className="ext-job-card__pill type">
          <Briefcase size={12} /> {job.job_type_display || job.job_type}
        </span>
      </div>

      <div className="ext-job-card__salary">
        {job.salary_display && job.salary_display !== 'Not disclosed' ? (
          <span className="ext-job-card__salary-value">₹ {job.salary_display}</span>
        ) : (
          <span className="ext-job-card__salary-na">Salary not disclosed</span>
        )}
      </div>

      <p className="ext-job-card__exp">
        <Clock size={12} /> Exp: {job.experience_required || 'Not specified'}
      </p>

      {job.required_skills && job.required_skills.length > 0 && (
        <div className="ext-job-card__skills">
          {job.required_skills.slice(0, 3).map((skill, i) => (
            <span key={i} className="ext-job-card__skill-pill">{skill}</span>
          ))}
          {job.required_skills.length > 3 && (
            <span className="ext-job-card__skill-pill more">+{job.required_skills.length - 3} more</span>
          )}
        </div>
      )}

      <div className="ext-job-card__footer">
        <div className="ext-job-card__freshness">
          {isFresh && <span className="ext-job-card__fresh-dot" />}
          <span>{freshness || 'Recent'}</span>
        </div>
        <button
          className="ext-job-card__apply-btn"
          onClick={async (e) => {
            e.stopPropagation();
            try {
              await api.post('/me/log-click/', {
                job_title: job.title,
                company_name: job.company_name,
                external_url: job.apply_url
              });
            } catch (err) {
              console.error('Failed to log outbound click:', err);
            }
            window.open(job.apply_url, '_blank', 'noopener,noreferrer');
          }}
        >
          Apply Now <ExternalLink size={14} />
        </button>
      </div>

      {job.quality_score >= 80 && (
        <div className="ext-job-card__quality-badge">
          <Zap size={12} /> Top Match
        </div>
      )}
    </div>
  );
}
