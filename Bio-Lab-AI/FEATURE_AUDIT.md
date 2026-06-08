# Lab Copilot — Feature Audit (verified against code)

_Generated 2026-06-08 by reading the actual codebase, not the May-21 docs. The older FEATURE_SPEC.md and PRODUCT_ROADMAP.md are stale: their three "🔴 app is broken" blockers are all already fixed._

Legend: ✅ working · ⚠️ built but broken/incomplete · ❌ missing

---

## Headline: the docs' "showstoppers" are already done

| Doc claim (May 21) | Reality in code (Jun 8) |
|---|---|
| 🔴 AI broken — depends on dead Replit Gemini proxy | ✅ Fixed. `@workspace/integrations-gemini-ai` uses `GoogleGenAI({ apiKey: GEMINI_API_KEY })` directly. |
| 🔴 No user_id — all users see all data | ✅ Mostly fixed. `experiments`, `tasks`, `experimentComments` have `user_id`; every query filters by `getAuth(req).userId`. |
| 🔴 clerkProxyMiddleware (Replit-only) mounted | ✅ Not mounted in app.ts. File is dead code only. |
| ⚠️ Admin email hardcoded | ✅ Fixed. Uses `process.env.ADMIN_EMAILS`. |
| ⚠️ No CI/CD, no auto-deploy | ✅ Done. Vercel (frontend) + Render (backend) auto-deploy on push to main. |
| 🟡 Deploy to Railway | ✅ Superseded — live on Vercel + Render. |

---

## Real remaining gaps (this is the actual work)

### ⚠️ Incomplete / broken
- **Ask Anything chat not wired to data** — `general-chat` handler sends the message with a generic prompt and never queries the DB, even though a `buildLabHistory()` helper already exists right above it. Both strategy docs call wiring this "the single change that creates the second-brain demo." Highest impact.
- **Templates not isolated** — `experimentTemplates` table has no `user_id`; the `/templates` routes take `_req` (no auth filter). All users share one global template pool. Isolation leak + cross-user noise.
- **Conversations not isolated** — `conversations` table has no `user_id` (filtered indirectly via experiment ownership for per-experiment chat, but global Ask Anything history would be shared).
- **Templates page empty** — feature works, ships with zero pre-built templates; no "New from template" entry point.
- **Experiment filters not wired** — assay-type / instrument / date-range / sort exist in backend + OpenAPI but aren't surfaced in the ExperimentList UI.
- **Dashboard "Personalized" + Ask Anything widget** — now honest for experiments (user_id filtered) but the widget itself isn't connected to data (same root cause as Ask Anything).

### ❌ Missing (high value, near-term)
- **PDF / print export** of an experiment report — most-requested by bench scientists.
- **Onboarding empty state** for zero-experiment users.
- **Read-only share link** for an experiment.
- **Drag-and-drop file upload.**

### ❌ Missing (later — growth/scale)
- More parsers (SpectraMax, Tecan, qPCR, Nanodrop), IC50/Z'-factor stats, cross-experiment AI queries + embeddings, team workspaces, Stripe billing, audit log/GxP. (Full list in FEATURE_SPEC.md — still valid for these tiers.)

### 🧹 Dead code to remove
- `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts` (unused).
- `lib/integrations/gemini_ai_integrations/` (legacy duplicate of the active `lib/integrations-gemini-ai`).

---

## Build order (most impactful first)

1. **Wire Ask Anything to experiment data** — backend-only, ~30 LOC, the demo-maker.
2. **Isolate + seed templates** — add `user_id`, 5 pre-built assays, "New from template".
3. **Wire experiment filters/sort in UI** — backend already supports it.
4. **Onboarding empty state.**
5. **PDF export.**
6. **Remove dead Replit code** (cleanup, bundle with any of the above).

Each lands as its own commit to `main` so Vercel/Render auto-deploy.
