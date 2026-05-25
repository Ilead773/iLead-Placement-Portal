// src/pages/admin/Assignments.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api/axios';

const STATUS_BADGE = { assigned: 'badge-info', applied: 'badge-neutral', shortlisted: 'badge-warning', rejected: 'badge-danger', selected: 'badge-success' };

export default function Assignments() {
  const [placements, setPlacements] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null); // placement id
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, aRes] = await Promise.all([api.get('/placements/'), api.get('/assignments/')]);
      setPlacements(pRes.data || []);
      setAssignments(aRes.data || []);
    } catch { /* */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const openAssignModal = async (placementId) => {
    try {
      const { data } = await api.get('/students/?limit=500');
      setStudents(data.results || []);
    } catch { /* */ }
    setSelectedStudents([]);
    setShowAssignModal(placementId);
  };

  const handleAssign = async () => {
    if (!selectedStudents.length || !showAssignModal) return;
    try {
      const { data } = await api.post(`/placements/${showAssignModal}/assign-students/`, { student_ids: selectedStudents });
      showToast(`${data.assigned} students assigned.${data.duplicates ? ` (${data.duplicates} already assigned)` : ''}`);
      setShowAssignModal(null);
      fetchAll();
    } catch (err) { showToast(err.response?.data?.error || 'Assignment failed.', 'error'); }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/assignments/${id}/status/`, { status: newStatus });
      showToast(`Status updated to ${newStatus}.`);
      fetchAll();
    } catch (err) { showToast(err.response?.data?.error || 'Update failed.', 'error'); }
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get('/dashboard/reports/');
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = data.filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Report exported!');
    } catch { showToast('Export failed.', 'error'); }
  };

  const toggleStudent = (id) => setSelectedStudents((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const filtered = statusFilter ? assignments.filter((a) => a.status === statusFilter) : assignments;

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Assignments ({filtered.length})</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="input-field" style={{ maxWidth: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {['assigned', 'applied', 'shortlisted', 'rejected', 'selected'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={handleExport}>📥 Export Report</button>
        </div>
      </div>

      {/* Quick assign buttons by placement */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Assign Students to Placement</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {placements.map((p) => (
            <button key={p.id} className="btn btn-secondary btn-sm" onClick={() => openAssignModal(p.id)}>
              {p.company_name} — {p.position}
            </button>
          ))}
          {placements.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Create placements first.</p>}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead><tr><th>Student</th><th>Reg No</th><th>Course</th><th>CGPA</th><th>Company</th><th>Position</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>{a.student_name}</td>
                <td>{a.student_reg}</td>
                <td>{a.student_course || '—'}</td>
                <td>{a.student_cgpa != null ? a.student_cgpa.toFixed(2) : '—'}</td>
                <td>{a.company_name}</td>
                <td>{a.position}</td>
                <td><span className={`badge ${STATUS_BADGE[a.status]}`}>{a.status}</span></td>
                <td>
                  <select className="input-field" style={{ maxWidth: 130, fontSize: '0.78rem', padding: '4px 6px' }} value={a.status} onChange={(e) => updateStatus(a.id, e.target.value)}>
                    {['assigned', 'applied', 'shortlisted', 'rejected', 'selected'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No assignments.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header"><h2>Assign Students</h2><button className="modal-close" onClick={() => setShowAssignModal(null)}>×</button></div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 12, fontSize: '0.85rem' }}>Select students to assign ({selectedStudents.length} selected)</p>
            <div style={{ maxHeight: 350, overflow: 'auto' }}>
              <table>
                <thead><tr><th style={{ width: 32 }}></th><th>Name</th><th>Reg No</th><th>Course</th><th>CGPA</th></tr></thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} onClick={() => toggleStudent(s.id)} style={{ cursor: 'pointer' }}>
                      <td><input type="checkbox" checked={selectedStudents.includes(s.id)} readOnly /></td>
                      <td>{s.name}</td>
                      <td>{s.registration_number}</td>
                      <td>{s.course || '—'}</td>
                      <td>{s.cgpa != null ? s.cgpa.toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setShowAssignModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!selectedStudents.length} onClick={handleAssign}>Assign {selectedStudents.length} Students</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
