import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Loader2, Package, X } from 'lucide-react';
import { NotificationService } from '../services/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  related_type: string | null;
  related_id: string | null;
  created_at: string;
}

interface NotificationDropdownProps {
  onNavigate?: (view: string, relatedId?: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('cx_token');
      if (!token) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      setIsLoading(true);
      const [notificationsRes, countRes] = await Promise.all([
        NotificationService.getAll({ per_page: 10 }),
        NotificationService.getUnreadCount()
      ]);

      if (notificationsRes.data.success) {
        setNotifications(notificationsRes.data.data);
      }
      if (countRes.data.success) {
        setUnreadCount(countRes.data.count);
      }
    } catch (error) {
      // Ignore 401s when user is not authenticated
      const status = (error as any)?.response?.status;
      if (status !== 401) {
        console.error('Error fetching notifications:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const handleShipmentUpdated = () => {
      fetchNotifications();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('shipment:updated', handleShipmentUpdated);
    }

    // Auto refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('shipment:updated', handleShipmentUpdated);
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const handleMarkAsRead = async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n =>
          n.id === id
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on related type
    if (notification.related_id && onNavigate) {
      const relatedType = (notification.related_type || '').toLowerCase();

      if (relatedType === 'shipment') {
        onNavigate('SHIPMENT_MANAGEMENT', notification.related_id);
        setIsOpen(false);
        return;
      }

      if (relatedType === 'courier') {
        onNavigate('SHIPMENT_MANAGEMENT', notification.related_id);
        setIsOpen(false);
        return;
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-GB');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetchNotifications();
          }
        }}
        className="relative p-2.5 text-slate-500 hover:text-[#f97316] hover:bg-orange-50 rounded-xl transition-all"
        title="Notifications"
      >
        <Bell size={20} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1.5 border-2 border-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-[600px] flex flex-col animate-in fade-in zoom-in duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-[#f97316]" />
              <h3 className="font-black text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-xs font-black rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={16} className="text-slate-400" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                title="Close"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-[#f97316]" size={24} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Bell size={48} className="text-slate-300 mb-3" />
                <p className="text-slate-400 font-bold text-sm">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`
                      p-4 cursor-pointer transition-colors hover:bg-slate-50
                      ${!notification.is_read ? 'bg-orange-50/50' : ''}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                        ${!notification.is_read 
                          ? 'bg-[#f97316] text-white' 
                          : 'bg-slate-100 text-slate-400'
                        }
                      `}>
                        <Package size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`
                            text-sm font-black leading-tight
                            ${!notification.is_read ? 'text-slate-900' : 'text-slate-600'}
                          `}>
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                              className="p-1 hover:bg-slate-200 rounded transition-colors shrink-0"
                              title="Mark as read"
                            >
                              <Check size={12} className="text-slate-400" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('NOTIFICATIONS');
                    setIsOpen(false);
                  }
                }}
                className="w-full py-2 text-center text-xs font-black text-[#f97316] hover:bg-orange-50 rounded-xl transition-colors"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
