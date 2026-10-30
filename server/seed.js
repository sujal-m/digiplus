require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Meeting = require('./models/Meeting');
const ActionItem = require('./models/ActionItem');
const Decision = require('./models/Decision');
const Handover = require('./models/Handover');
const Notification = require('./models/Notification');
const Document = require('./models/Document');

const { connectDB, disconnectDB } = require('./config/db');

async function seed() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Meeting.deleteMany({}),
      ActionItem.deleteMany({}),
      Decision.deleteMany({}),
      Handover.deleteMany({}),
      Notification.deleteMany({}),
      Document.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Create users
    const users = await User.create([
      { name: 'Amit Sharma', email: 'amit@digiplus.com', password: 'password123', role: 'admin', team: 'Engineering', title: 'Engineering Manager' },
      { name: 'Priya Patel', email: 'priya@digiplus.com', password: 'password123', role: 'manager', team: 'Engineering', title: 'Tech Lead' },
      { name: 'Rahul Verma', email: 'rahul@digiplus.com', password: 'password123', role: 'member', team: 'Engineering', title: 'Senior Developer' },
      { name: 'Sneha Desai', email: 'sneha@digiplus.com', password: 'password123', role: 'member', team: 'Product', title: 'Product Manager' },
      { name: 'Vikram Singh', email: 'vikram@digiplus.com', password: 'password123', role: 'member', team: 'Engineering', title: 'Developer' },
      { name: 'Ananya Gupta', email: 'ananya@digiplus.com', password: 'password123', role: 'manager', team: 'Product', title: 'Senior Product Manager' },
    ]);
    console.log(`Created ${users.length} users`);

    const [amit, priya, rahul, sneha, vikram, ananya] = users;
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    // Create meetings
    const meetings = await Meeting.create([
      {
        title: 'Sprint 14 Planning',
        description: 'Sprint planning session for the upcoming two-week sprint. Review backlog priorities and assign tasks.',
        objective: 'Define sprint goals and assign tasks for Sprint 14',
        dateTime: new Date(now.getTime() - 7 * dayMs),
        endTime: new Date(now.getTime() - 7 * dayMs + 2 * 60 * 60 * 1000),
        location: 'Conference Room A',
        organizer: amit._id,
        participants: [
          { user: amit._id, role: 'organizer', attended: true },
          { user: priya._id, role: 'required', attended: true },
          { user: rahul._id, role: 'required', attended: true },
          { user: vikram._id, role: 'required', attended: false },
          { user: sneha._id, role: 'optional', attended: true },
        ],
        agenda: [
          { title: 'Review Sprint 13 outcomes', description: 'Discuss completed vs incomplete tasks', duration: 30, order: 1 },
          { title: 'Backlog prioritization', description: 'Review and prioritize product backlog', duration: 45, order: 2 },
          { title: 'Sprint 14 task assignment', description: 'Assign tasks to team members', duration: 30, order: 3 },
          { title: 'Risk assessment', description: 'Identify blockers and dependencies', duration: 15, order: 4 },
        ],
        notes: `Sprint 13 Outcomes:\n- Payment integration completed (Rahul)\n- User dashboard v2 partially done - 70% complete\n- API rate limiting implemented\n- Mobile responsiveness deferred to Sprint 14\n\nSprint 14 Planning:\n- Priority 1: Complete user dashboard v2\n- Priority 2: Mobile responsive redesign\n- Priority 3: Email notification system\n- Priority 4: Performance optimization\n\nBlockers:\n- Third-party API documentation incomplete\n- Staging environment stability issues\n\nDecisions:\n- Move to bi-weekly releases instead of weekly\n- Adopt TypeScript for new modules going forward\n- Postpone GraphQL migration to Q2`,
        status: 'completed',
        tags: ['sprint', 'planning', 'engineering'],
      },
      {
        title: 'Product Roadmap Review Q4',
        description: 'Quarterly product roadmap review and alignment session with stakeholders.',
        objective: 'Align team on Q4 product priorities and deliverables',
        dateTime: new Date(now.getTime() - 3 * dayMs),
        endTime: new Date(now.getTime() - 3 * dayMs + 90 * 60 * 1000),
        location: 'Virtual - Zoom',
        organizer: ananya._id,
        participants: [
          { user: ananya._id, role: 'organizer', attended: true },
          { user: sneha._id, role: 'required', attended: true },
          { user: amit._id, role: 'required', attended: true },
          { user: priya._id, role: 'required', attended: true },
        ],
        agenda: [
          { title: 'Q3 retrospective', description: 'Review Q3 achievements and misses', duration: 20, order: 1 },
          { title: 'Q4 OKRs presentation', description: 'Present quarterly objectives', duration: 30, order: 2 },
          { title: 'Feature prioritization', description: 'Stack rank features for Q4', duration: 30, order: 3 },
        ],
        notes: `Q3 Retrospective:\n- Shipped 3 major features on time\n- Customer satisfaction improved by 15%\n- Two features delayed due to scope creep\n\nQ4 Priorities:\n1. AI-powered search (highest priority)\n2. Advanced analytics dashboard\n3. Multi-tenant support\n4. API v2 with backward compatibility\n\nKey Decision: AI search will use embedding-based approach\nBudget: Approved additional cloud spend for AI infrastructure\n\nRisks:\n- AI talent shortage - may need contractor support\n- Multi-tenant migration complexity underestimated`,
        status: 'completed',
        tags: ['roadmap', 'quarterly', 'product'],
      },
      {
        title: 'Sprint 14 Daily Standup',
        description: 'Daily sync for Sprint 14 progress updates.',
        objective: 'Track daily progress and blockers',
        dateTime: new Date(now.getTime() + 1 * dayMs),
        endTime: new Date(now.getTime() + 1 * dayMs + 15 * 60 * 1000),
        location: 'Virtual - Teams',
        organizer: priya._id,
        participants: [
          { user: priya._id, role: 'organizer', attended: false },
          { user: rahul._id, role: 'required', attended: false },
          { user: vikram._id, role: 'required', attended: false },
        ],
        agenda: [
          { title: 'Yesterday\'s progress', description: '', duration: 5, order: 1 },
          { title: 'Today\'s plan', description: '', duration: 5, order: 2 },
          { title: 'Blockers', description: '', duration: 5, order: 3 },
        ],
        status: 'scheduled',
        tags: ['standup', 'daily'],
      },
      {
        title: 'Architecture Review - Microservices Migration',
        description: 'Review and discuss the proposed microservices architecture for the platform.',
        objective: 'Evaluate microservices migration plan and make go/no-go decision',
        dateTime: new Date(now.getTime() + 5 * dayMs),
        endTime: new Date(now.getTime() + 5 * dayMs + 2 * 60 * 60 * 1000),
        location: 'Conference Room B',
        organizer: amit._id,
        participants: [
          { user: amit._id, role: 'organizer', attended: false },
          { user: priya._id, role: 'required', attended: false },
          { user: rahul._id, role: 'required', attended: false },
          { user: vikram._id, role: 'optional', attended: false },
        ],
        agenda: [
          { title: 'Current monolith assessment', duration: 20, order: 1 },
          { title: 'Proposed microservices architecture', duration: 30, order: 2 },
          { title: 'Migration strategy', duration: 20, order: 3 },
          { title: 'Risk analysis', duration: 15, order: 4 },
          { title: 'Decision and next steps', duration: 15, order: 5 },
        ],
        status: 'scheduled',
        tags: ['architecture', 'migration'],
      },
    ]);
    console.log(`Created ${meetings.length} meetings`);

    // Create decisions
    const decisions = await Decision.create([
      {
        title: 'Adopt bi-weekly release cycle',
        description: 'Move from weekly to bi-weekly releases to improve quality and reduce release overhead.',
        madeBy: amit._id,
        madeAt: new Date(now.getTime() - 7 * dayMs),
        source: { sourceType: 'meeting', sourceId: meetings[0]._id },
        rationale: 'Weekly releases were causing burnout and insufficient testing time.',
        status: 'implemented',
        createdBy: amit._id,
      },
      {
        title: 'Use TypeScript for new modules',
        description: 'All new modules and components must be written in TypeScript to improve type safety.',
        madeBy: priya._id,
        madeAt: new Date(now.getTime() - 7 * dayMs),
        source: { sourceType: 'meeting', sourceId: meetings[0]._id },
        rationale: 'Type-related bugs have increased by 30% in the last quarter.',
        status: 'approved',
        createdBy: priya._id,
      },
      {
        title: 'AI search using embedding-based approach',
        description: 'Implement AI-powered search using document embeddings and vector similarity.',
        madeBy: ananya._id,
        madeAt: new Date(now.getTime() - 3 * dayMs),
        source: { sourceType: 'meeting', sourceId: meetings[1]._id },
        rationale: 'Keyword search is insufficient for semantic understanding of user queries.',
        status: 'approved',
        createdBy: ananya._id,
      },
      {
        title: 'Postpone GraphQL migration to Q2',
        description: 'GraphQL migration is not a Q4 priority. Defer to Q2 next year.',
        madeBy: amit._id,
        madeAt: new Date(now.getTime() - 7 * dayMs),
        source: { sourceType: 'meeting', sourceId: meetings[0]._id },
        rationale: 'Team bandwidth is insufficient and REST API is meeting current needs.',
        status: 'approved',
        createdBy: amit._id,
      },
    ]);
    console.log(`Created ${decisions.length} decisions`);

    // Create action items
    const tasks = await ActionItem.create([
      {
        title: 'Complete user dashboard v2',
        description: 'Finish the remaining 30% of user dashboard v2 including charts, filters, and export functionality.',
        assignedTo: rahul._id,
        createdBy: amit._id,
        dueDate: new Date(now.getTime() + 3 * dayMs),
        priority: 'high',
        status: 'in-progress',
        source: { sourceType: 'meeting', sourceId: meetings[0]._id },
        contextLinks: [{ sourceType: 'meeting', sourceId: meetings[0]._id, isOriginalSource: true }],
        history: [
          { event: 'created', actor: amit._id, timestamp: new Date(now.getTime() - 7 * dayMs), details: 'Task created from Sprint 14 Planning' },
          { event: 'assigned', actor: amit._id, timestamp: new Date(now.getTime() - 7 * dayMs), newValue: rahul._id.toString(), details: 'Assigned to Rahul Verma' },
          { event: 'status_changed', actor: rahul._id, timestamp: new Date(now.getTime() - 5 * dayMs), previousValue: 'open', newValue: 'in-progress', details: 'Started working on dashboard' },
        ],
        tags: ['frontend', 'dashboard'],
      },
      {
        title: 'Implement mobile responsive redesign',
        description: 'Make all existing pages mobile responsive. Focus on navigation, forms, and data tables.',
        assignedTo: vikram._id,
        createdBy: priya._id,
        dueDate: new Date(now.getTime() + 7 * dayMs),
        priority: 'medium',
        status: 'open',
        source: { sourceType: 'meeting', sourceId: meetings[0]._id },
        contextLinks: [{ sourceType: 'meeting', sourceId: meetings[0]._id, isOriginalSource: true }],
        history: [
          { event: 'created', actor: priya._id, timestamp: new Date(now.getTime() - 7 * dayMs), details: 'Task created from Sprint 14 Planning' },
          { event: 'assigned', actor: priya._id, timestamp: new Date(now.getTime() - 7 * dayMs), newValue: vikram._id.toString(), details: 'Assigned to Vikram Singh' },
        ],
        tags: ['frontend', 'mobile'],
      },
      {
        title: 'Set up email notification system',
        description: 'Implement transactional email notifications for task assignments, deadlines, and meeting updates.',
        assignedTo: rahul._id,
        createdBy: amit._id,
        dueDate: new Date(now.getTime() + 10 * dayMs),
        priority: 'medium',
        status: 'open',
        source: { sourceType: 'meeting', sourceId: meetings[0]._id },
        contextLinks: [{ sourceType: 'meeting', sourceId: meetings[0]._id, isOriginalSource: true }],
        history: [
          { event: 'created', actor: amit._id, timestamp: new Date(now.getTime() - 7 * dayMs), details: 'Created during Sprint 14 Planning' },
        ],
        tags: ['backend', 'notifications'],
      },
      {
        title: 'Research AI embedding providers',
        description: 'Evaluate embedding providers (OpenAI, Cohere, local models) for AI-powered search. Prepare comparison document.',
        assignedTo: priya._id,
        createdBy: ananya._id,
        dueDate: new Date(now.getTime() - 1 * dayMs),  // Overdue!
        priority: 'high',
        status: 'in-progress',
        source: { sourceType: 'meeting', sourceId: meetings[1]._id },
        contextLinks: [{ sourceType: 'meeting', sourceId: meetings[1]._id, isOriginalSource: true }],
        relatedDecision: decisions[2]._id,
        history: [
          { event: 'created', actor: ananya._id, timestamp: new Date(now.getTime() - 3 * dayMs), details: 'Created from Q4 Roadmap Review' },
          { event: 'assigned', actor: ananya._id, timestamp: new Date(now.getTime() - 3 * dayMs), newValue: priya._id.toString(), details: 'Assigned to Priya Patel' },
          { event: 'status_changed', actor: priya._id, timestamp: new Date(now.getTime() - 2 * dayMs), previousValue: 'open', newValue: 'in-progress' },
        ],
        tags: ['research', 'ai'],
      },
      {
        title: 'API rate limiting documentation',
        description: 'Document the API rate limiting configuration and guidelines for external API consumers.',
        assignedTo: vikram._id,
        createdBy: priya._id,
        dueDate: new Date(now.getTime() - 3 * dayMs),  // Overdue!
        priority: 'low',
        status: 'open',
        source: { sourceType: 'manual' },
        history: [
          { event: 'created', actor: priya._id, timestamp: new Date(now.getTime() - 10 * dayMs) },
          { event: 'assigned', actor: priya._id, timestamp: new Date(now.getTime() - 10 * dayMs), newValue: vikram._id.toString() },
        ],
        tags: ['documentation', 'api'],
      },
      {
        title: 'Fix staging environment stability',
        description: 'Investigate and resolve intermittent failures in the staging environment. Likely related to memory leaks.',
        assignedTo: rahul._id,
        createdBy: amit._id,
        dueDate: new Date(now.getTime() + 2 * dayMs),
        priority: 'critical',
        status: 'blocked',
        source: { sourceType: 'meeting', sourceId: meetings[0]._id },
        contextLinks: [{ sourceType: 'meeting', sourceId: meetings[0]._id, isOriginalSource: true }],
        history: [
          { event: 'created', actor: amit._id, timestamp: new Date(now.getTime() - 7 * dayMs) },
          { event: 'assigned', actor: amit._id, timestamp: new Date(now.getTime() - 7 * dayMs), newValue: rahul._id.toString() },
          { event: 'status_changed', actor: rahul._id, timestamp: new Date(now.getTime() - 4 * dayMs), previousValue: 'open', newValue: 'in-progress' },
          { event: 'status_changed', actor: rahul._id, timestamp: new Date(now.getTime() - 2 * dayMs), previousValue: 'in-progress', newValue: 'blocked', details: 'Waiting for DevOps team access to production logs' },
        ],
        comments: [
          { author: rahul._id, content: 'Need access to production monitoring dashboard to compare with staging behavior.', createdAt: new Date(now.getTime() - 2 * dayMs) },
          { author: amit._id, content: 'Requested access from DevOps. Should be granted by tomorrow.', createdAt: new Date(now.getTime() - 1 * dayMs) },
        ],
        tags: ['infrastructure', 'critical'],
      },
      {
        title: 'Q3 metrics report preparation',
        description: 'Prepare the Q3 engineering metrics report including velocity, defect rates, and deployment frequency.',
        assignedTo: amit._id,
        createdBy: ananya._id,
        dueDate: new Date(now.getTime() - 5 * dayMs),
        priority: 'medium',
        status: 'completed',
        outcome: {
          summary: 'Q3 metrics report completed and presented to leadership',
          actualOutcome: 'Report showed 20% improvement in velocity and 15% reduction in defect rate.',
          completionDate: new Date(now.getTime() - 5 * dayMs),
          notes: 'Shared with all stakeholders via email and uploaded to shared drive.',
        },
        source: { sourceType: 'manual' },
        history: [
          { event: 'created', actor: ananya._id, timestamp: new Date(now.getTime() - 14 * dayMs) },
          { event: 'assigned', actor: ananya._id, timestamp: new Date(now.getTime() - 14 * dayMs), newValue: amit._id.toString() },
          { event: 'status_changed', actor: amit._id, timestamp: new Date(now.getTime() - 10 * dayMs), previousValue: 'open', newValue: 'in-progress' },
          { event: 'status_changed', actor: amit._id, timestamp: new Date(now.getTime() - 5 * dayMs), previousValue: 'in-progress', newValue: 'completed' },
          { event: 'outcome_recorded', actor: amit._id, timestamp: new Date(now.getTime() - 5 * dayMs), details: 'Q3 metrics report completed' },
        ],
        tags: ['reporting', 'metrics'],
      },
    ]);
    console.log(`Created ${tasks.length} action items`);

    // Create handover
    const handovers = await Handover.create([
      {
        title: 'Sprint 14 Frontend Work Handover',
        description: 'Transferring frontend Sprint 14 responsibilities from Vikram to Rahul during Vikram\'s leave.',
        outgoingOwner: vikram._id,
        incomingOwner: rahul._id,
        team: 'Engineering',
        startDate: new Date(now.getTime() + 2 * dayMs),
        endDate: new Date(now.getTime() + 12 * dayMs),
        background: 'Vikram is going on medical leave for 10 days. His frontend tasks including mobile responsive redesign need to be handled by Rahul in the interim.',
        status: 'pending-acknowledgement',
        handoverNotes: 'Key areas:\n1. Mobile responsive redesign is the primary task\n2. CSS framework is Tailwind - follow existing patterns\n3. Test on Chrome, Firefox, Safari mobile\n4. Design mockups are in Figma (link in project docs)\n\nCurrent Progress:\n- Navigation responsive: 40% done\n- Forms responsive: not started\n- Data tables: not started',
        relatedMeetings: [meetings[0]._id],
        actionItems: [tasks[1]._id],
        tags: ['frontend', 'sprint-14'],
      },
      {
        title: 'Product Analytics Ownership Transfer',
        description: 'Permanent transfer of product analytics responsibilities from Sneha to Ananya.',
        outgoingOwner: sneha._id,
        incomingOwner: ananya._id,
        team: 'Product',
        startDate: new Date(now.getTime() - 2 * dayMs),
        background: 'Sneha is transitioning to a new role. All product analytics responsibilities including dashboards, metrics tracking, and reporting will be handled by Ananya.',
        status: 'accepted',
        handoverNotes: 'Analytics tools:\n- Mixpanel for product analytics\n- Metabase for SQL dashboards\n- Google Analytics for web traffic\n\nWeekly reports go to leadership every Monday.\nMonthly deep-dives presented in all-hands.\n\nKey contacts:\n- Data Engineering: Rahul for data pipeline issues\n- Marketing: needs weekly funnel metrics',
        acknowledgement: {
          acknowledged: true,
          acknowledgedAt: new Date(now.getTime() - 1 * dayMs),
          acknowledgedBy: ananya._id,
          notes: 'Acknowledged. Will need access to Mixpanel admin panel.',
        },
        relatedMeetings: [meetings[1]._id],
        tags: ['product', 'analytics', 'permanent'],
      },
    ]);
    console.log(`Created ${handovers.length} handovers`);

    // Create notifications
    await Notification.create([
      {
        userId: rahul._id,
        type: 'handover_pending',
        title: 'Handover Awaiting Your Acknowledgement',
        message: 'Vikram Singh wants to hand over Sprint 14 Frontend Work to you. Please review and acknowledge.',
        sourceType: 'handover',
        sourceId: handovers[0]._id,
        priority: 'high',
      },
      {
        userId: rahul._id,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: 'You have been assigned "Complete user dashboard v2" by Amit Sharma.',
        sourceType: 'task',
        sourceId: tasks[0]._id,
      },
      {
        userId: priya._id,
        type: 'task_overdue',
        title: 'Task Overdue',
        message: '"Research AI embedding providers" is past its due date.',
        sourceType: 'task',
        sourceId: tasks[3]._id,
        priority: 'high',
      },
      {
        userId: vikram._id,
        type: 'task_overdue',
        title: 'Task Overdue',
        message: '"API rate limiting documentation" is past its due date.',
        sourceType: 'task',
        sourceId: tasks[4]._id,
      },
      {
        userId: amit._id,
        type: 'meeting_created',
        title: 'New Meeting Scheduled',
        message: 'Architecture Review - Microservices Migration scheduled for ' + new Date(now.getTime() + 5 * dayMs).toLocaleDateString(),
        sourceType: 'meeting',
        sourceId: meetings[3]._id,
      },
      {
        userId: ananya._id,
        type: 'handover_accepted',
        title: 'Handover Accepted',
        message: 'You accepted the Product Analytics Ownership Transfer from Sneha Desai.',
        sourceType: 'handover',
        sourceId: handovers[1]._id,
        read: true,
        readAt: new Date(now.getTime() - 1 * dayMs),
      },
    ]);
    console.log('Created notifications');

    console.log('\n✅ Seed data created successfully!\n');
    console.log('Demo accounts:');
    console.log('  amit@digiplus.com / password123 (Admin)');
    console.log('  priya@digiplus.com / password123 (Manager)');
    console.log('  rahul@digiplus.com / password123 (Member)');
    console.log('  sneha@digiplus.com / password123 (Member)');
    console.log('  vikram@digiplus.com / password123 (Member)');
    console.log('  ananya@digiplus.com / password123 (Manager)');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
