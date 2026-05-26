import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, ShieldAlert, Award, Bookmark, Inbox } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { communityService, Notification } from '../services/communityService';
import { useToast } from './Toast';

interface NotificationBellProps {
  userId: string;
  onSelectWarning?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ 
  userId,
  onSelectWarning 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const data = await communityService.getNotifications(userId);
      setNotifications(data || []);
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 10 seconds for standard live updates
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await communityService.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      showToast('Notification marked as read', 'success');
    } catch (e) {
      showToast('Failed to update notification', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setLoading(true);
    try {
      await communityService.markAllNotificationsAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      showToast('All notifications marked as read', 'success');
    } catch (e) {
      showToast('Error updating notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning_received':
        return <ShieldAlert className="text-red-500 shrink-0" size={16} />;
      case 'post_pinned':
        return <Award className="text-amber-500 shrink-0" size={16} />;
      case 'flag_alert':
        return <ShieldAlert className="text-orange-500 shrink-0" size={16} />;
      default:
        return <Bookmark className="text-[#FF6B35] shrink-0" size={16} />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center text-brand-text active:scale-90 transition-all shadow-sm"
        title="Notifications"
      >
        <Bell size={20} className={unreadCount > 0 ? 'animate-bounce text-[#FF6B35]' : 'text-brand-muted'} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-[#FF6B35] text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-brand-surface">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute right-0 mt-2 w-80 max-h-96 bg-brand-surface border border-brand-border rounded-[2rem] shadow-2xl overflow-hidden z-[500] flex flex-col"
          >
            {/* Header */}
            <div className="bg-brand-bg px-6 py-4 border-b border-brand-border flex items-center justify-between">
              <div>
                <h4 className="font-sans font-black text-xs uppercase tracking-wider text-brand-text">🔔 Notifications</h4>
                <p className="text-[9px] font-bold text-brand-muted uppercase tracking-wider mt-0.5">
                  {unreadCount} UNREAD ALERTS
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-[10px] font-black text-[#FF6B35] hover:text-[#e05621] uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  <Check size={12} />
                  Clear All
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto no-scrollbar division-y divide-brand-border/40 max-h-72">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                  <div className="w-12 h-12 bg-brand-bg rounded-full flex items-center justify-center text-brand-muted mb-3">
                    <Inbox size={22} className="text-brand-muted/40" />
                  </div>
                  <p className="text-xs font-bold text-brand-muted">All quiet here!</p>
                  <p className="text-[10px] text-brand-muted/60 mt-1">You will receive notifications for pins, warnings, and moderations.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 flex gap-3 transition-colors text-left border-b border-brand-border/30 last:border-none ${
                      !n.is_read ? 'bg-[#FF6B35]/5 hover:bg-[#FF6B35]/10' : 'hover:bg-brand-bg/50'
                    }`}
                  >
                    <div className="pt-0.5">{getIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed font-semibold text-brand-text ${!n.is_read ? 'font-bold' : ''}`}>
                        {n.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[8px] font-bold text-brand-muted font-mono uppercase">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!n.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(n.id)}
                            className="bg-brand-accent/10 hover:bg-brand-accent text-brand-accent hover:text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider transition-all"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
