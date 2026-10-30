import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { meetingsAPI } from '../api/client';
import { Plus, Search, Calendar, Users, Loader2, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-50 text-blue-700',
  'in-progress': 'bg-yellow-50 text-yellow-700',
  completed: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-gray-100 text-gray-600',
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 12;

  const fetchMeetings = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (status) params.status = status;
      if (search.trim()) params.search = search.trim();
      const { data } = await meetingsAPI.list(params);
      const result = data.data;
      const list = result.items || result.meetings || result.docs || (Array.isArray(result) ? result : []);
      setMeetings(Array.isArray(list) ? list : []);
      setTotalPages(result.pages || result.totalPages || Math.ceil((result.total || 0) / limit) || 1);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load meetings';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMeetings(); }, [page, status]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMeetings();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
        <Link to="/meetings/new"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
          <Plus className="h-4 w-4" /> New Meeting
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none">
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search meetings..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none" />
          </div>
          <button type="submit" className="rounded-lg px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
            Search
          </button>
        </form>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <div className="text-center py-24">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load meetings</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button onClick={fetchMeetings} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No meetings yet</h3>
          <p className="text-gray-500 mb-4">Create your first meeting to get started!</p>
          <Link to="/meetings/new"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> New Meeting
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {meetings.map((meeting) => (
              <Link key={meeting._id} to={`/meetings/${meeting._id}`}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-indigo-200 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 truncate flex-1 mr-2">{meeting.title}</h3>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_COLORS[meeting.status] || 'bg-gray-100 text-gray-600'}`}>
                    {meeting.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>{meeting.dateTime ? format(new Date(meeting.dateTime), 'MMM d, yyyy · h:mm a') : 'No date set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span>{meeting.organizer?.name || 'Unknown organizer'} · {meeting.participants?.length || 0} participants</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
