# DigiPlus — Project Context & System Architecture

## 1. Executive Summary & Core Business Problem
**Project Name**: AI-Powered Knowledge & Task Management Platform  
**Organization / Context**: DigiPlus Technical Assessment  
**Core Mission**: Teams frequently lose important context when work changes hands — employees miss meetings, colleagues go on leave, meeting decisions aren't communicated, action items are forgotten, ownership is ambiguous, and incoming owners must manually dig through scattered notes.

DigiPlus acts as a lightweight **Organizational Memory System** that captures meetings and work transfers, converts unstructured content into structured knowledge using AI, links historical decisions/tasks/documents, automatically carries forward pending work, generates contextual catch-up briefs, tracks closure outcomes, and calculates an explainable **Context Continuity Score**.

---

## 2. Technology Stack & Key Choices

### Backend
- **Runtime**: Node.js (v20+)
- **Framework**: Express.js with modular REST routing
- **Database**: MongoDB with Mongoose ODM (embedded task history, context links, and flexible AI schema) with auto-fallback to `mongodb-memory-server` when local daemon is not running
- **Security & Middleware**: `helmet`, `cors`, `express-rate-limit`, `jsonwebtoken` (JWT + Refresh Tokens), `bcryptjs`, custom `correlationId` middleware
- **File Uploads**: `multer` with MIME and size constraints, text extraction for indexing
- **Observability**: `winston` + `winston-daily-rotate-file` with daily logs for general app (`app-%DATE%.log`), errors (`error-%DATE%.log`), and AI operations (`ai-%DATE%.log`)
- **Validation**: `zod` for request payload validation schemas

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS v4 design system
- **Routing**: `react-router-dom` v6 with protected routes and layouts
- **State & Data**: React Context API (`AuthContext`), Axios with token interceptor and automatic token refresh
- **Visualizations**: `recharts` for dashboard analytics and context score metrics
- **Icons & UI**: `lucide-react`, `date-fns`, `react-hot-toast`

### AI Integration
- **LLM Engine**: Google Gemini API (`gemini-2.0-flash` / `@google/generative-ai`)
- **Structured Extraction**: Enforced JSON schema generation for executive summaries, detailed notes, key discussion points, decisions, and action items with confidence scores
- **Catch-Up Briefs**: Synthesis of historical meetings, decisions, unresolved tasks, blockers, and recommendations
- **Resilience**: Independent AI service layer with strict timeouts, structured error handling, and manual non-AI fallback workflows

---

## 3. System Architecture & Component Topology

```
┌────────────────────────────────────────────────────────┐
│               Frontend (React 18 + Vite)               │
│  Dashboard │ Meetings │ Handovers │ Tasks │ Knowledge  │
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

## 4. Database Entities & Schemas

1. **User**: Name, email, password hash, role (`admin`, `manager`, `member`), team, title, avatar, isActive.
2. **Meeting**: Title, description, objective, dateTime, endTime, organizer, participants, agenda, notes, status (`draft`, `scheduled`, `in-progress`, `completed`, `archived`), aiRecap, contextScore, relatedMeetings, documents.
3. **Handover**: Title, description, outgoingOwner, incomingOwner, team, startDate, endDate, background, status (`draft`, `pending-acknowledgement`, `accepted`, `in-progress`, `completed`, `rejected`), handoverNotes, acknowledgement, aiSummary, contextScore, relatedMeetings, actionItems, documents.
4. **ActionItem**: Title, description, assignedTo, createdBy, dueDate, priority (`low`, `medium`, `high`, `critical`), status (`open`, `in-progress`, `blocked`, `completed`, `cancelled`), outcome (`summary`, `actualOutcome`, `completionDate`, `notes`), source (`meeting`, `handover`, `manual`, `ai-extracted`), contextLinks, history (chronological audit events), comments, documents.
5. **Decision**: Title, description, madeBy, madeAt, source, rationale, status (`proposed`, `approved`, `implemented`, `superseded`, `revoked`).
6. **Document**: Title, description, fileName, filePath, mimeType, fileSize, uploadedBy, content (indexed text), category, accessLevel.
7. **Notification**: User, type, title, message, sourceType, sourceId, read, priority.
8. **AIProcessingLog**: Operation type, model, correlationId, duration, tokenUsage, status, error, requestedBy.
9. **KnowledgeLink**: Source, target, relevanceScore, aiSuggested, confirmed.
10. **ActivityLog**: User, action, entityType, entityId, details, correlationId.

---

## 5. Signature Feature: Context Continuity Score
Calculates an explainable 0–100% metric reflecting readiness and context transfer quality during meetings and work handovers.
- **Criteria Evaluated**:
  - Background info & objectives (15 pts)
  - Notes / documentation (15 pts)
  - Recorded decisions (15 pts)
  - Assigned task owners (15 pts)
  - Defined deadlines on tasks (10 pts)
  - Linked historical meetings / docs (15 pts)
  - Documented blockers & risks (10 pts)
  - Formal acknowledgement (for handovers, 5 pts)
- **Output**: Detailed score breakdown, explicit list of missing items, potential operational risks, and AI-assisted recommendations.
