import { create } from 'zustand';
import axios from '../api/axios';
import { toast } from 'react-hot-toast';
// Custom pure-JS styled toast for high-fidelity professional notifications (Vite compliant)
const showNotificationToast = (note) => {
  let icon = '🔔';
  let duration = 6000;
  let background = '#ffffff';
  let color = '#0f172a';
  let border = '1px solid #e2e8f0';
  
  if (note.title.includes('🎉') || note.title.toLowerCase().includes('shortlisted')) {
    icon = '🎉';
    background = '#ecfdf5';
    color = '#065f46';
    border = '1px solid #a7f3d0';
  } else if (note.title.includes('📅') || note.title.toLowerCase().includes('interview')) {
    icon = '📅';
    duration = 7000;
    background = '#fff7ed';
    color = '#9a3412';
    border = '1px solid #ffedd5';
  } else if (note.title.includes('🏆') || note.title.toLowerCase().includes('placed') || note.title.toLowerCase().includes('selected')) {
    icon = '🏆';
    duration = 9000;
    background = '#fffbeb';
    color = '#92400e';
    border = '1px solid #fef3c7';
  } else if (note.title.toLowerCase().includes('reject') || note.title.toLowerCase().includes('sorry')) {
    icon = '📢';
    background = '#fef2f2';
    color = '#991b1b';
    border = '1px solid #fee2e2';
  }

  toast(note.title + '\n\n' + note.message, {
    icon,
    duration,
    id: note.id,
    style: {
      borderRadius: '16px',
      background,
      color,
      border,
      fontWeight: '700',
      fontSize: '13px',
      padding: '16px',
      whiteSpace: 'pre-line',
      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },
  });
};

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  pollingActive: false,

  fetchNotifications: async () => {
    try {
      const response = await axios.get('/applications/notifications/');
      const data = response.data || [];
      
      // Filter for new unread notifications that were not present in our store yet
      const previousNotifications = get().notifications;
      if (previousNotifications.length > 0) {
        const newUnread = data.filter(note => 
          !note.is_read && 
          !previousNotifications.some(prev => prev.id === note.id)
        );
        // Trigger beautiful custom toasts for any new unread notification
        newUnread.forEach(note => {
          showNotificationToast(note);
        });
      }
      
      set({ 
        notifications: data,
        unreadCount: data.filter(n => !n.is_read).length
      });
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  },

  markRead: async (id) => {
    try {
      await axios.patch(`/applications/notifications/${id}/read/`);
      set(state => {
        const updated = state.notifications.map(n => 
          n.id === id ? { ...n, is_read: true } : n
        );
        return {
          notifications: updated,
          unreadCount: updated.filter(n => !n.is_read).length
        };
      });
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  },

  markAllRead: async () => {
    try {
      await axios.patch('/applications/notifications/read-all/');
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
      }));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  },

  poll: () => {
    if (get().pollingActive) return;
    set({ pollingActive: true });
    get().fetchNotifications();
    setInterval(() => {
      get().fetchNotifications();
    }, 15000); // Poll every 15 seconds for real-time pipeline changes
  }
}));

export default useNotificationStore;
