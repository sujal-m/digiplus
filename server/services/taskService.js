const ActionItem = require('../models/ActionItem');
const { createNotification } = require('./notificationService');
const { logActivity } = require('./activityService');
const { logger } = require('../config/logger');

/**
 * Carry forward tasks to a subsequent meeting or handover.
 * MANDATORY REQUIREMENT: Preserves single canonical task record.
 * Never creates duplicate tasks.
 */
async function carryForwardTasks({ taskIds, targetType, targetId, userId, correlationId }) {
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return { success: true, count: 0, tasks: [] };
  }

  const tasks = await ActionItem.find({ _id: { $in: taskIds } });
  const updatedTasks = [];

  for (const task of tasks) {
    // Check if task is already linked to this context to prevent duplicate linking
    const alreadyLinked = task.contextLinks.some(
      (link) => link.sourceType === targetType && link.sourceId.toString() === targetId.toString()
    );

    if (!alreadyLinked) {
      // Find latest previous context if any
      const previousContext = task.contextLinks[task.contextLinks.length - 1];

      task.contextLinks.push({
        sourceType: targetType,
        sourceId: targetId,
        linkedAt: new Date(),
        isOriginalSource: false,
        carryForwardFrom: previousContext ? previousContext.sourceId : undefined,
      });

      // Record immutable carry-forward event in audit trail
      task.history.push({
        event: 'carry_forward',
        actor: userId,
        timestamp: new Date(),
        details: `Task carried forward to ${targetType} (ID: ${targetId})`,
        previousValue: previousContext ? `${previousContext.sourceType}:${previousContext.sourceId}` : null,
        newValue: `${targetType}:${targetId}`,
      });

      await task.save();
      updatedTasks.push(task);

      // Log activity
      await logActivity({
        userId,
        action: 'carry_forward_task',
        entityType: 'task',
        entityId: task._id,
        details: { targetType, targetId },
        correlationId,
      });
    }
  }

  logger.info('Carried forward tasks', {
    count: updatedTasks.length,
    targetType,
    targetId,
    userId,
    correlationId,
  });

  return {
    success: true,
    count: updatedTasks.length,
    tasks: updatedTasks,
  };
}

/**
 * Update task status with audit history
 */
async function updateTaskStatus({ taskId, status, userId, details = '', correlationId }) {
  const task = await ActionItem.findById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  const previousStatus = task.status;
  if (previousStatus === status) {
    return task;
  }

  task.status = status;
  task.history.push({
    event: 'status_changed',
    actor: userId,
    timestamp: new Date(),
    previousValue: previousStatus,
    newValue: status,
    details: details || `Status changed from ${previousStatus} to ${status}`,
  });

  await task.save();

  // If assigned to someone else, notify owner
  if (task.assignedTo && task.assignedTo.toString() !== userId.toString()) {
    await createNotification({
      userId: task.assignedTo,
      type: 'task_status_changed',
      title: 'Task Status Updated',
      message: `Status of "${task.title}" updated to ${status}.`,
      sourceType: 'task',
      sourceId: task._id,
    });
  }

  await logActivity({
    userId,
    action: 'update_task_status',
    entityType: 'task',
    entityId: task._id,
    details: { previousStatus, newStatus: status },
    correlationId,
  });

  return task;
}

/**
 * Reassign task with audit history
 */
async function reassignTask({ taskId, newAssigneeId, userId, details = '', correlationId }) {
  const task = await ActionItem.findById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  const previousAssignee = task.assignedTo;
  task.assignedTo = newAssigneeId;

  task.history.push({
    event: 'reassigned',
    actor: userId,
    timestamp: new Date(),
    previousValue: previousAssignee ? previousAssignee.toString() : null,
    newValue: newAssigneeId ? newAssigneeId.toString() : null,
    details: details || 'Task reassigned to new owner',
  });

  await task.save();

  if (newAssigneeId) {
    await createNotification({
      userId: newAssigneeId,
      type: 'task_reassigned',
      title: 'Task Reassigned to You',
      message: `You are now assigned to: "${task.title}".`,
      sourceType: 'task',
      sourceId: task._id,
      priority: 'high',
    });
  }

  await logActivity({
    userId,
    action: 'reassign_task',
    entityType: 'task',
    entityId: task._id,
    details: { previousAssignee, newAssignee: newAssigneeId },
    correlationId,
  });

  return task;
}

/**
 * Record task outcome (Module 9)
 */
async function recordTaskOutcome({ taskId, summary, actualOutcome, notes = '', userId, correlationId }) {
  const task = await ActionItem.findById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  task.outcome = {
    summary,
    actualOutcome,
    completionDate: new Date(),
    notes,
  };
  task.status = 'completed';

  task.history.push({
    event: 'outcome_recorded',
    actor: userId,
    timestamp: new Date(),
    details: `Task outcome recorded: ${summary}`,
    newValue: { summary, actualOutcome },
  });

  task.history.push({
    event: 'status_changed',
    actor: userId,
    timestamp: new Date(),
    previousValue: task.status,
    newValue: 'completed',
    details: 'Completed with recorded outcome',
  });

  await task.save();

  await logActivity({
    userId,
    action: 'record_task_outcome',
    entityType: 'task',
    entityId: task._id,
    details: { summary, actualOutcome },
    correlationId,
  });

  return task;
}

module.exports = {
  carryForwardTasks,
  updateTaskStatus,
  reassignTask,
  recordTaskOutcome,
};
