import React from 'react';
import { Check, X, Clock, Calendar, AlertCircle, Award, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

const RoundPipeline = ({ rounds, currentRound, status, appliedAt }) => {
  const currentStatus = status || 'applied';

  // Determine step states
  const getStepState = (stepKey) => {
    switch (stepKey) {
      case 'applied':
        return { isCompleted: true, isActive: currentStatus === 'applied' };
      
      case 'shortlisted': {
        const completedStatuses = ['shortlisted', 'interviewing', 'selected', 'accepted'];
        const isCompleted = completedStatuses.includes(currentStatus);
        const isActive = currentStatus === 'shortlisted';
        return { isCompleted, isActive };
      }
      
      case 'interviewing': {
        const completedStatuses = ['selected', 'accepted'];
        const isCompleted = completedStatuses.includes(currentStatus);
        const isActive = currentStatus === 'interviewing';
        return { isCompleted, isActive };
      }
      
      case 'outcome': {
        const isCompleted = ['selected', 'accepted', 'rejected', 'withdrawn'].includes(currentStatus);
        const isActive = isCompleted;
        const isFailed = currentStatus === 'rejected';
        const isWithdrawn = currentStatus === 'withdrawn';
        return { isCompleted, isActive, isFailed, isWithdrawn };
      }
      
      default:
        return { isCompleted: false, isActive: false };
    }
  };

  const showShortlisted = ['shortlisted', 'interviewing', 'selected', 'accepted'].includes(currentStatus) || (rounds && rounds.length > 0);
  const showInterviewing = ['interviewing', 'selected', 'accepted'].includes(currentStatus) || (rounds && rounds.length > 0);

  const steps = [
    {
      key: 'applied',
      label: 'Applied',
      defaultDesc: 'Application submitted',
      getDesc: () => appliedAt ? format(new Date(appliedAt), 'MMM dd, yyyy') : 'Submitted',
      icon: Clock,
    },
    ...(showShortlisted ? [{
      key: 'shortlisted',
      label: 'Shortlisted',
      defaultDesc: 'Profile matching',
      getDesc: () => {
        const state = getStepState('shortlisted');
        if (state.isCompleted) return 'Cleared review';
        if (state.isActive) return 'Under review';
        return 'Pending review';
      },
      icon: UserCheck,
    }] : []),
    ...(showInterviewing ? [{
      key: 'interviewing',
      label: 'Interviewing',
      defaultDesc: 'Rounds of interviews',
      getDesc: () => {
        const state = getStepState('interviewing');
        if (state.isCompleted) return 'Interviews cleared';
        if (state.isActive) {
          const activeRoundName = currentRound?.round_name || 'In progress';
          return `Active: ${activeRoundName}`;
        }
        return 'Pending interviews';
      },
      icon: Calendar,
    }] : []),
    {
      key: 'outcome',
      label: 'Outcome',
      defaultDesc: 'Final decision',
      getDesc: () => {
        if (currentStatus === 'selected' || currentStatus === 'accepted') return '🏆 Offer Received!';
        if (currentStatus === 'rejected') return '❌ Application Closed';
        if (currentStatus === 'withdrawn') return '⚪ Withdrawn';
        return 'Awaiting results';
      },
      icon: Award,
    }
  ];

  return (
    <div className="w-full my-8 bg-card border border-border-color rounded-2xl p-6 md:p-8 shadow-sm">
      {/* Desktop Horizontal Tracker */}
      <div className="hidden md:flex items-stretch justify-between relative">
        {/* Connecting line backgrounds */}
        <div className="absolute left-0 top-[22px] w-full h-[3px] bg-slate-100 dark:bg-zinc-800 -z-10 rounded-full"></div>
        
        {steps.map((step, idx) => {
          const state = getStepState(step.key);
          const nextState = idx < steps.length - 1 ? getStepState(steps[idx + 1].key) : null;
          const Icon = step.icon;

          // Connective line fill between this step and next
          let lineFillClass = 'w-0';
          if (nextState?.isCompleted) {
            lineFillClass = 'w-full bg-primary';
          } else if (state.isCompleted && nextState?.isActive) {
            lineFillClass = 'w-1/2 bg-gradient-to-r from-primary to-slate-200 dark:to-zinc-800 animate-pulse';
          }

          // Step Badge colors
          let badgeClass = 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-400';
          if (step.key === 'outcome' && state.isFailed) {
            badgeClass = 'bg-red-50 dark:bg-red-950/20 border-red-500 text-red-500 shadow-md shadow-red-500/10';
          } else if (step.key === 'outcome' && state.isWithdrawn) {
            badgeClass = 'bg-slate-100 dark:bg-zinc-800 border-slate-400 text-slate-500';
          } else if (state.isCompleted) {
            badgeClass = 'bg-primary text-white border-primary shadow-lg shadow-primary/20';
          } else if (state.isActive) {
            badgeClass = 'bg-primary/10 text-primary border-primary animate-pulse shadow-md shadow-primary/5';
          }

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center text-center relative px-2">
              {/* Connector line overlay segment */}
              {idx < steps.length - 1 && (
                <div className="absolute left-1/2 right-0 top-[22px] h-[3px] -z-10 bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${lineFillClass}`} style={{ backgroundColor: nextState?.isCompleted ? 'var(--accent-primary)' : '' }}></div>
                </div>
              )}
              {idx > 0 && (
                <div className="absolute right-1/2 left-0 top-[22px] h-[3px] -z-10 bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${state.isCompleted ? 'w-full bg-primary' : 'w-0'}`} style={{ backgroundColor: state.isCompleted ? 'var(--accent-primary)' : '' }}></div>
                </div>
              )}

              {/* Step Circle */}
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${badgeClass}`}
                   style={{ 
                     backgroundColor: state.isCompleted && !state.isFailed && !state.isWithdrawn ? 'var(--accent-primary)' : '',
                     borderColor: (state.isCompleted || state.isActive) && !state.isFailed && !state.isWithdrawn ? 'var(--accent-primary)' : ''
                   }}>
                {state.isCompleted && !state.isFailed && !state.isWithdrawn ? (
                  <Check size={18} strokeWidth={3} />
                ) : (
                  <Icon size={18} strokeWidth={2.5} />
                )}
              </div>

              {/* Step Labels */}
              <div className="mt-4 space-y-1">
                <h4 className={`text-sm font-bold transition-colors ${state.isActive ? 'text-primary' : 'text-primary-text'}`}
                    style={{ color: state.isActive ? 'var(--accent-primary)' : '' }}>
                  {step.label}
                </h4>
                <p className="text-xs text-secondary max-w-[150px] mx-auto font-medium">
                  {step.getDesc()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Vertical Tracker */}
      <div className="md:hidden flex flex-col gap-6 relative pl-4">
        {/* Timeline bar line */}
        <div className="absolute left-[33px] top-4 bottom-4 w-[2px] bg-slate-100 dark:bg-zinc-800 -z-10 rounded-full"></div>

        {steps.map((step, idx) => {
          const state = getStepState(step.key);
          const Icon = step.icon;

          // Step Badge colors
          let badgeClass = 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-400';
          if (step.key === 'outcome' && state.isFailed) {
            badgeClass = 'bg-red-50 dark:bg-red-950/20 border-red-500 text-red-500';
          } else if (step.key === 'outcome' && state.isWithdrawn) {
            badgeClass = 'bg-slate-100 dark:bg-zinc-800 border-slate-400 text-slate-500';
          } else if (state.isCompleted) {
            badgeClass = 'bg-primary text-white border-primary';
          } else if (state.isActive) {
            badgeClass = 'bg-primary/10 text-primary border-primary animate-pulse';
          }

          return (
            <div key={step.key} className="flex items-start gap-4">
              {/* Step Circle */}
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${badgeClass}`}
                   style={{ 
                     backgroundColor: state.isCompleted && !state.isFailed && !state.isWithdrawn ? 'var(--accent-primary)' : '',
                     borderColor: (state.isCompleted || state.isActive) && !state.isFailed && !state.isWithdrawn ? 'var(--accent-primary)' : ''
                   }}>
                {state.isCompleted && !state.isFailed && !state.isWithdrawn ? (
                  <Check size={16} strokeWidth={3} />
                ) : (
                  <Icon size={16} strokeWidth={2.5} />
                )}
              </div>

              {/* Step Labels */}
              <div className="space-y-0.5 pt-1.5">
                <h4 className={`text-sm font-bold ${state.isActive ? 'text-primary' : 'text-primary-text'}`}
                    style={{ color: state.isActive ? 'var(--accent-primary)' : '' }}>
                  {step.label}
                </h4>
                <p className="text-xs text-secondary font-medium">
                  {step.getDesc()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Specific Interview Rounds Details section */}
      {rounds && rounds.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border-color/50">
          <h4 className="text-xs font-black uppercase tracking-widest text-secondary mb-4">
            Interview Rounds Detail
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rounds.map((round) => {
              const rState = round.status;
              let statusLabel = 'Pending';
              let statusColor = 'bg-slate-100 text-slate-500 border-slate-200';
              if (rState === 'cleared') {
                statusLabel = 'Cleared ✓';
                statusColor = 'bg-success/10 text-success border-success/20';
              } else if (rState === 'failed') {
                statusLabel = 'Failed ✗';
                statusColor = 'bg-danger/10 text-danger border-danger/20';
              } else if (rState === 'scheduled') {
                statusLabel = 'Scheduled 📅';
                statusColor = 'bg-info/10 text-info border-info/20';
              }

              return (
                <div key={round.id} className="p-4 rounded-xl border border-border-color bg-card-hover/20">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-xs font-bold text-primary truncate max-w-[150px]">
                      {round.round_name}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-secondary font-medium">
                    <p>Round Number: {round.round_number}</p>
                    {round.scheduled_date && (
                      <p>Date: {format(new Date(round.scheduled_date), 'MMM dd, yyyy')}</p>
                    )}
                    {round.feedback && (
                      <p className="text-[11px] italic text-text-muted mt-2 border-t border-border-color/50 pt-2 line-clamp-2">
                        Feedback: "{round.feedback}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoundPipeline;
