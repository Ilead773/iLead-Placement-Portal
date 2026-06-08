import React, { useState, useEffect } from 'react';
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
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function Notifications() {
  const { notifications, fetchNotifications, markRead, markAllRead, deleteNotification, unreadCount } = useNotificationStore();
  const [activeFilter, setActiveFilter] = useState('all'); 
  const [expandedId, setExpandedId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const priorityConfig = {
    critical: {
      border: 'border-red-500/50 dark:border-red-500/30',
      bg: 'bg-red-500/[0.03] dark:bg-red-500/[0.02]',
      indicator: 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]',
      label: 'Critical Alert',
      textColor: 'text-red-500'
    },
    high: {
      border: 'border-orange-500/50 dark:border-orange-500/30',
      bg: 'bg-orange-500/[0.03] dark:bg-orange-500/[0.02]',
      indicator: 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.7)]',
      label: 'High Priority',
      textColor: 'text-orange-500'
    },
    medium: {
      border: 'border-blue-500/50 dark:border-blue-500/30',
      bg: 'bg-blue-500/[0.03] dark:bg-blue-500/[0.02]',
      indicator: 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.7)]',
      label: 'Update',
      textColor: 'text-blue-500'
    },
    low: {
      border: 'border-slate-300 dark:border-slate-700',
      bg: 'bg-slate-500/[0.01] dark:bg-slate-500/[0.005]',
      indicator: 'bg-slate-400',
      label: 'Low Priority',
      textColor: 'text-slate-400'
    }
  };

  const getBadgeDetails = (title, type) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('shortlist') || title.includes('🎉')) {
      return {
        icon: <Sparkles size={18} className="animate-pulse text-emerald-500" />,
        classType: 'shortlist',
        text: 'Shortlisted'
      };
    }
    if (lowerTitle.includes('interview') || title.includes('📅')) {
      return {
        icon: <Calendar size={18} className="text-blue-500" />,
        classType: 'interview',
        text: 'Interview Invite'
      };
    }
    if (lowerTitle.includes('placed') || lowerTitle.includes('select') || title.includes('🏆')) {
      return {
        icon: <Award size={18} className="animate-bounce text-amber-500" style={{ animationDuration: '3s' }} />,
        classType: 'placed',
        text: 'Offer / Placed'
      };
    }
    return {
      icon: <Bell size={18} className="text-slate-500" />,
      classType: 'default',
      text: 'Update'
    };
  };

  const filteredNotifications = notifications.filter(note => {
    const isUnread = !note.is_read;
    const lowerTitle = note.title.toLowerCase();
    const isOffer = lowerTitle.includes('placed') || lowerTitle.includes('select') || note.title.includes('🏆');
    const isInterview = lowerTitle.includes('interview') || note.title.includes('📅');
    const isShortlist = lowerTitle.includes('shortlist') || note.title.includes('🎉');
    
    if (activeFilter === 'unread') return isUnread;
    if (activeFilter === 'offers') return isOffer;
    if (activeFilter === 'interviews') return isInterview;
    if (activeFilter === 'shortlists') return isShortlist;
    if (activeFilter === 'updates') return !isOffer && !isInterview && !isShortlist;
    return true;
  });

  const handleNotificationClick = async (note) => {
    if (!note.is_read) {
      await markRead(note.id);
    }
    setExpandedId(expandedId === note.id ? null : note.id);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 26 } },
    exit: { opacity: 0, x: -30, transition: { duration: 0.2 } }
  };

  return (
    <div className="notifications-container animate-in">
      {/* Premium Ambient Background Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header section with Premium Gradient Title */}
      <div className="notifications-header">
        <div className="notifications-header-left">
          <div className="notifications-inbox-badge">
            <span className="inbox-badge-tag">
              Personal Inbox
            </span>
            {unreadCount > 0 && (
              <motion.span 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="unread-count-badge"
              >
                {unreadCount} Unread
              </motion.span>
            )}
          </div>
          <h1 className="notifications-title">
            My <span>Notifications</span>
          </h1>
          <p className="notifications-subtitle">
            Stay updated with your placement pipeline advances, interview requests, and application decisions.
          </p>
        </div>
        
        {unreadCount > 0 && (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={markAllRead}
            className="btn btn-primary"
          >
            <CheckCircle2 size={16} /> Mark all read
          </motion.button>
        )}
      </div>

      {/* Filter and Control Bar */}
      <div className="notifications-control-bar">
        <div className="notifications-filter-group">
          {[
            { id: 'all', label: 'All', count: notifications.length },
            { id: 'unread', label: 'Unread', count: unreadCount },
            { id: 'offers', label: 'Offers 🏆', count: notifications.filter(n => n.title.toLowerCase().match(/placed|select/) || n.title.includes('🏆')).length },
            { id: 'interviews', label: 'Interviews 📅', count: notifications.filter(n => n.title.toLowerCase().includes('interview') || n.title.includes('📅')).length },
            { id: 'shortlists', label: 'Shortlists 🎉', count: notifications.filter(n => n.title.toLowerCase().includes('shortlist') || n.title.includes('🎉')).length },
            { id: 'updates', label: 'Updates 📢', count: notifications.filter(n => {
              const lt = n.title.toLowerCase();
              return !lt.match(/shortlist|interview|placed|select/) && !n.title.match(/[🏆📅🎉]/);
            }).length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveFilter(tab.id); setExpandedId(null); }}
              className={`notifications-filter-btn ${activeFilter === tab.id ? 'active' : ''}`}
            >
              {tab.label} <span className="filter-count">({tab.count})</span>
            </button>
          ))}
        </div>
        <div className="notifications-count-indicator">
          <Filter size={14} className="text-orange-500" /> 
          <span>Showing <strong className="text-primary">{filteredNotifications.length}</strong> items</span>
        </div>
      </div>

      {/* Notifications List with Framer Motion Stagger */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="notification-list"
      >
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="notifications-empty-state"
            >
              <div className="notifications-empty-icon animate-pulse">
                <MailOpen size={40} className="stroke-[1.5]" />
              </div>
              <h3 className="notifications-empty-title">All caught up!</h3>
              <p className="notifications-empty-desc">
                {activeFilter === 'unread' 
                  ? 'You do not have any unread notifications at the moment.' 
                  : 'You do not have any notifications in this section.'}
              </p>
            </motion.div>
          ) : (
            filteredNotifications.map((note) => {
              const badge = getBadgeDetails(note.title, note.notification_type);
              const priority = priorityConfig[note.priority] || priorityConfig.medium;
              const isUnread = !note.is_read;
              const isExpanded = expandedId === note.id;

              return (
                <motion.div
                  key={note.id}
                  variants={itemVariants}
                  layoutId={note.id}
                  exit="exit"
                  whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}
                  className={`notification-item-card ${isUnread ? 'unread' : ''} ${note.priority || 'medium'} ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => handleNotificationClick(note)}
                >
                  {/* Left priority color stripe */}
                  {isUnread && (
                    <div className="notification-unread-stripe" />
                  )}

                  <div className="notification-card-body">
                    {/* Visual Type Icon Wrapper */}
                    <div className={`notification-icon-wrapper ${badge.classType}`}>
                      {badge.icon}
                    </div>

                    <div className="notification-content-area">
                      {/* Sub-header row */}
                      <div className="notification-meta-row">
                        <span className={`notification-type-badge ${badge.classType}`}>
                          {badge.text}
                        </span>
                        
                        {isUnread && (
                          <span className={`notification-priority-badge ${note.priority}`}>
                            {priority.label}
                          </span>
                        )}

                        <span className="notification-timestamp">
                          • {new Date(note.created_at).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>

                      {/* Notification Title */}
                      <h3 className="notification-item-title">
                        {note.title}
                      </h3>
                      
                      {/* Notification Body */}
                      <p className={`notification-item-message ${isExpanded ? 'expanded' : 'truncated'}`}>
                        {note.message}
                      </p>

                      {/* Accordion Expand Action Links */}
                      <AnimatePresence>
                        {isExpanded && note.action_url && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                            exit={{ opacity: 0, height: 0 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => navigate(note.action_url)}
                              className="notification-action-btn"
                            >
                              Go to Action Page <ChevronRight size={14} />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Action sidebar: delete icon and chevron */}
                    <div className="notification-actions-sidebar" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => deleteNotification(note.id)}
                        className="notification-action-icon-btn delete-btn"
                        title="Delete notification"
                      >
                        <Trash2 size={16} />
                      </button>
                      
                      <div className="notification-chevron-wrapper">
                        <ChevronRight size={18} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Mark as read inline trigger footer */}
                  {isUnread && (
                    <div className="notification-card-footer">
                      <span className="notification-card-footer-info">
                        <Info size={12} className="text-orange-500" /> Click notification to view details
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead(note.id);
                        }}
                        className="notification-card-footer-btn"
                      >
                        <Check size={12} strokeWidth={3} /> Mark read
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
