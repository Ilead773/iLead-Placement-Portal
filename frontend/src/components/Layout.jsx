import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/authStore';
import NotificationBell from './NotificationBell';
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
  Search,
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
  Bell
} from 'lucide-react';
import useThemeStore from '../store/themeStore';
import logo from '../logo.png';

const ADMIN_NAV = [
  { section: 'General', items: [
    { to: '/dashboard', icon: <LayoutDashboard size={18} strokeWidth={2} />, label: 'Dashboard' },
    { to: '/students', icon: <Users size={18} strokeWidth={2} />, label: 'Students' },
    { to: '/placements', icon: <Briefcase size={18} strokeWidth={2} />, label: 'Placements' },
  ]},
  { section: 'Operations', items: [
    { to: '/admin/pipeline', icon: <Workflow size={18} strokeWidth={2} />, label: 'Job Pipeline' },
    { to: '/admin/jobs', icon: <ClipboardList size={18} strokeWidth={2} />, label: 'Manage Jobs' },
    { to: '/admin/internships', icon: <ClipboardList size={18} strokeWidth={2} />, label: 'Manage Internships' },
    { to: '/admin/send-resumes', icon: <Send size={18} strokeWidth={2} />, label: 'Send Resumes' },
    { to: '/jobs/create', icon: <PlusSquare size={18} strokeWidth={2} />, label: 'Create Job' },
    { to: '/internships/create', icon: <PlusSquare size={18} strokeWidth={2} />, label: 'Create Internship' },
    { to: '/admin/notifications', icon: <Bell size={18} strokeWidth={2} />, label: 'Send Notifications' },
  ]},
  { section: 'Support', items: [
    { to: '/coordinators', icon: <UserCircle size={18} strokeWidth={2} />, label: 'Coordinators' },
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
  ]},
  { section: 'Career', items: [
    { to: '/student/resumes', icon: <FileText size={18} strokeWidth={2} />, label: 'My Resumes' },
    { to: '/student/jobs', icon: <Briefcase size={18} strokeWidth={2} />, label: 'Jobs' },
    { to: '/student/internships', icon: <Briefcase size={18} strokeWidth={2} />, label: 'Internships' },
    { to: '/student/job-feed', icon: <Rss size={18} strokeWidth={2} />, label: 'Job Feed', badge: 'NEW' },
    { to: '/student/saved-jobs', icon: <Bookmark size={18} strokeWidth={2} />, label: 'Saved Jobs' },
  ]},
  { section: 'Preparation', items: [
    { to: '/student/mock-interview', icon: <Mic size={18} strokeWidth={2} />, label: 'Mock Interview', badge: 'NEW' },
  ]}
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { isDarkMode, toggleTheme, initTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
      if (['/admin/pipeline', '/admin/jobs', '/admin/internships', '/jobs/create', '/internships/create', '/placements', '/assignments'].includes(item.to)) {
        return user?.can_manage_placements === true;
      }
      if (['/admin/send-resumes'].includes(item.to)) {
        return user?.can_manage_resumes === true;
      }
      if (['/admin/scraping'].includes(item.to)) {
        return false; // Only admin can access scraping dashboard
      }
      if (['/admin/clicks'].includes(item.to)) {
        return false; // Only admin can access external clicks log
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
          width: collapsed ? 80 : 280,
          x: mobileOpen ? 0 : (window.innerWidth < 1024 ? -280 : 0)
        }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      >
        <motion.div 
          className="sidebar-brand" 
          onClick={() => navigate('/')}
          whileHover={{ x: 5 }}
        >
          <div className="brand-logo-container">
            <img src={logo} alt="iLEAD Logo" className="brand-logo-img" />
            {!collapsed && (
              <div className="brand-subtext">
                <span>Placement</span>
                <span>Portal</span>
              </div>
            )}
          </div>
        </motion.div>

        <nav className="sidebar-nav">
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
                >
                  <div className="nav-icon">{item.icon}</div>
                  {!collapsed && (
                    <span className="nav-label">
                      {item.label}
                      {item.badge && <span className="nav-badge-new">{item.badge}</span>}
                    </span>
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
              className="mobile-menu-toggle lg:hidden flex items-center justify-center text-primary"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Menu size={24} />
            </button>
            <button className="menu-toggle hidden lg:flex items-center justify-center text-primary" onClick={() => setCollapsed(!collapsed)}>
              <Menu size={20} />
            </button>
            {!isStudent && <div className="breadcrumb hidden sm:block text-sm opacity-60">Admin / {location.pathname.split('/').pop()}</div>}
            <button className="theme-toggle flex items-center justify-center ml-2 w-10 h-10 rounded-xl hover:bg-card-hover transition-all text-primary" onClick={toggleTheme}>
              {isDarkMode ? <Sun size={20} className="text-orange-500" /> : <Moon size={20} />}
            </button>
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
        
        <motion.div 
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="page-content"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
