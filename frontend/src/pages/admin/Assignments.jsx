import React, { useEffect, useMemo, useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  FilePlus2, 
  Search, 
  Send, 
  Users, 
  Trash2, 
  Award, 
  ClipboardList, 
  Check, 
  X, 
  Filter, 
  Trash, 
  HelpCircle 
} from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

const emptyQuestion = () => ({
  prompt: '',
  options: ['', '', '', ''],
  correct_option: 0,
  points: 1,
});

const badgeClass = {
  assigned: 'badge-info',
  submitted: 'badge-success',
  expired: 'badge-danger',
};

export default function Assignments() {
  const [activeTab, setActiveTab] = useState('assign');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({ search: '', semester: '', year: '', category: '', status: '' });
  const [dueAt, setDueAt] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Modal State for viewing student answers details
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const [form, setForm] = useState({
    course: '',
    title: '',
    description: '',
    duration_minutes: 30,
    questions: [emptyQuestion()],
  });

  const loadCourses = async () => {
    try {
      const { data } = await api.get('/learning-assignments/courses/');
      setCourses(data || []);
      if (!selectedCourse && data?.length) setSelectedCourse(data[0]);
    } catch (err) {
      toast.error('Could not load courses.');
    }
  };

  const loadAssignments = async (course = selectedCourse) => {
    try {
      const { data } = await api.get('/learning-assignments/bank/', { params: course ? { course } : {} });
      setAssignments(data || []);
      if (data?.length && !data.some((item) => item.id === selectedAssignment)) {
        setSelectedAssignment(data[0].id);
      } else if (!data?.length) {
        setSelectedAssignment('');
      }
    } catch (err) {
      toast.error('Could not load assignments.');
    }
  };

  const loadStudents = async () => {
    if (!selectedCourse) return;
    try {
      const params = {
        course: selectedCourse,
        search: filters.search || undefined,
        semester: filters.semester || undefined,
        year: filters.year || undefined,
        category: filters.category || undefined,
      };
      const { data } = await api.get('/learning-assignments/students/', { params });
      setStudents(data || []);
      setSelectedStudents((prev) => prev.filter((id) => (data || []).some((student) => student.id === id)));
    } catch (err) {
      toast.error('Could not load students.');
    }
  };

  const loadResults = async () => {
    try {
      const params = {
        course: selectedCourse || undefined,
        assignment_id: selectedAssignment || undefined,
      };
      const { data } = await api.get('/learning-assignments/results/', { params });
      setResults(data || []);
    } catch (err) {
      toast.error('Could not load results.');
    }
  };

  useEffect(() => {
    setLoading(true);
    loadCourses().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    loadAssignments(selectedCourse);
  }, [selectedCourse]);

  useEffect(() => {
    if (!selectedCourse) return;
    loadStudents();
  }, [selectedCourse, filters.search, filters.semester, filters.year, filters.category]);

  useEffect(() => {
    if (activeTab === 'results') {
      loadResults();
    }
  }, [activeTab, selectedCourse, selectedAssignment]);

  const selectedAssignmentObj = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignment),
    [assignments, selectedAssignment],
  );

  const stats = useMemo(() => {
    const submitted = results.filter((row) => row.status === 'submitted');
    const avg = submitted.length
      ? Math.round(submitted.reduce((sum, row) => sum + (row.percentage || 0), 0) / submitted.length)
      : 0;
    return { total: results.length, submitted: submitted.length, avg };
  }, [results]);

  const filteredResults = useMemo(() => {
    if (!filters.status) return results;
    return results.filter((row) => row.status === filters.status);
  }, [results, filters.status]);

  const toggleStudent = (id) => {
    setSelectedStudents((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const selectAllVisible = () => {
    const visibleIds = students.map((student) => student.id);
    const allSelected = visibleIds.every((id) => selectedStudents.includes(id));
    setSelectedStudents(allSelected ? [] : visibleIds);
  };

  const updateQuestion = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question, idx) => (idx === index ? { ...question, ...patch } : question)),
    }));
  };

  const removeQuestion = (index) => {
    if (form.questions.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, idx) => idx !== index),
    }));
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question, idx) => {
        if (idx !== questionIndex) return question;
        const options = [...question.options];
        options[optionIndex] = value;
        return { ...question, options };
      }),
    }));
  };

  const createAssignment = async () => {
    const payload = {
      ...form,
      course: form.course.trim(),
      title: form.title.trim(),
      questions: form.questions.map((question, index) => ({
        ...question,
        order: index,
        options: question.options.map((option) => option.trim()).filter(Boolean),
      })),
    };
    if (!payload.course || !payload.title || payload.questions.some((q) => !q.prompt.trim() || q.options.length < 2)) {
      toast.error('Please complete the course name, assignment title, and add valid questions with options.');
      return;
    }
    try {
      const { data } = await api.post('/learning-assignments/bank/', payload);
      toast.success('MCQ Assignment created successfully.');
      setForm({ course: payload.course, title: '', description: '', duration_minutes: 30, questions: [emptyQuestion()] });
      await loadCourses();
      setSelectedCourse(data.course);
      await loadAssignments(data.course);
      setSelectedAssignment(data.id);
      setActiveTab('assign');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not create assignment.');
    }
  };

  const deleteAssignmentFromBank = async () => {
    if (!selectedAssignment) return;
    if (!window.confirm(`Are you sure you want to delete "${selectedAssignmentObj?.title}" from the question bank? This will remove all student assignments and records linked to it.`)) {
      return;
    }
    try {
      await api.delete(`/learning-assignments/bank/${selectedAssignment}/`);
      toast.success('Assignment deleted from bank.');
      setSelectedAssignment('');
      await loadAssignments(selectedCourse);
      if (activeTab === 'results') {
        loadResults();
      }
    } catch (err) {
      toast.error('Could not delete assignment.');
    }
  };

  const sendAssignment = async () => {
    if (!selectedAssignment || !selectedStudents.length) return;
    try {
      const { data } = await api.post('/learning-assignments/assign/', {
        assignment_id: selectedAssignment,
        student_ids: selectedStudents,
        due_at: dueAt || null,
      });
      
      let msg = `Deployed to ${data.assigned} student(s).`;
      const details = [];
      if (data.created > 0) details.push(`${data.created} new`);
      if (data.updated > 0) details.push(`${data.updated} deadline updated`);
      if (data.reset > 0) details.push(`${data.reset} attempt reset`);
      if (data.duplicates > 0) details.push(`${data.duplicates} skipped`);
      
      if (details.length > 0) {
        msg += ` (${details.join(', ')})`;
      }
      toast.success(msg);

      setSelectedStudents([]);
      setActiveTab('results');
      loadResults();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not send assignment.');
    }
  };

  if (loading && courses.length === 0) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>MCQ Assessments</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Manage class MCQs, assign deadlines, and review student performance reports.</p>
        </div>
        
        {/* Navigation Tabs */}
        <div style={{ 
          display: 'flex', 
          background: 'var(--border-light, #f1f5f9)', 
          padding: 4, 
          borderRadius: 12, 
          border: '1px solid var(--border-color)' 
        }}>
          {[
            ['assign', Send, 'Assign'],
            ['build', FilePlus2, 'Build MCQ'],
            ['results', CheckCircle2, 'Results'],
          ].map(([key, Icon, label]) => (
            <button 
              key={key} 
              className={`btn ${activeTab === key ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setActiveTab(key)}
              style={{ 
                borderRadius: 8, 
                padding: '8px 16px', 
                boxShadow: activeTab === key ? 'var(--shadow-sm)' : 'none',
                border: 'none',
                background: activeTab === key ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === key ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              <Icon size={14} style={{ marginRight: 6 }} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Target Criteria Filter Bar (Sticky at top for Assign/Results) */}
      {activeTab !== 'build' && (
        <div className="card" style={{ padding: 20, border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <label>
              <span style={{ display: 'block', marginBottom: 6, fontWeight: 700, fontSize: '0.85rem' }}>1. Select Course</span>
              <select className="input-field" value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)}>
                <option value="">Select course</option>
                {courses.map((course) => <option key={course} value={course}>{course}</option>)}
              </select>
            </label>
            <label>
              <span style={{ display: 'block', marginBottom: 6, fontWeight: 700, fontSize: '0.85rem' }}>2. Select Assignment Template</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="input-field" style={{ flex: 1 }} value={selectedAssignment} onChange={(event) => setSelectedAssignment(event.target.value)}>
                  <option value="">Select assignment</option>
                  {assignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>{assignment.title}</option>
                  ))}
                </select>
                {selectedAssignment && (
                  <button 
                    className="btn btn-secondary" 
                    title="Delete from Question Bank"
                    onClick={deleteAssignmentFromBank}
                    style={{ color: 'var(--danger)', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </label>
            {activeTab === 'assign' && (
              <label>
                <span style={{ display: 'block', marginBottom: 6, fontWeight: 700, fontSize: '0.85rem' }}>3. Assignment Due Date (Optional)</span>
                <input className="input-field" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
              </label>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. BUILD MCQ TAB                                             */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'build' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
          <div className="card" style={{ padding: 28, border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
              <div style={{ padding: 8, borderRadius: 8, background: 'rgba(37, 99, 235, 0.08)', color: 'var(--accent-primary)' }}>
                <FilePlus2 size={20} />
              </div>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.3rem' }}>Create Question Bank Assessment</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
              <label>
                <span style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>Course Category</span>
                <input className="input-field" placeholder="e.g. BBA, BCA, MBA" value={form.course} onChange={(event) => setForm((prev) => ({ ...prev, course: event.target.value }))} />
              </label>
              <label>
                <span style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>Assignment Title</span>
                <input className="input-field" placeholder="e.g. Python Programming Midterm" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
              </label>
              <label>
                <span style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>Duration Limit (Minutes)</span>
                <input className="input-field" type="number" min="1" placeholder="e.g. 30" value={form.duration_minutes} onChange={(event) => setForm((prev) => ({ ...prev, duration_minutes: Number(event.target.value) }))} />
              </label>
            </div>

            <label style={{ display: 'block', marginBottom: 28 }}>
              <span style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>Instructions / Description</span>
              <textarea className="input-field" style={{ minHeight: 70 }} placeholder="Assessment details, rules, and notes for student preview." value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
            </label>

            {/* Questions Builder Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {form.questions.map((question, questionIndex) => (
                <div 
                  key={questionIndex} 
                  style={{ 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 12, 
                    padding: 24, 
                    background: 'var(--bg-body, #f8fafc)',
                    position: 'relative',
                    transition: 'box-shadow 0.2s'
                  }}
                  className="hover-card"
                >
                  {/* Question Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px dashed var(--border-color)', paddingBottom: 12 }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                      Question #{questionIndex + 1}
                    </h4>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}>
                        <span style={{ fontWeight: 600 }}>Points:</span>
                        <input 
                          className="input-field" 
                          type="number" 
                          min="1" 
                          style={{ width: 64, padding: '4px 8px', textAlign: 'center' }} 
                          value={question.points} 
                          onChange={(event) => updateQuestion(questionIndex, { points: Number(event.target.value) })} 
                        />
                      </label>

                      {form.questions.length > 1 && (
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => removeQuestion(questionIndex)}
                          title="Remove Question"
                          style={{ color: 'var(--danger)', border: 'none', background: 'transparent', padding: 4 }}
                        >
                          <Trash size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <label style={{ display: 'block', marginBottom: 16 }}>
                    <span style={{ display: 'block', marginBottom: 6, fontWeight: 700, fontSize: '0.9rem' }}>Question Prompt</span>
                    <input className="input-field" placeholder="Enter question description or prompt..." value={question.prompt} onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })} />
                  </label>

                  {/* Options Input Grid */}
                  <span style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: '0.9rem' }}>Options & Correct Key</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                    {question.options.map((option, optionIndex) => {
                      const isCorrect = question.correct_option === optionIndex;
                      return (
                        <div 
                          key={optionIndex}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 10,
                            padding: '6px 12px',
                            background: isCorrect ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-card)',
                            border: isCorrect ? '1.5px solid var(--success)' : '1px solid var(--border-color)',
                            borderRadius: 8
                          }}
                        >
                          {/* Radio Selector for Correct Answer */}
                          <input 
                            type="radio" 
                            name={`correct-key-${questionIndex}`} 
                            checked={isCorrect}
                            onChange={() => updateQuestion(questionIndex, { correct_option: optionIndex })}
                            style={{ accentColor: 'var(--success)', cursor: 'pointer', width: 16, height: 16 }}
                          />
                          <input 
                            className="input-field" 
                            style={{ border: 'none', background: 'transparent', padding: 4, flex: 1, fontSize: '0.95rem' }} 
                            placeholder={`Option ${optionIndex + 1}`} 
                            value={option} 
                            onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)} 
                          />
                          {isCorrect && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase' }}>
                              Key
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
              <button className="btn btn-secondary" style={{ borderRadius: 8 }} onClick={() => setForm((prev) => ({ ...prev, questions: [...prev.questions, emptyQuestion()] }))}>
                <FilePlus2 size={16} /> Add Question Card
              </button>
              <button className="btn btn-primary" style={{ borderRadius: 8, padding: '10px 24px', fontWeight: 700 }} onClick={createAssignment}>
                Publish to Bank
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. ASSIGN ASSESSMENT TAB                                     */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'assign' && (
        <>
          {!selectedCourse ? (
            <div className="card" style={{ textAlign: 'center', padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 250, border: '1px solid var(--border-color)' }}>
              <Users size={48} style={{ opacity: 0.6, color: 'var(--accent-primary)', marginBottom: 16 }} />
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>Select a Course Category</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: 8, maxWidth: 400, fontSize: '0.95rem', lineHeight: 1.5 }}>
                Choose a course from the dropdown above to load the student directory and assign assessments.
              </p>
            </div>
          ) : !selectedAssignment ? (
            <div className="card" style={{ textAlign: 'center', padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 250, border: '1px solid var(--border-color)' }}>
              <Send size={48} style={{ opacity: 0.6, color: 'var(--accent-primary)', marginBottom: 16 }} />
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>Select Assignment Template</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: 8, maxWidth: 400, fontSize: '0.95rem', lineHeight: 1.5 }}>
                Choose an MCQ assessment template for the <strong>{selectedCourse}</strong> class, or create a new one.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Filter controls */}
              <div className="card" style={{ padding: 16, border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-muted)' }} />
                    <input className="input-field" style={{ paddingLeft: 36 }} placeholder="Search students by name..." value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} />
                  </div>
                  <input className="input-field" placeholder="Semester (e.g. 4)" value={filters.semester} onChange={(event) => setFilters((prev) => ({ ...prev, semester: event.target.value }))} />
                  
                  <select className="input-field" value={filters.year} onChange={(event) => setFilters((prev) => ({ ...prev, year: event.target.value }))}>
                    <option value="">Any year</option>
                    {['1st', '2nd', '3rd', '4th'].map((year) => <option key={year} value={year}>{year} Year</option>)}
                  </select>
                  
                  <select className="input-field" value={filters.category} onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}>
                    <option value="">Any placement category</option>
                    {['A', 'B', 'C', 'Own'].map((cat) => <option key={cat} value={cat}>Category {cat}</option>)}
                  </select>
                </div>
              </div>

              {/* Student selection grid/table */}
              <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 12 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 44, padding: '14px 16px' }}>
                        <input 
                          type="checkbox" 
                          checked={students.length > 0 && selectedStudents.length === students.length} 
                          onChange={selectAllVisible} 
                          style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                        />
                      </th>
                      <th>Student Details</th>
                      <th>Registration No</th>
                      <th>Course Category</th>
                      <th>Semester / Year</th>
                      <th>Eligibility Category</th>
                      <th>CGPA Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const isSelected = selectedStudents.includes(student.id);
                      
                      // Assign color code for categories
                      let catColor = '#64748b'; // default slate
                      let catBg = '#f1f5f9';
                      if (student.category === 'A') { catColor = '#10b981'; catBg = '#ecfdf5'; }
                      else if (student.category === 'B') { catColor = '#3b82f6'; catBg = '#eff6ff'; }
                      else if (student.category === 'C') { catColor = '#ef4444'; catBg = '#fdf2f2'; }

                      return (
                        <tr 
                          key={student.id} 
                          onClick={() => toggleStudent(student.id)} 
                          style={{ cursor: 'pointer', background: isSelected ? 'rgba(37,99,235,0.02)' : 'transparent' }}
                        >
                          <td style={{ padding: '14px 16px' }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected} 
                              readOnly 
                              style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                            />
                          </td>
                          <td style={{ fontWeight: 700 }}>{student.name}</td>
                          <td>{student.registration_number}</td>
                          <td>{student.course || '-'}</td>
                          <td>{student.semester ? `${student.semester} Sem` : '-'} / {student.year || '-'}</td>
                          <td>
                            {student.category ? (
                              <span style={{ 
                                backgroundColor: catBg, 
                                color: catColor, 
                                padding: '4px 10px', 
                                borderRadius: 12, 
                                fontSize: '0.78rem', 
                                fontWeight: 800,
                                border: `1px solid ${catColor}20`
                              }}>
                                Cat {student.category}
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ fontWeight: 600 }}>{student.cgpa != null ? Number(student.cgpa).toFixed(2) : '-'}</td>
                        </tr>
                      );
                    })}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                          No students matching selection criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Target Panel */}
              <div className="card" style={{ 
                padding: '20px 24px', 
                border: '1px solid var(--border-color)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap',
                gap: 16 
              }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    Target assessment: <span style={{ color: 'var(--accent-primary)' }}>{selectedAssignmentObj?.title}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 2 }}>
                    <strong>{selectedStudents.length}</strong> student(s) selected from <strong>{selectedCourse}</strong> course.
                  </div>
                </div>
                
                <button 
                  className="btn btn-primary" 
                  disabled={!selectedAssignment || !selectedStudents.length} 
                  onClick={sendAssignment}
                  style={{ borderRadius: 8, padding: '12px 24px', fontWeight: 700 }}
                >
                  <Send size={16} /> Deploy Assessment
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. RESULTS & ANALYTICS TAB                                   */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'results' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Header Row with Filter Alignments */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>Performance Summary</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 2 }}>
                Global metrics for {selectedAssignmentObj?.title || 'Selected Assessment'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}><Filter size={12} style={{ marginRight: 4, display: 'inline' }} /> Filter Status:</span>
              <select 
                className="input-field" 
                style={{ width: 160, borderRadius: 8, padding: '6px 12px' }}
                value={filters.status} 
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="">All statuses</option>
                <option value="assigned">Assigned</option>
                <option value="submitted">Submitted</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {/* KPI Dashboard Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 8 }}>
            {/* Assigned Card */}
            <div className="card" style={{ 
              padding: 24, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Assigned Exam Sheets</span>
                <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.total}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>100% of target students</span>
              </div>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: '50%', 
                backgroundColor: 'rgba(37, 99, 235, 0.08)', 
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Users size={22} />
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'var(--accent-primary)' }} />
            </div>

            {/* Completed Card */}
            <div className="card" style={{ 
              padding: 24, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Completed Submissions</span>
                <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.submitted}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Progress: {stats.total > 0 ? ((stats.submitted / stats.total) * 100).toFixed(1) : '0.0'}% completed
                </span>
              </div>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: '50%', 
                backgroundColor: 'rgba(16, 185, 129, 0.08)', 
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <CheckCircle2 size={22} />
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'var(--border-color)' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${stats.total > 0 ? (stats.submitted / stats.total) * 100 : 0}%`, 
                  background: 'var(--success)' 
                }} />
              </div>
            </div>

            {/* Average Score Card */}
            <div className="card" style={{ 
              padding: 24, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Average Score</span>
                <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.avg}%</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>Across all submitted sheets</span>
              </div>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: '50%', 
                backgroundColor: 'rgba(245, 158, 11, 0.08)', 
                color: 'var(--warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Award size={22} />
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'var(--border-color)' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${stats.avg}%`, 
                  background: 'var(--accent-primary)' 
                }} />
              </div>
            </div>
          </div>

          {/* Submissions directory table */}
          <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Student Details</th>
                  <th>Registration No</th>
                  <th>Course Category</th>
                  <th>Assessment Title</th>
                  <th>State Status</th>
                  <th>Exam Score</th>
                  <th>Completion Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((row) => (
                  <tr 
                    key={row.id} 
                    onClick={() => {
                      if (row.status === 'submitted') {
                        setSelectedSubmission(row);
                      } else {
                        toast.error("This student hasn't submitted their answers yet.");
                      }
                    }}
                    style={{ cursor: row.status === 'submitted' ? 'pointer' : 'default' }}
                    className={row.status === 'submitted' ? "hover-row" : ""}
                  >
                    <td style={{ fontWeight: 700 }}>{row.student_name}</td>
                    <td>{row.student_reg}</td>
                    <td>{row.student_course || row.course || '-'}</td>
                    <td>{row.assignment_title}</td>
                    <td>
                      <span className={`badge ${badgeClass[row.status] || 'badge-neutral'}`} style={{ textTransform: 'capitalize' }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {row.score != null ? (
                        <span style={{ color: 'var(--accent-primary)' }}>
                          {row.score} / {row.total_points} ({row.percentage}%)
                        </span>
                      ) : '-'}
                    </td>
                    <td>{row.submitted_at ? new Date(row.submitted_at).toLocaleString() : '-'}</td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                      No results or assignment logs matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. MODAL DETAILED STUDENT SHEET VIEW                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      {selectedSubmission && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(9, 9, 11, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}
        onClick={() => setSelectedSubmission(null)}
        >
          <div 
            className="card" 
            style={{ 
              maxWidth: 800, 
              width: '100%', 
              maxHeight: '90vh', 
              overflowY: 'auto', 
              padding: 32,
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <span className="badge badge-success" style={{ marginBottom: 8 }}>COMPLETED SHEET</span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0' }}>{selectedSubmission.student_name}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
                  Reg: {selectedSubmission.student_reg} | Course: {selectedSubmission.student_course || selectedSubmission.course}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <button 
                  onClick={() => setSelectedSubmission(null)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={20} />
                </button>
                <div style={{ textAlign: 'right', marginTop: 4 }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    {selectedSubmission.percentage}%
                  </span>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {selectedSubmission.score} / {selectedSubmission.total_points} PTS
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Subtitle info */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, backgroundColor: 'var(--bg-body)', padding: 14, borderRadius: 8, marginBottom: 20, fontSize: '0.85rem' }}>
              <div><strong>Assignment:</strong> {selectedSubmission.assignment_title}</div>
              <div><strong>Time Allowed:</strong> {selectedSubmission.duration_minutes} minutes</div>
              <div><strong>Submitted:</strong> {selectedSubmission.submitted_at ? new Date(selectedSubmission.submitted_at).toLocaleString() : ''}</div>
            </div>

            {/* Answer Key Question List */}
            <div style={{ display: 'grid', gap: 16 }}>
              {selectedSubmission.answers && selectedSubmission.answers.map((answer, index) => {
                const optList = answer.options || [];
                const selOpt = answer.selected_option;
                const corrOpt = answer.correct_option;
                const correct = answer.is_correct;

                return (
                  <div 
                    key={answer.id || index}
                    style={{ 
                      padding: 16, 
                      borderRadius: 10, 
                      border: '1px solid var(--border-color)', 
                      background: 'var(--bg-card)' 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, lineHeight: 1.4 }}>
                        {index + 1}. {answer.question_prompt}
                      </h4>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 800, 
                        color: correct ? 'var(--success)' : 'var(--danger)',
                        backgroundColor: correct ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        padding: '2px 8px',
                        borderRadius: 8,
                        flexShrink: 0
                      }}>
                        {correct ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                      {optList.map((option, optIdx) => {
                        const isSelected = selOpt === optIdx;
                        const isCorrectKey = corrOpt === optIdx;

                        let border = '1px solid var(--border-color)';
                        let bg = 'transparent';
                        let textColor = 'inherit';

                        if (isCorrectKey) {
                          border = '1.5px solid var(--success)';
                          bg = 'rgba(16, 185, 129, 0.03)';
                          textColor = 'var(--success)';
                        } else if (isSelected && !correct) {
                          border = '1.5px solid var(--danger)';
                          bg = 'rgba(239, 68, 68, 0.03)';
                          textColor = 'var(--danger)';
                        }

                        return (
                          <div 
                            key={optIdx}
                            style={{ 
                              padding: '8px 12px', 
                              borderRadius: 6, 
                              border: border, 
                              backgroundColor: bg,
                              color: textColor,
                              fontSize: '0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10
                            }}
                          >
                            <span style={{ 
                              width: 6, 
                              height: 6, 
                              borderRadius: '50%', 
                              backgroundColor: isCorrectKey ? 'var(--success)' : isSelected ? 'var(--danger)' : 'var(--text-muted)' 
                            }} />
                            <span style={{ flex: 1 }}>{option}</span>
                            
                            {isCorrectKey && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--success)' }}>
                                Correct Option
                              </span>
                            )}
                            {isSelected && !correct && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--danger)' }}>
                                Selected
                              </span>
                            )}
                            {isSelected && correct && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--success)' }}>
                                Selected (Correct)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {(!selectedSubmission.answers || selectedSubmission.answers.length === 0) && (
                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <HelpCircle size={16} /> Answers detail unavailable for legacy submissions.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              <button className="btn btn-primary" onClick={() => setSelectedSubmission(null)} style={{ borderRadius: 8 }}>
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
