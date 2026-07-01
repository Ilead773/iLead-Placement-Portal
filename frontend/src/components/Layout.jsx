import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/authStore';
import NotificationBell from './NotificationBell';
import ErrorBoundary from './ErrorBoundary';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  ClipboardList, 
  Send, 
  PlusSquare, 
  FileText, 
  UserCircle, 
  GraduationCap,
  LogOut,
  Command,
  Settings,
  Plus,
  Home,
  User,
  Menu,
  Sun,
  Moon,
  Rss,
  Bookmark,
  Activity,
  Mic,
  MousePointerClick,
  Workflow,
  Bell,
  HelpCircle,
  Star,
  Video
} from 'lucide-react';
import useThemeStore from '../store/themeStore';
import logo from '../logo.png';

const ADMIN_NAV = [
  { section: 'General', items: [
    { to: '/dashboard', icon: <LayoutDashboard size={18} strokeWidth={2} />, label: 'Dashboard' },
    { to: '/students', icon: <Users size={18} strokeWidth={2} />, label: 'Students' },
    { to: '/placements', icon: <Briefcase size={18} strokeWidth={2} />, label: 'Placements' },
    { to: '/assignments', icon: <GraduationCap size={18} strokeWidth={2} />, label: 'Assignments' },
    { to: '/admin/sessions', icon: <Video size={18} strokeWidth={2} />, label: 'Sessions', badge: 'ZOOM' },
    { to: '/north-star', icon: <Star size={18} strokeWidth={2} />, label: 'Project North Star' },
  ]},
  { section: 'Operations', items: [
    { to: '/admin/pipeline', icon: <Workflow size={18} strokeWidth={2} />, label: 'Job Tracking' },
    { to: '/admin/csv-upload', icon: <Users size={18} strokeWidth={2} />, label: 'Import Students' },
    { to: '/admin/jobs', icon: <ClipboardList size={18} strokeWidth={2} />, label: 'Manage Jobs' },
    { to: '/admin/internships', icon: <ClipboardList size={18} strokeWidth={2} />, label: 'Manage Internships' },
    { to: '/admin/send-resumes', icon: <Send size={18} strokeWidth={2} />, label: 'Send Resumes' },
    { to: '/jobs/create', icon: <PlusSquare size={18} strokeWidth={2} />, label: 'Create Job' },
    { to: '/internships/create', icon: <PlusSquare size={18} strokeWidth={2} />, label: 'Create Internship' },
    { to: '/admin/notifications', icon: <Bell size={18} strokeWidth={2} />, label: 'Send Notifications' },
  ]},
  { section: 'Support', items: [
    { to: '/coordinators', icon: <UserCircle size={18} strokeWidth={2} />, label: 'Coordinators' },
    { to: '/admin/faq', icon: <HelpCircle size={18} strokeWidth={2} />, label: 'FAQ & Policy' },
  ]},
  { section: 'Scraping', items: [
    { to: '/admin/scraping', icon: <Activity size={18} strokeWidth={2} />, label: 'Scraping Dashboard' },
    { to: '/admin/clicks', icon: <MousePointerClick size={18} strokeWidth={2} />, label: 'External Clicks' },
  ]}
];

const STUDENT_NAV = [
  { section: 'General', items: [
    { to: '/student', icon: <Home size={18} strokeWidth={2} />, label: 'Dashboard' },
    { to: '/student/profile', icon: <User size={18} strokeWidth={2} />, label: 'My Profile' },
    { to: '/student/notifications', icon: <Bell size={18} strokeWidth={2} />, label: 'Notifications' },
    { to: '/student/sessions', icon: <Video size={18} strokeWidth={2} />, label: 'My Sessions', badge: 'ZOOM' },
    { to: '/north-star', icon: <Star size={18} strokeWidth={2} />, label: 'Project North Star' },
  ]},
  { section: 'Career', items: [
    { to: '/student/resumes', icon: <FileText size={18} strokeWidth={2} />, label: 'My Resumes' },
    { to: '/student/applications', icon: <ClipboardList size={18} strokeWidth={2} />, label: 'My Applications' },
    { to: '/student/jobs', icon: <Briefcase size={18} strokeWidth={2} />, label: 'Jobs' },
    { to: '/student/internships', icon: <Briefcase size={18} strokeWidth={2} />, label: 'Internships' },
    { to: '/student/job-feed', icon: <Rss size={18} strokeWidth={2} />, label: 'Job Feed', badge: 'NEW' },
    { to: '/student/saved-jobs', icon: <Bookmark size={18} strokeWidth={2} />, label: 'Saved Jobs' },
  ]},
  { section: 'Preparation', items: [
    { to: '/student/assignments', icon: <GraduationCap size={18} strokeWidth={2} />, label: 'Assignments' },
    { to: '/student/mock-interview', icon: <Mic size={18} strokeWidth={2} />, label: 'Mock Interview', badge: 'NEW' },
  ]},
  { section: 'Support', items: [
    { to: '/student/faq', icon: <HelpCircle size={18} strokeWidth={2} />, label: 'FAQ & Policy' },
  ]}
];

// Premium Magnetic Hover component using Framer Motion
function MagneticItem({ children }) {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Subtle magnetic attraction pull capped at 6px
    const cap = 6;
    const pullX = (dx / (width / 2)) * cap;
    const pullY = (dy / (height / 2)) * cap;

    setPosition({ x: pullX, y: pullY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 220, damping: 15, mass: 0.1 }}
      style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px', position: 'relative', zIndex: 1 }}
    >
      {children}
    </motion.div>
  );
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { isDarkMode, toggleTheme, initTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredPath, setHoveredPath] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Track window resize to toggle between mobile and desktop styles dynamically
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMenuClick = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobile && mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen, isMobile]);

  useEffect(() => {
    initTheme();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin';
  const NAV_ITEMS = (isStudent ? STUDENT_NAV : ADMIN_NAV).map(section => {
    // If admin, show everything. If student, show everything in STUDENT_NAV.
    if (isAdmin || isStudent) return section;

    // For coordinators, we filter based on their granular permissions
    const filteredItems = section.items.filter(item => {
      // Basic coordinator stuff
      if (item.to === '/dashboard') return true;
      if (item.to === '/coordinators') return false; // Only admin can manage coordinators

      // Granular permission checks
      if (['/students'].includes(item.to)) {
        return user?.can_manage_students === true;
      }
      if (['/admin/pipeline', '/admin/jobs', '/admin/internships', '/jobs/create', '/internships/create', '/placements'].includes(item.to)) {
        return user?.can_manage_placements === true;
      }
      if (['/assignments'].includes(item.to)) {
        return user?.can_manage_assignments === true;
      }
      if (['/admin/send-resumes'].includes(item.to)) {
        return user?.can_manage_resumes === true;
      }
      if (['/admin/notifications'].includes(item.to)) {
        return user?.can_send_notifications === true;
      }
      if (['/admin/scraping', '/admin/linkedin-scraper'].includes(item.to)) {
        return user?.can_view_scraping === true;
      }
      if (['/admin/clicks'].includes(item.to)) {
        return user?.can_view_clicks === true;
      }

      return true; // default show
    });

    return { ...section, items: filteredItems };
  }).filter(section => section.items.length > 0);

  return (
    <div className="app-shell">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="mobile-overlay"
          />
        )}
      </AnimatePresence>

      <motion.aside 
        initial={false}
        animate={{ 
          width: isMobile ? (isStudent ? 280 : 260) : (collapsed ? 72 : (isStudent ? 280 : 260)),
          x: isMobile ? (mobileOpen ? 0 : -300) : 0
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      >
        <nav className="sidebar-nav" onMouseLeave={() => setHoveredPath(null)}>
          {NAV_ITEMS.map((section, idx) => (
            <div key={idx} className="nav-section">
              {!collapsed && <h4 className="nav-section-title">{section.section}</h4>}
              {section.items.map((item) => (
                <NavLink 
                  key={item.to} 
                  to={item.to} 
                  end={item.to === '/dashboard' || item.to === '/student'}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} 
                  title={collapsed ? item.label : ''}
                  onMouseEnter={() => setHoveredPath(item.to)}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="activeNavPill"
                          className="sidebar-active-pill"
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 24
                          }}
                        />
                      )}
                      {hoveredPath === item.to && !isActive && (
                        <motion.div
                          layoutId="hoverNavPill"
                          className="sidebar-hover-pill"
                          transition={{
                            type: "spring",
                            stiffness: 350,
                            damping: 25
                          }}
                        />
                      )}
                      <MagneticItem>
                        <div className="nav-icon">{item.icon}</div>
                        {!collapsed && (
                          <span className="nav-label">
                            {item.label}
                            {item.badge && <span className="nav-badge-new">{item.badge}</span>}
                          </span>
                        )}
                      </MagneticItem>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
             <LogOut size={20} />
             {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left flex items-center gap-4">
            <button 
              className="menu-toggle-btn flex items-center justify-center text-primary"
              onClick={handleMenuClick}
              title={isMobile ? "Toggle Menu" : (collapsed ? "Expand Sidebar" : "Collapse Sidebar")}
            >
              <Menu size={20} />
            </button>
            <button className="theme-toggle flex items-center justify-center ml-2 w-10 h-10 rounded-xl hover:bg-card-hover transition-all text-primary" onClick={toggleTheme}>
              {isDarkMode ? <Sun size={20} className="text-orange-500" /> : <Moon size={20} />}
            </button>
          </div>

          {/* Ultra-Premium Centered Brand Pill */}
          <div
            className="topbar-brand-center"
            onClick={() => navigate(isStudent ? '/student' : '/dashboard')}
            title="Go to Dashboard"
          >
            <img src={logo} alt="iLEAD Logo" className="topbar-brand-logo" />
            <div className="topbar-brand-text">
              <span className="topbar-brand-title">iLEAD</span>
              <span className="topbar-brand-subtitle">Placement Portal</span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="flex items-center gap-2">
                <NotificationBell />
                <div className="h-6 w-[1px] bg-slate-200 mx-2"></div>
                <div className="user-profile-trigger flex items-center pl-4">
                  <div className="role-badge">
                    {user?.role}
                  </div>
               </div>
            </div>
          </div>
        </header>
        
        <div className="main-content-body">
          <AnimatePresence>
            <motion.div 
              key={location.pathname}
              initial={{ opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="page-content"
            >
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
