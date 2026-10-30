import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { handoversAPI, usersAPI, meetingsAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, ArrowRightLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateHandoverPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [meetings, setMeetings] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    incomingOwner: '',
    team: user?.team || 'Engineering',
    startDate: '',
    endDate: '',
    background: '',
    handoverNotes: '',
    relatedMeetings: [],
  });

  useEffect(() => {
    usersAPI.list().then(res => setUsers(res.data.data.users || [])).catch(() => {});
    meetingsAPI.list({ limit: 30 }).then(res => setMeetings(res.data.data.items || [])).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMeetingToggle = (id) => {
    setFormData(prev => {
      const exists = prev.relatedMeetings.includes(id);
      return {
        ...prev,
        relatedMeetings: exists
          ? prev.relatedMeetings.filter(mId => mId !== id)
          : [...prev.relatedMeetings, id]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.incomingOwner) {
      toast.error('Please select an incoming owner');
      return;
    }

    try {
      setLoading(true);
      const { data } = await handoversAPI.create(formData);
      toast.success('Handover draft created successfully');
      navigate(`/handovers/${data.data.handover._id}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create handover');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link to="/handovers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-2">
          <ChevronLeft className="w-4 h-4" /> Back to Handovers
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Initiate Work Transfer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Capture duties, context, deadlines, and decisions so work seamlessly transitions to the incoming owner.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Handover Title *
          </label>
          <input
            type="text"
            name="title"
            required
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Sprint 14 Frontend Deliverables & Roadmap Handover"
            className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Incoming Owner (Successor) *
            </label>
            <select
              name="incomingOwner"
              required
              value={formData.incomingOwner}
              onChange={handleChange}
              className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select teammate taking over...</option>
              {users.filter(u => u._id !== user?.id).map(u => (
                <option key={u._id} value={u._id}>
                  {u.name} — {u.title || u.role} ({u.team})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Team / Department
            </label>
            <input
              type="text"
              name="team"
              value={formData.team}
              onChange={handleChange}
              placeholder="e.g. Engineering, Product, Design"
              className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Transfer Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Expected End / Review Date
            </label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Background & Reason for Transfer
          </label>
          <textarea
            name="background"
            rows={3}
            value={formData.background}
            onChange={handleChange}
            placeholder="Explain why this handover is taking place (e.g. planned leave, promotion, new project rotation)..."
            className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Operational Handover Notes & Critical Instructions
          </label>
          <textarea
            name="handoverNotes"
            rows={4}
            value={formData.handoverNotes}
            onChange={handleChange}
            placeholder="Key daily processes, runbook links, customer points of contact, credentials guidance, and urgent priorities..."
            className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {meetings.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Link Relevant Prior Meetings
            </label>
            <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg p-2">
              {meetings.map(m => (
                <label key={m._id} className="p-2 flex items-center gap-3 hover:bg-gray-50 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={formData.relatedMeetings.includes(m._id)}
                    onChange={() => handleMeetingToggle(m._id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1 truncate">
                    <span className="font-semibold text-gray-800">{m.title}</span>
                    <span className="text-gray-400 ml-2">({new Date(m.dateTime).toLocaleDateString()})</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <Link
            to="/handovers"
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
            Create Handover
          </button>
        </div>
      </form>
    </div>
  );
}
