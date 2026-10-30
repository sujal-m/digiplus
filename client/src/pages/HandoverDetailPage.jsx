import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { handoversAPI, aiAPI, tasksAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowRightLeft, CheckCircle, AlertTriangle, Brain, Sparkles,
  ChevronLeft, Loader2, ArrowRight, Calendar, User, Clock,
  FileText, ShieldCheck, XCircle, Plus
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function HandoverDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [handover, setHandover] = useState(null);
  const [actionItems, setActionItems] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [contextScore, setContextScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // AI states
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [catchUpBrief, setCatchUpBrief] = useState(null);

  // Modals
  const [showAckModal, setShowAckModal] = useState(false);
  const [ackNotes, setAckNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showCarryForwardModal, setShowCarryForwardModal] = useState(false);
  const [openTasksPool, setOpenTasksPool] = useState([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  const fetchHandover = async () => {
    try {
      setLoading(true);
      const { data } = await handoversAPI.get(id);
      const hData = data.data.handover;
      setHandover(hData);
      setActionItems(data.data.actionItems || []);
      setDecisions(data.data.decisions || []);
      setContextScore(data.data.contextScore || hData.contextScore);
    } catch (err) {
      toast.error('Failed to load handover details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandover();
  }, [id]);

  const handleSubmitForAck = async () => {
    try {
      await handoversAPI.submit(id);
      toast.success('Handover submitted for incoming owner acknowledgement');
      fetchHandover();
    } catch (err) {
      toast.error('Failed to submit handover');
    }
  };

  const handleAcceptHandover = async (e) => {
    e.preventDefault();
    try {
      await handoversAPI.accept(id, ackNotes);
      toast.success('Handover accepted and acknowledged!');
      setShowAckModal(false);
      fetchHandover();
    } catch (err) {
      toast.error('Failed to accept handover');
    }
  };

  const handleRejectHandover = async (e) => {
    e.preventDefault();
    try {
      await handoversAPI.reject(id, rejectReason);
      toast.success('Clarification requested from outgoing owner');
      setShowRejectModal(false);
      fetchHandover();
    } catch (err) {
      toast.error('Failed to request clarification');
    }
  };

  const handleCompleteHandover = async () => {
    try {
      await handoversAPI.complete(id);
      toast.success('Handover marked as completed');
      fetchHandover();
    } catch (err) {
      toast.error('Failed to complete handover');
    }
  };

  const handleGenerateSummary = async () => {
    try {
      setGeneratingSummary(true);
      const { data } = await aiAPI.handoverSummary({ handoverId: id });
      toast.success('AI handover summary generated');
      setHandover(prev => ({ ...prev, aiSummary: data.data.summary }));
      setActiveTab('summary');
      fetchHandover();
    } catch (err) {
      toast.error('Failed to generate handover summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleGenerateBrief = async () => {
    try {
      setGeneratingBrief(true);
      const { data } = await aiAPI.brief({ handoverId: id });
      toast.success('Contextual Catch-Up Brief generated');
      setCatchUpBrief(data.data.brief);
      setActiveTab('brief');
    } catch (err) {
      toast.error('Failed to generate catch-up brief');
    } finally {
      setGeneratingBrief(false);
    }
  };

  const openCarryForward = async () => {
    try {
      const { data } = await tasksAPI.list({ status: 'open,in-progress,blocked', limit: 50 });
      const currentTaskIds = new Set(actionItems.map(t => t._id));
      const pool = (data.data.items || []).filter(t => !currentTaskIds.has(t._id));
      setOpenTasksPool(pool);
      setSelectedTaskIds([]);
      setShowCarryForwardModal(true);
    } catch (err) {
      toast.error('Failed to load open tasks');
    }
  };

  const handleCarryForwardSubmit = async () => {
    if (selectedTaskIds.length === 0) return;
    try {
      await handoversAPI.carryForward(id, selectedTaskIds);
      toast.success(`${selectedTaskIds.length} tasks carried forward to this handover`);
      setShowCarryForwardModal(false);
      fetchHandover();
    } catch (err) {
      toast.error('Failed to carry forward tasks');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!handover) {
    return (
      <div className="text-center py-24">
        <h3 className="text-lg font-semibold text-gray-900">Handover not found</h3>
        <Link to="/handovers" className="text-indigo-600 hover:underline mt-2 inline-block">Back to handovers</Link>
      </div>
    );
  }

  const isIncomingOwner = handover.incomingOwner?._id === user?.id;
  const isOutgoingOwner = handover.outgoingOwner?._id === user?.id;
  const scorePct = contextScore?.percentage ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <Link to="/handovers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-2">
            <ChevronLeft className="w-4 h-4" /> Back to Handovers
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{handover.title}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
              handover.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
              handover.status === 'pending-acknowledgement' ? 'bg-amber-100 text-amber-800 animate-pulse' :
              handover.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {handover.status.replace('-', ' ')}
            </span>
          </div>

          {/* Owners strip */}
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              Outgoing: <strong className="text-gray-900">{handover.outgoingOwner?.name}</strong>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="flex items-center gap-1.5">
              Incoming: <strong className="text-indigo-900">{handover.incomingOwner?.name}</strong>
            </span>
            {handover.team && (
              <>
                <span>•</span>
                <span>Team: <strong>{handover.team}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Lifecycle Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleGenerateBrief}
            disabled={generatingBrief}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          >
            {generatingBrief ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5 text-indigo-600" />}
            Catch-Up Brief
          </button>

          <button
            onClick={handleGenerateSummary}
            disabled={generatingSummary}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100"
          >
            {generatingSummary ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-purple-600" />}
            AI Summary
          </button>

          {handover.status === 'draft' && (
            <button
              onClick={handleSubmitForAck}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            >
              Submit for Acknowledgement
            </button>
          )}

          {handover.status === 'pending-acknowledgement' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRejectModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
              >
                <XCircle className="w-3.5 h-3.5" /> Request Changes
              </button>
              <button
                onClick={() => setShowAckModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Accept Handover
              </button>
            </div>
          )}

          {(handover.status === 'accepted' || handover.status === 'in-progress') && (
            <button
              onClick={handleCompleteHandover}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Mark Completed
            </button>
          )}
        </div>
      </div>

      {/* Signature Feature: Context Continuity Score */}
      {contextScore && (
        <div className="bg-gradient-to-r from-indigo-50 via-white to-purple-50 border border-indigo-100 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full border-4 border-indigo-600 flex items-center justify-center bg-white shadow-sm flex-shrink-0">
                <span className="text-base font-bold text-indigo-700">{scorePct}%</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900">Context Continuity Score</h3>
                  <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded font-medium">Signature Feature</span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5">
                  Measures whether the incoming owner has complete operational background, runbooks, and task traceability.
                </p>
                {contextScore.missingItems?.length > 0 && (
                  <p className="text-xs text-amber-700 mt-2 font-medium">
                    ⚠️ Missing: {contextScore.missingItems.join(' • ')}
                  </p>
                )}
              </div>
            </div>
            {contextScore.recommendations?.length > 0 && (
              <div className="bg-white/80 border border-indigo-100 rounded-lg p-3 max-w-sm text-xs text-gray-700">
                <strong className="text-indigo-900 block mb-1">AI Recommendation:</strong>
                {contextScore.recommendations[0]}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Formal Acknowledgement Banner */}
      {handover.acknowledgement?.acknowledged && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-emerald-900">
              Formally Acknowledged & Accepted by {handover.acknowledgement.acknowledgedBy?.name || handover.incomingOwner?.name}
            </p>
            <p className="text-xs text-emerald-700">
              Accepted on {format(new Date(handover.acknowledgement.acknowledgedAt), 'PPP p')}
              {handover.acknowledgement.notes && ` — Note: "${handover.acknowledgement.notes}"`}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          {[
            { id: 'overview', label: 'Overview & Background' },
            { id: 'tasks', label: `Outstanding Tasks (${actionItems.length})` },
            { id: 'summary', label: 'AI Summary' },
            { id: 'brief', label: 'Catch-Up Brief' },
            { id: 'meetings', label: `Related Meetings (${handover.relatedMeetings?.length || 0})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Background Information</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {handover.background || 'No background description provided.'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Operational Handover Notes & Runbooks</h3>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-800 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                {handover.handoverNotes || 'No specific operational instructions written.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Transferred Action Items</h3>
              <p className="text-xs text-gray-500">Tasks associated with this handover and carried forward across contexts.</p>
            </div>
            <button
              onClick={openCarryForward}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Carry Forward Open Tasks
            </button>
          </div>

          {actionItems.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No action items connected to this handover.</p>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
              {actionItems.map(task => (
                <div key={task._id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1 min-w-0 pr-4">
                    <Link to={`/tasks/${task._id}`} className="text-sm font-semibold text-gray-900 hover:text-indigo-600 block truncate">
                      {task.title}
                    </Link>
                    <p className="text-xs text-gray-500 mt-1">
                      Assigned: <strong className="text-gray-700">{task.assignedTo?.name || 'Unassigned'}</strong> •
                      Due: {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No date'}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded font-medium ${
                    task.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                    task.status === 'in-progress' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="space-y-6">
          {!handover.aiSummary?.summary ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Sparkles className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900">No AI Handover Summary Generated</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-4">
                Generate an AI-powered executive summary highlighting key responsibilities, critical items, and onboarding steps.
              </p>
              <button
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {generatingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Generate AI Handover Summary
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-2">Executive Transfer Summary</h3>
                <p className="text-sm text-gray-800 bg-purple-50 p-4 rounded-lg border border-purple-100 leading-relaxed font-medium">
                  {handover.aiSummary.summary}
                </p>
              </div>

              {handover.aiSummary.keyResponsibilities?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-3">Key Transferred Responsibilities</h3>
                  <ul className="space-y-2">
                    {handover.aiSummary.keyResponsibilities.map((resp, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {handover.aiSummary.criticalItems?.length > 0 && (
                <div className="bg-red-50/50 rounded-xl border border-red-200 p-6">
                  <h3 className="text-base font-bold text-red-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" /> Urgent & Critical Items
                  </h3>
                  <ul className="space-y-2">
                    {handover.aiSummary.criticalItems.map((item, i) => (
                      <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                        <span>•</span> <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'brief' && (
        <div className="space-y-6">
          {!catchUpBrief ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Brain className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900">AI Contextual Catch-Up Brief (Module 6)</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-4">
                Generates a tailored onboarding briefing aggregating prior meetings, decisions, blockers, and immediate next steps.
              </p>
              <button
                onClick={handleGenerateBrief}
                disabled={generatingBrief}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {generatingBrief ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate Catch-Up Brief
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Executive Catch-Up Overview</h3>
                <p className="text-sm text-gray-800 bg-indigo-50 p-4 rounded-lg border border-indigo-100 leading-relaxed font-medium">
                  {catchUpBrief.executiveSummary}
                </p>
              </div>

              {catchUpBrief.historicalDecisions?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-3">Historical Decisions Inherited</h3>
                  <div className="space-y-2">
                    {catchUpBrief.historicalDecisions.map((d, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                        <strong className="text-gray-900 block">{d.title}</strong>
                        <span className="text-gray-600 mt-0.5 block">{d.rationale}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {catchUpBrief.recommendedNextSteps?.length > 0 && (
                <div className="bg-emerald-50/50 rounded-xl border border-emerald-200 p-6">
                  <h3 className="text-base font-bold text-emerald-900 mb-3">Recommended Immediate Next Steps</h3>
                  <ul className="space-y-2">
                    {catchUpBrief.recommendedNextSteps.map((step, i) => (
                      <li key={i} className="text-sm text-emerald-800 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'meetings' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Connected Prior Meetings</h3>
          {handover.relatedMeetings?.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No previous meetings linked.</p>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {handover.relatedMeetings.map(m => (
                <div key={m._id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <Link to={`/meetings/${m._id}`} className="text-sm font-semibold text-gray-900 hover:text-indigo-600">
                      {m.title}
                    </Link>
                    <p className="text-xs text-gray-500 mt-1">{m.objective}</p>
                  </div>
                  <span className="text-xs text-gray-400">{format(new Date(m.dateTime), 'PP')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Accept Handover Modal */}
      {showAckModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Formal Handover Acceptance</h3>
            <p className="text-xs text-gray-500 mb-4">
              By accepting, you formally take ownership of the transferred duties, ongoing action items, and operational context.
            </p>
            <form onSubmit={handleAcceptHandover} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Acknowledgement Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={ackNotes}
                  onChange={e => setAckNotes(e.target.value)}
                  placeholder="e.g., Context reviewed and accepted. Will need Mixpanel permissions updated."
                  className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAckModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Confirm & Accept
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Handover Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Request Handover Clarification</h3>
            <form onSubmit={handleRejectHandover} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason / Missing Information *</label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Explain what context, access, or tasks need clarification before you can accept..."
                  className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Send Clarification Request
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
              <h3 className="text-lg font-bold text-gray-900">Carry Forward Tasks to Handover</h3>
            </div>
            <p className="text-xs text-gray-500">
              Select existing open action items from previous projects to link to this handover.
            </p>

            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {openTasksPool.map(t => (
                <label key={t._id} className="p-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.includes(t._id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedTaskIds([...selectedTaskIds, t._id]);
                      else setSelectedTaskIds(selectedTaskIds.filter(id => id !== t._id));
                    }}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                    <p className="text-xs text-gray-500">{t.assignedTo?.name || 'Unassigned'} • Due: {t.dueDate ? format(new Date(t.dueDate), 'MMM d') : 'None'}</p>
                  </div>
                </label>
              ))}
            </div>

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
