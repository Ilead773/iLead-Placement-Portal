import React, { useState, useEffect, useRef } from 'react';
import useNotificationStore from '../../store/notificationStore';
import { 
  Bell, 
  Check, 
  Trash2, 
  Calendar, 
  Award, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  MailOpen, 
  ChevronRight,
  Filter,
  Info,
  Star,
  Archive,
  Search,
  X,
  CheckSquare,
  Square,
  Keyboard,
  ArrowLeft,
  Eye,
  EyeOff,
  ChevronDown
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function Notifications() {
  const { 
    notifications, 
    fetchNotifications, 
    markRead, 
    markUnread, 
    markAllRead, 
    deleteNotification, 
    unreadCount 
  } = useNotificationStore();
  
  // Navigation & Folders
  const [activeFolder, setActiveFolder] = useState('inbox'); // 'inbox', 'starred', 'archive'
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'offers', 'interviews', 'shortlists', 'updates'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection States
  const [selectedId, setSelectedId] = useState(null);
  const [bulkSelectedIds, setBulkSelectedIds] = useState([]);
  
  // Local Bookmarks (Starred)
  const [starredIds, setStarredIds] = useState(() => {
    const saved = localStorage.getItem('ilead_starred_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  // Modal / UI
  const [helpOpen, setHelpOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const listContainerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Pre-select a specific notification if navigated from dashboard
  useEffect(() => {
    if (location.state?.selectedId) {
      setSelectedId(location.state.selectedId);
      setActiveFolder('inbox');
      // Clear location state after selecting so it doesn't re-select on subsequent changes
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Sync Starred with LocalStorage
  useEffect(() => {
    localStorage.setItem('ilead_starred_notifications', JSON.stringify(starredIds));
  }, [starredIds]);

  // Handle Resize for Mobile/Desktop layout
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch initial notifications
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Priority styling profiles
  const priorityConfig = {
    critical: {
      border: 'border-red-500/10',
      bg: 'bg-red-500/[0.01]',
      indicator: 'bg-red-500',
      label: 'Critical',
      badgeClass: 'badge-danger-glow'
    },
    high: {
      border: 'border-orange-500/10',
      bg: 'bg-orange-500/[0.01]',
      indicator: 'bg-orange-500',
      label: 'High',
      badgeClass: 'badge-warning-glow'
    },
    medium: {
      border: 'border-blue-500/10',
      bg: 'bg-blue-500/[0.01]',
      indicator: 'bg-blue-500',
      label: 'Update',
      badgeClass: 'badge-info-glow'
    },
    low: {
      border: 'border-slate-100 dark:border-slate-800',
      bg: 'transparent',
      indicator: 'bg-slate-300',
      label: 'Minor',
      badgeClass: 'badge-secondary'
    }
  };

  // Helper to determine notification category/icon
  const getBadgeDetails = (title) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('shortlist') || title.includes('🎉')) {
      return {
        icon: <Sparkles size={16} className="text-emerald-500" />,
        type: 'shortlist',
        text: 'Shortlisted',
        themeClass: 'shortlist'
      };
    }
    if (lowerTitle.includes('interview') || title.includes('📅')) {
      return {
        icon: <Calendar size={16} className="text-blue-500" />,
        type: 'interview',
        text: 'Interview Invite',
        themeClass: 'interview'
      };
    }
    if (lowerTitle.includes('placed') || lowerTitle.includes('select') || title.includes('🏆')) {
      return {
        icon: <Award size={16} className="text-amber-500" />,
        type: 'placed',
        text: 'Offer / Placed',
        themeClass: 'placed'
      };
    }
    return {
      icon: <Bell size={16} className="text-slate-400" />,
      type: 'default',
      text: 'Announcement',
      themeClass: 'default'
    };
  };

  // Filter logic
  const filteredNotifications = notifications.filter(note => {
    // 1. Folder Filters
    const isUnread = !note.is_read;
    const isStarred = starredIds.includes(note.id);
    
    // Inbox folder shows all notifications (both read and unread) to differentiate them clearly
    if (activeFolder === 'archive' && isUnread) return false;
    if (activeFolder === 'starred' && !isStarred) return false;

    // 2. Category Filters
    const details = getBadgeDetails(note.title);
    if (activeCategory !== 'all' && details.type !== activeCategory) return false;

    // 3. Search query match
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const titleMatch = (note.title || '').toLowerCase().includes(query);
      const msgMatch = (note.message || '').toLowerCase().includes(query);
      return titleMatch || msgMatch;
    }

    return true;
  });

  // Chronological group mapping
  const groupNotifications = (notes) => {
    const groups = {};
    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    notes.forEach(note => {
      const dateObj = new Date(note.created_at);
      const dateStr = dateObj.toDateString();
      let groupKey = '';
      
      if (dateStr === todayStr) {
        groupKey = 'Today';
      } else if (dateStr === yesterdayStr) {
        groupKey = 'Yesterday';
      } else {
        groupKey = dateObj.toLocaleDateString(undefined, { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric' 
        });
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(note);
    });

    return groups;
  };

  const notificationGroups = groupNotifications(filteredNotifications);

  // Auto-select first notification on desktop
  useEffect(() => {
    if (!isMobile && filteredNotifications.length > 0) {
      // Keep selection if it's still in the list, otherwise select first item
      const isSelectedStillAvailable = filteredNotifications.some(n => n.id === selectedId);
      if (!isSelectedStillAvailable) {
        setSelectedId(filteredNotifications[0].id);
      }
    } else if (filteredNotifications.length === 0) {
      setSelectedId(null);
    }
  }, [activeFolder, activeCategory, searchQuery, isMobile]);

  // Selected object accessor
  const activeNotification = notifications.find(n => n.id === selectedId) || null;

  // Auto-mark as read when viewing an unread notification
  useEffect(() => {
    if (activeNotification && !activeNotification.is_read) {
      markRead(activeNotification.id);
    }
  }, [selectedId, activeNotification, markRead]);

  // Keyboard Navigation & Shortcuts
  const getSelectedIndex = () => filteredNotifications.findIndex(n => n.id === selectedId);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Bypass if typing in search input
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toLowerCase();
      const currentIndex = getSelectedIndex();

      // Help shortcuts menu
      if (key === '?') {
        e.preventDefault();
        setHelpOpen(prev => !prev);
        return;
      }

      if (key === 'escape') {
        e.preventDefault();
        setHelpOpen(false);
        setSelectedId(null);
        setBulkSelectedIds([]);
        return;
      }

      // If empty lists, shortcuts don't navigate
      if (filteredNotifications.length === 0) return;

      // J / ArrowDown - Navigate Next
      if (key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < filteredNotifications.length - 1 ? currentIndex + 1 : currentIndex;
        const nextNote = filteredNotifications[nextIndex];
        if (nextNote) {
          setSelectedId(nextNote.id);
          // Scroll item into view
          const itemEl = document.getElementById(`notif-item-${nextNote.id}`);
          if (itemEl) itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }

      // K / ArrowUp - Navigate Previous
      if (key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
        const prevNote = filteredNotifications[prevIndex];
        if (prevNote) {
          setSelectedId(prevNote.id);
          // Scroll item into view
          const itemEl = document.getElementById(`notif-item-${prevNote.id}`);
          if (itemEl) itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }

      // Action Shortcuts on Selected item
      if (activeNotification) {
        // R - Toggle Read / Unread
        if (key === 'r') {
          e.preventDefault();
          if (activeNotification.is_read) {
            markUnread(activeNotification.id);
          } else {
            markRead(activeNotification.id);
          }
        }
        
        // S or F - Toggle Bookmark / Starred
        if (key === 's' || key === 'f') {
          e.preventDefault();
          toggleStar(activeNotification.id);
        }

        // A or Backspace or Delete - Delete / Clear Notification
        if (key === 'a' || e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          deleteNotification(activeNotification.id);
        }

        // Enter - Navigate Action Url
        if (e.key === 'Enter' && activeNotification.action_url) {
          e.preventDefault();
          navigate(activeNotification.action_url);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredNotifications, selectedId, activeNotification, starredIds]);

  // Star Toggle handler
  const toggleStar = (id) => {
    if (starredIds.includes(id)) {
      setStarredIds(starredIds.filter(item => item !== id));
    } else {
      setStarredIds([...starredIds, id]);
    }
  };

  // Bulk selectors
  const handleSelectToggle = (id, e) => {
    e.stopPropagation();
    if (bulkSelectedIds.includes(id)) {
      setBulkSelectedIds(bulkSelectedIds.filter(item => item !== id));
    } else {
      setBulkSelectedIds([...bulkSelectedIds, id]);
    }
  };

  const handleSelectAllInView = () => {
    const allIds = filteredNotifications.map(n => n.id);
    const allSelected = allIds.every(id => bulkSelectedIds.includes(id));
    if (allSelected) {
      setBulkSelectedIds(bulkSelectedIds.filter(id => !allIds.includes(id)));
    } else {
      setBulkSelectedIds(Array.from(new Set([...bulkSelectedIds, ...allIds])));
    }
  };

  const executeBulkRead = async () => {
    for (const id of bulkSelectedIds) {
      await markRead(id);
    }
    setBulkSelectedIds([]);
  };

  const executeBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete the ${bulkSelectedIds.length} selected notifications?`)) {
      for (const id of bulkSelectedIds) {
        await deleteNotification(id);
      }
      setBulkSelectedIds([]);
    }
  };

  return (
    <div className="notification-split-layout">
      {/* Background Decorative Ambient Lights */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/[0.03] rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-orange-500/[0.03] rounded-full blur-3xl pointer-events-none -z-10" />

      {/* LEFT COLUMN: Sidebar Navigation */}
      <aside className={`notification-sidebar-pane ${isMobile && selectedId ? 'hidden' : 'block'}`}>
        <div className="notification-sidebar-header">
          <div className="inbox-badge-tag mb-3">
            iLEAD Core System
          </div>
          <h2 className="sidebar-main-title flex items-center gap-2">
            <Bell className="text-orange-500" size={18} /> Notifications
          </h2>
        </div>

        {/* Folders List */}
        <nav className="folder-navigation mt-6">
          <button 
            onClick={() => { setActiveFolder('inbox'); setBulkSelectedIds([]); }}
            className={`folder-nav-btn ${activeFolder === 'inbox' ? 'active' : ''}`}
          >
            <span className="flex items-center gap-3">
              <MailOpen size={16} />
              Inbox
            </span>
            {unreadCount > 0 && (
              <span className="folder-count-pill bg-orange-500/10 text-orange-500">{unreadCount}</span>
            )}
          </button>

          <button 
            onClick={() => { setActiveFolder('starred'); setBulkSelectedIds([]); }}
            className={`folder-nav-btn ${activeFolder === 'starred' ? 'active' : ''}`}
          >
            <span className="flex items-center gap-3">
              <Star size={16} />
              Saved / Bookmarks
            </span>
            {starredIds.length > 0 && (
              <span className="folder-count-pill bg-amber-500/10 text-amber-500">{starredIds.length}</span>
            )}
          </button>

          <button 
            onClick={() => { setActiveFolder('archive'); setBulkSelectedIds([]); }}
            className={`folder-nav-btn ${activeFolder === 'archive' ? 'active' : ''}`}
          >
            <span className="flex items-center gap-3">
              <Archive size={16} />
              Archive
            </span>
            <span className="folder-count-pill bg-slate-500/10 text-slate-500">
              {notifications.filter(n => n.is_read).length}
            </span>
          </button>
        </nav>

        {/* Horizontal separator */}
        <div className="h-px bg-border-color/60 my-6" />

        {/* Categories (Middle Pane Filters) */}
        <div>
          <span className="sidebar-section-title">Filters</span>
          <div className="category-filters-list mt-3">
            {[
              { id: 'all', label: 'All Updates', icon: <Bell size={14} /> },
              { id: 'placed', label: 'Offers', icon: <Award size={14} /> },
              { id: 'interview', label: 'Interviews', icon: <Calendar size={14} /> },
              { id: 'shortlist', label: 'Shortlists', icon: <Sparkles size={14} /> },
              { id: 'default', label: 'Announcements', icon: <Info size={14} /> }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setBulkSelectedIds([]); }}
                className={`category-filter-btn ${activeCategory === cat.id ? 'active' : ''}`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Keyboard Shortcut Indicator Footer */}
        <div className="sidebar-shortcuts-trigger" onClick={() => setHelpOpen(true)}>
          <Keyboard size={14} />
          <span>Keyboard Shortcuts</span>
          <span className="trigger-key border border-border-color">?</span>
        </div>
      </aside>

      {/* MIDDLE COLUMN: List of Notifications */}
      <section className={`notification-list-pane ${isMobile && selectedId ? 'hidden' : 'block'}`}>
        {/* Search Bar & List Action Header */}
        <div className="list-search-wrapper">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="list-search-input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Mark All Read (Only in Inbox) */}
          {activeFolder === 'inbox' && unreadCount > 0 && (
            <button 
              onClick={markAllRead}
              className="action-icon-header-btn"
              title="Mark all as read"
            >
              <CheckCircle2 size={16} />
            </button>
          )}
          
          {/* Select All Toggle Checkbox */}
          {filteredNotifications.length > 0 && (
            <button
              onClick={handleSelectAllInView}
              className="action-icon-header-btn"
              title="Select all visible"
            >
              <CheckSquare size={16} />
            </button>
          )}
        </div>

        {/* Selected / Showing summary tag */}
        <div className="list-showing-summary">
          <span>
            Showing <strong>{filteredNotifications.length}</strong> items in <strong>{activeFolder}</strong>
          </span>
        </div>

        {/* Notifications Scroll Stream */}
        <div className="list-scroll-container" ref={listContainerRef}>
          {filteredNotifications.length === 0 ? (
            <div className="list-empty-state">
              <div className="empty-state-icon animate-pulse">
                <MailOpen size={36} className="text-slate-400" />
              </div>
              <h3 className="empty-state-title">Inbox Zero</h3>
              <p className="empty-state-desc">
                Everything is sorted. Enjoy your clean workspace!
              </p>
            </div>
          ) : (
            Object.keys(notificationGroups).map(groupName => (
              <div key={groupName} className="date-group-section">
                <h4 className="date-group-title">{groupName}</h4>
                <div className="date-group-list">
                  {notificationGroups[groupName].map(note => {
                    const isUnread = !note.is_read;
                    const isStarred = starredIds.includes(note.id);
                    const isSelected = selectedId === note.id;
                    const isChecked = bulkSelectedIds.includes(note.id);
                    const badge = getBadgeDetails(note.title);
                    const priority = priorityConfig[note.priority] || priorityConfig.medium;

                    return (
                      <div 
                        key={note.id}
                        id={`notif-item-${note.id}`}
                        onClick={() => setSelectedId(note.id)}
                        className={`notification-item-row ${isSelected ? 'selected' : ''} ${isUnread ? 'unread bg-blue-500/[0.04] dark:bg-blue-500/[0.06] border-l-2 border-l-blue-500 font-semibold' : 'read'} ${note.priority || 'medium'}`}
                      >
                        {/* Selector checkbox */}
                        <div 
                          className="item-checkbox-wrapper" 
                          onClick={(e) => handleSelectToggle(note.id, e)}
                        >
                          {isChecked ? (
                            <CheckSquare size={16} className="text-primary" />
                          ) : (
                            <Square size={16} className="text-slate-300 hover:text-slate-500" />
                          )}
                        </div>

                        {/* Unread Left indicator line */}
                        {isUnread && (
                          <div className={`unread-bar ${priority.indicator}`} />
                        )}

                        {/* Icon Avatar */}
                        <div className={`item-avatar-wrapper ${badge.themeClass}`}>
                          {badge.icon}
                        </div>

                        {/* Item main info */}
                        <div className="item-details-area">
                          <div className="item-header-row">
                            <span className="item-sender-name flex items-center gap-2">
                              {badge.text}
                              {isUnread && (
                                <span className="px-1.5 py-0.5 rounded flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-blue-500 text-white shadow-sm shadow-blue-500/30">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> New
                                </span>
                              )}
                            </span>
                            <span className="item-time-text">
                              {new Date(note.created_at).toLocaleTimeString(undefined, { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>

                          <h4 className="item-subject-title">{note.title}</h4>
                          <p className="item-message-snippet">{note.message}</p>
                          
                          {/* Footline: Badges & indicators */}
                          <div className="item-footer-badges">
                            {note.priority && (
                              <span className={`badge-pill text-[9px] uppercase tracking-wider font-extrabold ${priority.badgeClass}`}>
                                {priority.label}
                              </span>
                            )}
                            {note.action_url && (
                              <span className="badge-pill bg-slate-100 text-slate-500 dark:bg-dark-300 text-[9px] font-extrabold uppercase">
                                Action Required
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Toggle star bookmark button */}
                        <button 
                          className={`item-star-btn ${isStarred ? 'starred' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStar(note.id);
                          }}
                          title={isStarred ? "Remove bookmark" : "Bookmark this"}
                        >
                          <Star size={16} fill={isStarred ? "currentColor" : "none"} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* RIGHT COLUMN: Detail Pane Preview */}
      <section className={`notification-detail-pane ${isMobile && !selectedId ? 'hidden' : 'block'}`}>
        <AnimatePresence mode="wait">
          {!activeNotification ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="detail-empty-container"
            >
              <div className="empty-bell-glow">
                <Bell size={36} className="text-slate-300 dark:text-slate-700" />
              </div>
              <h3 className="empty-detail-title">Clear Workspace</h3>
              <p className="empty-detail-desc">
                Select an alert from your stream to view full context, access job links, or trigger workflow pipeline steps.
              </p>
              
              <div className="empty-keyboard-hint">
                <div className="hint-row">
                  <span className="hint-keys"><kbd>J</kbd> / <kbd>K</kbd></span>
                  <span className="hint-text">Navigate through feed</span>
                </div>
                <div className="hint-row mt-2">
                  <span className="hint-keys"><kbd>R</kbd></span>
                  <span className="hint-text">Toggle read status</span>
                </div>
                <div className="hint-row mt-2">
                  <span className="hint-keys"><kbd>S</kbd></span>
                  <span className="hint-text">Toggle bookmark</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key={activeNotification.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="detail-card-shell"
            >
              {/* Header actions (Mobile back button + status row) */}
              <div className="detail-pane-header">
                {isMobile && (
                  <button 
                    onClick={() => setSelectedId(null)}
                    className="detail-mobile-back-btn"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                )}

                <div className="flex items-center gap-3 ml-auto">
                  {/* Star Toggle */}
                  <button 
                    onClick={() => toggleStar(activeNotification.id)}
                    className={`detail-header-action-btn ${starredIds.includes(activeNotification.id) ? 'active-star' : ''}`}
                    title={starredIds.includes(activeNotification.id) ? "Remove Star" : "Star Alert"}
                  >
                    <Star size={16} fill={starredIds.includes(activeNotification.id) ? "currentColor" : "none"} />
                  </button>

                  {/* Read/Unread Toggle */}
                  <button 
                    onClick={() => {
                      if (activeNotification.is_read) {
                        markUnread(activeNotification.id);
                      } else {
                        markRead(activeNotification.id);
                      }
                    }}
                    className="detail-header-action-btn"
                    title={activeNotification.is_read ? "Mark Unread (Return to Inbox)" : "Mark Read"}
                  >
                    {activeNotification.is_read ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>

                  {/* Delete Button */}
                  <button 
                    onClick={() => {
                      deleteNotification(activeNotification.id);
                      setSelectedId(null);
                    }}
                    className="detail-header-action-btn delete-hover"
                    title="Delete Notification"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="detail-scroll-container">
                {/* Meta details */}
                <div className="detail-meta-row flex flex-wrap gap-2 items-center text-xs text-slate-400 mt-2">
                  <span className="font-semibold uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-full">
                    {getBadgeDetails(activeNotification.title).text}
                  </span>
                  
                  <span className={`font-semibold uppercase px-2 py-0.5 rounded-full ${priorityConfig[activeNotification.priority]?.badgeClass}`}>
                    {priorityConfig[activeNotification.priority]?.label}
                  </span>

                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  
                  <span className="text-slate-500 dark:text-slate-400">
                    Received {new Date(activeNotification.created_at).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>

                {/* Title */}
                <h1 className="detail-title-heading mt-4 text-primary">
                  {activeNotification.title}
                </h1>

                {/* Sender Card */}
                <div className="detail-sender-row">
                  <div className="sender-avatar">iL</div>
                  <div>
                    <span className="sender-name">iLEAD Placements Command</span>
                    <span className="sender-email">no-reply@ilead.edu.in</span>
                  </div>
                </div>

                {/* Message Body */}
                <div className="detail-message-body">
                  {activeNotification.message}
                </div>

                {/* Embedded Action CTA Box */}
                {activeNotification.action_url && (
                  <div className="detail-action-cta-card">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-[#2563eb]/10 text-[#2563eb] rounded-xl flex-shrink-0">
                        <Calendar size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-sm text-primary">Workflow Action Required</h4>
                        <p className="text-[11px] text-secondary mt-1 leading-relaxed">
                          This alert is bound to your placement pipeline. Navigate to the link below to submit resumes, view interview details, or accept job selections.
                        </p>
                        <button 
                          onClick={() => navigate(activeNotification.action_url)}
                          className="mt-4 py-1.5 px-4 text-xs font-semibold uppercase tracking-wider rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all inline-flex items-center gap-1.5 border-none cursor-pointer"
                        >
                          Access Action Dashboard <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Key bindings tip line */}
              <div className="detail-pane-footer">
                <span className="text-[9px] font-black uppercase tracking-wider text-secondary flex items-center gap-1">
                  <Keyboard size={12} /> Keyboard Actions: Press <kbd>R</kbd> to Mark Read • <kbd>S</kbd> to Star • <kbd>A</kbd> to Archive
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* FLOATING ACTION BAR: Bulk Selections */}
      <AnimatePresence>
        {bulkSelectedIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="bulk-action-bar"
          >
            <span className="bulk-selection-count">
              <strong>{bulkSelectedIds.length}</strong> items selected
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={executeBulkRead}
                className="bulk-btn btn-secondary"
              >
                <Check size={14} /> Mark as Read
              </button>
              <button 
                onClick={executeBulkDelete}
                className="bulk-btn btn-danger"
              >
                <Trash2 size={14} /> Delete Selected
              </button>
              <button 
                onClick={() => setBulkSelectedIds([])}
                className="bulk-close-btn"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KEYBOARD SHORTCUTS GUIDE MODAL */}
      <AnimatePresence>
        {helpOpen && (
          <div className="shortcut-modal-overlay" onClick={() => setHelpOpen(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="shortcut-modal-container"
            >
              <div className="flex justify-between items-center border-b border-border-color pb-4 mb-4">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-primary flex items-center gap-2">
                  <Keyboard size={16} /> Keyboard Shortcuts
                </h3>
                <button 
                  onClick={() => setHelpOpen(false)}
                  className="text-secondary hover:text-primary"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="shortcut-item-row">
                  <span className="shortcut-label">Move Selection Down</span>
                  <kbd className="shortcut-kbd">J</kbd> or <kbd>↓</kbd>
                </div>
                <div className="shortcut-item-row">
                  <span className="shortcut-label">Move Selection Up</span>
                  <kbd className="shortcut-kbd">K</kbd> or <kbd>↑</kbd>
                </div>
                <div className="shortcut-item-row">
                  <span className="shortcut-label">Toggle Read / Unread Status</span>
                  <kbd className="shortcut-kbd">R</kbd>
                </div>
                <div className="shortcut-item-row">
                  <span className="shortcut-label">Toggle Starred (Bookmark)</span>
                  <kbd className="shortcut-kbd">S</kbd> or <kbd>F</kbd>
                </div>
                <div className="shortcut-item-row">
                  <span className="shortcut-label">Archive / Delete Notification</span>
                  <kbd className="shortcut-kbd">A</kbd> or <kbd>Backspace</kbd>
                </div>
                <div className="shortcut-item-row">
                  <span className="shortcut-label">Open Linked Action URL</span>
                  <kbd className="shortcut-kbd">Enter</kbd>
                </div>
                <div className="shortcut-item-row">
                  <span className="shortcut-label">Clear Selections / Close Modals</span>
                  <kbd className="shortcut-kbd">Esc</kbd>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border-color text-center text-[10px] text-secondary font-medium">
                Speed up your placement coordination inbox using power-user binds.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
