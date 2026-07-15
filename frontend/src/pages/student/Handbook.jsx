import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Search,
  LayoutDashboard,
  User,
  Bell,
  Video,
  Star,
  FileText,
  ClipboardList,
  Briefcase,
  Rss,
  Bookmark,
  GraduationCap,
  Mic,
  HelpCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Download,
  ChevronRight,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

const SECTIONS_DATA = [
  {
    category: 'General',
    items: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        icon: <LayoutDashboard size={20} />,
        description: 'Your main page. Here you can see how many jobs you applied for, if your profile is complete, when your next interviews are, and new announcements.',
        metrics: [
          { name: 'Total Applications', desc: 'The number of jobs and internships you have applied for.' },
          { name: 'Active Processes', desc: 'Jobs where you are currently doing interviews or waiting for results.' },
          { name: 'Placement Status', desc: 'Your status: Unplaced (looking for a job), Placed (got a job offer), or Accepted (you accepted a job offer).' },
          { name: 'Profile Completion Meter', desc: 'Shows how much of your profile is filled out. Keep this at 100% so you can apply for jobs!' }
        ],
        steps: [
          'Look at the cards at the top for quick numbers.',
          'Check the interview timeline to see when your next interviews are.',
          'Read the latest news from the placement team.',
          'Click on any card to go directly to that section.'
        ],
        tips: 'Make sure your profile is 100% complete. Some companies will not read your resume if your profile is incomplete.',
        type: 'info'
      },
      {
        id: 'profile',
        title: 'My Profile',
        icon: <User size={20} />,
        description: 'Your school details and resume. This is what companies see when you apply.',
        metrics: [
          { name: 'CGPA', desc: 'Your college marks. Verified by the college and used to check if you can apply for a job.' },
          { name: 'Active Backlogs', desc: 'Number of exams you failed and need to clear. Most companies only hire students with zero backlogs.' },
          { name: 'Stream & Course', desc: 'Your course (like BCA or B.Sc. IT). This decides which jobs you can see.' },
          { name: 'Skills & Projects', desc: 'The skills you know (like Java, Python) and the projects you have built.' }
        ],
        steps: [
          'Go to My Profile in the menu.',
          'Make sure your phone number and email are correct.',
          'Check your marks for Class 10, Class 12, and CGPA.',
          'Type in your projects, internships, and skills.',
          'Click the Save button to save your changes.'
        ],
        warnings: 'Do not enter fake marks or hide backlogs. If you lie, you will be permanently blocked from all campus placements.',
        type: 'warning'
      },
      {
        id: 'notifications',
        title: 'Notifications',
        icon: <Bell size={20} />,
        description: 'Announcements and updates from the placement office about your applications.',
        metrics: [
          { name: 'Important Alert (Orange)', desc: 'Important news, like new deadlines or schedule changes.' },
          { name: 'Info Alert (Blue)', desc: 'General info and helpful tips.' },
          { name: 'Shortlist Alert (Green)', desc: 'Good news showing you cleared an interview round or got selected.' }
        ],
        steps: [
          'Click the Bell icon at the top or click Notifications in the menu.',
          'Click any message to read it or go to that page.',
          'Click "Mark as Read" to clear old notifications.'
        ],
        tips: 'Check this page at least twice a day during placement season.',
        type: 'info'
      },
      {
        id: 'sessions',
        title: 'My Sessions',
        icon: <Video size={20} />,
        description: 'Find links for online classes, training, and Zoom interviews.',
        metrics: [
          { name: 'Join Button', desc: 'This button lights up 15 minutes before the meeting starts.' },
          { name: 'Auto-Attendance logging', desc: 'The system automatically tracks when you join and leave the meeting.' }
        ],
        steps: [
          'Go to the My Sessions page.',
          'Find today\'s class or interview link.',
          'Click the blue "Join" button.',
          'Stay in the call until it ends to mark your attendance.'
        ],
        warnings: 'If you miss an interview without telling us 24 hours in advance, you will be blocked from the next 3 company drives.',
        type: 'danger'
      },
      {
        id: 'north-star',
        title: 'Project North Star',
        icon: <Star size={20} />,
        description: 'iLEAD\'s special course website. Use this to learn coding, soft skills, and aptitude.',
        metrics: [
          { name: 'Training Modules', desc: 'Short courses on coding, interview behavior, and math tests.' },
          { name: 'Certifications', desc: 'Get certificates when you complete courses to show on your profile.' }
        ],
        steps: [
          'Click Project North Star in the menu.',
          'Look at the list of courses for your batch.',
          'Finish the lessons and quizzes when you have time.',
          'Download your certificates to add them to your resume.'
        ],
        tips: 'Completing these courses adds a special recommendation tag to your profile that companies can see.',
        type: 'success'
      }
    ]
  },
  {
    category: 'Career',
    items: [
      {
        id: 'resumes',
        title: 'My Resumes',
        icon: <FileText size={20} />,
        description: 'Add and manage your resumes. You can upload a PDF or build one inside the portal using templates.',
        metrics: [
          { name: 'Primary Resume', desc: 'The main resume sent to companies when you apply. Marked with a star.' },
          { name: 'PDF Upload Limit', desc: 'Only PDF files under 2MB are allowed.' },
          { name: 'Resume Templates', desc: 'Simple, clean resumes created automatically from your profile info.' }
        ],
        steps: [
          'Go to My Resumes.',
          'To upload: Click "Upload PDF", choose your file, and upload it.',
          'To build: Click "Create Resume", fill in the blanks, and pick a design.',
          'Click the star next to your main resume to mark it as Primary.'
        ],
        tips: 'Check your resume preview. A simple, clean design helps you get selected faster.',
        type: 'info'
      },
      {
        id: 'applications',
        title: 'My Applications',
        icon: <ClipboardList size={20} />,
        description: 'Check the status of the jobs you applied for.',
        metrics: [
          { name: 'Applied (Blue)', desc: 'Applied successfully. The company is checking your profile.' },
          { name: 'Shortlisted (Purple)', desc: 'You got shortlisted! Next are tests or interviews.' },
          { name: 'Interviewing (Orange)', desc: 'You are currently doing interviews.' },
          { name: 'Selected (Green)', desc: 'You got selected! Congratulations!' },
          { name: 'Rejected (Red)', desc: 'You did not clear this round.' }
        ],
        steps: [
          'Go to My Applications to see your jobs list.',
          'Click "View Details" to see where you stand in each round.',
          'Read marks and feedback left by the interviewers.'
        ],
        tips: 'If you do not get the job, read the feedback to do better next time.',
        type: 'info'
      },
      {
        id: 'jobs',
        title: 'Jobs',
        icon: <Briefcase size={20} />,
        description: 'Browse active jobs that match your marks and course.',
        metrics: [
          { name: 'Compensation (CTC)', desc: 'The yearly salary offered by the company (e.g., ₹6.5 Lakhs per year).' },
          { name: 'Eligibility Status', desc: 'Checks if your marks, backlogs, and course match what the company wants.' },
          { name: 'Job Description (JD)', desc: 'What the job is about and what skills you need.' }
        ],
        steps: [
          'Go to the Jobs page.',
          'Search for jobs by skill, location, or salary.',
          'Click on a job card to see if you meet the requirements (green tick or red cross).',
          'If you qualify, click "Apply Now", pick your resume, and submit.'
        ],
        warnings: 'We have a One-Student-One-Job rule. Once you get a job, you cannot apply for other jobs. You can only apply again if the placement cell gives you special permission to upgrade.',
        type: 'warning'
      },
      {
        id: 'internships',
        title: 'Internships',
        icon: <Briefcase size={20} />,
        description: 'Find short-term internships to get work experience while studying.',
        metrics: [
          { name: 'Stipend', desc: 'The monthly money paid to you during the internship.' },
          { name: 'Duration', desc: 'How long the internship lasts (usually 2 to 6 months).' },
          { name: 'PPO Opportunity', desc: 'Check if the company will offer you a full-time job if you do well.' }
        ],
        steps: [
          'Go to Internships in the menu.',
          'Make sure you can work for the full duration of the internship.',
          'Click "Apply Now" using your main resume.',
          'Track your rounds on the applications page.'
        ],
        tips: 'If you get a full-time job offer (PPO) from your internship, you must tell the placement office within 24 hours.',
        type: 'info'
      },
      {
        id: 'job-feed',
        title: 'Job Feed',
        icon: <Rss size={20} />,
        description: 'Jobs gathered from sites like LinkedIn and Indeed. Good for applying on your own.',
        metrics: [
          { name: 'Source', desc: 'Jobs found on external sites.' },
          { name: 'External Link', desc: 'Link to apply directly on the company website.' }
        ],
        steps: [
          'Go to Job Feed.',
          'Search for jobs that match your skills.',
          'Click "Apply on Company Site" to go to their page.'
        ],
        tips: 'Since external job statuses do not update here, write them down or bookmark them to track your progress.',
        type: 'success'
      },
      {
        id: 'saved-jobs',
        title: 'Saved Jobs',
        icon: <Bookmark size={20} />,
        description: 'A list of jobs you saved to check or apply to later.',
        metrics: [
          { name: 'Bookmarks', desc: 'Jobs you bookmarked.' }
        ],
        steps: [
          'Look at jobs or internships.',
          'Click the bookmark icon on any card to save it.',
          'Open Saved Jobs in the menu to apply before they close.'
        ],
        type: 'info'
      }
    ]
  },
  {
    category: 'Preparation',
    items: [
      {
        id: 'assignments',
        title: 'Assignments & Tests',
        icon: <GraduationCap size={20} />,
        description: 'Online tests, quizzes, and coding tasks given to your batch.',
        metrics: [
          { name: 'Proctoring Strikes', desc: 'Number of times you try to switch tabs or close fullscreen.' },
          { name: 'Fullscreen Mandate', desc: 'Tests must be done in fullscreen. Leaving fullscreen adds 1 strike.' },
          { name: 'Automatic Submission', desc: 'If you get 3 strikes, the test closes and you get 0 marks.' }
        ],
        steps: [
          'Go to Assignments.',
          'Pick a test and read the instructions.',
          'Close all other tabs and chat apps.',
          'Click "Start Test" (the screen will go fullscreen).',
          'Finish and submit the test before time runs out.'
        ],
        warnings: 'Strict anti-cheating is on. If you switch tabs or exit fullscreen 3 times, your test will close instantly and you will get 0 marks.',
        type: 'danger'
      },
      {
        id: 'mock-interview',
        title: 'Mock Interview',
        icon: <Mic size={20} />,
        description: 'Practice speaking interviews with an AI bot.',
        metrics: [
          { name: 'AI Interviewer', desc: 'An AI that asks you questions out loud.' },
          { name: 'Overall Score', desc: 'Marks showing how well you answered and communicated.' },
          { name: 'Skill Gap Analysis', desc: 'Topics you need to study more based on your answers.' }
        ],
        steps: [
          'Go to Mock Interview.',
          'Type the job title (like "React Developer") and details.',
          'Allow microphone access and click "Start".',
          'Listen to the question, speak your answer, and click Next.',
          'Answer 5 questions and click submit to see your marks.'
        ],
        tips: 'Do at least 2 mock interviews before your real company interview to practice your speaking.',
        type: 'success'
      }
    ]
  },
  {
    category: 'Support',
    items: [
      {
        id: 'support-guide',
        title: 'Support & PDF Guide',
        icon: <HelpCircle size={20} />,
        description: 'Get help with placements, read guidelines, and download the full handbook.',
        metrics: [
          { name: 'Coordinators', desc: 'Contact names and emails of placement team members.' },
          { name: 'Official Guide', desc: 'Detailed PDF with all placement cell rules and policies.' }
        ],
        steps: [
          'Read the tips on this page to solve common problems.',
          'Click the "Download Offline PDF" button at the top to download the official book.',
          'Contact your department placement coordinator if you have any questions.'
        ],
        tips: 'Always double-check deadlines and test links before reaching out for help.',
        type: 'info'
      }
    ]
  }
];

export default function StudentHandbook() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState(null);

  const filteredData = useMemo(() => {
    return SECTIONS_DATA.map(cat => {
      const filteredItems = cat.items.filter(item => {
        const matchesSearch =
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.steps.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.metrics && item.metrics.some(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())));
        const matchesCategory = activeCategory === 'All' || cat.category === activeCategory;
        return matchesSearch && matchesCategory;
      });
      return { ...cat, items: filteredItems };
    }).filter(cat => cat.items.length > 0);
  }, [searchTerm, activeCategory]);

  const handleDownloadPDF = () => {
    try {
      window.open('/STUDENT_HANDBOOK.pdf', '_blank');
    } catch (e) {
      alert("Failed to start handbook download. Please try again.");
    }
  };

  return (
    <div className="dash-page student-handbook animate-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', paddingBottom: '80px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <style>{`
        .handbook-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 28px;
        }
        @media (min-width: 992px) {
          .handbook-grid {
            grid-template-columns: 280px 1fr;
          }
        }
        .guide-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .guide-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent-primary);
          box-shadow: var(--shadow-md);
        }
        .guide-card-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-soft);
          color: var(--accent-primary);
          margin-bottom: 16px;
        }
        .step-item {
          display: flex;
          gap: 12px;
          margin-bottom: 10px;
          font-size: 14.5px;
          line-height: 1.5;
          color: var(--text-secondary);
        }
        .step-number {
          background: var(--border-light);
          border-radius: 50%;
          min-width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .metric-pill {
          background: var(--bg-body);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13.5px;
        }
        .nav-list-item {
          padding: 12px 16px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14.5px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: var(--text-secondary);
        }
        .nav-list-item:hover {
          background: var(--border-light);
          color: var(--text-primary);
        }
        .nav-list-item.active {
          background: var(--accent-soft);
          color: var(--accent-primary);
        }
      `}</style>

      {/* Glow Backdrops */}
      <div style={{ position: 'absolute', top: 0, right: '10%', width: '320px', height: '320px', backgroundColor: 'rgba(37, 99, 235, 0.03)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none', zIndex: -1 }} />
      <div style={{ position: 'absolute', bottom: '15%', left: '5%', width: '280px', height: '280px', backgroundColor: 'rgba(16, 185, 129, 0.03)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none', zIndex: -1 }} />

      {/* Premium Header */}
      <div style={{ position: 'relative', padding: '32px', borderRadius: '24px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.03, pointerEvents: 'none', color: 'var(--accent-primary)' }}>
          <BookOpen size={160} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', mdFlexDirection: 'row', justifyContent: 'space-between', zIndex: 1, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={32} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="badge badge-info" style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Student Resources
                </span>
                <span className="badge badge-success" style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Sparkles size={8} /> Active Guide
                </span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: 850, margin: 0, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Student Portal Handbook
              </h1>
              <p style={{ margin: '6px 0 0 0', fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '750px', lineHeight: '1.5' }}>
                A simple guide to help you use the placement portal, update your resume, apply for jobs, and clear your tests.
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleDownloadPDF} 
            className="btn btn-outline" 
            style={{ 
              alignSelf: 'flex-start', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '12px 18px', 
              borderRadius: '12px', 
              fontWeight: 700, 
              fontSize: '14px',
              border: '1.5px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
              e.currentTarget.style.color = 'var(--accent-primary)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
          >
            <Download size={16} /> Download Offline PDF
          </button>
        </div>
      </div>

      {/* Top Filter and Search Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
        {/* Category Selector */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {['All', 'General', 'Career', 'Preparation', 'Support'].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                border: 'none',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: activeCategory === cat ? 'var(--accent-primary)' : 'transparent',
                color: activeCategory === cat ? '#ffffff' : 'var(--text-secondary)'
              }}
              onMouseOver={(e) => {
                if (activeCategory !== cat) e.currentTarget.style.backgroundColor = 'var(--border-light)';
              }}
              onMouseOut={(e) => {
                if (activeCategory !== cat) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search guidelines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px 10px 42px',
              borderRadius: '12px',
              border: '1.5px solid var(--border-color)',
              backgroundColor: 'var(--bg-input)',
              fontSize: '14px',
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
          />
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="handbook-grid">
        {/* Left Side: Sidebar Jump-To Menu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content', position: 'sticky', top: '100px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>
              Jump To Section
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredData.map(category => (
                <div key={category.category} style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', padding: '4px 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {category.category}
                  </div>
                  {category.items.map(item => (
                    <div
                      key={item.id}
                      className={`nav-list-item ${selectedItem === item.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedItem(item.id);
                        const element = document.getElementById(item.id);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.icon}
                        <span>{item.title}</span>
                      </div>
                      <ChevronRight size={14} style={{ opacity: 0.5 }} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Notice Panel */}
          <div style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.02) 0%, rgba(16, 185, 129, 0.02) 100%)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '14.5px' }}>
              <ShieldAlert size={18} /> Rules to Remember
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              You are bound by the <strong>One-Student-One-Job</strong> rule and exam integrity rules. Academic updates are checked and verified by administrators.
            </p>
          </div>
        </div>

        {/* Right Side: Guide Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {filteredData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 32px', background: 'var(--bg-card)', border: '1.5px dashed var(--border-color)', borderRadius: '24px' }}>
              <Search size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>No results found</h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Try searching for something else or changing categories.</p>
            </div>
          ) : (
            filteredData.map(category => (
              <div key={category.category} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {category.category} Sections
                  </h2>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {category.items.map(item => (
                    <div 
                      key={item.id} 
                      id={item.id} 
                      className="guide-card"
                      style={{
                        borderLeft: selectedItem === item.id ? '5px solid var(--accent-primary)' : '1px solid var(--border-color)'
                      }}
                    >
                      {/* Title & Icon Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="guide-card-icon-wrapper">
                            {item.icon}
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                              {item.title}
                            </h3>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Route: /student/{item.id === 'dashboard' ? '' : item.id === 'support-guide' ? 'handbook' : item.id}
                            </span>
                          </div>
                        </div>

                        {item.warnings && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', fontSize: '11px', fontWeight: 800, padding: '6px 12px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <AlertTriangle size={12} /> Rules Alert
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                        {item.description}
                      </p>

                      {/* Two Column details: Metrics & How To Use */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', mdGridTemplateColumns: '1fr 1fr' }}>
                        {/* Metrics/Fields column */}
                        {item.metrics && item.metrics.length > 0 && (
                          <div>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Key Terms & Info
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {item.metrics.map((metric, i) => (
                                <div key={i} className="metric-pill">
                                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
                                    {metric.name}
                                  </strong>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px', lineHeight: 1.4 }}>
                                    {metric.desc}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Steps Column */}
                        <div>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            How to use
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {item.steps.map((step, idx) => (
                              <div key={idx} className="step-item">
                                <span className="step-number">{idx + 1}</span>
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Warnings / Tip Callout box */}
                      {(item.warnings || item.tips) && (
                        <div 
                          style={{ 
                            marginTop: '20px', 
                            padding: '16px', 
                            borderRadius: '12px', 
                            backgroundColor: item.warnings ? 'rgba(239, 68, 68, 0.04)' : 'rgba(16, 185, 129, 0.04)',
                            border: `1px solid ${item.warnings ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`,
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                          }}
                        >
                          <div style={{ color: item.warnings ? 'var(--danger)' : 'var(--success)', marginTop: '2px' }}>
                            {item.warnings ? <AlertTriangle size={18} /> : <Info size={18} />}
                          </div>
                          <div>
                            <strong style={{ color: item.warnings ? 'var(--danger)' : 'var(--success)', display: 'block', fontSize: '13.5px', marginBottom: '4px' }}>
                              {item.warnings ? 'Important Rule' : 'Helpful Tip'}
                            </strong>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                              {item.warnings || item.tips}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
