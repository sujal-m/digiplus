import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tasksAPI, usersAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  CheckSquare, Plus, Search, Filter, AlertTriangle, Clock,
  Calendar, User, ArrowUpRight, Loader2, CheckCircle2
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import toast from 'react-hot-toast';

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'my'
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = {
        status: statusFilter,
        priority: priorityFilter,
        search: searchTerm,
        overdue: overdueOnly ? 'true' : undefined,
      };

      let res;
      if (activeTab === 'my') {
        res = await tasksAPI.getMyTasks(params);
        setTasks(res.data.data.tasks || []);
      } else {
        res = await tasksAPI.list(params);
        setTasks(res.data.data.items || []);
      }
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeTab, statusFilter, priorityFilter, overdueOnly]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTasks();
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 font-bold';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      case 'in-progress':
        return 'bg-indigo-100 text-indigo-800';
      case 'blocked':
        return 'bg-red-100 text-red-800 font-bold';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Action Items & Deliverables</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track ownership, deadlines, audit trail, carry-forward status, and recorded closure outcomes.
          </p>
        </div>
        <Link
          to="/tasks/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Action Item
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Organizational Tasks
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'my'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Assigned Tasks
          </button>
        </nav>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search tasks by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border border-gray-300 py-2 px-2.5 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs rounded-lg border border-gray-300 py-2 px-2.5 bg-white"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <button
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1 ${
              overdueOnly
                ? 'bg-red-50 text-red-700 border-red-300 font-bold'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Overdue Only
          </button>
        </div>
      </div>

      {/* Tasks Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">No action items found</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">Create action items to assign accountability and track delivery outcomes.</p>
          <Link
            to="/tasks/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> Create Task
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Action Item</th>
                  <th className="py-3.5 px-4 font-semibold">Assignee</th>
                  <th className="py-3.5 px-4 font-semibold">Priority</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Due Date</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map((task) => {
                  const isTaskOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed';
                  return (
                    <tr key={task._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link to={`/tasks/${task._id}`} className="font-semibold text-gray-900 hover:text-indigo-600 line-clamp-1">
                          {task.title}
                        </Link>
                        {task.outcome?.summary && (
                          <span className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Outcome: {task.outcome.summary}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs text-gray-700 font-medium">
                          {task.assignedTo?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-xs px-2.5 py-0.5 rounded capitalize ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-xs px-2.5 py-0.5 rounded capitalize ${getStatusBadge(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.dueDate ? (
                          <span className={`text-xs flex items-center gap-1 ${isTaskOverdue ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                            {isTaskOverdue && <AlertTriangle className="w-3.5 h-3.5" />}
                            {format(new Date(task.dueDate), 'MMM d, yyyy')}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No deadline</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/tasks/${task._id}`}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-900 inline-flex items-center gap-1"
                        >
                          View Details <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
