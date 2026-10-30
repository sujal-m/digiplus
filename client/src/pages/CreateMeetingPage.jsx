import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { meetingsAPI, usersAPI } from '../api/client';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateMeetingPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    objective: '',
    dateTime: '',
    location: '',
    participants: [],
    agenda: [{ title: '', description: '', duration: 15 }],
  });

  useEffect(() => {
    usersAPI.list({ limit: 100 }).then(({ data }) => {
      setUsers(data.data?.users || data.data || []);
    }).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleParticipantToggle = (userId) => {
    setFormData((prev) => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter((id) => id !== userId)
        : [...prev.participants, userId],
    }));
  };

  const handleAgendaChange = (index, field, value) => {
    setFormData((prev) => {
      const agenda = [...prev.agenda];
      agenda[index] = { ...agenda[index], [field]: value };
      return { ...prev, agenda };
    });
  };

  const addAgendaItem = () => {
    setFormData((prev) => ({
      ...prev,
      agenda: [...prev.agenda, { title: '', description: '', duration: 15 }],
    }));
  };

  const removeAgendaItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      agenda: prev.agenda.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e, asDraft = false) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...formData,
        dateTime: formData.dateTime || new Date(Date.now() + 86400000).toISOString(),
        status: asDraft ? 'draft' : 'scheduled',
        participants: formData.participants.map(id => ({ user: id, role: 'required' })),
        agenda: formData.agenda.filter((a) => a.title.trim()).map(a => ({
          ...a,
          duration: Number(a.duration) || 15
        })),
      };
      const { data } = await meetingsAPI.create(payload);
      const meeting = data.data?.meeting || data.data;
      toast.success(asDraft ? 'Meeting saved as draft!' : 'Meeting created successfully!');
      navigate(`/meetings/${meeting._id}`);
    } catch (err) {
      const errDetails = err.response?.data?.error?.details;
      const msg = err.response?.data?.error?.message || err.response?.data?.message;
      if (Array.isArray(errDetails) && errDetails.length > 0) {
        toast.error(errDetails.map(d => d.message || d).join(', '));
      } else {
        toast.error(msg || 'Failed to create meeting');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create Meeting</h1>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Meeting Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input name="title" value={formData.title} onChange={handleChange} required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
              placeholder="Weekly standup" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
              placeholder="What is this meeting about?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objective</label>
            <input name="objective" value={formData.objective} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
              placeholder="What do you want to achieve?" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
              <input type="datetime-local" name="dateTime" value={formData.dateTime} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input name="location" value={formData.location} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                placeholder="Room A / Zoom link" />
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Participants</h2>
          {users.length === 0 ? (
            <p className="text-sm text-gray-500">Loading users...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {users.map((u) => (
                <label key={u._id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={formData.participants.includes(u._id)}
                    onChange={() => handleParticipantToggle(u._id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700">{u.name} <span className="text-gray-400">({u.email})</span></span>
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400">{formData.participants.length} selected</p>
        </div>

        {/* Agenda */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Agenda Items</h2>
            <button type="button" onClick={addAgendaItem}
              className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              <Plus className="h-4 w-4" /> Add Item
            </button>
          </div>
          {formData.agenda.map((item, idx) => (
            <div key={idx} className="flex gap-3 items-start p-3 rounded-lg border border-gray-100 bg-gray-50">
              <span className="text-sm font-medium text-gray-400 mt-2">{idx + 1}.</span>
              <div className="flex-1 space-y-2">
                <input value={item.title} onChange={(e) => handleAgendaChange(idx, 'title', e.target.value)}
                  placeholder="Agenda item title"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none" />
                <div className="flex gap-2">
                  <input value={item.description} onChange={(e) => handleAgendaChange(idx, 'description', e.target.value)}
                    placeholder="Description (optional)"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none" />
                  <div className="flex items-center gap-1">
                    <input type="number" min={1} value={item.duration}
                      onChange={(e) => handleAgendaChange(idx, 'duration', parseInt(e.target.value) || 0)}
                      className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-sm text-center focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none" />
                    <span className="text-xs text-gray-400">min</span>
                  </div>
                </div>
              </div>
              {formData.agenda.length > 1 && (
                <button type="button" onClick={() => removeAgendaItem(idx)}
                  className="mt-2 text-gray-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={(e) => handleSubmit(e, true)} disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Save as Draft
          </button>
          <button type="submit" disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Meeting
          </button>
        </div>
      </form>
    </div>
  );
}
