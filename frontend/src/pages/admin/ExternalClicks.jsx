import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { MousePointerClick, Search, Building2, User, ExternalLink, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

export default function ExternalClicks() {
  const navigate = useNavigate();
  const [clicks, setClicks] = useState([]);
  const [userStats, setUserStats] = useState([]);
  const [domainStats, setDomainStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('clicks'); // clicks | selected

  // Confirmation Modal State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmType, setConfirmType] = useState('danger');
  const [onConfirmAction, setOnConfirmAction] = useState(null);

  // Off-Campus Selection Form Modal State
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const [selectedClickLog, setSelectedClickLog] = useState(null);
  const [selectionListingType, setSelectionListingType] = useState('job');
  const [selectionPackage, setSelectionPackage] = useState('');

  const triggerConfirm = (title, message, action, type = 'danger') => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setOnConfirmAction(() => action);
    setConfirmType(type);
    setConfirmOpen(true);
  };

  const fetchClickLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin-ops/external-clicks/?search=${search}`);
      setClicks(data.clicks || []);
      setUserStats(data.user_stats || []);
      setDomainStats(data.domain_stats || []);
    } catch (error) {
      console.error('Failed to load clicks logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSelected = (click) => {
    if (click.is_marked_selected) {
      toast.success('Already marked as selected.');
      setActiveTab('selected');
      return;
    }
    setSelectedClickLog(click);
    setSelectionListingType('job');
    setSelectionPackage('');
    setSelectionModalOpen(true);
  };

  const handleConfirmSelection = async (e) => {
    if (e) e.preventDefault();
    if (!selectedClickLog) return;
    
    if (!selectionPackage || isNaN(parseFloat(selectionPackage)) || parseFloat(selectionPackage) < 0) {
      toast.error('Please enter a valid numeric compensation amount.');
      return;
    }

    const toastId = toast.loading('Marking student as selected...');
    try {
      const response = await api.post(`/admin-ops/external-clicks/${selectedClickLog.id}/mark-selected/`, {
        listing_type: selectionListingType,
        package: parseFloat(selectionPackage)
      });
      toast.success(response.data.message || 'Student successfully placed off-campus! 🏆', { id: toastId });

      setClicks(prev =>
        prev.map(c => (c.id === selectedClickLog.id ? { 
          ...c, 
          is_marked_selected: true, 
          marked_selected_at: response.data.marked_selected_at || new Date().toISOString(),
          package: parseFloat(selectionPackage),
          listing_type: selectionListingType
        } : c))
      );
      setSelectionModalOpen(false);
      setSelectedClickLog(null);
      setActiveTab('selected');
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.error || 'Failed to complete off-campus selection.';
      toast.error(errorMsg, { id: toastId });
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchClickLogs();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  const totalClicks = clicks.length;
  const liveClicks = clicks.filter(c => !c.is_marked_selected);
  const selectedClicks = clicks.filter(c => c.is_marked_selected);
  const shownClicks = activeTab === 'selected' ? selectedClicks : liveClicks;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>External Job Tracker</h1>
          <p className="subtitle">Track outbound apply clicks to external job boards and company sites</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: 20 }}>
        <div className="card metric-card accent">
          <span className="metric-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Total Outbound Clicks</span>
          <span className="metric-value" style={{ color: 'white' }}>{totalClicks}</span>
        </div>
        <div className="card metric-card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <span className="metric-label">Unique Students Active</span>
          <span className="metric-value">{userStats.length}</span>
        </div>
        <div className="card metric-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <span className="metric-label">Target Companies</span>
          <span className="metric-value">{domainStats.length}</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="search-bar" style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div className="input-with-icon" style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search by student name, login ID, company, or job title..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>
        <button className="btn btn-primary" onClick={fetchClickLogs}>Refresh</button>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid md:grid-cols-2 gap-6" style={{ marginBottom: 24 }}>
        {/* Top Active Students */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingUp size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3>Most Active Students</h3>
          </div>
          <div className="table-container" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Reg No</th>
                  <th style={{ textAlign: 'right' }}>Clicks</th>
                </tr>
              </thead>
              <tbody>
                {userStats.slice(0, 5).map((stat, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{stat.user__student_profile__name || stat.user__login_id}</td>
                    <td>{stat.user__student_profile__registration_number || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{stat.total_clicks} Clicks</td>
                  </tr>
                ))}
                {userStats.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center" style={{ color: 'var(--text-muted)', padding: '20px 0' }}>No active clicks recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Destination Sites */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Building2 size={20} style={{ color: 'var(--success)' }} />
            <h3>Top Companies Clicked</h3>
          </div>
          <div className="table-container" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Company / Site</th>
                  <th style={{ textAlign: 'right' }}>Clicks</th>
                </tr>
              </thead>
              <tbody>
                {domainStats.slice(0, 5).map((stat, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{stat.company_name || 'External link'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>{stat.total_clicks} Clicks</td>
                  </tr>
                ))}
                {domainStats.length === 0 && (
                  <tr>
                    <td colSpan={2} className="text-center" style={{ color: 'var(--text-muted)', padding: '20px 0' }}>No clicks recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Raw Outbound Log Table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <MousePointerClick size={20} style={{ color: 'var(--accent-primary)' }} />
          <h3>{activeTab === 'selected' ? 'Marked Selected (Off-Campus)' : 'Live Outbound Click Log'}</h3>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab('clicks')}
            style={{
              fontWeight: 800,
              borderRadius: 999,
              opacity: activeTab === 'clicks' ? 1 : 0.7,
              border: activeTab === 'clicks' ? '1px solid var(--accent-primary)' : undefined
            }}
          >
            Live Clicks ({liveClicks.length})
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab('selected')}
            style={{
              fontWeight: 800,
              borderRadius: 999,
              opacity: activeTab === 'selected' ? 1 : 0.7,
              border: activeTab === 'selected' ? '1px solid var(--accent-primary)' : undefined
            }}
          >
            Marked Selected ({selectedClicks.length})
          </button>
        </div>
        
        {loading ? (
          <div className="loading-state">Loading logs...</div>
        ) : (
          <div className="table-container" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Reg No</th>
                  <th>Job Title</th>
                  <th>Company</th>
                  <th>Link</th>
                  {activeTab === 'selected' && <th>Compensation</th>}
                  <th style={{ textAlign: 'center' }}>Clicks</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shownClicks.map((click) => (
                  <tr key={click.id}>
                    <td style={{ fontWeight: 600 }}>{click.student_name || click.user_login}</td>
                    <td style={{ fontSize: '0.82rem' }}>{click.student_reg || '—'}</td>
                    <td>{click.job_title || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{click.company_name || 'External'}</td>
                    <td>
                      <a 
                        href={click.external_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}
                      >
                        Visit Site <ExternalLink size={12} />
                      </a>
                    </td>
                    {activeTab === 'selected' && (
                      <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                        {click.package ? (
                          click.listing_type === 'internship' 
                            ? `₹${Number(click.package).toLocaleString()}/month` 
                            : `${click.package} LPA`
                        ) : '—'}
                      </td>
                    )}
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                      {click.click_count || 1}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} />
                        {new Date(click.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {activeTab === 'clicks' ? (
                        <button
                        onClick={() => handleMarkSelected(click)}
                        className="btn btn-primary"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
                          border: 'none',
                          color: 'white',
                          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)'
                        }}
                      >
                        🏅 Mark Selected
                      </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                          <span className="badge badge-success">Selected</span>
                          <button
                            onClick={() => {
                              setSelectedClickLog(click);
                              setSelectionListingType(click.listing_type || 'job');
                              setSelectionPackage(click.package ? String(click.package) : '');
                              setSelectionModalOpen(true);
                            }}
                            className="btn btn-secondary"
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.7rem',
                              borderRadius: '4px',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              lineHeight: 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                          >
                            ✏️ Edit Info
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {shownClicks.length === 0 && (
                  <tr>
                    <td colSpan={activeTab === 'selected' ? 9 : 8} className="text-center" style={{ padding: 40, color: 'var(--text-muted)' }}>
                      {activeTab === 'selected' ? 'No clicks have been marked selected yet.' : 'No click records found matching search filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Off-Campus Selection Form Modal */}
      {selectionModalOpen && selectedClickLog && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
            fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)'
          }}
        >
          {/* Backdrop */}
          <div 
            onClick={() => setSelectionModalOpen(false)}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              transition: 'opacity 0.2s ease-in-out'
            }}
          />
          
          {/* Modal Card */}
          <form 
            onSubmit={handleConfirmSelection}
            style={{
              position: 'relative',
              backgroundColor: 'var(--bg-card, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.05)',
              padding: '24px',
              overflow: 'hidden',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* Top visual accent */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '5px',
                background: 'linear-gradient(to right, #2563eb, #1d4ed8)'
              }}
            />

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '8px' }}>
              <div 
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  color: 'var(--accent-primary, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <TrendingUp size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Mark Off-Campus Selection
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Record placement details for {selectedClickLog.student_name || selectedClickLog.student_reg || selectedClickLog.user_login}
                </p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <div className="input-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>
                  Selection Type
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectionListingType('job')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid ' + (selectionListingType === 'job' ? 'var(--accent-primary)' : 'var(--border-color)'),
                      backgroundColor: selectionListingType === 'job' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                      color: selectionListingType === 'job' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    💼 Job / Full-Time
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectionListingType('internship')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid ' + (selectionListingType === 'internship' ? 'var(--accent-primary)' : 'var(--border-color)'),
                      backgroundColor: selectionListingType === 'internship' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                      color: selectionListingType === 'internship' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    🎓 Internship
                  </button>
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>
                  {selectionListingType === 'job' ? 'Annual CTC Package (LPA)' : 'Monthly Stipend Amount (₹)'}
                </label>
                <input
                  required
                  type="number"
                  step="any"
                  min="0"
                  className="input-field"
                  placeholder={selectionListingType === 'job' ? 'E.g. 6.5 (for 6.5 LPA)' : 'E.g. 25000 (for 25k/mo)'}
                  value={selectionPackage}
                  onChange={(e) => setSelectionPackage(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Warning Message */}
            <div 
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.78rem',
                color: '#d97706',
                lineHeight: 1.4
              }}
            >
              <strong>Important:</strong> This will create a shadow off-campus placement record with the specified compensation and send a placement congratulatory notification to the student.
            </div>

            {/* Action Buttons */}
            <div 
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-color)'
              }}
            >
              <button
                type="button"
                onClick={() => setSelectionModalOpen(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  fontWeight: '700',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                  transition: 'all 0.2s'
                }}
              >
                Confirm Placement
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        type={confirmType}
        onConfirm={() => {
          if (onConfirmAction) onConfirmAction();
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
