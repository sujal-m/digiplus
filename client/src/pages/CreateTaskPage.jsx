import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { tasksAPI, usersAPI, meetingsAPI } from '../api/client';
import { ChevronLeft, CheckSquare, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateTaskPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    priority: 'medium',
    status: 'open',
    sourceType: 'manual',
    sourceId: '',
    tags: '',
  });

  useEffect(() => {
    usersAPI.list().then(res => setUsers(res.data.data.users || [])).catch(() => {});
    meetingsAPI.list({ limit: 30 }).then(res => setMeetings(res.data.data.items || [])).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: formData.title,
        description: formData.description,
        assignedTo: formData.assignedTo || undefined,
        dueDate: formData.dueDate || undefined,
        priority: formData.priority,
        status: formData.status,
        source: {
          sourceType: formData.sourceType,
          sourceId: formData.sourceId || undefined,
        },
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };

      const { data } = await tasksAPI.create(payload);
      toast.success('Action item created successfully');
      navigate(`/tasks/${data.data.task._id}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create action item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link to="/tasks" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-2">
          <ChevronLeft className="w-4 h-4" /> Back to Tasks
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Action Item</h1>
        <p className="text-sm text-gray-500 mt-1">Assign responsibility, deadline, and context to ensure delivery.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Action Item Title *
          </label>
          <input
            type="text"
            required
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Conduct load testing on payment gateway"
            className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Description & Context
          </label>
          <textarea
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            placeholder="Detailed scope, technical requirements, or dependencies..."
            className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Assignee
            </label>
            <select
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleChange}
              className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Unassigned</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.team})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Target Due Date
            </label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Priority
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full text-sm rounded-lg border border-gray-300 p-2.5"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Initial Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full text-sm rounded-lg border border-gray-300 p-2.5"
            >
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Source Meeting (Optional)
          </label>
          <select
            name="sourceId"
            value={formData.sourceId}
            onChange={(e) => {
              handleChange(e);
              setFormData(p => ({ ...p, sourceType: e.target.value ? 'meeting' : 'manual' }));
            }}
            className="w-full text-sm rounded-lg border border-gray-300 p-2.5"
          >
            <option value="">Not linked to a meeting (Standalone task)</option>
            {meetings.map(m => (
              <option key={m._id} value={m._id}>{m.title} ({new Date(m.dateTime).toLocaleDateString()})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            placeholder="e.g. backend, database, sprint-14"
            className="w-full text-sm rounded-lg border border-gray-300 p-2.5"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <Link to="/tasks" className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
            Create Action Item
          </button>
        </div>
      </form>
    </div>
  );
}
