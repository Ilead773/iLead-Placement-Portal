import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  BookOpen, 
  UploadCloud, 
  Award, 
  Mail, 
  Play, 
  CheckCircle, 
  Edit3, 
  AlertCircle, 
  Filter, 
  UserPlus, 
  Send,
  FileText,
  Trash,
  Plus,
  Search,
  Square,
  X,
  ClipboardList
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../../store/authStore';
import northStarAPI from '../../../api/northStarAPI';


export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [reconciliationQueue, setReconciliationQueue] = useState([]);
  const [progressList, setProgressList] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [assignments, setAssignments] = useState([]);
  
  // Grading Hub Redesign States
  const [gradingTab, setGradingTab] = useState('results'); // 'results' | 'build'
  const [selectedAsm, setSelectedAsm] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [editScore, setEditScore] = useState('');
  const [editFeedback, setEditFeedback] = useState('');
  const [submittingGrade, setSubmittingGrade] = useState(false);
  
  // Forms states
  const [classTitle, setClassTitle] = useState('');
  const [classCourse, setClassCourse] = useState('');
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [classStart, setClassStart] = useState('');
  const [classEnd, setClassEnd] = useState('');

  const [asmTitle, setAsmTitle] = useState('');
  const [asmCourse, setAsmCourse] = useState('');
  const [asmDesc, setAsmDesc] = useState('');
  const [asmDue, setAsmDue] = useState('');
  const [asmDuration, setAsmDuration] = useState(30);
  const [asmQuestions, setAsmQuestions] = useState([
    { prompt: '', options: ['', '', '', ''], correct_option: 0, points: 1 }
  ]);
  
  const updateQuestion = (index, field, value) => {
    const updated = [...asmQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setAsmQuestions(updated);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...asmQuestions];
    updated[qIndex].options[oIndex] = value;
    setAsmQuestions(updated);
  };

  const addQuestion = () => {
    setAsmQuestions([...asmQuestions, { prompt: '', options: ['', '', '', ''], correct_option: 0, points: 1 }]);
  };

  const removeQuestion = (index) => {
    const updated = [...asmQuestions];
    updated.splice(index, 1);
    setAsmQuestions(updated);
  };

  const [bulkPasteMode, setBulkPasteMode] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState('');

  // Parse pasted text format into question objects.
  // Supported format:
  //   Q: What is the capital of France?
  //   A: Berlin
  //   B: Madrid
  //   C: Paris
  //   D: Rome
  //   ANS: C
  //   PTS: 2          ← optional, defaults to 1
  //   (blank line between questions)
  const parseBulkPaste = () => {
    const blocks = bulkPasteText.trim().split(/\n{2,}/);
    const parsed = [];
    const errors = [];

    blocks.forEach((block, i) => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const qLine = lines.find(l => /^Q:/i.test(l));
      const aLine = lines.find(l => /^A:/i.test(l));
      const bLine = lines.find(l => /^B:/i.test(l));
      const cLine = lines.find(l => /^C:/i.test(l));
      const dLine = lines.find(l => /^D:/i.test(l));
      const ansLine = lines.find(l => /^ANS:/i.test(l));
      const ptsLine = lines.find(l => /^PTS:/i.test(l));

      if (!qLine || !aLine || !bLine || !cLine || !dLine || !ansLine) {
        errors.push(`Block ${i + 1}: Missing required fields (Q, A, B, C, D, ANS).`);
        return;
      }

      const prompt = qLine.replace(/^Q:/i, '').trim();
      const opts = [
        aLine.replace(/^A:/i, '').trim(),
        bLine.replace(/^B:/i, '').trim(),
        cLine.replace(/^C:/i, '').trim(),
        dLine.replace(/^D:/i, '').trim(),
      ];
      const ansLetter = ansLine.replace(/^ANS:/i, '').trim().toUpperCase();
      const ansIdx = ['A', 'B', 'C', 'D'].indexOf(ansLetter);
      const pts = ptsLine ? parseInt(ptsLine.replace(/^PTS:/i, '').trim(), 10) || 1 : 1;

      if (ansIdx === -1) {
        errors.push(`Block ${i + 1}: ANS must be A, B, C, or D.`);
        return;
      }
      parsed.push({ prompt, options: opts, correct_option: ansIdx, points: pts });
    });

    if (errors.length > 0) {
      toast.error(errors[0], { duration: 4000 });
      return;
    }
    if (parsed.length === 0) {
      toast.error('No valid questions found. Check the format.');
      return;
    }

    setAsmQuestions(parsed);
    setBulkPasteMode(false);
    setBulkPasteText('');
    toast.success(`Imported ${parsed.length} question${parsed.length > 1 ? 's' : ''} successfully!`);
  };

  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailCourse, setEmailCourse] = useState('');
  const [emailAttendanceFilter, setEmailAttendanceFilter] = useState('');
  const [emailCompletionFilter, setEmailCompletionFilter] = useState('');
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState([]);

  // Auto-select all students when the progress list loads
  useEffect(() => {
    if (progressList.length > 0 && selectedRecipients.length === 0) {
      setSelectedRecipients(progressList.map(p => p.student));
    }
  }, [progressList]);



  
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterCourse, setFilterCourse] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [certFilterCourse, setCertFilterCourse] = useState('');
  const [certSearchQuery, setCertSearchQuery] = useState('');
  const [releasingCerts, setReleasingCerts] = useState(false);

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(() => {
      fetchAdminData(true);
    }, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, []);

  // Smart refresh: merges server data with local state.
  // Preserves locally-injected classes not yet confirmed by server (Supabase read-after-write lag).
  const refreshClasses = async () => {
    try {
      const res = await northStarAPI.getClasses();
      setClasses(prev => {
        const serverIds = new Set(res.data.map(c => c.id));
        // Keep any locally-injected classes the server hasn't confirmed yet
        const localOnly = prev.filter(c => !serverIds.has(c.id));
        return [...localOnly, ...res.data];
      });
    } catch (err) {
      console.error('Failed to refresh classes:', err);
    }
  };

  const fetchAdminData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Run all fetches in parallel — none blocks the others
      const [statsResult, coursesResult, classesResult, reconcResult, progressResult, submissionsResult, assignmentsResult] = await Promise.allSettled([
        northStarAPI.getAdminDashboard(),
        northStarAPI.getCourses(),
        northStarAPI.getClasses(),
        northStarAPI.getReconciliation(),
        northStarAPI.getProgress(),
        northStarAPI.getSubmissions(),
        northStarAPI.getAssignments()
      ]);

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value.data);
      }
      if (coursesResult.status === 'fulfilled') {
        const coursesData = coursesResult.value.data;
        setCourses(coursesData);
        if (coursesData.length > 0 && !asmCourse) {
          setClassCourse(coursesData[0].id);
          setSelectedCourses([coursesData[0].id]);
          setAsmCourse(coursesData[0].id);
        }
      }
      if (classesResult.status === 'fulfilled') {
        // Smart merge: preserve locally-injected classes not yet confirmed by server
        setClasses(prev => {
          const serverData = classesResult.value.data;
          const serverIds = new Set(serverData.map(c => c.id));
          const localOnly = prev.filter(c => !serverIds.has(c.id));
          return [...localOnly, ...serverData];
        });
      }
      if (reconcResult.status === 'fulfilled') {
        setReconciliationQueue(reconcResult.value.data);
      }
      if (progressResult.status === 'fulfilled') {
        setProgressList(progressResult.value.data);
      }
      if (submissionsResult.status === 'fulfilled') {
        setSubmissions(submissionsResult.value.data);
      }
      if (assignmentsResult && assignmentsResult.status === 'fulfilled') {
        setAssignments(assignmentsResult.value.data);
      }
    } catch (err) {
      console.error(err);
      if (!silent) toast.error('Failed to load coordinator data.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleScheduleClass = async (e) => {
    e.preventDefault();
    if (!classTitle || selectedCourses.length === 0 || !classStart || !classEnd) {
      toast.error('Please fill in all fields and select at least one course stream.');
      return;
    }

    const tid = toast.loading('Creating class & generating Zoom meeting...');
    try {
      const res = await northStarAPI.scheduleClass({
        course_ids: selectedCourses,
        course_id: selectedCourses[0],
        title: classTitle,
        start_time: classStart,
        end_time: classEnd
      });
      toast.dismiss(tid);
      toast.success('Class scheduled! Zoom meeting created ✅');

      // INSTANT UPDATE: inject the new class directly into state
      if (res.data && res.data.id) {
        setClasses(prev => [res.data, ...prev]);
      }

      // Show the join link to admin so they can share it
      const joinUrl = res.data.zoom_join_url || '';
      if (joinUrl) {
        toast.success(
          <span>
            Zoom link ready!{' '}
            <a href={joinUrl} target="_blank" rel="noopener noreferrer"
              style={{ color: '#818cf8', fontWeight: 700, textDecoration: 'underline' }}>
              Open Zoom →
            </a>
          </span>,
          { duration: 10000 }
        );
      }

      setClassTitle('');
      setClassStart('');
      setClassEnd('');
      if (courses.length > 0) {
        setSelectedCourses([courses[0].id]);
      } else {
        setSelectedCourses([]);
      }
      // Delay the server refresh by 2s so the DB write has committed before we re-fetch.
      // The instant injection above shows the class immediately in the UI.
      setTimeout(() => refreshClasses(), 2000);
    } catch (err) {
      toast.dismiss(tid);
      console.error(err);
      const detail = err?.response?.data?.detail || '';
      toast.error(detail || 'Failed to schedule class. Check Zoom S2S credentials.');
    }
  };



  const handlePostAssignment = async (e) => {
    e.preventDefault();
    if (!asmTitle || !asmCourse || !asmDue) {
      toast.error('Please fill in required fields.');
      return;
    }

    const payload = {
      course: asmCourse,
      title: asmTitle,
      description: asmDesc,
      due_date: asmDue,
      duration_minutes: asmDuration,
      max_score: asmQuestions.reduce((sum, q) => sum + Number(q.points), 0),
      questions: asmQuestions.map((q, idx) => ({ ...q, order: idx }))
    };

    try {
      await northStarAPI.createAssignment(payload);
      toast.success('Assignment posted successfully!');
      setAsmTitle('');
      setAsmDesc('');
      setAsmDue('');
      setAsmDuration(30);
      setAsmQuestions([{ prompt: '', options: ['', '', '', ''], correct_option: 0, points: 1 }]);
      setGradingTab('results'); // Switch back to submissions queue view on success
      fetchAdminData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to post assignment.');
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailSubject || !emailBody) {
      toast.error('Please fill subject and body.');
      return;
    }
    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient student.');
      return;
    }

    const tid = toast.loading('Queueing email dispatch...');
    try {
      await northStarAPI.sendBulkEmail({
        subject: emailSubject,
        body: emailBody,
        recipient_ids: selectedRecipients
      });
      toast.dismiss(tid);
      toast.success(`Announcement emails queued for ${selectedRecipients.length} recipients!`);
      setEmailSubject('');
      setEmailBody('');
    } catch (err) {
      toast.dismiss(tid);
      console.error(err);
      toast.error('Failed to queue emails.');
    }
  };

  const handleOverrideAttendance = async (attendanceId, newStatus) => {
    try {
      await northStarAPI.overrideAttendance(attendanceId, newStatus);
      toast.success('Attendance overridden successfully!');
      
      // Refresh list
      handleFetchAttendanceGrid();
    } catch (err) {
      console.error(err);
      toast.error('Failed to override attendance.');
    }
  };

  const handleEndClass = async (classId) => {
    if (!window.confirm('Are you sure you want to end this class early? Attendance will be finalised immediately.')) return;
    try {
      await northStarAPI.endClass(classId);
      toast.success('Class ended. Attendance finalised.');
      fetchAdminData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to end class.');
    }
  };

  const handleFetchAttendanceGrid = async () => {
    if (!filterClass) return;
    try {
      const res = await northStarAPI.getAttendance({ class: filterClass });
      setAttendance(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load attendance list.');
    }
  };

  const handleTriggerCertificate = async (studentId, courseId) => {
    try {
      await northStarAPI.generateCertificate(studentId, courseId);
      toast.success('Certificate generation triggered successfully!');
      fetchAdminData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to trigger certificate.');
    }
  };

  const handleReleaseCertificates = async () => {
    if (!certFilterCourse) {
      toast.error('Please select a course group first.');
      return;
    }
    
    const courseObj = courses.find(c => c.id === certFilterCourse);
    const courseName = courseObj ? courseObj.name : 'Selected Course';
    
    if (!window.confirm(`Are you sure you want to release certificates for all qualifying students in "${courseName}"?`)) {
      return;
    }
    
    setReleasingCerts(true);
    try {
      await northStarAPI.releaseCourseCertificates(certFilterCourse);
      toast.success(`Certificate release triggered for ${courseName}!`);
      // Refresh progress list
      const progressRes = await northStarAPI.getProgress();
      setProgressList(progressRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to trigger certificate release.');
    } finally {
      setReleasingCerts(false);
    }
  };


  useEffect(() => {
    if (filterClass) {
      handleFetchAttendanceGrid();
    }
  }, [filterClass]);



  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#0e0f14] text-slate-800 dark:text-slate-100 transition-colors duration-300">

      {/* ─── HEADER ─────────────────────────────────────── */}
      <div className="bg-[#13141a] border-b border-white/[0.06]">
        <div className="px-8 pt-7 pb-0 max-w-screen-2xl mx-auto">

          {/* Top row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                North Star · Coordinator Console
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <span className="text-sm font-medium text-slate-300 hidden sm:block">
                {user?.first_name} {user?.last_name}
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-white tracking-tight">LMS Management Board</h1>
            <p className="text-sm text-slate-500 mt-1">
              Organize classes, track Zoom attendance, grade homework, and issue certificates.
            </p>
          </div>

          {/* Tab bar */}
          <div className="flex pb-4">
            <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-x-auto scrollbar-hide">
              {[
                { id: 'dashboard',    label: 'Overview' },
                { id: 'classes',      label: 'Schedule' },
                { id: 'attendance',   label: 'Attendance' },
                { id: 'assignments',  label: 'Grading Hub' },
                { id: 'email',        label: 'Notifications' },
                { id: 'certificates', label: 'Certificates' },
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-1.5 text-xs font-semibold whitespace-nowrap rounded-lg outline-none transition-all duration-200 border ${
                      isActive
                        ? 'bg-white/[0.08] text-white border-white/[0.08] shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 border-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-screen-2xl mx-auto">

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Retrieving academic profiles...</p>
        </div>
      ) : (
        <>
          {/* ================================================================== */}
          {/* OVERVIEW TAB */}
          {/* ================================================================== */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* Top stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Enrolled Students Card */}
                <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-350 dark:hover:border-slate-700 transition-colors flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Enrolled Students</span>
                    <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white tracking-tight">{stats.total_enrolled_students}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      Active student accounts
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <Users size={20} />
                  </div>
                </div>

                {/* Active Courses Card */}
                <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-350 dark:hover:border-slate-700 transition-colors flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Active Courses</span>
                    <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white tracking-tight">{courses.length}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-550" style={{ backgroundColor: '#10b981' }} />
                      Registered syllabus streams
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <BookOpen size={20} />
                  </div>
                </div>

                {/* Classes Logged Card */}
                <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-350 dark:hover:border-slate-700 transition-colors flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Classes Logged</span>
                    <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white tracking-tight">{classes.length}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Recorded class sessions
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Calendar size={20} />
                  </div>
                </div>
              </div>

              {/* Course Performance Board */}
              <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                  <Award className="text-indigo-500" size={18} />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Course Stream Performance</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-[#15171e] border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                        <th className="px-6 py-3">Course Name</th>
                        <th className="px-6 py-3">Enrollments</th>
                        <th className="px-6 py-3">Avg Attendance</th>
                        <th className="px-6 py-3 text-right">Avg Completion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.course_stats.map(c => (
                        <tr key={c.course_id} className="border-b border-slate-100/50 dark:border-slate-800/50 text-xs hover:bg-slate-50/80 dark:hover:bg-[#161822] transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{c.course_name}</td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{c.enrollments} students</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                              c.avg_attendance >= 75 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10' 
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/10'
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${c.avg_attendance >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {c.avg_attendance}%
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-3">
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{c.avg_completion}%</span>
                              <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-indigo-650 h-full rounded-full" 
                                  style={{ width: `${c.avg_completion}%`, backgroundColor: '#4f46e5' }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* ================================================================== */}
          {/* SCHEDULE CLASS TAB */}
          {/* ================================================================== */}
          {activeTab === 'classes' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form to Schedule */}
              <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <Calendar className="text-indigo-500" size={18} />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Schedule Class</h3>
                </div>

                <form onSubmit={handleScheduleClass} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Target Course Streams</label>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 border border-slate-200 dark:border-slate-800/80 rounded-lg bg-slate-50/50 dark:bg-slate-950/50">
                      {courses.map(c => {
                        const isSelected = selectedCourses.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                if (selectedCourses.length > 1) {
                                  setSelectedCourses(selectedCourses.filter(id => id !== c.id));
                                } else {
                                  toast.error('Select at least one course.');
                                }
                              } else {
                                setSelectedCourses([...selectedCourses, c.id]);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all duration-150 ${
                              isSelected 
                                ? 'bg-indigo-600 text-white border-indigo-650' 
                                : 'bg-white dark:bg-[#161822] text-slate-650 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-55 dark:hover:bg-slate-800'
                            }`}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Class Topic / Title</label>
                    <input 
                      type="text" 
                      value={classTitle}
                      onChange={(e) => setClassTitle(e.target.value)}
                      placeholder="e.g. Intro to Digital Campaigns"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-350 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Start Datetime</label>
                      <input 
                        type="datetime-local" 
                        value={classStart}
                        onChange={(e) => setClassStart(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-350"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">End Datetime</label>
                      <input 
                        type="datetime-local" 
                        value={classEnd}
                        onChange={(e) => setClassEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-350"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors uppercase tracking-wider"
                  >
                    Schedule Class & Zoom Meeting
                  </button>
                </form>
              </div>

              {/* Class list and Start Buttons */}
              <div className="lg:col-span-2 bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-5">
                  <Play className="text-indigo-500" size={18} />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Hosted Class Sessions</h3>
                </div>

                {classes.length > 0 ? (
                  <div className="space-y-3 overflow-y-auto pr-1 max-h-[500px]">
                    {classes.map(cls => {
                      const isEnded = cls.is_ended || (new Date() > new Date(cls.end_time));
                      return (
                        <div 
                          key={cls.id}
                          className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50/50 dark:bg-[#161822] border border-slate-150 dark:border-slate-800/80 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                        >
                          <div className="space-y-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider">{cls.course_name}</span>
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-white">{cls.title}</h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock size={12} /> {new Date(cls.start_time).toLocaleDateString()} at {new Date(cls.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span>• Zoom ID: {cls.zoom_meeting_id}</span>
                            </div>
                          </div>

                           <div className="mt-3 md:mt-0 flex items-center gap-2">
                             {isEnded ? (
                               <span className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-semibold rounded-lg text-[10px] border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                                 Ended
                               </span>
                             ) : (
                               <>
                                 {cls.zoom_start_url ? (
                                   <a
                                     href={cls.zoom_start_url}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider text-center"
                                   >
                                     <Play size={10} fill="currentColor" /> Start Host
                                   </a>
                                 ) : (
                                   <span className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 font-semibold rounded-lg text-[10px] border border-slate-200 dark:border-slate-700">
                                     No Link
                                   </span>
                                 )}
                                 <button
                                   onClick={() => handleEndClass(cls.id)}
                                   className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 transition-colors uppercase tracking-wider"
                                 >
                                   <Square size={8} fill="currentColor" /> End Class
                                 </button>
                               </>
                             )}
                           </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex-1 flex flex-col items-center justify-center">
                    <Calendar size={36} className="opacity-25 mb-2" />
                    <p className="font-semibold text-xs text-slate-500">No class channels created yet.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Use the scheduler form to launch a Zoom channel.</p>
                  </div>
                )}
              </div>
            </div>
          )}
                 {/* ================================================================== */}
          {/* ATTENDANCE GRID TAB */}
          {/* ================================================================== */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Student Attendance Records</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select class to view or override attendance list</p>
                  </div>

                  {/* Filters */}
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <Filter size={14} className="text-indigo-500" />
                      <select 
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        className="bg-transparent border-none text-xs outline-none font-bold text-slate-700 dark:text-slate-300"
                      >
                        <option value="">-- Choose Class --</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.title} ({c.course_name})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {filterClass ? (
                  attendance.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800/80">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 dark:bg-[#15171e] border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                            <th className="px-6 py-3">Student Name</th>
                            <th className="px-6 py-3">Email</th>
                            <th className="px-6 py-3">Duration</th>
                            <th className="px-6 py-3">Tracking</th>
                            <th className="px-6 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.map(att => (
                            <tr key={att.id} className="border-b border-slate-100/50 dark:border-slate-800/50 text-xs hover:bg-slate-50/80 dark:hover:bg-[#161822] transition-colors">
                              <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{att.student_details?.name || 'Student'}</td>
                              <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{att.student_details?.email}</td>
                              <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">{att.total_duration_minutes} mins</td>
                              <td className="px-6 py-4">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                                  att.marked_via === 'manual' 
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10' 
                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/10'
                                }`}>
                                  {att.marked_via === 'manual' ? 'Manual' : 'Zoom Auto'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                                  att.status === 'present' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10' :
                                  att.status === 'late' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10' :
                                  att.status === 'excused' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/10' :
                                  'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/10'
                                }`}>
                                  {att.status === 'excused' ? 'Excused' : `${att.attendance_percent ?? 0}%`}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-xs text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/10 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                      No attendance reports generated for this class yet. Zoom webhook finalizing runs 15 mins after class end.
                    </div>
                  )
                ) : (
                  <div className="text-center py-16 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    <Filter size={32} className="mx-auto mb-2 opacity-25 text-indigo-500" />
                    <p className="font-semibold text-xs text-slate-500">Select a class from the dropdown filter to view logs.</p>
                  </div>
                )}
              </div>

              {/* Reconciliation Panel */}
              <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">Zoom Unmatched Participant Queue</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Logs of participants who joined via Zoom but couldn't be auto-mapped to a database student account.</p>

                {reconciliationQueue.length > 0 ? (
                  <div className="space-y-3">
                    {reconciliationQueue.map(ev => (
                      <div key={ev.id} className="relative flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50/50 dark:bg-[#161822] border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-350 dark:hover:border-slate-700 transition-colors">
                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-amber-500 rounded-r-full" />
                        
                        <div className="space-y-1 pl-2">
                          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">{ev.participant_name}</h5>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{ev.participant_email}</p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">Class: {ev.scheduled_class?.title || 'Unknown'} at {new Date(ev.timestamp).toLocaleTimeString()}</span>
                        </div>

                        <button
                          onClick={() => {
                            toast('Manual matching feature: search user by email to link this event.', { icon: 'ℹ️' });
                          }}
                          className="mt-3 md:mt-0 px-3 py-1.5 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white font-bold rounded-lg text-[10px] uppercase transition-colors"
                        >
                          Resolve & Match
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/10 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                    <CheckCircle size={32} className="mx-auto mb-2 text-emerald-500 opacity-50" />
                    <p className="font-semibold text-xs text-slate-505">Reconciliation queue is empty. Clean sync!</p>
                  </div>
                )}
              </div>
            </div>
          )}
             {/* ================================================================== */}
          {/* GRADING HUB TAB */}
          {/* ================================================================== */}
          {activeTab === 'assignments' && (
            <div className="space-y-6">
              {/* Grading Hub Sub-Tabs Switcher */}
              <div className="flex justify-between items-center bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
                <div className="flex gap-2">
                  <button
                    onClick={() => setGradingTab('results')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                      gradingTab === 'results'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    <CheckCircle size={14} /> Submissions & Grading
                  </button>
                  <button
                    onClick={() => setGradingTab('build')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                      gradingTab === 'build'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    <Plus size={14} /> Post New Assessment
                  </button>
                </div>
                
                {selectedAsm && gradingTab === 'results' && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Selected: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAsm.title}</span>
                  </div>
                )}
              </div>

              {/* Tab 1: Submissions & Grading */}
              {gradingTab === 'results' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Assessments List */}
                  <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                      <BookOpen className="text-indigo-500" size={16} />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Assessments</h4>
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
                      {assignments.length > 0 ? (
                        assignments.map(asm => {
                          const asmSubs = submissions.filter(s => s.assignment === asm.id);
                          const isMCQ = asm.questions && asm.questions.length > 0;
                          const isSelected = selectedAsm?.id === asm.id;
                          const pendingCount = asmSubs.filter(s => s.status !== 'graded').length;

                          return (
                            <div
                              key={asm.id}
                              onClick={() => {
                                setSelectedAsm(asm);
                                setSelectedSub(null);
                              }}
                              className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/20'
                                  : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-350 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/20'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-[9px] font-extrabold text-indigo-500 dark:text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded uppercase">
                                  {asm.course_name}
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold">
                                  Max: {asm.max_score} pts
                                </span>
                              </div>
                              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2 line-clamp-1">{asm.title}</h5>
                              <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-[10px] text-slate-400">
                                <span className="flex items-center gap-1">
                                  {isMCQ ? <CheckCircle size={10} className="text-emerald-500" /> : <FileText size={10} className="text-amber-500" />}
                                  {isMCQ ? 'MCQ Test' : 'File Upload'}
                                </span>
                                {pendingCount > 0 ? (
                                  <span className="font-bold text-amber-500">
                                    {pendingCount} Pending
                                  </span>
                                ) : (
                                  <span>{asmSubs.length} Submissions</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-10 text-slate-400">
                          <BookOpen size={24} className="mx-auto opacity-30 mb-2" />
                          <p className="text-[11px]">No assessments found.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right 2 Columns: Submissions & Performance detail */}
                  <div className="lg:col-span-2 space-y-6">
                    {!selectedAsm ? (
                      <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-16 shadow-sm text-center flex flex-col items-center justify-center h-full min-h-[350px]">
                        <ClipboardList size={40} className="opacity-20 text-indigo-500 mb-3" />
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Select an Assessment</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                          Click on any assessment in the list to view its submissions queue and grade student work.
                        </p>
                      </div>
                    ) : (() => {
                      const asmSubs = submissions.filter(s => s.assignment === selectedAsm.id);
                      const totalCount = asmSubs.length;
                      const gradedCount = asmSubs.filter(s => s.status === 'graded').length;
                      const pendingCount = totalCount - gradedCount;
                      const averageScore = gradedCount > 0 
                        ? (asmSubs.filter(s => s.status === 'graded').reduce((sum, s) => sum + (s.score || 0), 0) / (gradedCount * (selectedAsm.max_score || 1)) * 100).toFixed(0) 
                        : '0';

                      return (
                        <>
                          {/* Stats cards for Selected Assignment */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex justify-between items-center relative overflow-hidden">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Submissions</span>
                                <span className="text-2xl font-extrabold text-slate-850 dark:text-white mt-1 block">{totalCount}</span>
                              </div>
                              <Users size={20} className="text-indigo-500 opacity-40" />
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
                            </div>

                            <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex justify-between items-center relative overflow-hidden">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Graded & Completed</span>
                                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">{gradedCount}</span>
                              </div>
                              <CheckCircle size={20} className="text-emerald-500 opacity-40" />
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
                            </div>

                            <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex justify-between items-center relative overflow-hidden">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Average Accuracy</span>
                                <span className="text-2xl font-extrabold text-amber-500 mt-1 block">{averageScore}%</span>
                              </div>
                              <Award size={20} className="text-amber-500 opacity-40" />
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
                            </div>
                          </div>

                          {/* Submissions Queue Table */}
                          <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Submissions Queue</h4>
                              <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">{selectedAsm.title}</span>
                            </div>
                            {asmSubs.length > 0 ? (
                              <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50/50 dark:bg-[#15171e] border-b border-slate-150 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                                      <th className="px-4 py-2.5">Student</th>
                                      <th className="px-4 py-2.5">Submitted At</th>
                                      <th className="px-4 py-2.5">Status</th>
                                      <th className="px-4 py-2.5">Score</th>
                                      <th className="px-4 py-2.5 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {asmSubs.map(sub => (
                                      <tr key={sub.id} className="border-b border-slate-100/50 dark:border-slate-800/50 text-xs hover:bg-slate-50/80 dark:hover:bg-[#161822] transition-colors">
                                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                                          {sub.student_details?.name || 'Student'}
                                          <span className="text-[10px] font-normal text-slate-400 block">{sub.student_details?.email}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-455">
                                          {new Date(sub.submitted_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                            sub.status === 'graded'
                                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10'
                                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10'
                                          }`}>
                                            {sub.status}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">
                                          {sub.score != null ? `${sub.score} / ${selectedAsm.max_score} pts` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          <button
                                            onClick={() => {
                                              setSelectedSub(sub);
                                              setEditScore(sub.score != null ? String(sub.score) : '');
                                              setEditFeedback(sub.feedback || '');
                                            }}
                                            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 hover:border-indigo-600 dark:hover:border-indigo-600 text-slate-600 dark:text-slate-400 font-bold rounded text-[9px] uppercase transition-colors"
                                          >
                                            Review & Grade
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center py-10 text-slate-400">
                                <Users size={24} className="mx-auto opacity-30 mb-2" />
                                <p className="text-xs">No submissions received yet for this assessment.</p>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Tab 2: Post New Assessment */}
              {gradingTab === 'build' && (
                <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm max-w-2xl mx-auto">
                  <div className="flex items-center gap-2 mb-5">
                    <BookOpen className="text-indigo-500" size={18} />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Post Assignment</h3>
                  </div>

                  <form onSubmit={handlePostAssignment} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Course Stream</label>
                      <select 
                        value={asmCourse}
                        onChange={(e) => setAsmCourse(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-700 dark:text-slate-355"
                      >
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assignment Title</label>
                      <input 
                        type="text" 
                        value={asmTitle}
                        onChange={(e) => setAsmTitle(e.target.value)}
                        placeholder="e.g. SEO Optimization Audit"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-350 placeholder:text-slate-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Instructions / Description</label>
                      <textarea 
                        value={asmDesc}
                        onChange={(e) => setAsmDesc(e.target.value)}
                        rows={2}
                        placeholder="Write instructions or rules here..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-350 placeholder:text-slate-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Due Date</label>
                        <input 
                          type="datetime-local" 
                          value={asmDue}
                          onChange={(e) => setAsmDue(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-850 dark:text-slate-350"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Duration (Min)</label>
                        <input 
                          type="number" 
                          min="1"
                          value={asmDuration}
                          onChange={(e) => setAsmDuration(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-850 dark:text-slate-350"
                        />
                      </div>
                    </div>

                    {/* MCQ Builder */}
                    <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">MCQ Questions ({asmQuestions.length})</h4>
                        <button
                          type="button"
                          onClick={() => setBulkPasteMode(v => !v)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border ${
                            bulkPasteMode
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                          }`}
                        >
                          <ClipboardList size={11} />
                          {bulkPasteMode ? 'Back to Builder' : 'Paste Import'}
                        </button>
                      </div>

                      {/* ── Bulk Paste Mode ── */}
                      {bulkPasteMode ? (
                        <div className="space-y-3">
                          {/* Format guide */}
                          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-[10px] font-mono text-slate-500 dark:text-slate-400 leading-relaxed">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">📋 Paste Format — one blank line between questions</p>
                            <pre className="whitespace-pre-wrap">{'Q: What is 2 + 2?\nA: 3\nB: 4\nC: 5\nD: 6\nANS: B\nPTS: 1\n\nQ: Capital of France?\nA: Berlin\nB: Madrid\nC: Paris\nD: Rome\nANS: C\nPTS: 2'}</pre>
                          </div>
                          <textarea
                            value={bulkPasteText}
                            onChange={(e) => setBulkPasteText(e.target.value)}
                            rows={14}
                            placeholder={`Q: Your question here?\nA: Option A\nB: Option B\nC: Option C\nD: Option D\nANS: B\nPTS: 1\n\nQ: Next question...`}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-350 placeholder:text-slate-300 dark:placeholder:text-slate-600 font-mono leading-relaxed"
                            spellCheck={false}
                          />
                          <button
                            type="button"
                            onClick={parseBulkPaste}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors uppercase tracking-wider flex items-center justify-center gap-2"
                          >
                            <ClipboardList size={13} /> Parse &amp; Import Questions
                          </button>
                        </div>
                      ) : (
                        <>
                          {asmQuestions.map((question, qIdx) => (
                            <div key={qIdx} className="p-3 bg-slate-50/50 dark:bg-[#161822] border border-slate-200 dark:border-slate-800/80 rounded-lg space-y-2.5 relative">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Question {qIdx + 1}</span>
                                <div className="flex items-center gap-2">
                                  <label className="text-[9px] font-bold text-slate-550 flex items-center gap-1.5 uppercase">
                                    Points
                                    <input 
                                      type="number" 
                                      min="1" 
                                      value={question.points} 
                                      onChange={(e) => updateQuestion(qIdx, 'points', Number(e.target.value))}
                                      className="w-10 px-1 py-0.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                                    />
                                  </label>
                                  {asmQuestions.length > 1 && (
                                    <button type="button" onClick={() => removeQuestion(qIdx)} className="text-red-500 hover:text-red-650 transition-colors">
                                      <Trash size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <input 
                                type="text" 
                                placeholder="Enter question prompt..." 
                                value={question.prompt} 
                                onChange={(e) => updateQuestion(qIdx, 'prompt', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-350"
                              />

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-1.5">
                                {question.options.map((opt, oIdx) => (
                                  <div key={oIdx} className={`flex items-center gap-2 p-1.5 rounded border ${question.correct_option === oIdx ? 'border-green-500/50 bg-green-500/5' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'}`}>
                                    <input 
                                      type="radio" 
                                      name={`correct-${qIdx}`} 
                                      checked={question.correct_option === oIdx} 
                                      onChange={() => updateQuestion(qIdx, 'correct_option', oIdx)}
                                      className="accent-green-600"
                                    />
                                    <input 
                                      type="text" 
                                      placeholder={`Option ${oIdx + 1}`} 
                                      value={opt} 
                                      onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                      className="w-full text-xs bg-transparent border-none focus:ring-0 outline-none text-slate-700 dark:text-slate-355"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                          <button 
                            type="button" 
                            onClick={addQuestion}
                            className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-lg hover:bg-indigo-100/40 transition-colors"
                          >
                            <Plus size={12} /> Add Question
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors uppercase tracking-wider"
                    >
                      Publish Assessment
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
             {/* ================================================================== */}
          {/* NOTIFICATIONS / BULK EMAIL TAB */}
          {/* ================================================================== */}
          {activeTab === 'email' && (() => {
            // Apply filtering logic to get targeted list of students
            const targetedStudents = progressList.filter(prg => {
              // 1. Course Stream filter
              if (emailCourse && prg.course !== emailCourse) return false;
              
              // 2. Search query filter
              if (emailSearchQuery) {
                const q = emailSearchQuery.toLowerCase();
                const name = (prg.student_details?.name || '').toLowerCase();
                const email = (prg.student_details?.email || '').toLowerCase();
                if (!name.includes(q) && !email.includes(q)) return false;
              }
              
              // 3. Attendance filter
              if (emailAttendanceFilter) {
                const att = prg.attendance_percent || 0;
                if (emailAttendanceFilter === '<75' && att >= 75) return false;
                if (emailAttendanceFilter === '75-90' && (att < 75 || att > 90)) return false;
                if (emailAttendanceFilter === '>90' && att <= 90) return false;
              }
              
              // 4. Completion filter
              if (emailCompletionFilter) {
                const comp = prg.completion_percent || 0;
                if (emailCompletionFilter === '<50' && comp >= 50) return false;
                if (emailCompletionFilter === '50-90' && (comp < 50 || comp > 90)) return false;
                if (emailCompletionFilter === '>90' && comp <= 90) return false;
              }
              
              return true;
            });

            const handleSelectAllMatched = () => {
              const matchedIds = targetedStudents.map(prg => prg.student);
              setSelectedRecipients(prev => Array.from(new Set([...prev, ...matchedIds])));
            };

            const handleDeselectAllMatched = () => {
              const matchedIds = new Set(targetedStudents.map(prg => prg.student));
              setSelectedRecipients(prev => prev.filter(id => !matchedIds.has(id)));
            };

            const handleToggleRecipient = (studentId) => {
              if (selectedRecipients.includes(studentId)) {
                setSelectedRecipients(selectedRecipients.filter(id => id !== studentId));
              } else {
                setSelectedRecipients([...selectedRecipients, studentId]);
              }
            };

            return (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Form to Send Mail (Left 2 columns in a 5-col grid) */}
                <div className="lg:col-span-2 bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm h-fit">
                  <div className="flex items-center gap-2 mb-5">
                    <Mail className="text-indigo-500" size={18} />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Compose Announcement</h3>
                  </div>

                  <form onSubmit={handleSendEmail} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Email Subject</label>
                      <input 
                        type="text" 
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        required
                        placeholder="e.g. Schedule Update or Homework Reminder"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-350 placeholder:text-slate-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Email Body Message</label>
                      <textarea 
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        required
                        rows={7}
                        placeholder="Write your email body copy here..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-350 placeholder:text-slate-400"
                      />
                    </div>

                    <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/15 border border-indigo-100 dark:border-indigo-950/30 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Mailing Summary</span>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                        This email will be sent to {selectedRecipients.length} student{selectedRecipients.length !== 1 && 's'}.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider"
                    >
                      <Send size={12} /> Send Email
                    </button>
                  </form>
                </div>

                {/* Recipient Targeting & Filtering (Right 3 columns in a 5-col grid) */}
                <div className="lg:col-span-3 bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recipient Targeting</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Filter by progress metrics & select individual recipients.</p>
                    </div>
                    <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 rounded-full font-bold text-[10px]">
                      {selectedRecipients.length} Selected
                    </span>
                  </div>

                  {/* Filters Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Course Stream</label>
                      <select 
                        value={emailCourse}
                        onChange={(e) => setEmailCourse(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-705 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-350"
                      >
                        <option value="">-- All Streams --</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Student Search</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400 dark:text-slate-500">
                          <Search size={12} />
                        </span>
                        <input
                          type="text"
                          placeholder="Search name/email..."
                          value={emailSearchQuery}
                          onChange={(e) => setEmailSearchQuery(e.target.value)}
                          className="pl-7 pr-7 py-1.5 w-full rounded-lg border border-slate-200 dark:border-slate-705 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-350"
                        />
                        {emailSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setEmailSearchQuery('')}
                            className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600 text-[10px]"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Attendance Rate</label>
                      <select 
                        value={emailAttendanceFilter}
                        onChange={(e) => setEmailAttendanceFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-705 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-350"
                      >
                        <option value="">All Attendance Levels</option>
                        <option value="<75">Below 75% Attendance</option>
                        <option value="75-90">75% - 90% Attendance</option>
                        <option value=">90">Above 90% Attendance</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Course Progress</label>
                      <select 
                        value={emailCompletionFilter}
                        onChange={(e) => setEmailCompletionFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-705 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-350"
                      >
                        <option value="">All Completion Rates</option>
                        <option value="<50">Below 50% Completion</option>
                        <option value="50-90">50% - 90% Completion</option>
                        <option value=">90">Above 90% Completion</option>
                      </select>
                    </div>
                  </div>

                  {/* Bulk Selection Helpers */}
                  <div className="flex gap-2 mb-3 bg-slate-50 dark:bg-[#161822] p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleSelectAllMatched}
                      className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 text-[10px] font-bold rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors uppercase tracking-wider"
                    >
                      Select All Matched ({targetedStudents.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllMatched}
                      className="px-2.5 py-1 border border-slate-255 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors uppercase tracking-wider"
                    >
                      Deselect All Matched
                    </button>
                  </div>

                  {/* Recipients List grid */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto flex-1 bg-slate-50/30 dark:bg-slate-900/10">
                    {targetedStudents.length > 0 ? (
                      <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800/80 text-left">
                        <thead className="bg-slate-50 dark:bg-[#161822] text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-150 dark:border-slate-800">
                          <tr>
                            <th className="px-4 py-2 w-10">
                              <input 
                                type="checkbox"
                                checked={targetedStudents.length > 0 && targetedStudents.every(s => selectedRecipients.includes(s.student))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleSelectAllMatched();
                                  } else {
                                    handleDeselectAllMatched();
                                  }
                                }}
                                className="rounded text-indigo-650 accent-indigo-600 focus:ring-indigo-500 pointer-events-auto cursor-pointer"
                              />
                            </th>
                            <th className="px-4 py-2">Student</th>
                            <th className="px-4 py-2">Attendance</th>
                            <th className="px-4 py-2 text-right">Progress</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/40 text-xs">
                          {targetedStudents.map(prg => {
                            const isChecked = selectedRecipients.includes(prg.student);
                            return (
                              <tr 
                                key={prg.id} 
                                className={`hover:bg-slate-100/40 dark:hover:bg-slate-900/30 transition-colors ${isChecked ? 'bg-indigo-50/20 dark:bg-indigo-950/5' : ''}`}
                              >
                                <td className="px-4 py-2.5">
                                  <input 
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleRecipient(prg.student)}
                                    className="rounded text-indigo-650 accent-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                                    {prg.student_details?.name || 'Student'}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {prg.student_details?.email}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`font-bold ${
                                    (prg.attendance_percent || 0) < 75 
                                      ? 'text-red-500' 
                                      : (prg.attendance_percent || 0) < 90 
                                      ? 'text-amber-500' 
                                      : 'text-emerald-500'
                                  }`}>
                                    {prg.attendance_percent || 0}%
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold text-slate-700 dark:text-slate-300">
                                  {prg.completion_percent || 0}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                        <AlertCircle size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                        <p className="font-semibold text-xs">No students match current filters.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ================================================================== */}
          {/* CERTIFICATES TAB */}
          {/* ================================================================== */}
          {activeTab === 'certificates' && (() => {
            const filteredProgressList = progressList.filter(prg => {
              const matchesCourse = certFilterCourse ? prg.course === certFilterCourse : true;
              const matchesSearch = certSearchQuery 
                ? (prg.student_details?.name || '').toLowerCase().includes(certSearchQuery.toLowerCase()) 
                  || (prg.student_details?.email || '').toLowerCase().includes(certSearchQuery.toLowerCase())
                  || (prg.course_name || '').toLowerCase().includes(certSearchQuery.toLowerCase())
                : true;
              return matchesCourse && matchesSearch;
            });

            return (
              <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-5 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Student Certification Status</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Manual certificate triggers & bulk course-level graduation control.</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 lg:flex-initial">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400 dark:text-slate-500">
                        <Search size={14} />
                      </span>
                      <input
                        type="text"
                        placeholder="Search student..."
                        value={certSearchQuery}
                        onChange={(e) => setCertSearchQuery(e.target.value)}
                        className="pl-8 pr-8 py-2 w-full lg:w-48 rounded-lg border border-slate-200 dark:border-slate-705 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-350"
                      />
                      {certSearchQuery && (
                        <button
                          onClick={() => setCertSearchQuery('')}
                          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-650 text-xs font-bold"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <select 
                      value={certFilterCourse}
                      onChange={(e) => setCertFilterCourse(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-705 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-350"
                    >
                      <option value="">-- All Streams --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>

                    {certFilterCourse && (
                      <button
                        onClick={handleReleaseCertificates}
                        disabled={releasingCerts}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-450 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
                      >
                        {releasingCerts ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Award size={12} />
                        )}
                        Release Stream
                      </button>
                    )}
                  </div>
                </div>

                {filteredProgressList.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800/85">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-[#15171e] border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">
                          <th className="px-6 py-3">Student Name</th>
                          <th className="px-6 py-3">Course Stream</th>
                          <th className="px-6 py-3">Attendance</th>
                          <th className="px-6 py-3">Completion</th>
                          <th className="px-6 py-3">Certificate</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProgressList.map(prg => (
                          <tr key={prg.id} className="border-b border-slate-100/50 dark:border-slate-800/50 text-xs hover:bg-slate-50/80 dark:hover:bg-[#161822] transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{prg.student_details?.name || 'Student'}</td>
                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{prg.course_name}</td>
                            <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">{prg.attendance_percent}%</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-slate-650 dark:text-slate-400 w-8">{prg.completion_percent}%</span>
                                <div className="w-20 bg-slate-100 dark:bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className="bg-indigo-600 h-full rounded-full" 
                                    style={{ width: `${prg.completion_percent}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {prg.certificate_unlocked ? (
                                <a 
                                  href={prg.certificate_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                                >
                                  <Award size={12} /> View PDF
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-400 dark:text-slate-600">Locked</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleTriggerCertificate(prg.student, prg.course)}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#161822] hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded text-[9px] uppercase transition-colors"
                              >
                                Force Generate
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : progressList.length > 0 ? (
                  <div className="text-center py-20 text-slate-400 dark:text-slate-500 border border-dashed border-slate-250 dark:border-slate-800 rounded-lg">
                    <Search size={32} className="mx-auto mb-2 opacity-25 text-indigo-500" />
                    <p className="font-semibold text-xs text-slate-500">No matching records found.</p>
                    <p className="text-[11px] text-slate-405 mt-0.5">Reset search filter or select another course stream.</p>
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400 dark:text-slate-500 border border-dashed border-slate-250 dark:border-slate-800 rounded-lg">
                    <Award size={32} className="mx-auto mb-2 opacity-25 text-indigo-500" />
                    <p className="font-semibold text-xs text-slate-500">No progress records found.</p>
                  </div>
                )}
              </div>
            );
          })()}
      
      {/* ──────────────────────────────────────────────────────────── */}
      {/* NORTH STAR MANUAL GRADING MODAL                              */}
      {/* ──────────────────────────────────────────────────────────── */}
      {selectedSub && selectedAsm && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedSub(null)}
        >
          <div 
            className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
              <div>
                <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase border border-indigo-500/10">
                  {selectedAsm.questions && selectedAsm.questions.length > 0 ? 'MCQ TEST SUBMISSION' : 'FILE SUBMISSION'}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                  {selectedSub.student_details?.name || 'Student Submission'}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Email: {selectedSub.student_details?.email} | Assessment: {selectedAsm.title}
                </p>
              </div>
              <button 
                onClick={() => setSelectedSub(null)} 
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Split: Details and Grading form */}
            <div className="space-y-6">
              
              {/* Submission Date / Status Bar */}
              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3.5 flex flex-wrap justify-between items-center text-xs gap-3">
                <div>
                  <span className="font-semibold text-slate-500">Submitted:</span>{' '}
                  <span className="font-bold text-slate-700 dark:text-slate-350">
                    {new Date(selectedSub.submitted_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-555">Auto-Calculated Score:</span>{' '}
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {selectedSub.score != null ? `${selectedSub.score} / ${selectedAsm.max_score} pts` : 'Pending evaluation'}
                  </span>
                </div>
              </div>

              {/* View/Download file if it exists */}
              {selectedSub.file && (
                <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileText size={20} className="text-indigo-500" />
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Student Submission File</h5>
                      <p className="text-[10px] text-slate-400">File uploaded by student for manual grading.</p>
                    </div>
                  </div>
                  <a 
                    href={selectedSub.file}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] uppercase shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <UploadCloud size={12} /> View / Download File
                  </a>
                </div>
              )}

              {/* MCQ Question and Student Choices Review */}
              {selectedAsm.questions && selectedAsm.questions.length > 0 && selectedSub.answers_data && (
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    Questions & Answers Review
                  </h4>
                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                    {selectedSub.answers_data.map((ans, idx) => {
                      const userSelected = ans.selected_option;
                      const correctOption = ans.correct_option;
                      const isCorrect = ans.is_correct;
                      const pointsEarned = ans.awarded_points;
                      const promptText = ans.prompt;

                      // Retrieve options from selectedAsm questions
                      const originalQ = selectedAsm.questions.find(q => String(q.id) === String(ans.question_id));
                      const options = originalQ ? originalQ.options : [];

                      return (
                        <div 
                          key={ans.question_id || idx}
                          className="bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <h5 className="text-xs font-bold text-slate-800 dark:text-white leading-relaxed">
                              {idx + 1}. {promptText}
                            </h5>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isCorrect ? (
                                <span className="text-[9px] font-extrabold bg-emerald-500/10 text-emerald-650 dark:text-emerald-450 border border-emerald-500/20 px-2 py-0.5 rounded">
                                  Correct
                                </span>
                              ) : userSelected === null || userSelected === undefined ? (
                                <span className="text-[9px] font-extrabold bg-rose-500/10 text-rose-650 dark:text-rose-450 border border-rose-500/20 px-2 py-0.5 rounded">
                                  Unanswered
                                </span>
                              ) : (
                                <span className="text-[9px] font-extrabold bg-rose-500/10 text-rose-650 dark:text-rose-455 border border-rose-500/20 px-2 py-0.5 rounded">
                                  Incorrect
                                </span>
                              )}
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded">
                                {pointsEarned} pt(s)
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                            {options.map((opt, oIdx) => {
                              const isSelectedByStudent = userSelected === oIdx;
                              const isCorrectOption = correctOption === oIdx;
                              const optionLetter = String.fromCharCode(65 + oIdx);

                              let cardStyle = "border-slate-150 dark:border-slate-850 bg-white dark:bg-[#12131a]";
                              let pillStyle = "bg-slate-100 dark:bg-slate-850 text-slate-550";

                              if (isSelectedByStudent && isCorrectOption) {
                                cardStyle = "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/10";
                                pillStyle = "bg-emerald-500 text-white";
                              } else if (isSelectedByStudent && !isCorrectOption) {
                                cardStyle = "border-rose-500 bg-rose-500/5 dark:bg-rose-950/10";
                                pillStyle = "bg-rose-500 text-white";
                              } else if (isCorrectOption) {
                                cardStyle = "border-emerald-500/60 dark:border-emerald-500/30 bg-emerald-500/2 dark:bg-emerald-950/5 border-dashed";
                                pillStyle = "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400";
                              }

                              return (
                                <div key={oIdx} className={`p-2.5 rounded-lg border flex items-center justify-between text-[11px] ${cardStyle}`}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-5 h-5 rounded font-bold text-[9px] flex items-center justify-center ${pillStyle}`}>
                                      {optionLetter}
                                    </div>
                                    <span className="font-semibold text-slate-650 dark:text-slate-350">{opt}</span>
                                  </div>
                                  {isSelectedByStudent && (
                                    <span className="text-[8px] font-black uppercase text-indigo-500">Choice</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grading Input Fields */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Evaluate Submission
                </h4>

                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (editScore === '') {
                      toast.error('Please enter a grade score.');
                      return;
                    }
                    const numScore = Number(editScore);
                    if (isNaN(numScore) || numScore < 0 || numScore > selectedAsm.max_score) {
                      toast.error(`Score must be a number between 0 and ${selectedAsm.max_score}`);
                      return;
                    }
                    setSubmittingGrade(true);
                    try {
                      await northStarAPI.gradeSubmission(selectedSub.id, {
                        score: numScore,
                        feedback: editFeedback
                      });
                      toast.success('Grade submitted successfully!');
                      setSelectedSub(null);
                      fetchAdminData(true);
                    } catch (err) {
                      console.error(err);
                      toast.error('Failed to save grade.');
                    } finally {
                      setSubmittingGrade(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Award Score (Max: {selectedAsm.max_score} pts)
                      </label>
                      <input 
                        type="number"
                        min="0"
                        max={selectedAsm.max_score}
                        value={editScore}
                        onChange={(e) => setEditScore(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-350"
                        placeholder={`0 - ${selectedAsm.max_score}`}
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Evaluation Status
                      </label>
                      <input 
                        type="text"
                        disabled
                        value={selectedSub.status === 'graded' ? 'Graded & Evaluated' : 'Awaiting Grading'}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-100 dark:bg-slate-900 outline-none text-xs text-slate-500 dark:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Feedback / Remarks
                    </label>
                    <textarea 
                      value={editFeedback}
                      onChange={(e) => setEditFeedback(e.target.value)}
                      rows={3}
                      placeholder="Write feedback, improvement areas, or general remarks for the student..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-350 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSub(null)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingGrade}
                      className="px-6 py-2 bg-indigo-650 hover:bg-indigo-700 disabled:bg-indigo-550 text-white font-bold rounded-lg text-xs transition-colors uppercase tracking-wider flex items-center gap-2"
                    >
                      {submittingGrade && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      Save Evaluation & Grade
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}
        </>
      )}
      </div>{/* end p-6 content wrapper */}
    </div>
  );
}
