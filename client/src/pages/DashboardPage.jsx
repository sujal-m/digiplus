import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI, activityAPI } from '../api/client';
import {
  BarChart3, Calendar, CheckSquare, AlertTriangle, ArrowRightLeft,
  Clock, ChevronRight, Loader2, RefreshCw, Inbox
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, activityRes] = await Promise.all([
        dashboardAPI.getStats(),
        activityAPI.list({ limit: 10 }),
      ]);
      setStats(statsRes.data.data);
      const actList = activityRes.data.data?.items || activityRes.data.data?.activities || statsRes.data.data?.recentActivity || [];
      setActivities(Array.isArray(actList) ? actList : []);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load dashboard data';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load dashboard</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button onClick={fetchData} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Meetings', value: stats?.totalMeetings ?? 0, icon: Calendar, color: 'bg-blue-50 text-blue-600' },
    { label: 'Open Tasks', value: stats?.openTasks ?? 0, icon: CheckSquare, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Overdue Tasks', value: stats?.overdueTasks ?? 0, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
    { label: 'Pending Handovers', value: stats?.totalHandovers ?? 0, icon: ArrowRightLeft, color: 'bg-amber-50 text-amber-600' },
  ];

  const tasksByStatus = stats?.tasksByStatus
    ? Object.entries(stats.tasksByStatus).map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }))
    : [];

  const pendingTasks = Array.isArray(stats?.pendingTasks) ? stats.pendingTasks : (Array.isArray(stats?.myPendingTasks) ? stats.myPendingTasks : []);
  const upcomingMeetings = Array.isArray(stats?.upcomingMeetings) ? stats.upcomingMeetings : [];
  const pendingHandovers = Array.isArray(stats?.pendingHandoversList) ? stats.pendingHandoversList : (Array.isArray(stats?.pendingHandovers) ? stats.pendingHandovers : []);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name || 'User'}</h1>
        <p className="text-gray-500 mt-1">Here's what's happening across your projects today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by Status Chart */}
        {tasksByStatus.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Status</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={tasksByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <Inbox className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No recent activity yet. Start by creating a meeting or task!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {(Array.isArray(activities) ? activities : []).map((activity, idx) => (
                <div key={activity._id || idx} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 capitalize">{activity.description || (activity.action ? activity.action.replace(/_/g, ' ') : 'Activity')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {activity.createdAt ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true }) : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Tasks */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">My Pending Tasks</h2>
          <Link to="/tasks" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {pendingTasks.length === 0 ? (
          <div className="text-center py-8">
            <CheckSquare className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No pending tasks. You're all caught up!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Priority</th>
                  <th className="pb-2 font-medium">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {pendingTasks.map((task) => {
                  const overdue = task.dueDate && isPast(new Date(task.dueDate));
                  return (
                    <tr key={task._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5">
                        <Link to={`/tasks/${task._id}`} className="text-indigo-600 hover:text-indigo-700 font-medium">
                          {task.title}
                        </Link>
                      </td>
                      <td className="py-2.5">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="py-2.5">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className={`py-2.5 ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '—'}
                        {overdue && <span className="ml-1 text-xs">(overdue)</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Meetings */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Meetings</h2>
            <Link to="/meetings" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {upcomingMeetings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No upcoming meetings scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingMeetings.map((meeting) => (
                <Link key={meeting._id} to={`/meetings/${meeting._id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{meeting.title}</p>
                    <p className="text-xs text-gray-500">
                      {meeting.dateTime ? format(new Date(meeting.dateTime), 'MMM d, yyyy · h:mm a') : 'No date set'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pending Handovers */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Pending Handovers</h2>
            <Link to="/handovers" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {pendingHandovers.length === 0 ? (
            <div className="text-center py-8">
              <ArrowRightLeft className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No pending handovers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingHandovers.map((h) => (
                <Link key={h._id} to={`/handovers/${h._id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                  <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <ArrowRightLeft className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{h.title}</p>
                    <p className="text-xs text-gray-500">
                      {h.outgoingOwner?.name || 'Unknown'} → {h.incomingOwner?.name || 'Unknown'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    open: 'bg-blue-50 text-blue-700',
    'in-progress': 'bg-indigo-50 text-indigo-700',
    blocked: 'bg-red-50 text-red-700',
    completed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status || 'unknown'}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const styles = {
    critical: 'bg-red-50 text-red-700',
    high: 'bg-orange-50 text-orange-700',
    medium: 'bg-yellow-50 text-yellow-700',
    low: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[priority] || 'bg-gray-100 text-gray-600'}`}>
      {priority || 'none'}
    </span>
  );
}
