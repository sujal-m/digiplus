import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../api/client';
import {
  Bell, Check, CheckCheck, Calendar, ArrowRightLeft,
  CheckSquare, AlertCircle, Loader2, ArrowRight
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await notificationsAPI.list({
        unreadOnly: unreadOnly ? 'true' : undefined,
      });
      setNotifications(data.data.items || []);
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  const handleMarkAsRead = async (notification) => {
    try {
      if (!notification.read) {
        await notificationsAPI.markRead(notification._id);
        setNotifications(prev =>
          prev.map(n => n._id === notification._id ? { ...n, read: true } : n)
        );
      }

      // Navigate to context target if available
      if (notification.sourceType && notification.sourceId) {
        if (notification.sourceType === 'meeting') navigate(`/meetings/${notification.sourceId}`);
        else if (notification.sourceType === 'handover') navigate(`/handovers/${notification.sourceId}`);
        else if (notification.sourceType === 'task') navigate(`/tasks/${notification.sourceId}`);
      }
    } catch (err) {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      toast.success('All notifications marked as read');
      fetchNotifications();
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type) => {
    if (type.startsWith('meeting')) return <Calendar className="w-5 h-5 text-blue-600" />;
    if (type.startsWith('handover')) return <ArrowRightLeft className="w-5 h-5 text-purple-600" />;
    if (type.startsWith('task')) return <CheckSquare className="w-5 h-5 text-indigo-600" />;
    return <Bell className="w-5 h-5 text-gray-600" />;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications & Alerts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Stay informed on pending handover sign-offs, approaching deadlines, and task reassignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              unreadOnly
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {unreadOnly ? 'Showing Unread' : 'Show Unread Only'}
          </button>
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">No notifications</h3>
          <p className="text-sm text-gray-500 mt-1">
            You're all caught up! New action item assignments and handover alerts will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden shadow-sm">
          {notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => handleMarkAsRead(n)}
              className={`p-4 flex items-start gap-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                !n.read ? 'bg-indigo-50/40' : ''
              }`}
            >
              <div className="p-2 rounded-lg bg-white border border-gray-100 shadow-2xs mt-0.5">
                {getNotificationIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-sm truncate ${!n.read ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                    {n.title}
                  </h4>
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {n.message}
                </p>

                {n.sourceType && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-semibold mt-2 hover:underline">
                    View {n.sourceType} details <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </div>

              {!n.read && (
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
