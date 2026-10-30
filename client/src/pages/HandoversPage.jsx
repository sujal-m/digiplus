import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { handoversAPI } from '../api/client';
import {
  ArrowRightLeft, Plus, Search, Calendar, User, ArrowRight,
  CheckCircle, Clock, AlertCircle, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function HandoversPage() {
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchHandovers = async () => {
    try {
      setLoading(true);
      const { data } = await handoversAPI.list({
        status: statusFilter,
        search: searchTerm,
      });
      setHandovers(data.data.items || []);
    } catch (err) {
      toast.error('Failed to load handovers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandovers();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchHandovers();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      case 'pending-acknowledgement':
        return 'bg-amber-100 text-amber-800 animate-pulse';
      case 'in-progress':
        return 'bg-indigo-100 text-indigo-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Transfers & Handovers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Preserve organizational memory, task ownership, and decisions when responsibilities transition.
          </p>
        </div>
        <Link
          to="/handovers/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Handover
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search handovers by title, description, or background..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['all', 'pending-acknowledgement', 'accepted', 'in-progress', 'completed', 'draft'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {status.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Handover Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : handovers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ArrowRightLeft className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">No handovers found</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Create your first work handover to transfer ongoing duties with complete historical context.
          </p>
          <Link
            to="/handovers/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> Start Handover
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {handovers.map((h) => (
            <Link
              key={h._id}
              to={`/handovers/${h._id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group block"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusBadge(h.status)}`}>
                  {h.status.replace('-', ' ')}
                </span>
                {h.team && (
                  <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                    {h.team}
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                {h.title}
              </h3>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {h.description || h.background || 'No description provided.'}
              </p>

              {/* Owner Transition Visual */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center">
                      {h.outgoingOwner?.name?.charAt(0) || 'O'}
                    </div>
                    <span className="font-medium text-gray-800">{h.outgoingOwner?.name || 'Outgoing'}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                      {h.incomingOwner?.name?.charAt(0) || 'I'}
                    </div>
                    <span className="font-medium text-indigo-900">{h.incomingOwner?.name || 'Incoming'}</span>
                  </div>
                </div>

                {h.contextScore && (
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                    {h.contextScore.score}% Context
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
