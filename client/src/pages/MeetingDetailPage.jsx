import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { meetingsAPI, aiAPI, decisionsAPI, tasksAPI, usersAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  Calendar, Clock, MapPin, Users, CheckCircle, AlertTriangle,
  Brain, FileText, ArrowRightLeft, Plus, Save, Sparkles, CheckSquare,
  ChevronLeft, Loader2, Award, Info
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function MeetingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [meeting, setMeeting] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [contextScore, setContextScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [generatingRecap, setGeneratingRecap] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Modals
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionTitle, setDecisionTitle] = useState('');
  const [decisionRationale, setDecisionRationale] = useState('');

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');

  const [showCarryForwardModal, setShowCarryForwardModal] = useState(false);
  const [openTasksPool, setOpenTasksPool] = useState([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [usersList, setUsersList] = useState([]);

  const fetchMeeting = async () => {
    try {
      setLoading(true);
      const { data } = await meetingsAPI.get(id);
      const meetingData = data.data.meeting;
      setMeeting(meetingData);
      setDecisions(data.data.decisions || []);
      setActionItems(data.data.actionItems || []);
      setContextScore(data.data.contextScore || meetingData.contextScore);
      setNotes(meetingData.notes || '');
    } catch (err) {
      toast.error('Failed to load meeting details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeeting();
    usersAPI.list().then(res => setUsersList(res.data.data.users || [])).catch(() => {});
  }, [id]);

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      await meetingsAPI.updateNotes(id, notes);
      toast.success('Meeting notes saved');
      fetchMeeting();
    } catch (err) {
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleGenerateRecap = async () => {
    try {
      setGeneratingRecap(true);
      const { data } = await aiAPI.recap({ meetingId: id });
      toast.success('AI recap generated successfully');
      setMeeting(prev => ({ ...prev, aiRecap: data.data.recap }));
      setActiveTab('recap');
      fetchMeeting();
    } catch (err) {
      toast.error('Failed to generate AI recap');
    } finally {
      setGeneratingRecap(false);
    }
  };

  const handleCompleteMeeting = async () => {
    try {
      await meetingsAPI.complete(id);
      toast.success('Meeting marked as completed');
      fetchMeeting();
    } catch (err) {
      toast.error('Failed to complete meeting');
    }
  };

  const handleCreateDecision = async (e) => {
    e.preventDefault();
    try {
      await decisionsAPI.create({
        title: decisionTitle,
        rationale: decisionRationale,
        source: { sourceType: 'meeting', sourceId: id },
      });
      toast.success('Decision recorded');
      setShowDecisionModal(false);
      setDecisionTitle('');
      setDecisionRationale('');
      fetchMeeting();
    } catch (err) {
      toast.error('Failed to record decision');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await tasksAPI.create({
        title: taskTitle,
        description: taskDescription,
        assignedTo: taskAssignee || undefined,
        dueDate: taskDueDate || undefined,
        priority: taskPriority,
        source: { sourceType: 'meeting', sourceId: id },
      });
      toast.success('Action item created');
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskAssignee('');
      setTaskDueDate('');
      fetchMeeting();
    } catch (err) {
      toast.error('Failed to create action item');
    }
  };

  const openCarryForward = async () => {
    try {
      const { data } = await tasksAPI.list({ status: 'open,in-progress,blocked', limit: 50 });
      // Exclude tasks already in this meeting
      const currentTaskIds = new Set(actionItems.map(t => t._id));
      const pool = (data.data.items || []).filter(t => !currentTaskIds.has(t._id));
      setOpenTasksPool(pool);
      setSelectedTaskIds([]);
      setShowCarryForwardModal(true);
    } catch (err) {
      toast.error('Failed to fetch open tasks');
    }
  };

  const handleCarryForwardSubmit = async () => {
    if (selectedTaskIds.length === 0) {
      toast.error('Please select at least one task');
      return;
    }
    try {
      await meetingsAPI.carryForward(id, selectedTaskIds);
      toast.success(`${selectedTaskIds.length} tasks carried forward to this meeting`);
      setShowCarryForwardModal(false);
      fetchMeeting();
    } catch (err) {
      toast.error('Failed to carry forward tasks');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-24">
        <h3 className="text-lg font-semibold text-gray-900">Meeting not found</h3>
        <Link to="/meetings" className="text-indigo-600 hover:underline mt-2 inline-block">Back to meetings</Link>
      </div>
    );
  }

  const scorePct = contextScore?.percentage ?? 0;

  return (
    <div className="space-y-6">
      {/* Back button & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link to="/meetings" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-2">
            <ChevronLeft className="w-4 h-4" /> Back to Meetings
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
              meeting.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
              meeting.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
              meeting.status === 'in-progress' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {meeting.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-4">
            <span>Organized by <strong className="text-gray-700">{meeting.organizer?.name || 'Unknown'}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(new Date(meeting.dateTime), 'PPP p')}</span>
            {meeting.location && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {meeting.location}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateRecap}
            disabled={generatingRecap}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            {generatingRecap ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-indigo-600" />}
            Generate AI Recap
          </button>
          {meeting.status !== 'completed' && (
            <button
              onClick={handleCompleteMeeting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
            >
              <CheckCircle className="w-4 h-4" /> Complete Meeting
            </button>
          )}
        </div>
      </div>

      {/* Signature Feature: Context Continuity Score Card */}
      {contextScore && (
        <div className="bg-gradient-to-r from-indigo-50 via-white to-blue-50 border border-indigo-100 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full border-4 border-indigo-600 flex items-center justify-center bg-white shadow-sm flex-shrink-0">
                <span className="text-base font-bold text-indigo-700">{scorePct}%</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900">Organizational Memory & Context Score</h3>
                  <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded font-medium">Signature Feature</span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5">
                  Evaluates meeting context completeness across 8 deterministic vectors to ensure zero knowledge loss.
                </p>
                {contextScore.missingItems?.length > 0 && (
                  <p className="text-xs text-amber-700 mt-2 font-medium">
                    ⚠️ Missing Context: {contextScore.missingItems.join(' • ')}
                  </p>
                )}
              </div>
            </div>
            {contextScore.recommendations?.length > 0 && (
              <div className="bg-white/80 border border-indigo-100 rounded-lg p-3 max-w-sm text-xs text-gray-700">
                <strong className="text-indigo-900 block mb-1">Recommended Next Step:</strong>
                {contextScore.recommendations[0]}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'agenda', label: `Agenda (${meeting.agenda?.length || 0})` },
            { id: 'participants', label: `Participants (${meeting.participants?.length || 0})` },
            { id: 'notes', label: 'Discussion Notes' },
            { id: 'recap', label: 'AI Recap' },
            { id: 'decisions', label: `Decisions (${decisions.length})` },
            { id: 'tasks', label: `Action Items (${actionItems.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Primary Objective</h3>
            <p className="text-base text-gray-900 mt-1 font-medium">{meeting.objective || 'No objective specified.'}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Description</h3>
            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{meeting.description || 'No detailed description provided.'}</p>
          </div>
          {meeting.tags?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {meeting.tags.map(tag => (
                  <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-md">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'agenda' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Agenda</h3>
          {meeting.agenda?.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No agenda items defined for this meeting.</p>
          ) : (
            <div className="space-y-4">
              {meeting.agenda.map((item, index) => (
                <div key={item._id || index} className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 bg-gray-50/50">
                  <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                    {item.description && <p className="text-xs text-gray-600 mt-1">{item.description}</p>}
                  </div>
                  {item.duration > 0 && (
                    <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3.5 h-3.5" /> {item.duration} min
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'participants' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Participants & Attendance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {meeting.participants?.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                  {p.user?.name ? p.user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : '??'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">{p.user?.email || ''}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  p.role === 'organizer' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {p.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Discussion Notes & Transcript</h3>
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {savingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Notes
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Paste raw meeting minutes or interview transcripts here. You can click "Generate AI Recap" at any time to automatically extract executive recaps, decisions, and action items.
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={14}
            className="w-full rounded-lg border border-gray-300 p-4 text-sm font-mono text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Type or paste meeting minutes, raw notes, or transcripts here..."
          />
        </div>
      )}

      {activeTab === 'recap' && (
        <div className="space-y-6">
          {!meeting.aiRecap?.executiveSummary ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Sparkles className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900">No AI Recap Generated Yet</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-4">
                Click below to use Google Gemini to automatically synthesize executive summaries, key discussions, and blockers.
              </p>
              <button
                onClick={handleGenerateRecap}
                disabled={generatingRecap}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {generatingRecap ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Generate AI Recap Now
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900">Executive Summary</h3>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Brain className="w-3.5 h-3.5 text-indigo-600" /> Powered by Gemini
                  </span>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed font-medium bg-indigo-50/50 p-4 rounded-lg border border-indigo-100">
                  {meeting.aiRecap.executiveSummary}
                </p>
              </div>

              {meeting.aiRecap.keyDiscussionPoints?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-3">Key Discussion Points</h3>
                  <ul className="space-y-2">
                    {meeting.aiRecap.keyDiscussionPoints.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {meeting.aiRecap.risksAndBlockers?.length > 0 && (
                <div className="bg-amber-50/50 rounded-xl border border-amber-200 p-6">
                  <h3 className="text-base font-bold text-amber-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Identified Risks & Blockers
                  </h3>
                  <ul className="space-y-2">
                    {meeting.aiRecap.risksAndBlockers.map((risk, i) => (
                      <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                        <span>•</span> <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'decisions' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Documented Decisions</h3>
            <button
              onClick={() => setShowDecisionModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" /> Record Decision
            </button>
          </div>
          {decisions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No formal decisions recorded yet for this meeting.</p>
          ) : (
            <div className="space-y-3">
              {decisions.map(d => (
                <div key={d._id} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-900">{d.title}</h4>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                      {d.status}
                    </span>
                  </div>
                  {d.rationale && (
                    <p className="text-xs text-gray-600 mt-2 bg-white p-2.5 rounded border border-gray-200">
                      <strong>Rationale:</strong> {d.rationale}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Decided by {d.madeBy?.name || 'Team'} on {format(new Date(d.madeAt || d.createdAt), 'PP')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Action Items & Deliverables</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={openCarryForward}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                <ArrowRightLeft className="w-4 h-4" /> Carry Forward Tasks
              </button>
              <button
                onClick={() => setShowTaskModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" /> New Task
              </button>
            </div>
          </div>

          {actionItems.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No action items linked to this meeting.</p>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
              {actionItems.map(task => (
                <div key={task._id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1 min-w-0 pr-4">
                    <Link to={`/tasks/${task._id}`} className="text-sm font-semibold text-gray-900 hover:text-indigo-600 block truncate">
                      {task.title}
                    </Link>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                      <span>Owner: <strong className="text-gray-700">{task.assignedTo?.name || 'Unassigned'}</strong></span>
                      {task.dueDate && <span>Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      task.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {task.priority}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      task.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                      task.status === 'in-progress' ? 'bg-indigo-100 text-indigo-800' :
                      task.status === 'blocked' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Record Decision Modal */}
      {showDecisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Record Meeting Decision</h3>
            <form onSubmit={handleCreateDecision} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Decision Title *</label>
                <input
                  type="text"
                  required
                  value={decisionTitle}
                  onChange={e => setDecisionTitle(e.target.value)}
                  className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Adopt bi-weekly release schedule"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Rationale & Context</label>
                <textarea
                  rows={3}
                  value={decisionRationale}
                  onChange={e => setDecisionRationale(e.target.value)}
                  className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Explain why this decision was reached and any alternatives considered..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDecisionModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Save Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create Action Item</h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Complete security review of auth routes"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Assignee</label>
                <select
                  value={taskAssignee}
                  onChange={e => setTaskAssignee(e.target.value)}
                  className="w-full text-sm rounded-lg border border-gray-300 p-2.5"
                >
                  <option value="">Unassigned</option>
                  {usersList.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={e => setTaskDueDate(e.target.value)}
                    className="w-full text-sm rounded-lg border border-gray-300 p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value)}
                    className="w-full text-sm rounded-lg border border-gray-300 p-2.5"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Carry Forward Modal */}
      {showCarryForwardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-gray-900">Carry Forward Unresolved Tasks</h3>
            </div>
            <p className="text-xs text-gray-500">
              Select existing open action items from other meetings to carry forward. Preserves single canonical record and audit history.
            </p>

            {openTasksPool.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No unresolved external action items found.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
                {openTasksPool.map(t => (
                  <label key={t._id} className="p-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.includes(t._id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedTaskIds([...selectedTaskIds, t._id]);
                        } else {
                          setSelectedTaskIds(selectedTaskIds.filter(id => id !== t._id));
                        }
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                      <p className="text-xs text-gray-500">
                        {t.assignedTo?.name || 'Unassigned'} • Due: {t.dueDate ? format(new Date(t.dueDate), 'MMM d') : 'None'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCarryForwardModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCarryForwardSubmit}
                disabled={selectedTaskIds.length === 0}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Carry Forward ({selectedTaskIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
