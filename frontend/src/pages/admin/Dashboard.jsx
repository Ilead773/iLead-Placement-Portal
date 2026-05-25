// src/pages/admin/Dashboard.jsx  — Comprehensive Placement Analytics Dashboard
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import {
  TrendingUp, Users, Building, Briefcase, Award, DollarSign,
  CheckCircle, AlertCircle, XCircle, Clock, BarChart2, PieChart,
  Calendar, MapPin, Star, ArrowUp, ArrowDown, Filter, Download,
  RefreshCw, Target, Zap, Activity, GraduationCap, BookOpen,
  UserCheck, UserX, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Info
} from 'lucide-react';

// ─── Colour Palette ───────────────────────────────────────────────
const COLORS = {
  accent:  '#2563eb',
  success: '#10b981',
  warning: '#f59e0b',
  danger:  '#ef4444',
  info:    '#3b82f6',
  purple:  '#8b5cf6',
  pink:    '#ec4899',
  teal:    '#14b8a6',
  slate:   '#64748b',
};
const PALETTE = Object.values(COLORS);

// ─── Mini Reusable Components ─────────────────────────────────────

function KPICard({ title, value, subtitle, icon: Icon, color = COLORS.accent, trend, small }) {
  return (
    <div className="card group hover-lift" style={{
      padding: small ? '16px' : '20px',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      gap: '12px', transition: 'all 0.3s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
          {title}
        </span>
        <span style={{ background: color + '18', color, padding: '6px', borderRadius: 'var(--radius-sm)', display: 'flex' }}>
          {Icon && <Icon size={16} />}
        </span>
      </div>
      <div>
        <div style={{ fontSize: small ? '1.6rem' : '2rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 4, fontWeight: 600 }}>
            {subtitle}
          </div>
        )}
      </div>
      {trend != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 700 }}>
          {trend >= 0
            ? <ArrowUp size={12} color={COLORS.success} />
            : <ArrowDown size={12} color={COLORS.danger} />}
          <span style={{ color: trend >= 0 ? COLORS.success : COLORS.danger }}>{Math.abs(trend)}%</span>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color = COLORS.accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border-light)' }}>
      <span style={{ background: color + '18', color, padding: 6, borderRadius: 8, display: 'flex' }}>
        <Icon size={15} />
      </span>
      <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-primary)' }}>
        {title}
      </h3>
    </div>
  );
}

function ChartCard({ title, icon, color, children, span }) {
  return (
    <div className="card" style={{
      padding: 20, borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)',
      gridColumn: span ? `span ${span}` : undefined,
    }}>
      <SectionHeader icon={icon} title={title} color={color} />
      {children}
    </div>
  );
}

// ─── SVG Bar Chart ────────────────────────────────────────────────
function BarChart({ data, keyField, valueField, colorFn, unit = '', height = 160 }) {
  if (!data || data.length === 0) return <EmptyState />;
  const max = Math.max(...data.map(d => d[valueField]), 1);
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height, width: '100%' }}>
      {data.map((item, i) => {
        const pct = (item[valueField] / max) * 100;
        const col = colorFn ? colorFn(item, i) : PALETTE[i % PALETTE.length];
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {item[valueField]}{unit}
            </span>
            <div style={{ width: '100%', position: 'relative', borderRadius: 4, overflow: 'hidden', background: 'var(--border-light)', height: `${Math.max(pct, 2)}%`, minHeight: 4 }}>
              <div style={{ position: 'absolute', inset: 0, background: col, borderRadius: 4, transition: 'height 0.8s ease' }} />
            </div>
            <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 48, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item[keyField]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── SVG Donut Chart ─────────────────────────────────────────────
function DonutChart({ data, size = 140 }) {
  const entries = Object.entries(data || {}).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return <EmptyState />;

  const r = 44, cx = 55, cy = 55, stroke = 14;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox="0 0 110 110" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-light)" strokeWidth={stroke} />
        {entries.map(([key, val], i) => {
          const pct = val / total;
          const dash = pct * circ;
          const seg = (
            <circle
              key={key}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="round"
            />
          );
          offset += dash;
          return seg;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="900" fill="var(--text-primary)">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fontWeight="700" fill="var(--text-muted)">TOTAL</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
        {entries.map(([key, val], i) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600, flex: 1 }}>{key}</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{val}</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>({((val / total) * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Horizontal Progress Bar ──────────────────────────────────────
function ProgressBar({ label, value, max, color, suffix = '' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)' }}>{value}{suffix}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'var(--border-light)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: color, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

// ─── Line Sparkline ───────────────────────────────────────────────
function Sparkline({ data, color = COLORS.accent, height = 60, keyF = 'month', valueF = 'placed_count' }) {
  const gradId = useMemo(() => `sg-${Math.random().toString(36).substring(2, 11)}`, []);
  if (!data || data.length < 2) return <EmptyState />;
  const W = 400, H = height;
  const vals = data.map(d => d[valueF]);
  const maxV = Math.max(...vals, 1);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - (d[valueF] / maxV) * (H - 10) - 5;
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${path} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradId})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.5" fill="var(--bg-card)" stroke={color} strokeWidth="2" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {data.map((d, i) => (
          <span key={i} style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 700 }}>
            {d[keyF]?.split(' ')[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>No data available</div>;
}

function StatRow({ label, value, color, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: color || 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function DetailMiniCard({ title, value, icon: Icon, color = COLORS.accent, percentage, percentageColor }) {
  return (
    <div className="card group hover-lift animate-in" style={{
      padding: '16px 20px',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)',
      background: 'var(--bg-card)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '12px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden',
      height: '100%',
      minHeight: 110,
    }}>
      {/* Dynamic top highlight strip */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: color,
        opacity: 0.85
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-secondary)',
          lineHeight: 1.3
        }}>
          {title}
        </span>
        <span style={{
          background: color + '14',
          color: color,
          padding: '6px',
          borderRadius: '8px',
          display: 'flex',
          flexShrink: 0
        }}>
          {Icon && <Icon size={14} />}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
        <div style={{
          fontSize: '1.4rem',
          fontWeight: 900,
          color: 'var(--text-primary)',
          lineHeight: 1.1
        }}>
          {value}
        </div>

        {percentage !== undefined && percentage !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              flex: 1,
              height: 5,
              background: 'var(--border-light)',
              borderRadius: 99,
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(Math.max(parseFloat(percentage), 0), 100)}%`,
                background: percentageColor || color,
                borderRadius: 99,
                transition: 'width 1s ease-out'
              }} />
            </div>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              color: percentageColor || color,
              minWidth: 32,
              textAlign: 'right'
            }}>
              {parseFloat(percentage).toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab Definitions ──────────────────────────────────────────────
const TABS = [
  { id: 'overview',    label: 'Overview',     icon: BarChart2 },
  { id: 'status',      label: 'Status',       icon: Activity },
  { id: 'companies',   label: 'Companies',    icon: Building },
  { id: 'salary',      label: 'Salary',       icon: DollarSign },
  { id: 'courses',     label: 'Courses',      icon: GraduationCap },
  { id: 'students',    label: 'Students',     icon: Users },
  { id: 'eligibility', label: 'Eligibility',  icon: CheckCircle },
];

// ─── Main Dashboard Component ─────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({
    overview: false,
    status: false,
    companies: false,
    salary: false,
    courses: false,
    students: false,
    eligibility: false
  });
  const [refreshing, setRefreshing] = useState(false);

  const toggleSection = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/stats/', { params: { _t: Date.now() } });
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleRefresh = () => { setRefreshing(true); fetchStats(); };

  const handleExport = async () => {
    try {
      const { data } = await api.get('/dashboard/reports/');
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = data.filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
      <div className="spinner" />
      <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem' }}>Loading Analytics…</span>
    </div>
  );

  const s = stats || {};
  const ov = s.overview || {};
  const sal = s.salary_analysis || {};
  const status = s.status_metrics || {};
  const ca = s.company_analysis || {};
  const eli = s.eligibility || {};
  const ir = s.interview_rounds || {};
  const tt = s.timeline_trends || {};
  const dem = s.student_demographics || {};
  const jd = s.job_distribution || {};
  const cp = s.course_performance || [];

  return (
    <div className="dash-page animate-in" style={{ paddingBottom: 48 }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16, marginBottom: 24,
        paddingBottom: 20, borderBottom: '1px solid var(--border-color)'
      }}>
        <div>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent-primary)' }}>
            Admin Command Center
          </span>
          <h1 style={{
            margin: '4px 0 0', fontSize: '2rem', fontWeight: 900,
            background: 'linear-gradient(95deg, var(--text-primary) 30%, var(--accent-primary) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Placement Analytics Dashboard
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Real-time KPIs • 10 metric categories • {ov.total_students || 0} students tracked
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleRefresh} disabled={refreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10 }}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button onClick={handleExport}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10 }}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION: OVERVIEW                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, var(--bg-card) 0%, var(--bg-card-hover) 100%)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 24px',
          marginTop: 24,
          marginBottom: 16,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span 
            style={{ 
              background: 'var(--accent-soft)', 
              color: 'var(--accent-primary-dark)', 
              padding: 10, 
              borderRadius: 'var(--radius-md)', 
              display: 'flex' 
            }}
          >
            <BarChart2 size={20} />
          </span>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
            Placement Overview
          </h2>
        </div>
        <button 
          onClick={() => toggleSection('overview')}
          title={expanded.overview ? "Collapse Details" : "Expand Details"}
          style={{
            background: expanded.overview ? 'var(--accent-gradient)' : 'var(--bg-card-hover)',
            border: expanded.overview ? 'none' : '1px solid var(--border-color)',
            color: expanded.overview ? '#fff' : 'var(--text-primary)',
            borderRadius: 'var(--radius-sm)',
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: expanded.overview ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none',
            outline: 'none'
          }}
          className="hover-lift"
        >
          {expanded.overview ? <ChevronUp size={20} /> : <ChevronDown size={20} style={{ strokeWidth: 3 }} />}
        </button>
      </div>

      {/* First Row Statistics (Always Visible) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <KPICard title="Total Students" value={ov.total_students ?? 0} icon={Users} color={COLORS.info} subtitle="Registered" />
        <KPICard title="Total Placed" value={ov.placed_students ?? 0} icon={CheckCircle} color={COLORS.success} subtitle={`${ov.placement_rate ?? 0}% placement rate`} />
        <KPICard title="Avg Package" value={`₹${sal.avg_package ?? 0}`} icon={DollarSign} color={COLORS.warning} subtitle="LPA" />
        <KPICard title="Highest Package" value={`₹${sal.highest_package ?? 0}`} icon={Award} color={COLORS.purple} subtitle="LPA" />
        <KPICard title="Companies" value={ca.total_companies ?? ov.total_companies ?? 0} icon={Building} color={COLORS.teal} subtitle="Active recruiters" />
        <KPICard title="Applications" value={ov.total_applications ?? 0} icon={Briefcase} color={COLORS.pink} subtitle="Total submitted" />
      </div>

      {/* Overview Expanded Details */}
      {expanded.overview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginTop: 20 }} className="animate-in">
          {/* 1. At-A-Glance Activity & Performance Grid */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ background: COLORS.accent + '18', color: COLORS.accent, padding: 6, borderRadius: 8, display: 'flex' }}>
                <Activity size={15} />
              </span>
              <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-primary)' }}>
                Institute Activity & Performance At A Glance (Historical Data)
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <KPICard title="Total Companies" value={ov.total_companies ?? 0} icon={Building} color={COLORS.info} subtitle="Recruiting" small />
              <KPICard title="Total Jobs" value={ov.total_jobs ?? 0} icon={Briefcase} color={COLORS.purple} subtitle="Job postings" small />
              <KPICard title="Total Openings" value={ov.total_openings ?? 0} icon={Target} color={COLORS.pink} subtitle="Available roles" small />
              <KPICard title="Placed Candidates" value={ov.placed_students ?? 0} icon={UserCheck} color={COLORS.success} subtitle="Unique learners" small />
              <KPICard title="On-Campus Placed" value={ov.placed_on_campus ?? 0} icon={CheckCircle} color={COLORS.teal} subtitle="Internal drives" small />
              <KPICard title="Off-Campus Placed" value={ov.placed_off_campus ?? 0} icon={TrendingUp} color={COLORS.purple} subtitle="External links" small />
              <KPICard title="Total Not Placed" value={ov.total_not_placed ?? 0} icon={UserX} color={COLORS.danger} subtitle="Eligible & pending" small />
              
              <div className="card" style={{
                padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px', background: 'var(--bg-card-light)'
              }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                  Job Status Split
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700 }}>
                    <span style={{ color: COLORS.success }}>Active:</span>
                    <span style={{ fontWeight: 800 }}>{ov.jobs_active ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700 }}>
                    <span style={{ color: COLORS.info }}>Complete:</span>
                    <span style={{ fontWeight: 800 }}>{ov.jobs_complete ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700 }}>
                    <span style={{ color: COLORS.warning }}>On Hold:</span>
                    <span style={{ fontWeight: 800 }}>{ov.jobs_on_hold ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Placement Overview & Recruitment Funnel */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr', gap: 20 }}>
            {/* Detailed Placement KPIs Grid */}
            <div className="card" style={{ padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              <SectionHeader icon={TrendingUp} title="Placement Overview Detail" color={COLORS.accent} />
              {(() => {
                const po = s.placement_overview || {};
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                    <DetailMiniCard title="Total Students" value={po.total_students ?? 0} icon={Users} color={COLORS.info} />
                    <DetailMiniCard 
                      title="Unique Learners Applying" 
                      value={po.unique_learners_applying ?? 0} 
                      icon={UserCheck} 
                      color={COLORS.accent} 
                      percentage={po.total_students ? ((po.unique_learners_applying / po.total_students) * 100) : 0}
                    />
                    <DetailMiniCard 
                      title="Learners Not Applying" 
                      value={po.learners_not_applying ?? 0} 
                      icon={UserX} 
                      color={COLORS.warning} 
                      percentage={po.total_students ? ((po.learners_not_applying / po.total_students) * 100) : 0}
                    />
                    <DetailMiniCard 
                      title="Placed Learners" 
                      value={po.placed_learners ?? 0} 
                      icon={CheckCircle} 
                      color={COLORS.success} 
                      percentage={po.placed_learners_pct}
                    />
                    <DetailMiniCard 
                      title="Total On-Campus Placed" 
                      value={po.placed_on_campus ?? 0} 
                      icon={Building} 
                      color={COLORS.teal} 
                      percentage={po.placed_on_campus_pct}
                    />
                    <DetailMiniCard 
                      title="Total Off-Campus Placed" 
                      value={po.placed_off_campus ?? 0} 
                      icon={TrendingUp} 
                      color={COLORS.purple} 
                      percentage={po.placed_off_campus_pct}
                    />
                    <DetailMiniCard 
                      title="Learners Not Placed" 
                      value={po.learners_not_placed ?? 0} 
                      icon={AlertCircle} 
                      color={COLORS.danger} 
                      percentage={po.learners_not_placed_pct}
                    />
                    <DetailMiniCard 
                      title="Placement Rate" 
                      value={`${po.placed_learners_pct ?? 0}%`} 
                      icon={Award} 
                      color={COLORS.success} 
                      percentage={po.placed_learners_pct}
                    />
                    <DetailMiniCard title="Total Offers Received" value={po.total_offers_received ?? 0} icon={Briefcase} color={COLORS.purple} />
                    <DetailMiniCard 
                      title="Offer Letters Uploaded" 
                      value={po.offer_letters_uploaded ?? 0} 
                      icon={Download} 
                      color={COLORS.success} 
                      percentage={po.total_offers_received ? ((po.offer_letters_uploaded / po.total_offers_received) * 100) : 0}
                    />
                    <DetailMiniCard 
                      title="Offer Letters Not Uploaded" 
                      value={po.offer_letters_not_uploaded ?? 0} 
                      icon={Clock} 
                      color={COLORS.danger} 
                      percentage={po.total_offers_received ? ((po.offer_letters_not_uploaded / po.total_offers_received) * 100) : 0}
                    />
                  </div>
                );
              })()}
            </div>

            {/* Recruitment Pipeline Funnel */}
            <ChartCard title="Recruitment Status Funnel" icon={PieChart} color={COLORS.info}>
              {(() => {
                const fb = s.funnel_breakdown || {};
                const totalApps = fb.total_applications || 1;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <ProgressBar label="Shortlisted" value={fb.shortlist ?? 0} max={totalApps} color={COLORS.info} suffix=" Apps" />
                    <ProgressBar label="In Interview" value={fb.in_interview ?? 0} max={totalApps} color={COLORS.warning} suffix=" Apps" />
                    <ProgressBar label="Offered" value={fb.offered ?? 0} max={totalApps} color={COLORS.purple} suffix=" Apps" />
                    <ProgressBar label="Joined" value={fb.joined ?? 0} max={totalApps} color={COLORS.success} suffix=" Apps" />
                    <ProgressBar label="On Hold" value={fb.on_hold ?? 0} max={totalApps} color={COLORS.slate} suffix=" Apps" />
                    <ProgressBar label="Rejected" value={fb.rejected ?? 0} max={totalApps} color={COLORS.danger} suffix=" Apps" />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 8, background: 'var(--bg-card-light)', border: '1px solid var(--border-light)', marginTop: 8 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>Total Applications Funnel</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 900, color: COLORS.accent }}>{fb.total_applications ?? 0} Applications</span>
                    </div>
                  </div>
                );
              })()}
            </ChartCard>
          </div>

          {/* 3. Job Application & Student Participation Funnel */}
          <div className="card" style={{ padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <SectionHeader icon={Activity} title="Job Application & Student Participation Funnel" color={COLORS.purple} />
            {(() => {
              const pm = s.participation_metrics || {};
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  <DetailMiniCard title="Total Applications" value={pm.total_applications_submitted ?? 0} icon={Briefcase} color={COLORS.info} />
                  <DetailMiniCard title="Avg Applications per Learner" value={pm.avg_applications_per_learner ?? 0} icon={Activity} color={COLORS.info} />
                  <DetailMiniCard 
                    title="Application To Shortlist Ratio" 
                    value={`${pm.application_to_shortlist_ratio ?? 0}%`} 
                    icon={CheckCircle} 
                    color={COLORS.success} 
                    percentage={pm.application_to_shortlist_ratio}
                  />
                  <DetailMiniCard 
                    title="Application To Interview Ratio" 
                    value={`${pm.application_to_interview_ratio ?? 0}%`} 
                    icon={Users} 
                    color={COLORS.warning} 
                    percentage={pm.application_to_interview_ratio}
                  />
                  <DetailMiniCard 
                    title="Offer Success Rate" 
                    value={`${pm.offers_candidates_pct ?? 0}%`} 
                    icon={Award} 
                    color={COLORS.purple} 
                    percentage={pm.offers_candidates_pct}
                  />
                  <DetailMiniCard 
                    title="Students With No Applications" 
                    value={pm.students_with_no_applications ?? 0} 
                    icon={UserX} 
                    color={COLORS.danger} 
                    percentage={pm.students_with_no_applications_pct}
                  />
                </div>
              );
            })()}
          </div>

          {/* 4. Salary Overview Panel */}
          <div>
            {/* Learner Salary Stats */}
            <div className="card" style={{ padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              <SectionHeader icon={DollarSign} title="Salary Overview (Learner CTC)" color={COLORS.success} />
              {(() => {
                const formatSalaryLPA = (val) => {
                  if (val == null || isNaN(val)) return '—';
                  const valF = parseFloat(val);
                  if (valF === 0) return '—';
                  if (valF < 0.1) {
                    return `${Math.round(valF * 100)}k`;
                  }
                  return `${valF} LPA`;
                };
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <DetailMiniCard title="Avg CTC Offered" value={formatSalaryLPA(sal.avg_package)} icon={DollarSign} color={COLORS.accent} />
                    <DetailMiniCard title="Median CTC Offered" value={formatSalaryLPA(sal.median_package)} icon={TrendingUp} color={COLORS.success} />
                    <DetailMiniCard title="Min CTC Offered" value={formatSalaryLPA(sal.lowest_package)} icon={ArrowDown} color={COLORS.danger} />
                    <DetailMiniCard title="Max CTC Offered" value={formatSalaryLPA(sal.highest_package)} icon={Award} color={COLORS.purple} />
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Core Monthly Trends & Original Distribution Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
            {/* Monthly Trend Sparkline */}
            <ChartCard title="Monthly Placements Trend" icon={Calendar} color={COLORS.info}>
              <div style={{ marginTop: 10 }}>
                <Sparkline data={tt.monthly_placements} color={COLORS.accent} height={90} />
              </div>
            </ChartCard>

            {/* Circular Gauge */}
            <ChartCard title="Overall Performance Status" icon={Award} color={COLORS.purple}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ position: 'relative', width: 120, height: 120 }}>
                  <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={60} cy={60} r={50} fill="none" stroke="var(--border-light)" strokeWidth={12} />
                    <circle cx={60} cy={60} r={50} fill="none" stroke="url(#gGrad)" strokeWidth={12} strokeDasharray={314} strokeDashoffset={314 - (314 * (ov.placement_rate ?? 0)) / 100} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                    <defs>
                      <linearGradient id="gGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#dc2626" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{ov.placement_rate ?? 0}%</div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PLACED</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Eligible Base:</span>
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)' }}>{ov.total_students ?? 0} Students</span>
                </div>
              </div>
            </ChartCard>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION: STATUS                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, var(--bg-card) 0%, var(--bg-card-hover) 100%)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 24px',
          marginTop: 36,
          marginBottom: 16,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span 
            style={{ 
              background: 'var(--accent-soft)', 
              color: 'var(--accent-primary-dark)', 
              padding: 10, 
              borderRadius: 'var(--radius-md)', 
              display: 'flex' 
            }}
          >
            <Activity size={20} />
          </span>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
            Application Status
          </h2>
        </div>
        <button 
          onClick={() => toggleSection('status')}
          title={expanded.status ? "Collapse Details" : "Expand Details"}
          style={{
            background: expanded.status ? 'var(--accent-gradient)' : 'var(--bg-card-hover)',
            border: expanded.status ? 'none' : '1px solid var(--border-color)',
            color: expanded.status ? '#fff' : 'var(--text-primary)',
            borderRadius: 'var(--radius-sm)',
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: expanded.status ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none',
            outline: 'none'
          }}
          className="hover-lift"
        >
          {expanded.status ? <ChevronUp size={20} /> : <ChevronDown size={20} style={{ strokeWidth: 3 }} />}
        </button>
      </div>

      {/* Status First Row Statistics (Always Visible) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <KPICard title="Applied Count"    value={status.applied_count ?? 0}   icon={Briefcase}  color={COLORS.info} />
        <KPICard title="In Interview"     value={status.in_interview ?? 0}    icon={Activity}   color={COLORS.warning} />
        <KPICard title="Offer Received"   value={status.offer_received ?? 0}  icon={Star}       color={COLORS.purple} />
        <KPICard title="Offer Accepted"   value={status.offer_accepted ?? 0}  icon={CheckCircle} color={COLORS.success} />
        <KPICard title="Rejected Count"   value={status.rejected_count ?? 0}  icon={XCircle}    color={COLORS.danger} />
        <KPICard title="Pending Decision" value={status.pending_decision ?? 0} icon={Clock}     color={COLORS.slate} />
        <KPICard title="Not Applied"      value={status.not_applied ?? 0}     icon={UserX}      color={COLORS.danger} />
      </div>

      {/* Status Expanded Details */}
      {expanded.status && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 20 }} className="animate-in">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <ChartCard title="Application Pipeline" icon={Activity} color={COLORS.accent}>
              {[
                { label: 'Applied',          value: status.applied_count ?? 0,   color: COLORS.info },
                { label: 'In Interview',     value: status.in_interview ?? 0,    color: COLORS.warning },
                { label: 'Offer Received',   value: status.offer_received ?? 0,  color: COLORS.purple },
                { label: 'Offer Accepted',   value: status.offer_accepted ?? 0,  color: COLORS.success },
                { label: 'Rejected',         value: status.rejected_count ?? 0,  color: COLORS.danger },
                { label: 'Not Applied',      value: status.not_applied ?? 0,     color: COLORS.slate },
              ].map(row => (
                <ProgressBar key={row.label} label={row.label} value={row.value}
                  max={ov.total_students || 1} color={row.color} />
              ))}
            </ChartCard>

            <ChartCard title="Status Distribution (Jobs)" icon={PieChart} color={COLORS.info}>
              <DonutChart data={s.application_status?.application_status} />
            </ChartCard>
          </div>

          <ChartCard title="Placement Assignment Status" icon={PieChart} color={COLORS.teal}>
            <DonutChart data={s.application_status?.placement_status} />
          </ChartCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION: COMPANIES                                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, var(--bg-card) 0%, var(--bg-card-hover) 100%)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 24px',
          marginTop: 36,
          marginBottom: 16,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span 
            style={{ 
              background: 'var(--accent-soft)', 
              color: 'var(--accent-primary-dark)', 
              padding: 10, 
              borderRadius: 'var(--radius-md)', 
              display: 'flex' 
            }}
          >
            <Building size={20} />
          </span>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
            Companies Analytics
          </h2>
        </div>
        <button 
          onClick={() => toggleSection('companies')}
          title={expanded.companies ? "Collapse Details" : "Expand Details"}
          style={{
            background: expanded.companies ? 'var(--accent-gradient)' : 'var(--bg-card-hover)',
            border: expanded.companies ? 'none' : '1px solid var(--border-color)',
            color: expanded.companies ? '#fff' : 'var(--text-primary)',
            borderRadius: 'var(--radius-sm)',
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: expanded.companies ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none',
            outline: 'none'
          }}
          className="hover-lift"
        >
          {expanded.companies ? <ChevronUp size={20} /> : <ChevronDown size={20} style={{ strokeWidth: 3 }} />}
        </button>
      </div>

      {/* Companies First Row Statistics (Always Visible) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <KPICard title="Total Companies"      value={ca.total_companies ?? 0}                          icon={Building}  color={COLORS.teal} />
        <KPICard title="Top Company"          value={ca.top_company?.company_name || '—'}              icon={Star}      color={COLORS.accent} subtitle={`${ca.top_company?.placed_count ?? 0} placed`} />
        <KPICard title="Top Company Count"    value={ca.top_company?.placed_count ?? 0}               icon={Users}     color={COLORS.success} subtitle="Students placed" />
        <KPICard title="Highest Paying"       value={ca.highest_paying_company?.company_name || '—'}  icon={Award}     color={COLORS.purple} subtitle={`₹${ca.highest_paying_company?.max_package ?? 0} LPA`} />
      </div>

      {/* Companies Expanded Details */}
      {expanded.companies && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 20 }} className="animate-in">
          {/* Company Rankings by Placements */}
          <ChartCard title="Company Rankings by Placements" icon={BarChart2} color={COLORS.accent}>
            <BarChart
              data={(ca.top_companies_by_count || []).map(c => ({ name: c.company_name.split(' ')[0], count: c.placed_count }))}
              keyField="name" valueField="count"
              colorFn={(_, i) => PALETTE[i % PALETTE.length]}
            />
          </ChartCard>

          {/* Company Table */}
          <ChartCard title="Companies Detail — Salary & Students" icon={Building} color={COLORS.teal}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    {['#', 'Company', 'Avg Salary (LPA)', 'Max Package (LPA)', 'Students Placed', 'Roles'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(ca.companies_list || []).map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}
                      className="hover-row">
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: 'var(--text-primary)' }}>{c.company_name}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.warning }}>₹{c.avg_package}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.success }}>₹{c.max_package}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ background: COLORS.info + '18', color: COLORS.info, padding: '2px 8px', borderRadius: 99, fontWeight: 800, fontSize: '0.7rem' }}>{c.placed_count}</span>
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(c.roles || []).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION: SALARY                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, var(--bg-card) 0%, var(--bg-card-hover) 100%)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 24px',
          marginTop: 36,
          marginBottom: 16,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span 
            style={{ 
              background: 'var(--accent-soft)', 
              color: 'var(--accent-primary-dark)', 
              padding: 10, 
              borderRadius: 'var(--radius-md)', 
              display: 'flex' 
            }}
          >
            <DollarSign size={20} />
          </span>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
            Salary Analysis
          </h2>
        </div>
        <button 
          onClick={() => toggleSection('salary')}
          title={expanded.salary ? "Collapse Details" : "Expand Details"}
          style={{
            background: expanded.salary ? 'var(--accent-gradient)' : 'var(--bg-card-hover)',
            border: expanded.salary ? 'none' : '1px solid var(--border-color)',
            color: expanded.salary ? '#fff' : 'var(--text-primary)',
            borderRadius: 'var(--radius-sm)',
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: expanded.salary ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none',
            outline: 'none'
          }}
          className="hover-lift"
        >
          {expanded.salary ? <ChevronUp size={20} /> : <ChevronDown size={20} style={{ strokeWidth: 3 }} />}
        </button>
      </div>

      {/* Salary First Row Statistics (Always Visible) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <KPICard title="Highest Package"   value={`₹${sal.highest_package ?? 0} LPA`}   icon={TrendingUp} color={COLORS.success} />
        <KPICard title="Lowest Package"    value={`₹${sal.lowest_package ?? 0} LPA`}    icon={ArrowDown}  color={COLORS.danger} />
        <KPICard title="Average Package"   value={`₹${sal.avg_package ?? 0} LPA`}       icon={DollarSign} color={COLORS.accent} />
        <KPICard title="Median Package"    value={`₹${sal.median_package ?? 0} LPA`}    icon={BarChart2}  color={COLORS.info} />
        <KPICard title="Most Common Salary" value={`₹${sal.most_common_salary ?? 0} LPA`} icon={Target}   color={COLORS.purple} />
        <KPICard title="Highest Paid Role" value={sal.highest_paid_role || '—'}         icon={Award}      color={COLORS.warning} />
      </div>

      {/* Salary Expanded Details */}
      {expanded.salary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 20 }} className="animate-in">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Salary Bands (spec-defined) */}
            <ChartCard title="Salary Bands (Spec-Defined)" icon={BarChart2} color={COLORS.warning}>
              <BarChart
                data={Object.entries(sal.salary_bands_detailed || {}).map(([k, v]) => ({ band: k, count: v }))}
                keyField="band" valueField="count"
                colorFn={(_, i) => [COLORS.info, COLORS.success, COLORS.warning, COLORS.accent, COLORS.purple][i]}
              />
            </ChartCard>

            {/* Salary Distribution Donut */}
            <ChartCard title="Salary Distribution" icon={PieChart} color={COLORS.accent}>
              <DonutChart data={sal.salary_distribution} />
            </ChartCard>
          </div>

          {/* Salary Growth Rate (monthly trend) */}
          <ChartCard title="Salary Growth Rate — Monthly Placement Volume" icon={TrendingUp} color={COLORS.success}>
            <Sparkline data={tt.monthly_placements} color={COLORS.success} height={90} />
          </ChartCard>

          {/* Salary by Company — Top 10 */}
          <ChartCard title="Avg Salary by Company (Top 10)" icon={Building} color={COLORS.teal}>
            <BarChart
              data={(ca.top_companies_by_salary || []).map(c => ({ name: c.company_name.split(' ')[0], avg: c.avg_package }))}
              keyField="name" valueField="avg" unit=" LPA"
              colorFn={(_, i) => PALETTE[i % PALETTE.length]}
            />
          </ChartCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION: COURSES                                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, var(--bg-card) 0%, var(--bg-card-hover) 100%)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 24px',
          marginTop: 36,
          marginBottom: 16,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span 
            style={{ 
              background: 'var(--accent-soft)', 
              color: 'var(--accent-primary-dark)', 
              padding: 10, 
              borderRadius: 'var(--radius-md)', 
              display: 'flex' 
            }}
          >
            <GraduationCap size={20} />
          </span>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
            Course Performance
          </h2>
        </div>
        <button 
          onClick={() => toggleSection('courses')}
          title={expanded.courses ? "Collapse Details" : "Expand Details"}
          style={{
            background: expanded.courses ? 'var(--accent-gradient)' : 'var(--bg-card-hover)',
            border: expanded.courses ? 'none' : '1px solid var(--border-color)',
            color: expanded.courses ? '#fff' : 'var(--text-primary)',
            borderRadius: 'var(--radius-sm)',
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: expanded.courses ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none',
            outline: 'none'
          }}
          className="hover-lift"
        >
          {expanded.courses ? <ChevronUp size={20} /> : <ChevronDown size={20} style={{ strokeWidth: 3 }} />}
        </button>
      </div>

      {/* Courses First Row Statistics (Always Visible) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {(cp || []).map((c, i) => (
          <KPICard key={i}
            title={`${c.course} Placement %`}
            value={`${c.placement_rate}%`}
            icon={GraduationCap}
            color={PALETTE[i % PALETTE.length]}
            subtitle={`${c.placed}/${c.total} placed`}
          />
        ))}
      </div>

      {/* Courses Expanded Details */}
      {expanded.courses && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 20 }} className="animate-in">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <ChartCard title="Placement % by Course" icon={BarChart2} color={COLORS.purple}>
              <BarChart
                data={(cp || []).map(c => ({ course: c.course, rate: c.placement_rate }))}
                keyField="course" valueField="rate" unit="%" colorFn={(_, i) => PALETTE[i % PALETTE.length]}
              />
            </ChartCard>
            <ChartCard title="Avg Salary by Course" icon={DollarSign} color={COLORS.warning}>
              <BarChart
                data={(cp || []).map(c => ({ course: c.course, salary: c.avg_salary }))}
                keyField="course" valueField="salary" unit=" LPA" colorFn={(_, i) => PALETTE[i % PALETTE.length]}
              />
            </ChartCard>
          </div>

          {/* Course Detail Table */}
          <ChartCard title="Course Rankings — Full Detail" icon={BookOpen} color={COLORS.teal}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  {['Rank', 'Course', 'Total', 'Placed', 'Placement %', 'Avg Salary', 'Max Salary'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(s.course_rankings || cp || []).map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 900, color: PALETTE[i % PALETTE.length] }}># {i + 1}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: 'var(--text-primary)' }}>{c.course}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{c.total}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.success }}>{c.placed}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ background: COLORS.accent + '18', color: COLORS.accent, padding: '2px 8px', borderRadius: 99, fontWeight: 800, fontSize: '0.7rem' }}>{c.placement_rate}%</span>
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.warning }}>₹{c.avg_salary ?? 0} LPA</td>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.success }}>₹{c.max_salary ?? 0} LPA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ChartCard>
        </div>
      )}

      {/* ──═════════════════════════════════════════════════════════── */}
      {/* SECTION: STUDENTS                                          */}
      {/* ──═════════════════════════════════════════════════════════── */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, var(--bg-card) 0%, var(--bg-card-hover) 100%)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 24px',
          marginTop: 36,
          marginBottom: 16,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span 
            style={{ 
              background: 'var(--accent-soft)', 
              color: 'var(--accent-primary-dark)', 
              padding: 10, 
              borderRadius: 'var(--radius-md)', 
              display: 'flex' 
            }}
          >
            <Users size={20} />
          </span>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
            Student Demographics
          </h2>
        </div>
        <button 
          onClick={() => toggleSection('students')}
          title={expanded.students ? "Collapse Details" : "Expand Details"}
          style={{
            background: expanded.students ? 'var(--accent-gradient)' : 'var(--bg-card-hover)',
            border: expanded.students ? 'none' : '1px solid var(--border-color)',
            color: expanded.students ? '#fff' : 'var(--text-primary)',
            borderRadius: 'var(--radius-sm)',
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: expanded.students ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none',
            outline: 'none'
          }}
          className="hover-lift"
        >
          {expanded.students ? <ChevronUp size={20} /> : <ChevronDown size={20} style={{ strokeWidth: 3 }} />}
        </button>
      </div>

      {/* Students First Row Statistics (Always Visible) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <KPICard title="Avg CGPA"          value={(dem.cgpa_stats?.avg_cgpa ?? 0).toFixed(2)}      icon={Award}       color={COLORS.accent} />
        <KPICard title="Avg Attendance"    value={`${dem.attendance_stats?.avg_attendance ?? 0}%`} icon={CheckCircle} color={COLORS.success} />
        <KPICard title="With Backlogs"     value={dem.backlog_analysis?.with_backlogs ?? 0}        icon={AlertCircle} color={COLORS.danger} />
        <KPICard title="Without Backlogs"  value={dem.backlog_analysis?.without_backlogs ?? 0}     icon={CheckCircle} color={COLORS.success} />
        <KPICard title="CGPA 8.0+ Placed %"   value={`${dem.cgpa_placement_rates?.cgpa_8_plus?.rate ?? 0}%`}  icon={TrendingUp} color={COLORS.success} subtitle={`${dem.cgpa_placement_rates?.cgpa_8_plus?.placed ?? 0}/${dem.cgpa_placement_rates?.cgpa_8_plus?.total ?? 0}`} />
        <KPICard title="CGPA 6–8 Placed %"    value={`${dem.cgpa_placement_rates?.cgpa_6_to_8?.rate ?? 0}%`}  icon={TrendingUp} color={COLORS.warning} subtitle={`${dem.cgpa_placement_rates?.cgpa_6_to_8?.placed ?? 0}/${dem.cgpa_placement_rates?.cgpa_6_to_8?.total ?? 0}`} />
        <KPICard title="CGPA <6.0 Placed %"   value={`${dem.cgpa_placement_rates?.cgpa_below_6?.rate ?? 0}%`} icon={TrendingUp} color={COLORS.danger}  subtitle={`${dem.cgpa_placement_rates?.cgpa_below_6?.placed ?? 0}/${dem.cgpa_placement_rates?.cgpa_below_6?.total ?? 0}`} />
      </div>

      {/* Students Expanded Details */}
      {expanded.students && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 20 }} className="animate-in">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            <ChartCard title="CGPA Distribution" icon={BarChart2} color={COLORS.info}>
              <DonutChart data={dem.cgpa_distribution} size={120} />
            </ChartCard>
            <ChartCard title="Category Distribution" icon={PieChart} color={COLORS.purple}>
              <DonutChart data={dem.category_distribution} size={120} />
            </ChartCard>
            <ChartCard title="Backlog Status" icon={AlertCircle} color={COLORS.danger}>
              <DonutChart data={{ 'With Backlogs': dem.backlog_analysis?.with_backlogs ?? 0, 'Without Backlogs': dem.backlog_analysis?.without_backlogs ?? 0 }} size={120} />
            </ChartCard>
          </div>

          {/* Semester-wise stats */}
          <ChartCard title="Semester-wise Statistics" icon={BookOpen} color={COLORS.teal}>
            {(s.semester_stats || []).length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    {['Semester', 'Total', 'Placed', 'Placement %'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.67rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.semester_stats.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 800 }}>Semester {r.semester}</td>
                      <td style={{ padding: '8px 10px' }}>{r.total}</td>
                      <td style={{ padding: '8px 10px', color: COLORS.success, fontWeight: 700 }}>{r.placed}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <ProgressBar label="" value={r.placement_rate} max={100} color={PALETTE[i % PALETTE.length]} suffix="%" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState />}
          </ChartCard>
        </div>
      )}

      {/* ──═════════════════════════════════════════════════════════── */}
      {/* SECTION: ELIGIBILITY                                       */}
      {/* ──═════════════════════════════════════════════════════════── */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, var(--bg-card) 0%, var(--bg-card-hover) 100%)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 24px',
          marginTop: 36,
          marginBottom: 16,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span 
            style={{ 
              background: 'var(--accent-soft)', 
              color: 'var(--accent-primary-dark)', 
              padding: 10, 
              borderRadius: 'var(--radius-md)', 
              display: 'flex' 
            }}
          >
            <CheckCircle size={20} />
          </span>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
            Eligibility & Compliance
          </h2>
        </div>
        <button 
          onClick={() => toggleSection('eligibility')}
          title={expanded.eligibility ? "Collapse Details" : "Expand Details"}
          style={{
            background: expanded.eligibility ? 'var(--accent-gradient)' : 'var(--bg-card-hover)',
            border: expanded.eligibility ? 'none' : '1px solid var(--border-color)',
            color: expanded.eligibility ? '#fff' : 'var(--text-primary)',
            borderRadius: 'var(--radius-sm)',
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: expanded.eligibility ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none',
            outline: 'none'
          }}
          className="hover-lift"
        >
          {expanded.eligibility ? <ChevronUp size={20} /> : <ChevronDown size={20} style={{ strokeWidth: 3 }} />}
        </button>
      </div>

      {/* Eligibility First Row Statistics (Always Visible) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <KPICard title="Eligible Students"      value={eli.eligible_students ?? 0}        icon={UserCheck}   color={COLORS.success} />
        <KPICard title="Ineligible Students"    value={eli.ineligible_students ?? 0}      icon={UserX}       color={COLORS.danger} />
        <KPICard title="CGPA Not Met"           value={eli.cgpa_not_met ?? 0}             icon={AlertCircle} color={COLORS.warning} />
        <KPICard title="Attendance Not Met"     value={eli.attendance_not_met ?? 0}       icon={Clock}       color={COLORS.warning} />
        <KPICard title="Backlog Disqualified"   value={eli.backlog_disqualified ?? 0}     icon={XCircle}     color={COLORS.danger} />
        <KPICard title="Course Not Eligible"    value={eli.course_not_eligible ?? 0}      icon={BookOpen}    color={COLORS.slate} />
        <KPICard title="Eligibility Compliance" value={`${eli.eligibility_compliance_pct ?? 0}%`} icon={CheckCircle} color={COLORS.success} />
      </div>

      {/* Eligibility Expanded Details */}
      {expanded.eligibility && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 20 }} className="animate-in">

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <ChartCard title="Eligible vs Ineligible" icon={PieChart} color={COLORS.success}>
              <DonutChart data={{ 'Eligible': eli.eligible_students ?? 0, 'Ineligible': eli.ineligible_students ?? 0 }} />
            </ChartCard>
            <ChartCard title="Ineligibility Reasons" icon={AlertCircle} color={COLORS.danger}>
              <DonutChart data={eli.ineligible_reasons} />
            </ChartCard>
          </div>

          <ChartCard title="Eligibility Compliance Overview" icon={CheckCircle} color={COLORS.success}>
            {[
              { label: 'Eligible Students',    value: eli.eligible_students ?? 0,    color: COLORS.success },
              { label: 'CGPA Not Met',         value: eli.cgpa_not_met ?? 0,         color: COLORS.warning },
              { label: 'Attendance Not Met',   value: eli.attendance_not_met ?? 0,   color: COLORS.warning },
              { label: 'Backlog Disqualified', value: eli.backlog_disqualified ?? 0, color: COLORS.danger },
            ].map(row => (
              <ProgressBar key={row.label} label={row.label} value={row.value} max={ov.total_students || 1} color={row.color} />
            ))}
          </ChartCard>
        </div>
      )}


      {/* ── Footer Quick Links ── */}
      <div style={{ marginTop: 32, padding: '16px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', alignSelf: 'center', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quick Nav:</span>
        {[
          { to: '/students', label: '👥 Students' },
          { to: '/placements', label: '🎯 Placements' },
          { to: '/admin/jobs', label: '💼 Jobs' },
          { to: '/coordinators', label: '🧑‍💼 Coordinators' },
          { to: '/jobs/create', label: '➕ Create Job' },
        ].map(l => (
          <Link key={l.to} to={l.to} className="btn btn-secondary btn-sm"
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700 }}>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
