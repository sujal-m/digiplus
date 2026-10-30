# DigiPlus — Technical Decisions Record (ADR)

## DEC-001: Data Persistence Architecture — MongoDB with In-Memory Dev Fallback
- **Date**: 2026-10-30
- **Context**: The assessment requires complex nested audit histories for tasks, document associations, and flexible JSON payloads for AI extraction results. Furthermore, the local machine may not have an active standalone MongoDB daemon running.
- **Decision**: Adopt MongoDB using Mongoose. To ensure 100% zero-configuration portability, implement an automatic in-memory fallback in `server/config/db.js` using `mongodb-memory-server` if the default connection to `mongodb://localhost:27017/digiplus` fails to connect.
- **Trade-offs**: In-memory mode does not persist data across node process restarts unless a persistent URI is provided, but provides immediate, foolproof demonstration and execution out of the box.

## DEC-002: Task Carry-Forward Identity Strategy
- **Date**: 2026-10-30
- **Context**: When carrying unresolved tasks forward from a previous meeting or handover into a new one, creating duplicate task records causes split history, lost outcomes, and ambiguous accountability.
- **Decision**: Maintain a single canonical `ActionItem` document. Add a `contextLinks` array containing `{ sourceType, sourceId, linkedAt, isOriginalSource, carryForwardFrom }`. Whenever a task is carried forward, append a link and record an immutable event in the task's `history` array.
- **Trade-offs**: Requires querying by `contextLinks.sourceId` instead of simple foreign key lookup, but preserves complete historical continuity and prevents task divergence.

## DEC-003: AI Service Layer & Resilient Structured Extraction
- **Date**: 2026-10-30
- **Context**: LLM outputs can be unpredictable or rate-limited. Business workflows must remain operational even if AI credentials are unset or the external LLM is down.
- **Decision**: Centralize all Gemini API calls in `server/services/aiService.js` using `gemini-2.0-flash`. Wrap all model calls in structured error-handling with telemetry logging. Provide heuristic fallback generators so users still receive sensible summaries and extractions even when offline.
- **Trade-offs**: Heuristic fallback is less nuanced than LLM outputs, but guarantees zero UI crashes and preserves end-to-end functionality.

## DEC-004: Explainable Context Continuity Score
- **Date**: 2026-10-30
- **Context**: Signature feature requirement: quantify context completeness when work is transferred without unfair subjective penalization.
- **Decision**: Implement a deterministic 8-vector rubric (background, notes, decisions, assigned owners, deadlines, links, blockers, acknowledgement) yielding 0–100%. Complement with AI-generated qualitative gap analysis and recommendations.
- **Trade-offs**: Deterministic scoring provides predictable, transparent accountability while AI provides rich natural-language advice.
