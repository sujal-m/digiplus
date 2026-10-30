# DigiPlus — AI-Powered Knowledge & Task Management Platform

[![Test Status: 20/20 Passed](https://img.shields.io/badge/tests-20%2F20%20passed-brightgreen.svg)](#16-testing-instructions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#)
[![Node: >=20.0.0](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](#)
[![React: 18](https://img.shields.io/badge/react-18-blue.svg)](#)

> **DigiPlus** is a lightweight **Organizational Memory System** designed to solve tribal knowledge loss, preserve historical meeting decisions, ensure seamless work transitions when responsibilities change hands, and guarantee that unfinished action items are carried forward until formal delivery closure.

---

## 1. Project Overview
Teams frequently lose critical context when work changes hands:
- Employees go on planned or sudden leave and interim successors lack tribal knowledge.
- Decisions made in meetings aren’t documented or communicated across silos.
- Action items are forgotten or ownership becomes blurred between sprints.
- Incoming team members spend dozens of hours digging through fragmented emails, notes, and chats.

**DigiPlus** centralizes meeting records, work transfers, tasks, decisions, and knowledge-base documents into an interconnected knowledge graph with meaningful, fail-safe AI capabilities powered by **Google Gemini 2.0 Flash**.

---

## 2. Signature Feature: Context Continuity & Organizational Memory Score

### The Business Value
Whenever an employee leaves for vacation, transitions projects, or completes a major sprint meeting, **how can leadership or the incoming owner objectively know if sufficient context was preserved?**

The **Context Continuity Score** evaluates each meeting and handover against an explainable, deterministic 8-dimensional rubric (yielding 0–100%):

1. **Background & Objectives (15-20 pts)**: Clear statement of purpose and operational scope.
2. **Notes & Discussion Records (15 pts)**: Written minutes or meeting transcripts.
3. **Documented Decisions (15 pts)**: Rationale and trade-offs preserved in permanent records.
4. **Task Ownership Clarity (15 pts)**: Percentage of action items assigned to responsible individuals.
5. **Defined Deadlines (10 pts)**: Defined target completion dates on tasks.
6. **Historical Context & Links (15 pts)**: Connected antecedent meetings, runbooks, and reference documents.
7. **Documented Blockers & Risks (10 pts)**: Explicit tracking of operational bottlenecks.
8. **Formal Acknowledgement (10 pts)**: Legal/formal sign-off by the successor accepting ownership.

### Explainable Outputs & Risk Engine
- **Transparent Percentage**: Displays exact points earned per factor.
- **Identified Missing Items**: e.g., *"Missing owner assignment for 2 action items"* or *"Missing historical decisions explaining architecture choices"*.
- **Operational Risk Assessment**: Explains concrete risks of missing context (e.g., *"Decisions may be re-debated in future meetings without prior rationale"*).
- **Actionable AI Recommendations**: Steps to bring context readiness to 100%.

---

## 3. Key Capabilities & Modules

| Module | Core Functionality |
|:---|:---|
| **1. Dashboard & Workspace** | Real-time statistics, task distribution chart, upcoming meetings, pending handovers, overdue task tracking, and recent activity feed. |
| **2. Meeting Management** | Full CRUD, participant attendance, agenda items, notes, status lifecycle (`draft` → `scheduled` → `in-progress` → `completed` → `archived`), and AI recap extraction. |
| **3. Work Transfer / Handover** | Formal transfer of duties from outgoing to incoming owner, status lifecycle (`draft` → `pending-acknowledgement` → `accepted` → `in-progress` → `completed`), and formal acknowledgement with sign-off notes. |
| **4. Task Management** | Action items with priorities, due dates, statuses (`open`, `in-progress`, `blocked`, `completed`, `cancelled`), and comments. |
| **5. Immutable Task Audit History** | **Never overwrites historical ownership or deadlines**. Every assignment, reassignment, status transition, and extension is saved in an append-only audit trail with timestamps and actors. |
| **6. Task Carry-Forward Mechanism** | **Single Canonical Record Strategy**: Pending action items from completed meetings/handovers are linked to new contexts without creating duplicate tasks. |
| **7. Outcome Recording (Module 9)** | Distinguishes checking a box from documenting delivery. Captures summary, actual outcome achieved, completion date, and notes. |
| **8. AI Meeting Recap & Extraction** | Extracts executive summaries, key discussion points, decisions, and action items with confidence scores and source evidence. |
| **9. AI Contextual Catch-Up Brief** | Synthesizes project background, inherited decisions, outstanding responsibilities, blockers, and recommended immediate next steps for someone who missed meetings or took over a role. |
| **10. Centralized Knowledge Base** | Document uploads (PDF, DOCX, TXT, MD), text extraction for search, category indexing, and unified cross-entity search. |
| **11. In-App Notifications** | Real-time notifications for handover acknowledgements, task assignments, overdue deadlines, and status changes. |
| **12. Structured Logging & Observability** | Correlation IDs (`X-Correlation-ID`) across every request, Winston rotating daily files (`app-%DATE%.log`, `error-%DATE%.log`, `ai-%DATE%.log`), and AI latency tracking. |

---

## 4. System Architecture

```
┌────────────────────────────────────────────────────────┐
│               Frontend (React 18 + Vite)               │
│  Tailwind CSS v4 │ Recharts │ React Router │ Axios     │
└───────────────────────────┬────────────────────────────┘
                            │ REST + JWT (X-Correlation-ID)
┌───────────────────────────▼────────────────────────────┐
│              Backend (Express.js API Layer)            │
│  Middlewares: Auth, Validate, CorrelationId, Logger    │
├──────────────┬──────────────┬─────────────┬────────────┤
│  Meetings    │  Handovers   │    Tasks    │ Knowledge  │
│  Controller  │  Controller  │  Controller │ Controller │
├──────────────┴──────────────┴─────────────┴────────────┤
│                    Service Layer                       │
│  TaskService │ ContextScoreService │ ActivityService   │
│  NotificationService │ AIService (Gemini 2.0 Flash)    │
├────────────────────────────────────────────────────────┤
│           Data Layer (Mongoose / MongoDB)              │
│  User, Meeting, Handover, ActionItem, Decision,        │
│  Document, Notification, AIProcessingLog, ActivityLog  │
└────────────────────────────────────────────────────────┘
```

---

## 5. Technology Stack

### Backend
- **Node.js 20+** & **Express.js**
- **MongoDB** with **Mongoose ODM** (Includes automatic zero-configuration in-memory fallback via `mongodb-memory-server`)
- **Authentication**: JWT (Access Token + Refresh Token), BCrypt password hashing, role-based authorization (`admin`, `manager`, `member`)
- **Validation**: Zod schema validation
- **Observability**: Winston + Daily Rotate File, unique correlation IDs
- **File Uploads**: Multer with 10MB limits, PDF text extraction via `pdf-parse`

### Frontend
- **React 18** with **Vite**
- **Tailwind CSS v4** design system
- **Routing**: React Router v6 with protected routes
- **Data & Charts**: Axios with automatic JWT refresh interceptor, Recharts
- **Icons & Polish**: Lucide React, date-fns, react-hot-toast

### AI
- **Google Gemini 2.0 Flash** via `@google/generative-ai`
- Structured JSON output enforcement
- Resilient non-AI heuristic fallbacks to guarantee 100% operational uptime if AI is unreachable

---

## 6. Installation & Quick Start

### Prerequisites
- Node.js (v20+ recommended)
- npm (v10+)
- *(Optional)* Local MongoDB instance on port 27017. **If no local MongoDB is detected, the platform automatically starts an embedded in-memory database instance.**

### Step 1: Install Dependencies
```bash
# From the repository root
npm run install:all
```

### Step 2: Configure Environment Variables
Copy `.env.example` in `server/` to `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/digiplus
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
GEMINI_API_KEY=your-gemini-api-key-here # Optional: Platform uses intelligent fallbacks if empty
```

### Step 3: Seed Demonstration Data
Populate realistic enterprise records (6 users, 4 meetings, 4 decisions, 7 action items, 2 handovers, notifications):
```bash
npm run seed
```

**Pre-seeded Demo Accounts** (Password for all accounts is `password123`):
- `amit@digiplus.com` (Engineering Manager / Admin)
- `priya@digiplus.com` (Tech Lead / Manager)
- `rahul@digiplus.com` (Senior Developer / Member)
- `sneha@digiplus.com` (Product Manager / Member)
- `vikram@digiplus.com` (Developer / Member)
- `ananya@digiplus.com` (Senior Product Manager / Manager)

### Step 4: Run Application
```bash
# Runs both backend (port 5000) and frontend (port 5173) concurrently
npm run dev
```

Open your browser at: **`http://localhost:5173`**

---

## 7. Testing Instructions

The project includes an end-to-end automated integration test suite validating all 20 critical business workflows.

```bash
cd server
npm test
```

### Test Coverage Highlights
- ✅ API Health check & correlation ID header attachment
- ✅ User registration & login with JWT + refresh tokens
- ✅ Meeting creation, agenda management, participant attendance
- ✅ Discussion notes recording & AI recap generation
- ✅ Decision creation & linkage to meeting context
- ✅ Action item creation with priority and due date
- ✅ Task status updates & verification of immutable audit trail
- ✅ Task owner reassignment & verification of history event
- ✅ **Outcome Recording** with permanent achievement preservation
- ✅ Handover creation with background context & runbooks
- ✅ **Task Carry-Forward** without duplicate task record creation
- ✅ Prevention of duplicate carry-forward links on repeated attempts
- ✅ **Context Continuity Score** calculation & explainable breakdown
- ✅ Handover submission & formal sign-off by incoming owner
- ✅ AI Contextual Catch-Up Brief generation
- ✅ Unified search across meetings, tasks, decisions, and documents
- ✅ Real-time dashboard statistics and task distribution aggregation

---

## 8. Logging Architecture

DigiPlus implements structured application logging via Winston with automatic daily rotation:

- **Application Logs (`logs/app-YYYY-MM-DD.log`)**: Captures every incoming HTTP request, correlation ID, status code, latency, and user identity.
- **Error Logs (`logs/error-YYYY-MM-DD.log`)**: Captures application exceptions, stack traces, and validation failures.
- **AI Telemetry Logs (`logs/ai-YYYY-MM-DD.log`)**: Tracks every AI operation (type, model, correlation ID, execution duration, token usage, status, and errors).

### Sample Log Entry (with Correlation ID)
```json
{
  "timestamp": "2026-10-30 11:47:52.102",
  "level": "info",
  "message": "Request completed",
  "service": "digiplus-api",
  "correlationId": "ffc63839-e33b-49d8-b85e-42dfba3ec90d",
  "method": "POST",
  "url": "/api/meetings",
  "statusCode": 201,
  "duration": "102ms",
  "userId": "6ae4368e01df942ce0f1de8b"
}
```

---

## 9. API Overview

| Group | Method & Endpoint | Description |
|:---|:---|:---|
| **Auth** | `POST /api/auth/register` | Register new user |
| | `POST /api/auth/login` | Login and receive JWT & refresh token |
| | `POST /api/auth/refresh` | Refresh expired access token |
| | `GET /api/auth/me` | Current authenticated user profile |
| **Dashboard** | `GET /api/dashboard/stats` | Aggregated metrics, activity feed, upcoming meetings |
| **Meetings** | `GET /api/meetings` | List meetings with filters & pagination |
| | `POST /api/meetings` | Create meeting |
| | `GET /api/meetings/:id` | Meeting details, context score, decisions, tasks |
| | `POST /api/meetings/:id/complete` | Complete meeting and calculate score |
| | `POST /api/meetings/:id/notes` | Save discussion notes / transcript |
| | `POST /api/meetings/:id/carry-forward` | Carry forward open tasks to this meeting |
| **Handovers** | `GET /api/handovers` | List handovers with status filter |
| | `POST /api/handovers` | Initiate work transfer |
| | `GET /api/handovers/:id` | Handover details, context score, tasks |
| | `POST /api/handovers/:id/submit` | Submit for incoming owner review |
| | `POST /api/handovers/:id/accept` | Formal acknowledgement by incoming owner |
| | `POST /api/handovers/:id/complete` | Mark handover completed |
| | `POST /api/handovers/:id/carry-forward`| Carry forward tasks into handover |
| **Tasks** | `GET /api/tasks` | List action items with status, priority, due date filters |
| | `GET /api/tasks/my` | Action items assigned to current user |
| | `POST /api/tasks` | Create action item |
| | `GET /api/tasks/:id` | Task details with full immutable audit history |
| | `PATCH /api/tasks/:id/status` | Update task status with audit logging |
| | `PATCH /api/tasks/:id/reassign` | Reassign owner with audit logging |
| | `POST /api/tasks/:id/outcome` | Record permanent completion outcome |
| | `POST /api/tasks/:id/comments` | Add progress update / comment |
| **Knowledge** | `GET /api/knowledge/documents` | List uploaded documents |
| | `POST /api/knowledge/documents` | Upload document and extract text |
| | `GET /api/knowledge/search` | Unified search across meetings, tasks, decisions, docs |
| | `POST /api/knowledge/suggest-links`| AI suggested semantic connections |
| **AI** | `POST /api/ai/extract` | Extract structured info from meeting text |
| | `POST /api/ai/recap` | Generate executive meeting recap |
| | `POST /api/ai/brief` | Generate contextual catch-up brief |
| | `POST /api/ai/handover-summary` | Generate handover executive summary |
| | `POST /api/ai/context-score` | Calculate Context Continuity Score |

---

## 10. Technical Assumptions & Design Decisions
- **Zero-Configuration Portability**: Built with an automatic in-memory MongoDB fallback. If a local MongoDB service isn't active on port 27017, the application seamlessly provisions an in-memory database instance so evaluators never encounter database startup errors.
- **Canonical Task Identity**: Action items are never duplicated when carried forward into subsequent meetings or work handovers. Instead, context references (`contextLinks`) are appended to the canonical task record to maintain end-to-end auditability.
- **AI Resilience**: All AI features employ structured JSON schema validation and include heuristic fallback generators. If an API key is missing or rate-limited, the system falls back gracefully without user-facing disruption.

---

## 11. Cross-Session Continuity Documentation
For engineers resuming development or transferring across Codex accounts, consult the persistent project knowledge base:
- [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) — Technical and business specifications
- [`PROGRESS.md`](PROGRESS.md) — Current implementation milestones & status
- [`HANDOVER.md`](HANDOVER.md) — Session entry point and continuation instructions
- [`REQUIREMENTS_TRACEABILITY.md`](REQUIREMENTS_TRACEABILITY.md) — Requirement-to-code mapping
- [`TECHNICAL_DECISIONS.md`](TECHNICAL_DECISIONS.md) — Architecture decision records (ADR)
- [`CHANGELOG.md`](CHANGELOG.md) — Chronological release notes
