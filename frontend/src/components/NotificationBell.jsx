import React, { useState } from 'react';
import useNotificationStore from '../store/notificationStore';
import { Bell, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
  const { notifications, unreadCount, markRead, markAllRead, poll } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    poll();
  }, [poll]);

  const priorityColors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-blue-500',
    low: 'bg-gray-400'
  };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all">
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white shadow-sm"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card shadow-lg rounded-xl border border-border-color overflow-hidden z-50">
          <div className="p-3 border-b border-border-color flex justify-between items-center bg-card-hover">
            <h3 className="font-semibold text-primary">Notifications</h3>
            <button onClick={markAllRead} className="text-xs text-info hover:text-accent-hover flex items-center transition-colors">
              <Check size={14} className="mr-1" /> Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-secondary text-sm">No notifications</p>
            ) : (
              notifications.slice(0, 5).map(note => (
                <div key={note.id} className={`p-3 border-b border-border-light hover:bg-card-hover cursor-pointer ${!note.is_read ? 'bg-info/5' : ''}`} onClick={() => { markRead(note.id); setIsOpen(false); if(note.action_url) navigate(note.action_url); }}>
                  <div className="flex items-start">
                    <div className={`h-2 w-2 mt-1.5 rounded-full ${!note.is_read ? priorityColors[note.priority] : 'bg-border-color'} mr-3`}></div>
                    <div>
                      <p className="text-sm font-medium text-primary">{note.title}</p>
                      <p className="text-xs text-secondary line-clamp-2 mt-1">{note.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-2.5 text-center border-t border-border-color bg-card-hover">
            <button 
              onClick={() => {
                setIsOpen(false);
                navigate('/student/notifications');
              }} 
              className="text-xs font-black uppercase tracking-wider text-orange-500 hover:text-orange-600 transition-colors w-full"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default NotificationBell;
