import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  Award, 
  BookOpen, 
  UploadCloud, 
  ChevronRight, 
  Lock, 
  Unlock, 
  Play,
  FileText,
  AlertCircle,
  BarChart3,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../../store/authStore';
import northStarAPI from '../../../api/northStarAPI';

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 24
    }
  }
};


function ProgressRing({ radius, stroke, progress, max = 100, label, color = "#3b82f6" }) {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / max) * circumference;

  return (
    <div className="progress-ring-container flex items-center justify-center relative">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle
          stroke="rgba(226, 232, 240, 0.15)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          stroke={color}
          fill="transparent"
          strokeDasharray={circumference + ' ' + circumference}
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          strokeLinecap="round"
          className="ns-progress-glow"
          style={{ '--accent-color': color }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold text-slate-800 dark:text-white">{progress}%</span>
        <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [classFilter, setClassFilter] = useState('all');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submitFile, setSubmitFile] = useState(null);
  const [mcqAnswers, setMcqAnswers] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  // Drag and drop ref
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Generate random stars for the background
    const generatedStars = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 3 + 1}px`,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 4 + 3}s`
    }));
    setStars(generatedStars);
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSubmitFile(e.dataTransfer.files[0]);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await northStarAPI.getStudentDashboard();
      setDashboardData(res.data);
      
      // Also fetch classes, assignments, submissions, and attendance history in background
      const [classesRes, assignmentsRes, submissionsRes, attendanceRes] = await Promise.all([
        northStarAPI.getClasses(),
        northStarAPI.getAssignments(),
        northStarAPI.mySubmissions(),
        northStarAPI.getAttendanceMe()
      ]);
      
      setClasses(classesRes.data);
      setAssignments(assignmentsRes.data);
      setSubmissions(submissionsRes.data);
      setAttendanceRecords(attendanceRes.data.records || []);
    } catch (err) {
      console.error(err);
      if (!silent) toast.error('Failed to load dashboard data.');
    } finally {
      if (!silent) setLoading(false);
    }
  };



  const handleAssignmentSelect = (assignment) => {
    setSelectedAssignment(assignment);
    const existing = submissions.find(s => s.assignment === assignment.id);
    setSubmitFile(null);
    setMcqAnswers([]);
  };

  const handleOptionSelect = (questionId, optionIndex) => {
    const existingAns = mcqAnswers.find(a => a.question_id === questionId);
    if (existingAns) {
      setMcqAnswers(mcqAnswers.map(a => a.question_id === questionId ? { ...a, selected_option: optionIndex } : a));
    } else {
      setMcqAnswers([...mcqAnswers, { question_id: questionId, selected_option: optionIndex }]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSubmitFile(e.target.files[0]);
    }
  };

  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    const hasQuestions = selectedAssignment?.questions?.length > 0;
    
    if (!hasQuestions && !submitFile) {
      toast.error('Please select a file to upload.');
      return;
    }
    
    if (hasQuestions && mcqAnswers.length !== selectedAssignment.questions.length) {
      toast.error('Please answer all questions before submitting.');
      return;
    }

    setUploading(true);
    let payload;
    
    if (hasQuestions) {
      payload = {
        assignment: selectedAssignment.id,
        answers_data: mcqAnswers
      };
    } else {
      payload = new FormData();
      payload.append('assignment', selectedAssignment.id);
      payload.append('file', submitFile);
    }

    try {
      await northStarAPI.submitAssignment(payload);
      toast.success('Assignment submitted successfully!');
      
      // Refresh submissions and dashboard data
      const [submissionsRes, dashRes] = await Promise.all([
        northStarAPI.mySubmissions(),
        northStarAPI.getStudentDashboard()
      ]);
      setSubmissions(submissionsRes.data);
      setDashboardData(dashRes.data);
      setSelectedAssignment(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit assignment.');
    } finally {
      setUploading(false);
    }
  };
  const getSubmissionForAssignment = (assignmentId) => {
    return submissions.find(s => s.assignment === assignmentId);
  };




  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-6">
      {/* Starry Hero Welcome Header */}
      <div className="relative overflow-hidden northstar-starry-hero rounded-3xl p-8 shadow-xl mb-8">
        <div className="starfield">
          {stars.map(star => (
            <div 
              key={star.id} 
              className="star" 
              style={{
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                animationDelay: star.delay,
                animationDuration: star.duration
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 border border-amber-500/30">
              ★ Project North Star LMS
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Welcome back, {user.name || user.login_id}!
            </h1>
            <p className="text-slate-300 max-w-xl text-sm leading-relaxed">
              Your personalized Learning Management Portal. Track live lectures, access materials, complete tasks, and build your profile towards placement readiness.
            </p>
          </div>
          
          {/* Tab Switcher with Framer Motion Underline */}
          <div className="flex bg-slate-950/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 self-start relative">
            {['dashboard', 'classes', 'assignments', 'progress'].map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedAssignment(null); }}
                className={`relative px-5 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all duration-300 z-10 ${
                  activeTab === tab 
                    ? 'text-indigo-400 font-bold' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {activeTab === tab && (
                  <motion.span 
                    layoutId="activeTabUnderline" 
                    className="absolute inset-0 bg-white/10 rounded-xl border border-white/20 z-[-1]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Loading North Star...</p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* ================================================================== */}
          {/* DASHBOARD TAB */}
          {/* ================================================================== */}
          {activeTab === 'dashboard' && dashboardData && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Attendance Rate */}
                <div className="ns-glass-card rounded-3xl p-6 shadow-md flex items-center justify-between">
                  <div className="space-y-2">
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider block">Attendance Rate</span>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white">{dashboardData.attendance_percent}%</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Minimum threshold: 75%</p>
                  </div>
                  <ProgressRing 
                    radius={40} 
                    stroke={5} 
                    progress={dashboardData.attendance_percent} 
                    label="att" 
                    color={dashboardData.attendance_percent >= 75 ? "#10b981" : "#f43f5e"} 
                  />
                </div>

                {/* Assignments Completed */}
                <div className="ns-glass-card rounded-3xl p-6 shadow-md flex items-center justify-between">
                  <div className="space-y-2">
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider block">Assignment completion</span>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white">{dashboardData.progress_percent}%</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Fully evaluated tasks</p>
                  </div>
                  <ProgressRing 
                    radius={40} 
                    stroke={5} 
                    progress={dashboardData.progress_percent} 
                    label="comp" 
                    color="#6366f1" 
                  />
                </div>

                {/* Pending Tasks */}
                <div className="ns-glass-card rounded-3xl p-6 shadow-md flex items-center justify-between">
                  <div className="space-y-2">
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider block">Pending Tasks</span>
                    <h3 className="text-3xl font-black text-amber-500">{dashboardData.pending_assignments_count}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Due assignments soon</p>
                  </div>
                  <div className="p-4 bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-2xl">
                    <BookOpen size={24} />
                  </div>
                </div>

                {/* Certificate Status */}
                <div className="ns-glass-card rounded-3xl p-6 shadow-md flex items-center justify-between">
                  <div className="space-y-2">
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider block">LMS Certificate</span>
                    <h3 className={`text-xl font-bold flex items-center gap-2 mt-2 ${dashboardData.certificate_unlocked ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`}>
                      {dashboardData.certificate_unlocked ? (
                        <>
                          <Unlock size={18} /> Unlocked
                        </>
                      ) : (
                        <>
                          <Lock size={18} /> Locked
                        </>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Requires threshold completion</p>
                  </div>
                  <div className={`p-4 rounded-2xl ${dashboardData.certificate_unlocked ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'}`}>
                    <Award size={24} />
                  </div>
                </div>
              </div>


              {/* Main Dashboard Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upcoming Class Sessions */}
                <div className="lg:col-span-2 ns-glass-card rounded-3xl p-6 shadow-md">
                  <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-slate-900 dark:text-white">
                    <Calendar className="text-indigo-500" /> Upcoming Class Sessions
                  </h2>

                  {dashboardData.upcoming_classes?.length > 0 ? (
                    <div className="space-y-4">
                      {dashboardData.upcoming_classes.map((cls) => {
                        const isLive = !cls.is_ended && new Date() >= new Date(cls.start_time) && new Date() <= new Date(cls.end_time);
                        const hasEnded = cls.is_ended || new Date() > new Date(cls.end_time);
                        return (
                          <motion.div 
                            key={cls.id} 
                            variants={itemVariants}
                            className="ns-ticket flex flex-col md:flex-row md:items-center justify-between p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300"
                          >
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-indigo-500 dark:text-indigo-400 font-extrabold tracking-wider">{cls.course_name}</span>
                                {isLive && (
                                  <span className="flex items-center gap-1 text-[10px] px-2.5 py-0.5 bg-rose-500 text-white rounded-full font-bold animate-pulse">
                                    <span className="w-1 h-1 bg-white rounded-full" /> LIVE NOW
                                  </span>
                                )}
                              </div>
                              <h4 className="text-lg font-bold text-slate-800 dark:text-white">{cls.title}</h4>
                              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock size={14} className="text-indigo-500" /> {new Date(cls.start_time).toLocaleDateString()} at {new Date(cls.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span>• Host: <strong className="text-slate-600 dark:text-slate-300">{cls.host_name || 'Coordinator'}</strong></span>
                              </div>
                            </div>
                            
                            <div className="ns-ticket-divider" />
                            
                            {!hasEnded ? (
                              cls.zoom_join_url ? (
                                <a
                                  href={cls.zoom_join_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-4 md:mt-0 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 text-center"
                                >
                                  <Play size={14} fill="currentColor" /> Join Zoom Session
                                </a>
                              ) : (
                                <span className="mt-4 md:bg-slate-105 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-extrabold rounded-xl border border-slate-200 dark:border-slate-700">
                                  No Zoom Link
                                </span>
                              )
                            ) : (
                              <span className="mt-4 md:mt-0 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-extrabold rounded-xl border border-slate-200 dark:border-slate-700">
                                Class Ended
                              </span>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <Calendar size={40} className="mx-auto mb-3 opacity-30 text-indigo-500" />
                      <p className="font-semibold text-sm">No classes scheduled</p>
                      <p className="text-xs text-slate-400 mt-1">Check back later for scheduled webinars</p>
                    </div>
                  )}
                </div>

                {/* Stepper Checklist Panel */}
                <div className="ns-glass-card rounded-3xl p-6 shadow-md flex flex-col justify-between">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-slate-900 dark:text-white">
                      <Award className="text-amber-500" /> Certificate Checklist
                    </h2>
                    
                    <div className="space-y-6">
                      {/* Attendance checklist */}
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-xl mt-0.5 ${dashboardData.attendance_percent >= 75 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {dashboardData.attendance_percent >= 75 ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">Class Attendance</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Maintain at least 75% attendance rate.</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-xs font-extrabold ${dashboardData.attendance_percent >= 75 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {dashboardData.attendance_percent}% / 75%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Course progress checklist */}
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-xl mt-0.5 ${dashboardData.progress_percent === 100.0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                          {dashboardData.progress_percent === 100.0 ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">Assignments Progress</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Submit and get grades for all assignments.</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-xs font-extrabold ${dashboardData.progress_percent === 100.0 ? 'text-emerald-500' : 'text-indigo-500'}`}>
                              {dashboardData.progress_percent}% / 100%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700/60 pt-6 mt-6">
                    {dashboardData.certificate_unlocked ? (
                      <a 
                        href={dashboardData.certificate_url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300"
                      >
                        <Award size={18} /> Get PDF Certificate
                      </a>
                    ) : (
                      <button 
                        disabled 
                        className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 font-extrabold rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200 dark:border-slate-750"
                      >
                        <Lock size={18} /> Certificate Locked
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* CLASSES TAB */}
          {/* ================================================================== */}
          {activeTab === 'classes' && (() => {
            const filteredClasses = classes.filter(cls => {
              const hasEnded = cls.is_ended || new Date() > new Date(cls.end_time);
              if (classFilter === 'upcoming') return !hasEnded;
              if (classFilter === 'past') return hasEnded;
              return true;
            });

            return (
              <div className="ns-glass-card rounded-3xl p-6 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800/80 pb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Course Class Schedule</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Track upcoming interactive webinars and view past completed lectures
                    </p>
                  </div>
                  
                  {/* Filter Pills */}
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
                    {[
                      { id: 'all', label: 'All Lectures' },
                      { id: 'upcoming', label: 'Upcoming / Active' },
                      { id: 'past', label: 'Completed' }
                    ].map(filter => (
                      <button
                        key={filter.id}
                        onClick={() => setClassFilter(filter.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                          classFilter === filter.id 
                            ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredClasses.length > 0 ? (
                  <div className="space-y-4">
                    {filteredClasses.map(cls => {
                      const now = new Date();
                      const startTime = new Date(cls.start_time);
                      const endTime = new Date(cls.end_time);
                      const isLive = !cls.is_ended && now >= startTime && now <= endTime;
                      const isUpcoming = !cls.is_ended && now < startTime;
                      const hasEnded = cls.is_ended || now > endTime;

                      const day = startTime.getDate();
                      const month = startTime.toLocaleDateString([], { month: 'short' }).toUpperCase();
                      const weekday = startTime.toLocaleDateString([], { weekday: 'short' });
                      const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const endTimeStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      
                      return (
                        <div 
                          key={cls.id}
                          className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 rounded-2xl hover:shadow-lg hover:border-indigo-500/20 transition-all duration-300 gap-6"
                        >
                          {/* Left: Date Accent Box and Class details */}
                          <div className="flex items-start gap-4 flex-1">
                            {/* Mini Calendar Sheet */}
                            <div className="flex flex-col items-center justify-center w-16 h-20 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-100/40 dark:border-indigo-900/40 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm">
                              <div className="w-full bg-indigo-600 text-white text-[9px] font-black text-center py-1 uppercase tracking-wider">
                                {month}
                              </div>
                              <div className="flex flex-col items-center justify-center flex-grow">
                                <span className="text-xl font-black text-slate-800 dark:text-white leading-none">{day}</span>
                                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">{weekday}</span>
                              </div>
                            </div>

                            {/* Class metadata */}
                            <div className="space-y-2 text-left flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-indigo-500 dark:text-indigo-400 font-extrabold tracking-wider">{cls.course_name}</span>
                                {isLive ? (
                                  <span className="text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-rose-500 text-white animate-pulse">
                                    🔴 Live Now
                                  </span>
                                ) : isUpcoming ? (
                                  <span className="text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                                    Upcoming
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-500 dark:bg-slate-900/50 dark:text-slate-500 border border-slate-200/50 dark:border-slate-800/80">
                                    Past
                                  </span>
                                )}
                              </div>
                              
                              <h4 className="text-base font-extrabold text-slate-800 dark:text-white tracking-tight">{cls.title}</h4>
                              
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-450 dark:text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock size={13} className="text-slate-400" /> {timeStr} - {endTimeStr}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User size={13} className="text-slate-400" /> Host: <strong className="text-slate-600 dark:text-slate-400 font-semibold">{cls.host_name || 'Coordinator'}</strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center justify-end flex-shrink-0">
                            {!hasEnded ? (
                              cls.zoom_join_url ? (
                                <a
                                  href={cls.zoom_join_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-center"
                                >
                                  <Play size={14} fill="currentColor" /> Join Zoom Session
                                </a>
                              ) : (
                                <span className="w-full md:w-auto text-center text-xs text-slate-400 dark:text-slate-500 font-bold uppercase bg-slate-50 dark:bg-slate-900/40 px-4 py-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                                  No Zoom Link
                                </span>
                              )
                            ) : (
                              <span className="w-full md:w-auto text-center text-xs text-slate-400 dark:text-slate-500 font-bold uppercase bg-slate-50 dark:bg-slate-900/40 px-4 py-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                                Class Ended
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/80">
                    <Calendar size={48} className="mx-auto mb-3 opacity-30 text-indigo-500" />
                    <p className="font-semibold text-sm">No scheduled lectures found</p>
                    <p className="text-xs text-slate-400 mt-1">Adjust your filters or check back later for updates</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ================================================================== */}
          {/* ASSIGNMENTS TAB */}
          {/* ================================================================== */}
          {activeTab === 'assignments' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Assignment List */}
              <div className="lg:col-span-2 ns-glass-card rounded-3xl p-6 shadow-md">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Course Assignments</h2>

                {assignments.length > 0 ? (
                  <div className="space-y-4">
                    {assignments.map(asm => {
                      const submission = getSubmissionForAssignment(asm.id);
                      const isGraded = submission?.status === 'graded';
                      const isSubmitted = submission?.status === 'submitted' || submission?.status === 'graded';
                      const isMCQ = asm.questions && asm.questions.length > 0;
                      
                      return (
                        <motion.div 
                          key={asm.id}
                          onClick={() => handleAssignmentSelect(asm)}
                          whileHover={{ y: -2 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className={`relative overflow-hidden p-5 bg-white dark:bg-slate-800/90 border-l-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 ${
                            selectedAssignment?.id === asm.id 
                              ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/20 border-t border-r border-b border-indigo-500/40' 
                              : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500/40 border-t border-r border-b'
                          } ${
                            isSubmitted 
                              ? (isGraded ? 'border-l-emerald-500' : 'border-l-amber-500') 
                              : 'border-l-rose-500'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl flex-shrink-0 ${
                              isSubmitted 
                                ? (isGraded ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500') 
                                : 'bg-rose-500/10 text-rose-500'
                            }`}>
                              {isMCQ ? <CheckCircle size={20} /> : <FileText size={20} />}
                            </div>
                            
                            <div className="space-y-1">
                              <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-extrabold tracking-wider uppercase bg-indigo-500/5 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/10">
                                {asm.course_name}
                              </span>
                              <h4 className="text-base font-extrabold text-slate-850 dark:text-white pt-1">{asm.title}</h4>
                              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                                <span className="flex items-center gap-1">
                                  <Clock size={12} className="text-slate-400" />
                                  Due: {new Date(asm.due_date).toLocaleDateString()} at {new Date(asm.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Award size={12} className="text-slate-400" />
                                  Max Score: {asm.max_score} pts
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Submission badge */}
                          <div className="sm:self-center">
                            {submission ? (
                              <span className={`text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                                isGraded 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20' 
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-450 border-amber-500/20'
                              }`}>
                                {isGraded ? <CheckCircle size={12} /> : <Clock size={12} />}
                                {isGraded ? `Graded: ${submission.score}/${asm.max_score}` : 'Submitted'}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-455 border border-rose-500/20 px-3 py-1.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1.5">
                                <AlertCircle size={12} />
                                Missing
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <BookOpen size={48} className="mx-auto mb-3 opacity-30 text-indigo-500" />
                    <p className="font-semibold text-sm">No assignments found.</p>
                  </div>
                )}
              </div>

              {/* Upload & MCQ Details Panel */}
              <div className="ns-glass-card rounded-3xl p-6 shadow-md flex flex-col justify-between min-h-[400px]">
                {selectedAssignment ? (
                  <div className="flex-1 flex flex-col justify-between space-y-6">
                    <div>
                      <span className="text-[9px] text-indigo-500 dark:text-indigo-400 font-extrabold tracking-wider uppercase bg-indigo-500/5 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/10">
                        {selectedAssignment.course_name}
                      </span>
                      <h4 className="font-extrabold text-lg text-slate-900 dark:text-white mt-2 leading-snug">{selectedAssignment.title}</h4>
                      
                      <div className="bg-slate-50/50 dark:bg-slate-900/40 p-4.5 rounded-2xl border border-slate-150 dark:border-slate-800/80 text-sm text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-wrap mt-4">
                        {selectedAssignment.description}
                      </div>
                      
                      {selectedAssignment.attachment && (
                        <div className="mt-4">
                          <a 
                            href={selectedAssignment.attachment} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-2.5 text-xs font-bold text-indigo-650 dark:text-indigo-400 hover:bg-indigo-500/15 bg-indigo-500/10 px-4 py-2.5 rounded-xl border border-indigo-500/15 dark:border-indigo-500/10 shadow-sm transition-all duration-300"
                          >
                            <FileText size={14} /> Download Resources
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700/60 pt-6 flex-1 flex flex-col justify-end">
                      {getSubmissionForAssignment(selectedAssignment.id) ? (
                        <div className="space-y-4">
                          {getSubmissionForAssignment(selectedAssignment.id).status === 'graded' ? (
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/15 dark:to-teal-950/15 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-5 relative overflow-hidden shadow-sm">
                              {/* Trophy background watermark */}
                              <div className="absolute -right-6 -bottom-6 opacity-5 dark:opacity-10 text-emerald-600">
                                <Award size={120} />
                              </div>
                              
                              <span className="text-slate-405 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest block">Assessment Score</span>
                              <div className="text-3xl font-black text-emerald-650 dark:text-emerald-400 mt-2">
                                {getSubmissionForAssignment(selectedAssignment.id).score} <span className="text-sm text-slate-400 dark:text-slate-500 font-normal">/ {selectedAssignment.max_score} pts</span>
                              </div>
                              
                              <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-650 dark:text-emerald-400 font-extrabold">
                                <CheckCircle size={14} /> Graded & Verified
                              </div>

                              {getSubmissionForAssignment(selectedAssignment.id).feedback && (
                                <div className="mt-4 border-t border-emerald-500/10 dark:border-emerald-500/20 pt-3 z-10 relative">
                                  <span className="text-slate-405 dark:text-slate-500 text-[9px] font-bold uppercase tracking-wider block">Feedback</span>
                                  <p className="text-xs mt-1.5 bg-white/60 dark:bg-slate-950/60 p-3 rounded-xl border border-emerald-500/10 dark:border-emerald-500/5 italic text-slate-650 dark:text-slate-350">
                                    "{getSubmissionForAssignment(selectedAssignment.id).feedback}"
                                  </p>
                                </div>
                              )}

                              {selectedAssignment.questions && selectedAssignment.questions.length > 0 && (
                                <button
                                  onClick={() => navigate(`/student/take-test/${selectedAssignment.id}`)}
                                  className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 shadow-sm"
                                >
                                  Review Test Details & Answers
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/10 dark:to-orange-950/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl p-5 shadow-sm">
                              <span className="text-slate-405 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest block">Submission Status</span>
                              <div className="flex items-center gap-1.5 mt-2.5 font-extrabold text-amber-600 dark:text-amber-450">
                                <Clock size={16} /> Awaiting Evaluation
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                Your work has been submitted successfully and is currently in the queue for manual grading by the course instructor.
                              </p>
                              
                              {(!selectedAssignment.questions || selectedAssignment.questions.length === 0) && (
                                <button
                                  onClick={() => {
                                    setSubmissions(submissions.filter(s => s.assignment !== selectedAssignment.id));
                                  }}
                                  className="mt-4 w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs border border-slate-200 dark:border-slate-850 shadow-sm transition-all duration-300"
                                >
                                  Replace File & Re-Submit
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-6 flex-1 flex flex-col justify-end">
                          {selectedAssignment.questions && selectedAssignment.questions.length > 0 ? (
                            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/15 dark:to-violet-950/15 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-5 shadow-sm space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
                                  <HelpCircle size={20} />
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assessment Type</span>
                                  <span className="text-sm font-extrabold text-slate-850 dark:text-white">Multiple Choice Test</span>
                                </div>
                              </div>

                              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                                <div className="flex justify-between">
                                  <span>Total Questions:</span>
                                  <span className="font-bold">{selectedAssignment.questions.length} items</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Max Obtainable Score:</span>
                                  <span className="font-bold">{selectedAssignment.max_score} pts</span>
                                </div>
                              </div>

                              <button
                                onClick={() => navigate(`/student/take-test/${selectedAssignment.id}`)}
                                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300"
                              >
                                Take Assessment Test
                              </button>
                            </div>
                          ) : (
                            <form onSubmit={handleAssignmentSubmit} className="space-y-4 flex-1 flex flex-col justify-end">
                              <div 
                                onClick={() => fileInputRef.current.click()}
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer flex-1 flex flex-col items-center justify-center min-h-[160px] transition-all duration-300 ${
                                  dragActive 
                                    ? 'border-indigo-500 bg-indigo-500/5 scale-[1.02]' 
                                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-indigo-500'
                                }`}
                              >
                                <input 
                                  type="file" 
                                  ref={fileInputRef} 
                                  onChange={handleFileChange}
                                  className="hidden" 
                                />
                                <UploadCloud size={36} className={`mb-2 transition-transform duration-300 ${dragActive ? 'text-indigo-500 animate-bounce' : 'text-slate-400'}`} />
                                {submitFile ? (
                                  <div className="space-y-1">
                                    <p className="font-bold text-sm text-indigo-500 truncate max-w-[200px]">{submitFile.name}</p>
                                    <p className="text-xs text-slate-400 font-semibold">{(submitFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="font-bold text-sm text-slate-750 dark:text-slate-350">Drag & Drop file here</p>
                                    <p className="text-xs text-slate-400 mt-1">or click to upload PDF/Doc</p>
                                  </div>
                                )}
                              </div>

                              <button
                                type="submit"
                                disabled={uploading || !submitFile}
                                className={`w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 ${
                                  uploading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                {uploading ? 'Submitting...' : 'Submit Assessment'}
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden border border-dashed border-slate-200 dark:border-slate-800/80 rounded-3xl p-8 flex-1 flex flex-col items-center justify-center text-center bg-slate-50/20 dark:bg-slate-900/10">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 bg-indigo-500/20 dark:bg-indigo-500/10 blur-xl rounded-full scale-150 animate-pulse" />
                      <div className="relative p-5 bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 text-indigo-500 dark:text-indigo-400 rounded-full border border-indigo-500/20 shadow-sm">
                        <BookOpen size={36} className="animate-pulse" />
                      </div>
                    </div>
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Select an Assignment</h3>
                    <p className="text-xs text-slate-450 dark:text-slate-400 mt-2 max-w-xs leading-relaxed">
                      Choose an assignment from the list to view specifications, download learning materials, and submit your assessments.
                    </p>
                    <div className="mt-6 space-y-2.5 w-full max-w-[220px] text-[10px] text-slate-400 font-semibold text-left border-t border-slate-200/50 dark:border-slate-800/50 pt-5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span>Review detailed instructions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span>Download reference resources</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span>Submit files or take MCQ tests</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* PROGRESS & CERTIFICATE TAB */}
          {/* ================================================================== */}
          {activeTab === 'progress' && dashboardData && (
            <div className="space-y-8">
              {/* Radial Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Attendance Performance */}
                <div className="ns-glass-card rounded-3xl p-8 shadow-md flex flex-col items-center justify-center text-center space-y-4">
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">LMS Attendance Performance</h3>
                  <ProgressRing 
                    radius={70} 
                    stroke={7} 
                    progress={dashboardData.attendance_percent} 
                    label="att" 
                    color={dashboardData.attendance_percent >= 75 ? "#10b981" : "#f43f5e"} 
                  />
                  <div className="text-xs text-slate-400 dark:text-slate-500 max-w-[200px] mt-2 font-medium">
                    Maintain at least 75% class attendance rate. Your rate is {dashboardData.attendance_percent}%.
                  </div>
                </div>

                {/* Assignment Completion */}
                <div className="ns-glass-card rounded-3xl p-8 shadow-md flex flex-col items-center justify-center text-center space-y-4">
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Assignment Completion</h3>
                  <ProgressRing 
                    radius={70} 
                    stroke={7} 
                    progress={dashboardData.progress_percent} 
                    label="comp" 
                    color="#6366f1" 
                  />
                  <div className="text-xs text-slate-400 dark:text-slate-500 max-w-[200px] mt-2 font-medium">
                    Percentage of course assignments submitted and fully graded.
                  </div>
                </div>

                {/* Certificate Showcase Mockup Card */}
                <div className="ns-glass-card rounded-3xl p-8 shadow-md flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden">
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Professional Certificate</h3>
                  
                  {/* Certificate Mockup Frame */}
                  <div className="relative w-full max-w-[320px]">
                    <div className="certificate-preview-card">
                      {!dashboardData.certificate_unlocked && (
                        <div className="cert-lock-overlay">
                          <Lock size={36} className="text-amber-500 mb-2 animate-bounce" />
                          <span className="text-sm font-extrabold text-white">Certificate Locked</span>
                          <span className="text-[10px] text-slate-350 px-4 mt-1">Complete your requirements to unlock this credential</span>
                        </div>
                      )}
                      
                      <div className="cert-title">PROJECT NORTH STAR</div>
                      <div className="cert-presented">presented to</div>
                      <div className="cert-name truncate max-w-[180px]">{user.name || user.login_id}</div>
                      <div className="cert-body">for outstanding completion of the professional LMS career advancement curriculum.</div>
                      
                      <div className="cert-footer">
                        <div className="cert-sig">
                          <div className="h-4 italic text-[8px] text-indigo-300 font-serif">Director</div>
                          North Star LMS
                        </div>
                        <div className="cert-seal" />
                        <div className="cert-sig">
                          <div className="h-4 italic text-[8px] text-indigo-300 font-serif">iLEAD Admin</div>
                          Placement Portal
                        </div>
                      </div>
                    </div>
                  </div>

                  {dashboardData.certificate_unlocked ? (
                    <a 
                      href={dashboardData.certificate_url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all duration-300 text-xs"
                    >
                      <Award size={18} /> Download Certificate (PDF)
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[200px] font-medium">
                      Locks automatically open when attendance reaches 75% and all assignments are graded.
                    </p>
                  )}
                </div>
              </div>

              {/* Attendance Performance & Log Tracker */}
              <div className="ns-glass-card rounded-3xl p-6 shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                      <BarChart3 size={20} className="text-indigo-500" /> Class Attendance Tracker
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Detailed log of your participation in scheduled live lectures
                    </p>
                  </div>
                  
                  {/* Summary Metric Badges */}
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Total Classes: <strong className="text-slate-900 dark:text-white font-bold">{attendanceRecords.length}</strong>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                      dashboardData.attendance_percent >= 75 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}>
                      Overall Rate: <strong className="font-bold">{dashboardData.attendance_percent}%</strong>
                    </div>
                  </div>
                </div>

                {/* Progress bar with threshold */}
                <div className="mb-6 space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>Attendance Progress</span>
                    <span>75% Required for Placement drives</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                    {/* The 75% indicator line */}
                    <div className="absolute left-[75%] top-0 bottom-0 w-[2px] bg-slate-300 dark:bg-slate-600 z-10" title="Eligibility threshold" />
                    
                    {/* Active progress */}
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${
                        dashboardData.attendance_percent >= 75 
                          ? 'from-indigo-500 to-emerald-500' 
                          : 'from-amber-500 to-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, dashboardData.attendance_percent)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {dashboardData.attendance_percent >= 75 
                      ? '✓ You meet the 75% attendance threshold for Placement drive eligibility.' 
                      : '⚠ Attend more classes to reach the 75% minimum eligibility requirement.'}
                  </p>
                </div>

                {attendanceRecords.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[350px] overflow-y-auto pr-2">
                    {attendanceRecords.map((record, idx) => {
                      const statusConfig = {
                        present: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', label: 'Present' },
                        late: { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', label: 'Late' },
                        absent: { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', label: 'Absent' },
                        excused: { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', label: 'Excused' }
                      };
                      const status = statusConfig[record.status] || { bg: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Absent' };
                      const classDate = record.class_start_time ? new Date(record.class_start_time) : new Date(record.updated_at);
                      
                      return (
                        <div 
                          key={record.id || idx}
                          className="p-4 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 flex flex-col justify-between gap-3 hover:border-indigo-500/30 transition-all duration-300"
                        >
                          <div>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-500">{record.course_name || 'LMS Lecture'}</span>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 mt-1 min-h-[32px]">{record.class_title}</h4>
                          </div>
                          
                          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2 text-[10px] text-slate-400">
                            <span>{classDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold tracking-wider uppercase ${status.bg}`}>
                              {record.status === 'excused' ? 'Excused' : `${record.attendance_percent ?? 0}%`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/80">
                    <BarChart3 size={40} className="mx-auto mb-3 opacity-30 text-indigo-500" />
                    <p className="font-semibold text-sm">No attendance records found</p>
                    <p className="text-xs text-slate-400 mt-1">Attendance data updates dynamically based on class participation</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
