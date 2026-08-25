import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, 
  Sparkles, 
  ChevronRight, 
  GraduationCap, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Users, 
  BookOpen, 
  Play, 
  RotateCcw
} from 'lucide-react';

export default function PromoteStudents() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract passed state
  const passedState = location.state || {};
  const initialSelectedStudents = passedState.selectedStudents || [];
  const initialScope = passedState.initialScope || (initialSelectedStudents.length > 0 ? 'selected' : 'reg_numbers');
  const initialTargetYear = passedState.initialTargetYear || 'auto_increment';
  const initialSelectedIds = passedState.selectedIds || initialSelectedStudents.map(s => s.id) || [];

  // Form State
  const [promoteScope, setPromoteScope] = useState(initialScope); // 'reg_numbers' | 'course_batch' | 'selected'
  const [promoteRegNumbers, setPromoteRegNumbers] = useState('');
  const [promoteCourse, setPromoteCourse] = useState('');
  const [promoteYear, setPromoteYear] = useState('');
  const [promoteTargetYear, setPromoteTargetYear] = useState(initialTargetYear);
  const [promoteSemesterMode, setPromoteSemesterMode] = useState('auto');
  const [promoteSpecificSemester, setPromoteSpecificSemester] = useState('');
  const [promotePassingYearMode, setPromotePassingYearMode] = useState('keep');
  const [promoteSpecificPassingYear, setPromoteSpecificPassingYear] = useState('');
  
  // UI & Loading States
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteResult, setPromoteResult] = useState(null);
  
  // Selected students passed from student list page
  const [selectedStudents] = useState(initialSelectedStudents);
  const [selectedIds] = useState(initialSelectedIds);

  // Fetch courses/batch filters on mount
  const fetchFilterMetadata = useCallback(async () => {
    setLoadingMetadata(true);
    try {
      const { data } = await api.get('/students/filters/');
      setAvailableCourses(data.courses || []);
    } catch (err) {
      console.error('Failed to load course list:', err);
      toast.error('Failed to fetch course lists.');
    } finally {
      setLoadingMetadata(false);
    }
  }, []);

  useEffect(() => {
    fetchFilterMetadata();
  }, [fetchFilterMetadata]);

  // Submit Handler
  const handlePromoteBatch = async () => {
    setPromoteLoading(true);
    setPromoteResult(null);

    const payload = {
      target_year: promoteTargetYear,
      semester_mode: promoteSemesterMode,
      passing_year_mode: promotePassingYearMode,
    };

    if (promoteSemesterMode === 'specific') {
      payload.specific_semester = parseInt(promoteSpecificSemester);
    }
    if (promotePassingYearMode === 'specific') {
      payload.specific_passing_year = parseInt(promoteSpecificPassingYear);
    }

    if (promoteScope === 'reg_numbers') {
      payload.registration_numbers = promoteRegNumbers;
    } else if (promoteScope === 'course_batch') {
      payload.filter_course = promoteCourse;
      payload.filter_year = promoteYear;
    } else if (promoteScope === 'selected') {
      payload.student_ids = selectedIds;
    }

    try {
      const { data } = await api.post('/students/promote-batch/', payload);
      setPromoteResult(data);
      if (data.error_count > 0) {
        toast.error(`Promotion complete with errors. ${data.promoted_count} succeeded, ${data.error_count} failed.`);
      } else {
        toast.success(`🎉 Promotion completed successfully! ${data.promoted_count} promoted.`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Promotion failed.';
      toast.error(msg);
    } finally {
      setPromoteLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link 
            to="/students" 
            className="btn btn-secondary" 
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
            title="Back to Student List"
          >
            <ArrowLeft size={16} />
            <span>Students</span>
          </Link>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚡ Promote Students
            </h1>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Shift student cohorts to their next academic year, adjust semesters, and manage graduation groups.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Promotion Wizard Form */}
        <div className="card" style={{ padding: '28px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Step 1: Who to Promote */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-light, #f3e8ff)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>1</div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-primary)' }}>Who to Promote</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { val: 'reg_numbers', label: '📋 Paste Roll Numbers', desc: 'Copy and paste roll numbers directly from Excel' },
                { val: 'course_batch', label: '📚 By Course & Year', desc: 'Promote an entire batch of students in one click' },
                { val: 'selected', label: `☑️ Selected Students (${selectedStudents.length} checked)`, desc: 'Apply to students selected from the main grid', disabled: selectedStudents.length === 0 }
              ].map(opt => (
                <label 
                  key={opt.val} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '12px', 
                    padding: '12px 16px', 
                    borderRadius: '12px', 
                    border: `2px solid ${promoteScope === opt.val ? '#7c3aed' : 'var(--border-color)'}`, 
                    background: promoteScope === opt.val ? 'rgba(124,58,237,0.04)' : 'var(--bg-input, rgba(0,0,0,0.02))', 
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    opacity: opt.disabled ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input 
                    type="radio" 
                    name="promoteScope" 
                    value={opt.val} 
                    checked={promoteScope === opt.val} 
                    disabled={opt.disabled}
                    onChange={() => setPromoteScope(opt.val)} 
                    style={{ marginTop: '3px', accentColor: '#7c3aed' }} 
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: promoteScope === opt.val ? '#7c3aed' : 'var(--text-primary)' }}>{opt.label}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Scope: Roll Numbers Field */}
            {promoteScope === 'reg_numbers' && (
              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Enter Roll Numbers
                </label>
                <textarea
                  rows={4}
                  placeholder={'BCA2023001, BCA2023002\nBCA2023003\nBCA2023004'}
                  value={promoteRegNumbers}
                  onChange={e => setPromoteRegNumbers(e.target.value)}
                  style={{ 
                    width: '100%', 
                    borderRadius: '10px', 
                    border: '1px solid var(--border-color)', 
                    background: 'var(--bg-input)', 
                    color: 'var(--text-primary)', 
                    padding: '12px', 
                    fontSize: '0.88rem', 
                    resize: 'vertical', 
                    fontFamily: 'monospace', 
                    boxSizing: 'border-box' 
                  }}
                />
                <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
                  Separate values using commas, spaces, or new lines.
                </span>
              </div>
            )}

            {/* Scope: Course & Batch Selection */}
            {promoteScope === 'course_batch' && (
              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Course</label>
                  <select 
                    className="input-field" 
                    value={promoteCourse} 
                    onChange={e => setPromoteCourse(e.target.value)} 
                    style={{ width: '100%', height: '42px', borderRadius: '10px' }}
                  >
                    <option value="">Select Course</option>
                    {availableCourses.map(c => <option key={c.name} value={c.name}>{c.name} ({c.count} students)</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Current Year</label>
                  <select 
                    className="input-field" 
                    value={promoteYear} 
                    onChange={e => setPromoteYear(e.target.value)} 
                    style={{ width: '100%', height: '42px', borderRadius: '10px' }}
                  >
                    <option value="">Select Year</option>
                    {['1st','2nd','3rd','4th'].map(y => <option key={y} value={y}>{y} Year</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Scope: Selected Students Preview Trigger */}
            {promoteScope === 'selected' && selectedStudents.length > 0 && (
              <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(16,185,129,0.06)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.85rem', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} />
                <span>Ready to promote the <strong>{selectedStudents.length}</strong> selected students shown in the list panel on the right.</span>
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

          {/* Step 2: Target Year */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-light, #f3e8ff)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>2</div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-primary)' }}>Target Academic Year</h3>
            </div>
            
            <select 
              className="input-field" 
              value={promoteTargetYear} 
              onChange={e => setPromoteTargetYear(e.target.value)} 
              style={{ width: '100%', height: '44px', borderRadius: '10px' }}
            >
              <option value="auto_increment">🔁 Auto-increment Year (1st→2nd, 2nd→3rd, 4th→Graduate) — Skips 3rd Year</option>
              <option value="auto_decrement">↩ Revert 1 Semester (e.g. Sem 4→Sem 3, Sem 3→Sem 2)</option>
              <option value="4th">▶️ Set to 4th Year (Apply to 3rd Year Students to continue)</option>
              <option value="graduated">🎓 Set to Graduated / Exit (For 3rd or 4th Year Students)</option>
              <option value="1st">Set to 1st Year</option>
              <option value="2nd">Set to 2nd Year</option>
              <option value="3rd">Set to 3rd Year</option>
            </select>

            {promoteTargetYear === 'auto_increment' && (
              <div style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'rgba(99,102,241,0.06)', borderRadius: '8px', padding: '10px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <AlertTriangle size={15} style={{ color: '#7c3aed', flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Note:</strong> Under auto-increment, 3rd-year students are automatically <strong>skipped</strong>. Run a separate promotion setting them explicitly to <em>"4th Year"</em> or <em>"Graduated / Exit"</em>.
                </span>
              </div>
            )}

            {promoteTargetYear === 'auto_decrement' && (
              <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#92400e', background: 'rgba(217,119,6,0.06)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(217,119,6,0.15)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <RotateCcw size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Warning:</strong> Reverts students exactly <strong>1 semester</strong>. Year values will update automatically based on their new semester. Students already at Semester 1 are skipped.
                </span>
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

          {/* Step 3: Semester Shift */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-light, #f3e8ff)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>3</div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-primary)' }}>Semester Update</h3>
            </div>
            
            <select 
              className="input-field" 
              value={promoteSemesterMode} 
              onChange={e => setPromoteSemesterMode(e.target.value)} 
              style={{ width: '100%', height: '44px', borderRadius: '10px' }}
            >
              <option value="auto">🔁 Auto Shift (sets to the standard first semester of the new year)</option>
              <option value="increment_2">+2 Semesters (e.g. Sem 1 → Sem 3)</option>
              <option value="increment_1">+1 Semester (e.g. Sem 1 → Sem 2)</option>
              <option value="keep">Keep Current Semester Unchanged</option>
              <option value="specific">Set to a Specific Semester Number</option>
            </select>

            {promoteSemesterMode === 'specific' && (
              <input
                type="number" 
                min={1} 
                max={12}
                className="input-field"
                placeholder="Enter semester number (1–12)"
                value={promoteSpecificSemester}
                onChange={e => setPromoteSpecificSemester(e.target.value)}
                style={{ marginTop: '10px', width: '100%', height: '42px', borderRadius: '10px' }}
              />
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

          {/* Step 4: Graduation/Passing Year */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-light, #f3e8ff)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>4</div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-primary)' }}>Graduation (Passing) Year</h3>
            </div>
            
            <select 
              className="input-field" 
              value={promotePassingYearMode} 
              onChange={e => setPromotePassingYearMode(e.target.value)} 
              style={{ width: '100%', height: '44px', borderRadius: '10px' }}
            >
              <option value="keep">Keep Graduation Year Unchanged</option>
              <option value="increment_1">+1 Year (e.g. Class of 2026 → Class of 2027)</option>
              <option value="specific">Set to a Specific Graduation Year</option>
            </select>

            {promotePassingYearMode === 'specific' && (
              <input
                type="number" 
                min={2020} 
                max={2040}
                className="input-field"
                placeholder="Enter graduation year (e.g. 2028)"
                value={promoteSpecificPassingYear}
                onChange={e => setPromoteSpecificPassingYear(e.target.value)}
                style={{ marginTop: '10px', width: '100%', height: '42px', borderRadius: '10px' }}
              />
            )}
          </div>

          {/* Submit Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => navigate('/students')} 
              disabled={promoteLoading}
              style={{ flex: 1, borderRadius: '10px', height: '46px', fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              className="btn"
              onClick={handlePromoteBatch}
              disabled={
                promoteLoading || 
                (promoteScope === 'selected' && selectedIds.length === 0) || 
                (promoteScope === 'reg_numbers' && !promoteRegNumbers.trim()) || 
                (promoteScope === 'course_batch' && (!promoteCourse || !promoteYear))
              }
              style={{ 
                flex: 1.5,
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)', 
                color: '#fff', 
                fontWeight: 700, 
                border: 'none', 
                borderRadius: '10px',
                height: '46px',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px' 
              }}
            >
              {promoteLoading ? (
                <>
                  <div className="spinner" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Apply Promotion</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Dynamic Preview or Promotion Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '24px' }}>
          
          {/* Results Summary Card (Shown only after submitting promotion) */}
          {promoteResult && (
            <div className="card" style={{ padding: '28px', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: '#a855f7' }} />
                Promotion Results
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a' }}>{promoteResult.promoted_count}</div>
                  <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>Promoted</div>
                </div>
                <div style={{ padding: '16px', background: '#fef9c3', border: '1px solid #fef08a', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ca8a04' }}>{promoteResult.skipped_count}</div>
                  <div style={{ fontSize: '0.78rem', color: '#854d0e', fontWeight: 600 }}>Skipped</div>
                </div>
                <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626' }}>{promoteResult.error_count}</div>
                  <div style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 600 }}>Errors</div>
                </div>
              </div>

              {/* Error messages section */}
              {promoteResult.errors?.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: '#dc2626', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <XCircle size={14} />
                    Failed Roll Numbers
                  </div>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #fee2e2', background: '#fef2f2', padding: '12px', borderRadius: '10px' }}>
                    <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '0.82rem', color: '#991b1b' }}>
                      {promoteResult.errors.map((err, idx) => (
                        <li key={idx} style={{ marginBottom: '6px' }}>
                          <strong>{err.registration_number}</strong> ({err.name || 'Unknown Student'}): {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Skipped list section */}
              {promoteResult.skipped?.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: '#854d0e', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} />
                    Skipped (3rd-Year Cohort)
                  </div>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #fef08a', background: '#fef9c3', padding: '12px', borderRadius: '10px' }}>
                    <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '0.82rem', color: '#854d0e' }}>
                      {promoteResult.skipped.map((skip, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                          <strong>{skip.registration_number}</strong> — {skip.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Promoted list details */}
              {promoteResult.promoted?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: '#166534', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={14} />
                    Successfully Promoted Students
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #bbf7d0', background: '#f0fdf4', padding: '12px', borderRadius: '10px' }}>
                    <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '0.82rem', color: '#166534' }}>
                      {promoteResult.promoted.map((student, idx) => (
                        <li key={idx} style={{ marginBottom: '6px' }}>
                          <strong>{student.registration_number}</strong> — {student.name}
                          <div style={{ fontSize: '0.74rem', color: '#15803d', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>Year: {student.old_year} → {student.new_year}</span>
                            <span>•</span>
                            <span>Semester: {student.old_semester || 'N/A'} → {student.new_semester || 'N/A'}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selected Students List card (Shown always if selectedStudents exists) */}
          {promoteScope === 'selected' && selectedStudents.length > 0 && (
            <div className="card" style={{ padding: '24px', borderRadius: '20px', minHeight: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} style={{ color: '#7c3aed' }} />
                  Selected Students ({selectedStudents.length})
                </h3>
              </div>

              <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                {selectedStudents.map(student => (
                  <div 
                    key={student.id} 
                    style={{ 
                      padding: '10px 12px', 
                      borderRadius: '10px', 
                      border: '1px solid var(--border-color)', 
                      background: 'var(--bg-input, rgba(0,0,0,0.01))',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>{student.name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Roll No: {student.registration_number}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge" style={{ background: 'var(--primary-light, #e0e7ff)', color: '#3730a3', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
                        {student.course} ({student.year})
                      </span>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Sem {student.semester || 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Context/Information Card (Fallback if no results/no selected students) */}
          {(!promoteResult && (promoteScope !== 'selected' || selectedStudents.length === 0)) && (
            <div className="card" style={{ padding: '28px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={16} style={{ color: '#7c3aed' }} />
                Student Promotion Guide
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <ChevronRight size={16} style={{ color: '#7c3aed', flexShrink: 0, marginTop: '3px' }} />
                  <div>
                    <strong>Auto-increment mode:</strong> Shifting students forward by 1 academic year (e.g. 1st Year to 2nd Year, 2nd Year to 3rd Year).
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <ChevronRight size={16} style={{ color: '#7c3aed', flexShrink: 0, marginTop: '3px' }} />
                  <div>
                    <strong>Graduation (3rd vs 4th Year):</strong> Since BCA is 3 years and B.Tech is 4 years, auto-increment skips 3rd year students to prevent incorrect routing. Apply explicit actions for final year students.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <ChevronRight size={16} style={{ color: '#7c3aed', flexShrink: 0, marginTop: '3px' }} />
                  <div>
                    <strong>Revert/Rollback:</strong> In case of an accidental promotion, use the Revert target year option to shift cohorts back by exactly 1 semester.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <ChevronRight size={16} style={{ color: '#7c3aed', flexShrink: 0, marginTop: '3px' }} />
                  <div>
                    <strong>Audit Logging:</strong> All student promotion actions are tracked inside the audit log showing count of students modified and the requesting admin user.
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
