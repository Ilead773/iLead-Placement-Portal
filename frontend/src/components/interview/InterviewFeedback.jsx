// src/components/interview/InterviewFeedback.jsx
import React from 'react';

const parseSummary = (text) => {
  if (!text) return { summary: "", strength: "", improvement: "" };
  
  // Clean double asterisks if there are remaining standalone ones
  const cleanText = text;
  
  // Regex to extract sections
  const summaryRegex = /(?:\*\*Performance Summary:\*\*|Performance Summary:)\s*([\s\S]*?)(?=(?:\*\*Single Biggest Strength:\*\*|Single Biggest Strength:|\*\*Single Biggest Area for Improvement:\*\*|Single Biggest Area for Improvement:|$))/i;
  const strengthRegex = /(?:\*\*Single Biggest Strength:\*\*|Single Biggest Strength:)\s*([\s\S]*?)(?=(?:\*\*Single Biggest Area for Improvement:\*\*|Single Biggest Area for Improvement:|$))/i;
  const improvementRegex = /(?:\*\*Single Biggest Area for Improvement:\*\*|Single Biggest Area for Improvement:)\s*([\s\S]*?)$/i;
  
  const summaryMatch = cleanText.match(summaryRegex);
  const strengthMatch = cleanText.match(strengthRegex);
  const improvementMatch = cleanText.match(improvementRegex);
  
  let summary = summaryMatch ? summaryMatch[1].trim() : "";
  let strength = strengthMatch ? strengthMatch[1].trim() : "";
  let improvement = improvementMatch ? improvementMatch[1].trim() : "";
  
  // If parsing fails to find structural headings, return the entire block as summary
  if (!summary && !strength && !improvement) {
    summary = text;
  }
  
  return { summary, strength, improvement };
};

export default function InterviewFeedback({ feedback, onRetry, onBackToHistory }) {
  if (!feedback) return null;

  const parsedSummary = parseSummary(feedback.feedback_summary || "");

  const isPendingReview = feedback.total_score === null || feedback.total_score === undefined;

  const scoreColor = isPendingReview
    ? 'var(--warning)'
    : feedback.total_score >= 70
    ? 'var(--success)'
    : feedback.total_score >= 50
    ? 'var(--warning)'
    : 'var(--danger)';

  const scoreGrade = isPendingReview
    ? 'Pending Review'
    : feedback.total_score >= 85
    ? 'Excellent'
    : feedback.total_score >= 70
    ? 'Good'
    : feedback.total_score >= 55
    ? 'Average'
    : 'Needs Work';

  // 1. Calculations for Line Chart (X-axis: Q1-Q5, Y-axis: 0-100)
  const answers = feedback.answers || [];
  const numAnswers = answers.length;

  const getLineCoordinates = (key, scale = 1) => {
    const xPoints = [60, 165, 270, 375, 480];
    return answers
      .map((ans, idx) => {
        if (idx >= 5) return null;
        let score = 0;
        if (ans.eval_status === 'evaluated' && ans.evaluation_json) {
          if (key === 'overall') {
            score = ans.score || 0;
          } else {
            score = (ans.evaluation_json.dimensions?.[key]?.score || 0) * scale;
          }
        }
        const x = xPoints[idx];
        const y = 210 - (score / 100) * 170; // 210 is score 0, 40 is score 100
        return { x, y, score };
      })
      .filter(p => p !== null);
  };

  const lineDataOverall = getLineCoordinates('overall');
  const lineDataTech = getLineCoordinates('technical_accuracy', 10);
  const lineDataDepth = getLineCoordinates('depth', 10);

  const getPathD = (dataPoints) => {
    if (dataPoints.length === 0) return '';
    return dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  // 2. Calculations for Radar Chart
  const competencyData = Object.entries(feedback.competency_scores || {});
  const numCompetencies = competencyData.length;
  const radarCenter = 150;
  const radarMaxRadius = 90;

  const getRadarPoints = () => {
    return competencyData.map(([name, score], idx) => {
      const angle = (idx * 2 * Math.PI) / numCompetencies - Math.PI / 2;
      const radius = (score / 100) * radarMaxRadius;
      const x = radarCenter + radius * Math.cos(angle);
      const y = radarCenter + radius * Math.sin(angle);
      return { x, y, name, score };
    });
  };

  const radarPoints = getRadarPoints();
  const radarPointsStr = radarPoints.map(p => `${p.x},${p.y}`).join(' ');

  const getRadarGridPath = (level) => {
    const radius = level * radarMaxRadius;
    const points = Array.from({ length: numCompetencies }).map((_, idx) => {
      const angle = (idx * 2 * Math.PI) / numCompetencies - Math.PI / 2;
      const x = radarCenter + radius * Math.cos(angle);
      const y = radarCenter + radius * Math.sin(angle);
      return `${x},${y}`;
    });
    return points.join(' ');
  };

  return (
    <div className="interview-feedback-page" style={{ paddingBottom: '40px' }}>
      
      {/* Pending Manual Review Banner */}
      {isPendingReview && (
        <div className="pending-review-banner" style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid var(--warning)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          color: 'var(--warning)',
          fontWeight: '600',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <h4 style={{ margin: 0, color: 'var(--warning)', fontSize: '0.95rem' }}>Evaluation Pending Manual Review</h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
              Due to AI service unavailability, some or all of your responses could not be automatically scored.
              A placement coordinator has been notified and will review your answers manually.
            </p>
          </div>
        </div>
      )}

      {/* Score Hero */}
      <div className="feedback-hero" style={{ position: 'relative', overflow: 'hidden', padding: '30px 20px 24px' }}>
        <div className="feedback-score-ring" style={{ margin: '0 auto 12px' }}>
          <svg viewBox="0 0 120 120" className="score-svg">
            <circle cx="60" cy="60" r="52" className="score-track" />
            <circle
              cx="60" cy="60" r="52"
              className="score-fill"
              style={{
                strokeDasharray: isPendingReview ? '0 327' : `${(feedback.total_score / 100) * 327} 327`,
                stroke: scoreColor
              }}
            />
          </svg>
          <div className="score-center">
            {isPendingReview ? (
              <span className="score-number" style={{ fontSize: '1.8rem', color: 'var(--warning)' }}>PENDING</span>
            ) : (
              <span className="score-number">{Math.round(feedback.total_score)}</span>
            )}
            <span className="score-label">OVERALL</span>
          </div>
        </div>
        <div className="feedback-grade" style={{ color: scoreColor, letterSpacing: '0.5px', marginBottom: 0 }}>
          {scoreGrade}
        </div>
      </div>

      {/* Premium Executive Feedback Summary Cards */}
      {feedback.feedback_summary && (
        <div className="executive-summary-section">
          {/* Executive Performance Summary Card */}
          <div className="glass-summary-card performance-summary-card">
            <div className="summary-card-header">
              <span className="summary-card-icon">📋</span>
              <h3>Executive Performance Summary</h3>
            </div>
            <div className="summary-card-body">
              <p>{parsedSummary.summary || feedback.feedback_summary}</p>
            </div>
          </div>

          {/* Strengths & Improvements Double Grid */}
          {(parsedSummary.strength || parsedSummary.improvement) && (
            <div className="summary-double-grid">
              {parsedSummary.strength && (
                <div className="glass-summary-card strength-summary-card">
                  <div className="summary-card-header">
                    <span className="summary-card-icon success">✦</span>
                    <h3>Single Biggest Strength</h3>
                  </div>
                  <div className="summary-card-body">
                    <p>{parsedSummary.strength}</p>
                  </div>
                </div>
              )}

              {parsedSummary.improvement && (
                <div className="glass-summary-card improvement-summary-card">
                  <div className="summary-card-header">
                    <span className="summary-card-icon warning">⚠️</span>
                    <h3>Single Biggest Area for Improvement</h3>
                  </div>
                  <div className="summary-card-body">
                    <p>{parsedSummary.improvement}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!isPendingReview && (
        <>
          {/* Analytics Dashboard Grid */}
          <div className="analytics-section-title" style={{
            fontSize: '1.1rem',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--text-primary)',
            marginTop: '16px',
            marginBottom: '12px'
          }}>
            📊 Performance Analytics
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '24px',
            marginBottom: '24px'
          }}>
            
            {/* SVG Line Chart (Score Trend) */}
            <div className="feedback-section" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 className="feedback-section-title" style={{ fontSize: '0.9rem', marginBottom: '12px' }}>📈 Answer Score Trend</h3>
              <div style={{ width: '100%', height: '220px', position: 'relative' }}>
                <svg viewBox="0 0 520 230" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 100].map((gridVal) => {
                    const y = 210 - (gridVal / 100) * 170;
                    return (
                      <g key={gridVal}>
                        <line x1="50" y1={y} x2="500" y2={y} stroke="var(--border-light)" strokeWidth="1" strokeDasharray="4 4" />
                        <text x="40" y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">{gridVal}</text>
                      </g>
                    );
                  })}

                  {/* Lines */}
                  {lineDataTech.length > 1 && (
                    <path d={getPathD(lineDataTech)} fill="none" stroke="#10B981" strokeWidth="2.5" strokeDasharray="4 4" />
                  )}
                  {lineDataDepth.length > 1 && (
                    <path d={getPathD(lineDataDepth)} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="4 4" />
                  )}
                  {lineDataOverall.length > 1 && (
                    <path d={getPathD(lineDataOverall)} fill="none" stroke="var(--primary)" strokeWidth="3.5" />
                  )}

                  {/* Data Points overall */}
                  {lineDataOverall.map((p, idx) => (
                    <g key={idx}>
                      <circle cx={p.x} cy={p.y} r="5" fill="var(--primary)" stroke="var(--bg-card)" strokeWidth="2" />
                      <text x={p.x} y={p.y - 10} fill="var(--text-primary)" fontSize="10" fontWeight="bold" textAnchor="middle">
                        {p.score}
                      </text>
                    </g>
                  ))}

                  {/* X-axis Labels */}
                  {Array.from({ length: Math.min(5, numAnswers) }).map((_, idx) => (
                    <text key={idx} x={60 + idx * 105} y="228" fill="var(--text-secondary)" fontSize="11" fontWeight="600" textAnchor="middle">
                      Q{idx + 1}
                    </text>
                  ))}
                </svg>
              </div>
              
              {/* Legend */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
                fontSize: '0.8rem',
                fontWeight: '600',
                marginTop: '12px',
                color: 'var(--text-secondary)'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '3px', background: 'var(--primary)', borderRadius: '2px' }} /> Overall Score
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '3px', background: '#10B981', borderStyle: 'dashed', borderTop: '2px dashed #10B981' }} /> Technical Accuracy
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '3px', background: '#F59E0B', borderStyle: 'dashed', borderTop: '2px dashed #F59E0B' }} /> Depth
                </span>
              </div>
            </div>

            {/* SVG Radar Chart (Competency Profile) */}
            {numCompetencies >= 3 ? (
              <div className="feedback-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 className="feedback-section-title" style={{ fontSize: '0.9rem', alignSelf: 'flex-start', marginBottom: '12px' }}>🎯 Competency Profile</h3>
                <div style={{ width: '100%', height: '220px', display: 'flex', justifyContent: 'center' }}>
                  <svg viewBox="0 0 300 300" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    {/* Concentric rings */}
                    {[0.2, 0.4, 0.6, 0.8, 1.0].map((lvl, i) => (
                      <polygon
                        key={i}
                        points={getRadarGridPath(lvl)}
                        fill="none"
                        stroke="var(--border-light)"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Spokes */}
                    {competencyData.map(([_, score], idx) => {
                      const angle = (idx * 2 * Math.PI) / numCompetencies - Math.PI / 2;
                      const x = radarCenter + radarMaxRadius * Math.cos(angle);
                      const y = radarCenter + radarMaxRadius * Math.sin(angle);
                      return (
                        <line
                          key={idx}
                          x1={radarCenter}
                          y1={radarCenter}
                          x2={x}
                          y2={y}
                          stroke="var(--border-light)"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Shaded Area */}
                    {radarPoints.length > 2 && (
                      <polygon
                        points={radarPointsStr}
                        fill="rgba(99, 102, 241, 0.18)"
                        stroke="var(--primary)"
                        strokeWidth="2"
                      />
                    )}

                    {/* Data Dots & Value Labels */}
                    {radarPoints.map((p, idx) => (
                      <g key={idx}>
                        <circle cx={p.x} cy={p.y} r="4" fill="var(--primary)" />
                        <text
                          x={p.x}
                          y={p.y - 6}
                          fill="var(--text-primary)"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {Math.round(p.score)}%
                        </text>
                      </g>
                    ))}

                    {/* Competency Labels */}
                    {radarPoints.map((p, idx) => {
                      const angle = (idx * 2 * Math.PI) / numCompetencies - Math.PI / 2;
                      const labelDist = radarMaxRadius + 18;
                      const x = radarCenter + labelDist * Math.cos(angle);
                      const y = radarCenter + labelDist * Math.sin(angle);
                      
                      let textAnchor = 'middle';
                      if (Math.cos(angle) > 0.1) textAnchor = 'start';
                      else if (Math.cos(angle) < -0.1) textAnchor = 'end';

                      return (
                        <text
                          key={idx}
                          x={x}
                          y={y + 4}
                          fill="var(--text-secondary)"
                          fontSize="9.5"
                          fontWeight="600"
                          textAnchor={textAnchor}
                        >
                          {p.name.length > 22 ? p.name.substring(0, 20) + '...' : p.name}
                        </text>
                      );
                    })}
                  </svg>
                </div>
              </div>
            ) : (
              <div className="feedback-section" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <h3 className="feedback-section-title" style={{ fontSize: '0.9rem', alignSelf: 'flex-start', marginBottom: '12px' }}>🎯 Competency Scores</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', padding: '10px 0' }}>
                  {competencyData.map(([name, score]) => (
                    <div key={name}>
                      <div style={{ display: 'flex', justifyContent: 'between', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
                        <span style={{ color: 'var(--primary)', marginLeft: 'auto' }}>{Math.round(score)}%</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--border-light)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--primary)', width: `${score}%`, borderRadius: '4px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Two Dimension Average Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: '24px'
          }}>
            {feedback.dimension_averages && Object.entries(feedback.dimension_averages).map(([dim, data]) => {
              if (dim !== 'technical_accuracy' && dim !== 'depth') return null;
              const label = dim === 'technical_accuracy' ? 'Technical Accuracy' : 'Depth';
              const weightLabel = dim === 'technical_accuracy' ? '60% Weight' : '40% Weight';
              
              const barColor = data.score >= 7 ? 'var(--success)' : data.score >= 5 ? 'var(--warning)' : 'var(--danger)';
              const scorePct = (data.score / 10) * 100;

              return (
                <div key={dim} className="feedback-section" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'between', marginBottom: '8px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>{label}</h4>
                      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>{weightLabel}</span>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: '900', color: barColor }}>{Number(data.score).toFixed(1)}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/10</span>
                    </div>
                  </div>
                  <div style={{ height: '8px', background: 'var(--border-light)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div style={{ height: '100%', background: barColor, width: `${scorePct}%`, borderRadius: '4px', transition: 'width 1s ease' }} />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', fontStyle: 'italic' }}>
                    {data.feedback}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Side-by-side Strengths and Weaknesses */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '24px',
        marginBottom: '24px'
      }}>
        {/* Key Strengths */}
        {feedback.strengths && feedback.strengths.length > 0 && (
          <div className="feedback-section">
            <h3 className="feedback-section-title" style={{ color: 'var(--success)' }}>💪 Key Strengths</h3>
            <div className="feedback-items">
              {feedback.strengths.slice(0, 5).map((s, i) => (
                <div key={i} className="feedback-item strength-item">
                  <span className="feedback-item-icon">⭐</span>
                  <p>{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Growth Areas */}
        {feedback.weaknesses && feedback.weaknesses.length > 0 && (
          <div className="feedback-section">
            <h3 className="feedback-section-title" style={{ color: 'var(--warning)' }}>🚀 Growth Areas</h3>
            <div className="feedback-items">
              {feedback.weaknesses.slice(0, 5).map((w, i) => (
                <div key={i} className="feedback-item weakness-item">
                  <span className="feedback-item-icon">🎯</span>
                  <p>{w}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Question-by-Question Analysis */}
      {answers.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div className="analytics-section-title" style={{
            fontSize: '1.1rem',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--text-primary)',
            marginBottom: '16px'
          }}>
            📝 Question-by-Question Analysis
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {answers.map((ans, idx) => {
              const failedEval = ans.eval_status === 'failed';
              const evalJson = ans.evaluation_json || {};

              return (
                <div key={ans.id || idx} className="feedback-section" style={{ padding: '24px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'between',
                    alignItems: 'start',
                    borderBottom: '1px solid var(--border-light)',
                    paddingBottom: '12px',
                    marginBottom: '16px',
                    gap: '12px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        color: 'var(--primary)',
                        display: 'block',
                        marginBottom: '4px'
                      }}>
                        Question {ans.question_number}
                      </span>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {ans.question_text || `Question Detail`}
                      </h4>
                    </div>
                    <div>
                      {failedEval ? (
                        <span style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: 'var(--danger)',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          padding: '6px 10px',
                          borderRadius: '12px',
                          whiteSpace: 'nowrap'
                        }}>
                          PENDING REVIEW
                        </span>
                      ) : (
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            fontSize: '1.4rem',
                            fontWeight: '900',
                            color: ans.score >= 70 ? 'var(--success)' : ans.score >= 50 ? 'var(--warning)' : 'var(--danger)'
                          }}>
                            {ans.score}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>/100</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {failedEval ? (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px dashed var(--danger)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 16px',
                      fontSize: '0.85rem',
                      color: 'var(--danger)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>⚠️</span>
                      <span>Evaluation failed for this response due to AI unavailability. A coordinator will review and grade this answer manually.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      
                      {/* Side-by-side: what candidate answered vs ideal answer */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '16px'
                      }}>
                        <div style={{
                          background: 'var(--bg-input)',
                          padding: '14px 16px',
                          borderRadius: 'var(--radius-sm)',
                          borderLeft: '4px solid var(--border-color)'
                        }}>
                          <h5 style={{ margin: '0 0 6px 0', fontSize: '0.82rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                            👉 What you answered
                          </h5>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            {evalJson.what_candidate_answered || ans.answer_text}
                          </p>
                        </div>
                        
                        {evalJson.ideal_answer_summary && (
                          <div style={{
                            background: 'var(--bg-input)',
                            padding: '14px 16px',
                            borderRadius: 'var(--radius-sm)',
                            borderLeft: '4px solid var(--primary)'
                          }}>
                            <h5 style={{ margin: '0 0 6px 0', fontSize: '0.82rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)' }}>
                              💡 Ideal answer summary
                            </h5>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                              {evalJson.ideal_answer_summary}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Why you got this score box */}
                      {evalJson.score_explanation && (
                        <div style={{
                          background: 'rgba(245, 158, 11, 0.06)',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          padding: '14px 16px',
                          borderRadius: 'var(--radius-sm)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}>
                          <h5 style={{ margin: '0 0 6px 0', fontSize: '0.82rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            💡 Why you got this score
                          </h5>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            {evalJson.score_explanation}
                          </p>
                        </div>
                      )}

                      {/* Dimensions Breakdown per question */}
                      {evalJson.dimensions && (
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '12px',
                          borderTop: '1px solid var(--border-light)',
                          paddingTop: '12px',
                          fontSize: '0.78rem'
                        }}>
                          {Object.entries(evalJson.dimensions).map(([dim, dData]) => {
                            if (dim !== 'technical_accuracy' && dim !== 'depth') return null;
                            const dimLabel = dim === 'technical_accuracy' ? 'Technical Accuracy' : 'Depth';
                            const dimColor = dData.score >= 7 ? 'var(--success)' : dData.score >= 5 ? 'var(--warning)' : 'var(--danger)';
                            return (
                              <div key={dim} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-input)', padding: '4px 10px', borderRadius: '12px' }}>
                                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{dimLabel}:</span>
                                <span style={{ fontWeight: '800', color: dimColor }}>{dData.score}/10</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="feedback-actions" style={{ marginTop: '24px' }}>
        {onRetry && (
          <button className="btn btn-primary" onClick={onRetry}>
            🔄 Take Another Interview
          </button>
        )}
        {onBackToHistory && (
          <button className="btn btn-secondary" onClick={onBackToHistory}>
            📋 View History
          </button>
        )}
      </div>
    </div>
  );
}
