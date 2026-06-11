import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { 
  Bell, 
  Send, 
  Users, 
  BookOpen, 
  Layers, 
  Check, 
  UserCheck, 
  AlertTriangle, 
  Search, 
  Square, 
  CheckSquare, 
  Loader2,
  Trash2,
  Globe,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function SendNotifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');
  const [actionUrl, setActionUrl] = useState('');
  
  // Targeting
  const [targetType, setTargetType] = useState('all'); // 'all', 'course', 'students'
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  
  // Lists loaded from backend
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Search state for student list selector
  const [searchTerm, setSearchTerm] = useState('');
  
  // History state
  const [activeTab, setActiveTab] = useState('new'); // 'new', 'history'
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch history
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await axios.get('/applications/notifications/admin/history/');
      setHistory(response.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load notification history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  // Retract broadcast
  const handleRetract = async (broadcastId) => {
    if (!window.confirm('Are you sure you want to retract this notification? It will be deleted from all recipient student dashboards permanently.')) {
      return;
    }
    const toastId = toast.loading('Retracting notification...');
    try {
      await axios.delete('/applications/notifications/admin/delete-broadcast/', {
        params: { broadcast_id: broadcastId }
      });
      toast.success('Notification retracted successfully!', { id: toastId });
      setHistory(history.filter(item => item.broadcast_id !== broadcastId));
    } catch (err) {
      console.error(err);
      toast.error('Failed to retract notification.', { id: toastId });
    }
  };

  // 1. Fetch students and extract unique courses
  useEffect(() => {
    const fetchStudentsData = async () => {
      setLoadingStudents(true);
      try {
        // Fetch students and extract their unique courses
        const response = await axios.get('/students/?limit=1000');
        const data = response.data.results || response.data || [];
        setStudents(data);
        
        // Extract unique courses from enrolled students
        const studentCourses = Array.from(
          new Set(data.map(s => s.course).filter(Boolean))
        );

        // Also fetch the full 19-course list from career_os
        let allCourseNames = [...studentCourses];
        try {
          const courseRes = await axios.get('/career-os/courses/');
          const careerCourses = (courseRes.data.courses || []).map(c => c.name);
          // Merge both lists, deduplicate, sort
          allCourseNames = Array.from(new Set([...studentCourses, ...careerCourses])).sort();
        } catch (courseErr) {
          console.warn('Could not fetch career-os courses:', courseErr);
          allCourseNames = studentCourses.sort();
        }

        setCourses(allCourseNames);
        if (allCourseNames.length > 0) {
          setSelectedCourse(allCourseNames[0]);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load student profiles');
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudentsData();
  }, []);

  // 2. Select/Deselect handlers for Student Target grid
  const handleSelectOne = (id) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(item => item !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const handleSelectAllFiltered = (filteredList) => {
    const filteredIds = filteredList.map(s => s.id);
    const allSelected = filteredIds.every(id => selectedStudentIds.includes(id));
    
    if (allSelected) {
      // Unselect all filtered
      setSelectedStudentIds(selectedStudentIds.filter(id => !filteredIds.includes(id)));
    } else {
      // Select all filtered (merge)
      setSelectedStudentIds(Array.from(new Set([...selectedStudentIds, ...filteredIds])));
    }
  };

  // Filter students based on search term
  const filteredStudents = students.filter(s => {
    const term = searchTerm.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(term) ||
      (s.registration_number || '').toLowerCase().includes(term) ||
      (s.course || '').toLowerCase().includes(term)
    );
  });

  // 3. Dispatch Notification Handler
  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Notification title and message are required.');
      return;
    }

    if (targetType === 'students' && selectedStudentIds.length === 0) {
      toast.error('Please select at least one student candidate.');
      return;
    }

    const confirmMessage = 
      targetType === 'all' 
        ? 'Are you sure you want to broadcast this notification to ALL students?' 
        : targetType === 'course'
        ? `Are you sure you want to dispatch this notification to all students in the "${selectedCourse}" course?`
        : `Are you sure you want to send this notification to ${selectedStudentIds.length} selected student(s)?`;

    if (!window.confirm(confirmMessage)) return;

    setSending(true);
    const toastId = toast.loading('Dispatching notifications...');
    
    try {
      const payload = {
        target_type: targetType,
        title,
        message,
        priority,
        action_url: actionUrl,
        course: targetType === 'course' ? selectedCourse : undefined,
        student_ids: targetType === 'students' ? selectedStudentIds : undefined
      };

      const response = await axios.post('/applications/notifications/admin/create/', payload);
      toast.success(response.data.message || 'Notifications dispatched successfully!', { id: toastId });
      
      // Reset form
      setTitle('');
      setMessage('');
      setActionUrl('');
      setSelectedStudentIds([]);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to dispatch notifications.', { id: toastId });
    } finally {
      setSending(false);
    }
  };

  // Target counts summary helper
  const getTargetSummaryText = () => {
    if (targetType === 'all') return 'Broadcast to all students';
    if (targetType === 'course') return `Send to all ${selectedCourse || 'selected course'} candidates`;
    return `Send to ${selectedStudentIds.length} selected student(s)`;
  };

  // Priority color helper for history list
  const getPriorityBadgeClass = (level) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
      case 'medium':
        return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-500 border border-slate-500/20';
    }
  };

  return (
    <div className="dash-page max-w-5xl mx-auto p-4 md:p-6" style={{ paddingBottom: 80 }}>
      {/* Decorative Blur Backdrops */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      
      {/* Header section */}
      <div className="mb-10 pb-6 border-b border-border-color/60">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#dc2626]/10 text-[#dc2626] border border-[#dc2626]/20">
            Placement Command Center
          </span>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            Real-time Dispatch
          </span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-primary font-heading">
          Announcement <span className="bg-gradient-to-r from-[#2563eb] to-[#dc2626] bg-clip-text text-transparent">Dispatcher</span>
        </h1>
        <p className="text-secondary text-sm font-medium mt-2 max-w-3xl leading-relaxed">
          Instantly publish highly targeted alerts to specific segments. Broadcast announcements globally, target specialized academic streams, or customize cohorts in real-time.
        </p>
      </div>

      {/* Tabs Layout */}
      <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-dark-300/40 border border-border-color rounded-2xl mb-8 max-w-md">
        <button
          onClick={() => setActiveTab('new')}
          className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
            activeTab === 'new'
              ? 'bg-gradient-to-r from-[#2563eb] to-[#dc2626] text-white shadow-md shadow-blue-500/10'
              : 'text-secondary hover:text-primary hover:bg-slate-200/50 dark:hover:bg-dark-300/60'
          }`}
        >
          <Send size={14} /> New Announcement
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-[#2563eb] to-[#dc2626] text-white shadow-md shadow-blue-500/10'
              : 'text-secondary hover:text-primary hover:bg-slate-200/50 dark:hover:bg-dark-300/60'
          }`}
        >
          <Bell size={14} /> Dispatch History
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'new' ? (
          <motion.div
            key="new-announcement"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Left Form Panel */}
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-6 md:p-8 bg-card border border-border-color shadow-sm rounded-3xl">
                <h2 className="text-xl font-extrabold text-primary mb-6 flex items-center gap-2 font-heading">
                  <Bell size={20} className="text-[#2563eb]" /> Announcement Details
                </h2>
                
                <form onSubmit={handleDispatch} className="space-y-6">
                  
                  <div>
                    <label className="text-xs font-black uppercase text-secondary tracking-widest block mb-2">
                      Notification Title *
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g., 🎉 Placement Drive: Google India visiting campus!" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="input-field py-3 px-4 bg-card border-border-color/80 rounded-2xl hover:border-[#2563eb]/50 focus:border-[#2563eb] transition-all w-full text-sm font-bold shadow-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-secondary tracking-widest block mb-2">
                      Alert Message Body *
                    </label>
                    <textarea 
                      rows="5"
                      placeholder="Provide comprehensive details, eligibility thresholds, instructions, or hyperlinks..." 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="input-field py-3.5 px-4 bg-card border-border-color/80 rounded-2xl hover:border-[#2563eb]/50 focus:border-[#2563eb] transition-all w-full text-sm font-medium leading-relaxed shadow-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-secondary tracking-widest block mb-2">
                      Importance / Priority Level
                    </label>
                    <select 
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="input-field py-3 px-4 bg-card border-border-color/80 rounded-2xl w-full text-sm font-bold focus:border-[#2563eb] shadow-sm cursor-pointer"
                    >
                      <option value="low">☕ Low Importance</option>
                      <option value="medium">🔵 Medium Importance</option>
                      <option value="high">🔥 High Importance</option>
                      <option value="critical">🚨 Critical Importance</option>
                    </select>
                  </div>

                  <div className="pt-6 border-t border-border-light/60 flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.02, boxShadow: '0 10px 25px -5px rgba(37,99,235,0.3)' }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={sending}
                      className="btn btn-primary py-3.5 px-8 bg-gradient-to-r from-[#2563eb] to-[#dc2626] text-white font-black text-xs uppercase tracking-widest rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/10 border border-blue-400/20"
                    >
                      {sending ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Dispatching...
                        </>
                      ) : (
                        <>
                          <Send size={16} /> Dispatch Notification
                        </>
                      )}
                    </motion.button>
                  </div>

                </form>
              </div>
            </div>

            {/* Right Target Audience Panel */}
            <div className="lg:col-span-1 space-y-6">
              <div className="card p-6 bg-card border border-border-color shadow-sm rounded-3xl">
                <h2 className="text-xl font-extrabold text-primary mb-6 flex items-center gap-2 font-heading">
                  <Users size={20} className="text-primary" /> Target Audience
                </h2>

                <div className="space-y-5">
                  
                  {/* Custom Segment Option Buttons */}
                  <div className="space-y-3">
                    <button 
                      type="button"
                      onClick={() => setTargetType('all')}
                      style={{
                        display: 'flex',
                        alignItems: 'start',
                        textAlign: 'left',
                        width: '100%',
                        gap: '1rem',
                        padding: '1rem',
                        borderRadius: '16px',
                        border: targetType === 'all' ? '1px solid var(--accent-primary, #2563eb)' : '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                        background: targetType === 'all' ? 'var(--accent-soft, rgba(37, 99, 235, 0.04))' : 'var(--bg-card, rgba(255, 255, 255, 0.02))',
                        color: 'inherit',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: targetType === 'all' ? '0 4px 12px rgba(37, 99, 235, 0.06)' : 'none',
                        outline: 'none'
                      }}
                      onMouseOver={(e) => {
                        if (targetType !== 'all') {
                          e.currentTarget.style.borderColor = 'var(--accent-primary, #2563eb)';
                          e.currentTarget.style.background = 'var(--accent-soft, rgba(37, 99, 235, 0.02))';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (targetType !== 'all') {
                          e.currentTarget.style.borderColor = 'var(--border-color, rgba(255, 255, 255, 0.08))';
                          e.currentTarget.style.background = 'var(--bg-card, rgba(255, 255, 255, 0.02))';
                        }
                      }}
                    >
                      <div className={`p-2.5 rounded-xl ${targetType === 'all' ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-dark-300 text-secondary'} transition-colors`}>
                        <Globe size={18} />
                      </div>
                      <div>
                        <span className="text-sm font-extrabold text-primary block text-left">Broadcast (All Students)</span>
                        <span className="text-[10px] text-secondary font-medium mt-1 block leading-relaxed text-left">Broadcast to all active student accounts</span>
                      </div>
                    </button>

                    <button 
                      type="button"
                      onClick={() => setTargetType('course')}
                      style={{
                        display: 'flex',
                        alignItems: 'start',
                        textAlign: 'left',
                        width: '100%',
                        gap: '1rem',
                        padding: '1rem',
                        borderRadius: '16px',
                        border: targetType === 'course' ? '1px solid var(--accent-primary, #2563eb)' : '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                        background: targetType === 'course' ? 'var(--accent-soft, rgba(37, 99, 235, 0.04))' : 'var(--bg-card, rgba(255, 255, 255, 0.02))',
                        color: 'inherit',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: targetType === 'course' ? '0 4px 12px rgba(37, 99, 235, 0.06)' : 'none',
                        outline: 'none'
                      }}
                      onMouseOver={(e) => {
                        if (targetType !== 'course') {
                          e.currentTarget.style.borderColor = 'var(--accent-primary, #2563eb)';
                          e.currentTarget.style.background = 'var(--accent-soft, rgba(37, 99, 235, 0.02))';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (targetType !== 'course') {
                          e.currentTarget.style.borderColor = 'var(--border-color, rgba(255, 255, 255, 0.08))';
                          e.currentTarget.style.background = 'var(--bg-card, rgba(255, 255, 255, 0.02))';
                        }
                      }}
                    >
                      <div className={`p-2.5 rounded-xl ${targetType === 'course' ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-dark-300 text-secondary'} transition-colors`}>
                        <BookOpen size={18} />
                      </div>
                      <div>
                        <span className="text-sm font-extrabold text-primary block text-left">By Course / Stream</span>
                        <span className="text-[10px] text-secondary font-medium mt-1 block leading-relaxed text-left">Target students of a specific major</span>
                      </div>
                    </button>

                    <button 
                      type="button"
                      onClick={() => setTargetType('students')}
                      style={{
                        display: 'flex',
                        alignItems: 'start',
                        textAlign: 'left',
                        width: '100%',
                        gap: '1rem',
                        padding: '1rem',
                        borderRadius: '16px',
                        border: targetType === 'students' ? '1px solid var(--accent-primary, #2563eb)' : '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                        background: targetType === 'students' ? 'var(--accent-soft, rgba(37, 99, 235, 0.04))' : 'var(--bg-card, rgba(255, 255, 255, 0.02))',
                        color: 'inherit',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: targetType === 'students' ? '0 4px 12px rgba(37, 99, 235, 0.06)' : 'none',
                        outline: 'none'
                      }}
                      onMouseOver={(e) => {
                        if (targetType !== 'students') {
                          e.currentTarget.style.borderColor = 'var(--accent-primary, #2563eb)';
                          e.currentTarget.style.background = 'var(--accent-soft, rgba(37, 99, 235, 0.02))';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (targetType !== 'students') {
                          e.currentTarget.style.borderColor = 'var(--border-color, rgba(255, 255, 255, 0.08))';
                          e.currentTarget.style.background = 'var(--bg-card, rgba(255, 255, 255, 0.02))';
                        }
                      }}
                    >
                      <div className={`p-2.5 rounded-xl ${targetType === 'students' ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-dark-300 text-secondary'} transition-colors`}>
                        <UserCheck size={18} />
                      </div>
                      <div>
                        <span className="text-sm font-extrabold text-primary block text-left">Select Candidates</span>
                        <span className="text-[10px] text-secondary font-medium mt-1 block leading-relaxed text-left">Manually cherrypick target recipients</span>
                      </div>
                    </button>
                  </div>

                  {/* Dynamic target criteria details with Framer Motion slide downs */}
                  <div className="pt-5 border-t border-border-light/60">
                    <AnimatePresence mode="wait">
                      {targetType === 'all' && (
                        <motion.div
                          key="all"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-4 bg-primary/[0.02] border border-primary/15 rounded-2xl flex items-start gap-3 text-xs text-secondary font-medium leading-relaxed"
                        >
                          <Globe className="text-primary flex-shrink-0 mt-0.5" size={16} />
                          <div>
                            Global broadcast alert. This alert will be populated to all active student profiles instantly. Use responsibly.
                          </div>
                        </motion.div>
                      )}

                      {targetType === 'course' && (
                        <motion.div
                          key="course"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3"
                        >
                          <label className="text-[10px] font-black uppercase text-secondary tracking-widest block">
                            Target Academic Field
                          </label>
                          {courses.length === 0 ? (
                            <span className="text-xs text-secondary italic">No courses found</span>
                          ) : (
                            <select
                              value={selectedCourse}
                              onChange={(e) => setSelectedCourse(e.target.value)}
                              className="input-field py-3 px-3 bg-card border-border-color rounded-xl text-sm font-bold w-full focus:border-[#2563eb] cursor-pointer shadow-inner"
                            >
                              {courses.map(course => (
                                <option key={course} value={course}>{course}</option>
                              ))}
                            </select>
                          )}
                        </motion.div>
                      )}

                      {targetType === 'students' && (
                        <motion.div
                          key="students"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4"
                        >
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black uppercase text-secondary tracking-widest block">
                              Select Recipient Students
                            </label>
                            {selectedStudentIds.length > 0 && (
                              <button 
                                type="button"
                                onClick={() => setSelectedStudentIds([])}
                                className="text-[10px] font-black text-danger hover:text-danger/80 uppercase tracking-widest flex items-center gap-1 bg-danger/10 px-2 py-1 rounded-lg transition-colors border border-danger/20"
                              >
                                <Trash2 size={11} /> Clear ({selectedStudentIds.length})
                              </button>
                            )}
                          </div>

                          {/* Recipient Search bar */}
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-secondary">
                              <Search size={14} className="text-slate-400" />
                            </span>
                            <input 
                              type="text" 
                              placeholder="Search candidate profiles..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="input-field pl-9 pr-3.5 py-2.5 bg-card border-border-color/80 rounded-xl text-xs font-medium w-full focus:border-[#2563eb] shadow-inner"
                            />
                          </div>

                          {/* Elegant Scroll Area */}
                          <div className="max-h-64 overflow-y-auto rounded-2xl p-2.5 space-y-2 shadow-inner" style={{ border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))', background: 'var(--bg-input, rgba(0, 0, 0, 0.02))' }}>
                            {loadingStudents ? (
                              <div className="p-6 text-center text-xs text-secondary flex flex-col justify-center items-center gap-2">
                                <Loader2 size={20} className="animate-spin text-primary" /> 
                                <span>Loading candidate rosters...</span>
                              </div>
                            ) : filteredStudents.length === 0 ? (
                              <div className="p-6 text-center text-xs text-secondary italic">
                                No students match your query.
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSelectAllFiltered(filteredStudents)}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                                    padding: '0 4px 10px',
                                    marginBottom: '10px',
                                    cursor: 'pointer',
                                    color: 'var(--accent-primary, #2563eb)',
                                    fontWeight: 800,
                                    fontSize: '10px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    outline: 'none'
                                  }}
                                >
                                  <span>Toggle Selection</span> 
                                  <span className="bg-[#2563eb]/10 px-2 py-0.5 rounded-full text-[9px]">{filteredStudents.length} Visible</span>
                                </button>
                                
                                <div className="space-y-1.5">
                                  {filteredStudents.map(student => {
                                    const isSelected = selectedStudentIds.includes(student.id);
                                    const initials = (student.name || 'S')
                                      .split(' ')
                                      .map(w => w[0])
                                      .join('')
                                      .slice(0, 2)
                                      .toUpperCase();

                                    return (
                                      <div 
                                        key={student.id}
                                        onClick={() => handleSelectOne(student.id)}
                                        style={{
                                          padding: '0.625rem',
                                          borderRadius: '12px',
                                          border: isSelected ? '1px solid var(--accent-primary, #2563eb)' : '1px solid var(--border-color, rgba(255, 255, 255, 0.05))',
                                          background: isSelected ? 'var(--accent-soft, rgba(37, 99, 235, 0.06))' : 'var(--bg-card, rgba(255, 255, 255, 0.02))',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s ease',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.75rem'
                                        }}
                                        onMouseOver={(e) => {
                                          if (!isSelected) {
                                            e.currentTarget.style.borderColor = 'var(--accent-primary, #2563eb)';
                                            e.currentTarget.style.background = 'var(--bg-card-hover, rgba(0, 0, 0, 0.01))';
                                          }
                                        }}
                                        onMouseOut={(e) => {
                                          if (!isSelected) {
                                            e.currentTarget.style.borderColor = 'var(--border-color, rgba(255, 255, 255, 0.05))';
                                            e.currentTarget.style.background = 'var(--bg-card, rgba(255, 255, 255, 0.02))';
                                          }
                                        }}
                                      >
                                        <span>
                                          {isSelected ? (
                                            <CheckSquare size={18} className="text-primary flex-shrink-0" />
                                          ) : (
                                            <Square size={18} className="text-slate-400 dark:text-dark-400 flex-shrink-0" />
                                          )}
                                        </span>
                                        
                                        {/* Circle initials avatar */}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                          isSelected ? 'bg-gradient-to-tr from-[#2563eb] to-[#dc2626] text-white' : 'bg-slate-100 dark:bg-dark-300 text-secondary'
                                        }`}>
                                          {initials}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                          <span className="text-xs font-extrabold block truncate text-primary">{student.name}</span>
                                          <span className="text-[9px] text-secondary font-bold block truncate mt-0.5 uppercase tracking-wider">
                                            {student.registration_number} • <strong className="text-primary">{student.course || 'BCA'}</strong>
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>

              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dispatch-history"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {loadingHistory ? (
              <div className="p-12 text-center flex flex-col justify-center items-center gap-2">
                <Loader2 size={32} className="animate-spin text-primary" />
                <span className="text-secondary text-sm font-semibold">Retrieving dispatch archives...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-border-color rounded-3xl bg-card">
                <Bell size={40} className="mx-auto text-secondary/30 mb-4" />
                <h3 className="font-extrabold text-primary text-base">No announcements sent yet</h3>
                <p className="text-secondary text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                  Your broadcast notifications and targeted cohort alerts will show up here along with live read percentages.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {history.map((item) => {
                  const readPercent = item.recipient_count > 0 
                    ? Math.round((item.read_count / item.recipient_count) * 100) 
                    : 0;

                  return (
                    <motion.div 
                      key={item.broadcast_id}
                      className="card p-6 bg-card border border-border-color shadow-sm rounded-3xl flex flex-col justify-between relative overflow-hidden group hover:border-border-color-hover transition-all duration-300"
                    >
                      <div>
                        {/* Top Metadata Row */}
                        <div className="flex justify-between items-start gap-4 mb-4">
                          <div className="flex flex-wrap gap-1.5">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${getPriorityBadgeClass(item.priority)}`}>
                              {item.priority}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-slate-100 dark:bg-dark-300 text-primary border border-border-color/60 uppercase tracking-wider">
                              {item.target_value}
                            </span>
                          </div>
                          <span className="text-[10px] text-secondary font-medium whitespace-nowrap">
                            {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Title and Message */}
                        <h3 className="text-base font-extrabold text-primary font-heading line-clamp-1 mb-2">
                          {item.title}
                        </h3>
                        <p className="text-xs text-secondary leading-relaxed font-medium line-clamp-3 mb-4">
                          {item.message}
                        </p>
                      </div>

                      {/* Stats & Actions Footer */}
                      <div className="pt-4 border-t border-border-color/60 mt-auto">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] text-secondary font-bold">
                            Sent by: <strong className="text-primary">{item.sender_email}</strong>
                          </span>
                          <span className="text-[10px] text-secondary font-extrabold">
                            {item.read_count} / {item.recipient_count} Read ({readPercent}%)
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-dark-300 rounded-full overflow-hidden mb-4">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500" 
                            style={{ width: `${readPercent}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center">
                          {item.action_url ? (
                            <span className="text-[10px] text-primary/70 font-semibold truncate max-w-[180px]" title={item.action_url}>
                              Link: {item.action_url}
                            </span>
                          ) : (
                            <span className="text-[10px] text-secondary/50 italic">No link attached</span>
                          )}
                          <button
                            onClick={() => handleRetract(item.broadcast_id)}
                            className="btn btn-secondary border-danger/20 hover:bg-danger/10 hover:text-danger hover:border-danger/30 text-danger text-[10px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all duration-200"
                          >
                            <Trash2 size={12} /> Retract Alert
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
