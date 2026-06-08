import React, { useState } from 'react';
import useNotificationStore from '../store/notificationStore';
import { Bell, Check, Trash2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationBell = () => {
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification, poll } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    poll();
  }, [poll]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const priorityColors = {
    critical: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
    high: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]',
    medium: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    low: 'bg-slate-400'
  };

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all focus:outline-none"
      >
        <Bell size={22} className={unreadCount > 0 ? 'bell-swinging text-orange-500' : ''} />
        {unreadCount > 0 && (
          <span 
            className="absolute bg-danger rounded-full"
            style={{
              top: '7px',
              right: '7px',
              width: '9px',
              height: '9px',
              border: '2px solid var(--bg-card, #ffffff)',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
              animation: 'pulseOpacity 2s infinite ease-in-out'
            }}
          ></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-80 md:w-96 bg-card shadow-xl rounded-2xl border border-border-color overflow-hidden z-50"
          >

              <div className="p-4 border-b border-border-color flex justify-between items-center bg-card-hover">
                <div>
                  <h3 className="font-extrabold text-primary text-sm tracking-tight">Recent Alerts</h3>
                  <p className="text-[10px] text-secondary font-medium mt-0.5">You have {unreadCount} unread messages</p>
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={() => markAllRead()} 
                    className="text-[9px] font-black uppercase tracking-wider text-primary hover:text-accent-primary-hover flex items-center gap-1 transition-colors bg-accent-soft px-2.5 py-1.5 rounded-lg border border-accent-primary/10"
                  >
                    <Check size={12} strokeWidth={3} /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border-light">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-secondary text-xs flex flex-col items-center justify-center gap-2">
                    <Bell size={24} className="text-slate-300 animate-bounce" />
                    <span className="font-medium">All caught up! No alerts.</span>
                  </div>
                ) : (
                  notifications.slice(0, 6).map(note => {
                    const isUnread = !note.is_read;
                    return (
                      <div 
                        key={note.id} 
                        className={`p-4 hover:bg-card-hover transition-colors cursor-pointer relative group flex gap-3 items-start ${isUnread ? 'bg-primary/[0.015] border-l-2 border-accent-primary' : ''}`}
                        onClick={() => { 
                          if (isUnread) markRead(note.id); 
                          setIsOpen(false); 
                          if(note.action_url) navigate(note.action_url); 
                        }}
                      >
                        <div className={`h-2.5 w-2.5 mt-1.5 rounded-full flex-shrink-0 ${isUnread ? priorityColors[note.priority] : 'bg-slate-300'}`}></div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <p className={`text-xs font-bold text-primary truncate ${isUnread ? 'font-black' : 'opacity-85'}`}>{note.title}</p>
                            <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                              {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-secondary line-clamp-2 mt-1 leading-relaxed">{note.message}</p>
                        </div>

                        {/* Hover Action Panel */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1.5 bg-card border border-border-color p-1 rounded-lg" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => deleteNotification(note.id)}
                            className="p-1 rounded text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 text-center border-t border-border-color bg-card-hover">
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/student/notifications');
                  }} 
                  className="text-[10px] font-black uppercase tracking-wider text-orange-500 hover:text-orange-600 transition-colors w-full flex items-center justify-center gap-1"
                >
                  View all notifications <ChevronRight size={12} strokeWidth={2} />
                </button>
              </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
