import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';
import { ILEAD_COURSES } from '../../constants/courses';

const getFullImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  const hostBase = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${hostBase}${cleanPath}`;
};

// Helper function to get year from semester (each year has 2 semesters)
const getYearFromSemester = (semester) => {
  if (!semester) return null;
  const sem = parseInt(semester);
  if (sem <= 2) return 'Year 1';
  if (sem <= 4) return 'Year 2';
  if (sem <= 6) return 'Year 3';
  if (sem <= 8) return 'Year 4';
  return null;
};

// Helper function to format year/semester display
const formatYearSem = (year, semester) => {
  if (year && semester) {
    return `${year} / Sem ${semester}`;
  }
  if (year) return year;
  if (semester) {
    const derivedYear = getYearFromSemester(semester);
    return derivedYear ? `${derivedYear} / Sem ${semester}` : `Sem ${semester}`;
  }
  return '—';
};

export default function Students() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedLogSummary, setSelectedLogSummary] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const { user } = useAuthStore();

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteWarning, setDeleteWarning] = useState(null);
  const [bypassForceDelete, setBypassForceDelete] = useState(false);
  const [confirmToggleAccess, setConfirmToggleAccess] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('academics');
  const [studentSessions, setStudentSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    registration_number: '',
    email: '',
    phone_number: '',
    course: '',
    stream: '',
    semester: '',
    year: '',
    passing_year: '',
    cgpa: '',
    attendance: '',
    training_attendance: '',
    backlogs_count: '',
    category: ''
  });

  useEffect(() => {
    if (selectedStudent) {
      setEditForm({
        name: selectedStudent.name || '',
        registration_number: selectedStudent.registration_number || '',
        email: selectedStudent.email || '',
        phone_number: selectedStudent.phone_number || '',
        course: selectedStudent.course || '',
        stream: selectedStudent.stream || '',
        semester: selectedStudent.semester ?? '',
        year: selectedStudent.year || '',
        passing_year: selectedStudent.passing_year ?? '',
        cgpa: selectedStudent.cgpa ?? '',
        attendance: selectedStudent.attendance ?? '',
        training_attendance: selectedStudent.training_attendance ?? '',
        backlogs_count: selectedStudent.backlogs_count ?? '',
        category: selectedStudent.is_category_manual ? selectedStudent.category : 'auto'
      });
    }
  }, [selectedStudent, activeModalTab]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put(`/students/${selectedStudent.id}/`, editForm);
      showToast('Student details updated successfully!');
      setSelectedStudent(data.student);
      setActiveModalTab('academics');
      fetchStudents(page);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to update student details.';
      showToast(errMsg, 'error');
    }
  };

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const [availableCourses, setAvailableCourses] = useState([]);
  const [availableStreams, setAvailableStreams] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [courseStreamMap, setCourseStreamMap] = useState({});

  const fetchFilterMetadata = useCallback(async () => {
    try {
      const { data } = await api.get('/students/filters/');
      setAvailableCourses(data.courses || []);
      setAvailableStreams(data.streams || []);
      setAvailableYears(data.years || []);
      setAvailableSemesters(data.semesters || []);
      setAvailableCategories(data.categories || []);
      setCourseStreamMap(data.course_stream_map || {});
    } catch (err) {
      console.error('Failed to load filter metadata:', err);
    }
  }, []);

  const handleCourseChange = (courseValue) => {
    setFilters(prev => ({
      ...prev,
      course: courseValue,
      stream: '' // Reset stream on course change to avoid mismatch
    }));
  };

  const getFilteredStreams = () => {
    if (filters.course && courseStreamMap[filters.course]) {
      return courseStreamMap[filters.course];
    }
    return availableStreams;
  };

  const handleYearChange = (yearValue) => {
    let nextSem = filters.semester;
    if (yearValue === '1st' && !['1', '2'].includes(filters.semester)) nextSem = '';
    if (yearValue === '2nd' && !['3', '4'].includes(filters.semester)) nextSem = '';
    if (yearValue === '3rd' && !['5', '6'].includes(filters.semester)) nextSem = '';
    if (yearValue === '4th' && !['7', '8'].includes(filters.semester)) nextSem = '';

    setFilters(prev => ({
      ...prev,
      year: yearValue,
      semester: nextSem
    }));
  };

  const handleSemesterChange = (semValue) => {
    let autoYear = filters.year;
    if (['1', '2'].includes(semValue)) autoYear = '1st';
    else if (['3', '4'].includes(semValue)) autoYear = '2nd';
    else if (['5', '6'].includes(semValue)) autoYear = '3rd';
    else if (['7', '8'].includes(semValue)) autoYear = '4th';

    setFilters(prev => ({
      ...prev,
      semester: semValue,
      year: autoYear
    }));
  };

  const getFilteredSemesters = () => {
    const allSems = [
      { val: '1', label: 'Semester 1' },
      { val: '2', label: 'Semester 2' },
      { val: '3', label: 'Semester 3' },
      { val: '4', label: 'Semester 4' },
      { val: '5', label: 'Semester 5' },
      { val: '6', label: 'Semester 6' },
      { val: '7', label: 'Semester 7' },
      { val: '8', label: 'Semester 8' },
    ];
    const semsWithCounts = allSems.map(s => {
      const match = availableSemesters.find(as => as.name === s.val);
      const count = match ? match.count : 0;
      return { val: s.val, label: `${s.label} (${count})` };
    });
    if (filters.year === '1st') return semsWithCounts.filter(s => ['1', '2'].includes(s.val));
    if (filters.year === '2nd') return semsWithCounts.filter(s => ['3', '4'].includes(s.val));
    if (filters.year === '3rd') return semsWithCounts.filter(s => ['5', '6'].includes(s.val));
    if (filters.year === '4th') return semsWithCounts.filter(s => ['7', '8'].includes(s.val));
    return semsWithCounts;
  };

  const getYearCount = (yearKey) => {
    const match = availableYears.find(ay => ay.name === yearKey);
    return match ? match.count : 0;
  };

  const getCategoryCount = (catKey) => {
    const match = availableCategories.find(ac => ac.name === catKey);
    return match ? match.count : 0;
  };


  const [filters, setFilters] = useState({ 
    year: '', 
    category: '', 
    backlogs: '',
    course: '',
    stream: '',
    semester: '',
    cgpaRange: '',
    trainingRange: ''
  });

  const fetchStudentProfile = async (studentId) => {
    setProfileLoading(true);
    try {
      const { data } = await api.get(`/students/${studentId}/`);
      setSelectedStudent(data);
      setActiveModalTab('academics');
    } catch {
      showToast('Failed to load student profile.', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCategoryChange = async (studentId, newCategory) => {
    try {
      const { data } = await api.post(`/students/${studentId}/change-category/`, { category: newCategory });
      showToast('Student category updated successfully!');
      
      // Update selectedStudent in state so modal updates instantly
      setSelectedStudent(prev => prev ? {
        ...prev,
        category: data.category,
        is_category_manual: data.is_category_manual
      } : null);
      
      // Refresh the main student list too
      fetchStudents(page);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to update student category.';
      showToast(errMsg, 'error');
    }
  };

  const fetchStudentSessions = async (studentId) => {
    setSessionsLoading(true);
    setStudentSessions([]);
    setSelectedSessionDetail(null);
    try {
      const { data } = await api.get(`/interviews/sessions/?student_id=${studentId}`);
      setStudentSessions(data || []);
    } catch {
      showToast('Failed to load mock interview sessions.', 'error');
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchSessionDetail = async (sessionId) => {
    setDetailLoading(true);
    setSelectedSessionDetail(null);
    try {
      const { data } = await api.get(`/interviews/sessions/${sessionId}/`);
      setSelectedSessionDetail(data);
    } catch {
      showToast('Failed to load interview feedback details.', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (activeModalTab === 'mock_interviews' && selectedStudent) {
      fetchStudentSessions(selectedStudent.id);
    }
  }, [activeModalTab, selectedStudent]);

  const fetchStudents = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 20 });
      if (search) params.set('search', search);
      if (filters.year) params.set('year', filters.year);
      if (filters.category) params.set('category', filters.category);
      if (filters.backlogs) params.set('backlogs', filters.backlogs);
      if (filters.course) params.set('course', filters.course);
      if (filters.stream) params.set('stream', filters.stream);
      if (filters.semester) params.set('semester', filters.semester);
      
      if (filters.cgpaRange) {
        if (filters.cgpaRange === 'high') {
          params.set('cgpa_min', '8.0');
        } else if (filters.cgpaRange === 'medium') {
          params.set('cgpa_min', '6.5');
        } else if (filters.cgpaRange === 'low') {
          params.set('cgpa_max', '5.0');
        }
      }

      if (filters.trainingRange) {
        if (filters.trainingRange === 'perfect') {
          params.set('training_attendance_min', '100');
        } else if (filters.trainingRange === 'good') {
          params.set('training_attendance_min', '80');
        } else if (filters.trainingRange === 'shortage') {
          params.set('training_attendance_max', '79.9');
        } else if (filters.trainingRange === 'critical') {
          params.set('training_attendance_max', '65');
        }
      }
      
      const { data } = await api.get(`/students/?${params}`);
      setStudents(data.results || []);
      setTotal(data.count);
      setPage(data.page);
      setTotalPages(data.total_pages);
    } catch { showToast('Failed to load students.', 'error'); }
    finally { setLoading(false); }
  }, [search, filters]);

  useEffect(() => {
    fetchFilterMetadata();
    fetchStudents(1);
  }, [fetchStudents, fetchFilterMetadata]);

  const pollUploadStatus = (logId) => {
    let intervalId = setInterval(async () => {
      try {
        const { data } = await api.get(`/students/upload-status/${logId}/`);
        
        if (data.status !== 'pending' && data.status !== 'processing') {
          clearInterval(intervalId);
          setUploading(false);
          setUploadResult({ upload_log: data });
          
          if (data.status === 'success' || data.status === 'partial') {
            showToast(`Import complete! ${data.successful_records} students processed.`);
            fetchStudents(1);
            
            // Auto-download credentials Excel
            if (data.credentials_excel) {
              const byteCharacters = atob(data.credentials_excel);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `credentials_${Date.now()}.xlsx`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          } else {
            showToast(data.error_details || 'CSV processing failed.', 'error');
            fetchStudents(1);
          }
        } else {
          setUploadResult({
            upload_log: data,
            is_polling: true
          });
        }
      } catch (err) {
        clearInterval(intervalId);
        setUploading(false);
        showToast('Error checking upload status.', 'error');
      }
    }, 2000);
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post('/students/import-csv/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadResult(data);
      showToast("CSV upload successful. Processing in background...");
      pollUploadStatus(data.upload_log.id);
    } catch (err) {
      showToast(err.response?.data?.error || 'CSV upload failed.', 'error');
      setUploading(false);
    } finally {
      e.target.value = '';
    }
  };

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/students/upload-history/');
      setUploadHistory(data);
      setShowHistory(true);
    } catch { /* */ }
  };

  const handleDeleteStudent = async (studentId, force = false) => {
    try {
      const url = `/students/${studentId}/delete/${force ? '?force=true' : ''}`;
      await api.delete(url);
      showToast('Student profile and portal account deleted permanently.');
      setConfirmDelete(null);
      setDeleteWarning(null);
      setBypassForceDelete(false);
      fetchStudents(page);
    } catch (err) {
      if (err.response?.data?.reasons) {
        setDeleteWarning(err.response.data.reasons);
      } else {
        showToast(err.response?.data?.error || 'Failed to delete student.', 'error');
      }
    }
  };

  const handleToggleAccess = async (studentId) => {
    try {
      const { data } = await api.post(`/students/${studentId}/toggle-access/`);
      showToast(data.message);
      setConfirmToggleAccess(null);
      fetchStudents(page);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to toggle student access.', 'error');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Students ({total})</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/admin/csv-upload" className="btn btn-primary">📤 Import Students</Link>
        </div>
      </div>

      {uploadResult && uploadResult.upload_log && (
        <div 
          className="card upload-result animate-in" 
          style={{ 
            marginBottom: 24, 
            padding: '24px 32px',
            borderRadius: '16px',
            border: `1px solid ${uploadResult.is_polling ? '#f59e0b' : uploadResult.upload_log.status === 'failed' ? '#ef4444' : '#10b981'}`,
            background: 'var(--bg-card-hover)',
            boxShadow: 'var(--shadow-md)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {uploadResult.is_polling ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="spinner" style={{ width: 28, height: 28, border: '3px solid rgba(99, 102, 241, 0.1)', borderTop: '3px solid var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0, margin: 0 }} />
                <div style={{ flexGrow: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {uploadResult.upload_log.status === 'pending' ? '⏳ Queued in Worker Queue...' : '⚡ Processing Students CSV...'}
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Processed {uploadResult.upload_log.successful_records + uploadResult.upload_log.failed_records} of {uploadResult.upload_log.total_records || '?'} student records...
                  </p>
                </div>
              </div>

              {/* Real-time Progress Bar */}
              {uploadResult.upload_log.total_records > 0 && (
                <div style={{ width: '100%', height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${Math.min(100, Math.round(((uploadResult.upload_log.successful_records + uploadResult.upload_log.failed_records) / uploadResult.upload_log.total_records) * 100))}%`, 
                      background: 'linear-gradient(90deg, var(--accent-primary) 0%, #a855f7 100%)', 
                      borderRadius: 4, 
                      transition: 'width 0.4s ease-out' 
                    }} 
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px 20px', borderRadius: 10, minWidth: 120 }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>{uploadResult.upload_log.successful_records}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Successful</div>
                </div>
                {uploadResult.upload_log.failed_records > 0 && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 20px', borderRadius: 10, minWidth: 120 }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ef4444' }}>{uploadResult.upload_log.failed_records}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Failed</div>
                  </div>
                )}
                <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '12px 20px', borderRadius: 10, minWidth: 120 }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{uploadResult.upload_log.total_records}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Records</div>
                </div>
              </div>

              {/* Real-time console log details */}
              {uploadResult.upload_log.error_details && (
                <div style={{ background: '#0f172a', padding: 16, borderRadius: 8, border: '1px solid #334155', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)' }}>
                  <h5 style={{ margin: '0 0 8px 0', fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', animation: 'pulse 1.5s infinite' }}></span>
                    Live Processing Log (A-Z details)
                  </h5>
                  <pre 
                    ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}
                    style={{ margin: 0, fontSize: '0.75rem', color: '#cbd5e1', maxHeight: 150, overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'Courier New, monospace', textAlign: 'left' }}
                  >
                    {uploadResult.upload_log.error_details}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {uploadResult.upload_log.status === 'success' ? '✅ Import Completed Successfully' : uploadResult.upload_log.status === 'partial' ? '⚠️ Import Completed with Warnings' : '❌ Import Failed'}
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Processed {uploadResult.upload_log.total_records} student records from file: <strong>{uploadResult.upload_log.file_name}</strong>
                  </p>
                </div>
                
                {/* Manual Excel Download Backup Button */}
                {uploadResult.upload_log.credentials_excel && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      const byteCharacters = atob(uploadResult.upload_log.credentials_excel);
                      const byteNumbers = new Array(byteCharacters.length);
                      for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                      }
                      const byteArray = new Uint8Array(byteNumbers);
                      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `credentials_${Date.now()}.xlsx`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, cursor: 'pointer' }}
                  >
                    📥 Download Credentials
                  </button>
                )}
              </div>
              
              {/* Count Analytics Blocks */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {/* Total */}
                <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '12px 20px', borderRadius: 10, minWidth: 120 }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{uploadResult.upload_log.total_records}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Records</div>
                </div>
                {/* Newly Added */}
                {uploadResult.upload_log.created_count > 0 && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '12px 20px', borderRadius: 10, minWidth: 130 }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>{uploadResult.upload_log.created_count}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🆕 New Added</div>
                  </div>
                )}
                {/* Updated */}
                {uploadResult.upload_log.updated_count > 0 && (
                  <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.35)', padding: '12px 20px', borderRadius: 10, minWidth: 130 }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#818cf8' }}>{uploadResult.upload_log.updated_count}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✏️ Updated</div>
                  </div>
                )}
                {/* Failed */}
                {uploadResult.upload_log.failed_records > 0 && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 20px', borderRadius: 10, minWidth: 120 }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ef4444' }}>{uploadResult.upload_log.failed_records}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>❌ Failed</div>
                  </div>
                )}
              </div>

              {/* Error Details Pre-wrap Block */}
              {uploadResult.upload_log.error_details && (
                <div style={{ background: '#0f172a', padding: 16, borderRadius: 8, border: '1px solid #334155', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)' }}>
                  <h5 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace', textAlign: 'left' }}>Detailed Processing Log & Results</h5>
                  <pre 
                    ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}
                    style={{ margin: 0, fontSize: '0.75rem', color: '#cbd5e1', maxHeight: 180, overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'Courier New, monospace', textAlign: 'left' }}
                  >
                    {uploadResult.upload_log.error_details}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="search-and-filter-header" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: showAdvancedFilters ? 16 : 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 250, maxWidth: 500 }}>
          <input 
            className="input-field" 
            placeholder="Search by name, reg no, or email..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ width: '100%', paddingLeft: 40 }}
          />
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
        </div>
        
        <button 
          className="btn btn-secondary"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42 }}
        >
          {showAdvancedFilters ? '✕ Hide Filters' : '⚙️ Advanced Filters'}
          {(filters.year || filters.category || filters.backlogs || filters.course || filters.stream || filters.semester || filters.cgpaRange || filters.trainingRange) && !showAdvancedFilters && (
            <span style={{ 
              background: 'var(--accent-primary)', color: 'white', borderRadius: '50%', 
              width: 20, height: 20, fontSize: '0.7rem', display: 'inline-flex', 
              alignItems: 'center', justifyContent: 'center'
            }}>
              !
            </span>
          )}
        </button>

        {(filters.year || filters.category || filters.backlogs || filters.course || filters.stream || filters.semester || filters.cgpaRange || filters.trainingRange || search) && (
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearch('');
              setFilters({ year: '', category: '', backlogs: '', course: '', stream: '', semester: '', cgpaRange: '', trainingRange: '' });
            }}
            style={{ 
              padding: '0 16px', fontSize: '0.85rem', height: '42px', borderRadius: '8px', 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)',
              cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            ✕ Reset
          </button>
        )}
      </div>

      {showAdvancedFilters && (
        <div 
          className="advanced-filters-panel animate-in" 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
            gap: 20, 
            background: 'var(--bg-card)', 
            padding: 24, 
            borderRadius: 16, 
            border: '1px solid var(--border-color)',
            marginBottom: 24,
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Course</label>
            <select className="input-field" value={filters.course} onChange={(e) => handleCourseChange(e.target.value)} style={{ width: '100%' }}>
              <option value="">All Courses</option>
              {availableCourses.map(course => (
                <option key={course.name} value={course.name}>{course.name} ({course.count})</option>
              ))}
            </select>
          </div>

          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Stream / Specialization</label>
            <select className="input-field" value={filters.stream} onChange={(e) => setFilters({...filters, stream: e.target.value})} style={{ width: '100%' }}>
              <option value="">All Streams</option>
              {getFilteredStreams().map(stream => (
                <option key={stream.name} value={stream.name}>{stream.name} ({stream.count})</option>
              ))}
            </select>
          </div>

          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Semester</label>
            <select className="input-field" value={filters.semester} onChange={(e) => handleSemesterChange(e.target.value)} style={{ width: '100%' }}>
              <option value="">All Sems</option>
              {getFilteredSemesters().map(s => (
                <option key={s.val} value={s.val}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Year</label>
            <select className="input-field" value={filters.year} onChange={(e) => handleYearChange(e.target.value)} style={{ width: '100%' }}>
              <option value="">All Years</option>
              <option value="1st">1st Year ({getYearCount('1st')})</option>
              <option value="2nd">2nd Year ({getYearCount('2nd')})</option>
              <option value="3rd">3rd Year ({getYearCount('3rd')})</option>
              <option value="4th">4th Year ({getYearCount('4th')})</option>
            </select>
          </div>

          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</label>
            <select className="input-field" value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})} style={{ width: '100%' }}>
              <option value="">All Categories</option>
              <option value="A">Category A ({getCategoryCount('A')})</option>
              <option value="B">Category B ({getCategoryCount('B')})</option>
              <option value="C">Category C ({getCategoryCount('C')})</option>
            </select>
          </div>

          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>CGPA Range</label>
            <select className="input-field" value={filters.cgpaRange} onChange={(e) => setFilters({...filters, cgpaRange: e.target.value})} style={{ width: '100%' }}>
              <option value="">All CGPAs</option>
              <option value="high">Excellent (≥ 8.0)</option>
              <option value="medium">Average (≥ 6.5)</option>
              <option value="low">Needs Improvement (&lt; 5.0)</option>
            </select>
          </div>

          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Training Attendance</label>
            <select className="input-field" value={filters.trainingRange} onChange={(e) => setFilters({...filters, trainingRange: e.target.value})} style={{ width: '100%' }}>
              <option value="">All Attendance</option>
              <option value="perfect">Perfect (100%)</option>
              <option value="good">Good (≥ 80%)</option>
              <option value="shortage">Warning (&lt; 80%)</option>
              <option value="critical">Critical (≤ 65%)</option>
            </select>
          </div>

          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Active Backlogs</label>
            <select className="input-field" value={filters.backlogs} onChange={(e) => setFilters({...filters, backlogs: e.target.value})} style={{ width: '100%' }}>
              <option value="">Any</option>
              <option value="true">Has Backlogs (Yes)</option>
              <option value="false">Clear (No Backlogs)</option>
            </select>
          </div>
        </div>
      )}

      {loading ? <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div> : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name & Contact</th>
                  <th>Reg No</th>
                  <th>Course & Stream</th>
                  <th>Year / Sem</th>
                  <th>Cat</th>
                  <th style={{ whiteSpace: 'nowrap' }} className="pact-header-cell">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      PACT Score
                      <span style={{ 
                        background: 'rgba(255,255,255,0.15)', 
                        borderRadius: '50%', 
                        width: '15px', 
                        height: '15px', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        cursor: 'help'
                      }}>?</span>
                    </span>
                    <div className="pact-tooltip-box">
                      <div style={{ fontWeight: 800, marginBottom: 8, fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 4 }}>
                        🎯 PACT Score Weightages
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.75rem', fontWeight: 500 }}>
                        <div><strong>P</strong>erformance (CGPA): <strong>35%</strong></div>
                        <div><strong>A</strong>ttendance (General): <strong>25%</strong></div>
                        <div><strong>C</strong>onduct (Training): <strong>25%</strong></div>
                        <div><strong>T</strong>echnical (No Backlogs): <strong>15%</strong></div>
                      </div>
                      <div style={{ fontSize: '0.68rem', marginTop: 8, opacity: 0.8, fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6 }}>
                        * Standing: Penalty of 25% per backlog.
                      </div>
                      <div className="pact-tooltip-arrow"></div>
                    </div>
                  </th>
                  <th>Backlogs</th>
                  <th>CGPA</th>
                  <th>General Attd</th>
                  <th>Training Attd</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td style={{ verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span 
                          style={{ 
                            fontWeight: 700, 
                            fontSize: '0.95rem',
                            color: 'var(--accent-primary)', 
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                            whiteSpace: 'nowrap'
                          }}
                          onClick={() => fetchStudentProfile(s.id)}
                          title="Click to view full student profile"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = 'underline';
                            e.currentTarget.style.opacity = '0.85';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = 'none';
                            e.currentTarget.style.opacity = '1';
                          }}
                        >
                          {s.name}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '4px 8px', whiteSpace: 'nowrap' }}>
                          <span>{s.email}</span>
                          {s.phone_number && <span style={{ opacity: 0.6 }}>•</span>}
                          {s.phone_number && <span>{s.phone_number}</span>}
                        </span>
                      </div>
                    </td>
                    <td style={{ verticalAlign: 'middle', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{s.registration_number}</td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{s.course || '—'}</span>
                        {s.stream && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{s.stream}</span>}
                      </div>
                    </td>
                    <td style={{ verticalAlign: 'middle', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {formatYearSem(s.year, s.semester)}
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      {s.category ? (
                        <span 
                          className="badge" 
                          style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            background: s.category === 'A' ? 'rgba(16, 185, 129, 0.08)' : s.category === 'B' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            color: s.category === 'A' ? '#10b981' : s.category === 'B' ? '#f59e0b' : '#ef4444',
                            border: `1px solid ${s.category === 'A' ? 'rgba(16, 185, 129, 0.2)' : s.category === 'B' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase'
                          }}
                        >
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: s.category === 'A' ? '#10b981' : s.category === 'B' ? '#f59e0b' : '#ef4444',
                            display: 'inline-block'
                          }} />
                          Cat {s.category}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      {s.pact_score != null ? (
                        <span 
                          className="badge" 
                          style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            background: s.pact_score >= 80 ? 'rgba(16, 185, 129, 0.08)' : s.pact_score >= 60 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            color: s.pact_score >= 80 ? '#10b981' : s.pact_score >= 60 ? '#f59e0b' : '#ef4444',
                            border: `1px solid ${s.pact_score >= 80 ? 'rgba(16, 185, 129, 0.2)' : s.pact_score >= 60 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            letterSpacing: '0.02em'
                          }}
                        >
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: s.pact_score >= 80 ? '#10b981' : s.pact_score >= 60 ? '#f59e0b' : '#ef4444',
                            display: 'inline-block'
                          }} />
                          {s.pact_score.toFixed(1)}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <span className={`badge ${s.backlogs_count > 0 ? 'badge-danger' : 'badge-success'}`} style={{ whiteSpace: 'nowrap' }}>
                        {s.backlogs_count > 0 ? `${s.backlogs_count} Active` : 'No'}
                      </span>
                    </td>
                    <td style={{ verticalAlign: 'middle', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{s.cgpa != null ? s.cgpa.toFixed(2) : '—'}</td>
                    <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span style={{ 
                        fontWeight: 600,
                        color: s.attendance >= 75 ? '#10b981' : s.attendance >= 50 ? '#f59e0b' : '#ef4444'
                      }}>
                        {s.attendance != null ? `${s.attendance}%` : '—'}
                      </span>
                    </td>
                    <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span style={{ 
                        fontWeight: 600,
                        color: s.training_attendance >= 100.0 ? '#10b981' : s.training_attendance >= 80.0 ? '#f59e0b' : '#ef4444'
                      }}>
                        {s.training_attendance != null ? `${s.training_attendance}%` : '—'}
                      </span>
                    </td>
                    <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span className={`badge ${s.is_active !== false ? 'badge-success' : 'badge-danger'}`}>
                        {s.is_active !== false ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(user?.role === 'admin' || user?.can_manage_students) && (
                          <button 
                            className={`btn btn-sm ${s.is_active !== false ? 'btn-warning' : 'btn-success'}`}
                            style={{ padding: '4px 8px', fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}
                            onClick={() => setConfirmToggleAccess(s)}
                          >
                            {s.is_active !== false ? 'Block' : 'Authorize'}
                          </button>
                        )}
                        {user?.role === 'admin' && (
                          <button 
                            className="btn btn-danger btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}
                            onClick={() => setConfirmDelete(s)}
                          >
                            Delete
                          </button>
                        )}
                        {!(user?.role === 'admin' || user?.can_manage_students) && (
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>None</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && <tr><td colSpan={12} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No students found. Upload a CSV to get started.</td></tr>}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination-bar">
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => fetchStudents(page - 1)}>← Prev</button>
              <span className="page-info">Page {page} / {totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => fetchStudents(page + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 850 }}>
            <div className="modal-header"><h2>Upload History</h2><button className="modal-close" onClick={() => setShowHistory(false)}>×</button></div>
            <div className="table-container" style={{ maxHeight: 400, overflow: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>File</th>
                    <th>By</th>
                    <th>Total</th>
                    <th>Success</th>
                    <th>Failed</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadHistory.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 500 }}>{log.file_name}</td>
                      <td>{log.uploaded_by_name}</td>
                      <td>{log.total_records}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{log.successful_records}</td>
                      <td style={{ color: '#ef4444', fontWeight: 600 }}>{log.failed_records}</td>
                      <td>
                        <span className={`badge ${
                          log.status === 'success' ? 'badge-success' : 
                          log.status === 'partial' ? 'badge-warning' : 
                          log.status === 'reverted' ? 'badge-warning' : 
                          log.status === 'pending' ? 'badge-info' : 
                          log.status === 'processing' ? 'badge-info animate-pulse' : 'badge-danger'
                        }`} style={{ textTransform: 'capitalize' }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(log.uploaded_at).toLocaleString()}</td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                          onClick={() => setSelectedLogSummary(log)}
                        >
                          👁️ View Summary
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedLogSummary && (
        <div className="modal-overlay" onClick={() => setSelectedLogSummary(null)} style={{ zIndex: 1200 }}>
          <div className="modal card animate-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, padding: 24 }}>
            <div className="modal-header" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>📊 Import Summary: {selectedLogSummary.file_name}</h3>
              <button className="modal-close" onClick={() => setSelectedLogSummary(null)}>×</button>
            </div>
            <div style={{ background: '#0f172a', padding: 16, borderRadius: 8, border: '1px solid #334155', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)' }}>
              <pre style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'Courier New, monospace', textAlign: 'left' }}>
                {(() => {
                  if (selectedLogSummary.error_details) return selectedLogSummary.error_details;
                  const lines = [
                    "=== IMPORT SUMMARY (LEGACY) ===",
                    `Status: ${selectedLogSummary.status ? selectedLogSummary.status.toUpperCase() : 'UNKNOWN'}`,
                    `Total Records in File: ${selectedLogSummary.total_records}`,
                    `Successfully Processed: ${selectedLogSummary.successful_records}`,
                    `Failed/Rejected Records: ${selectedLogSummary.failed_records}`,
                  ];
                  if (selectedLogSummary.status === 'success') {
                    lines.push("\nDetailed result: The import completed successfully. All student records were added or updated.");
                  } else if (selectedLogSummary.status === 'partial') {
                    lines.push("\nDetailed result: The import completed with warnings. Some records failed validation checks while others were successfully imported.");
                  } else if (selectedLogSummary.status === 'failed') {
                    lines.push("\nDetailed result: The entire import failed. No profiles were created or updated.");
                  }
                  lines.push("\nNote: Individual row-level status logs are only available for imports processed after the system update.");
                  return lines.join("\n");
                })()}
              </pre>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => { setConfirmDelete(null); setDeleteWarning(null); setBypassForceDelete(false); }}>
          <div className="modal card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450, padding: 24 }}>
            <div className="modal-header">
              <h2 style={{ color: 'var(--danger)', margin: 0 }}>⚠️ Permanent Deletion Warning</h2>
              <button className="modal-close" onClick={() => { setConfirmDelete(null); setDeleteWarning(null); setBypassForceDelete(false); }}>×</button>
            </div>
            
            {deleteWarning ? (
              <>
                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: 14, borderRadius: 8, margin: '16px 0', fontSize: '0.85rem', color: '#92400e' }}>
                  <strong>Blocked! {confirmDelete.name} has active records:</strong>
                  <ul style={{ margin: '8px 0 0 16px', padding: 0, fontSize: '0.8rem' }}>
                    {deleteWarning.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                  <p style={{ marginTop: 10, marginBottom: 0, fontSize: '0.78rem', opacity: 0.9 }}>
                    Deleting this student will permanently erase all associated applications, mock interviews, and resume files.
                  </p>
                </div>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <input 
                    type="checkbox" 
                    checked={bypassForceDelete} 
                    onChange={(e) => setBypassForceDelete(e.target.checked)} 
                  />
                  I confirm that I want to delete all active records
                </label>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button className="btn btn-secondary" onClick={() => { setConfirmDelete(null); setDeleteWarning(null); setBypassForceDelete(false); }}>Cancel</button>
                  <button className="btn btn-danger" disabled={!bypassForceDelete} onClick={() => handleDeleteStudent(confirmDelete.id, true)}>Force Delete Anyway</button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-muted)', marginTop: 12 }}>
                  Are you sure you want to permanently delete <strong>{confirmDelete.name}</strong> ({confirmDelete.registration_number})?
                </p>
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: 12, borderRadius: 6, margin: '16px 0', fontSize: '0.8rem', color: '#991b1b' }}>
                  <strong>CRITICAL:</strong> This will erase all user logins, profile info, uploaded resumes, assignments, and placement histories. This action is absolute and cannot be undone.
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button className="btn btn-secondary" onClick={() => { setConfirmDelete(null); setDeleteWarning(null); setBypassForceDelete(false); }}>Cancel</button>
                  <button className="btn btn-danger" onClick={() => handleDeleteStudent(confirmDelete.id, false)}>Confirm Delete</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {confirmToggleAccess && (
        <div className="modal-overlay" onClick={() => setConfirmToggleAccess(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450, padding: 24 }}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>🔐 Portal Access Control</h2>
              <button className="modal-close" onClick={() => setConfirmToggleAccess(null)}>×</button>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-muted)', marginTop: 12 }}>
              Are you sure you want to <strong>{confirmToggleAccess.is_active !== false ? 'Revoke' : 'Restore'}</strong> portal access for <strong>{confirmToggleAccess.name}</strong>?
            </p>
            <div style={{ background: 'var(--card-hover)', border: '1px solid var(--border-color)', padding: 12, borderRadius: 6, margin: '16px 0', fontSize: '0.8rem' }}>
              {confirmToggleAccess.is_active !== false ? 
                "The student will be blocked from logging into the portal, editing their profile, and submitting applications immediately." : 
                "The student will immediately regain full access to search jobs, create resumes, and log in."
              }
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setConfirmToggleAccess(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }} onClick={() => handleToggleAccess(confirmToggleAccess.id)}>
                {confirmToggleAccess.is_active !== false ? 'Block Access' : 'Authorize Access'}
              </button>
            </div>
          </div>
        </div>
      )}

      {profileLoading && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal card" style={{ maxWidth: 300, textAlign: 'center', padding: 32 }}>
            <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Loading student profile...</p>
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)} style={{ zIndex: 1100 }}>
          <div 
            className="modal card animate-in" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              width: '95vw', 
              height: '92vh',
              maxWidth: '1350px', 
              maxHeight: '900px',
              padding: 0, 
              overflow: 'hidden', 
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            {/* Modal Header Banner */}
            <div 
              style={{ 
                background: 'var(--accent-gradient)',
                padding: '20px 32px', 
                color: 'white',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                height: '110px',
                boxSizing: 'border-box',
                flexShrink: 0
              }}
            >
              <button 
                className="modal-close" 
                onClick={() => setSelectedStudent(null)}
                style={{ 
                  position: 'absolute', 
                  top: 16, 
                  right: 16, 
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '1.8rem',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
              
              <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                {selectedStudent.profile?.profile_picture && (
                  <img 
                    src={getFullImageUrl(selectedStudent.profile.profile_picture)} 
                    alt={selectedStudent.name}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid rgba(255,255,255,0.4)',
                      boxShadow: 'var(--shadow-md)',
                      background: 'rgba(255,255,255,0.1)',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      zIndex: 2
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <div 
                  style={{ 
                    width: 56, 
                    height: 56, 
                    borderRadius: '50%', 
                    background: 'rgba(255,255,255,0.2)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '1.6rem', 
                    fontWeight: 900,
                    fontFamily: 'var(--font-heading)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(255,255,255,0.4)',
                    boxShadow: 'var(--shadow-md)',
                    textTransform: 'uppercase',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 1
                  }}
                >
                  {selectedStudent.name ? selectedStudent.name.charAt(0) : 'S'}
                </div>
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'white', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
                    {selectedStudent.name}
                  </h2>
                  {selectedStudent.category && (
                    <span 
                      style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap',
                        background: 'rgba(255, 255, 255, 0.15)', 
                        backdropFilter: 'blur(4px)',
                        color: 'white', 
                        padding: '4px 10px', 
                        borderRadius: '9999px', 
                        fontSize: '0.68rem', 
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        border: '1px solid rgba(255, 255, 255, 0.25)'
                      }}
                    >
                      <span style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: selectedStudent.category === 'A' ? '#10b981' : selectedStudent.category === 'B' ? '#f59e0b' : '#ef4444',
                        display: 'inline-block'
                      }} />
                      Cat {selectedStudent.category}
                    </span>
                  )}
                </div>
                <p style={{ margin: '2px 0 0 0', opacity: 0.9, fontSize: '0.85rem', fontWeight: 500 }}>
                  Reg No: <strong style={{ letterSpacing: '0.5px' }}>{selectedStudent.registration_number}</strong>
                </p>
              </div>
            </div>

            {/* Split Screen Modal Body */}
            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'row',
                height: 'calc(100% - 110px)',
                overflow: 'hidden'
              }}
            >
              {/* Left Sidebar */}
              <div 
                style={{ 
                  width: '300px', 
                  minWidth: '300px', 
                  background: 'var(--bg-card-hover)', 
                  borderRight: '1px solid var(--border-color)', 
                  padding: '24px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 20,
                  overflowY: 'auto',
                  height: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {/* CGPA Stat Card */}
                <div 
                  className="card hover-lift" 
                  style={{ 
                    padding: '12px 16px', 
                    textAlign: 'center',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    flexShrink: 0
                  }}
                >
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>CGPA</span>
                  <div 
                    style={{ 
                      fontSize: '1.8rem', 
                      fontWeight: 900, 
                      color: selectedStudent.cgpa >= 8.0 ? 'var(--success)' : selectedStudent.cgpa >= 6.5 ? 'var(--warning)' : 'var(--danger)',
                      margin: '2px 0',
                      fontFamily: 'var(--font-heading)'
                    }}
                  >
                    {selectedStudent.cgpa != null ? selectedStudent.cgpa.toFixed(2) : '—'}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Scale 10.0</span>
                </div>

                {/* Attendance Stat Card */}
                <div 
                  className="card hover-lift" 
                  style={{ 
                    padding: '12px 16px', 
                    textAlign: 'center',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    flexShrink: 0
                  }}
                >
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Attendance</span>
                  <div 
                    style={{ 
                      fontSize: '1.8rem', 
                      fontWeight: 900, 
                      color: selectedStudent.attendance >= 85 ? 'var(--success)' : selectedStudent.attendance >= 75 ? 'var(--warning)' : 'var(--danger)',
                      margin: '2px 0',
                      fontFamily: 'var(--font-heading)'
                    }}
                  >
                    {selectedStudent.attendance != null ? `${selectedStudent.attendance}%` : '—'}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {selectedStudent.attendance >= 85 ? 'Excellent' : selectedStudent.attendance >= 75 ? 'Good' : 'Shortage'}
                  </span>
                </div>

                {/* Training Attendance Stat Card */}
                <div 
                  className="card hover-lift" 
                  style={{ 
                    padding: '12px 16px', 
                    textAlign: 'center',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    flexShrink: 0
                  }}
                >
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Training Attendance</span>
                  <div 
                    style={{ 
                      fontSize: '1.8rem', 
                      fontWeight: 900, 
                      color: selectedStudent.training_attendance >= 100.0 ? 'var(--success)' : selectedStudent.training_attendance >= 80.0 ? 'var(--warning)' : 'var(--danger)',
                      margin: '2px 0',
                      fontFamily: 'var(--font-heading)'
                    }}
                  >
                    {selectedStudent.training_attendance != null ? `${selectedStudent.training_attendance}%` : '—'}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {selectedStudent.training_attendance >= 100.0 ? '100% Attended' : selectedStudent.training_attendance >= 80.0 ? 'Good Attendance' : 'Shortage'}
                  </span>
                </div>

                {/* Backlogs Stat Card */}
                <div 
                  className="card hover-lift" 
                  style={{ 
                    padding: '12px 16px', 
                    textAlign: 'center',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    flexShrink: 0
                  }}
                >
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Backlogs</span>
                  <div 
                    style={{ 
                      fontSize: '1.8rem', 
                      fontWeight: 900, 
                      color: selectedStudent.backlogs_count > 0 ? 'var(--danger)' : 'var(--success)',
                      margin: '2px 0',
                      fontFamily: 'var(--font-heading)'
                    }}
                  >
                    {selectedStudent.backlogs_count != null ? selectedStudent.backlogs_count : '0'}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {selectedStudent.backlogs_count > 0 ? `${selectedStudent.backlogs_count} Active` : 'No Backlogs'}
                  </span>
                </div>

                {/* Contact Information */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, flexShrink: 0 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Contact Details</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <a 
                      href={`mailto:${selectedStudent.email}`}
                      title="Send email to student"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 10, 
                        fontSize: '0.75rem', 
                        padding: '10px 14px',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontWeight: 600,
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        background: 'var(--bg-card)',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'all 0.2s ease-in-out',
                        cursor: 'pointer',
                        wordBreak: 'break-all'
                      }}
                      onMouseEnter={(e) => { 
                        e.currentTarget.style.borderColor = 'var(--accent-primary)'; 
                        e.currentTarget.style.background = 'var(--accent-soft)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                      }}
                      onMouseLeave={(e) => { 
                        e.currentTarget.style.borderColor = 'var(--border-color)'; 
                        e.currentTarget.style.background = 'var(--bg-card)';
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                      }}
                    >
                      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📧</span> 
                      <span style={{ transition: 'color 0.2s' }}>{selectedStudent.email}</span>
                    </a>
                    
                    {selectedStudent.phone_number ? (
                      <a 
                        href={`tel:${selectedStudent.phone_number}`}
                        title="Call student phone number"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 10, 
                          fontSize: '0.75rem', 
                          padding: '10px 14px',
                          borderRadius: '10px',
                          textDecoration: 'none',
                          fontWeight: 600,
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          background: 'var(--bg-card)',
                          boxShadow: 'var(--shadow-sm)',
                          transition: 'all 0.2s ease-in-out',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.borderColor = 'var(--accent-primary)'; 
                          e.currentTarget.style.background = 'var(--accent-soft)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                        }}
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.borderColor = 'var(--border-color)'; 
                          e.currentTarget.style.background = 'var(--bg-card)';
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                        }}
                      >
                        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📞</span> 
                        <span>{selectedStudent.phone_number}</span>
                      </a>
                    ) : (
                      <div 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 10, 
                          fontSize: '0.75rem', 
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-muted)',
                          background: 'var(--bg-card)',
                          fontStyle: 'italic'
                        }}
                      >
                        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📞</span>
                        <span>No Phone Number</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Links */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, flexShrink: 0 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Socials & Portfolio</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedStudent.profile?.linkedin && (
                      <a 
                        href={selectedStudent.profile.linkedin} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8, 
                          fontSize: '0.75rem', 
                          padding: '8px 12px',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          fontWeight: 600,
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          background: 'var(--bg-card)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                      >
                        🌐 LinkedIn Profile
                      </a>
                    )}
                    {selectedStudent.profile?.github && (
                      <a 
                        href={selectedStudent.profile.github} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8, 
                          fontSize: '0.75rem', 
                          padding: '8px 12px',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          fontWeight: 600,
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          background: 'var(--bg-card)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                      >
                        💻 GitHub Profile
                      </a>
                    )}
                    {selectedStudent.profile?.portfolio && (
                      <a 
                        href={selectedStudent.profile.portfolio} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8, 
                          fontSize: '0.75rem', 
                          padding: '8px 12px',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          fontWeight: 600,
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          background: 'var(--bg-card)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                      >
                        🎨 Portfolio Website
                      </a>
                    )}
                    {selectedStudent.profile?.location && (
                      <div 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8, 
                          fontSize: '0.75rem', 
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-card)'
                        }}
                      >
                        📍 {selectedStudent.profile.location}
                      </div>
                    )}
                    {!selectedStudent.profile?.linkedin && !selectedStudent.profile?.github && !selectedStudent.profile?.portfolio && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic', paddingLeft: 4 }}>No social or portfolio links.</div>
                    )}
                  </div>
                </div>

                {/* Account details */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Portal Access</div>
                    <span className={`badge ${selectedStudent.is_active !== false ? 'badge-success' : 'badge-danger'}`} style={{ padding: '3px 8px', fontSize: '0.65rem' }}>
                      {selectedStudent.is_active !== false ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Record Logs</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.4 }}>
                      Created: {selectedStudent.created_at ? new Date(selectedStudent.created_at).toLocaleDateString() : '—'}<br/>
                      Updated: {selectedStudent.updated_at ? new Date(selectedStudent.updated_at).toLocaleDateString() : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Main Panel */}
              <div 
                style={{ 
                  flex: 1, 
                  padding: '24px 32px', 
                  display: 'flex', 
                  flexDirection: 'column',
                  height: '100%',
                  boxSizing: 'border-box',
                  overflow: 'hidden'
                }}
              >
                {/* Tab Navigation */}
                <div 
                  style={{ 
                    display: 'flex', 
                    borderBottom: '1px solid var(--border-color)', 
                    marginBottom: 20,
                    gap: 8,
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    flexShrink: 0
                  }}
                >
                  {[
                    { id: 'academics', label: '🎓 Academics' },
                    { id: 'skills', label: '🛠️ Skills & Bio' },
                    { id: 'experience', label: '💼 Projects & Exp' },
                    { id: 'mock_interviews', label: '🎯 Mock Interviews' },
                    ...((user?.role === 'admin' || user?.can_manage_students) ? [{ id: 'edit', label: '✏️ Edit Info' }] : [])
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveModalTab(tab.id)}
                      style={{
                        padding: '10px 16px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeModalTab === tab.id ? '2.5px solid var(--accent-primary)' : '2.5px solid transparent',
                        color: activeModalTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: activeModalTab === tab.id ? '700' : '500',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap',
                        outline: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Scrollable Tab Content Area */}
                <div 
                  style={{ 
                    flex: 1, 
                    overflowY: 'auto',
                    paddingRight: 6,
                    marginBottom: 20
                  }}
                >
                  {activeModalTab === 'academics' && (() => {
                    const attendanceVal = selectedStudent.attendance ?? 0;
                    const cgpaVal = selectedStudent.cgpa ?? 0;
                    const trainingVal = selectedStudent.training_attendance ?? 100.0;
                    const backlogCountVal = selectedStudent.backlogs_count ?? 0;

                    // Category A Rules
                    const condA1 = attendanceVal >= 75.0;
                    const condA2 = cgpaVal >= 8.0;
                    const condA3 = backlogCountVal === 0;
                    const condA4 = trainingVal >= 100.0;
                    const scoreA = [condA1, condA2, condA3, condA4].filter(Boolean).length;

                    // Category B Rules
                    const condB1 = attendanceVal >= 50.0;
                    const condB2 = cgpaVal >= 6.5;
                    const condB3 = backlogCountVal <= 2;
                    const condB4 = trainingVal >= 80.0;
                    const scoreB = [condB1, condB2, condB3, condB4].filter(Boolean).length;

                    // Category C Rules
                    const condC1 = attendanceVal < 30.0;
                    const condC2 = cgpaVal < 5.0;
                    const condC3 = trainingVal <= 65.0;
                    const condC4 = true; // Always satisfied
                    const scoreC = [condC1, condC2, condC3, condC4].filter(Boolean).length;

                    // Assigned determination
                    let assignedCat = 'C';
                    if (selectedStudent.is_category_manual) {
                      assignedCat = selectedStudent.category;
                    } else {
                      if (scoreA >= 3) assignedCat = 'A';
                      else if (scoreB >= 3) assignedCat = 'B';
                    }

                    const renderConditionIndicator = (isMet, labelText, gotText) => (
                      <div 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          fontSize: '0.78rem', 
                          padding: '6px 10px',
                          background: isMet ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.03)',
                          borderLeft: `3px solid ${isMet ? 'var(--success)' : 'var(--border-color)'}`,
                          borderRadius: '4px',
                          color: isMet ? 'var(--text-primary)' : 'var(--text-muted)'
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{labelText}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{gotText}</span>
                          <span 
                            style={{ 
                              color: isMet ? 'var(--success)' : 'var(--danger)',
                              fontWeight: 900,
                              fontSize: '0.85rem'
                            }}
                          >
                            {isMet ? '✓' : '✗'}
                          </span>
                        </div>
                      </div>
                    );

                    return (
                      <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                        {/* Student Core Academic Grid */}
                        <div 
                          style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr', 
                            gap: '20px 24px',
                            fontSize: '0.9rem',
                            lineHeight: '1.6'
                          }}
                        >
                          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Course</div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedStudent.course || '—'}</div>
                          </div>

                          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stream</div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedStudent.stream || '—'}</div>
                          </div>

                          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Year & Semester</div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {selectedStudent.year ? `${selectedStudent.year} Year` : '—'} 
                              {selectedStudent.semester ? ` (Sem ${selectedStudent.semester})` : ''}
                            </div>
                          </div>

                          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Graduation Year</div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedStudent.passing_year || '—'}</div>
                          </div>

                          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedStudent.phone_number || '—'}</div>
                          </div>

                          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedStudent.email}</div>
                          </div>
                        </div>

                        {/* PACT Score Dashboard */}
                        {(() => {
                          const pactScoreVal = selectedStudent.pact_score ?? 0.0;
                          const cgpaScore = cgpaVal * 10.0;
                          const standingScore = Math.max(0.0, 100.0 - (backlogCountVal * 25.0));

                          const performanceContrib = cgpaScore * 0.35;
                          const attendanceContrib = attendanceVal * 0.25;
                          const trainingContrib = trainingVal * 0.25;
                          const standingContrib = standingScore * 0.15;

                          let pactColor = '#ef4444'; // Red
                          if (pactScoreVal >= 80) pactColor = '#10b981'; // Green
                          else if (pactScoreVal >= 60) pactColor = '#f59e0b'; // Orange/Yellow

                          return (
                            <div 
                              style={{ 
                                border: '1px solid var(--border-color)', 
                                borderRadius: '12px',
                                background: 'var(--bg-card-hover)',
                                padding: '20px 24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 16
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                                  📊 PACT Placement Readiness Dashboard
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                  Unified readiness score computed on Academic, Attendance, Training, and Standing KPIs.
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
                                {/* Conic Gradient Gauge */}
                                <div style={{
                                  width: '124px',
                                  height: '124px',
                                  borderRadius: '50%',
                                  background: `conic-gradient(${pactColor} ${pactScoreVal * 3.6}deg, var(--border-light) 0deg)`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  position: 'relative',
                                  boxShadow: 'var(--shadow-sm)',
                                  flexShrink: 0
                                }}>
                                  <div style={{
                                    width: '102px',
                                    height: '102px',
                                    borderRadius: '50%',
                                    background: 'var(--bg-card)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: 'inset var(--shadow-sm)'
                                  }}>
                                    <span style={{ fontSize: '1.8rem', fontWeight: 900, color: pactColor, fontFamily: 'var(--font-heading)' }}>
                                      {pactScoreVal.toFixed(1)}
                                    </span>
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                      PACT Score
                                    </span>
                                  </div>
                                </div>

                                {/* Breakdown Grid */}
                                <div style={{ flex: 1, minWidth: '250px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                  {/* 1. CGPA */}
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                                      <span>Performance (CGPA: {cgpaVal.toFixed(2)} / 10)</span>
                                      <span style={{ color: 'var(--text-secondary)' }}>{performanceContrib.toFixed(1)} / 35.0 pts (35%)</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ width: `${cgpaScore}%`, height: '100%', background: '#3b82f6', borderRadius: '3px' }} />
                                    </div>
                                  </div>

                                  {/* 2. General Attendance */}
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                                      <span>General Attendance ({attendanceVal.toFixed(1)}%)</span>
                                      <span style={{ color: 'var(--text-secondary)' }}>{attendanceContrib.toFixed(1)} / 25.0 pts (25%)</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ width: `${attendanceVal}%`, height: '100%', background: '#10b981', borderRadius: '3px' }} />
                                    </div>
                                  </div>

                                  {/* 3. Training Attendance */}
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                                      <span>Training Attendance ({trainingVal.toFixed(1)}%)</span>
                                      <span style={{ color: 'var(--text-secondary)' }}>{trainingContrib.toFixed(1)} / 25.0 pts (25%)</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ width: `${trainingVal}%`, height: '100%', background: '#8b5cf6', borderRadius: '3px' }} />
                                    </div>
                                  </div>

                                  {/* 4. Standing / Backlogs */}
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                                      <span>Standing ({backlogCountVal} Backlogs, Score: {standingScore.toFixed(0)}%)</span>
                                      <span style={{ color: 'var(--text-secondary)' }}>{standingContrib.toFixed(1)} / 15.0 pts (15%)</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ width: `${standingScore}%`, height: '100%', background: '#f59e0b', borderRadius: '3px' }} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Category and KPI Scorecard */}
                        <div 
                          style={{ 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '12px',
                            background: 'var(--bg-card-hover)',
                            padding: '20px 24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                              🎯 Placement Category Eligibility Engine
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                              Students are classified based on a multi-KPI scorecard. Satisfying <strong>at least 3 out of 4 conditions</strong> places the student into that tier.
                            </div>
                          </div>

                          {/* Category Manual Override */}
                          <div 
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 16px',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              marginTop: '4px',
                              flexWrap: 'wrap',
                              gap: 12
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                ⚙️ Category Manual Override
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                {selectedStudent.is_category_manual 
                                  ? `Manually forced to Category ${selectedStudent.category}.` 
                                  : "Currently auto-calculated by the eligibility engine."
                                }
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: 6 }}>
                              {['A', 'B', 'C', 'auto'].map((cat) => {
                                const isSelected = cat === 'auto' 
                                  ? !selectedStudent.is_category_manual 
                                  : (selectedStudent.is_category_manual && selectedStudent.category === cat);
                                return (
                                  <button
                                    key={cat}
                                    onClick={() => handleCategoryChange(selectedStudent.id, cat)}
                                    style={{
                                      padding: '6px 12px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      borderRadius: '6px',
                                      border: isSelected 
                                        ? `1px solid ${cat === 'A' ? '#10b981' : cat === 'B' ? '#f59e0b' : cat === 'C' ? '#ef4444' : 'var(--accent-primary)'}` 
                                        : '1px solid var(--border-color)',
                                      background: isSelected 
                                        ? (cat === 'A' ? 'rgba(16, 185, 129, 0.15)' : cat === 'B' ? 'rgba(245, 158, 11, 0.15)' : cat === 'C' ? 'rgba(239, 68, 68, 0.15)' : 'var(--accent-soft)') 
                                        : 'var(--bg-card)',
                                      color: isSelected 
                                        ? (cat === 'A' ? '#10b981' : cat === 'B' ? '#f59e0b' : cat === 'C' ? '#ef4444' : 'var(--accent-primary)') 
                                        : 'var(--text-secondary)',
                                      transition: 'all 0.2s ease',
                                      boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.08)' : 'none'
                                    }}
                                  >
                                    {cat === 'auto' ? '🔄 Auto (Reset)' : `Cat ${cat}`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Row of Categories A, B, C */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 4 }}>
                            {/* Category A Card */}
                            <div 
                              style={{ 
                                background: 'var(--bg-card)', 
                                border: assignedCat === 'A' ? '2px solid var(--success)' : '1px solid var(--border-color)',
                                borderRadius: '8px', 
                                padding: '14px',
                                position: 'relative',
                                opacity: assignedCat === 'A' ? 1 : 0.75,
                                transition: 'all 0.2s',
                                boxShadow: assignedCat === 'A' ? 'var(--shadow-md)' : 'none'
                              }}
                            >
                              {assignedCat === 'A' && (
                                <span 
                                  style={{ 
                                    position: 'absolute', 
                                    top: -10, 
                                    right: 12, 
                                    background: 'var(--success)', 
                                    color: 'white', 
                                    fontSize: '0.6rem', 
                                    fontWeight: 800, 
                                    padding: '2px 8px', 
                                    borderRadius: 10,
                                    textTransform: 'uppercase'
                                  }}
                                >
                                  Active
                                </span>
                              )}
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: assignedCat === 'A' ? 'var(--success)' : 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Category A</span>
                                <span style={{ fontSize: '0.72rem', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>{scoreA}/4 Met</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                                {renderConditionIndicator(condA1, 'Attendance ≥ 75%', `${attendanceVal}%`)}
                                {renderConditionIndicator(condA2, 'CGPA ≥ 8.0', cgpaVal.toFixed(2))}
                                {renderConditionIndicator(condA3, 'No Backlogs', `${backlogCountVal}`)}
                                {renderConditionIndicator(condA4, 'Training Attendance = 100%', `${trainingVal}%`)}
                              </div>
                            </div>

                            {/* Category B Card */}
                            <div 
                              style={{ 
                                background: 'var(--bg-card)', 
                                border: assignedCat === 'B' ? '2px solid var(--warning)' : '1px solid var(--border-color)',
                                borderRadius: '8px', 
                                padding: '14px',
                                position: 'relative',
                                opacity: assignedCat === 'B' ? 1 : 0.75,
                                transition: 'all 0.2s',
                                boxShadow: assignedCat === 'B' ? 'var(--shadow-md)' : 'none'
                              }}
                            >
                              {assignedCat === 'B' && (
                                <span 
                                  style={{ 
                                    position: 'absolute', 
                                    top: -10, 
                                    right: 12, 
                                    background: 'var(--warning)', 
                                    color: 'white', 
                                    fontSize: '0.6rem', 
                                    fontWeight: 800, 
                                    padding: '2px 8px', 
                                    borderRadius: 10,
                                    textTransform: 'uppercase'
                                  }}
                                >
                                  Active
                                </span>
                              )}
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: assignedCat === 'B' ? 'var(--warning)' : 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Category B</span>
                                <span style={{ fontSize: '0.72rem', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>{scoreB}/4 Met</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                                {renderConditionIndicator(condB1, 'Attendance ≥ 50%', `${attendanceVal}%`)}
                                {renderConditionIndicator(condB2, 'CGPA ≥ 6.5', cgpaVal.toFixed(2))}
                                {renderConditionIndicator(condB3, 'Backlogs ≤ 2', `${backlogCountVal}`)}
                                {renderConditionIndicator(condB4, 'Training Attendance ≥ 80%', `${trainingVal}%`)}
                              </div>
                            </div>

                            {/* Category C Card */}
                            <div 
                              style={{ 
                                background: 'var(--bg-card)', 
                                border: assignedCat === 'C' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                borderRadius: '8px', 
                                padding: '14px',
                                position: 'relative',
                                opacity: assignedCat === 'C' ? 1 : 0.75,
                                transition: 'all 0.2s',
                                boxShadow: assignedCat === 'C' ? 'var(--shadow-md)' : 'none'
                              }}
                            >
                              {assignedCat === 'C' && (
                                <span 
                                  style={{ 
                                    position: 'absolute', 
                                    top: -10, 
                                    right: 12, 
                                    background: 'var(--accent-primary)', 
                                    color: 'white', 
                                    fontSize: '0.6rem', 
                                    fontWeight: 800, 
                                    padding: '2px 8px', 
                                    borderRadius: 10,
                                    textTransform: 'uppercase'
                                  }}
                                >
                                  Active
                                </span>
                              )}
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: assignedCat === 'C' ? 'var(--accent-primary)' : 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Category C</span>
                                <span style={{ fontSize: '0.72rem', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>{scoreC}/4 Met</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                                {renderConditionIndicator(condC1, 'Attendance < 30%', `${attendanceVal}%`)}
                                {renderConditionIndicator(condC2, 'CGPA < 5.0', cgpaVal.toFixed(2))}
                                {renderConditionIndicator(condC3, 'Training Attd ≤ 65%', `${trainingVal}%`)}
                                {renderConditionIndicator(condC4, 'Backlogs Max (Any)', 'Yes')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {activeModalTab === 'skills' && (
                    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {/* Summary Box */}
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Professional Summary</div>
                        <div style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px 20px', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                          {selectedStudent.profile?.professional_summary || "No professional summary has been set up for this student yet."}
                        </div>
                      </div>

                      {/* Skills badges */}
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Technical & Soft Skills</div>
                        {selectedStudent.profile?.skills && selectedStudent.profile.skills.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {selectedStudent.profile.skills.map((skill) => (
                              <div 
                                key={skill.id} 
                                className="skill-badge"
                                style={{ 
                                  padding: '8px 16px',
                                  borderRadius: 20,
                                  fontSize: '0.85rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 8
                                }}
                              >
                                <span className="skill-name">{skill.name}</span>
                                {skill.proficiency && (
                                  <span 
                                    className="skill-level"
                                    style={{ 
                                      fontSize: '0.65rem',
                                      textTransform: 'uppercase',
                                      color: 'var(--accent-primary)',
                                      fontWeight: 800,
                                      background: 'rgba(249, 115, 22, 0.1)',
                                      padding: '1px 6px',
                                      borderRadius: 4
                                    }}
                                  >
                                    {skill.proficiency}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No skills specified in student profile yet.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeModalTab === 'experience' && (() => {
                    const parseTech = (tech) => {
                      if (!tech) return [];
                      if (Array.isArray(tech)) return tech;
                      return tech.split(',').map(t => t.trim()).filter(Boolean);
                    };

                    const projects = selectedStudent.profile?.projects || [];
                    const experiences = selectedStudent.profile?.experiences || [];
                    const education = selectedStudent.profile?.education_entries || [];
                    const certifications = selectedStudent.profile?.certifications || [];

                    return (
                      <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Projects Section */}
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Projects</div>
                          {projects.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              {projects.map((proj) => (
                                <div key={proj.id} className="project-card" style={{ borderLeft: '3px solid var(--border-color)', paddingLeft: 12, paddingBottom: 4 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{proj.title}</h4>
                                    {proj.date && (
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                        {new Date(proj.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                                      </span>
                                    )}
                                  </div>
                                  {proj.description && (
                                    <p style={{ margin: '6px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{proj.description}</p>
                                  )}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                      {parseTech(proj.technologies).map((tech, idx) => (
                                        <span 
                                          key={idx} 
                                          style={{ 
                                            fontSize: '0.65rem', 
                                            fontWeight: 600, 
                                            background: 'var(--bg-input)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-secondary)',
                                            padding: '2px 8px', 
                                            borderRadius: 4
                                          }}
                                        >
                                          {tech}
                                        </span>
                                      ))}
                                    </div>
                                    {proj.link && (
                                      <a 
                                        href={proj.link} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none' }}
                                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                      >
                                        🔗 Project Link
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No projects listed.</div>
                          )}
                        </div>

                        {/* Experiences Section */}
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Work Experiences</div>
                          {experiences.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              {experiences.map((exp) => (
                                <div key={exp.id} className="experience-card" style={{ borderLeft: '3px solid var(--border-color)', paddingLeft: 12, paddingBottom: 4 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                    <div>
                                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{exp.position}</h4>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, marginTop: 2 }}>{exp.company}</div>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                      {exp.start_date ? new Date(exp.start_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '—'} 
                                      {' - '}
                                      {exp.is_current ? 'Present' : exp.end_date ? new Date(exp.end_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '—'}
                                    </span>
                                  </div>
                                  {exp.description && (
                                    <p style={{ margin: '6px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{exp.description}</p>
                                  )}
                                  {exp.achievements && (
                                    <div style={{ marginTop: 6 }}>
                                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Key Achievements</div>
                                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{exp.achievements}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No professional experience listed.</div>
                          )}
                        </div>

                        {/* Education & Certs Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                          {/* Education column */}
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Education</div>
                            {education.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {education.map((edu) => (
                                  <div key={edu.id} style={{ fontSize: '0.8rem' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{edu.degree} in {edu.field}</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{edu.institution}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                      <span>Grad: {edu.graduation_date ? new Date(edu.graduation_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '—'}</span>
                                      {edu.gpa && <span>GPA: {edu.gpa}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>No additional education entries.</div>
                            )}
                          </div>

                          {/* Certifications column */}
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Certifications</div>
                            {certifications.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {certifications.map((cert) => (
                                  <div key={cert.id} style={{ fontSize: '0.8rem' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                      {cert.credential_url ? (
                                        <a href={cert.credential_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}>
                                          📜 {cert.name} 🔗
                                        </a>
                                      ) : (
                                        `📜 ${cert.name}`
                                      )}
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Issued by: {cert.issuer}</div>
                                    {cert.date && (
                                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                        Date: {new Date(cert.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>No certifications listed.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {activeModalTab === 'mock_interviews' && (() => {
                    if (sessionsLoading) {
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
                          <div className="spinner" style={{ width: 30, height: 30, border: '3px solid rgba(249, 115, 22, 0.1)', borderTop: '3px solid var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Loading mock interview sessions...</span>
                        </div>
                      );
                    }

                    if (selectedSessionDetail) {
                      const feedback = selectedSessionDetail.feedback || {};
                      const answers = selectedSessionDetail.answers || [];
                      const isPendingReview = selectedSessionDetail.status === 'pending_review' || feedback.total_score === null || feedback.total_score === undefined;
                      
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

                      return (
                        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                          {/* Back Button */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                              onClick={() => setSelectedSessionDetail(null)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--accent-primary)',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                outline: 'none'
                              }}
                            >
                              ← Back to Session List
                            </button>
                          </div>

                          {/* Detail Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                            <div>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {selectedSessionDetail.domain_name}
                              </span>
                              <h3 style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {selectedSessionDetail.interview_type_name}
                              </h3>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                Session ID: <code style={{ fontSize: '0.7rem' }}>{selectedSessionDetail.id}</code> &bull; Taken {new Date(selectedSessionDetail.created_at).toLocaleString()}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '4px 10px',
                                borderRadius: 12,
                                background: selectedSessionDetail.use_voice ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                color: selectedSessionDetail.use_voice ? '#3B82F6' : 'var(--text-secondary)'
                              }}>
                                {selectedSessionDetail.use_voice ? '🎤 Voice' : '⌨️ Written'}
                              </span>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '4px 10px',
                                borderRadius: 12,
                                background: selectedSessionDetail.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                color: selectedSessionDetail.status === 'completed' ? '#10B981' : '#F59E0B'
                              }}>
                                {selectedSessionDetail.status === 'completed' ? 'Completed' : 'Pending Review'}
                              </span>
                            </div>
                          </div>

                          {/* Score and Dimensions Overview Row */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, alignItems: 'center', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 20 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRight: '1px solid var(--border-color)', paddingRight: 20 }}>
                              <div style={{
                                width: 90,
                                height: 90,
                                borderRadius: '50%',
                                border: `6px solid ${scoreColor}`,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 8px'
                              }}>
                                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                                  {isPendingReview ? '—' : Math.round(feedback.total_score)}
                                </span>
                                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>
                                  Overall
                                </span>
                              </div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: scoreColor }}>
                                {scoreGrade}
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                Core Dimension Scores
                              </h4>
                              {feedback.dimension_averages && Object.entries(feedback.dimension_averages).map(([dim, data]) => {
                                if (dim !== 'technical_accuracy' && dim !== 'depth') return null;
                                const label = dim === 'technical_accuracy' ? 'Technical Accuracy' : 'Depth';
                                const barColor = data.score >= 7 ? 'var(--success)' : data.score >= 5 ? 'var(--warning)' : 'var(--danger)';
                                const scorePct = (data.score / 10) * 100;
                                
                                return (
                                  <div key={dim}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
                                      <span style={{ fontWeight: 800, color: barColor }}>{Number(data.score).toFixed(1)}/10</span>
                                    </div>
                                    <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                                      <div style={{ height: '100%', background: barColor, width: `${scorePct}%`, borderRadius: 3 }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Executive Summary */}
                          {feedback.feedback_summary && (
                            <div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Executive Feedback Summary</div>
                              <div style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px 20px', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{feedback.feedback_summary}</p>
                              </div>
                            </div>
                          )}

                          {/* Strengths and Growth Areas Double Grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {feedback.strengths && feedback.strengths.length > 0 && (
                              <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: 800, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  💪 Key Strengths
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {feedback.strengths.slice(0, 5).map((s, idx) => <li key={idx}>{s}</li>)}
                                </ul>
                              </div>
                            )}

                            {feedback.weaknesses && feedback.weaknesses.length > 0 && (
                              <div style={{ background: 'rgba(245, 158, 11, 0.03)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: 800, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  🚀 Growth Areas
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {feedback.weaknesses.slice(0, 5).map((w, idx) => <li key={idx}>{w}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Question-by-Question Analysis */}
                          {answers.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Question-by-Question Breakdown</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {answers.map((ans, idx) => {
                                  const failedEval = ans.eval_status === 'failed';
                                  const evalJson = ans.evaluation_json || {};
                                  return (
                                    <div key={ans.id || idx} style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: 8, marginBottom: 12, gap: 12 }}>
                                        <div style={{ flex: 1 }}>
                                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'block', marginBottom: 2 }}>
                                            Question {ans.question_number}
                                          </span>
                                          <h5 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                            {ans.question_text || `Question Detail`}
                                          </h5>
                                        </div>
                                        <div style={{ textAlign: 'right', minWidth: 60 }}>
                                          {failedEval ? (
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                                              Failed Eval
                                            </span>
                                          ) : (
                                            <div>
                                              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: ans.score >= 70 ? 'var(--success)' : ans.score >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                                                {ans.score}
                                              </span>
                                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>/100</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {/* Candidate's answer */}
                                        <div>
                                          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                                            Learner Response:
                                          </div>
                                          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 6, borderLeft: '3px solid var(--border-color)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                                            {ans.answer_text}
                                          </p>
                                        </div>

                                        {/* Ideal answer summary */}
                                        {evalJson.ideal_answer_summary && (
                                          <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: 4 }}>
                                              Reference Benchmark Summary:
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 6, borderLeft: '3px solid var(--accent-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                                              {evalJson.ideal_answer_summary}
                                            </p>
                                          </div>
                                        )}

                                        {/* Score explanation */}
                                        {evalJson.score_explanation && (
                                          <div style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: 6, padding: '8px 12px' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--warning)', textTransform: 'uppercase', marginBottom: 4 }}>
                                              AI Score Justification:
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                              {evalJson.score_explanation}
                                            </p>
                                          </div>
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
                    }

                    if (studentSessions.length === 0) {
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', textAlign: 'center' }}>
                          <span style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎯</span>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Mock Interviews Recorded</h4>
                          <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 280, lineHeight: 1.4 }}>
                            This student has not attempted any AI mock interviews yet.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Mock Interview Sessions History</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {studentSessions.map((session) => {
                            const isPending = session.total_score === null || session.total_score === undefined;
                            const scoreClass = isPending ? 'badge-warning' : session.total_score >= 70 ? 'badge-success' : session.total_score >= 50 ? 'badge-warning' : 'badge-danger';
                            
                            return (
                              <div
                                key={session.id}
                                style={{
                                  background: 'var(--bg-card-hover)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: '14px 18px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: 12,
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <div>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {session.domain_name}
                                  </span>
                                  <h4 style={{ margin: '2px 0 4px 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {session.interview_type_name}
                                  </h4>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span>📅 {new Date(session.created_at).toLocaleDateString()}</span>
                                    <span>&bull;</span>
                                    <span>{session.use_voice ? '🎤 Voice' : '⌨️ Written'}</span>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div>
                                    {isPending ? (
                                      <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                                        Pending
                                      </span>
                                    ) : (
                                      <span className={`badge ${scoreClass}`} style={{ fontSize: '0.8rem', padding: '4px 10px', fontWeight: 800 }}>
                                        {Math.round(session.total_score)}%
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => fetchSessionDetail(session.id)}
                                    className="btn btn-outline btn-sm"
                                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                    disabled={detailLoading}
                                  >
                                    {detailLoading ? '...' : '👁️ Analyze'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {activeModalTab === 'edit' && (
                    <form onSubmit={handleEditSubmit} className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '4px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' }}>
                        {/* Name */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name *</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            required 
                            value={editForm.name} 
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                            style={{ width: '100%', boxSizing: 'border-box', height: 40 }}
                          />
                        </div>

                        {/* Registration Number (READ-ONLY) */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Registration Number (Read-Only)</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            disabled 
                            value={editForm.registration_number} 
                            style={{ width: '100%', boxSizing: 'border-box', height: 40, backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', cursor: 'not-allowed', border: '1px solid rgba(255,255,255,0.05)' }}
                          />
                        </div>

                        {/* Email */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address *</label>
                          <input 
                            type="email" 
                            className="input-field" 
                            required 
                            value={editForm.email} 
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} 
                            style={{ width: '100%', boxSizing: 'border-box', height: 40 }}
                          />
                        </div>

                        {/* Phone Number */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            value={editForm.phone_number} 
                            onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} 
                            style={{ width: '100%', boxSizing: 'border-box', height: 40 }}
                          />
                        </div>

                        {/* Course */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Course</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            value={editForm.course} 
                            onChange={(e) => setEditForm({ ...editForm, course: e.target.value })} 
                            style={{ width: '100%', boxSizing: 'border-box', height: 40 }}
                          />
                        </div>

                        {/* Stream */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stream</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            value={editForm.stream} 
                            onChange={(e) => setEditForm({ ...editForm, stream: e.target.value })} 
                            style={{ width: '100%', boxSizing: 'border-box', height: 40 }}
                          />
                        </div>

                        {/* Year */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Year</label>
                          <select 
                            className="input-field" 
                            value={editForm.year} 
                            onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                            style={{ width: '100%', boxSizing: 'border-box', height: 40 }}
                          >
                            <option value="">Select Year</option>
                            <option value="1st">1st Year</option>
                            <option value="2nd">2nd Year</option>
                            <option value="3rd">3rd Year</option>
                            <option value="4th">4th Year</option>
                          </select>
                        </div>

                        {/* Semester */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Semester</label>
                          <input 
                            type="number" 
                            className="input-field" 
                            min="1" 
                            max="12" 
                            value={editForm.semester} 
                            onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })} 
                            style={{ width: '100%', boxSizing: 'border-box', height: 40 }}
                          />
                        </div>

                        {/* Passing Year */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Passing Year</label>
                          <input 
                            type="number" 
                            className="input-field" 
                            min="2000" 
                            max="2100" 
                            value={editForm.passing_year} 
                            onChange={(e) => setEditForm({ ...editForm, passing_year: e.target.value })} 
                            style={{ width: '100%', boxSizing: 'border-box', height: 40 }}
                          />
                        </div>

                        {/* CGPA */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CGPA (0 - 10.0)</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            max="10" 
                            className="input-field" 
                            value={editForm.cgpa} 
                            onChange={(e) => setEditForm({ ...editForm, cgpa: e.target.value })} 
                            style={{ width: '100%', boxSizing: 'border-box', height: 40 }}
                          />
                        </div>

                        {/* General Attendance */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>General Attendance %</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            min="0" 
                            max="100" 
                            className="input-field" 
                            value={editForm.attendance} 
                            onChange={(e) => setEditForm({ ...editForm, attendance: e.target.value })} 
                            style={{ width: '100%', boxSizing: 'border-box', height: 40 }}
                          />
                        </div>

                        {/* Training Attendance */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Training Attendance %</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            min="0" 
                            max="100" 
                            className="input-field" 
                            value={editForm.training_attendance} 
                            onChange={(e) => setEditForm({ ...editForm, training_attendance: e.target.value })} 
                            style={{ width: '100%', boxSizing: 'border-box', height: 40 }}
                          />
                        </div>

                        {/* Backlogs Count */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Backlogs Count</label>
                          <input 
                            type="number" 
                            min="0" 
                            className="input-field" 
                            value={editForm.backlogs_count} 
                            onChange={(e) => setEditForm({ ...editForm, backlogs_count: e.target.value })} 
                            style={{ width: '100%', boxSizing: 'border-box', height: 40 }}
                          />
                        </div>

                        {/* Category */}
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Placement Category</label>
                          <select 
                            className="input-field" 
                            value={editForm.category} 
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            style={{ width: '100%', boxSizing: 'border-box', height: 40 }}
                          >
                            <option value="auto">🔄 Auto-Calculate</option>
                            <option value="A">Category A</option>
                            <option value="B">Category B</option>
                            <option value="C">Category C</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          onClick={() => setActiveModalTab('academics')}
                          style={{ minWidth: 100, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="btn btn-primary" 
                          style={{ minWidth: 140, background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Pinned Action Buttons */}
                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: 12,
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: 16,
                    flexShrink: 0
                  }}
                >
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setSelectedStudent(null)}
                    style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.5px' }}
                  >
                    Close
                  </button>
                  {/* Removed Block/Authorize Access button from modal footer per user request */}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
