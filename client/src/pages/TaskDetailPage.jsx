import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { tasksAPI, usersAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  CheckSquare, Clock, Calendar, User, AlertTriangle, ArrowRightLeft,
  CheckCircle2, MessageSquare, ChevronLeft, Loader2, Award, History,
  Send, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  // Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('open');
  const [statusDetails, setStatusDetails] = useState('');

  const [showReassignModal, setShowReassignModal] = useState(false);
  const [newAssignee, setNewAssignee] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [outcomeSummary, setOutcomeSummary] = useState('');
  const [actualOutcome, setActualOutcome] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const { data } = await tasksAPI.get(id);
      setTask(data.data.task);
      setNewStatus(data.data.task.status);
    } catch (err) {
      toast.error('Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
    usersAPI.list().then(res => setUsers(res.data.data.users || [])).catch(() => {});
  }, [id]);

  const handleStatusChange = async (e) => {
    e.preventDefault();
    try {
      await tasksAPI.updateStatus(id, newStatus);
      toast.success('Task status updated');
      setShowStatusModal(false);
      fetchTask();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleReassign = async (e) => {
    e.preventDefault();
    try {
      await tasksAPI.reassign(id, newAssignee);
      toast.success('Task reassigned successfully');
      setShowReassignModal(false);
      fetchTask();
    } catch (err) {
      toast.error('Failed to reassign task');
    }
  };

  const handleRecordOutcome = async (e) => {
    e.preventDefault();
    try {
      await tasksAPI.recordOutcome(id, {
        summary: outcomeSummary,
        actualOutcome: actualOutcome,
        notes: outcomeNotes,
      });
      toast.success('Task completion outcome recorded permanently');
      setShowOutcomeModal(false);
      fetchTask();
    } catch (err) {
      toast.error('Failed to record outcome');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      setSubmittingComment(true);
      await tasksAPI.addComment(id, newComment);
      setNewComment('');
      fetchTask();
    } catch (err) {
      toast.error('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-24">
        <h3 className="text-lg font-semibold text-gray-900">Task not found</h3>
        <Link to="/tasks" className="text-indigo-600 hover:underline mt-2 inline-block">Back to tasks</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <Link to="/tasks" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-2">
          <ChevronLeft className="w-4 h-4" /> Back to Tasks
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
              <span className={`text-xs px-2.5 py-0.5 rounded font-medium capitalize ${
                task.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                task.status === 'in-progress' ? 'bg-indigo-100 text-indigo-800' :
                task.status === 'blocked' ? 'bg-red-100 text-red-800 font-bold' : 'bg-blue-100 text-blue-800'
              }`}>
                {task.status}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded capitalize ${
                task.priority === 'critical' ? 'bg-red-100 text-red-800' :
                task.priority === 'high' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'
              }`}>
                {task.priority}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Created by <strong className="text-gray-700">{task.createdBy?.name || 'User'}</strong> on {format(new Date(task.createdAt), 'PPP')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              Update Status
            </button>
            <button
              onClick={() => setShowReassignModal(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              Reassign Owner
            </button>
            <button
              onClick={() => setShowOutcomeModal(true)}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5" /> Record Outcome
            </button>
          </div>
        </div>
      </div>

      {/* Outcome Banner (Module 9 Requirement) */}
      {task.outcome?.summary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <h3 className="text-base font-bold text-emerald-950">Recorded Delivery Outcome</h3>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded ml-auto">
              Completed {task.outcome.completionDate ? format(new Date(task.outcome.completionDate), 'PP') : ''}
            </span>
          </div>
          <p className="text-sm font-semibold text-emerald-900 mt-1">
            {task.outcome.summary}
          </p>
          <p className="text-xs text-emerald-800 leading-relaxed">
            <strong>Actual Achievement:</strong> {task.outcome.actualOutcome}
          </p>
          {task.outcome.notes && (
            <p className="text-xs text-emerald-700 italic">
              <strong>Notes:</strong> {task.outcome.notes}
            </p>
          )}
        </div>
      )}

      {/* Main Grid: Details + Audit History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Description & Metadata */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Description</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {task.description || 'No description provided.'}
            </p>
          </div>

          {/* Context Links (Meetings / Handovers) */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Context & Carry-Forward Links</h3>
            </div>
            {task.contextLinks?.length === 0 ? (
              <p className="text-xs text-gray-500">Standalone task with no external meeting or handover linkages.</p>
            ) : (
              <div className="space-y-2">
                {task.contextLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-xs border border-gray-100">
                    <div>
                      <span className="font-semibold text-gray-900 capitalize">{link.sourceType} Reference:</span>
                      <span className="text-gray-500 ml-2 font-mono">{link.sourceId}</span>
                      {link.isOriginalSource && (
                        <span className="ml-2 bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                          ORIGINAL SOURCE
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400">{format(new Date(link.linkedAt), 'PP')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" /> Comments & Progress Updates ({task.comments?.length || 0})
            </h3>

            <div className="space-y-3">
              {task.comments?.map((c, i) => (
                <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-900">{c.author?.name || 'User'}</span>
                    <span className="text-gray-400">{format(new Date(c.createdAt), 'PP p')}</span>
                  </div>
                  <p className="text-xs text-gray-700">{c.content}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Add a progress update or comment..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                className="flex-1 text-xs rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={submittingComment || !newComment.trim()}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" /> Post
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Metadata Cards & Chronological Audit Timeline */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Information</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Current Owner</span>
                <span className="font-bold text-gray-900">{task.assignedTo?.name || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Deadline</span>
                <span className="font-bold text-gray-900">
                  {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No target date'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Priority</span>
                <span className="font-bold uppercase text-gray-900">{task.priority}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Status</span>
                <span className="font-bold uppercase text-gray-900">{task.status}</span>
              </div>
            </div>
          </div>

          {/* Immutable Audit Trail Timeline (Strict Assessment Rule) */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Permanent Audit Trail</h4>
            </div>
            <p className="text-[11px] text-gray-500">
              Audit trail preserves every ownership transition, deadline extension, and status change.
            </p>

            <div className="relative pl-4 space-y-4 border-l-2 border-indigo-100">
              {task.history?.map((h, idx) => (
                <div key={idx} className="relative text-xs">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white" />
                  <p className="font-bold text-gray-900 capitalize">{h.event.replace('_', ' ')}</p>
                  <p className="text-gray-600 mt-0.5">{h.details || `Event logged by ${h.actor?.name || 'system'}`}</p>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">{format(new Date(h.timestamp), 'MMM d, p')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Update Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-gray-900 mb-3">Update Task Status</h3>
            <form onSubmit={handleStatusChange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full text-sm rounded-lg border border-gray-300 p-2.5"
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowStatusModal(false)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded-lg">Save Status</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-gray-900 mb-3">Reassign Task Owner</h3>
            <form onSubmit={handleReassign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">New Assignee</label>
                <select
                  value={newAssignee}
                  onChange={e => setNewAssignee(e.target.value)}
                  className="w-full text-sm rounded-lg border border-gray-300 p-2.5"
                >
                  <option value="">Select teammate...</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.team})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowReassignModal(false)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded-lg">Confirm Reassignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Outcome Recording Modal (Mandatory Module 9) */}
      {showOutcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-gray-900">Record Final Delivery Outcome</h3>
            </div>
            <p className="text-xs text-gray-500">
              Distinguish between marking a task finished and documenting what was actually achieved. This outcome is preserved permanently in the organizational memory.
            </p>
            <form onSubmit={handleRecordOutcome} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Completion Summary *</label>
                <input
                  type="text"
                  required
                  value={outcomeSummary}
                  onChange={e => setOutcomeSummary(e.target.value)}
                  placeholder="e.g. Load testing verified 5,000 req/sec with <50ms latency"
                  className="w-full text-xs rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Actual Outcome & Achievements *</label>
                <textarea
                  required
                  rows={3}
                  value={actualOutcome}
                  onChange={e => setActualOutcome(e.target.value)}
                  placeholder="Describe the concrete deliverable, links to pull requests, or benchmark results..."
                  className="w-full text-xs rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Supporting Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={outcomeNotes}
                  onChange={e => setOutcomeNotes(e.target.value)}
                  placeholder="Any operational follow-ups, monitoring dashboards, or caveats..."
                  className="w-full text-xs rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOutcomeModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Save Outcome & Close Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
