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
    const interval = setInterval(() => {
      fetchAdminData(true);
    }, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAdminData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const statsRes = await northStarAPI.getAdminDashboard();
      setStats(statsRes.data);

      const results = await Promise.allSettled([
        northStarAPI.getCourses(),
        northStarAPI.getClasses(),
        northStarAPI.getReconciliation(),
        northStarAPI.getProgress(),
        northStarAPI.getSubmissions()
      ]);

      if (results[0].status === 'fulfilled') {
        const coursesData = results[0].value.data;
        setCourses(coursesData);
        if (coursesData.length > 0) {
          setClassCourse(coursesData[0].id);
          setSelectedCourses([coursesData[0].id]);
          setAsmCourse(coursesData[0].id);
        }
      }
      if (results[1].status === 'fulfilled') {
        setClasses(results[1].value.data);
      }
      if (results[2].status === 'fulfilled') {
        setReconciliationQueue(results[2].value.data);
      }
      if (results[3].status === 'fulfilled') {
        setProgressList(results[3].value.data);
      }
      if (results[4].status === 'fulfilled') {
        setSubmissions(results[4].value.data);
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form to Post Homework */}
              <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
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
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-700 dark:text-slate-350"
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
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">MCQ Questions</h4>
                    
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
                                className="w-full text-xs bg-transparent border-none focus:ring-0 outline-none text-slate-700 dark:text-slate-350"
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
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors uppercase tracking-wider"
                  >
                    Publish Assessment
                  </button>
                </form>
              </div>

              {/* List of Submissions & Grading Drawer */}
              <div className="lg:col-span-2 bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-5">Submissions Grading Queue</h3>

                {submissions.length > 0 ? (
                  <div className="space-y-3 overflow-y-auto pr-1 max-h-[500px]">
                    {submissions.map(sub => (
                      <div 
                        key={sub.id}
                        className="relative flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50/50 dark:bg-[#161822] border border-slate-150 dark:border-slate-800/80 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                      >
                        {sub.status !== 'graded' && (
                          <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-500 rounded-r-full" />
                        )}

                        <div className="space-y-1 relative z-10 pl-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider">{sub.assignment_title}</span>
                          <h4 className="text-sm font-semibold text-slate-800 dark:text-white">{sub.student_details?.name || 'Student'}</h4>
                          <p className="text-xs text-slate-400 dark:text-slate-500">Submitted: {new Date(sub.submitted_at).toLocaleString()}</p>
                          
                          {sub.file && (
                            <a 
                              href={sub.file} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400 font-bold hover:underline mt-1.5"
                            >
                              <FileText size={12} /> View Submission File
                            </a>
                          )}
                        </div>

                        <div className="mt-3 md:mt-0 relative z-10">
                          {sub.status === 'graded' ? (
                            <div className="text-right">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 uppercase">
                                Graded: {sub.score} pts
                              </span>
                              {sub.feedback && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic max-w-xs">"{sub.feedback}"</p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/10 uppercase">
                              Submitted
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex-1 flex flex-col items-center justify-center">
                    <BookOpen size={36} className="opacity-25 mb-2" />
                    <p className="font-semibold text-xs text-slate-500">No student homework submissions logged yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
             {/* ================================================================== */}
          {/* NOTIFICATIONS / BULK EMAIL TAB */}
          {/* ================================================================== */}
          {activeTab === 'email' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form to Send Mail */}
              <div className="lg:col-span-2 bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <Mail className="text-indigo-500" size={18} />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Send Bulk Announcement Email</h3>
                </div>

                <form onSubmit={handleSendEmail} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Filter Target Course Group</label>
                    <select 
                      value={emailCourse}
                      onChange={(e) => setEmailCourse(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-700 dark:text-slate-355"
                    >
                      <option value="">-- All Enrolled Students --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

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
                      rows={5}
                      placeholder="Write your email body copy here..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-350 placeholder:text-slate-400"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider"
                  >
                    <Send size={12} /> Send Email
                  </button>
                </form>
              </div>

              {/* Instructions Box */}
              <div className="bg-slate-50 dark:bg-[#12131a] border border-slate-250 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Announcement Guidelines</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">
                    Announcements sent via this console are dispatched asynchronously via background worker queue.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">
                    Select a target Course Group to message only students belonging to a particular syllabus stream, or leave it blank to message the entire active student roster.
                  </p>
                </div>
                
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 mt-4 flex items-center gap-2">
                  <AlertCircle size={14} className="text-indigo-500" />
                  <span>Dispatched via secure background mailing task.</span>
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
        </>
      )}
      </div>{/* end p-6 content wrapper */}
    </div>
  );
}
