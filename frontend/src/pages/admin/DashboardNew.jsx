// src/pages/admin/DashboardNew.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import {
  BarChart3,
  TrendingUp,
  Users,
  Building,
  Briefcase,
  Award,
  PieChart,
  LineChart,
  Calendar,
  Filter,
  Download,
  Eye,
  MapPin,
  Zap,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

export default function DashboardNew() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    api.get('/dashboard/stats/', { params: { _t: Date.now() } })
      .then(({ data }) => setStats(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  // KPI Card Component
  const KPICard = ({ title, value, subtitle, icon: Icon, trend, color = 'accent-primary', bgColor }) => {
    // Map tailwind-like colors to correct CSS variables or fallback theme colors
    const colorMap = {
      'accent-primary': 'var(--accent-primary)',
      'success': 'var(--success)',
      'info': 'var(--info)',
      'warning': 'var(--warning)',
      'danger': 'var(--danger)',
    };
    
    const bgMap = {
      'accent-primary': 'var(--accent-soft)',
      'success': 'rgba(16, 185, 129, 0.1)',
      'info': 'rgba(59, 130, 246, 0.1)',
      'warning': 'rgba(245, 158, 11, 0.1)',
      'danger': 'rgba(239, 68, 68, 0.1)',
    };

    const mappedColor = colorMap[color] || 'var(--accent-primary)';
    const mappedBg = bgMap[color] || 'var(--accent-soft)';

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
      <div className="card group hover-lift relative overflow-hidden flex flex-col justify-between animate-in" style={{ minHeight: '135px', padding: '20px 24px' }}>
        {/* Dynamic top highlight strip for premium dashboard card uniformity */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: mappedColor, opacity: 0.85, height: '4px' }} />
        
        <div className="flex justify-between items-start mb-2 pt-1 gap-2">
          <div>
            <p className="text-xs font-extrabold text-muted uppercase tracking-wider" style={{ fontSize: '0.78rem' }}>{title}</p>
            <h3 className="mt-2 tracking-tight" style={{ fontSize, fontWeight, color: mappedColor, lineHeight }}>{value}</h3>
          </div>
          <div className="p-2 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: mappedBg, color: mappedColor, padding: '6px', borderRadius: '8px' }}>
            {Icon && <Icon size={18} style={{ color: mappedColor }} />}
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-xs font-bold mt-2">
            {trend.up ? <ArrowUp size={12} className="text-success" /> : <ArrowDown size={12} className="text-danger" />}
            <span className={trend.up ? 'text-success' : 'text-danger'}>{trend.value}</span>
          </div>
        )}
      </div>
    );
  };

  // Chart Section Component
  const ChartSection = ({ title, icon: Icon, children }) => (
    <div className="card">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border-color">
        {Icon && <Icon size={16} className="text-accent-primary" />}
        <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );

  // Bar Chart Component
  const SimpleBarChart = ({ data, keyField, valueField, maxValue }) => {
    const max = maxValue || Math.max(...data.map(d => d[valueField]), 1);
    return (
      <div className="flex gap-3 h-48 items-end">
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-1 group">
            <div className="relative h-full w-full bg-border-color/30 rounded-t-lg overflow-hidden flex items-end justify-center">
              <div
                className="w-full bg-gradient-to-t from-accent-primary to-accent-primary/50 rounded-t-lg transition-all group-hover:opacity-80"
                style={{ height: `${(item[valueField] / max) * 100}%`, minHeight: '4px' }}
              />
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-card-hover px-2 py-1 rounded text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item[valueField]}
              </div>
            </div>
            <span className="text-xs font-bold text-muted text-center truncate w-full px-1">{item[keyField]}</span>
          </div>
        ))}
      </div>
    );
  };

  // Pie Chart Component
  const PieChartComponent = ({ data, dataKey, nameKey }) => {
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    const colors = ['from-accent-primary', 'from-success', 'from-warning', 'from-danger', 'from-info'];
    
    return (
      <div className="flex flex-col sm:flex-row gap-6 items-center">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {Object.entries(data).map(([key, value], idx) => {
              const percentage = (value / total) * 100;
              const radius = 30;
              const startAngle = Object.entries(data).slice(0, idx).reduce((sum, [, v]) => sum + (v / total) * 360, 0);
              const endAngle = startAngle + percentage * 3.6;
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;
              const x1 = 50 + radius * Math.cos(startRad);
              const y1 = 50 + radius * Math.sin(startRad);
              const x2 = 50 + radius * Math.cos(endRad);
              const y2 = 50 + radius * Math.sin(endRad);
              const largeArc = percentage > 50 ? 1 : 0;

              return (
                <path
                  key={idx}
                  d={`M 50 50 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={`hsl(${idx * 70}, 70%, 60%)`}
                  opacity="0.8"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs font-bold text-muted">Total</p>
              <p className="text-lg font-black text-primary">{total}</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {Object.entries(data).map(([key, value], idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${idx * 70}, 70%, 60%)` }} />
              <span className="text-xs font-bold text-secondary">{key}</span>
              <span className="text-xs font-bold text-primary">{value} ({((value / total) * 100).toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Tab Navigation
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'salary', label: 'Salary Analysis', icon: Award },
    { id: 'demographics', label: 'Demographics', icon: Users },
    { id: 'interviews', label: 'Interviews', icon: Briefcase },
    { id: 'trends', label: 'Trends', icon: LineChart },
    { id: 'eligibility', label: 'Eligibility', icon: CheckCircle },
    { id: 'locations', label: 'Locations', icon: MapPin },
  ];

  return (
    <div className="dash-page animate-in">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-border-color pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ background: 'linear-gradient(95deg, var(--text-primary) 30%, var(--accent-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Comprehensive Placement Dashboard
          </h1>
          <p className="text-sm text-secondary font-medium mt-1">Complete KPI analytics with multi-dimensional insights</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm flex items-center gap-2">
            <Download size={14} /> Export
          </button>
          <button className="btn btn-secondary btn-sm flex items-center gap-2">
            <Filter size={14} /> Filter
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b border-border-color">
        {tabs.map(tab => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 font-bold text-sm uppercase tracking-wider whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'text-accent-primary border-b-2 border-accent-primary'
                  : 'text-muted hover:text-secondary'
              }`}
            >
              <TabIcon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard
              title="Total Students"
              value={stats?.overview?.total_students || 0}
              icon={Users}
            />
            <KPICard
              title="Placed Students"
              value={stats?.overview?.placed_students || 0}
              subtitle={`${stats?.overview?.placement_rate || 0}% placement rate`}
              icon={CheckCircle}
              color="success"
              bgColor="bg-success/10"
            />
            <KPICard
              title="Companies"
              value={stats?.overview?.total_companies || 0}
              subtitle="Active recruiters"
              icon={Building}
              color="info"
              bgColor="bg-info/10"
            />
            <KPICard
              title="Applications"
              value={stats?.overview?.total_applications || 0}
              subtitle="Total submitted"
              icon={Briefcase}
              color="warning"
              bgColor="bg-warning/10"
            />
            <KPICard
              title="Avg Package"
              value={`₹${stats?.salary_analysis?.avg_package || 0}`}
              subtitle="LPA"
              icon={Award}
              color="accent-primary"
              bgColor="bg-accent-soft"
            />
          </div>

          {/* Application Status & Salary Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSection title="Application Status Distribution" icon={PieChart}>
              <PieChartComponent data={stats?.application_status?.application_status || {}} />
            </ChartSection>

            <ChartSection title="Salary Distribution (LPA)" icon={BarChart3}>
              <PieChartComponent data={stats?.salary_analysis?.salary_distribution || {}} />
            </ChartSection>
          </div>

          {/* Course & Semester Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSection title="Placement Rate by Course" icon={BarChart3}>
              {stats?.course_performance && stats.course_performance.length > 0 ? (
                <SimpleBarChart
                  data={stats.course_performance}
                  keyField="course"
                  valueField="placement_rate"
                  maxValue={100}
                />
              ) : (
                <p className="text-muted text-sm">No course data available</p>
              )}
            </ChartSection>

            <ChartSection title="Semester-wise Statistics" icon={BarChart3}>
              {stats?.semester_stats && stats.semester_stats.length > 0 ? (
                <SimpleBarChart
                  data={stats.semester_stats}
                  keyField="semester"
                  valueField="placed"
                />
              ) : (
                <p className="text-muted text-sm">No semester data available</p>
              )}
            </ChartSection>
          </div>
        </div>
      )}

      {/* SALARY ANALYSIS TAB */}
      {activeTab === 'salary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPICard
              title="Highest Package"
              value={`₹${stats?.salary_analysis?.highest_package || 0}`}
              subtitle="LPA"
              icon={TrendingUp}
              color="success"
              bgColor="bg-success/10"
            />
            <KPICard
              title="Lowest Package"
              value={`₹${stats?.salary_analysis?.lowest_package || 0}`}
              subtitle="LPA"
              icon={TrendingUp}
              color="warning"
              bgColor="bg-warning/10"
            />
            <KPICard
              title="Average Package"
              value={`₹${stats?.salary_analysis?.avg_package || 0}`}
              subtitle="LPA"
              icon={Award}
            />
            <KPICard
              title="Median Package"
              value={`₹${stats?.salary_analysis?.median_package || 0}`}
              subtitle="LPA"
              icon={BarChart3}
              color="info"
              bgColor="bg-info/10"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSection title="Salary Distribution by Brackets" icon={PieChart}>
              <PieChartComponent data={stats?.salary_analysis?.salary_distribution || {}} />
            </ChartSection>

            <ChartSection title="Salary Bands (LPA Range)" icon={BarChart3}>
              {stats?.salary_analysis?.salary_bands ? (
                <SimpleBarChart
                  data={Object.entries(stats.salary_analysis.salary_bands).map(([band, count]) => ({
                    band,
                    count
                  }))}
                  keyField="band"
                  valueField="count"
                />
              ) : (
                <p className="text-muted text-sm">No salary band data</p>
              )}
            </ChartSection>
          </div>

          <ChartSection title="Salary by Course" icon={BarChart3}>
            {stats?.course_performance ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-color">
                      <th className="text-left py-2 px-2 font-bold text-muted">Course</th>
                      <th className="text-right py-2 px-2 font-bold text-muted">Avg Salary</th>
                      <th className="text-right py-2 px-2 font-bold text-muted">Placed</th>
                      <th className="text-right py-2 px-2 font-bold text-muted">Placement Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.course_performance.map((course, idx) => (
                      <tr key={idx} className="border-b border-border-color hover:bg-card-hover">
                        <td className="py-2 px-2 font-bold text-primary">{course.course}</td>
                        <td className="text-right py-2 px-2 text-secondary">₹{course.avg_salary} LPA</td>
                        <td className="text-right py-2 px-2 text-secondary">{course.placed}/{course.total}</td>
                        <td className="text-right py-2 px-2 font-bold text-accent-primary">{course.placement_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted text-sm">No salary by course data</p>
            )}
          </ChartSection>
        </div>
      )}

      {/* DEMOGRAPHICS TAB */}
      {activeTab === 'demographics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPICard
              title="Avg CGPA"
              value={(stats?.student_demographics?.cgpa_stats?.avg_cgpa || 0).toFixed(2)}
              subtitle={`Range: ${stats?.student_demographics?.cgpa_stats?.min_cgpa || 0} - ${stats?.student_demographics?.cgpa_stats?.max_cgpa || 0}`}
              icon={Award}
            />
            <KPICard
              title="Avg Attendance"
              value={`${stats?.student_demographics?.attendance_stats?.avg_attendance || 0}%`}
              subtitle="Average attendance"
              icon={Calendar}
              color="success"
              bgColor="bg-success/10"
            />
            <KPICard
              title="With Backlogs"
              value={stats?.student_demographics?.backlog_analysis?.with_backlogs || 0}
              subtitle="Students"
              icon={AlertCircle}
              color="danger"
              bgColor="bg-danger/10"
            />
            <KPICard
              title="Without Backlogs"
              value={stats?.student_demographics?.backlog_analysis?.without_backlogs || 0}
              subtitle="Students"
              icon={CheckCircle}
              color="success"
              bgColor="bg-success/10"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartSection title="CGPA Distribution" icon={PieChart}>
              <PieChartComponent data={stats?.student_demographics?.cgpa_distribution || {}} />
            </ChartSection>

            <ChartSection title="Category Distribution" icon={PieChart}>
              <PieChartComponent data={stats?.student_demographics?.category_distribution || {}} />
            </ChartSection>

            <ChartSection title="Backlog Status" icon={PieChart}>
              <PieChartComponent data={{
                'With Backlogs': stats?.student_demographics?.backlog_analysis?.with_backlogs || 0,
                'Without Backlogs': stats?.student_demographics?.backlog_analysis?.without_backlogs || 0
              }} />
            </ChartSection>
          </div>

          <ChartSection title="Year-wise Statistics" icon={BarChart3}>
            {stats?.year_wise_stats && stats.year_wise_stats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-color">
                      <th className="text-left py-2 px-2 font-bold text-muted">Year</th>
                      <th className="text-right py-2 px-2 font-bold text-muted">Total Students</th>
                      <th className="text-right py-2 px-2 font-bold text-muted">Placed</th>
                      <th className="text-right py-2 px-2 font-bold text-muted">Placement Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.year_wise_stats.map((year, idx) => (
                      <tr key={idx} className="border-b border-border-color hover:bg-card-hover">
                        <td className="py-2 px-2 font-bold text-primary">{year.year}</td>
                        <td className="text-right py-2 px-2 text-secondary">{year.total}</td>
                        <td className="text-right py-2 px-2 text-secondary">{year.placed}</td>
                        <td className="text-right py-2 px-2 font-bold text-accent-primary">{year.placement_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted text-sm">No year-wise data</p>
            )}
          </ChartSection>
        </div>
      )}

      {/* INTERVIEWS TAB */}
      {activeTab === 'interviews' && (
        <div className="space-y-6">
          <ChartSection title="Interview Round Performance" icon={Briefcase}>
            {stats?.interview_rounds?.round_performance && stats.interview_rounds.round_performance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-color">
                      <th className="text-left py-2 px-2 font-bold text-muted">Round</th>
                      <th className="text-right py-2 px-2 font-bold text-muted">Total</th>
                      <th className="text-right py-2 px-2 font-bold text-muted">Cleared</th>
                      <th className="text-right py-2 px-2 font-bold text-muted">Failed</th>
                      <th className="text-right py-2 px-2 font-bold text-muted">Clearance Rate</th>
                      <th className="text-right py-2 px-2 font-bold text-muted">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.interview_rounds.round_performance.map((round, idx) => (
                      <tr key={idx} className="border-b border-border-color hover:bg-card-hover">
                        <td className="py-2 px-2 font-bold text-primary">Round {round.round_number}</td>
                        <td className="text-right py-2 px-2 text-secondary">{round.total_applications}</td>
                        <td className="text-right py-2 px-2 text-success font-bold">{round.cleared}</td>
                        <td className="text-right py-2 px-2 text-danger font-bold">{round.failed}</td>
                        <td className="text-right py-2 px-2 font-bold text-accent-primary">{round.clearance_rate}%</td>
                        <td className="text-right py-2 px-2 text-secondary">{round.avg_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted text-sm">No interview round data</p>
            )}
          </ChartSection>

          <ChartSection title="Interview Round Types" icon={PieChart}>
            <PieChartComponent data={stats?.interview_rounds?.round_types || {}} />
          </ChartSection>
        </div>
      )}

      {/* TRENDS TAB */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <ChartSection title="Monthly Placements Trend" icon={LineChart}>
            {stats?.timeline_trends?.monthly_placements && stats.timeline_trends.monthly_placements.length > 0 ? (
              <SimpleBarChart
                data={stats.timeline_trends.monthly_placements}
                keyField="month"
                valueField="placed_count"
              />
            ) : (
              <p className="text-muted text-sm">No monthly data</p>
            )}
          </ChartSection>

          <ChartSection title="Application Timeline" icon={LineChart}>
            {stats?.timeline_trends?.application_timeline && stats.timeline_trends.application_timeline.length > 0 ? (
              <SimpleBarChart
                data={stats.timeline_trends.application_timeline}
                keyField="month"
                valueField="applications"
              />
            ) : (
              <p className="text-muted text-sm">No application timeline data</p>
            )}
          </ChartSection>
        </div>
      )}

      {/* ELIGIBILITY TAB */}
      {activeTab === 'eligibility' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KPICard
              title="Eligible Students"
              value={stats?.eligibility?.eligible_students || 0}
              subtitle="Meeting all requirements"
              icon={CheckCircle}
              color="success"
              bgColor="bg-success/10"
            />
            <KPICard
              title="Ineligible Students"
              value={(stats?.overview?.total_students || 0) - (stats?.eligibility?.eligible_students || 0)}
              subtitle="Not meeting criteria"
              icon={AlertCircle}
              color="danger"
              bgColor="bg-danger/10"
            />
          </div>

          <ChartSection title="Ineligibility Reasons" icon={Info}>
            <PieChartComponent data={stats?.eligibility?.ineligible_reasons || {}} />
          </ChartSection>
        </div>
      )}

      {/* LOCATIONS TAB */}
      {activeTab === 'locations' && (
        <div className="space-y-6">
          <ChartSection title="Jobs by Location" icon={MapPin}>
            {stats?.location_analysis && stats.location_analysis.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-color">
                      <th className="text-left py-2 px-2 font-bold text-muted">Location</th>
                      <th className="text-right py-2 px-2 font-bold text-muted">Job Count</th>
                      <th className="text-right py-2 px-2 font-bold text-muted">Avg Salary</th>
                      <th className="text-right py-2 px-2 font-bold text-muted">Max Salary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.location_analysis.map((loc, idx) => (
                      <tr key={idx} className="border-b border-border-color hover:bg-card-hover">
                        <td className="py-2 px-2 font-bold text-primary">{loc.location}</td>
                        <td className="text-right py-2 px-2 text-secondary">{loc.job_count}</td>
                        <td className="text-right py-2 px-2 text-secondary">₹{loc.avg_salary} LPA</td>
                        <td className="text-right py-2 px-2 font-bold text-success">₹{loc.max_salary} LPA</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted text-sm">No location data</p>
            )}
          </ChartSection>
        </div>
      )}

      {/* Company Analysis Section (Always Visible) */}
      <div className="mt-8">
        <ChartSection title="Top Companies by Placements" icon={Building}>
          {stats?.company_analysis?.top_companies && stats.company_analysis.top_companies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-color">
                    <th className="text-left py-2 px-2 font-bold text-muted">Company</th>
                    <th className="text-right py-2 px-2 font-bold text-muted">Placements</th>
                    <th className="text-right py-2 px-2 font-bold text-muted">Max Package</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.company_analysis.top_companies.map((company, idx) => (
                    <tr key={idx} className="border-b border-border-color hover:bg-card-hover">
                      <td className="py-2 px-2 font-bold text-primary">{company.company_name}</td>
                      <td className="text-right py-2 px-2 text-secondary">{company.placed_count}</td>
                      <td className="text-right py-2 px-2 font-bold text-success">₹{company.max_package} LPA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted text-sm">No company data</p>
          )}
        </ChartSection>
      </div>

      {/* Job Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ChartSection title="Jobs by Type" icon={PieChart}>
          <PieChartComponent data={stats?.job_distribution?.by_job_type || {}} />
        </ChartSection>

        <ChartSection title="Jobs by Listing Type" icon={PieChart}>
          <PieChartComponent data={stats?.job_distribution?.by_listing_type || {}} />
        </ChartSection>
      </div>
    </div>
  );
}
