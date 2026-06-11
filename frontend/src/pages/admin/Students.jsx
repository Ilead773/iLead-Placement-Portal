import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

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

// Helper function to prevent stream duplication if already part of course name
const shouldShowStream = (course, stream) => {
  if (!stream) return false;
  if (!course) return true;
  const courseClean = course.toLowerCase().replace(/[^a-z0-9]/g, '');
  const streamClean = stream.toLowerCase().replace(/[^a-z0-9]/g, '');
  return !courseClean.includes(streamClean);
};

// Helper function to clean up duplicate stream abbreviation from course name
const formatCourseName = (course, stream) => {
  if (!course) return '—';
  if (!stream) return course;
  
  // Clean up parenthesis and whitespace from stream to match
  const streamAbbr = stream.replace(/\(|\)/g, '').trim();
  
  // Check if course ends with the stream abbreviation in parentheses
  const regex = new RegExp(`\\s*\\(${streamAbbr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\)\\s*$`, 'i');
  if (regex.test(course)) {
    return course.replace(regex, '').trim();
  }
  
  // Also check direct stream name in parentheses
  const directRegex = new RegExp(`\\s*\\(${stream.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\)\\s*$`, 'i');
  if (directRegex.test(course)) {
    return course.replace(directRegex, '').trim();
  }

  return course;
};

// Helper function to clean up course prefix/parentheses from stream name
const formatStreamName = (course, stream) => {
  if (!stream) return '';
  if (!course) return stream;
  const courseClean = course.trim();
  const escapedCourse = courseClean.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const startsWithCourseParenthesis = new RegExp(`^${escapedCourse}\\s*\\(([^)]+)\\)`, 'i');
  const match = stream.match(startsWithCourseParenthesis);
  if (match) return match[1];
  const startsWithCourseDirect = new RegExp(`^${escapedCourse}\\s*[-:]*\\s*`, 'i');
  if (startsWithCourseDirect.test(stream)) {
    const remaining = stream.replace(startsWithCourseDirect, '').trim();
    return remaining || stream;
  }
  return stream;
};


export default function Students() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const { user } = useAuthStore();

  const [confirmDelete, setConfirmDelete] = useState(null);
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

  useEffect(() => { fetchStudents(1); }, [fetchStudents]);



  const handleDeleteStudent = async (studentId) => {
    try {
      await api.delete(`/students/${studentId}/delete/`);
      showToast('Student profile and portal account deleted permanently.');
      setConfirmDelete(null);
      fetchStudents(page);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete student.', 'error');
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

  const getAvatarGradient = (name) => {
    const colors = [
      ['#3b82f6', '#8b5cf6'], // Blue to Purple
      ['#10b981', '#059669'], // Green to Dark Green
      ['#f59e0b', '#d97706'], // Amber to Orange
      ['#ec4899', '#be185d'], // Pink to Dark Pink
      ['#6366f1', '#4f46e5'], // Indigo to Violet
    ];
    const index = name ? name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length : 0;
    const [start, end] = colors[index];
    return `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Students ({total})</h1>
      </div>

      <div className="search-and-filter-header" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: showAdvancedFilters ? 16 : 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 250, maxWidth: 500 }}>
          <input 
            className="input-field" 
            placeholder="Search by name, reg no, or email..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ width: '100%', paddingLeft: 40 }}
          />
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5, display: 'flex', alignItems: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </span>
        </div>
        
        <button 
          className="btn btn-secondary"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42 }}
        >
          {showAdvancedFilters ? '✕ Hide Filters' : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              Advanced Filters
            </span>
          )}
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
        <div className="advanced-filters-panel animate-in">
          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Course</label>
            <select className="input-field" value={filters.course} onChange={(e) => setFilters({...filters, course: e.target.value})} style={{ width: '100%' }}>
              <option value="">All Courses</option>
              <option value="BBA">BBA</option>
              <option value="BBA in Digital Marketing (BBA DM)">BBA in Digital Marketing (BBA DM)</option>
              <option value="BBA in Travel & Tourism Management (BBA TTM)">BBA in Travel & Tourism (BBA TTM)</option>
              <option value="BBA in Entrepreneurship (BBA ENT)">BBA in Entrepreneurship (BBA ENT)</option>
              <option value="BBA in Sports Management (BBA SM)">BBA in Sports Management (BBA SM)</option>
              <option value="BBA in Hospital Management (BBA HM)">BBA in Hospital Management (BBA HM)</option>
              <option value="BSc in Media Science (BMS)">BSc in Media Science (BMS)</option>
              <option value="MSc in Media Science">MSc in Media Science</option>
              <option value="BSc in Multimedia, Animation, Graphic Design (BMAGD)">BSc in Multimedia & Animation (BMAGD)</option>
              <option value="MSc in Multimedia, Animation, Graphic Design (MMAGD)">MSc in Multimedia & Animation (MMAGD)</option>
              <option value="BSc in Film and Television Production (FTP)">BSc in Film & TV Production (FTP)</option>
              <option value="BSc in Interior Design">BSc in Interior Design</option>
              <option value="BSc in Sustainable Fashion Design & Management">BSc in Sustainable Fashion</option>
              <option value="Bachelor in Optometry">Bachelor in Optometry</option>
              <option value="BSc in Critical Care Technology (CCT)">BSc in Critical Care Technology (CCT)</option>
              <option value="BSc in Medical Laboratory Technology (BMLT)">BSc in Medical Lab Tech (BMLT)</option>
              <option value="BSc in Data Science">BSc in Data Science</option>
              <option value="BSc in Cyber Security">BSc in Cyber Security</option>
              <option value="BSc in Computer Application (BCA)">BSc in Computer Application (BCA)</option>
            </select>
          </div>


          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Semester</label>
            <select className="input-field" value={filters.semester} onChange={(e) => setFilters({...filters, semester: e.target.value})} style={{ width: '100%' }}>
              <option value="">All Sems</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
              <option value="3">Semester 3</option>
              <option value="4">Semester 4</option>
              <option value="5">Semester 5</option>
              <option value="6">Semester 6</option>
              <option value="7">Semester 7</option>
              <option value="8">Semester 8</option>
            </select>
          </div>

          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Year</label>
            <select className="input-field" value={filters.year} onChange={(e) => setFilters({...filters, year: e.target.value})} style={{ width: '100%' }}>
              <option value="">All Years</option>
              <option value="1st">1st Year</option>
              <option value="2nd">2nd Year</option>
              <option value="3rd">3rd Year</option>
              <option value="4th">4th Year</option>
            </select>
          </div>

          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</label>
            <select className="input-field" value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})} style={{ width: '100%' }}>
              <option value="">All Categories</option>
              <option value="A">Category A</option>
              <option value="B">Category B</option>
              <option value="C">Category C</option>
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
                      <div style={{ fontWeight: 800, marginBottom: 8, fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                        PACT Score Weightages
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Elegant Circular Avatar */}
                        <div style={{ width: 40, height: 40, flexShrink: 0, position: 'relative' }}>
                          {s.profile?.profile_picture ? (
                            <img 
                              src={getFullImageUrl(s.profile.profile_picture)} 
                              alt={s.name}
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '1.5px solid var(--border-color)',
                                boxShadow: 'var(--shadow-sm)',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                zIndex: 2
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : null}
                          <div 
                            style={{ 
                              width: 40, 
                              height: 40, 
                              borderRadius: '50%', 
                              background: getAvatarGradient(s.name), 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              color: 'white', 
                              fontWeight: 700, 
                              fontSize: '0.95rem',
                              fontFamily: 'var(--font-heading)',
                              boxShadow: 'var(--shadow-sm)',
                              textTransform: 'uppercase',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              zIndex: 1
                            }}
                          >
                            {s.name ? s.name.charAt(0) : 'S'}
                          </div>
                        </div>

                        {/* Text Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span 
                            className="student-name-link"
                            onClick={() => fetchStudentProfile(s.id)}
                            title="Click to view full student profile"
                          >
                            {s.name}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '4px 8px', whiteSpace: 'nowrap' }}>
                            <span>{s.email}</span>
                            {s.phone_number && <span style={{ opacity: 0.6 }}>•</span>}
                            {s.phone_number && <span>{s.phone_number}</span>}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ verticalAlign: 'middle', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{s.registration_number}</td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {formatCourseName(s.course, s.stream)}
                        </span>
                        {s.stream && shouldShowStream(s.course, s.stream) && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {formatStreamName(s.course, s.stream)}
                          </span>
                        )}
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
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450, padding: 24 }}>
            <div className="modal-header">
              <h2 style={{ color: 'var(--danger)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                Permanent Deletion Warning
              </h2>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>×</button>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-muted)', marginTop: 12 }}>
              Are you sure you want to permanently delete <strong>{confirmDelete.name}</strong> ({confirmDelete.registration_number})?
            </p>
            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: 12, borderRadius: 6, margin: '16px 0', fontSize: '0.8rem', color: '#991b1b' }}>
              <strong>CRITICAL:</strong> This will erase all user logins, profile info, uploaded resumes, assignments, and placement histories. This action is absolute and cannot be undone.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDeleteStudent(confirmDelete.id)}>Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {confirmToggleAccess && (
        <div className="modal-overlay" onClick={() => setConfirmToggleAccess(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450, padding: 24 }}>
            <div className="modal-header">
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                Portal Access Control
              </h2>
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
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)} style={{ zIndex: 1100, backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.4)' }}>
          <div 
            className="student-profile-modal card animate-in" 
            onClick={(e) => e.stopPropagation()} 
          >
            <style>{`
              .modal-sidebar::-webkit-scrollbar {
                width: 10px;
              }
              .modal-sidebar::-webkit-scrollbar-track {
                background: transparent;
              }
              .modal-sidebar::-webkit-scrollbar-thumb {
                background: rgba(148, 163, 184, 0.35);
                border: 2.5px solid transparent;
                background-clip: padding-box;
                border-radius: 10px;
              }
              .modal-sidebar::-webkit-scrollbar-thumb:hover {
                background: var(--accent-primary);
                border: 2.5px solid transparent;
                background-clip: padding-box;
              }
              .modal-main-panel-scroll {
                scroll-behavior: smooth;
              }
              .modal-main-panel-scroll::-webkit-scrollbar {
                width: 10px;
              }
              .modal-main-panel-scroll::-webkit-scrollbar-track {
                background: transparent;
              }
              .modal-main-panel-scroll::-webkit-scrollbar-thumb {
                background: rgba(148, 163, 184, 0.35);
                border: 2.5px solid transparent;
                background-clip: padding-box;
                border-radius: 10px;
              }
              .modal-main-panel-scroll::-webkit-scrollbar-thumb:hover {
                background: var(--accent-primary);
                border: 2.5px solid transparent;
                background-clip: padding-box;
              }
              
              /* Details Accordion Styles */
              details.accordion-block summary::-webkit-details-marker {
                display: none;
              }
              details.accordion-block summary {
                list-style: none;
              }
              details.accordion-block[open] .accordion-chevron {
                transform: rotate(90deg);
              }
            `}</style>

            {/* Modal Premium Abstract Cover Banner */}
            <div 
              style={{ 
                background: 'radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
                height: '120px',
                position: 'relative',
                flexShrink: 0,
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                overflow: 'hidden'
              }}
            >
              {/* Subtle background abstract decorations */}
              <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', filter: 'blur(30px)' }} />
              <div style={{ position: 'absolute', bottom: -50, left: 80, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
              
              <button 
                onClick={() => setSelectedStudent(null)}
                style={{ 
                  position: 'absolute', 
                  top: 16, 
                  right: 24, 
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '1rem',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 20,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; 
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; 
                  e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                ✕
              </button>
            </div>

            {/* Overlapping Profile Summary Row */}
            <div 
              style={{ 
                padding: '0 32px', 
                display: 'flex', 
                gap: '24px', 
                alignItems: 'flex-start', 
                marginBottom: 16, 
                flexShrink: 0, 
                position: 'relative', 
                zIndex: 10 
              }}
            >
              {/* Circular Avatar */}
              <div 
                style={{ 
                  width: 96, 
                  height: 96, 
                  minWidth: 96,
                  minHeight: 96,
                  borderRadius: '50%', 
                  border: '4px solid var(--bg-card)', 
                  boxShadow: '0 8px 20px rgba(0,0,0,0.15), 0 0 0 1px var(--border-color)', 
                  background: 'var(--bg-card)',
                  position: 'relative', 
                  marginTop: '-48px',
                  overflow: 'hidden',
                  flexShrink: 0
                }}
              >
                {selectedStudent.profile?.profile_picture ? (
                  <img 
                    src={getFullImageUrl(selectedStudent.profile.profile_picture)} 
                    alt={selectedStudent.name}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      zIndex: 2,
                      transition: 'transform 0.3s ease'
                    }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : null}
                <div 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    background: getAvatarGradient(selectedStudent.name), 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '2.1rem', 
                    fontWeight: 800, 
                    color: 'white', 
                    fontFamily: 'var(--font-heading)',
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

              {/* Student basic info */}
              <div style={{ flex: 1, minWidth: 0, paddingTop: '14px', marginLeft: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '1.65rem', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', fontWeight: 800, letterSpacing: '-0.015em', lineHeight: '1.25' }}>
                    {selectedStudent.name}
                  </h2>
                  {selectedStudent.category && (
                    <span 
                      style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        background: selectedStudent.category === 'A' ? 'rgba(16, 185, 129, 0.12)' : selectedStudent.category === 'B' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: selectedStudent.category === 'A' ? '#059669' : selectedStudent.category === 'B' ? '#d97706' : '#dc2626',
                        padding: '6px 14px', 
                        borderRadius: '9999px', 
                        fontSize: '0.8rem', 
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: selectedStudent.category === 'A' ? '#10b981' : selectedStudent.category === 'B' ? '#f59e0b' : '#ef4444' }} />
                      Cat {selectedStudent.category}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>Reg No: <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{selectedStudent.registration_number}</strong></span>
                  <span style={{ opacity: 0.3 }}>•</span>
                  <span>
                    {formatCourseName(selectedStudent.course, selectedStudent.stream)}
                    {selectedStudent.stream && shouldShowStream(selectedStudent.course, selectedStudent.stream)
                      ? ` (${formatStreamName(selectedStudent.course, selectedStudent.stream)})`
                      : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Split Screen Modal Body */}
            <div className="modal-body-split">
              {/* Left Sidebar */}
              <div className="modal-sidebar">
                {/* Unified Performance Stats Container (2x2 Grid) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', paddingBottom: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)' }} />
                    Performance KPIs
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* Widget 1: CGPA */}
                    <div style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '16px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'transform 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', height: 24 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg></span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>CGPA Score</span>
                      <span style={{
                        fontSize: '1.25rem',
                        fontWeight: 900,
                        color: selectedStudent.cgpa >= 8.0 ? '#10b981' : selectedStudent.cgpa >= 6.5 ? '#f59e0b' : '#ef4444'
                      }}>
                        {selectedStudent.cgpa != null ? selectedStudent.cgpa.toFixed(2) : '—'}
                        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>/10</span>
                      </span>
                    </div>

                    {/* Widget 2: Attendance */}
                    <div style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '16px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'transform 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', height: 24 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Attendance</span>
                      <span style={{
                        fontSize: '1.25rem',
                        fontWeight: 900,
                        color: selectedStudent.attendance >= 85 ? '#10b981' : selectedStudent.attendance >= 75 ? '#f59e0b' : '#ef4444'
                      }}>
                        {selectedStudent.attendance != null ? `${selectedStudent.attendance}%` : '—'}
                      </span>
                    </div>

                    {/* Widget 3: Training */}
                    <div style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '16px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'transform 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', height: 24 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><line x1="12" y1="4" x2="12" y2="20"/></svg></span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Training Attd</span>
                      <span style={{
                        fontSize: '1.25rem',
                        fontWeight: 900,
                        color: selectedStudent.training_attendance >= 100.0 ? '#10b981' : selectedStudent.training_attendance >= 80.0 ? '#f59e0b' : '#ef4444'
                      }}>
                        {selectedStudent.training_attendance != null ? `${selectedStudent.training_attendance}%` : '—'}
                      </span>
                    </div>

                    {/* Widget 4: Backlogs */}
                    <div style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '16px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'transform 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', height: 24 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: selectedStudent.backlogs_count > 0 ? '#ef4444' : '#10b981' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Backlogs</span>
                      <span style={{
                        fontSize: '1.25rem',
                        fontWeight: 900,
                        color: selectedStudent.backlogs_count > 0 ? '#ef4444' : '#10b981'
                      }}>
                        {selectedStudent.backlogs_count > 0 ? `${selectedStudent.backlogs_count} Active` : 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Information (Sleek List Tiles) */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 20, flexShrink: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Contact Details</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Email Tile */}
                    <a 
                      href={`mailto:${selectedStudent.email}`}
                      title="Send email to student"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 14, 
                        fontSize: '0.9rem', 
                        padding: '12px 16px',
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
                      <span style={{ 
                        width: 32, 
                        height: 32, 
                        minWidth: 32,
                        borderRadius: '8px', 
                        background: 'rgba(59, 130, 246, 0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '1.1rem'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      </span> 
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Email Address</span>
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{selectedStudent.email}</span>
                      </div>
                    </a>
                    
                    {/* Phone Tile */}
                    <a 
                      href={selectedStudent.phone_number ? `tel:${selectedStudent.phone_number}` : '#'}
                      title={selectedStudent.phone_number ? "Call student phone number" : undefined}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 14, 
                        fontSize: '0.9rem', 
                        padding: '12px 16px',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontWeight: 600,
                        border: '1px solid var(--border-color)',
                        color: selectedStudent.phone_number ? 'var(--text-primary)' : 'var(--text-muted)',
                        background: 'var(--bg-card)',
                        boxShadow: 'var(--shadow-sm)',
                        transition: selectedStudent.phone_number ? 'all 0.2s ease-in-out' : 'none',
                        cursor: selectedStudent.phone_number ? 'pointer' : 'default'
                      }}
                      onMouseEnter={(e) => { 
                        if (selectedStudent.phone_number) {
                          e.currentTarget.style.borderColor = 'var(--accent-primary)'; 
                          e.currentTarget.style.background = 'var(--accent-soft)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                        }
                      }}
                      onMouseLeave={(e) => { 
                        if (selectedStudent.phone_number) {
                          e.currentTarget.style.borderColor = 'var(--border-color)'; 
                          e.currentTarget.style.background = 'var(--bg-card)';
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                        }
                      }}
                      onClick={(e) => {
                        if (!selectedStudent.phone_number) e.preventDefault();
                      }}
                    >
                      <span style={{ 
                        width: 32, 
                        height: 32, 
                        minWidth: 32,
                        borderRadius: '8px', 
                        background: selectedStudent.phone_number ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '1.1rem'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: selectedStudent.phone_number ? '#10b981' : 'var(--text-muted)' }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      </span> 
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Phone Number</span>
                        <span style={{ color: selectedStudent.phone_number ? 'var(--text-secondary)' : 'var(--text-muted)', fontStyle: selectedStudent.phone_number ? 'normal' : 'italic' }}>
                          {selectedStudent.phone_number || 'Not Provided'}
                        </span>
                      </div>
                    </a>
                  </div>
                </div>

                {/* Socials & Portfolio (Compact Flex Row) */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 20, flexShrink: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Socials & Portfolio</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {selectedStudent.profile?.linkedin && (
                      <a 
                        href={selectedStudent.profile.linkedin} 
                        target="_blank" 
                        rel="noreferrer"
                        title="LinkedIn Profile"
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: 8,
                          fontSize: '0.82rem', 
                          padding: '10px 16px',
                          borderRadius: '20px',
                          textDecoration: 'none',
                          fontWeight: 700,
                          border: '1px solid rgba(10, 102, 194, 0.2)',
                          color: '#0a66c2',
                          background: 'rgba(10, 102, 194, 0.05)',
                          transition: 'all 0.2s',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(10, 102, 194, 0.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(10, 102, 194, 0.05)'; e.currentTarget.style.transform = 'none'; }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg> LinkedIn
                      </a>
                    )}
                    {selectedStudent.profile?.github && (
                      <a 
                        href={selectedStudent.profile.github} 
                        target="_blank" 
                        rel="noreferrer"
                        title="GitHub Profile"
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: 8,
                          fontSize: '0.82rem', 
                          padding: '10px 16px',
                          borderRadius: '20px',
                          textDecoration: 'none',
                          fontWeight: 700,
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          background: 'var(--bg-card)',
                          transition: 'all 0.2s',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.transform = 'none'; }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg> GitHub
                      </a>
                    )}
                    {selectedStudent.profile?.portfolio && (
                      <a 
                        href={selectedStudent.profile.portfolio} 
                        target="_blank" 
                        rel="noreferrer"
                        title="Portfolio Website"
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: 8,
                          fontSize: '0.82rem', 
                          padding: '10px 16px',
                          borderRadius: '20px',
                          textDecoration: 'none',
                          fontWeight: 700,
                          border: '1px solid rgba(249, 115, 22, 0.2)',
                          color: 'var(--accent-primary)',
                          background: 'var(--accent-soft)',
                          transition: 'all 0.2s',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(249, 115, 22, 0.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.transform = 'none'; }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Portfolio
                      </a>
                    )}
                    {selectedStudent.profile?.location && (
                      <div 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: 8, 
                          fontSize: '0.82rem', 
                          padding: '10px 16px',
                          borderRadius: '20px',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-card)'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> {selectedStudent.profile.location}
                      </div>
                    )}
                    {!selectedStudent.profile?.linkedin && !selectedStudent.profile?.github && !selectedStudent.profile?.portfolio && !selectedStudent.profile?.location && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', paddingLeft: 4 }}>No socials or portfolio links.</div>
                    )}
                  </div>
                </div>

                {/* Account details & Logs Footer */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0, marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Portal Access</span>
                    <span 
                      style={{ 
                        padding: '4px 10px', 
                        fontSize: '0.75rem', 
                        borderRadius: '4px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background: selectedStudent.is_active !== false ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: selectedStudent.is_active !== false ? '#10b981' : '#ef4444'
                      }}
                    >
                      {selectedStudent.is_active !== false ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>Registered: {selectedStudent.created_at ? new Date(selectedStudent.created_at).toLocaleDateString() : '—'}</span>
                    <span>Updated: {selectedStudent.updated_at ? new Date(selectedStudent.updated_at).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Right Main Panel */}
              <div className="modal-main-panel">
                {/* Tab Navigation (Segmented Pill Controls) */}
                <div 
                  style={{ 
                    display: 'flex', 
                    background: 'var(--border-light)', 
                    padding: '6px', 
                    borderRadius: '12px', 
                    marginBottom: 16, 
                    gap: 6, 
                    overflowX: 'auto', 
                    scrollbarWidth: 'none', 
                    flexShrink: 0
                  }}
                >
                  {[
                    { id: 'academics', label: 'Academics' },
                    { id: 'skills', label: 'Skills & Bio' },
                    { id: 'experience', label: 'Projects & Exp' },
                    { id: 'mock_interviews', label: 'Mock Interviews' },
                    ...((user?.role === 'admin' || user?.can_manage_students) ? [{ id: 'edit', label: 'Edit Info' }] : [])
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveModalTab(tab.id)}
                      style={{
                        padding: '10px 20px',
                        background: activeModalTab === tab.id ? 'var(--bg-card)' : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        color: activeModalTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: activeModalTab === tab.id ? '800' : '600',
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        boxShadow: activeModalTab === tab.id ? '0 2px 6px rgba(0, 0, 0, 0.06)' : 'none',
                        transition: 'all 0.25s ease',
                        whiteSpace: 'nowrap',
                        outline: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                      onMouseEnter={(e) => {
                        if (activeModalTab !== tab.id) {
                          e.currentTarget.style.color = 'var(--text-primary)';
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeModalTab !== tab.id) {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                 {/* Scrollable Tab Content Area */}
                 <div 
                   className="modal-main-panel-scroll"
                   style={{ 
                     flex: 1, 
                     overflowY: 'auto',
                     paddingRight: 16,
                     marginBottom: 0
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
                          fontSize: '0.88rem', 
                          padding: '6px 10px',
                          background: isMet ? 'rgba(34, 197, 94, 0.04)' : 'rgba(239, 68, 68, 0.02)',
                          borderLeft: `3px solid ${isMet ? 'var(--success)' : 'var(--text-muted)'}`,
                          borderRadius: '6px',
                          color: isMet ? 'var(--text-primary)' : 'var(--text-muted)'
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{labelText}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.78rem', color: isMet ? 'var(--success)' : 'var(--text-muted)', fontWeight: 700 }}>{gotText}</span>
                          <span 
                            style={{ 
                              color: isMet ? 'var(--success)' : 'var(--danger)',
                              fontWeight: 900,
                              fontSize: '1rem'
                            }}
                          >
                            {isMet ? '✓' : '✗'}
                          </span>
                        </div>
                      </div>
                    );

                    return (
                      <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Student Core Academic Info Card Group */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 20,
                          width: '100%'
                        }}>
                          {/* Program Info Card */}
                          <div style={{
                            background: 'var(--bg-card-hover)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            padding: '20px 24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14
                          }}>
                            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid var(--border-light)', paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                              Program Details
                            </div>
                            <div className="grid-responsive-2" style={{ gap: 14 }}>
                              <div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: 2 }}>Course</span>
                                <span style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedStudent.course || '—'}</span>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: 2 }}>Stream</span>
                                <span style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedStudent.stream || '—'}</span>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: 2 }}>Current Year</span>
                                <span style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedStudent.year ? `${selectedStudent.year} Year` : '—'}</span>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: 2 }}>Semester</span>
                                <span style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedStudent.semester ? 'Semester ' + selectedStudent.semester : '—'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Graduation & Timeline Card */}
                          <div style={{
                            background: 'var(--bg-card-hover)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            padding: '20px 24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14
                          }}>
                            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid var(--border-light)', paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" /></svg>
                              Timeline & Identity
                            </div>
                            <div className="grid-responsive-2" style={{ gap: 14 }}>
                              <div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: 2 }}>Registration No</span>
                                <span style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedStudent.registration_number || '—'}</span>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: 2 }}>Graduation Year</span>
                                <span style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedStudent.passing_year || '—'}</span>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: 2 }}>Email</span>
                                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedStudent.email}</span>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: 2 }}>Phone</span>
                                <span style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedStudent.phone_number || '—'}</span>
                              </div>
                            </div>
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
                                borderRadius: '16px',
                                background: 'var(--bg-card-hover)',
                                padding: '20px 24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 16,
                                boxShadow: 'var(--shadow-sm)'
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                                  PACT Placement Readiness Dashboard
                                </div>
                                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                  Unified readiness score computed on Academic, Attendance, Training, and Standing KPIs.
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
                                {/* Conic Gradient Gauge */}
                                <div style={{
                                  width: '130px',
                                  height: '130px',
                                  borderRadius: '50%',
                                  background: `conic-gradient(${pactColor} ${pactScoreVal * 3.6}deg, var(--border-light) 0deg)`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  position: 'relative',
                                  boxShadow: `0 0 20px -5px ${pactColor}40, var(--shadow-sm)`,
                                  flexShrink: 0
                                }}>
                                  <div style={{
                                    width: '108px',
                                    height: '108px',
                                    borderRadius: '50%',
                                    background: 'var(--bg-card)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.04)'
                                  }}>
                                    <span style={{ fontSize: '2.1rem', fontWeight: 900, color: pactColor, fontFamily: 'var(--font-heading)', lineHeight: 1 }}>
                                      {pactScoreVal.toFixed(1)}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>
                                      PACT Score
                                    </span>
                                  </div>
                                </div>

                                {/* Breakdown Grid */}
                                <div style={{ flex: 1, minWidth: '250px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                  {/* 1. CGPA */}
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                                      <span>Performance (CGPA: {cgpaVal.toFixed(2)} / 10)</span>
                                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{performanceContrib.toFixed(1)} / 35.0 pts (35%)</span>
                                    </div>
                                    <div style={{ height: '8px', background: 'var(--border-light)', borderRadius: '4px', overflow: 'hidden' }}>
                                      <div style={{ width: `${cgpaScore}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: '4px' }} />
                                    </div>
                                  </div>

                                  {/* 2. General Attendance */}
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                                      <span>General Attendance ({attendanceVal.toFixed(1)}%)</span>
                                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{attendanceContrib.toFixed(1)} / 25.0 pts (25%)</span>
                                    </div>
                                    <div style={{ height: '8px', background: 'var(--border-light)', borderRadius: '4px', overflow: 'hidden' }}>
                                      <div style={{ width: `${attendanceVal}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '4px' }} />
                                    </div>
                                  </div>

                                  {/* 3. Training Attendance */}
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                                      <span>Training Attendance ({trainingVal.toFixed(1)}%)</span>
                                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{trainingContrib.toFixed(1)} / 25.0 pts (25%)</span>
                                    </div>
                                    <div style={{ height: '8px', background: 'var(--border-light)', borderRadius: '4px', overflow: 'hidden' }}>
                                      <div style={{ width: `${trainingVal}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)', borderRadius: '4px' }} />
                                    </div>
                                  </div>

                                  {/* 4. Standing / Backlogs */}
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                                      <span>Standing ({backlogCountVal} Backlogs, Score: {standingScore.toFixed(0)}%)</span>
                                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{standingContrib.toFixed(1)} / 15.0 pts (15%)</span>
                                    </div>
                                    <div style={{ height: '8px', background: 'var(--border-light)', borderRadius: '4px', overflow: 'hidden' }}>
                                      <div style={{ width: `${standingScore}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: '4px' }} />
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
                            borderRadius: '16px',
                            background: 'var(--bg-card-hover)',
                            padding: '20px 24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                              Placement Category Eligibility Engine
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                              Students are classified based on a multi-KPI scorecard. Satisfying <strong>at least 3 out of 4 conditions</strong> places the student into that tier.
                            </div>
                          </div>

                          {/* Category Manual Override */}
                          <div 
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 18px',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '12px',
                              marginTop: '4px',
                              flexWrap: 'wrap',
                              gap: 12
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                                Category Manual Override
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
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
                                      borderRadius: '8px',
                                      border: isSelected 
                                        ? `1px solid ${cat === 'A' ? '#10b981' : cat === 'B' ? '#f59e0b' : cat === 'C' ? '#ef4444' : 'var(--accent-primary)'}` 
                                        : '1px solid var(--border-color)',
                                      background: isSelected 
                                        ? (cat === 'A' ? 'rgba(16, 185, 129, 0.12)' : cat === 'B' ? 'rgba(245, 158, 11, 0.12)' : cat === 'C' ? 'rgba(239, 68, 68, 0.12)' : 'var(--accent-soft)') 
                                        : 'var(--bg-card)',
                                      color: isSelected 
                                        ? (cat === 'A' ? '#059669' : cat === 'B' ? '#d97706' : cat === 'C' ? '#dc2626' : 'var(--accent-primary)') 
                                        : 'var(--text-secondary)',
                                      transition: 'all 0.2s ease',
                                      boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                    }}
                                  >
                                    {cat === 'auto' ? 'Auto (Reset)' : `Cat ${cat}`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Row of Categories A, B, C */}
                          <div className="grid-responsive-3" style={{ gap: 16, marginTop: 4 }}>
                            {/* Category A Card */}
                            <div 
                              style={{ 
                                background: assignedCat === 'A' ? 'rgba(16, 185, 129, 0.02)' : 'var(--bg-card)', 
                                border: assignedCat === 'A' ? '2px solid #10b981' : '1px solid var(--border-color)',
                                borderRadius: '12px', 
                                padding: '16px',
                                position: 'relative',
                                opacity: assignedCat === 'A' ? 1 : 0.6,
                                transition: 'all 0.25s',
                                boxShadow: assignedCat === 'A' ? '0 8px 25px rgba(16, 185, 129, 0.12), var(--shadow-md)' : 'none'
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
                                    fontSize: '0.62rem', 
                                    fontWeight: 800, 
                                    padding: '2px 8px', 
                                    borderRadius: 10,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.3px'
                                  }}
                                >
                                  Active
                                </span>
                              )}
                              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: assignedCat === 'A' ? 'var(--success)' : 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Category A</span>
                                <span style={{ fontSize: '0.72rem', background: 'var(--border-light)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{scoreA}/4 Met</span>
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
                                background: assignedCat === 'B' ? 'rgba(245, 158, 11, 0.02)' : 'var(--bg-card)', 
                                border: assignedCat === 'B' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                                borderRadius: '12px', 
                                padding: '16px',
                                position: 'relative',
                                opacity: assignedCat === 'B' ? 1 : 0.6,
                                transition: 'all 0.25s',
                                boxShadow: assignedCat === 'B' ? '0 8px 25px rgba(245, 158, 11, 0.12), var(--shadow-md)' : 'none'
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
                                    fontSize: '0.62rem', 
                                    fontWeight: 800, 
                                    padding: '2px 8px', 
                                    borderRadius: 10,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.3px'
                                  }}
                                >
                                  Active
                                </span>
                              )}
                              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: assignedCat === 'B' ? 'var(--warning)' : 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Category B</span>
                                <span style={{ fontSize: '0.72rem', background: 'var(--border-light)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{scoreB}/4 Met</span>
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
                                background: assignedCat === 'C' ? 'rgba(239, 68, 68, 0.02)' : 'var(--bg-card)', 
                                border: assignedCat === 'C' ? '2px solid #ef4444' : '1px solid var(--border-color)',
                                borderRadius: '12px', 
                                padding: '16px',
                                position: 'relative',
                                opacity: assignedCat === 'C' ? 1 : 0.6,
                                transition: 'all 0.25s',
                                boxShadow: assignedCat === 'C' ? '0 8px 25px rgba(239, 68, 68, 0.12), var(--shadow-md)' : 'none'
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
                                    fontSize: '0.62rem', 
                                    fontWeight: 800, 
                                    padding: '2px 8px', 
                                    borderRadius: 10,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.3px'
                                  }}
                                >
                                  Active
                                </span>
                              )}
                              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: assignedCat === 'C' ? 'var(--accent-primary)' : 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Category C</span>
                                <span style={{ fontSize: '0.72rem', background: 'var(--border-light)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{scoreC}/4 Met</span>
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
                    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                      {/* Summary Box */}
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Professional Summary</div>
                        <div style={{ 
                          background: 'var(--bg-card-hover)', 
                          borderLeft: '4px solid var(--accent-primary)',
                          borderTop: '1px solid var(--border-color)',
                          borderRight: '1px solid var(--border-color)',
                          borderBottom: '1px solid var(--border-color)',
                          borderRadius: '12px', 
                          padding: '20px 24px', 
                          fontSize: '1rem', 
                          color: 'var(--text-secondary)', 
                          lineHeight: '1.6', 
                          whiteSpace: 'pre-wrap',
                          position: 'relative',
                          fontStyle: 'italic',
                          boxShadow: 'var(--shadow-sm)'
                        }}>
                          <span style={{ position: 'absolute', top: 10, left: 10, fontSize: '2.5rem', opacity: 0.08, lineHeight: 1, pointerEvents: 'none', fontFamily: 'serif' }}>“</span>
                          {selectedStudent.profile?.professional_summary || "No professional summary has been set up for this student yet."}
                        </div>
                      </div>

                      {/* Skills badges */}
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Technical & Soft Skills</div>
                        {selectedStudent.profile?.skills && selectedStudent.profile.skills.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {selectedStudent.profile.skills.map((skill) => (
                              <div 
                                key={skill.id} 
                                className="skill-badge"
                                style={{ 
                                  padding: '8px 16px',
                                  borderRadius: '20px',
                                  fontSize: '0.95rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  border: '1px solid var(--border-color)',
                                  background: 'var(--bg-card)',
                                  boxShadow: 'var(--shadow-sm)'
                                }}
                              >
                                <span style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: skill.proficiency === 'expert' ? '#3b82f6' : skill.proficiency === 'intermediate' ? '#f59e0b' : '#10b981',
                                  display: 'inline-block'
                                }} />
                                <span className="skill-name" style={{ fontWeight: 600 }}>{skill.name}</span>
                                {skill.proficiency && (
                                  <span 
                                    className="skill-level"
                                    style={{ 
                                      fontSize: '0.72rem',
                                      textTransform: 'uppercase',
                                      color: 'var(--accent-primary)',
                                      fontWeight: 800,
                                      background: 'var(--accent-soft)',
                                      padding: '3px 8px',
                                      borderRadius: '4px'
                                    }}
                                  >
                                    {skill.proficiency}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.92rem', fontStyle: 'italic', paddingLeft: 4 }}>No skills specified in student profile yet.</div>
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
                      <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                        {/* Projects Section */}
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Projects</div>
                          {projects.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', paddingLeft: 20, borderLeft: '2px solid var(--border-color)' }}>
                              {projects.map((proj) => (
                                <div key={proj.id} className="project-card" style={{ position: 'relative' }}>
                                  {/* Timeline node */}
                                  <div style={{
                                    position: 'absolute',
                                    left: -27,
                                    top: 6,
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    background: 'var(--accent-primary)',
                                    border: '3px solid var(--bg-card)',
                                    boxShadow: '0 0 0 2px var(--border-color)'
                                  }} />
                                  
                                  <div style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px 20px', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{proj.title}</h4>
                                      {proj.date && (
                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                          {new Date(proj.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                                        </span>
                                      )}
                                    </div>
                                    {proj.description && (
                                      <p style={{ margin: '8px 0', fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{proj.description}</p>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {parseTech(proj.technologies).map((tech, idx) => (
                                          <span 
                                            key={idx} 
                                            style={{ 
                                              fontSize: '0.75rem', 
                                              fontWeight: 700, 
                                              background: 'var(--bg-card)',
                                              border: '1px solid var(--border-color)',
                                              color: 'var(--text-secondary)',
                                              padding: '4px 12px', 
                                              borderRadius: '6px'
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
                                          style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                        >
                                          Link
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.92rem', fontStyle: 'italic', paddingLeft: 4 }}>No projects listed.</div>
                          )}
                        </div>

                        {/* Experiences Section */}
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Work Experiences</div>
                          {experiences.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', paddingLeft: 20, borderLeft: '2px solid var(--border-color)' }}>
                              {experiences.map((exp) => (
                                <div key={exp.id} className="experience-card" style={{ position: 'relative' }}>
                                  {/* Timeline node */}
                                  <div style={{
                                    position: 'absolute',
                                    left: -27,
                                    top: 6,
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    background: 'var(--success)',
                                    border: '3px solid var(--bg-card)',
                                    boxShadow: '0 0 0 2px var(--border-color)'
                                  }} />
                                  
                                  <div style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px 20px', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                      <div>
                                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{exp.position}</h4>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', fontWeight: 700, marginTop: 2 }}>{exp.company}</div>
                                      </div>
                                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        {exp.start_date ? new Date(exp.start_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '—'} 
                                        {' - '}
                                        {exp.is_current ? 'Present' : exp.end_date ? new Date(exp.end_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '—'}
                                      </span>
                                    </div>
                                    {exp.description && (
                                      <p style={{ margin: '8px 0', fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{exp.description}</p>
                                    )}
                                    {exp.achievements && (
                                      <div style={{ marginTop: 10, borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Key Achievements</div>
                                        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>{exp.achievements}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.92rem', fontStyle: 'italic', paddingLeft: 4 }}>No professional experience listed.</div>
                          )}
                        </div>

                        {/* Education & Certs Row */}
                        <div className="grid-responsive-2" style={{ gap: 16, borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
                          {/* Education column */}
                          <div style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid var(--border-light)', paddingBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" /></svg>
                              Additional Education
                            </div>
                            {education.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {education.map((edu) => (
                                  <div key={edu.id} style={{ fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{edu.degree} in {edu.field}</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{edu.institution}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                      <span>Grad: {edu.graduation_date ? new Date(edu.graduation_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '—'}</span>
                                      {edu.gpa && <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>GPA: {edu.gpa}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No additional education entries.</div>
                            )}
                          </div>

                          {/* Certifications column */}
                          <div style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid var(--border-light)', paddingBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                              Certifications
                            </div>
                            {certifications.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {certifications.map((cert) => (
                                  <div key={cert.id} style={{ fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                      {cert.credential_url ? (
                                        <a href={cert.credential_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }} onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                                          {cert.name}
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                        </a>
                                      ) : (
                                        cert.name
                                      )}
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Issued by: {cert.issuer}</div>
                                    {cert.date && (
                                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                        Issued: {new Date(cert.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No certifications listed.</div>
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
                          <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Loading mock interview sessions...</span>
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
                                background: 'var(--bg-card-hover)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                padding: '8px 16px',
                                borderRadius: '999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                outline: 'none',
                                transition: 'all 0.2s ease',
                                boxShadow: 'var(--shadow-sm)'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                            >
                              ← Back to Session List
                            </button>
                          </div>

                          {/* Detail Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                            <div>
                              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                {selectedSessionDetail.domain_name}
                              </span>
                              <h3 style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {selectedSessionDetail.interview_type_name}
                              </h3>
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                Session ID: <code style={{ fontSize: '0.78rem' }}>{selectedSessionDetail.id}</code> &bull; Taken {new Date(selectedSessionDetail.created_at).toLocaleString()}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                padding: '4px 10px',
                                borderRadius: 12,
                                background: selectedSessionDetail.use_voice ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                color: selectedSessionDetail.use_voice ? '#3b82f6' : 'var(--text-secondary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                              }}>
                                {selectedSessionDetail.use_voice ? (
                                  <>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" /></svg>
                                    Voice
                                  </>
                                ) : (
                                  <>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2" /><line x1="6" y1="8" x2="6.01" y2="8" /><line x1="10" y1="8" x2="10.01" y2="8" /><line x1="14" y1="8" x2="14.01" y2="8" /><line x1="18" y1="8" x2="18.01" y2="8" /><line x1="6" y1="12" x2="6.01" y2="12" /><line x1="10" y1="12" x2="10.01" y2="12" /><line x1="14" y1="12" x2="14.01" y2="12" /><line x1="18" y1="12" x2="18.01" y2="12" /><line x1="7" y1="16" x2="17" y2="16" /></svg>
                                    Written
                                  </>
                                )}
                              </span>
                              <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                padding: '4px 10px',
                                borderRadius: 12,
                                background: selectedSessionDetail.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                color: selectedSessionDetail.status === 'completed' ? '#10b981' : '#f59e0b'
                              }}>
                                {selectedSessionDetail.status === 'completed' ? 'Completed' : 'Pending Review'}
                              </span>
                            </div>
                          </div>

                          {/* Score and Dimensions Overview Row */}
                          <div className="grid-responsive-1-2" style={{ gap: 24, alignItems: 'center', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: 20 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRight: '1px solid var(--border-color)', paddingRight: 20 }}>
                              <div style={{
                                width: 120,
                                height: 120,
                                borderRadius: '50%',
                                background: `conic-gradient(${scoreColor} ${isPendingReview ? 0 : feedback.total_score}%, var(--bg-input) 0%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 10px',
                                position: 'relative',
                                boxShadow: `0 0 15px rgba(${scoreColor === 'var(--success)' ? '16, 185, 129' : scoreColor === 'var(--warning)' ? '245, 158, 11' : '239, 68, 68'}, 0.15)`
                              }}>
                                <div style={{
                                  position: 'absolute',
                                  width: '100px',
                                  height: '100px',
                                  borderRadius: '50%',
                                  background: 'var(--bg-card)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <span style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                                    {isPendingReview ? '—' : Math.round(feedback.total_score)}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 1, letterSpacing: '0.5px' }}>
                                    Overall
                                  </span>
                                </div>
                              </div>
                              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: scoreColor }}>
                                {scoreGrade}
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                              <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                                Core Dimension Scores
                              </h4>
                              {feedback.dimension_averages && Object.entries(feedback.dimension_averages).map(([dim, data]) => {
                                if (dim !== 'technical_accuracy' && dim !== 'depth') return null;
                                const label = dim === 'technical_accuracy' ? 'Technical Accuracy' : 'Depth';
                                const barColor = data.score >= 7 
                                  ? 'linear-gradient(90deg, #10b981, #34d399)' 
                                  : data.score >= 5 
                                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' 
                                  : 'linear-gradient(90deg, #ef4444, #f87171)';
                                const glowColor = data.score >= 7 
                                  ? 'rgba(16, 185, 129, 0.3)' 
                                  : data.score >= 5 
                                  ? 'rgba(245, 158, 11, 0.3)' 
                                  : 'rgba(239, 68, 68, 0.3)';
                                const scorePct = (data.score / 10) * 100;
                                
                                return (
                                  <div key={dim}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: 6 }}>
                                      <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{label}</span>
                                      <span style={{ fontWeight: 800, color: data.score >= 7 ? 'var(--success)' : data.score >= 5 ? 'var(--warning)' : 'var(--danger)' }}>
                                        {Number(data.score).toFixed(1)}/10
                                      </span>
                                    </div>
                                    <div style={{ height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                                      <div style={{ 
                                        height: '100%', 
                                        background: barColor, 
                                        width: `${scorePct}%`, 
                                        borderRadius: 4,
                                        boxShadow: `0 0 8px ${glowColor}`
                                      }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Executive Summary */}
                          {feedback.feedback_summary && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Executive Feedback Summary</div>
                              <div style={{ 
                                background: 'var(--bg-card-hover)', 
                                border: '1px solid var(--border-color)', 
                                borderLeft: '4px solid var(--accent-primary)',
                                borderRadius: '12px', 
                                padding: '16px 20px', 
                                fontSize: '0.95rem', 
                                color: 'var(--text-secondary)', 
                                lineHeight: '1.6',
                                boxShadow: 'var(--shadow-sm)'
                              }}>
                                <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontWeight: 500 }}>{feedback.feedback_summary}</p>
                              </div>
                            </div>
                          )}

                          {/* Strengths and Growth Areas Double Grid */}
                          <div className="grid-responsive-2" style={{ gap: 16 }}>
                            {feedback.strengths && feedback.strengths.length > 0 && (
                              <div style={{ 
                                background: 'rgba(16, 185, 129, 0.02)', 
                                border: '1px solid rgba(16, 185, 129, 0.15)', 
                                borderRadius: '12px', 
                                padding: 18,
                                boxShadow: 'var(--shadow-sm)'
                              }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.88rem', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> Key Strengths
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {feedback.strengths.slice(0, 5).map((s, idx) => (
                                    <li key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                                      <span style={{ lineHeight: 1.4 }}>{s}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {feedback.weaknesses && feedback.weaknesses.length > 0 && (
                              <div style={{ 
                                background: 'rgba(245, 158, 11, 0.02)', 
                                border: '1px solid rgba(245, 158, 11, 0.15)', 
                                borderRadius: '12px', 
                                padding: 18,
                                boxShadow: 'var(--shadow-sm)'
                              }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.88rem', fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg> Growth Areas
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {feedback.weaknesses.slice(0, 5).map((w, idx) => (
                                    <li key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                      <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>•</span>
                                      <span style={{ lineHeight: 1.4 }}>{w}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Question-by-Question Analysis */}
                          {answers.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Question-by-Question Breakdown</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {answers.map((ans, idx) => {
                                  const failedEval = ans.eval_status === 'failed';
                                  const evalJson = ans.evaluation_json || {};
                                  return (
                                    <details key={ans.id || idx} className="accordion-block" style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }} open={idx === 0}>
                                      <summary style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        padding: '16px 20px', 
                                        cursor: 'pointer',
                                        listStyle: 'none',
                                        userSelect: 'none'
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', transition: 'transform 0.2s ease', display: 'inline-block' }} className="accordion-chevron">▶</span>
                                          <div style={{ minWidth: 0, flex: 1 }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                              Question {ans.question_number}
                                            </span>
                                            <h5 style={{ margin: '2px 0 0 0', fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {ans.question_text || `Question Detail`}
                                            </h5>
                                          </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16 }}>
                                          {failedEval ? (
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '3px 8px', borderRadius: '999px' }}>
                                              Failed Eval
                                            </span>
                                          ) : (
                                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '4px 10px', borderRadius: '999px', display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                              <span style={{ fontSize: '0.98rem', fontWeight: 800, color: ans.score >= 70 ? 'var(--success)' : ans.score >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                                                {ans.score}
                                              </span>
                                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>/100</span>
                                            </div>
                                          )}
                                        </div>
                                      </summary>

                                      <div style={{ padding: '0 20px 20px 38px', display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
                                        {/* Candidate's answer */}
                                        <div>
                                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                            Learner Response:
                                          </div>
                                          <div style={{ 
                                            margin: 0, 
                                            fontSize: '0.94rem', 
                                            color: 'var(--text-primary)', 
                                            background: 'rgba(99, 102, 241, 0.04)', 
                                            border: '1px solid rgba(99, 102, 241, 0.1)',
                                            padding: '12px 16px', 
                                            borderRadius: '16px', 
                                            borderTopLeftRadius: '4px',
                                            whiteSpace: 'pre-wrap', 
                                            lineHeight: 1.5,
                                            fontStyle: 'italic',
                                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.01)'
                                          }}>
                                            "{ans.answer_text}"
                                          </div>
                                        </div>

                                        {/* Ideal answer summary */}
                                        {evalJson.ideal_answer_summary && (
                                          <div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><line x1="9" y1="18" x2="15" y2="18" /><line x1="10" y1="22" x2="14" y2="22" /></svg>
                                              Reference Benchmark Summary:
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.94rem', color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '12px 16px', borderRadius: '12px', borderLeft: '3px solid var(--accent-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                              {evalJson.ideal_answer_summary}
                                            </p>
                                          </div>
                                        )}

                                        {/* Score explanation */}
                                        {evalJson.score_explanation && (
                                          <div style={{ 
                                            background: 'rgba(245, 158, 11, 0.03)', 
                                            border: '1px solid rgba(245, 158, 11, 0.15)', 
                                            borderLeft: '4px solid var(--warning)',
                                            borderRadius: '8px', 
                                            padding: '12px 16px' 
                                          }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--warning)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--warning)' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                              AI Score Justification:
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5, fontWeight: 500 }}>
                                              {evalJson.score_explanation}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </details>
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
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center', background: 'var(--bg-card-hover)', border: '1.5px dashed var(--border-color)', borderRadius: '12px', marginTop: 10 }}>
                          <div style={{ marginBottom: 12, color: 'var(--text-muted)' }}>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                          </div>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Mock Interviews Recorded</h4>
                          <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: 280, lineHeight: 1.5 }}>
                            This student has not attempted any AI mock interviews yet.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Mock Interview Sessions History</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {studentSessions.map((session) => {
                            const isPending = session.total_score === null || session.total_score === undefined;
                            
                            return (
                              <div
                                key={session.id}
                                style={{
                                  background: 'var(--bg-card-hover)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '12px',
                                  padding: '16px 20px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: 12,
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.borderColor = 'var(--border-color)';
                                  e.currentTarget.style.transform = 'none';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                                onClick={() => fetchSessionDetail(session.id)}
                              >
                                <div>
                                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                    {session.domain_name}
                                  </span>
                                  <h4 style={{ margin: '4px 0 6px 0', fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    {session.interview_type_name}
                                  </h4>
                                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center', fontWeight: 500 }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                      {new Date(session.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                    <span style={{ opacity: 0.5 }}>•</span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      {session.use_voice ? (
                                        <>
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" /></svg>
                                          Voice
                                        </>
                                      ) : (
                                        <>
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2" /><line x1="6" y1="8" x2="6.01" y2="8" /><line x1="10" y1="8" x2="10.01" y2="8" /><line x1="14" y1="8" x2="14.01" y2="8" /><line x1="18" y1="8" x2="18.01" y2="8" /><line x1="6" y1="12" x2="6.01" y2="12" /><line x1="10" y1="12" x2="10.01" y2="12" /><line x1="14" y1="12" x2="14.01" y2="12" /><line x1="18" y1="12" x2="18.01" y2="12" /><line x1="7" y1="16" x2="17" y2="16" /></svg>
                                          Written
                                        </>
                                      )}
                                    </span>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }} onClick={e => e.stopPropagation()}>
                                  <div>
                                    {isPending ? (
                                      <span style={{ 
                                        fontSize: '0.78rem', 
                                        padding: '4px 10px', 
                                        borderRadius: '999px',
                                        fontWeight: 800,
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        color: 'var(--warning)',
                                        border: '1px solid rgba(245, 158, 11, 0.2)'
                                      }}>
                                        Pending Review
                                      </span>
                                    ) : (
                                      <span style={{ 
                                        fontSize: '0.9rem', 
                                        padding: '6px 12px', 
                                        borderRadius: '999px',
                                        fontWeight: 800,
                                        background: session.total_score >= 70 ? 'rgba(16, 185, 129, 0.1)' : session.total_score >= 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: session.total_score >= 70 ? 'var(--success)' : session.total_score >= 50 ? 'var(--warning)' : 'var(--danger)',
                                        border: `1px solid ${session.total_score >= 70 ? 'rgba(16, 185, 129, 0.2)' : session.total_score >= 50 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                      }}>
                                        {Math.round(session.total_score)}%
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => fetchSessionDetail(session.id)}
                                    style={{ 
                                      fontSize: '0.82rem', 
                                      padding: '8px 18px',
                                      background: 'var(--bg-card)',
                                      border: '1px solid var(--border-color)',
                                      color: 'var(--accent-primary)',
                                      borderRadius: '8px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--accent-primary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                                    disabled={detailLoading}
                                  >
                                    {detailLoading ? '...' : (
                                      <>
                                        Analyze
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                      </>
                                    )}
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
                    <form onSubmit={handleEditSubmit} className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '4px' }}>
                      
                      {/* Group 1: Personal & Contact Information */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: 20 }}>
                        <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.8px', borderLeft: '3px solid var(--accent-primary)', paddingLeft: 10 }}>
                          Personal & Contact Details
                        </h4>
                        <div className="grid-responsive-3" style={{ gap: 16 }}>
                          {/* Name */}
                          <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name *</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              required 
                              value={editForm.name} 
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                              style={{ width: '100%', boxSizing: 'border-box', height: 44, fontSize: '0.95rem' }}
                            />
                          </div>

                          {/* Email */}
                          <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address *</label>
                            <input 
                              type="email" 
                              className="input-field" 
                              required 
                              value={editForm.email} 
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} 
                              style={{ width: '100%', boxSizing: 'border-box', height: 44, fontSize: '0.95rem' }}
                            />
                          </div>

                          {/* Phone Number */}
                          <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={editForm.phone_number} 
                              onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} 
                              style={{ width: '100%', boxSizing: 'border-box', height: 44, fontSize: '0.95rem' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Group 2: Academic Program Information */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: 20 }}>
                        <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.8px', borderLeft: '3px solid var(--accent-primary)', paddingLeft: 10 }}>
                          Academic Program Information
                        </h4>
                        <div className="grid-responsive-3" style={{ gap: 16 }}>
                          {/* Registration Number (READ-ONLY) */}
                          <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Registration Number (Read-Only)</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              disabled 
                              value={editForm.registration_number} 
                              style={{ width: '100%', boxSizing: 'border-box', height: 44, fontSize: '0.95rem', backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', cursor: 'not-allowed', border: '1px solid rgba(255,255,255,0.05)' }}
                            />
                          </div>

                          {/* Course */}
                          <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Course</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={editForm.course} 
                              onChange={(e) => setEditForm({ ...editForm, course: e.target.value })} 
                              style={{ width: '100%', boxSizing: 'border-box', height: 44, fontSize: '0.95rem' }}
                            />
                          </div>

                          {/* Stream */}
                          <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stream</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={editForm.stream} 
                              onChange={(e) => setEditForm({ ...editForm, stream: e.target.value })} 
                              style={{ width: '100%', boxSizing: 'border-box', height: 44, fontSize: '0.95rem' }}
                            />
                          </div>

                          {/* Year */}
                          <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Year</label>
                            <select 
                              className="input-field" 
                              value={editForm.year} 
                              onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                              style={{ width: '100%', boxSizing: 'border-box', height: 44, fontSize: '0.95rem' }}
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
                            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Semester</label>
                            <input 
                              type="number" 
                              className="input-field" 
                              min="1" 
                              max="12" 
                              value={editForm.semester} 
                              onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })} 
                              style={{ width: '100%', boxSizing: 'border-box', height: 44, fontSize: '0.95rem' }}
                            />
                          </div>

                          {/* Passing Year */}
                          <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Passing Year</label>
                            <input 
                              type="number" 
                              className="input-field" 
                              min="2000" 
                              max="2100" 
                              value={editForm.passing_year} 
                              onChange={(e) => setEditForm({ ...editForm, passing_year: e.target.value })} 
                              style={{ width: '100%', boxSizing: 'border-box', height: 44, fontSize: '0.95rem' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Group 3: Performance Metrics & Category */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: 20 }}>
                        <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.8px', borderLeft: '3px solid var(--accent-primary)', paddingLeft: 10 }}>
                          Metrics & Placement Status
                        </h4>
                        <div className="grid-responsive-3" style={{ gap: 16 }}>
                          {/* CGPA */}
                          <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CGPA (0 - 10.0)</label>
                            <input 
                              type="number" 
                              step="0.01" 
                              min="0" 
                              max="10" 
                              className="input-field" 
                              value={editForm.cgpa} 
                              onChange={(e) => setEditForm({ ...editForm, cgpa: e.target.value })} 
                              style={{ width: '100%', boxSizing: 'border-box', height: 44, fontSize: '0.95rem' }}
                            />
                          </div>

                          {/* General Attendance */}
                          <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>General Attendance %</label>
                            <input 
                              type="number" 
                              step="0.1" 
                              min="0" 
                              max="100" 
                              className="input-field" 
                              value={editForm.attendance} 
                              onChange={(e) => setEditForm({ ...editForm, attendance: e.target.value })} 
                              style={{ width: '100%', boxSizing: 'border-box', height: 44, fontSize: '0.95rem' }}
                            />
                          </div>

                          {/* Training Attendance */}
                          <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Training Attendance %</label>
                            <input 
                              type="number" 
                              step="0.1" 
                              min="0" 
                              max="100" 
                              className="input-field" 
                              value={editForm.training_attendance} 
                              onChange={(e) => setEditForm({ ...editForm, training_attendance: e.target.value })} 
                              style={{ width: '100%', boxSizing: 'border-box', height: 44, fontSize: '0.95rem' }}
                            />
                          </div>

                          {/* Backlogs Count */}
                          <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Backlogs Count</label>
                            <input 
                              type="number" 
                              min="0" 
                              className="input-field" 
                              value={editForm.backlogs_count} 
                              onChange={(e) => setEditForm({ ...editForm, backlogs_count: e.target.value })} 
                              style={{ width: '100%', boxSizing: 'border-box', height: 44, fontSize: '0.95rem' }}
                            />
                          </div>

                          {/* Category */}
                          <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Placement Category</label>
                            <select 
                              className="input-field" 
                              value={editForm.category} 
                              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                              style={{ width: '100%', boxSizing: 'border-box', height: 44, fontSize: '0.95rem' }}
                            >
                              <option value="auto">Auto-Calculate</option>
                              <option value="A">Category A</option>
                              <option value="B">Category B</option>
                              <option value="C">Category C</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          onClick={() => setActiveModalTab('academics')}
                          style={{ minWidth: 100, textTransform: 'uppercase', fontSize: '0.82rem', letterSpacing: '0.5px', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="btn btn-primary" 
                          style={{ minWidth: 140, background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.82rem', letterSpacing: '0.5px', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
