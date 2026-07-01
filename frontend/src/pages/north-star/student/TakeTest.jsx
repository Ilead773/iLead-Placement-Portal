import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  Award, 
  BookOpen, 
  X, 
  Check, 
  ShieldAlert,
  Inbox,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import northStarAPI from '../../../api/northStarAPI';
import useAuthStore from '../../../store/authStore';

export default function StudentTakeTest() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Load States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data States
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  
  // Navigation / Mode State
  // 'intro' | 'taking' | 'results'
  const [viewState, setViewState] = useState('intro');
  
  // Exam States
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // Maps question.id -> selectedOptionIndex
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [startTime] = useState(new Date());

  // Starfield decoration (matching North Star theme)
  const [stars, setStars] = useState([]);
  useEffect(() => {
    const generatedStars = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 2 + 1}px`,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 4 + 4}s`
    }));
    setStars(generatedStars);
  }, []);

  // Fetch Assignment and Submissions
  const fetchAssignmentData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch assignment details
      const assignmentRes = await northStarAPI.getAssignmentDetail(assignmentId);
      const asm = assignmentRes.data;
      
      if (!asm.questions || asm.questions.length === 0) {
        throw new Error("This assignment does not contain test questions.");
      }
      
      // Sort questions by order or ID to ensure consistent navigation
      asm.questions.sort((a, b) => (a.order || 0) - (b.order || 0));
      setAssignment(asm);

      // 2. Fetch submissions to see if already taken
      const submissionsRes = await northStarAPI.mySubmissions();
      const existingSub = submissionsRes.data.find(s => s.assignment === asm.id);
      
      if (existingSub) {
        setSubmission(existingSub);
        setViewState('results');
        
        // Load existing answers if available
        if (existingSub.answers_data && Array.isArray(existingSub.answers_data)) {
          const loadedAnswers = {};
          existingSub.answers_data.forEach(ans => {
            loadedAnswers[ans.question_id] = ans.selected_option;
          });
          setAnswers(loadedAnswers);
        }
      } else {
        setViewState('intro');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load test details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assignmentId) {
      fetchAssignmentData();
    }
  }, [assignmentId]);

  // Handle option select
  const handleSelectOption = (questionId, optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  // Submit test
  const handleSubmitTest = async () => {
    setSubmitting(true);
    setShowSubmitConfirm(false);
    
    // Format payload
    // Backend expects array of answers: answers_data: [{question_id, selected_option}]
    const answersData = Object.entries(answers).map(([qId, val]) => ({
      question_id: qId,
      selected_option: val
    }));

    // Ensure every question is answered in the payload
    // (If not answered, we send null or exclude, but we validate before submit)
    assignment.questions.forEach(q => {
      if (answers[q.id] === undefined) {
        answersData.push({
          question_id: q.id,
          selected_option: null
        });
      }
    });

    const payload = {
      assignment: assignment.id,
      answers_data: answersData
    };

    try {
      const submitRes = await northStarAPI.submitAssignment(payload);
      toast.success('Assessment submitted successfully!');
      
      // Update state and move to results view
      setSubmission(submitRes.data);
      setViewState('results');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to submit test. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate stats
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = assignment?.questions?.length || 0;
  const isAllAnswered = answeredCount === totalQuestions;

  // View Loader
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen size={20} className="text-indigo-600 animate-pulse" />
          </div>
        </div>
        <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-350">Preparing assessment details...</p>
      </div>
    );
  }

  // View Error
  if (error || !assignment) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-full text-rose-500 mb-4 animate-bounce">
          <AlertCircle size={36} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Error Loading Assessment</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">{error || 'Assignment details could not be found.'}</p>
        <button 
          onClick={() => navigate('/student')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition-all duration-300"
        >
          <ArrowLeft size={16} /> Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* INTRO SCREEN                                                 */}
      {/* ──────────────────────────────────────────────────────────── */}
      {viewState === 'intro' && (
        <div className="flex-1 flex flex-col justify-center items-center p-6 relative overflow-hidden">
          {/* Starfield decoration */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/20 z-0">
            <div className="absolute inset-0 opacity-40">
              {stars.map(star => (
                <div 
                  key={star.id}
                  className="absolute rounded-full bg-white animate-pulse"
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
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-extrabold tracking-wider uppercase bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/10">
                  {assignment.course_name || "LMS Test"}
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white pt-2">
                  {assignment.title}
                </h2>
              </div>
              <button 
                onClick={() => navigate('/student')}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-550 dark:text-slate-400 transition-all duration-300"
                title="Cancel"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-slate-100/50 dark:bg-slate-950/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assessment Description</span>
              <p className="text-sm text-slate-650 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">
                {assignment.description || "No description provided. Read the questions carefully and select the best answer."}
              </p>
            </div>

            {/* Test Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-2xl flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-xl">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Questions</span>
                  <span className="text-base font-extrabold text-slate-800 dark:text-white">{totalQuestions} Items</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-2xl flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-500 dark:text-emerald-450 rounded-xl">
                  <Award size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Max Score</span>
                  <span className="text-base font-extrabold text-slate-800 dark:text-white">{assignment.max_score || 100} pts</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-2xl col-span-2 sm:col-span-1 flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-xl">
                  <Clock size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Deadline</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    {new Date(assignment.due_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning block */}
            <div className="flex gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-450">
              <ShieldAlert className="flex-shrink-0" size={20} />
              <div className="text-xs leading-relaxed space-y-1">
                <p className="font-extrabold">Important Assessment Integrity Information:</p>
                <p>Ensure you have a stable internet connection. Avoid closing or refreshing this page while taking the test, as this will submit your active responses immediately.</p>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button 
                onClick={() => navigate('/student')}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-sm transition-all duration-300"
              >
                Back to Dashboard
              </button>
              <button 
                onClick={() => setViewState('taking')}
                className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-extrabold rounded-2xl text-sm hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-indigo-500/20 transition-all duration-300"
              >
                Begin Assessment
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ACTIVE TEST TAKING ENVIRONMENT                              */}
      {/* ──────────────────────────────────────────────────────────── */}
      {viewState === 'taking' && (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-[9999] flex flex-col font-sans">
          
          {/* Header */}
          <header className="h-16 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shadow-sm flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-extrabold tracking-wider uppercase bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/10">
                {assignment.course_name || "LMS Test"}
              </span>
              <h1 className="text-sm md:text-base font-bold text-slate-800 dark:text-white truncate max-w-[200px] md:max-w-xs">
                {assignment.title}
              </h1>
            </div>

            {/* Center progress indicator */}
            <div className="hidden md:flex flex-col items-center flex-1 max-w-xs mx-4 space-y-1">
              <div className="flex justify-between w-full text-[10px] font-bold text-slate-400 uppercase">
                <span>Progress</span>
                <span>{answeredCount} of {totalQuestions} Answered</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-655 dark:text-slate-350">
                <Clock size={14} className="text-indigo-500" />
                <span>Active Attempt</span>
              </div>
              
              <button
                onClick={() => setShowSubmitConfirm(true)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-extrabold rounded-xl text-xs shadow-md shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300"
              >
                Submit Test
              </button>
            </div>
          </header>

          {/* Test Environment Layout */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left Column: Sidebar Question Navigation */}
            <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto p-5 space-y-6 flex-shrink-0 hidden lg:flex">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Question Navigator</h3>
                <p className="text-[10px] text-slate-400 mt-1">Jump to any question instantly</p>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {assignment.questions.map((q, idx) => {
                  const isCurrent = currentQIndex === idx;
                  const isAnswered = answers[q.id] !== undefined;
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQIndex(idx)}
                      className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center border transition-all duration-200 ${
                        isCurrent 
                          ? 'border-indigo-500 bg-indigo-500 text-white shadow-md shadow-indigo-500/20' 
                          : isAnswered
                            ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10'
                            : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Legend</h4>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3.5 h-3.5 rounded bg-indigo-500"></div>
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Current Question</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3.5 h-3.5 rounded border border-indigo-500/30 bg-indigo-500/5"></div>
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Answered</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3.5 h-3.5 rounded border border-slate-200 dark:border-slate-800"></div>
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Unanswered</span>
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 bg-slate-50 dark:bg-slate-950 flex flex-col justify-between overflow-y-auto p-4 md:p-8">
              
              {/* Top Mobile Bar for Navigator */}
              <div className="flex items-center justify-between lg:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl mb-4 shadow-sm">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Question {currentQIndex + 1} of {totalQuestions}
                </span>

                {/* Question dropdown selection for mobile */}
                <div className="relative">
                  <select 
                    value={currentQIndex}
                    onChange={(e) => setCurrentQIndex(parseInt(e.target.value))}
                    className="appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-3 pr-8 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  >
                    {assignment.questions.map((_, idx) => (
                      <option key={idx} value={idx}>Q{idx + 1} {answers[assignment.questions[idx].id] !== undefined ? '✓' : ''}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>
              </div>

              {/* Question Card */}
              <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col justify-center py-6">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={currentQIndex}
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Prompt Card */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-3xl shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 bg-indigo-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-br-2xl">
                        Question {currentQIndex + 1}
                      </div>
                      
                      <div className="flex justify-between items-start pt-2">
                        <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                          {assignment.questions[currentQIndex].prompt}
                        </h2>
                        <span className="flex-shrink-0 text-[10px] font-extrabold text-indigo-500 bg-indigo-500/10 dark:bg-indigo-900/20 border border-indigo-500/10 px-2.5 py-1 rounded-lg self-start">
                          {assignment.questions[currentQIndex].points} pts
                        </span>
                      </div>
                    </div>

                    {/* Options List */}
                    <div className="space-y-3">
                      {assignment.questions[currentQIndex].options.map((opt, oIdx) => {
                        const isSelected = answers[assignment.questions[currentQIndex].id] === oIdx;
                        const optionLetter = String.fromCharCode(65 + oIdx); // A, B, C, D...

                        return (
                          <motion.div 
                            key={oIdx}
                            onClick={() => handleSelectOption(assignment.questions[currentQIndex].id, oIdx)}
                            whileHover={{ scale: 1.005 }}
                            whileTap={{ scale: 0.995 }}
                            className={`p-4 md:p-5 rounded-2xl border cursor-pointer flex items-center justify-between gap-4 transition-all duration-300 ${
                              isSelected 
                                ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/5 shadow-md shadow-indigo-500/5' 
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-500/30 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              {/* Option Letter Indicator */}
                              <div className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                                isSelected 
                                  ? 'bg-indigo-600 text-white' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}>
                                {optionLetter}
                              </div>
                              <span className={`text-sm md:text-base font-semibold ${
                                isSelected ? 'text-indigo-850 dark:text-indigo-300' : 'text-slate-655 dark:text-slate-350'
                              }`}>
                                {opt}
                              </span>
                            </div>

                            {/* Checkmark circle */}
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'border-indigo-600 bg-indigo-600 text-white' 
                                : 'border-slate-300 dark:border-slate-700'
                            }`}>
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation Footer */}
              <div className="max-w-3xl w-full mx-auto flex items-center justify-between mt-8 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                <button
                  onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  className="px-5 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-all duration-300"
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                <div className="text-xs font-bold text-slate-400 uppercase">
                  Question {currentQIndex + 1} of {totalQuestions}
                </div>

                {currentQIndex === totalQuestions - 1 ? (
                  <button
                    onClick={() => setShowSubmitConfirm(true)}
                    className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold rounded-2xl text-xs hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-emerald-500/20 transition-all duration-300"
                  >
                    Finish Test
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                    className="px-5 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-all duration-300"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                )}
              </div>

            </main>
          </div>

          {/* Submission Confirmation Modal */}
          <AnimatePresence>
            {showSubmitConfirm && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-3xl w-full max-w-md shadow-2xl space-y-5"
                >
                  <div className="flex gap-4 items-start">
                    <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl flex-shrink-0 animate-pulse">
                      <ShieldAlert size={28} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Submit Assessment?</h3>
                      <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                        Are you sure you want to finish and submit your responses? You will not be able to change your answers after submission.
                      </p>
                    </div>
                  </div>

                  {/* Warning if unanswered */}
                  {!isAllAnswered && (
                    <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-450 rounded-2xl text-xs font-semibold leading-normal">
                      ⚠️ Warning: You have left {totalQuestions - answeredCount} questions unanswered out of {totalQuestions} total questions.
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowSubmitConfirm(false)}
                      disabled={submitting}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all duration-300"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={handleSubmitTest}
                      disabled={submitting}
                      className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-extrabold rounded-xl text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition-all duration-300 disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Yes, Submit'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* RESULTS / REVIEW SCREEN                                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      {viewState === 'results' && submission && (
        <div className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in pt-8">
          
          {/* Header Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            
            {/* Soft decorative background circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 dark:bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-3 text-center md:text-left z-10">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-450 font-black tracking-widest uppercase bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Completed & Graded
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                {assignment.title}
              </h2>
              <p className="text-xs text-slate-400 font-semibold">
                Submitted on {new Date(submission.submitted_at).toLocaleDateString()} at {new Date(submission.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Score Banner Ring */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-5 rounded-2xl flex items-center gap-4 z-10">
              <div className="p-3 bg-emerald-500 text-white rounded-xl">
                <Award size={28} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Final Score</span>
                <div className="text-3xl font-black text-slate-900 dark:text-white leading-none mt-1">
                  {submission.score} <span className="text-sm font-normal text-slate-400">/ {assignment.max_score} pts</span>
                </div>
                {assignment.max_score > 0 && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                    Accuracy: {((submission.score / assignment.max_score) * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Feedback & General Instructions */}
          {submission.feedback && (
            <div className="bg-slate-100/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Instructor Feedback</h4>
              <p className="text-sm italic text-slate-750 dark:text-slate-350 leading-relaxed bg-white dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-850 rounded-2xl">
                "{submission.feedback}"
              </p>
            </div>
          )}

          {/* Review of Questions */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Questions Review</h3>
                <p className="text-xs text-slate-455 mt-0.5">Review your choices and see the correct solutions</p>
              </div>
            </div>

            <div className="space-y-6">
              {assignment.questions.map((q, qIdx) => {
                const userSelected = answers[q.id];
                const correctOption = q.correct_option;
                const isCorrect = userSelected === correctOption;
                const pointsEarned = isCorrect ? q.points : 0;

                return (
                  <div 
                    key={q.id}
                    className={`bg-white dark:bg-slate-900 border rounded-3xl p-6 space-y-4 shadow-sm relative overflow-hidden transition-all duration-300 ${
                      isCorrect 
                        ? 'hover:border-emerald-500/30 border-slate-200 dark:border-slate-800' 
                        : 'hover:border-rose-500/30 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Header badge */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">
                          {qIdx + 1}.
                        </span>
                        <h4 className="text-base font-bold text-slate-800 dark:text-white leading-relaxed">
                          {q.prompt}
                        </h4>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isCorrect ? (
                          <span className="text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1 uppercase">
                            <CheckCircle size={10} /> Correct
                          </span>
                        ) : userSelected === null || userSelected === undefined ? (
                          <span className="text-[10px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1 uppercase">
                            <X size={10} /> Unanswered
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1 uppercase">
                            <X size={10} /> Incorrect
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-455 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-200/40 dark:border-slate-700/60">
                          {pointsEarned} / {q.points} pts
                        </span>
                      </div>
                    </div>

                    {/* Options list in review mode */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {q.options.map((opt, oIdx) => {
                        const isSelectedByStudent = userSelected === oIdx;
                        const isCorrectOption = correctOption === oIdx;
                        
                        let cardStyle = "border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20";
                        let pillStyle = "bg-slate-200 dark:bg-slate-850 text-slate-500";
                        let checkIcon = null;

                        if (isSelectedByStudent && isCorrectOption) {
                          // Student chose correct
                          cardStyle = "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/10 shadow-sm";
                          pillStyle = "bg-emerald-500 text-white";
                          checkIcon = <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-450" />;
                        } else if (isSelectedByStudent && !isCorrectOption) {
                          // Student chose wrong
                          cardStyle = "border-rose-500 bg-rose-500/5 dark:bg-rose-950/10 shadow-sm";
                          pillStyle = "bg-rose-500 text-white";
                          checkIcon = <X size={14} className="text-rose-600 dark:text-rose-455" />;
                        } else if (isCorrectOption) {
                          // Correct option (not chosen by student)
                          cardStyle = "border-emerald-500/60 dark:border-emerald-500/30 bg-emerald-500/2 dark:bg-emerald-950/5 border-dashed";
                          pillStyle = "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400";
                          checkIcon = <CheckCircle size={14} className="text-emerald-500" />;
                        }

                        const optionLetter = String.fromCharCode(65 + oIdx);

                        return (
                          <div
                            key={oIdx}
                            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs ${cardStyle}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6.5 h-6.5 rounded-lg font-bold text-[10px] flex items-center justify-center ${pillStyle}`}>
                                {optionLetter}
                              </div>
                              <span className="font-semibold text-slate-700 dark:text-slate-350">
                                {opt}
                              </span>
                            </div>

                            {/* Tags / Icons */}
                            <div className="flex items-center gap-2">
                              {isSelectedByStudent && (
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  isCorrectOption ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                }`}>
                                  Your Choice
                                </span>
                              )}
                              {checkIcon}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex justify-center pt-4">
            <button
              onClick={() => navigate('/student')}
              className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold rounded-2xl text-sm shadow-xl shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex items-center gap-2"
            >
              <LogOut size={16} /> Finish and Return to Dashboard
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
