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
  Square
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

  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailCourse, setEmailCourse] = useState('');



  
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterCourse, setFilterCourse] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [certFilterCourse, setCertFilterCourse] = useState('');
  const [certSearchQuery, setCertSearchQuery] = useState('');
  const [releasingCerts, setReleasingCerts] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const statsRes = await northStarAPI.getAdminDashboard();
      setStats(statsRes.data);

      const [coursesRes, classesRes, reconciliationRes, progressRes, submissionsRes] = await Promise.all([
        northStarAPI.getCourses(),
        northStarAPI.getClasses(),
        northStarAPI.getReconciliation(),
        northStarAPI.getProgress(),
        northStarAPI.getSubmissions()
      ]);

      setCourses(coursesRes.data);
      setClasses(classesRes.data);
      setReconciliationQueue(reconciliationRes.data);
      setProgressList(progressRes.data);
      setSubmissions(submissionsRes.data);

      if (coursesRes.data.length > 0) {
        setClassCourse(coursesRes.data[0].id);
        setSelectedCourses([coursesRes.data[0].id]);
        setAsmCourse(coursesRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load coordinator data.');
    } finally {
      setLoading(false);
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
      fetchAdminData();
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

    try {
      await northStarAPI.sendBulkEmail({
        subject: emailSubject,
        body: emailBody,
        course_id: emailCourse || null
      });
      toast.success('Bulk emails successfully queued!');
      setEmailSubject('');
      setEmailBody('');
      setEmailCourse('');
    } catch (err) {
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



  const TAB_ICONS = {
    dashboard:   '⬡',
    classes:     '📅',
    attendance:  '✅',
    assignments: '📝',
    email:       '📨',
    certificates:'🏅',
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0c14] text-slate-800 dark:text-slate-100 transition-colors duration-500">

      {/* ─── HERO HEADER ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a1060 40%, #0d1b4b 70%, #0a0c1e 100%)'
      }}>
        {/* Mesh grid overlay */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        {/* Glowing orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />
        <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full opacity-10 animate-pulse"
          style={{ background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)', animationDuration: '7s' }} />

        {/* Content */}
        <div className="relative z-10 px-8 pt-8 pb-0">
          {/* Top row: badge + user */}
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-indigo-300"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', backdropFilter: 'blur(12px)' }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" style={{ animationDuration: '2s' }} />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400" />
              </span>
              ★ North Star Coordinator Console
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-indigo-300/60 font-medium">Signed in as</p>
                <p className="text-sm font-bold text-white">{user?.first_name} {user?.last_name}</p>
              </div>
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
            </div>
          </div>

          {/* Title + description */}
          <div className="max-w-2xl mb-8">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-3 leading-tight">
              LMS{' '}
              <span style={{ background: 'linear-gradient(90deg, #a5b4fc, #818cf8, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Management
              </span>{' '}
              Board
            </h1>
            <p className="text-indigo-200/55 text-sm leading-relaxed">
              Organize classes, track automated Zoom attendance records, grade homework, and issue student certificates.
            </p>
          </div>

          {/* Navigation tabs — premium pill strip */}
          <div
            className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide mt-2 px-1 py-1.5 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {[
              { id: 'dashboard',    label: 'Overview',       icon: '⬡',  color: '#818cf8' },
              { id: 'classes',      label: 'Schedule',        icon: '📅', color: '#34d399' },
              { id: 'attendance',   label: 'Attendance',      icon: '✅', color: '#38bdf8' },
              { id: 'assignments',  label: 'Grading Hub',     icon: '📝', color: '#f472b6' },
              { id: 'email',        label: 'Notifications',   icon: '📨', color: '#fb923c' },
              { id: 'certificates', label: 'Certificates',    icon: '🏅', color: '#fbbf24' },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={isActive ? {
                    background: `linear-gradient(135deg, ${tab.color}22, ${tab.color}11)`,
                    border: `1px solid ${tab.color}55`,
                    color: '#fff',
                    boxShadow: `0 0 16px ${tab.color}33, inset 0 1px 0 rgba(255,255,255,0.1)`,
                  } : {
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: 'rgba(199,210,254,0.45)',
                  }}
                  className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 hover:scale-[1.04] hover:text-white group"
                >
                  {/* Active indicator dot */}
                  {isActive && (
                    <span
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ background: tab.color, boxShadow: `0 0 6px ${tab.color}` }}
                    />
                  )}
                  <span
                    className="text-sm leading-none transition-transform duration-300 group-hover:scale-110"
                    style={isActive ? { filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.4))' } : {}}
                  >
                    {tab.icon}
                  </span>
                  <span className="hidden sm:inline tracking-wide">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* thin accent line under header */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4, transparent)' }} />

      <div className="p-6">

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
            <div className="space-y-8 animate-fadeIn">
              {/* Top stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Enrolled Students Card */}
                <div className="group relative overflow-hidden bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between">
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">Enrolled Students</span>
                    <h3 className="text-4xl font-black mt-1.5 text-slate-900 dark:text-white tracking-tight">{stats.total_enrolled_students}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      Active portal accounts
                    </p>
                  </div>
                  <div className="relative z-10 p-4 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-md">
                    <Users size={28} />
                  </div>
                </div>

                {/* Active Courses Card */}
                <div className="group relative overflow-hidden bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between">
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">Active Courses</span>
                    <h3 className="text-4xl font-black mt-1.5 text-slate-900 dark:text-white tracking-tight">{courses.length}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Registered class channels
                    </p>
                  </div>
                  <div className="relative z-10 p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-md">
                    <BookOpen size={28} />
                  </div>
                </div>

                {/* Classes Logged Card */}
                <div className="group relative overflow-hidden bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between">
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">Classes Logged</span>
                    <h3 className="text-4xl font-black mt-1.5 text-slate-900 dark:text-white tracking-tight">{classes.length}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      Held class sessions
                    </p>
                  </div>
                  <div className="relative z-10 p-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-md">
                    <Calendar size={28} />
                  </div>
                </div>
              </div>

              {/* Course Performance Board */}
              <div className="grid grid-cols-1 gap-8">
                <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                    <Award className="text-indigo-500 animate-bounce" size={22} /> Active Course Stream Stats
                  </h3>

                  <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/80">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                          <th className="p-4">Course Name</th>
                          <th className="p-4">Enrollments</th>
                          <th className="p-4">Avg Attendance</th>
                          <th className="p-4">Avg Completion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.course_stats.map(c => (
                          <tr key={c.course_id} className="border-b border-slate-100/50 dark:border-slate-800/50 text-sm hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{c.course_name}</td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">{c.enrollments} students</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold ${
                                c.avg_attendance >= 75 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${c.avg_attendance >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                {c.avg_attendance}%
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-28 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full" 
                                    style={{ width: `${c.avg_completion}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{c.avg_completion}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* SCHEDULE CLASS TAB */}
          {/* ================================================================== */}
          {activeTab === 'classes' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
              {/* Form to Schedule */}
              <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                  <Calendar className="text-indigo-500" size={22} /> Schedule Class
                </h3>

                <form onSubmit={handleScheduleClass} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Target Course Streams (Select Multiple)</label>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 shadow-inner">
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
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                              isSelected 
                                ? 'bg-indigo-600 text-white shadow-sm scale-[1.02]' 
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Class Topic / Title</label>
                    <input 
                      type="text" 
                      value={classTitle}
                      onChange={(e) => setClassTitle(e.target.value)}
                      placeholder="e.g. Intro to Digital Campaigns"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Start Datetime</label>
                      <input 
                        type="datetime-local" 
                        value={classStart}
                        onChange={(e) => setClassStart(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm text-slate-700 dark:text-slate-300"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">End Datetime</label>
                      <input 
                        type="datetime-local" 
                        value={classEnd}
                        onChange={(e) => setClassEnd(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm text-slate-700 dark:text-slate-300"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:scale-[1.01] transition-all duration-300 uppercase tracking-wider"
                  >
                    Generate Zoom Meeting & Schedule
                  </button>
                </form>
              </div>

              {/* Class list and Start Buttons */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex flex-col">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                  <Play className="text-emerald-500 animate-pulse" size={22} fill="currentColor" /> Start Hosted Class Sessions
                </h3>

                {classes.length > 0 ? (
                  <div className="space-y-4 overflow-y-auto pr-1 max-h-[500px]">
                    {classes.map(cls => {
                      return (
                        <div 
                          key={cls.id}
                          className="group relative flex flex-col md:flex-row md:items-center justify-between p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-indigo-500/30 hover:shadow-md transition-all duration-300"
                        >
                          {/* Accent left highlight bar */}
                          <div className="absolute left-0 top-4 bottom-4 w-1 bg-indigo-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          <div className="space-y-1.5 relative z-10 pl-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{cls.course_name}</span>
                            <h4 className="text-base font-bold text-slate-800 dark:text-white">{cls.title}</h4>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock size={14} className="text-slate-400" /> {new Date(cls.start_time).toLocaleDateString()} at {new Date(cls.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span>• Zoom ID: {cls.zoom_meeting_id}</span>
                            </div>
                          </div>

                           <div className="mt-4 md:mt-0 flex items-center gap-2">
                             {cls.zoom_start_url ? (
                               <a
                                 href={cls.zoom_start_url}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="relative z-10 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:scale-[1.03] transition-all duration-300 uppercase tracking-wider text-center"
                               >
                                 <Play size={12} fill="currentColor" /> Start Class (Host)
                               </a>
                             ) : (
                               <span className="relative z-10 px-5 py-2.5 bg-slate-100 text-slate-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200">
                                 No Zoom Link
                               </span>
                             )}
                             <button
                               onClick={() => handleEndClass(cls.id)}
                               className="relative z-10 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/35 hover:scale-[1.03] transition-all duration-300 uppercase tracking-wider"
                             >
                               <Square size={10} fill="currentColor" /> End Class
                             </button>
                           </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex-1 flex flex-col items-center justify-center">
                    <Calendar size={48} className="opacity-30 mb-2" />
                    <p className="font-semibold text-slate-500">No class channels created yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Use the scheduler form to launch a Zoom channel.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* ATTENDANCE GRID TAB */}
          {/* ================================================================== */}
          {activeTab === 'attendance' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Student Attendance Records</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select class to view or override attendance list</p>
                  </div>

                  {/* Filters */}
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                      <Filter size={16} className="text-indigo-500" />
                      <select 
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        className="bg-transparent border-none text-sm outline-none font-bold text-slate-700 dark:text-slate-300"
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
                    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                            <th className="p-4">Student Name</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Duration</th>
                            <th className="p-4">Tracking</th>
                            <th className="p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.map(att => (
                            <tr key={att.id} className="border-b border-slate-100/50 dark:border-slate-800/50 text-sm hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors">
                              <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{att.student_details?.name || 'Student'}</td>
                              <td className="p-4 text-slate-500 dark:text-slate-400">{att.student_details?.email}</td>
                              <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{att.total_duration_minutes} mins</td>
                              <td className="p-4">
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                                  att.marked_via === 'manual' 
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                }`}>
                                  {att.marked_via === 'manual' ? 'Manual' : 'Zoom Auto'}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-extrabold uppercase ${
                                  att.status === 'present' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                                  att.status === 'late' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                                  att.status === 'excused' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' :
                                  'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
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
                    <div className="text-center py-12 text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      No attendance reports generated for this class yet. Zoom webhook finalizing runs 15 mins after class end.
                    </div>
                  )
                ) : (
                  <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Filter size={40} className="mx-auto mb-3 opacity-30 text-indigo-500" />
                    <p className="font-semibold text-slate-500">Select a class from the dropdown filter to view logs.</p>
                  </div>
                )}
              </div>

              {/* Reconciliation Panel */}
              <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Zoom Unmatched Participant Queue</h3>
                <p className="text-xs text-slate-505 dark:text-slate-400 mb-6">Logs of participants who joined via Zoom but couldn't be auto-mapped to a database student account.</p>

                {reconciliationQueue.length > 0 ? (
                  <div className="space-y-4">
                    {reconciliationQueue.map(ev => (
                      <div key={ev.id} className="group relative flex flex-col md:flex-row md:items-center justify-between p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-indigo-500/20 transition-all duration-300">
                        {/* Status bar */}
                        <div className="absolute left-0 top-4 bottom-4 w-1 bg-amber-500 rounded-r-full" />
                        
                        <div className="space-y-1 pl-2">
                          <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">{ev.participant_name}</h5>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{ev.participant_email}</p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-505 block mt-1">Class: {ev.scheduled_class?.title || 'Unknown'} at {new Date(ev.timestamp).toLocaleTimeString()}</span>
                        </div>

                        <button
                          onClick={() => {
                            toast('Manual matching feature: search user by email to link this event.', { icon: 'ℹ️' });
                          }}
                          className="mt-4 md:mt-0 px-4 py-2 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white font-bold rounded-xl text-xs transition-all duration-300"
                        >
                          Resolve & Match Student
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <CheckCircle size={36} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                    <p className="font-semibold text-slate-500">Reconciliation queue is empty. Clean sync!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* GRADING HUB TAB */}
          {/* ================================================================== */}
          {activeTab === 'assignments' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
              {/* Form to Post Homework */}
              <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                  <BookOpen className="text-indigo-500" size={22} /> Post Assignment
                </h3>

                <form onSubmit={handlePostAssignment} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Course Stream</label>
                    <select 
                      value={asmCourse}
                      onChange={(e) => setAsmCourse(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm text-slate-700 dark:text-slate-300"
                    >
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assignment Title</label>
                    <input 
                      type="text" 
                      value={asmTitle}
                      onChange={(e) => setAsmTitle(e.target.value)}
                      placeholder="e.g. SEO Optimization Audit"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Instructions / Description</label>
                    <textarea 
                      value={asmDesc}
                      onChange={(e) => setAsmDesc(e.target.value)}
                      rows={2}
                      placeholder="Write instructions or rules here..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Due Date</label>
                      <input 
                        type="datetime-local" 
                        value={asmDue}
                        onChange={(e) => setAsmDue(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm text-slate-700 dark:text-slate-300"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Duration Limit (Min)</label>
                      <input 
                        type="number" 
                        min="1"
                        value={asmDuration}
                        onChange={(e) => setAsmDuration(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm text-slate-700 dark:text-slate-300"
                      />
                    </div>
                  </div>

                  {/* MCQ Builder */}
                  <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">MCQ Questions</h4>
                    
                    {asmQuestions.map((question, qIdx) => (
                      <div key={qIdx} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 relative">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Question {qIdx + 1}</span>
                          <div className="flex items-center gap-3">
                            <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 uppercase">
                              Points
                              <input 
                                type="number" 
                                min="1" 
                                value={question.points} 
                                onChange={(e) => updateQuestion(qIdx, 'points', Number(e.target.value))}
                                className="w-14 px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                              />
                            </label>
                            {asmQuestions.length > 1 && (
                              <button type="button" onClick={() => removeQuestion(qIdx)} className="text-red-500 hover:text-red-600 transition-colors">
                                <Trash size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        <input 
                          type="text" 
                          placeholder="Enter question prompt..." 
                          value={question.prompt} 
                          onChange={(e) => updateQuestion(qIdx, 'prompt', e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-indigo-500 outline-none text-slate-700 dark:text-slate-300"
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          {question.options.map((opt, oIdx) => (
                            <div key={oIdx} className={`flex items-center gap-2 p-2 rounded-lg border ${question.correct_option === oIdx ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950'}`}>
                              <input 
                                type="radio" 
                                name={`correct-${qIdx}`} 
                                checked={question.correct_option === oIdx} 
                                onChange={() => updateQuestion(qIdx, 'correct_option', oIdx)}
                                className="accent-green-500"
                              />
                              <input 
                                type="text" 
                                placeholder={`Option ${oIdx + 1}`} 
                                value={opt} 
                                onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                className="w-full text-xs bg-transparent border-none focus:ring-0 outline-none text-slate-700 dark:text-slate-300"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <button 
                      type="button" 
                      onClick={addQuestion}
                      className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                    >
                      <Plus size={14} /> Add Another Question
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all duration-300 uppercase tracking-wider"
                  >
                    Publish MCQ Assessment
                  </button>
                </form>
              </div>

              {/* List of Submissions & Grading Drawer */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Submissions Grading Queue</h3>

                {submissions.length > 0 ? (
                  <div className="space-y-4 overflow-y-auto pr-1 max-h-[500px]">
                    {submissions.map(sub => (
                      <div 
                        key={sub.id}
                        className="group relative flex flex-col md:flex-row md:items-center justify-between p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-indigo-500/20 hover:shadow-md transition-all duration-300"
                      >
                        {/* Accent left highlight bar for ungraded */}
                        {sub.status !== 'graded' && (
                          <div className="absolute left-0 top-4 bottom-4 w-1 bg-indigo-500 rounded-r-full" />
                        )}

                        <div className="space-y-1.5 relative z-10 pl-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{sub.assignment_title}</span>
                          <h4 className="text-base font-bold text-slate-800 dark:text-white">{sub.student_details?.name || 'Student'}</h4>
                          <p className="text-xs text-slate-400 dark:text-slate-550">Submitted: {new Date(sub.submitted_at).toLocaleString()}</p>
                          
                          {sub.file && (
                            <a 
                              href={sub.file} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-indigo-500 dark:text-indigo-400 font-bold hover:underline mt-2"
                            >
                              <FileText size={14} /> View Submission File
                            </a>
                          )}
                        </div>

                        <div className="mt-4 md:mt-0 relative z-10">
                          {sub.status === 'graded' ? (
                            <div className="text-right">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                                Graded: {sub.score} pts
                              </span>
                              {sub.feedback && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 italic max-w-xs">"{sub.feedback}"</p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
                              Submitted
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex-1 flex flex-col items-center justify-center">
                    <BookOpen size={48} className="opacity-30 mb-2" />
                    <p className="font-semibold text-slate-500">No student homework submissions logged yet.</p>
                  </div>
                  )}
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* NOTIFICATIONS / BULK EMAIL TAB */}
          {/* ================================================================== */}
          {activeTab === 'email' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
              {/* Form to Send Mail */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                  <Mail className="text-indigo-500" size={22} /> Send Bulk Announcement Email
                </h3>

                <form onSubmit={handleSendEmail} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Filter Target Course Group</label>
                    <select 
                      value={emailCourse}
                      onChange={(e) => setEmailCourse(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm text-slate-700 dark:text-slate-300"
                    >
                      <option value="">-- All Enrolled Students --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Email Subject</label>
                    <input 
                      type="text" 
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      required
                      placeholder="e.g. Schedule Update or Homework Reminder"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Email Body Message</label>
                    <textarea 
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      required
                      rows={6}
                      placeholder="Write your email body copy here..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    <Send size={14} /> Dispatch Announcement Email
                  </button>
                </form>
              </div>

              {/* Instructions Box */}
              <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
                {/* Decorative background circle */}
                <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-indigo-500/5 blur-2xl" />
                
                <div className="space-y-4 relative z-10">
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Bulk Announcement Guidelines</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Announcements sent via this console are dispatched asynchronously via the Celery background worker queue.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    You can select a target Course Group to message only students belonging to a particular syllabus stream, or leave it blank to message the entire active student roster.
                  </p>
                </div>
                
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 mt-6 flex items-center gap-2 relative z-10">
                  <AlertCircle size={16} className="text-indigo-500 animate-pulse" />
                  <span>Powered by existing secure email services.</span>
                </div>
              </div>
            </div>
          )}

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
              <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md animate-fadeIn">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Student Certification Status</h3>
                    <p className="text-xs text-slate-400 mt-1">Manual certificate triggers & bulk course-level graduation control.</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:flex-initial">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 dark:text-slate-500">
                        <Search size={16} />
                      </span>
                      <input
                        type="text"
                        placeholder="Search student or course..."
                        value={certSearchQuery}
                        onChange={(e) => setCertSearchQuery(e.target.value)}
                        className="pl-9 pr-8 py-2.5 w-full lg:w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500"
                      />
                      {certSearchQuery && (
                        <button
                          onClick={() => setCertSearchQuery('')}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <select 
                      value={certFilterCourse}
                      onChange={(e) => setCertFilterCourse(e.target.value)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs text-slate-700 dark:text-slate-300"
                    >
                      <option value="">-- All Course Streams --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>

                    {certFilterCourse && (
                      <button
                        onClick={handleReleaseCertificates}
                        disabled={releasingCerts}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition-all duration-200 flex items-center gap-2"
                      >
                        {releasingCerts ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Award size={14} />
                        )}
                        Release Certificates
                      </button>
                    )}
                  </div>
                </div>

                {filteredProgressList.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/80">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                          <th className="p-4">Student Name</th>
                          <th className="p-4">Course Stream</th>
                          <th className="p-4">Attendance</th>
                          <th className="p-4">Completion</th>
                          <th className="p-4">Certificate</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProgressList.map(prg => (
                          <tr key={prg.id} className="border-b border-slate-100/50 dark:border-slate-800/50 text-sm hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{prg.student_details?.name || 'Student'}</td>
                            <td className="p-4 text-slate-500 dark:text-slate-400">{prg.course_name}</td>
                            <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{prg.attendance_percent}%</td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-24 bg-slate-100 dark:bg-slate-950 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="bg-indigo-500 h-full rounded-full" 
                                    style={{ width: `${prg.completion_percent}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{prg.completion_percent}%</span>
                              </div>
                            </td>
                            <td className="p-4">
                              {prg.certificate_unlocked ? (
                                <a 
                                  href={prg.certificate_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-emerald-500 dark:text-emerald-400 font-bold hover:underline"
                                >
                                  <Award size={14} /> View PDF
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-600">Locked</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleTriggerCertificate(prg.student, prg.course)}
                                className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white border border-indigo-100 dark:border-indigo-900/50 font-bold rounded-xl text-[10px] uppercase transition-all duration-200"
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
                  <div className="text-center py-20 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Search size={48} className="mx-auto mb-3 opacity-30 text-indigo-500" />
                    <p className="font-semibold text-slate-500">No matching records found.</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting your search query or changing the course stream.</p>
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Award size={48} className="mx-auto mb-3 opacity-30 text-indigo-500 animate-pulse" />
                    <p className="font-semibold text-slate-500">No student progress records detected.</p>
                    <p className="text-xs text-slate-400 mt-1">Students must participate in classes to initialize progress tracking.</p>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}
      </div>{/* end p-6 content wrapper */}
    </div>
  );
}
