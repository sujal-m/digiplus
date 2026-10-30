/**
 * Context Continuity Score Service
 * 
 * Signature assessment feature: Evaluates how much organizational context
 * is retained during meetings and work handovers, providing an explainable
 * score, risk assessment, and recommendations.
 */

function calculateMeetingContextScore(meeting, relatedTasks = [], relatedDecisions = []) {
  const breakdown = {};
  const missingItems = [];
  const potentialRisks = [];
  const recommendations = [];

  // 1. Objectives & Description (15 pts)
  const hasObjective = !!(meeting.objective && meeting.objective.trim().length >= 10);
  const hasDescription = !!(meeting.description && meeting.description.trim().length >= 10);
  const objectivePoints = hasObjective && hasDescription ? 15 : (hasObjective || hasDescription ? 8 : 0);
  breakdown.objectives = {
    name: 'Meeting Objective & Context',
    points: objectivePoints,
    maxPoints: 15,
    present: objectivePoints > 0,
    details: hasObjective ? 'Clear objective defined' : 'Missing clear meeting objective'
  };
  if (objectivePoints < 15) {
    missingItems.push('Explicit meeting objective or comprehensive description');
    potentialRisks.push('Participants and successors may not understand the core purpose of this meeting.');
    recommendations.push('Add a concise 1-2 sentence statement defining the primary meeting goal.');
  }

  // 2. Meeting Notes (15 pts)
  const notesLength = (meeting.notes || '').trim().length;
  const notesPoints = notesLength > 150 ? 15 : (notesLength > 30 ? 8 : 0);
  breakdown.notes = {
    name: 'Meeting Notes & Discussion Records',
    points: notesPoints,
    maxPoints: 15,
    present: notesPoints > 0,
    details: `${notesLength} characters documented`
  };
  if (notesPoints < 15) {
    missingItems.push('Detailed discussion notes');
    potentialRisks.push('Context discussed verbally will be permanently lost to teammates absent from the meeting.');
    recommendations.push('Record detailed notes or paste the transcript and run AI recap extraction.');
  }

  // 3. Documented Decisions (15 pts)
  const decisionCount = relatedDecisions.length;
  const decisionPoints = decisionCount >= 2 ? 15 : (decisionCount === 1 ? 10 : 0);
  breakdown.decisions = {
    name: 'Formal Decisions',
    points: decisionPoints,
    maxPoints: 15,
    present: decisionPoints > 0,
    details: `${decisionCount} decisions recorded`
  };
  if (decisionPoints === 0) {
    missingItems.push('Explicitly documented decisions');
    potentialRisks.push('Decisions might be re-debated in subsequent meetings without a documented rationale.');
    recommendations.push('Document at least one clear decision or rationale reached during the session.');
  }

  // 4. Clearly Assigned Task Owners (15 pts)
  const totalTasks = relatedTasks.length;
  const tasksWithOwners = relatedTasks.filter(t => !!t.assignedTo).length;
  const ownerRatio = totalTasks > 0 ? tasksWithOwners / totalTasks : 0;
  const taskOwnerPoints = totalTasks > 0 ? Math.round(ownerRatio * 15) : 5;
  breakdown.taskOwners = {
    name: 'Task Ownership Clarity',
    points: taskOwnerPoints,
    maxPoints: 15,
    present: taskOwnerPoints >= 10,
    details: totalTasks > 0 ? `${tasksWithOwners}/${totalTasks} tasks assigned to owners` : 'No tasks created'
  };
  if (tasksWithOwners < totalTasks) {
    missingItems.push(`Owner assignment for ${totalTasks - tasksWithOwners} unassigned action items`);
    potentialRisks.push('Unassigned action items will stall because no single individual is accountable.');
    recommendations.push('Assign every action item to a specific team member.');
  }

  // 5. Defined Deadlines (10 pts)
  const tasksWithDeadlines = relatedTasks.filter(t => !!t.dueDate).length;
  const deadlineRatio = totalTasks > 0 ? tasksWithDeadlines / totalTasks : 0;
  const deadlinePoints = totalTasks > 0 ? Math.round(deadlineRatio * 10) : 5;
  breakdown.deadlines = {
    name: 'Action Item Deadlines',
    points: deadlinePoints,
    maxPoints: 10,
    present: deadlinePoints >= 8,
    details: totalTasks > 0 ? `${tasksWithDeadlines}/${totalTasks} tasks have due dates` : 'No tasks'
  };
  if (tasksWithDeadlines < totalTasks) {
    missingItems.push(`Due dates for ${totalTasks - tasksWithDeadlines} action items`);
    potentialRisks.push('Tasks without target deadlines are prone to drift and miss organizational timelines.');
    recommendations.push('Set target completion dates for all action items.');
  }

  // 6. Linked Historical Context & Documents (15 pts)
  const hasRelatedMeetings = (meeting.relatedMeetings || []).length > 0;
  const hasDocuments = (meeting.documents || []).length > 0;
  let linkPoints = 0;
  if (hasRelatedMeetings) linkPoints += 8;
  if (hasDocuments) linkPoints += 7;
  breakdown.contextLinks = {
    name: 'Connected Historical Records & Documents',
    points: linkPoints,
    maxPoints: 15,
    present: linkPoints > 0,
    details: `${(meeting.relatedMeetings || []).length} related meetings, ${(meeting.documents || []).length} docs`
  };
  if (linkPoints < 15) {
    missingItems.push('Links to antecedent meetings or reference documents');
    potentialRisks.push('This meeting exists in an informational silo without cross-referencing past context.');
    recommendations.push('Link previous related sprint meetings or architecture documents.');
  }

  // 7. Documented Blockers or Risks (10 pts)
  const hasBlockers = !!(
    (meeting.aiRecap && meeting.aiRecap.risksAndBlockers && meeting.aiRecap.risksAndBlockers.length > 0) ||
    relatedTasks.some(t => t.status === 'blocked') ||
    (meeting.notes && (meeting.notes.toLowerCase().includes('blocker') || meeting.notes.toLowerCase().includes('risk')))
  );
  const blockerPoints = hasBlockers ? 10 : 5;
  breakdown.riskAssessment = {
    name: 'Risk & Blocker Identification',
    points: blockerPoints,
    maxPoints: 10,
    present: true,
    details: hasBlockers ? 'Risks or blockers identified' : 'No explicit blockers recorded'
  };

  // 8. Completed Recap or AI Processing (5 pts)
  const hasRecap = !!(meeting.aiRecap && meeting.aiRecap.executiveSummary);
  const recapPoints = hasRecap ? 5 : 0;
  breakdown.recap = {
    name: 'Executive Recap Available',
    points: recapPoints,
    maxPoints: 5,
    present: hasRecap,
    details: hasRecap ? 'AI recap generated' : 'Pending recap generation'
  };
  if (!hasRecap) {
    recommendations.push('Run AI Recap generation to synthesize discussion points into an executive briefing.');
  }

  const score = Object.values(breakdown).reduce((sum, item) => sum + item.points, 0);

  return {
    score,
    maxScore: 100,
    percentage: Math.min(100, Math.max(0, score)),
    breakdown,
    missingItems,
    potentialRisks,
    recommendations,
    calculatedAt: new Date(),
  };
}

function calculateHandoverContextScore(handover, relatedTasks = [], relatedDecisions = []) {
  const breakdown = {};
  const missingItems = [];
  const potentialRisks = [];
  const recommendations = [];

  // 1. Background Information (20 pts)
  const bgLen = (handover.background || '').trim().length;
  const descLen = (handover.description || '').trim().length;
  const bgPoints = bgLen > 100 ? 20 : (bgLen > 20 || descLen > 50 ? 10 : 0);
  breakdown.background = {
    name: 'Transfer Background & Operational Context',
    points: bgPoints,
    maxPoints: 20,
    present: bgPoints > 0,
    details: `${bgLen} characters background`
  };
  if (bgPoints < 20) {
    missingItems.push('Comprehensive background context explaining why and what is being transferred');
    potentialRisks.push('The incoming owner will lack tribal knowledge and historical context for the transfer.');
    recommendations.push('Provide a thorough background summary of the ongoing responsibilities.');
  }

  // 2. Handover Notes & Instructions (15 pts)
  const notesLen = (handover.handoverNotes || '').trim().length;
  const notesPoints = notesLen > 100 ? 15 : (notesLen > 20 ? 8 : 0);
  breakdown.instructions = {
    name: 'Operating Instructions & Transition Notes',
    points: notesPoints,
    maxPoints: 15,
    present: notesPoints > 0,
    details: `${notesLen} characters transition notes`
  };
  if (notesPoints < 15) {
    missingItems.push('Step-by-step handover instructions');
    potentialRisks.push('Incoming owner may miss critical daily processes or operational cadence.');
    recommendations.push('Add specific procedural notes, credentials guidance, or points of contact.');
  }

  // 3. Outstanding Action Items / Open Responsibilities (15 pts)
  const taskCount = (handover.actionItems || []).length || relatedTasks.length;
  const taskPoints = taskCount > 0 ? 15 : 5;
  breakdown.actionItems = {
    name: 'Carried-Forward & Outstanding Action Items',
    points: taskPoints,
    maxPoints: 15,
    present: taskCount > 0,
    details: `${taskCount} tasks associated`
  };
  if (taskCount === 0) {
    missingItems.push('Linked action items or transferred ongoing tasks');
    potentialRisks.push('In-flight tasks may be abandoned during ownership change.');
    recommendations.push('Carry forward open tasks from previous meetings into this handover.');
  }

  // 4. Linked Decisions (15 pts)
  const decisionCount = relatedDecisions.length;
  const decisionPoints = decisionCount >= 1 ? 15 : 0;
  breakdown.decisions = {
    name: 'Historical Decisions & Architectural Rationale',
    points: decisionPoints,
    maxPoints: 15,
    present: decisionPoints > 0,
    details: `${decisionCount} decisions connected`
  };
  if (decisionPoints === 0) {
    missingItems.push('Documented decisions explaining historical trade-offs');
    potentialRisks.push('Incoming owner might inadvertently reverse intentional prior architecture decisions.');
    recommendations.push('Link relevant decisions that shaped the current state of this project.');
  }

  // 5. Connected Prior Meetings & Documents (15 pts)
  const meetingCount = (handover.relatedMeetings || []).length;
  const docCount = (handover.documents || []).length;
  let linkPoints = 0;
  if (meetingCount > 0) linkPoints += 8;
  if (docCount > 0) linkPoints += 7;
  breakdown.historicalLinks = {
    name: 'Meeting Records & Supporting Documentation',
    points: linkPoints,
    maxPoints: 15,
    present: linkPoints > 0,
    details: `${meetingCount} meetings, ${docCount} documents linked`
  };
  if (linkPoints < 15) {
    missingItems.push('Reference documents and historical meeting linkages');
    potentialRisks.push('Incoming owner will need to manually query teammates for supporting documentation.');
    recommendations.push('Attach relevant runbooks or link recent planning meetings.');
  }

  // 6. Defined Dates / Transition Timeline (10 pts)
  const hasDates = !!(handover.startDate && handover.endDate);
  const datePoints = hasDates ? 10 : (handover.startDate ? 5 : 0);
  breakdown.timeline = {
    name: 'Defined Transition Window',
    points: datePoints,
    maxPoints: 10,
    present: datePoints > 0,
    details: hasDates ? 'Start & end dates defined' : 'No explicit transition window'
  };
  if (!hasDates) {
    missingItems.push('Clear start and end handover dates');
    potentialRisks.push('Ambiguous transition dates leave ownership boundaries blurred.');
    recommendations.push('Define explicit handover start and end dates.');
  }

  // 7. Formal Incoming Owner Acknowledgement (10 pts)
  const isAck = !!(handover.acknowledgement && handover.acknowledgement.acknowledged);
  const ackPoints = isAck ? 10 : (handover.status === 'pending-acknowledgement' ? 5 : 0);
  breakdown.acknowledgement = {
    name: 'Incoming Owner Formal Acknowledgement',
    points: ackPoints,
    maxPoints: 10,
    present: isAck,
    details: isAck ? 'Formally accepted by incoming owner' : 'Pending incoming owner sign-off'
  };
  if (!isAck) {
    missingItems.push('Formal sign-off and acknowledgement by incoming owner');
    potentialRisks.push('Work may be assumed transferred without incoming owner accepting responsibility.');
    recommendations.push('Incoming owner must review context and submit formal acceptance.');
  }

  const score = Object.values(breakdown).reduce((sum, item) => sum + item.points, 0);

  return {
    score,
    maxScore: 100,
    percentage: Math.min(100, Math.max(0, score)),
    breakdown,
    missingItems,
    potentialRisks,
    recommendations,
    calculatedAt: new Date(),
  };
}

module.exports = {
  calculateMeetingContextScore,
  calculateHandoverContextScore,
};
