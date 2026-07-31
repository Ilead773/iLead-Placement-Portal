import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  LayoutDashboard,
  User,
  Bell,
  FileText,
  ClipboardList,
  Briefcase,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Download,
  Info
} from 'lucide-react';

const SECTIONS_DATA = [
  {
    category: 'General',
    items: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        icon: <LayoutDashboard size={20} />,
        image: '/handbook_screenshots/dashboard.png',
        description: 'Your main page showing your college details, CGPA, Attendance, profile readiness meter, recent announcements, and active job applications progress.',
        metrics: [
          { name: 'Profile Readiness', desc: 'Shows how complete your profile is (must be 100% complete to apply for jobs).' },
          { name: 'Applications Pipeline', desc: 'Shows the step-by-step progress of jobs you have applied to.' },
          { name: 'CGPA & Attendance', desc: 'Displays your current CGPA and attendance percentage.' },
          { name: 'Inbox Alerts', desc: 'Shows updates from the placement office.' }
        ],
        steps: [
          'Open the portal to view the dashboard page.',
          'Verify that your Profile Readiness is at 100% complete.',
          'Check your CGPA and Attendance cards.',
          'Look at the active Applications Pipeline in the center.',
          'Read the Inbox Alerts for any announcement.'
        ],
        tips: 'Always make sure your profile readiness is 100% complete so you can apply for jobs.',
        type: 'info'
      },
      {
        id: 'profile',
        title: 'My Profile',
        icon: <User size={20} />,
        image: '/handbook_screenshots/profile.png',
        description: 'Your educational portfolio containing your name, location, graduation year, experience, degrees, projects, and skills.',
        metrics: [
          { name: 'Basic Info', desc: 'Your name, year of study, location, phone, and email.' },
          { name: 'Education & Experience', desc: 'Lists your MAKAUT degree GPA, Class XII, Class X marks, and previous internships.' }
        ],
        steps: [
          'Click My Profile in the menu.',
          'Click Edit on Basic Info to enter your location and phone number.',
          'Click Add under Experience to enter your past internships.',
          'Click Add or Edit under Education to enter your MAKAUT GPA, Class 12, and Class 10 marks.',
          'Scroll down to list your technical skills and academic projects, then click Save.'
        ],
        tips: 'Ensure your phone number is correct so coordinators can contact you.',
        type: 'info'
      },
      {
        id: 'notifications',
        title: 'Notifications',
        icon: <Bell size={20} />,
        image: '/handbook_screenshots/notifications.png',
        description: 'The updates feed showing messages and announcements sent by the placement team.',
        metrics: [
          { name: 'Announcements Feed', desc: 'Lists all notifications chronologically.' }
        ],
        steps: [
          'Click Notifications in the menu.',
          'View the list of announcements from the placement office.',
          'Click on a notification card to read the details.'
        ],
        tips: 'Check notifications daily to stay updated with deadlines.',
        type: 'info'
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
        image: '/handbook_screenshots/resumes.png',
        description: 'The section where you build your university-approved resumes using official templates.',
        metrics: [
          { name: 'Profile Prerequisite', desc: 'You must fill out your profile details (Basic Info, Education, Experience) before building a resume, as the builder automatically extracts your profile details to generate your resume.' },
          { name: 'Resume Limit', desc: 'You can create and save a maximum of 5 resumes in the portal.' },
          { name: 'Available Templates', desc: 'Layouts styled according to guidelines (e.g. iLEAD Kolkata Standard).' },
          { name: 'Document History', desc: 'List of resumes you have generated.' },
          { name: 'Active Resume', desc: 'The selected resume used for job applications. Only one resume can be active at a time.' }
        ],
        steps: [
          'Make sure your profile details are fully filled out under My Profile.',
          'Click My Resumes in the menu.',
          'Hover over the template (like iLEAD Kolkata Standard) and click Use Template.',
          'Fill in the resume form details and click Generate.',
          'Locate your preferred resume in the Document History table (ensure you have not exceeded the 5 resume limit).',
          'Click Set Active next to the resume you want to use. This makes it your main resume and applies a green ACTIVE tag.'
        ],
        tips: 'The Set Active option is very important. When you apply for a job, the portal automatically sends the resume marked as ACTIVE. Make sure you set the correct resume as active before applying.',
        type: 'info'
      },
      {
        id: 'jobs',
        title: 'Jobs',
        icon: <Briefcase size={20} />,
        image: '/handbook_screenshots/jobs.png',
        description: 'The job opportunities board where you can view and apply for active full-time job openings.',
        metrics: [
          { name: 'Stipend / CTC', desc: 'Salary package details for the job.' },
          { name: 'Button Status', desc: 'APPLY NOW (to apply), APPLIED (submitted), EXPIRED/CLOSED (passed deadline).' }
        ],
        steps: [
          'Click Jobs in the menu.',
          'Tap on any job card to open and view the description, CTC, location, and requirements.',
          'Select the resume you want to send from the list.',
          'Click Apply. The button will change to green APPLIED.'
        ],
        tips: 'Tap on a job card to read the description and requirements before applying.',
        type: 'info'
      },
      {
        id: 'internships',
        title: 'Internships',
        icon: <Briefcase size={20} />,
        image: '/handbook_screenshots/jobs.png',
        description: 'The internships opportunities board where you can view and apply for short-term internships.',
        metrics: [
          { name: 'Stipend & Duration', desc: 'Monthly stipend and duration in months.' },
          { name: 'Button Status', desc: 'APPLY NOW (to apply), APPLIED (submitted), EXPIRED/CLOSED (passed deadline).' }
        ],
        steps: [
          'Click Internships in the menu.',
          'Tap on any internship card to open and view the description, stipend, and duration.',
          'Select the resume you want to send from the list.',
          'Click Apply. The button will change to green APPLIED.'
        ],
        tips: 'Ensure you can commit to the full duration of the internship before applying.',
        type: 'info'
      },
      {
        id: 'applications',
        title: 'My Applications',
        icon: <ClipboardList size={20} />,
        image: '/handbook_screenshots/applications.png',
        description: 'The dashboard tracking all your submitted applications and recruitment stages.',
        metrics: [
          { name: 'Status Cards', desc: 'Displays counts of total applications, active processes, and placements.' },
          { name: 'Applications Table', desc: 'Lists job roles, companies, applied dates, round progress, and overall status.' },
          { name: 'Track Application', desc: 'Button to open and check scheduled interview dates.' }
        ],
        steps: [
          'Click My Applications in the menu.',
          'Scan the status cards at the top.',
          'Locate your application in the table to see its status (Applied, Shortlisted, Placed, or Rejected).',
          'Click Track Application next to a job to view scheduled interview dates.'
        ],
        tips: 'Track your application status to know when upcoming interview rounds are scheduled.',
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
            grid-template-columns: 290px 1fr;
          }
        }
        .guide-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 28px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }
        .guide-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent-primary);
          box-shadow: var(--shadow-md);
        }
        .guide-card-icon-wrapper {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-soft);
          color: var(--accent-primary);
        }
        .step-item {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          font-size: 14.5px;
          line-height: 1.5;
          color: var(--text-secondary);
        }
        .step-number {
          background: var(--border-light);
          border-radius: 50%;
          min-width: 24px;
          height: 24px;
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
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13.5px;
        }
        .nav-list-item {
          padding: 12px 16px;
          border-radius: 12px;
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
        .handbook-img-container {
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-sm);
          transition: transform 0.3s ease;
          background: var(--bg-body);
          margin-bottom: 24px;
        }
        .handbook-img-container:hover {
          transform: scale(1.008);
          border-color: var(--accent-primary);
        }
        .flow-arrow {
          display: inline-flex;
          align-items: center;
          color: var(--accent-primary);
          margin: 0 4px;
          vertical-align: middle;
        }
      `}</style>

      {/* Glow Backdrops */}
      <div style={{ position: 'absolute', top: 0, right: '10%', width: '320px', height: '320px', backgroundColor: 'rgba(37, 99, 235, 0.03)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none', zIndex: -1 }} />
      <div style={{ position: 'absolute', bottom: '15%', left: '5%', width: '280px', height: '280px', backgroundColor: 'rgba(16, 185, 129, 0.03)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none', zIndex: -1 }} />

      {/* Premium Header */}
      <div style={{ position: 'relative', padding: '36px', borderRadius: '24px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.03, pointerEvents: 'none', color: 'var(--accent-primary)' }}>
          <BookOpen size={160} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', mdFlexDirection: 'row', justifyContent: 'space-between', zIndex: 1, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ padding: '18px', borderRadius: '18px', backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyCentent: 'center' }}>
              <BookOpen size={36} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="badge badge-info" style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Student Manual
                </span>
                <span className="badge badge-success" style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Sparkles size={8} /> Interactive Handbook
                </span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', fontWeight: 900, margin: 0, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Student User Manual
              </h1>
              <p style={{ margin: '8px 0 0 0', fontSize: '15.5px', color: 'var(--text-secondary)', maxWidth: '800px', lineHeight: '1.5' }}>
                An intuitive, visual guide with screenshots and steps to help you navigate the student portal.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Filter and Search Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
        {/* Category Selector */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {['All', ...SECTIONS_DATA.map(c => c.category)].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                border: 'none',
                padding: '8px 18px',
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
        {/* Left Side: Sidebar Jump-To Menu & PDF Download */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content', position: 'sticky', top: '100px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>
              Jump To Section
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredData.map(category => (
                <div key={category.category} style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', padding: '4px 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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

          {/* PDF Download Panel */}
          <div style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.02) 0%, rgba(16, 185, 129, 0.02) 100%)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontWeight: 800, fontSize: '14.5px' }}>
              <BookOpen size={18} /> Official Manual PDF
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Download the placement cell's certified PDF manual containing screenshots and step-by-step guidelines.
            </p>
            <a 
              href="/STUDENT_HANDBOOK.pdf" 
              download="iLEAD_Student_Handbook.pdf" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px', 
                padding: '12px', 
                borderRadius: '12px', 
                backgroundColor: 'var(--accent-primary)', 
                color: '#ffffff', 
                textDecoration: 'none', 
                fontWeight: '700', 
                fontSize: '13.5px', 
                transition: 'all 0.2s ease', 
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
              }}
            >
              <Download size={16} /> Download PDF Manual
            </a>
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
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>
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
                              URL Route: /student{item.id === 'dashboard' ? '' : `/${item.id}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                        {item.description}
                      </p>

                      {/* Screenshot Image */}
                      {item.image && (
                        <div className="handbook-img-container">
                          <img 
                            src={item.image} 
                            alt={`${item.title} Screenshot`} 
                            style={{ width: '100%', height: 'auto', display: 'block' }} 
                          />
                        </div>
                      )}

                      {/* Two Column details: Metrics & How To Use */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', mdGridTemplateColumns: '1.1fr 0.9fr' }}>
                        
                        {/* Steps Column (Primary Focus) */}
                        <div>
                          <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                            How to use (Steps)
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {item.steps.map((step, idx) => {
                              return (
                                <div key={idx} className="step-item">
                                  <span className="step-number">{idx + 1}</span>
                                  <span>
                                    {step.split('➔').map((chunk, i, arr) => (
                                      <React.Fragment key={i}>
                                        {chunk}
                                        {i < arr.length - 1 && <span className="flow-arrow"><ArrowRight size={13} style={{ margin: '0 2px' }} /></span>}
                                      </React.Fragment>
                                    ))}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Metrics/Fields column */}
                        {item.metrics && item.metrics.length > 0 && (
                          <div>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
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

                      </div>

                      {/* Tips Callout box */}
                      {item.tips && (
                        <div 
                          style={{ 
                            marginTop: '24px', 
                            padding: '16px', 
                            borderRadius: '12px', 
                            backgroundColor: 'var(--accent-soft)',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                          }}
                        >
                          <div style={{ color: 'var(--accent-primary)', marginTop: '2px' }}>
                            <Info size={18} />
                          </div>
                          <div>
                            <strong style={{ color: 'var(--accent-primary)', display: 'block', fontSize: '13.5px', marginBottom: '4px' }}>
                              Helpful Tip
                            </strong>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                              {item.tips}
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
