import React, { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Clock, Loader2, Package } from 'lucide-react';
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

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const [notificationsRes, countRes] = await Promise.all([
        NotificationService.getAll({ per_page: 50 }),
        NotificationService.getUnreadCount(),
      ]);

      if (notificationsRes.data.success) {
        setNotifications(notificationsRes.data.data);
      }
      if (countRes.data.success) {
        setUnreadCount(countRes.data.count);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
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
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-sm text-slate-500 font-medium">Manage your notifications.</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-[#f97316]" />
            <h3 className="text-lg font-black text-slate-900">My Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-3 py-1 bg-rose-100 text-rose-600 text-xs font-black rounded-full">{unreadCount} unread</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <CheckCheck size={16} />
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#f97316]" size={32} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <Bell size={64} className="text-slate-300 mb-4" />
            <p className="text-slate-400 font-black text-lg mb-2">Không có thông báo</p>
            <p className="text-slate-400 text-sm">Bạn sẽ nhận được thông báo khi có cập nhật mới</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`
                  p-6 transition-colors hover:bg-slate-50
                  ${!notification.is_read ? 'bg-orange-50/30' : ''}
                `}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`
                      w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                      ${!notification.is_read ? 'bg-[#f97316] text-white' : 'bg-slate-100 text-slate-400'}
                    `}
                  >
                    <Package size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <h4
                          className={`
                            text-base font-black mb-1
                            ${!notification.is_read ? 'text-slate-900' : 'text-slate-600'}
                          `}
                        >
                          {notification.title}
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed">{notification.message}</p>
                      </div>
                      {!notification.is_read && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-2 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
                          title="Đánh dấu đã đọc"
                        >
                          <Check size={16} className="text-slate-400" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <p className="text-xs text-slate-400 font-bold flex items-center gap-1">
                        <Clock size={12} />
                        {formatTime(notification.created_at)}
                      </p>
                      {notification.related_type && (
                        <span className="text-xs text-slate-400 font-bold">{notification.related_type} #{notification.related_id}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
