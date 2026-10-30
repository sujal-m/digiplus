# DigiPlus — Session Handover Guide

## 1. Quick Project Summary
DigiPlus is a complete, production-grade AI-powered knowledge and task management platform that serves as an organizational memory system. It preserves meeting context, facilitates role/task handovers, extracts structured knowledge via Google Gemini AI, ensures pending tasks are carried forward, records definitive outcomes, and evaluates context continuity.

---

## 2. Current Project State: Fully Implemented & Tested
- **Backend**:
  - Express.js with 11 route files in `server/routes/` (`auth`, `users`, `dashboard`, `meetings`, `handovers`, `tasks`, `decisions`, `knowledge`, `notifications`, `ai`, `activity`).
  - Dedicated service layer in `server/services/` (`aiService`, `contextScoreService`, `taskService`, `notificationService`, `activityService`).
  - Mongoose models with full indexes and validation in `server/models/`.
  - Zero-configuration MongoDB connection with automatic in-memory fallback in `server/config/db.js`.
  - Winston structured logging with daily file rotation (`logs/app-YYYY-MM-DD.log`, `logs/ai-YYYY-MM-DD.log`, `logs/error-YYYY-MM-DD.log`).
  - Request correlation IDs (`X-Correlation-ID`) on every response.
  - Integration test suite in `server/tests/workflow.test.js`: **20/20 tests passing**.
  - Seed fixtures in `server/seed.js` with realistic demo accounts.
- **Frontend**:
  - React 18 + Vite with Tailwind CSS v4 in `client/`.
  - Built cleanly for production (`client/dist` generated with `npm run build`).
  - 14 complete interactive pages in `client/src/pages/`.
  - Responsive app layout with sidebar, notification badges, and user profile menu.
  - Automatic JWT refresh interceptor in `client/src/api/client.js`.

---

## 3. How to Run the Platform
```bash
# 1. From root, install all dependencies (if not done)
npm run install:all

# 2. Seed database with realistic fixtures
npm run seed

# 3. Start both backend (port 5000) and frontend (port 5173) concurrently
npm run dev

# 4. Run automated test suite
npm test
```

Demo logins (Password: `password123`):
- `amit@digiplus.com` (Engineering Manager / Admin)
- `priya@digiplus.com` (Tech Lead / Manager)
- `rahul@digiplus.com` (Senior Developer / Member)
- `sneha@digiplus.com` (Product Manager / Member)
- `vikram@digiplus.com` (Developer / Member)
- `ananya@digiplus.com` (Senior Product Manager / Manager)

---

## 4. Key Verification Artifacts
- Automated test logs: `server/tests/workflow.test.js` (20 passed)
- Built production bundles: `client/dist/`
- Audit and telemetry logs: `server/logs/`
- Full project documentation: `PROJECT_CONTEXT.md`, `PROGRESS.md`, `REQUIREMENTS_TRACEABILITY.md`, `TECHNICAL_DECISIONS.md`, `CHANGELOG.md`, `README.md`.
