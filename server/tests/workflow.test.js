process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';

const request = require('supertest');
const { connectDB, disconnectDB } = require('../config/db');
const app = require('../index');

describe('DigiPlus Core Workflows & Assessment End-to-End Test Suite', () => {
  let authToken;
  let testUser;
  let colleagueUser;
  let testMeetingId;
  let testHandoverId;
  let testTaskId;
  let testDecisionId;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  // 1. Health check & correlation ID
  test('1. API Health Check responds with correlation ID', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers['x-correlation-id']).toBeDefined();
  });

  // 2. User registration
  test('2. Register primary user and secondary colleague', async () => {
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Arjun Mehta',
        email: `arjun_${Date.now()}@digiplus.com`,
        password: 'password123',
        role: 'manager',
        team: 'Engineering',
      });

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.token).toBeDefined();
    authToken = res1.body.data.token;
    testUser = res1.body.data.user;

    const res2 = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Divya Rao',
        email: `divya_${Date.now()}@digiplus.com`,
        password: 'password123',
        role: 'member',
        team: 'Engineering',
      });
    expect(res2.status).toBe(201);
    colleagueUser = res2.body.data.user;
  });

  // 3. User login
  test('3. User login returns JWT & refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  // 4. Create meeting with agenda and participants
  test('4. Create meeting with agenda and participants', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Core Architecture Review Q4',
        objective: 'Finalize microservices separation and data boundary rules',
        description: 'Review current monolith bottleneck and plan out Q4 sprint priorities',
        dateTime: new Date(Date.now() + 86400000).toISOString(),
        location: 'Virtual Zoom Room',
        participants: [
          { user: colleagueUser.id, role: 'required' },
        ],
        agenda: [
          { title: 'Database decomposition', description: 'Review collections', duration: 25, order: 1 },
          { title: 'API gateway routing', description: 'Review rate limits', duration: 20, order: 2 },
        ],
        tags: ['architecture', 'q4'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.meeting._id).toBeDefined();
    testMeetingId = res.body.data.meeting._id;
  });

  // 5. Submit notes & update meeting
  test('5. Update meeting discussion notes', async () => {
    const notesContent = `Discussion Notes:
- Agreed to use event-driven messaging for notifications.
- Blocker: Third party payment webhook latency exceeds SLA.
- Decision: Migrate async jobs to worker queue.
- Action: Arjun to benchmark queue throughput by Friday.`;

    const res = await request(app)
      .post(`/api/meetings/${testMeetingId}/notes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ notes: notesContent });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.meeting.notes).toBe(notesContent);
  });

  // 6. Generate AI recap
  test('6. Generate AI Recap for meeting', async () => {
    const res = await request(app)
      .post('/api/ai/recap')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ meetingId: testMeetingId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recap.executiveSummary).toBeDefined();
    expect(Array.isArray(res.body.data.recap.keyDiscussionPoints)).toBe(true);
  });

  // 7. Record formal decision
  test('7. Record formal organizational decision', async () => {
    const res = await request(app)
      .post('/api/decisions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Adopt asynchronous worker queue for background jobs',
        rationale: 'Avoid blocking HTTP request threads for file parsing and notification fanout',
        source: {
          sourceType: 'meeting',
          sourceId: testMeetingId,
        },
        status: 'approved',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    testDecisionId = res.body.data.decision._id;
  });

  // 8. Create action item with source meeting link
  test('8. Create action item with source meeting reference', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Benchmark queue throughput under 10k concurrent payloads',
        description: 'Verify latency under load to confirm SLA guarantees',
        assignedTo: colleagueUser.id,
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
        priority: 'high',
        source: {
          sourceType: 'meeting',
          sourceId: testMeetingId,
        },
        relatedDecision: testDecisionId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    testTaskId = res.body.data.task._id;
    expect(res.body.data.task.history.length).toBeGreaterThanOrEqual(1);
  });

  // 9. Update task status & verify audit history
  test('9. Update task status and verify audit trail preserves transition', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${testTaskId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'in-progress',
        details: 'Started running local load benchmarks',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe('in-progress');

    // Retrieve history
    const histRes = await request(app)
      .get(`/api/tasks/${testTaskId}/history`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(histRes.status).toBe(200);
    const events = histRes.body.data.history.map(h => h.event);
    expect(events).toContain('status_changed');
  });

  // 10. Reassign task & verify ownership preservation
  test('10. Reassign task to another user and verify audit trail', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${testTaskId}/reassign`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        assignedTo: testUser.id,
        details: 'Reassigned back to manager for final sign-off',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.task.assignedTo).toBe(testUser.id);

    const histRes = await request(app)
      .get(`/api/tasks/${testTaskId}/history`)
      .set('Authorization', `Bearer ${authToken}`);

    const events = histRes.body.data.history.map(h => h.event);
    expect(events).toContain('reassigned');
  });

  // 11. Record definitive delivery outcome (Module 9 Requirement)
  test('11. Record definitive task outcome on completion', async () => {
    const res = await request(app)
      .post(`/api/tasks/${testTaskId}/outcome`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        summary: 'Benchmarked 12,500 req/sec sustained with 28ms p95 latency',
        actualOutcome: 'Worker queue successfully deployed to staging and verified with automated test suite',
        notes: 'Monitoring dashboard configured in Grafana',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe('completed');
    expect(res.body.data.task.outcome.summary).toContain('12,500');
    expect(res.body.data.task.outcome.completionDate).toBeDefined();
  });

  // 12. Create second open task for carry-forward testing
  let carryForwardTaskId;
  test('12. Create open task for carry-forward workflow', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Configure failover cluster for Redis cache',
        priority: 'medium',
        assignedTo: colleagueUser.id,
      });

    expect(res.status).toBe(201);
    carryForwardTaskId = res.body.data.task._id;
  });

  // 13. Create Work Handover
  test('13. Create Work Handover with background and transition notes', async () => {
    const res = await request(app)
      .post('/api/handovers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Q4 Core Infrastructure Transition',
        incomingOwner: colleagueUser.id,
        team: 'Engineering',
        background: 'Transitioning infrastructure duties during annual leave',
        handoverNotes: 'Daily checks at 9 AM, review Grafana dashboard and alerts',
        relatedMeetings: [testMeetingId],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    testHandoverId = res.body.data.handover._id;
  });

  // 14. Carry Forward Task without duplicate creation (Mandatory Requirement)
  test('14. Carry forward open task to handover — single canonical record preserved', async () => {
    const res = await request(app)
      .post(`/api/handovers/${testHandoverId}/carry-forward`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ taskIds: [carryForwardTaskId] });

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(1);

    // Verify task contextLinks has both sources
    const taskRes = await request(app)
      .get(`/api/tasks/${carryForwardTaskId}`)
      .set('Authorization', `Bearer ${authToken}`);

    const links = taskRes.body.data.task.contextLinks;
    expect(links.some(l => l.sourceType === 'handover' && l.sourceId === testHandoverId)).toBe(true);

    // Verify history recorded carry-forward event
    const events = taskRes.body.data.task.history.map(h => h.event);
    expect(events).toContain('carry_forward');
  });

  // 15. Prevent duplicate carry forward on repeated call
  test('15. Attempting duplicate carry forward does not duplicate record', async () => {
    const res = await request(app)
      .post(`/api/handovers/${testHandoverId}/carry-forward`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ taskIds: [carryForwardTaskId] });

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(0); // 0 new links added
  });

  // 16. Context Continuity Score calculation (Signature Feature)
  test('16. Signature Feature: Context Continuity Score calculated with explainable rubric', async () => {
    const res = await request(app)
      .get(`/api/handovers/${testHandoverId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const scoreData = res.body.data.contextScore;
    expect(scoreData).toBeDefined();
    expect(scoreData.score).toBeGreaterThanOrEqual(0);
    expect(scoreData.maxScore).toBe(100);
    expect(scoreData.breakdown).toBeDefined();
    expect(Array.isArray(scoreData.missingItems)).toBe(true);
    expect(Array.isArray(scoreData.recommendations)).toBe(true);
  });

  // 17. Submit handover and accept with formal acknowledgement
  test('17. Submit handover and formal acknowledgement by incoming owner', async () => {
    // Submit
    const submitRes = await request(app)
      .post(`/api/handovers/${testHandoverId}/submit`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(submitRes.body.data.handover.status).toBe('pending-acknowledgement');

    // Login as colleague
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: colleagueUser.email, password: 'password123' });
    const colleagueToken = loginRes.body.data.token;

    // Accept with notes
    const acceptRes = await request(app)
      .post(`/api/handovers/${testHandoverId}/accept`)
      .set('Authorization', `Bearer ${colleagueToken}`)
      .send({ notes: 'Context and runbooks verified. Ownership accepted.' });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.handover.status).toBe('accepted');
    expect(acceptRes.body.data.handover.acknowledgement.acknowledged).toBe(true);
  });

  // 18. Generate AI Catch-Up Brief
  test('18. Generate AI Contextual Catch-Up Brief for handover', async () => {
    const res = await request(app)
      .post('/api/ai/brief')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ handoverId: testHandoverId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.brief.executiveSummary).toBeDefined();
    expect(Array.isArray(res.body.data.brief.recommendedNextSteps)).toBe(true);
  });

  // 19. Unified Knowledge Base Search
  test('19. Unified organizational search matches across meetings, tasks, decisions', async () => {
    const res = await request(app)
      .get('/api/knowledge/search?q=queue')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tasks.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.decisions.length).toBeGreaterThanOrEqual(1);
  });

  // 20. Dashboard live metrics
  test('20. Centralized dashboard returns persisted metrics and task distribution', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalMeetings).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalHandovers).toBeGreaterThanOrEqual(1);
    expect(res.body.data.taskDistribution).toBeDefined();
  });
});
