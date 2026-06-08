// src/pages/FAQ.jsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  Award, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  HelpCircle as HelpIcon, 
  Download, 
  Phone, 
  Mail as MailIcon, 
  Calendar, 
  MapPin 
} from 'lucide-react';

const FAQ_DATA = [
  {
    category: "Eligibility & CGPA",
    icon: <ShieldCheck size={18} />,
    questions: [
      {
        id: "elig-1",
        q: "Who is eligible for campus placement drives?",
        a: "All final-year students of UG and PG courses who meet the specific eligibility criteria set by the recruiting company are eligible. Generally, students must maintain a minimum CGPA of 6.0 and have no active backlogs."
      },
      {
        id: "elig-2",
        q: "Do backlog papers affect my placement eligibility?",
        a: "Yes, most premium (Category A and B) companies require students to have zero active backlogs at the time of recruitment. However, some companies may allow students with 1 active backlog subject to clearance before joining. It is highly recommended to clear all backlogs beforehand."
      },
      {
        id: "elig-3",
        q: "Can I apply to companies if my CGPA is slightly below their requirement?",
        a: "No, company CGPA criteria are strictly enforced by the backend eligibility engine. The system automatically locks applications for students who do not meet the minimum CGPA threshold specified in the job posting."
      }
    ]
  },
  {
    category: "Placement Policies",
    icon: <Award size={18} />,
    questions: [
      {
        id: "pol-1",
        q: "What is the One-Student-One-Job policy?",
        a: "To ensure fair distribution of opportunities, once a student secures a job offer through the campus placement portal, they are automatically placed in the 'Selected' pool and cannot apply for subsequent placement drives. Exceptions are only made for high-tier upgrades (e.g., Category C to Category A) under strict coordinator approval."
      },
      {
        id: "pol-2",
        q: "What is the policy regarding Pre-Placement Offers (PPOs)?",
        a: "If a student secures a Pre-Placement Offer (PPO) during their summer internship, they must immediately report it to the Placement Cell. A PPO is treated as a secured placement under the One-Student-One-Job policy, and the student will be excluded from subsequent campus drives."
      },
      {
        id: "pol-3",
        q: "Can I reject a placement offer after being selected?",
        a: "Rejecting a campus placement offer is highly discouraged as it affects the college's relationship with the employer. Rejection of an offer without a valid, documented emergency may lead to suspension from the placement portal."
      }
    ]
  },
  {
    category: "Attendance & Conduct",
    icon: <AlertTriangle size={18} />,
    questions: [
      {
        id: "cond-1",
        q: "Is attendance mandatory after registering for a recruitment drive?",
        a: "Yes, once you register for a company drive, attendance in all selection rounds (Pre-Placement Talk, Aptitude Test, Interviews) is absolutely mandatory. Absenteeism without a written, validated medical emergency 24 hours in advance will result in immediate suspension from the next three consecutive company drives."
      },
      {
        id: "cond-2",
        q: "What is the expected code of conduct and dress code?",
        a: "Students must wear official college formal attire for all placement rounds, whether online or offline. Punctuality is critical; latecomers will be barred from entry. Professional conduct, integrity, and absolute honesty in resumes and interviews are strictly monitored."
      },
      {
        id: "cond-3",
        q: "What happens if I upload false information on my profile?",
        a: "Uploading falsified CGPA, courses, streams, or resumes is a severe offense. The verification team matches student profiles with official university records. Any discrepancy will result in immediate and permanent blacklisting from all future placement opportunities, along with disciplinary action."
      }
    ]
  }
];

export default function FAQ() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedIds, setExpandedIds] = useState([]);

  // Toggle Accordion Item
  const toggleExpand = (id) => {
    if (expandedIds.includes(id)) {
      setExpandedIds(expandedIds.filter(item => item !== id));
    } else {
      setExpandedIds([...expandedIds, id]);
    }
  };

  // Filter FAQs based on search and category
  const filteredFAQ = useMemo(() => {
    return FAQ_DATA.map(group => {
      const matchingQuestions = group.questions.filter(item => {
        const matchesSearch = item.q.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             item.a.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || group.category === selectedCategory;
        return matchesSearch && matchesCategory;
      });

      return {
        ...group,
        questions: matchingQuestions
      };
    }).filter(group => group.questions.length > 0);
  }, [searchTerm, selectedCategory]);

  return (
    <div className="dash-page faq-page animate-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', paddingBottom: '80px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <style>{`
        .faq-grid-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          align-items: start;
        }
        @media (min-width: 1024px) {
          .faq-grid-container {
            grid-template-columns: 1fr 340px;
          }
        }
        .faq-accordion-item {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .faq-accordion-item:hover {
          transform: translateY(-2px);
          border-color: var(--accent-primary) !important;
          box-shadow: 0 12px 20px -8px rgba(37, 99, 235, 0.15) !important;
        }
        .faq-side-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .faq-side-card:hover {
          transform: translateY(-3px);
          border-color: var(--accent-primary) !important;
          box-shadow: var(--shadow-md) !important;
        }
        .faq-pill-button {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .faq-pill-button:hover:not(.active-pill) {
          background-color: var(--border-color) !important;
          color: var(--text-primary) !important;
        }
      `}</style>

      {/* Background Glows */}
      <div style={{ position: 'absolute', top: 0, right: '10%', width: '320px', height: '320px', backgroundColor: 'rgba(37, 99, 235, 0.04)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none', zIndex: -10 }} />
      <div style={{ position: 'absolute', bottom: '20%', left: '5%', width: '280px', height: '280px', backgroundColor: 'rgba(16, 185, 129, 0.04)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none', zIndex: -10 }} />

      {/* Page Header */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '32px', borderRadius: '24px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.04, pointerEvents: 'none', color: 'var(--accent-primary)' }}>
          <HelpIcon size={160} />
        </div>
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '18px', borderRadius: '20px', backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(37, 99, 235, 0.08)' }}>
            <FileText size={36} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: '800', letterSpacing: '1px', padding: '4px 10px' }}>
                Rules & FAQ
              </span>
              <span className="badge badge-success" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: '800', letterSpacing: '1px', padding: '4px 10px' }}>
                Official Guidelines
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-heading)', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              Placement Policy & Regulations
            </h1>
            <p className="text-secondary" style={{ marginTop: '6px', fontSize: '15px', maxWidth: '700px', lineHeight: '1.6' }}>
              Read the official university guidelines regarding eligibility criteria, attendance requirements, and the code of conduct for placements.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="faq-grid-container">
        {/* Left Side: FAQs list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Filter and Search Bar Row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Modern Pill Category Filter */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', alignSelf: 'start' }}>
              {['All', 'Eligibility & CGPA', 'Placement Policies', 'Attendance & Conduct'].map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`faq-pill-button ${isActive ? 'active-pill' : ''}`}
                    style={{
                      background: isActive ? 'var(--accent-gradient)' : 'transparent',
                      color: isActive ? 'white' : 'var(--text-secondary)',
                      border: 'none',
                      outline: 'none',
                      cursor: 'pointer',
                      padding: '8px 16px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '800',
                      boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none',
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Premium Search Input */}
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                placeholder="Search guidelines and policy rules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ padding: '14px 16px 14px 44px', fontSize: '13px', borderRadius: '14px', border: '1px solid var(--border-color)', width: '100%', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '800', color: 'var(--accent-primary)' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Accordion Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {filteredFAQ.length === 0 ? (
              <div className="card text-center text-secondary" style={{ padding: '48px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', borderRadius: '24px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ padding: '16px', backgroundColor: 'var(--border-light)', color: 'var(--text-muted)', borderRadius: '50%', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <HelpIcon size={36} strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-bold text-primary">No Matching Guidelines Found</h3>
                <p className="text-sm mt-1">Try resetting your category filter or modifying your search term.</p>
                <button 
                  onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
                  className="btn btn-secondary"
                  style={{ marginTop: '16px', padding: '10px 24px', fontSize: '11px', fontWeight: '850', borderRadius: '12px' }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredFAQ.map((group) => (
                <div key={group.category} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                      {group.icon}
                    </div>
                    <h2 className="text-xl font-extrabold text-primary font-heading tracking-tight" style={{ margin: 0 }}>{group.category}</h2>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {group.questions.map((item) => {
                      const isExpanded = expandedIds.includes(item.id);
                      return (
                        <div 
                          key={item.id}
                          className="faq-accordion-item"
                          style={{
                            background: 'var(--bg-card)',
                            borderRadius: '16px',
                            border: isExpanded ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            boxShadow: isExpanded ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Accordion Trigger */}
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              width: '100%',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '18px 24px',
                              cursor: 'pointer',
                              outline: 'none',
                              color: 'var(--text-primary)',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', paddingRight: '16px' }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: isExpanded ? 'var(--accent-primary)' : 'var(--accent-soft)',
                                color: isExpanded ? 'white' : 'var(--accent-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.25s',
                                flexShrink: 0
                              }}>
                                <HelpCircle size={14} />
                              </div>
                              <span style={{
                                fontSize: '14px',
                                fontWeight: '750',
                                fontFamily: 'var(--font-heading)',
                                color: isExpanded ? 'var(--accent-primary-dark)' : 'var(--text-primary)',
                                letterSpacing: '-0.01em',
                                lineHeight: '1.4'
                              }}>
                                {item.q}
                              </span>
                            </div>
                            <div style={{
                              color: isExpanded ? 'var(--accent-primary)' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              flexShrink: 0
                            }}>
                              <ChevronDown size={18} />
                            </div>
                          </button>

                          {/* Accordion Collapsible Panel */}
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                              >
                                <div style={{
                                  padding: '0 24px 20px 66px',
                                  fontSize: '13.5px',
                                  lineHeight: '1.75',
                                  color: 'var(--text-secondary)',
                                  fontWeight: '500',
                                  backgroundColor: 'rgba(37, 99, 235, 0.005)'
                                }}>
                                  {item.a}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card 1: Official handbook download */}
          <div className="faq-side-card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px', boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Download size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Policy Handbook</h4>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Official Placement PDF</span>
              </div>
            </div>
            
            <p className="text-secondary" style={{ fontSize: '12.5px', lineHeight: '1.6', margin: '0 0 16px' }}>
              Download the complete physical copy of the placement handbook containing standard declarations and verification documents.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>File Version</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>v2026.1.2</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>File Size</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>1.42 MB (PDF)</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => alert("Placement policy handbook download initiated!")}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Download size={14} /> Download PDF
            </button>
          </div>

          {/* Card 2: Help Desk & Support */}
          <div className="faq-side-card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={16} style={{ color: 'var(--accent-primary)' }} />
              Placement Helpdesk
            </h4>
            
            <p className="text-secondary" style={{ fontSize: '12.5px', lineHeight: '1.6', margin: '0 0 20px' }}>
              Have questions regarding placement rules, special upgrades, or blacklists? Get in touch with our cell coordinators.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                <Phone size={14} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Helpline Numbers</div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>+91 33 2441 5562</div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)' }}>+91 98302 44556</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                <MailIcon size={14} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Official Email</div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>placements@ilead.edu.in</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                <MapPin size={14} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Office Location</div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>iLEAD Campus, 1st Floor<br />Placement Cell Section</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Notice regarding orientation */}
          <div className="faq-side-card" style={{ padding: '20px', backgroundColor: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h5 style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: '900', color: '#d97706', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} />
              Upcoming Orientation
            </h5>
            <div style={{ fontSize: '13px', fontWeight: '850', color: 'var(--text-primary)', marginBottom: '4px' }}>Mandatory Policy Briefing</div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: '1.5' }}>
              All final-year candidates must attend the policy briefing on May 30th, 2026, at 11:00 AM in the Auditorium.
            </p>
            <span style={{ fontSize: '10px', fontWeight: '850', textTransform: 'uppercase', color: '#d97706', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
              Attendance Compulsory
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

