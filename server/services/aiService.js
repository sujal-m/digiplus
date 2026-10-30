const { GoogleGenerativeAI } = require('@google/generative-ai');
const { logAIOperation, logger } = require('../config/logger');
const AIProcessingLog = require('../models/AIProcessingLog');

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
let genAI = null;

function getClient() {
  if (!genAI && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
  }
  return genAI;
}

/**
 * Helper to log AI processing to both file and DB
 */
async function recordAILog({ operationType, correlationId, startTime, duration, status, error, tokenUsage, userId, sourceType, sourceId }) {
  try {
    logAIOperation({
      operationType,
      model: MODEL_NAME,
      correlationId,
      duration,
      tokenUsage,
      status,
      error,
      requestedBy: userId,
    });

    if (userId) {
      await AIProcessingLog.create({
        operationType,
        model: MODEL_NAME,
        requestedBy: userId,
        correlationId,
        startTime,
        endTime: new Date(),
        duration,
        tokenUsage: tokenUsage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        status,
        error: error ? { message: error.message || String(error) } : undefined,
        sourceType,
        sourceId,
      });
    }
  } catch (err) {
    logger.error('Failed to persist AI log record', { err: err.message });
  }
}

/**
 * 1. Extract structured information from unstructured text/notes
 */
async function extractMeetingInfo({ text, correlationId, userId, meetingId }) {
  const startTime = new Date();
  const client = getClient();

  if (!client) {
    logger.info('Gemini API key not configured, using resilient heuristic extraction');
    return heuristicMeetingExtraction(text);
  }

  const prompt = `You are an executive enterprise assistant and organizational memory expert.
Analyze the following unstructured meeting notes or transcript and extract structured information.
Respond with pure JSON matching this exact structure:
{
  "executiveSummary": "1-2 sentence high-level overview of what this meeting achieved",
  "detailedSummary": "Thorough chronological summary of the discussions",
  "keyDiscussionPoints": ["Discussion point 1", "Discussion point 2"],
  "decisions": [
    {
      "title": "Clear decision title",
      "rationale": "Why this decision was made",
      "confidence": 0.95
    }
  ],
  "actionItems": [
    {
      "title": "Clear actionable task title",
      "description": "Details about what must be done",
      "suggestedOwner": "Name or empty string",
      "suggestedDeadline": "YYYY-MM-DD or empty string if not mentioned",
      "priority": "medium",
      "confidence": 0.90,
      "sourceEvidence": "Exact sentence or excerpt from text"
    }
  ],
  "risksAndBlockers": ["Identified risk or blocker 1"],
  "unresolvedQuestions": ["Unresolved question 1"]
}

STRICT RELIABILITY RULES:
- Do not invent task owners or deadlines if not explicitly stated.
- Only extract decisions that were agreed upon.
- Prioritize accuracy and traceability over guesswork.

Raw Meeting Text:
${text}`;

  try {
    const model = client.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(prompt);
    const duration = Date.now() - startTime.getTime();
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    await recordAILog({
      operationType: 'meeting_extraction',
      correlationId,
      startTime,
      duration,
      status: 'success',
      userId,
      sourceType: 'meeting',
      sourceId: meetingId,
    });

    return parsed;
  } catch (error) {
    const duration = Date.now() - startTime.getTime();
    await recordAILog({
      operationType: 'meeting_extraction',
      correlationId,
      startTime,
      duration,
      status: 'failed',
      error,
      userId,
      sourceType: 'meeting',
      sourceId: meetingId,
    });
    logger.warn('AI extraction failed, returning heuristic extraction fallback', { error: error.message });
    return heuristicMeetingExtraction(text);
  }
}

/**
 * 2. Generate Meeting Recap
 */
async function generateMeetingRecap({ meeting, correlationId, userId }) {
  const startTime = new Date();
  const client = getClient();

  if (!client) {
    return heuristicRecap(meeting);
  }

  const prompt = `You are an organizational memory architect.
Generate a structured executive recap for this meeting:
Title: ${meeting.title}
Objective: ${meeting.objective || 'Not specified'}
Notes: ${meeting.notes || meeting.rawTranscript || ''}

Respond with pure JSON:
{
  "executiveSummary": "Concise executive overview",
  "detailedSummary": "Comprehensive summary covering all topics",
  "keyDiscussionPoints": ["point 1", "point 2"],
  "risksAndBlockers": ["risk 1"],
  "unresolvedQuestions": ["question 1"]
}`;

  try {
    const model = client.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(prompt);
    const duration = Date.now() - startTime.getTime();
    const parsed = JSON.parse(result.response.text());

    await recordAILog({
      operationType: 'meeting_recap',
      correlationId,
      startTime,
      duration,
      status: 'success',
      userId,
      sourceType: 'meeting',
      sourceId: meeting._id,
    });

    return parsed;
  } catch (error) {
    const duration = Date.now() - startTime.getTime();
    await recordAILog({
      operationType: 'meeting_recap',
      correlationId,
      startTime,
      duration,
      status: 'failed',
      error,
      userId,
      sourceType: 'meeting',
      sourceId: meeting._id,
    });
    return heuristicRecap(meeting);
  }
}

/**
 * 3. Generate Catch-Up Brief (Module 6)
 */
async function generateCatchUpBrief({ targetType, targetName, outgoingOwner, incomingOwner, contextRecords, correlationId, userId }) {
  const startTime = new Date();
  const client = getClient();

  if (!client) {
    return heuristicCatchUpBrief({ targetType, targetName, outgoingOwner, incomingOwner, contextRecords });
  }

  const prompt = `You are an enterprise AI context specialist creating a comprehensive, actionable Catch-Up Brief for a teammate who missed meetings or is taking over a project.
Target: ${targetType} - ${targetName}
Transition: From ${outgoingOwner || 'Team'} to ${incomingOwner || 'Successor'}

Contextual Records:
${JSON.stringify(contextRecords, null, 2)}

Generate a thorough catch-up brief formatted as pure JSON:
{
  "executiveSummary": "Clear 2-sentence summary of where the project stands today",
  "backgroundAndContext": "Background context and why this work exists",
  "historicalDecisions": [
    { "title": "Decision title", "rationale": "Rationale" }
  ],
  "outstandingResponsibilities": [
    { "title": "Task title", "owner": "Owner", "dueDate": "Date", "priority": "high", "blocker": "None" }
  ],
  "currentBlockers": ["Blocker or operational impediment 1"],
  "upcomingMilestones": ["Upcoming deadline or event 1"],
  "recommendedNextSteps": ["Immediate action 1", "Immediate action 2"]
}`;

  try {
    const model = client.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(prompt);
    const duration = Date.now() - startTime.getTime();
    const parsed = JSON.parse(result.response.text());

    await recordAILog({
      operationType: 'catchup_brief',
      correlationId,
      startTime,
      duration,
      status: 'success',
      userId,
    });

    return parsed;
  } catch (error) {
    const duration = Date.now() - startTime.getTime();
    await recordAILog({
      operationType: 'catchup_brief',
      correlationId,
      startTime,
      duration,
      status: 'failed',
      error,
      userId,
    });
    return heuristicCatchUpBrief({ targetType, targetName, outgoingOwner, incomingOwner, contextRecords });
  }
}

/**
 * 4. Generate Handover Summary (Module 3)
 */
async function generateHandoverSummary({ handover, tasks = [], decisions = [], correlationId, userId }) {
  const startTime = new Date();
  const client = getClient();

  if (!client) {
    return heuristicHandoverSummary(handover, tasks, decisions);
  }

  const prompt = `You are an enterprise knowledge handover assistant.
Summarize this work transfer:
Title: ${handover.title}
Background: ${handover.background || ''}
Notes: ${handover.handoverNotes || ''}
Open Tasks: ${tasks.map(t => t.title).join(', ')}
Decisions: ${decisions.map(d => d.title).join(', ')}

Return pure JSON:
{
  "summary": "High-level summary of the transfer",
  "keyResponsibilities": ["Responsibility 1", "Responsibility 2"],
  "criticalItems": ["Critical urgent item 1"],
  "recommendations": ["Recommendation for smooth onboarding"]
}`;

  try {
    const model = client.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(prompt);
    const duration = Date.now() - startTime.getTime();
    const parsed = JSON.parse(result.response.text());

    await recordAILog({
      operationType: 'handover_summary',
      correlationId,
      startTime,
      duration,
      status: 'success',
      userId,
      sourceType: 'handover',
      sourceId: handover._id,
    });

    return parsed;
  } catch (error) {
    const duration = Date.now() - startTime.getTime();
    await recordAILog({
      operationType: 'handover_summary',
      correlationId,
      startTime,
      duration,
      status: 'failed',
      error,
      userId,
      sourceType: 'handover',
      sourceId: handover._id,
    });
    return heuristicHandoverSummary(handover, tasks, decisions);
  }
}

/**
 * 5. Suggest Knowledge Links (Module 7)
 */
async function suggestKnowledgeLinks({ sourceItem, candidates, correlationId, userId }) {
  const startTime = new Date();
  const client = getClient();

  if (!client) {
    return heuristicKnowledgeLinking(sourceItem, candidates);
  }

  const prompt = `You are an organizational knowledge graph linker.
Given a source item:
Title: ${sourceItem.title}
Description: ${sourceItem.description || sourceItem.notes || ''}

And a list of potential target documents or meetings:
${JSON.stringify(candidates.map(c => ({ id: c._id, title: c.title, text: (c.description || c.notes || c.content || '').slice(0, 300) })))}

Identify relevant connections. Return pure JSON:
{
  "suggestions": [
    {
      "targetId": "string-id",
      "relevanceScore": 0.85,
      "explanation": "Clear explanation of how these two items are related"
    }
  ]
}`;

  try {
    const model = client.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(prompt);
    const duration = Date.now() - startTime.getTime();
    const parsed = JSON.parse(result.response.text());

    await recordAILog({
      operationType: 'knowledge_suggestion',
      correlationId,
      startTime,
      duration,
      status: 'success',
      userId,
    });

    return parsed.suggestions || [];
  } catch (error) {
    const duration = Date.now() - startTime.getTime();
    await recordAILog({
      operationType: 'knowledge_suggestion',
      correlationId,
      startTime,
      duration,
      status: 'failed',
      error,
      userId,
    });
    return heuristicKnowledgeLinking(sourceItem, candidates);
  }
}

// =================== HEURISTIC FALLBACKS (Zero-Crash Guarantee) ===================

function heuristicMeetingExtraction(text = '') {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const actionItems = [];
  const decisions = [];
  const discussionPoints = [];
  const risks = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('todo') || lower.includes('action:') || lower.includes('task:')) {
      actionItems.push({
        title: line.replace(/^(todo|action:|task:|\*|-)\s*/i, '').trim(),
        description: line,
        suggestedOwner: '',
        suggestedDeadline: '',
        priority: 'medium',
        confidence: 0.75,
        sourceEvidence: line,
      });
    } else if (lower.includes('decision') || lower.includes('agreed') || lower.includes('approved')) {
      decisions.push({
        title: line.replace(/^(decision:|\*|-)\s*/i, '').trim(),
        rationale: 'Extracted from meeting discussion record',
        confidence: 0.80,
      });
    } else if (lower.includes('risk') || lower.includes('blocker') || lower.includes('issue')) {
      risks.push(line.replace(/^(\*|-)\s*/, ''));
    } else if (line.length > 20) {
      discussionPoints.push(line.replace(/^(\*|-)\s*/, ''));
    }
  }

  return {
    executiveSummary: lines.length > 0 ? `Meeting covered ${discussionPoints.length} core discussion areas with ${decisions.length} recorded decisions.` : 'General meeting notes recorded.',
    detailedSummary: text.slice(0, 500) || 'Comprehensive meeting notes preserved.',
    keyDiscussionPoints: discussionPoints.slice(0, 5),
    decisions,
    actionItems,
    risksAndBlockers: risks,
    unresolvedQuestions: [],
  };
}

function heuristicRecap(meeting) {
  return {
    executiveSummary: `Meeting "${meeting.title}" completed. Objective: ${meeting.objective || 'General alignment and planning.'}`,
    detailedSummary: meeting.notes ? meeting.notes.slice(0, 600) : 'Discussion points preserved in meeting notes.',
    keyDiscussionPoints: (meeting.agenda || []).map(a => a.title),
    risksAndBlockers: [],
    unresolvedQuestions: [],
  };
}

function heuristicCatchUpBrief({ targetType, targetName, outgoingOwner, incomingOwner, contextRecords = {} }) {
  const tasks = contextRecords.tasks || [];
  const decisions = contextRecords.decisions || [];

  return {
    executiveSummary: `Catch-up brief for ${targetType} "${targetName}". Ownership transitioning from ${outgoingOwner || 'current team'} to ${incomingOwner || 'new assignee'}.`,
    backgroundAndContext: `This brief aggregates active responsibilities, historical decisions, and current blockers to ensure zero context loss.`,
    historicalDecisions: decisions.map(d => ({ title: d.title, rationale: d.rationale || 'Agreed by team' })),
    outstandingResponsibilities: tasks.map(t => ({
      title: t.title,
      owner: t.assignedTo ? (t.assignedTo.name || 'Assigned') : 'Unassigned',
      dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'TBD',
      priority: t.priority || 'medium',
      blocker: t.status === 'blocked' ? 'Blocked' : 'None',
    })),
    currentBlockers: tasks.filter(t => t.status === 'blocked').map(t => `Task "${t.title}" is currently marked blocked.`),
    upcomingMilestones: ['Next sprint planning review', 'Handover acceptance milestone'],
    recommendedNextSteps: [
      'Review all outstanding action items and confirm target dates.',
      'Acknowledge handover transfer in the DigiPlus platform.',
      'Schedule a 15-minute sync with previous owner for questions.',
    ],
  };
}

function heuristicHandoverSummary(handover, tasks = [], decisions = []) {
  return {
    summary: `Work transfer "${handover.title}" for team ${handover.team || 'General'}. Preserves context across ${tasks.length} active tasks and ${decisions.length} prior decisions.`,
    keyResponsibilities: tasks.map(t => t.title).slice(0, 5),
    criticalItems: tasks.filter(t => t.priority === 'critical' || t.priority === 'high').map(t => t.title),
    recommendations: [
      'Confirm access to all linked reference documents.',
      'Verify status of tasks carried forward.',
      'Sign off on the formal transfer acknowledgement.',
    ],
  };
}

function heuristicKnowledgeLinking(sourceItem, candidates = []) {
  const sourceKeywords = (sourceItem.title + ' ' + (sourceItem.description || '')).toLowerCase().split(/\s+/).filter(w => w.length > 4);
  const suggestions = [];

  for (const c of candidates) {
    const targetText = ((c.title || '') + ' ' + (c.description || c.notes || c.content || '')).toLowerCase();
    let matches = 0;
    for (const kw of sourceKeywords) {
      if (targetText.includes(kw)) matches++;
    }
    if (matches > 0) {
      const relevance = Math.min(0.95, 0.4 + matches * 0.15);
      suggestions.push({
        targetId: c._id.toString(),
        relevanceScore: parseFloat(relevance.toFixed(2)),
        explanation: `Shares relevant keywords (${matches} matching context topics) with source item.`,
      });
    }
  }

  return suggestions.slice(0, 5);
}

module.exports = {
  extractMeetingInfo,
  generateMeetingRecap,
  generateCatchUpBrief,
  generateHandoverSummary,
  suggestKnowledgeLinks,
};
