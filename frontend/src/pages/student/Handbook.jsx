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
        description: 'The centralized Student Command Center. Offers an overview of application counts, profile completeness, interview timelines, and active notices.',
        metrics: [
          { name: 'Total Applications', desc: 'The count of job/internship profiles you have applied for.' },
          { name: 'Active Processes', desc: 'Applications currently in review or actively undergoing recruitment rounds.' },
          { name: 'Placement Status', desc: 'Your portal status: Unplaced (actively looking), Placed (received offer), or Accepted (accepted offer).' },
          { name: 'Profile Completion Meter', desc: 'Visual indicator of your profile completeness (0-100%). Keep this at 100% to remain eligible!' }
        ],
        steps: [
          'Scan the overview cards at the top of the page for quick stats.',
          'Review the upcoming interviews timeline to prepare for the day.',
          'Check the recent notifications feed for urgent announcements from the Placement Cell.',
          'Click any summary card to navigate to its respective details.'
        ],
        tips: 'Keep your Profile Completion Meter at 100%. Some recruiters filter students by completion score before even reading resumes.',
        type: 'info'
      },
      {
        id: 'profile',
        title: 'My Profile',
        icon: <User size={20} />,
        description: 'Your academic portfolio and digital resume. This is what recruiters see when you apply to placements.',
        metrics: [
          { name: 'CGPA', desc: 'Cumulative Grade Point Average. Auto-verified against university databases for company cut-offs.' },
          { name: 'Active Backlogs', desc: 'Count of uncleared papers. Crucial metric, as most top-tier companies require zero active backlogs.' },
          { name: 'Stream & Course', desc: 'Your academic program (e.g. BCA, B.Sc. IT). Automatically filters job postings.' },
          { name: 'Skills & Projects', desc: 'Your tech-stack keywords and details of personal or academic projects.' }
        ],
        steps: [
          'Navigate to My Profile from the sidebar menu.',
          'Ensure Personal Details (phone, email) are updated and active.',
          'Under Education, check that your CGPA and Class 10/12 details are correct.',
          'Add your projects, internship experience, and technical skills.',
          'Click the Save Profile button at the bottom of each section.'
        ],
        warnings: 'Falsifying grades or backlog status will lead to automatic disqualification and permanent blacklisting from all campus placement activities.',
        type: 'warning'
      },
      {
        id: 'notifications',
        title: 'Notifications',
        icon: <Bell size={20} />,
        description: 'Real-time notifications, announcements, and feedback on your application stages from the Placement Cell.',
        metrics: [
          { name: 'Important Alert (Orange)', desc: 'Urgent notices, such as deadline changes or emergency schedules.' },
          { name: 'Info Alert (Blue)', desc: 'General announcements and system/resource notifications.' },
          { name: 'Shortlist Alert (Green)', desc: 'Notices indicating you have passed to a new interview stage or got selected.' }
        ],
        steps: [
          'Click the Bell icon in the top header, or select Notifications from the sidebar.',
          'Click a notification to read its details or visit the corresponding page.',
          'Use the "Mark as Read" or "Mark All Read" options to keep your inbox organized.'
        ],
        tips: 'Enable push notifications if prompted, or check this tab at least twice daily during active placement weeks.',
        type: 'info'
      },
      {
        id: 'sessions',
        title: 'My Sessions',
        icon: <Video size={20} />,
        description: 'Access links to virtual placement classes, preparation bootcamps, and online Zoom interviews.',
        metrics: [
          { name: 'Join Button', desc: 'Becomes active exactly 15 minutes prior to the scheduled start time.' },
          { name: 'Auto-Attendance logging', desc: 'The portal logs your check-in and check-out times automatically via Zoom webhooks.' }
        ],
        steps: [
          'Go to the My Sessions page on the portal.',
          'Locate the scheduled training session or Zoom interview for the day.',
          'Click the blue "Join Session" button.',
          'Stay logged in for the duration of the meeting to ensure your attendance is counted.'
        ],
        warnings: 'Failure to join scheduled online interviews without a 24-hour advance medical notice results in automatic suspension from the next three placement drives.',
        type: 'danger'
      },
      {
        id: 'north-star',
        title: 'Project North Star',
        icon: <Star size={20} />,
        description: 'iLEAD’s flag-ship Learning Management System (LMS) and student development track. Focuses on bridging industry gaps.',
        metrics: [
          { name: 'Training Modules', desc: 'Interactive lessons on soft skills, coding, and aptitude preparation.' },
          { name: 'Certifications', desc: 'Earn verified credentials upon module completion to showcase on your profile.' }
        ],
        steps: [
          'Open Project North Star from the sidebar.',
          'Browse the learning paths assigned to your course/batch.',
          'Complete lessons, quizzes, and micro-projects at your own pace.',
          'Download your certificates to automatically attach them to your resumes.'
        ],
        tips: 'Completing North Star modules unlocks special recommendation tags on your student profile visible to premium employers.',
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
        description: 'Manage your professional resumes. Build standard profiles using our interactive builder templates or upload external PDFs.',
        metrics: [
          { name: 'Primary Resume', desc: 'The default resume submitted when applying to any job. Marked with a yellow star.' },
          { name: 'PDF Upload Limit', desc: 'Only standard PDF format is allowed. File size must not exceed 2MB.' },
          { name: 'Resume Templates', desc: 'Clean, ATS-friendly designs built dynamically from your profile details.' }
        ],
        steps: [
          'Navigate to My Resumes.',
          'To upload: Click "Upload PDF", drag and drop your file, and click upload.',
          'To build: Click "Create Resume", fill in the interactive fields, and choose a template layout.',
          'Ensure you click the Star icon next to your best resume to mark it as Primary.'
        ],
        tips: 'Review your primary resume preview carefully. An ATS-friendly format increases your shortlisting chances by 40%.',
        type: 'info'
      },
      {
        id: 'applications',
        title: 'My Applications',
        icon: <ClipboardList size={20} />,
        description: 'Track the real-time status of all placement and internship applications you have submitted.',
        metrics: [
          { name: 'Applied (Blue)', desc: 'Application successfully logged. Recruiter review pending.' },
          { name: 'Shortlisted (Purple)', desc: 'Profile approved. Proceeding to tests/interviews.' },
          { name: 'Interviewing (Orange)', desc: 'Active recruitment rounds scheduled.' },
          { name: 'Selected (Green)', desc: 'Offer extended. Congratulations!' },
          { name: 'Rejected (Red)', desc: 'Application did not clear a specific selection round.' }
        ],
        steps: [
          'Navigate to My Applications to view the list of companies.',
          'Click "View Details" to see the step-by-step pipeline visualizer.',
          'View round-wise evaluation status and recruiter feedback comments.'
        ],
        tips: 'Read recruiter feedback carefully in case of rejection; it contains valuable hints for future interviews.',
        type: 'info'
      },
      {
        id: 'jobs',
        title: 'Jobs',
        icon: <Briefcase size={20} />,
        description: 'Explore active corporate campus job openings matching your eligibility criteria.',
        metrics: [
          { name: 'Compensation (CTC)', desc: 'Annual package offered (e.g. ₹6.5 LPA).' },
          { name: 'Eligibility Status', desc: 'Real-time check on your CGPA, streams, and backlog count compared to company rules.' },
          { name: 'Job Description (JD)', desc: 'Required tech-stack, job role details, and working terms.' }
        ],
        steps: [
          'Navigate to Jobs.',
          'Use filters to narrow down roles by tech, location, or CTC range.',
          'Click a job card to view eligibility criteria (red cross or green checkmarks).',
          'If eligible, click "Apply Now", select a resume, and submit.'
        ],
        warnings: 'The portal enforces a One-Student-One-Job policy. Once you are marked "Selected" for a job, you cannot apply to other drives unless a special upgrade tier is approved by the placement cell.',
        type: 'warning'
      },
      {
        id: 'internships',
        title: 'Internships',
        icon: <Briefcase size={20} />,
        description: 'Find internship postings to gain real-world industry experience during your academic tenure.',
        metrics: [
          { name: 'Stipend', desc: 'Monthly compensation offered during the internship period.' },
          { name: 'Duration', desc: 'Internship length, typically ranging from 2 to 6 months.' },
          { name: 'PPO Opportunity', desc: 'Indicates whether high-performing interns can receive a Pre-Placement Offer (Full-time).' }
        ],
        steps: [
          'Navigate to Internships from the sidebar.',
          'Read the JD and ensure your availability matching the internship duration.',
          'Click "Apply Now" with your primary resume.',
          'Track selection rounds on your applications dashboard.'
        ],
        tips: 'If you secure an external or portal internship that converts to a PPO, you must report it to the coordinator within 24 hours.',
        type: 'info'
      },
      {
        id: 'job-feed',
        title: 'Job Feed',
        icon: <Rss size={20} />,
        description: 'Aggregated external job opportunities crawled from verified public sources. Perfect for off-campus preparation.',
        metrics: [
          { name: 'Source', desc: 'Verified jobs fetched from LinkedIn, Indeed, and top corporate career pages.' },
          { name: 'External Link', desc: 'Direct link to apply on the company career portal.' }
        ],
        steps: [
          'Navigate to Job Feed.',
          'Use keyword search to filter external jobs matching your skills.',
          'Click "Apply on Company Site" to proceed to their official application portal.'
        ],
        tips: 'Since external jobs do not auto-sync recruitment status, bookmark these to keep a manual checklist of your off-campus applications.',
        type: 'success'
      },
      {
        id: 'saved-jobs',
        title: 'Saved Jobs',
        icon: <Bookmark size={20} />,
        description: 'Your personal clipboard of job and internship listings. Bookmark postings to review or apply to them later.',
        metrics: [
          { name: 'Bookmarks', desc: 'Quick links to active openings you want to monitor.' }
        ],
        steps: [
          'Browse Jobs or Internships on the portal.',
          'Click the Bookmark ribbon icon on any card to save it.',
          'Retrieve them anytime in the Saved Jobs page to apply before deadlines expire.'
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
        description: 'Mandatory online preparation tests, MCQs, and programming assignments assigned to your batch.',
        metrics: [
          { name: 'Proctoring Strikes', desc: 'Anti-cheating detection count. Tracks tab-switching or escaping fullscreen.' },
          { name: 'Fullscreen Mandate', desc: 'Tests run in forced fullscreen. Exiting fullscreen logs a strike.' },
          { name: 'Automatic Submission', desc: 'If 3 strikes are logged, the test submits automatically and records a failing grade.' }
        ],
        steps: [
          'Navigate to Assignments.',
          'Select an active test and read the instructions carefully.',
          'Close all other browser tabs, messenger apps, and IDEs.',
          'Click "Start Test" (it will trigger fullscreen mode).',
          'Complete and submit the test within the timer limit.'
        ],
        warnings: 'Strict anti-cheat is active. Switch tabs, minimize the browser, or exit fullscreen 3 times, and your test will terminate immediately with a score of 0.',
        type: 'danger'
      },
      {
        id: 'mock-interview',
        title: 'Mock Interview',
        icon: <Mic size={20} />,
        description: 'An AI-powered voice mock interview simulator. Practice interviews tailored to specific job roles.',
        metrics: [
          { name: 'AI Interviewer', desc: 'Dynamic text-to-speech engine asking role-specific technical questions.' },
          { name: 'Overall Score', desc: 'Percentage grading based on keyword relevance, communication, and correctness.' },
          { name: 'Skill Gap Analysis', desc: 'Personalized recommendations of coding topics or concepts you need to revise.' }
        ],
        steps: [
          'Navigate to Mock Interview.',
          'Enter the Target Job Title (e.g. "React developer") and a sample Job Description.',
          'Grant microphone permissions and click "Start Interview".',
          'Listen to the AI question, record your voice response, and click Next.',
          'After 5 questions, submit to receive your dashboard report and feedback.'
        ],
        tips: 'Complete at least two mock interviews before your actual corporate round to significantly boost your confidence and speech clarity.',
        type: 'success'
      }
    ]
  },
  {
    category: 'Support',
    items: [
      {
        id: 'faq',
        title: 'FAQ & Policy',
        icon: <HelpCircle size={20} />,
        description: 'The central knowledge base covering academic policies, eligibility rules, and contact information for queries.',
        metrics: [
          { name: 'Knowledge Base', desc: 'Categorized QA covering common questions about portal features.' },
          { name: 'Policy Handbook', desc: 'Downloadable PDF handbook with official placement cell bylaws.' }
        ],
        steps: [
          'Navigate to FAQ & Policy.',
          'Use the Search Bar to find quick answers (e.g. searching "PPO").',
          'Review the Placement Policies tabs to understand student obligations.'
        ],
        tips: 'If you have an urgent grievance or bug report, look for the coordinator contacts listed on the FAQ sidebar.',
        type: 'info'
      }
    ]
  }
];

export default function StudentHandbook() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState(null);

  // Filter sections based on search and category
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
            <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifycontent: 'center' }}>
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
                Student Command Center Handbook
              </h1>
              <p style={{ margin: '6px 0 0 0', fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '750px', lineHeight: '1.5' }}>
                Learn how to effectively use each sidebar feature of the placement portal, track your eligibility requirements, upload resumes, and clear evaluation stages.
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
            placeholder="Search guidelines & features..."
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
              <ShieldAlert size={18} /> Important Policy Reminder
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Students are strictly bound by the <strong>One-Student-One-Job</strong> directive and proctoring rules. Active academic updates (CGPA/Backlogs) are locked and verified by administrators.
            </p>
          </div>
        </div>

        {/* Right Side: Guide Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {filteredData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 32px', background: 'var(--bg-card)', border: '1.5px dashed var(--border-color)', borderRadius: '24px' }}>
              <Search size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>No matching sections found</h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Try clearing your search or filtering by another category.</p>
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
                              Route: /student/{item.id === 'dashboard' ? '' : item.id}
                            </span>
                          </div>
                        </div>

                        {item.warnings && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', fontSize: '11px', fontWeight: 800, padding: '6px 12px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <AlertTriangle size={12} /> Compliance Required
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
                              Key Terms & Metrics
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
                            How to Use
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
                              {item.warnings ? 'Compliance Warning' : 'Portal Pro-Tip'}
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
