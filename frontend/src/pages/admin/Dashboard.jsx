// src/pages/admin/Dashboard.jsx  — Comprehensive Placement Analytics Dashboard
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import {
  TrendingUp, Users, Building, Briefcase, Award, DollarSign,
  CheckCircle, AlertCircle, XCircle, Clock, BarChart2, PieChart,
  Calendar, MapPin, Star, ArrowUp, ArrowDown, Filter, Download,
  RefreshCw, Target, Zap, Activity, GraduationCap, BookOpen,
  UserCheck, UserX, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Info,
  Maximize2, Minimize2
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
  const valueStr = String(value || '');
  const isVeryLong = valueStr.length > 22;
  const isLongText = valueStr.length > 15;
  
  const fontSize = isVeryLong
    ? (small ? '0.8rem' : '0.85rem')
    : isLongText
      ? (small ? '0.88rem' : '0.95rem')
      : '1.25rem';

  const fontWeight = isLongText ? 700 : 800;
  const lineHeight = isLongText ? 1.35 : 1.2;

  return (
    <div className="card group hover-lift animate-in" style={{
      padding: small ? '16px 20px' : '20px 24px',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)',
      background: 'var(--bg-card)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      gap: '12px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden',
      height: '100%',
      minHeight: small ? '115px' : '135px',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Dynamic top highlight strip for premium dashboard card uniformity */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: color,
        opacity: 0.85
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ 
          fontSize: '0.78rem', 
          fontWeight: 800, 
          textTransform: 'uppercase', 
          letterSpacing: '0.06em', 
          color: 'var(--text-muted)',
          lineHeight: '1.3'
        }}>
          {title}
        </span>
        <span style={{ 
          background: color + '14', 
          color, 
          padding: '6px', 
          borderRadius: '8px', 
          display: 'flex',
          flexShrink: 0
        }}>
          {Icon && <Icon size={16} />}
        </span>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ 
          fontSize, 
          fontWeight, 
          color: color, 
          lineHeight, 
          wordBreak: 'break-word',
          letterSpacing: '-0.02em'
        }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ 
            fontSize: '0.72rem', 
            color: 'var(--text-muted)', 
            fontWeight: 600, 
            marginTop: 4 
          }}>
            {subtitle}
          </div>
        )}
      </div>

      {trend != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700, marginTop: 4 }}>
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
    <div style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-primary)' }}>{value}{suffix}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: 'var(--border-light)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: color, transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }} />
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

function DetailMiniCard({ title, value, subtitle, icon: Icon, color = COLORS.accent, percentage, percentageColor }) {
  const valueStr = String(value || '');
  const isVeryLong = valueStr.length > 22;
  const isLongText = valueStr.length > 15;

  const fontSize = isVeryLong
    ? '0.85rem'
    : isLongText
      ? '0.95rem'
      : '1.25rem';

  const fontWeight = isLongText ? 700 : 800;
  const lineHeight = isLongText ? 1.35 : 1.2;

  return (
    <div className="card group hover-lift animate-in" style={{
      padding: '16px 20px',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)',
      background: 'var(--bg-card)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '8px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden',
      height: '100%',
      minHeight: 130,
      boxShadow: 'var(--shadow-sm)'
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

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <span style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
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
        {subtitle && (
          <div style={{
            fontSize: '0.66rem',
            color: 'var(--text-muted)',
            fontWeight: 500,
            marginTop: 4,
            lineHeight: 1.25
          }}>
            {subtitle}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
        <div style={{
          fontSize,
          fontWeight,
          color: color,
          lineHeight,
          wordBreak: 'break-word',
          letterSpacing: '-0.02em'
        }}>
          {value}
        </div>

        {percentage !== undefined && percentage !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
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
              fontSize: '0.75rem',
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
  const { user } = useAuthStore();
  const canPlacements = user?.role !== 'coordinator' || user?.can_manage_placements === true;
  const canStudents = user?.role !== 'coordinator' || user?.can_manage_students === true;

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
  const [selectedListingType, setSelectedListingType] = useState('job'); // 'job', 'internship'

  const toggleSection = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchStats = useCallback(async () => {
    try {
      const params = { _t: Date.now() };
      if (selectedListingType !== 'all') {
        params.listing_type = selectedListingType;
      }
      const { data } = await api.get('/dashboard/stats/', { params });
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedListingType]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleRefresh = () => { setRefreshing(true); fetchStats(); };

  const handleExport = async () => {
    const toastId = toast.loading('Generating Excel report...');
    try {
      const { data } = await api.get('/dashboard/reports/');
      const byteCharacters = atob(data.excel);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = data.filename; a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel report exported successfully!', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('Failed to export Excel report. Please verify the backend server has openpyxl installed and restart it.', { id: toastId });
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
      <div className="spinner" />
      <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem' }}>Loading Analytics…</span>
    </div>
  );

  const s = stats || {};
  const fb = s.funnel_breakdown || {};
  const placedCount = (fb.offered ?? 0) + (fb.joined ?? 0);
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
  const pm = s.participation_metrics || {};
  const po = s.placement_overview || {};

  // ── Context-aware terminology: adapts to Jobs vs Internships ──
  const isInternship = selectedListingType === 'internship';
  const T = {
    viewLabel:         isInternship ? 'Internship Analytics' : 'Placement Analytics',
    listingLabel:      isInternship ? 'Internship' : 'Job',
    listingsLabel:     isInternship ? 'Internships' : 'Jobs',
    overviewTitle:     isInternship ? 'Internship Overview' : 'Placement Overview',
    overviewDetail:    isInternship ? 'Internship Overview Detail' : 'Placement Overview Detail',
    totalListings:     isInternship ? 'Total Internships' : 'Total Jobs',
    listingPostings:   isInternship ? 'Internship postings' : 'Job postings',
    totalPlaced:       isInternship ? 'Total Placements' : 'Total Placements',
    placedSubtitle:    isInternship ? 'placement rate' : 'placement rate',
    placedRate:        isInternship ? 'Placement Rate' : 'Placement Rate',
    placedRateGauge:   isInternship ? 'PLACED' : 'PLACED',
    placedLearners:    isInternship ? 'Interns Placed' : 'Placed Learners',
    notPlaced:         isInternship ? 'Not Placed' : 'Not Placed',
    onCampus:          isInternship ? 'On-Campus Placed' : 'On-Campus Placed',
    offCampus:         isInternship ? 'Off-Campus Placed' : 'Off-Campus Placed',
    compLabel:         isInternship ? 'Stipend' : 'Package',
    compUnit:          isInternship ? '₹/month' : 'LPA',
    compSuffix:        isInternship ? '/month' : ' LPA',
    highestComp:       isInternship ? 'Highest Stipend' : 'Highest Package',
    avgComp:           isInternship ? 'Avg Stipend' : 'Avg Package',
    medianComp:        isInternship ? 'Median Stipend' : 'Median Package',
    lowestComp:        isInternship ? 'Min Stipend' : 'Lowest Package',
    mostCommonComp:    isInternship ? 'Most Common Stipend' : 'Most Common Salary',
    highestPaidRole:   isInternship ? 'Highest Stipend Role' : 'Highest Paid Role',
    salarySection:     isInternship ? 'Stipend Analysis' : 'Salary Analysis',
    salarySectionOv:   isInternship ? 'Stipend Overview (Monthly ₹)' : 'Salary Overview (Learner CTC)',
    avgCompOffered:    isInternship ? 'Avg Monthly Stipend' : 'Avg CTC Offered',
    medianCompOffered: isInternship ? 'Median Monthly Stipend' : 'Median CTC Offered',
    minCompOffered:    isInternship ? 'Min Monthly Stipend' : 'Min CTC Offered',
    maxCompOffered:    isInternship ? 'Max Monthly Stipend' : 'Max CTC Offered',
    monthlyTrend:      isInternship ? 'Monthly Internship Trend' : 'Monthly Placements Trend',
    salaryBands:       isInternship ? 'Stipend Bands' : 'Salary Bands (Spec-Defined)',
    salaryDist:        isInternship ? 'Stipend Distribution' : 'Salary Distribution',
    salaryGrowth:      isInternship ? 'Monthly Internship Volume' : 'Salary Growth Rate — Monthly Volume',
    avgSalaryByComp:   isInternship ? 'Avg Stipend by Company (Top 10)' : 'Avg Salary by Company (Top 10)',
    compTableHeaders:  isInternship
      ? ['#', 'Company', 'Avg Stipend (₹/mo)', 'Max Stipend (₹/mo)', 'Students Placed', 'Roles']
      : ['#', 'Company', 'Avg Salary (LPA)', 'Max Package (LPA)', 'Students Placed', 'Roles'],
    formatComp: (val) => {
      if (val == null || isNaN(val) || parseFloat(val) === 0) return '—';
      const n = parseFloat(val);
      if (isInternship) return `₹${n.toLocaleString()}/mo`;
      return n < 0.1 ? `${Math.round(n * 100)}k` : `${n} LPA`;
    },
    statusDistTitle:   isInternship ? 'Status Distribution (Internships)' : 'Status Distribution (Jobs)',
    jobStatusSplit:    isInternship ? 'Internship Status Split' : 'Job Status Split',
    oppSplitJob:       isInternship ? 'Placement Jobs' : 'Placement Jobs',
    oppSplitIntern:    isInternship ? 'Internships' : 'Internships',
  };

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
            {T.viewLabel} • 10 metric categories • {ov.total_students || 0} students tracked
            {isInternship && <span style={{ marginLeft: 8, fontSize: '0.7rem', background: '#10b98120', color: '#10b981', padding: '2px 8px', borderRadius: 99, fontWeight: 800 }}>🎓 INTERNSHIP MODE</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExport}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10 }}>
            <Download size={13} /> Export Excel
          </button>
        </div>
      </div>

      <style>{`
        .premium-toggle-container {
          display: inline-flex;
          gap: 4px;
          padding: 5px;
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 100px;
          box-shadow: var(--shadow-sm), inset 0 2px 4px rgba(0, 0, 0, 0.02);
          margin-bottom: 24px;
          align-items: center;
          transition: all 0.3s ease;
        }
        
        .premium-toggle-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border-radius: 100px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border: none;
          background: transparent;
          color: var(--text-secondary, #64748b);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }
        
        .premium-toggle-button:hover {
          color: var(--text-primary, #0f172a);
          background: var(--bg-card-hover, rgba(0, 0, 0, 0.03));
        }
        
        .premium-toggle-button.active {
          background: linear-gradient(135deg, var(--accent-primary, #2563eb) 0%, var(--info, #3b82f6) 100%);
          color: #ffffff !important;
          font-weight: 800;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .premium-toggle-button.active svg {
          stroke: #ffffff !important;
        }

        .pipeline-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 8px;
        }
        
        @media (max-width: 1024px) {
          .pipeline-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        
        @media (max-width: 640px) {
          .pipeline-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .pipeline-stage-col {
          padding: 10px 14px;
          border-radius: 16px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid transparent;
        }

        .pipeline-stage-col:hover {
          background: var(--bg-card-hover, #f8fafc);
          border-color: var(--border-color);
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }

        .participation-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        
        @media (max-width: 768px) {
          .participation-grid {
            grid-template-columns: 1fr;
          }
        }

        .dashboard-section-premium-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 99px;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: 1px solid var(--border-color, #e2e8f0);
          background: var(--bg-card, #ffffff);
          color: var(--text-secondary, #64748b);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-sm);
        }
        
        .dashboard-section-premium-toggle:hover {
          color: var(--accent-primary, #2563eb);
          border-color: var(--accent-primary, #2563eb);
          background: rgba(37, 99, 235, 0.03);
          transform: translateY(-1px);
        }
        
        .dashboard-section-premium-toggle.active {
          background: var(--accent-primary, #2563eb);
          border-color: var(--accent-primary, #2563eb);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }
      `}</style>

      {canPlacements && (
        <>
          {/* Dynamic Switcher (Jobs / Internships) */}
          <div className="premium-toggle-container animate-in">
        <button
          onClick={() => setSelectedListingType('job')}
          className={`premium-toggle-button ${selectedListingType === 'job' ? 'active' : ''}`}
        >
          <Briefcase size={14} />
          Placement Jobs
        </button>
        <button
          onClick={() => setSelectedListingType('internship')}
          className={`premium-toggle-button ${selectedListingType === 'internship' ? 'active' : ''}`}
        >
          <Award size={14} />
          Internships
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION: OVERVIEW                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="dashboard-section-header" onClick={() => toggleSection('overview')}>
        <div className="dashboard-section-left">
          <span className="dashboard-section-icon">
            <BarChart2 size={18} />
          </span>
          <h2 className="dashboard-section-title">
            {T.overviewTitle}
          </h2>
        </div>
        <button 
          className={`dashboard-section-premium-toggle ${expanded.overview ? 'active' : ''}`}
          title={expanded.overview ? "Collapse Details" : "Expand Details"}
          onClick={(e) => { e.stopPropagation(); toggleSection('overview'); }}
        >
          {expanded.overview ? (
            <>
              <span>Hide Details</span>
              <Minimize2 size={12} style={{ strokeWidth: 2.5 }} />
            </>
          ) : (
            <>
              <span>View Details</span>
              <Maximize2 size={12} style={{ strokeWidth: 2.5 }} />
            </>
          )}
        </button>
      </div>

      {/* First Row Statistics (Always Visible) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <KPICard title="Total Students" value={ov.total_students ?? 0} icon={Users} color={COLORS.info} />
        <KPICard title={T.totalPlaced} value={ov.total_placements ?? ov.placed_students ?? 0} icon={CheckCircle} color={COLORS.success} subtitle="Selected / accepted offers" />
        <KPICard title={T.onCampus} value={ov.placed_on_campus ?? 0} icon={CheckCircle} color={COLORS.teal} subtitle="Internal offers" />
        <KPICard title={T.offCampus} value={ov.placed_off_campus ?? 0} icon={TrendingUp} color={COLORS.purple} subtitle="External offers" />
        <KPICard title={T.avgComp} value={T.formatComp(sal.avg_package)} icon={DollarSign} color={COLORS.warning} subtitle={isInternship ? "Monthly average" : "Average CTC"} />
        <KPICard title={T.highestComp} value={T.formatComp(sal.highest_package)} icon={Award} color={COLORS.purple} subtitle={isInternship ? "Peak monthly rate" : "Max CTC package"} />
        <KPICard title="Companies" value={ca.total_companies ?? ov.total_companies ?? 0} icon={Building} color={COLORS.teal} subtitle="Active recruiters" />
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
                {isInternship ? 'Internship Activity & Performance At A Glance' : 'Institute Activity & Performance At A Glance (Historical Data)'}
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <KPICard title="Total Companies" value={ov.total_companies ?? 0} icon={Building} color={COLORS.info} subtitle="Recruiting" small />
              <KPICard title="Total Openings" value={ov.total_openings ?? 0} icon={Target} color={COLORS.pink} subtitle="Available roles" small />
              <KPICard title={T.placedLearners} value={ov.placed_students ?? 0} icon={UserCheck} color={COLORS.success} subtitle="Unique learners" small />
              <KPICard title={T.onCampus} value={ov.placed_on_campus ?? 0} icon={CheckCircle} color={COLORS.teal} subtitle="Internal offers" small />
              <KPICard title={T.offCampus} value={ov.placed_off_campus ?? 0} icon={TrendingUp} color={COLORS.purple} subtitle="External offers" small />
              <KPICard title={T.notPlaced} value={ov.total_not_placed ?? 0} icon={UserX} color={COLORS.danger} subtitle="Eligible & pending" small />
              
              <div className="card" style={{
                padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px', background: 'var(--bg-card-light)'
              }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                  {T.jobStatusSplit}
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

              <div className="card" style={{
                padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px', background: 'var(--bg-card-light)'
              }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                  Opportunities Split
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700 }}>
                    <span style={{ color: COLORS.info }}>Placement Jobs:</span>
                    <span style={{ fontWeight: 800 }}>{jd.by_listing_type?.job ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700 }}>
                    <span style={{ color: COLORS.purple }}>Internships:</span>
                    <span style={{ fontWeight: 800 }}>{jd.by_listing_type?.internship ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700 }}>
                    <span style={{ color: COLORS.teal }}>Total Postings:</span>
                    <span style={{ fontWeight: 800 }}>{(jd.by_listing_type?.job ?? 0) + (jd.by_listing_type?.internship ?? 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Recruitment Funnel & Overall Performance Status */}
          <div className="grid-responsive-1-2">
            {/* Recruitment Pipeline Funnel */}
            <ChartCard title="Recruitment Status Funnel" icon={PieChart} color={COLORS.info}>
              {(() => {
                const fb = s.funnel_breakdown || {};
                const placedCount = (fb.offered ?? 0) + (fb.joined ?? 0);
                const totalApps = (fb.applied ?? 0) + (fb.shortlist ?? 0) + (fb.in_interview ?? 0) + placedCount + (fb.rejected ?? 0);
                const maxVal = totalApps || 1;
                
                const getAppSuffix = (v) => v === 1 ? " Application" : " Applications";
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <ProgressBar label="Applied" value={fb.applied ?? 0} max={maxVal} color={COLORS.info} suffix={getAppSuffix(fb.applied ?? 0)} />
                    <ProgressBar label="Shortlisted" value={fb.shortlist ?? 0} max={maxVal} color={COLORS.warning} suffix={getAppSuffix(fb.shortlist ?? 0)} />
                    <ProgressBar label="Interviewing" value={fb.in_interview ?? 0} max={maxVal} color={COLORS.purple} suffix={getAppSuffix(fb.in_interview ?? 0)} />
                    <ProgressBar label="Placed" value={placedCount} max={maxVal} color={COLORS.success} suffix={getAppSuffix(placedCount)} />
                    <ProgressBar label="Declined" value={fb.rejected ?? 0} max={maxVal} color={COLORS.danger} suffix={getAppSuffix(fb.rejected ?? 0)} />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 8, background: 'var(--bg-card-light)', border: '1px solid var(--border-light)', marginTop: 8 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>Total Applications Funnel</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 900, color: COLORS.accent }}>{totalApps} {totalApps === 1 ? 'Application' : 'Applications'}</span>
                    </div>
                  </div>
                );
              })()}
            </ChartCard>

            {/* Overall Performance Status - Beautiful Number Display */}
            <ChartCard title="Overall Performance Status" icon={Award} color={COLORS.purple}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '10px 5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <div style={{ 
                      fontSize: '3.2rem', 
                      fontWeight: 900, 
                      lineHeight: 1,
                      background: `linear-gradient(135deg, ${COLORS.success} 0%, ${COLORS.accent} 100%)`,
                      WebkitBackgroundClip: 'text', 
                      WebkitTextFillColor: 'transparent',
                      letterSpacing: '-0.03em'
                    }}>
                      {ov.placement_rate ?? 0}%
                    </div>
                    <div style={{ 
                      fontSize: '0.78rem', 
                      fontWeight: 800, 
                      color: COLORS.success,
                      letterSpacing: '0.1em',
                      marginTop: 4,
                      textTransform: 'uppercase'
                    }}>
                      {T.placedRateGauge}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, maxWidth: '180px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Placed:</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: COLORS.success }}>
                        {ov.placed_students ?? 0} {ov.placed_students === 1 ? 'Student' : 'Students'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Eligible Base:</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {ov.total_students ?? 0} {ov.total_students === 1 ? 'Student' : 'Students'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    <span>Placement Progress</span>
                    <span>{ov.placement_rate ?? 0}%</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 99, background: 'var(--border-light)', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${ov.placement_rate ?? 0}%`, 
                      borderRadius: 99, 
                      background: `linear-gradient(90deg, ${COLORS.success} 0%, ${COLORS.accent} 100%)`, 
                      transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)' 
                    }} />
                  </div>
                </div>
              </div>
            </ChartCard>
          </div>

          {/* 3. Salary Overview Panel */}
          <div>
            {/* Learner Salary Stats */}
            <div className="card" style={{ padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              <SectionHeader icon={DollarSign} title={T.salarySectionOv} color={COLORS.success} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <DetailMiniCard title={T.avgCompOffered} value={T.formatComp(sal.avg_package)} icon={DollarSign} color={COLORS.accent} />
                <DetailMiniCard title={T.medianCompOffered} value={T.formatComp(sal.median_package)} icon={TrendingUp} color={COLORS.success} />
                <DetailMiniCard title={T.minCompOffered} value={T.formatComp(sal.lowest_package)} icon={ArrowDown} color={COLORS.danger} />
                <DetailMiniCard title={T.maxCompOffered} value={T.formatComp(sal.highest_package)} icon={Award} color={COLORS.purple} />
              </div>
            </div>
          </div>

          {/* 4. Core Monthly Trends - Full Width Line Chart */}
          <div>
            {/* Monthly Trend Sparkline */}
            <ChartCard title={T.monthlyTrend} icon={Calendar} color={COLORS.info}>
              <div style={{ marginTop: 10 }}>
                <Sparkline data={tt.monthly_placements} color={COLORS.accent} height={120} />
              </div>
            </ChartCard>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION: STATUS                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="dashboard-section-header" onClick={() => toggleSection('status')}>
        <div className="dashboard-section-left">
          <span className="dashboard-section-icon">
            <Activity size={18} />
          </span>
          <h2 className="dashboard-section-title">
            Application Status
          </h2>
        </div>
        <button 
          className={`dashboard-section-premium-toggle ${expanded.status ? 'active' : ''}`}
          title={expanded.status ? "Collapse Details" : "Expand Details"}
          onClick={(e) => { e.stopPropagation(); toggleSection('status'); }}
        >
          {expanded.status ? (
            <>
              <span>Hide Details</span>
              <Minimize2 size={12} style={{ strokeWidth: 2.5 }} />
            </>
          ) : (
            <>
              <span>View Details</span>
              <Maximize2 size={12} style={{ strokeWidth: 2.5 }} />
            </>
          )}
        </button>
      </div>

      {/* Status First Row Statistics (Always Visible) - Swapped: now shows the Application Pipeline */}
      <div className="card hover-lift" style={{ padding: '24px 28px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', marginBottom: 14, boxShadow: 'var(--shadow-md)' }}>
        <SectionHeader icon={Activity} title="Application Pipeline" color={COLORS.accent} />
        {(() => {
          return (
            <div className="pipeline-grid">
              {[
                { label: 'Applied',      value: fb.applied ?? 0,   color: COLORS.info },
                { label: 'Shortlisted',  value: fb.shortlist ?? 0, color: COLORS.warning },
                { label: 'Interviewing', value: fb.in_interview ?? 0, color: COLORS.purple },
                { label: 'Placed',       value: placedCount,       color: COLORS.success },
                { label: 'Declined',     value: fb.rejected ?? 0,  color: COLORS.danger },
                { label: 'Not Applied',  value: status.not_applied ?? 0, color: COLORS.slate },
              ].map(row => (
                <div key={row.label} className="pipeline-stage-col">
                  <ProgressBar label={row.label} value={row.value}
                    max={ov.total_students || 1} color={row.color} />
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Status Expanded Details */}
      {expanded.status && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 20 }} className="animate-in">
          <div className="grid-responsive-1-2">
            {/* Swapped: detailed participation and engagement metrics cards */}
            <div className="card" style={{ padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
              <SectionHeader icon={TrendingUp} title="Participation & Engagement Metrics" color={COLORS.accent} />
              <div className="participation-grid">
                <DetailMiniCard 
                  title="Total Applications" 
                  value={ov.total_applications ?? 0} 
                  subtitle={isInternship ? "Total internship applications submitted" : "Total job applications submitted"}
                  icon={Briefcase} 
                  color={COLORS.info} 
                />
                <DetailMiniCard 
                  title="Currently Pending" 
                  value={fb.applied ?? 0} 
                  subtitle="Applications currently awaiting review"
                  icon={Clock} 
                  color={COLORS.accent} 
                  percentage={ov.total_applications ? ((fb.applied / ov.total_applications) * 100) : 0}
                />
                <DetailMiniCard 
                  title="Currently Shortlisted" 
                  value={fb.shortlist ?? 0} 
                  subtitle="Applications currently shortlisted for next steps"
                  icon={UserCheck} 
                  color={COLORS.warning} 
                  percentage={ov.total_applications ? ((fb.shortlist / ov.total_applications) * 100) : 0}
                />
                <DetailMiniCard 
                  title="Currently Interviewing" 
                  value={fb.in_interview ?? 0} 
                  subtitle="Applications currently in active interview stages"
                  icon={Activity} 
                  color={COLORS.purple} 
                  percentage={ov.total_applications ? ((fb.in_interview / ov.total_applications) * 100) : 0}
                />
                <DetailMiniCard 
                  title="Currently Selected" 
                  value={placedCount} 
                  subtitle={isInternship ? "Internship offers currently received by candidates" : "Job offers currently received by candidates"}
                  icon={Award} 
                  color={COLORS.success} 
                  percentage={ov.total_applications ? ((placedCount / ov.total_applications) * 100) : 0}
                />
                <DetailMiniCard 
                  title="Currently Declined" 
                  value={fb.rejected ?? 0} 
                  subtitle="Applications currently rejected or withdrawn"
                  icon={UserX} 
                  color={COLORS.danger} 
                  percentage={ov.total_applications ? ((fb.rejected / ov.total_applications) * 100) : 0}
                />
              </div>
            </div>

            <ChartCard title={T.statusDistTitle} icon={PieChart} color={COLORS.info}>
              {(() => {
                const fb = s.funnel_breakdown || {};
                const placedCount = (fb.offered ?? 0) + (fb.joined ?? 0);
                const chartData = {
                  'Applied': fb.applied ?? 0,
                  'Shortlisted': fb.shortlist ?? 0,
                  'Interviewing': fb.in_interview ?? 0,
                  'Placed': placedCount,
                  'Declined': fb.rejected ?? 0,
                };
                return <DonutChart data={chartData} />;
              })()}
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
      <div className="dashboard-section-header" onClick={() => toggleSection('companies')}>
        <div className="dashboard-section-left">
          <span className="dashboard-section-icon">
            <Building size={18} />
          </span>
          <h2 className="dashboard-section-title">
            Companies Analytics
          </h2>
        </div>
        <button 
          className={`dashboard-section-premium-toggle ${expanded.companies ? 'active' : ''}`}
          title={expanded.companies ? "Collapse Details" : "Expand Details"}
          onClick={(e) => { e.stopPropagation(); toggleSection('companies'); }}
        >
          {expanded.companies ? (
            <>
              <span>Hide Details</span>
              <Minimize2 size={12} style={{ strokeWidth: 2.5 }} />
            </>
          ) : (
            <>
              <span>View Details</span>
              <Maximize2 size={12} style={{ strokeWidth: 2.5 }} />
            </>
          )}
        </button>
      </div>

      {/* Companies First Row Statistics (Always Visible) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <KPICard title="Total Companies"      value={ca.total_companies ?? 0}                          icon={Building}  color={COLORS.teal} />
        <KPICard title="Top Company"          value={ca.top_company?.company_name || '—'}              icon={Star}      color={COLORS.accent} subtitle={`${ca.top_company?.placed_count ?? 0} placed`} />
        <KPICard title="Top Company Count"    value={ca.top_company?.placed_count ?? 0}               icon={Users}     color={COLORS.success} subtitle="Students placed" />
        <KPICard title="Highest Paying"       value={ca.highest_paying_company?.company_name || '—'}  icon={Award}     color={COLORS.purple} subtitle={T.formatComp(ca.highest_paying_company?.max_package)} />
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
                    {T.compTableHeaders.map(h => (
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
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.warning }}>{T.formatComp(c.avg_package)}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.success }}>{T.formatComp(c.max_package)}</td>
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
      <div className="dashboard-section-header" onClick={() => toggleSection('salary')}>
        <div className="dashboard-section-left">
          <span className="dashboard-section-icon">
            <DollarSign size={18} />
          </span>
          <h2 className="dashboard-section-title">
            {T.salarySection}
          </h2>
        </div>
        <button 
          className={`dashboard-section-premium-toggle ${expanded.salary ? 'active' : ''}`}
          title={expanded.salary ? "Collapse Details" : "Expand Details"}
          onClick={(e) => { e.stopPropagation(); toggleSection('salary'); }}
        >
          {expanded.salary ? (
            <>
              <span>Hide Details</span>
              <Minimize2 size={12} style={{ strokeWidth: 2.5 }} />
            </>
          ) : (
            <>
              <span>View Details</span>
              <Maximize2 size={12} style={{ strokeWidth: 2.5 }} />
            </>
          )}
        </button>
      </div>

      {/* Salary First Row Statistics (Always Visible) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <KPICard title={T.highestComp}    value={T.formatComp(sal.highest_package)} icon={TrendingUp} color={COLORS.success} />
        <KPICard title={T.lowestComp}     value={T.formatComp(sal.lowest_package)}  icon={ArrowDown}  color={COLORS.danger} />
        <KPICard title={T.avgComp}        value={T.formatComp(sal.avg_package)}      icon={DollarSign} color={COLORS.accent} />
        <KPICard title={T.medianComp}     value={T.formatComp(sal.median_package)}   icon={BarChart2}  color={COLORS.info} />
        <KPICard title={T.mostCommonComp} value={T.formatComp(sal.most_common_salary)} icon={Target}   color={COLORS.purple} />
        <KPICard title={T.highestPaidRole} value={sal.highest_paid_role || '—'}      icon={Award}      color={COLORS.warning} />
      </div>

      {/* Salary Expanded Details */}
      {expanded.salary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 20 }} className="animate-in">
          <div className="grid-responsive-2">
            {/* Salary Bands (spec-defined) */}
            <ChartCard title={T.salaryBands} icon={BarChart2} color={COLORS.warning}>
              <BarChart
                data={Object.entries(sal.salary_bands_detailed || {}).map(([k, v]) => ({ band: k, count: v }))}
                keyField="band" valueField="count"
                colorFn={(_, i) => [COLORS.info, COLORS.success, COLORS.warning, COLORS.accent, COLORS.purple][i]}
              />
            </ChartCard>

            <ChartCard title={T.salaryDist} icon={PieChart} color={COLORS.accent}>
              <DonutChart data={sal.salary_distribution} />
            </ChartCard>
          </div>

          <ChartCard title={T.salaryGrowth} icon={TrendingUp} color={COLORS.success}>
            <Sparkline data={tt.monthly_placements} color={COLORS.success} height={90} />
          </ChartCard>

          <ChartCard title={T.avgSalaryByComp} icon={Building} color={COLORS.teal}>
            <BarChart
              data={(ca.top_companies_by_salary || []).map(c => ({ name: c.company_name.split(' ')[0], avg: c.avg_package }))}
              keyField="name" valueField="avg" unit={isInternship ? ' ₹/mo' : ' LPA'}
              colorFn={(_, i) => PALETTE[i % PALETTE.length]}
            />
          </ChartCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION: COURSES                                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="dashboard-section-header" onClick={() => toggleSection('courses')}>
        <div className="dashboard-section-left">
          <span className="dashboard-section-icon">
            <GraduationCap size={18} />
          </span>
          <h2 className="dashboard-section-title">
            {isInternship ? 'Course Internship Performance' : 'Course Placement Performance'}
          </h2>
        </div>
        <button 
          className={`dashboard-section-premium-toggle ${expanded.courses ? 'active' : ''}`}
          title={expanded.courses ? "Collapse Details" : "Expand Details"}
          onClick={(e) => { e.stopPropagation(); toggleSection('courses'); }}
        >
          {expanded.courses ? (
            <>
              <span>Hide Details</span>
              <Minimize2 size={12} style={{ strokeWidth: 2.5 }} />
            </>
          ) : (
            <>
              <span>View Details</span>
              <Maximize2 size={12} style={{ strokeWidth: 2.5 }} />
            </>
          )}
        </button>
      </div>

      {/* Course Performance Graph & Summary (Always Visible) */}
      <div className="card" style={{ padding: 24, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28 }}>
        <div>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
            Course-wise {isInternship ? 'Conversion' : 'Placement'} Rates
          </h4>
          <div style={{ maxHeight: '340px', overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(cp || []).map((c, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.course}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: PALETTE[i % PALETTE.length] }}>
                    {c.placement_rate}% <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>({c.placed}/{c.total})</span>
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: 'var(--border-light)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.placement_rate}%`, borderRadius: 99, background: PALETTE[i % PALETTE.length], transition: 'width 1s ease-out' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
            Performance Summary
          </h4>
          {(() => {
            const sortedByRate = [...(cp || [])].sort((a, b) => b.placement_rate - a.placement_rate);
            const topCourse = sortedByRate[0];
            const bottomCourse = sortedByRate.filter(c => c.total > 0).pop();
            const totalStudents = (cp || []).reduce((sum, c) => sum + c.total, 0);
            const totalPlaced = (cp || []).reduce((sum, c) => sum + c.placed, 0);
            const averageRate = totalStudents > 0 ? Math.round((totalPlaced / totalStudents) * 100) : 0;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'space-between', height: '100%' }}>
                <KPICard 
                  title="Top Performing Course" 
                  value={topCourse ? `${topCourse.course} (${topCourse.placement_rate}%)` : '—'} 
                  subtitle={`${topCourse?.placed ?? 0}/${topCourse?.total ?? 0} students placed`}
                  icon={Award}
                  color={COLORS.success}
                  small
                />
                <KPICard 
                  title="Overall Average Placement" 
                  value={`${averageRate}%`} 
                  subtitle={`${totalPlaced}/${totalStudents} total students`}
                  icon={TrendingUp}
                  color={COLORS.accent}
                  small
                />
                {bottomCourse && (
                  <KPICard 
                    title="Needs Attention (Lowest)" 
                    value={`${bottomCourse.course} (${bottomCourse.placement_rate}%)`} 
                    subtitle={`${bottomCourse.total - bottomCourse.placed} students remaining`}
                    icon={AlertCircle}
                    color={COLORS.danger}
                    small
                  />
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Courses Expanded Details */}
      {expanded.courses && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 20 }} className="animate-in">
          <div className="grid-responsive-2">
            <ChartCard title="Placement % by Course" icon={BarChart2} color={COLORS.purple}>
              <BarChart
                data={(cp || []).map(c => ({ course: c.course, rate: c.placement_rate }))}
                keyField="course" valueField="rate" unit="%" colorFn={(_, i) => PALETTE[i % PALETTE.length]}
              />
            </ChartCard>
            <ChartCard title={isInternship ? "Avg Stipend by Course" : "Avg Salary by Course"} icon={DollarSign} color={COLORS.warning}>
              <BarChart
                data={(cp || []).map(c => ({ course: c.course, salary: c.avg_salary }))}
                keyField="course" valueField="salary" unit={isInternship ? " ₹/mo" : " LPA"} colorFn={(_, i) => PALETTE[i % PALETTE.length]}
              />
            </ChartCard>
          </div>

          {/* Course Detail Table */}
          <ChartCard title={isInternship ? "Course Rankings — Internship Detail" : "Course Rankings — Placement Detail"} icon={BookOpen} color={COLORS.teal}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    {(isInternship
                      ? ['Rank', 'Course', 'Total', 'Placed', 'Placement %', 'Avg Stipend', 'Max Stipend']
                      : ['Rank', 'Course', 'Total', 'Placed', 'Placement %', 'Avg Salary', 'Max Salary']
                    ).map(h => (
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
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.warning }}>{T.formatComp(c.avg_salary)}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.success }}>{T.formatComp(c.max_salary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      )}
        </>
      )}

      {canStudents && (
        <>
          {/* ──═════════════════════════════════════════════════════════── */}
          {/* SECTION: STUDENTS                                          */}
          {/* ──═════════════════════════════════════════════════════════── */}
      <div className="dashboard-section-header" onClick={() => toggleSection('students')}>
        <div className="dashboard-section-left">
          <span className="dashboard-section-icon">
            <Users size={18} />
          </span>
          <h2 className="dashboard-section-title">
            Student Demographics
          </h2>
        </div>
        <button 
          className={`dashboard-section-premium-toggle ${expanded.students ? 'active' : ''}`}
          title={expanded.students ? "Collapse Details" : "Expand Details"}
          onClick={(e) => { e.stopPropagation(); toggleSection('students'); }}
        >
          {expanded.students ? (
            <>
              <span>Hide Details</span>
              <Minimize2 size={12} style={{ strokeWidth: 2.5 }} />
            </>
          ) : (
            <>
              <span>View Details</span>
              <Maximize2 size={12} style={{ strokeWidth: 2.5 }} />
            </>
          )}
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
          <div className="grid-responsive-3">
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
              <div style={{ overflowX: 'auto' }}>
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
              </div>
            ) : <EmptyState />}
          </ChartCard>
        </div>
      )}

      {/* ──═════════════════════════════════════════════════════════── */}
      {/* SECTION: ELIGIBILITY                                       */}
      {/* ──═════════════════════════════════════════════════════════── */}
      <div className="dashboard-section-header" onClick={() => toggleSection('eligibility')}>
        <div className="dashboard-section-left">
          <span className="dashboard-section-icon">
            <CheckCircle size={18} />
          </span>
          <h2 className="dashboard-section-title">
            Eligibility & Compliance
          </h2>
        </div>
        <button 
          className={`dashboard-section-premium-toggle ${expanded.eligibility ? 'active' : ''}`}
          title={expanded.eligibility ? "Collapse Details" : "Expand Details"}
          onClick={(e) => { e.stopPropagation(); toggleSection('eligibility'); }}
        >
          {expanded.eligibility ? (
            <>
              <span>Hide Details</span>
              <Minimize2 size={12} style={{ strokeWidth: 2.5 }} />
            </>
          ) : (
            <>
              <span>View Details</span>
              <Maximize2 size={12} style={{ strokeWidth: 2.5 }} />
            </>
          )}
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

          {/* Eligibility Cards Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
            <DetailMiniCard 
              title="Avg PACT Score" 
              value={eli.avg_pact_score ?? 0} 
              subtitle="Overall index score"
              icon={Target}
              color={COLORS.purple}
            />
            <DetailMiniCard 
              title="Category A Students" 
              value={eli.category_distribution?.A ?? 0} 
              subtitle="Outstanding profiles"
              icon={Award}
              color={COLORS.success}
            />
            <DetailMiniCard 
              title="Category B Students" 
              value={eli.category_distribution?.B ?? 0} 
              subtitle="Consistent performers"
              icon={UserCheck}
              color={COLORS.warning}
            />
            <DetailMiniCard 
              title="Category C Students" 
              value={eli.category_distribution?.C ?? 0} 
              subtitle="Need improvement"
              icon={UserX}
              color={COLORS.danger}
            />
          </div>

          <div className="grid-responsive-2">
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

          {/* Departmental Eligibility & PACT Performance Table */}
          <ChartCard title="Departmental Eligibility & PACT Performance" icon={Building} color={COLORS.teal}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800 }}>DEPARTMENT / COURSE</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800 }}>TOTAL</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800 }}>ELIGIBLE</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800 }}>ELIGIBILITY %</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800 }}>CAT A / B / C</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800 }}>AVG CGPA</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800 }}>AVG ATTENDANCE</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: COLORS.accent }}>AVG PACT SCORE</th>
                  </tr>
                </thead>
                <tbody>
                  {(eli.course_eligibility || []).map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }} className="hover-row">
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--text-primary)' }}>{row.course}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>{row.total_students}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: COLORS.success, fontWeight: 700 }}>{row.eligible_count}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ background: COLORS.success + '15', color: COLORS.success, padding: '2px 8px', borderRadius: 99, fontWeight: 800, fontSize: '0.75rem' }}>
                          {row.eligibility_rate}%
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>
                        <span style={{ color: COLORS.success }}>{row.cat_a}</span> / <span style={{ color: COLORS.warning }}>{row.cat_b}</span> / <span style={{ color: COLORS.danger }}>{row.cat_c}</span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>{row.avg_cgpa}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>{row.avg_attendance}%</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 900, color: COLORS.accent, fontSize: '0.85rem' }}>{row.avg_pact_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      )}
        </>
      )}


      {/* ── Footer Quick Links ── */}
      {(() => {
        const quickLinks = [
          { to: '/students', label: '👥 Students', check: () => user?.role !== 'coordinator' || user?.can_manage_students === true },
          { to: '/placements', label: '🎯 Placements', check: () => user?.role !== 'coordinator' || user?.can_manage_placements === true },
          { to: '/admin/jobs', label: '💼 Jobs', check: () => user?.role !== 'coordinator' || user?.can_manage_placements === true },
          { to: '/coordinators', label: '🧑‍💼 Coordinators', check: () => user?.role !== 'coordinator' },
          { to: '/jobs/create', label: '➕ Create Job', check: () => user?.role !== 'coordinator' || user?.can_manage_placements === true },
        ].filter(l => l.check());

        if (quickLinks.length === 0) return null;

        return (
          <div style={{ marginTop: 32, padding: '16px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', alignSelf: 'center', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quick Nav:</span>
            {quickLinks.map(l => (
              <Link key={l.to} to={l.to} className="btn btn-secondary btn-sm"
                style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700 }}>
                {l.label}
              </Link>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
