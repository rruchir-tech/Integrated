# Lab Copilot — Product Evaluation, SWOT & Week-1 Roadmap

_Brutal, honest, no fluff. Generated May 21, 2026._

---

## 1. How to See Your Product (Like Replit / Windsurf)

This is the honest answer, not the comfortable one.

**Right now**: The app only runs on Replit because it depends on Replit's internal AI proxy (`integrations-gemini-ai`) and a Clerk proxy middleware. You can't just `npm start` it elsewhere and have it work.

**Your options ranked by speed:**

### Option A — Stay on Replit (fastest, for now)
Keep using Replit to preview while you build. It already works there. Claude Code can still read and edit your files in the `Bio-Lab-AI/` folder, and you can see the result in Replit's webview. This is the right move this week while you fix the critical bugs.

### Option B — Deploy to Railway (~1 hour to live URL)
Railway is the Replit equivalent for hosted deployments with a real URL anyone can visit.
1. Push code to GitHub (if not already there)
2. Create a Railway project → add PostgreSQL plugin → add Node service
3. Set env vars: `DATABASE_URL`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `GEMINI_API_KEY`
4. Remove `clerkProxyMiddleware` from `app.ts` (Replit-only)
5. Swap `@workspace/integrations-gemini-ai` to use `GEMINI_API_KEY` directly via `@google/genai`
6. Deploy. Cost: ~$5-10/month.

**This gives you a live URL like `https://lab-copilot.up.railway.app` that anyone can open.**

### Option C — Run locally with Claude Code
1. Set the env vars in a `.env` file
2. Run `pnpm install && pnpm --filter @workspace/api-server run dev` (port 8080) + `pnpm --filter @workspace/lab-copilot run dev` (port 8081)
3. View at `localhost:8081`

Claude Code in your terminal = you edit → save → browser auto-refreshes. Exactly like Windsurf's local preview.

---

## 2. Product Evaluation — Real World, No Sugar-Coating

### What You Actually Built
A biotech AI lab notebook ("Electronic Lab Notebook" / ELN) with:
- Experiment CRUD with Synergy H1 plate reader data parsing
- Gemini 2.5 Flash analysis (one-shot summary + 3 next-experiment suggestions)
- Per-experiment AI chat copilot (SSE streaming)
- 96-well plate heatmap visualization
- Experiment comparison (A vs B, AI-driven)
- Deep data analysis report (7-section structured markdown, SSE streamed)
- Tasks + Comments per experiment
- Experiment templates (CRUD, no pre-built content yet)
- Dashboard with charts (experiments over time, assay types, instrument usage)
- Clerk authentication (per-user login)
- Command palette (Cmd+K)

### The Competitive Landscape (Brutal)

| Competitor | Pricing | Strength | Why Users Might Pick You Instead |
|---|---|---|---|
| **Benchling** | Free for academics, $$$+ for pharma | Industry standard, molecular biology tools, compliance | Too complex, too expensive for small labs |
| **SciNote** | Free tier, ~$50/user/mo | FDA labs use it, EU commission approved | No AI analysis, generic ELN |
| **Scispot** | ~$200+/mo | API-first, integrations, AI features on roadmap | Expensive, enterprise-focused |
| **IGOR** | Affordable, small-lab focus | ELN + LIMS combo | New, limited AI |
| **Genemod** | Mid-range | LIMS + ELN native link | More LIMS than copilot |

**Your real niche**: Small biotech / CRO / academic lab that uses plate readers (ELISA, cell viability, absorbance assays) and wants AI analysis without Benchling's price tag or complexity. That's a real, underserved market.

**Your actual differentiators** (the ones that matter):
1. Synergy H1 parser is genuinely specific and valuable — nobody else has this out of the box
2. AI analysis quality (Gemini 2.5 Flash + structured prompts) is better than generic "summarize this"
3. Clean, fast UI — Benchling feels like a 2015 SaaS product
4. Experiment comparison with AI is rare and useful

---

## 3. SWOT Analysis

### Strengths

- **Solid technical foundation**: pnpm monorepo, TypeScript end-to-end, OpenAPI-first, Drizzle ORM — this is professional-grade scaffolding
- **Good UI/UX**: Framer Motion animations, dark mode, shadcn components — it looks and feels modern
- **Gemini integration is real**: Not just a wrapper — you have SSE streaming, structured JSON responses, system prompts tailored to plate reader science
- **Specific data parser**: Synergy H1 / Gen5 parsing is concrete, rare, and directly valuable
- **Feature breadth for v1**: Tasks, comments, templates, comparison, dashboard — more surface than most v1 products
- **Auth is in place**: Clerk is working, sign-in/sign-up flow exists

### Weaknesses

- **CRITICAL: No data isolation** — Every user sees every other user's experiments. A second user logging in sees your private data. This is a data breach waiting to happen. Fix this before anyone else uses the product.
- **Replit-locked**: The Gemini proxy and Clerk proxy are Replit-specific. Moving to production requires refactoring.
- **No onboarding**: A new user logs in and sees an empty dashboard with no guidance. No sample data, no tutorial, no "start here" flow.
- **Templates are empty**: The template feature exists but ships with zero pre-built templates. It's a ghost town.
- **Dashboard "Personalized" is a lie**: That badge says personalized but shows data from ALL users (no user_id filtering).
- **No data export**: Scientists need PDF reports for their lab notebooks and regulatory submissions. There's no export at all.
- **No multi-user team features**: Labs work in teams. There's no way to share an experiment with a colleague or assign tasks across users.
- **Compliance gap**: No audit trail, no 21 CFR Part 11 support, no e-signatures. This blocks pharma/regulated biotech customers entirely (for now, and that's fine for v1).

### Opportunities

- **Expand plate reader support**: Add SpectraMax (Molecular Devices), Tecan Spark, Biotek Epoch parsers → dramatically wider TAM
- **PDF report export**: Every scientist needs a printable report. Build this and labs will use it for regulatory submissions.
- **Lab team plans**: Organizations pay $200-500/month for multi-user ELN. This is the monetization path.
- **Instrument integrations**: If you can pull data directly from plate readers via API/file watch, you remove the manual upload step — huge friction reduction
- **Protocol templates**: 20 pre-built templates for common biotech assays (ELISA, MTT cell viability, BCA protein quantification, Bradford) = immediate "wow" moment for new users
- **AI model portability**: You're on Gemini. When users ask for Claude or GPT-4 instead, you can offer choice.

### Threats

- **Benchling adds AI**: They already have basic AI features. If they go all-in on Gemini/Claude integration, your AI advantage shrinks.
- **Data trust**: Scientists are conservative. One wrong AI suggestion about a drug dose concentration that a researcher acts on could end your company. Your AI must always caveat clearly.
- **Small lab churn**: Academic labs are price-sensitive and grant-dependent. They'll love you, but won't pay much.
- **OpenAI/Anthropic native lab tools**: If Anthropic builds Claude for Science, it could commoditize your core AI layer.
- **No funding/runway pressure**: This doesn't threaten the product, but if you're trying to turn this into a company, lab software sales cycles are long. Factor that in.

---

## 4. Feature Plan — This Week (5 days, prioritized by impact)

### Day 1-2: Fix the Critical Bug + Setup for Claude Code

**[MUST DO — DO NOT SKIP]**

#### Task 1: Add user_id to all user-owned tables
This is non-negotiable. Without it, you can't let any real user touch your product.

Files to change:
- `lib/db/src/schema/experiments.ts` → add `user_id: text("user_id").notNull()`
- `lib/db/src/schema/tasks.ts` → add `user_id`
- `lib/db/src/schema/experimentComments.ts` → add `user_id`
- `lib/db/src/schema/experimentTemplates.ts` → add `user_id`
- `artifacts/api-server/src/routes/experiments.ts` → filter every query with `eq(experiments.user_id, getAuth(req).userId!)`
- Run `pnpm --filter @workspace/db run push` to apply schema

#### Task 2: Verify CLAUDE.md is committed
The `CLAUDE.md` file has been created. Commit it. Claude Code uses this to understand your codebase instantly without you having to re-explain.

---

### Day 2-3: Make First Users Not Confused

#### Task 3: Onboarding empty state
When a new user logs in and has zero experiments, show:
- A welcome message with their name
- A "Create your first experiment" card with 3 example assay types
- A link to pre-built templates

File: `artifacts/lab-copilot/src/pages/Dashboard.tsx` — add empty state branch when `total_experiments === 0`

#### Task 4: Pre-built experiment templates
Add 5 templates in the DB seed or via a migration:
- ELISA (96-well, Synergy H1)
- MTT Cell Viability
- BCA Protein Quantification
- Bradford Protein Assay
- ATP Luminescence (CellTiter-Glo)

File: `artifacts/api-server/src/lib/seed.ts` — add template seed data

---

### Day 3-4: Make the Product Shippable

#### Task 5: PDF export of experiment report
Scientists print experiment reports. Build a `GET /api/experiments/:id/report.pdf` endpoint that:
- Renders experiment metadata + AI summary + suggestions as PDF
- Use `pdfkit` or `puppeteer` (puppeteer is easier for complex layouts)
- Add a "Download Report" button on ExperimentDetail

This is the single feature most likely to make a scientist say "I need this."

#### Task 6: Fix "Personalized" dashboard badge
Either actually filter by user (after Task 1), or remove the misleading badge. Quick fix: once user_id is added, dashboard queries filter by user_id automatically. The badge then becomes honest.

---

### Day 4-5: Polish for First Demo

#### Task 7: Add "Share experiment" read-only link
Generate a public token for an experiment so a colleague can view (not edit) it. No auth required for the read-only view.
- Add `share_token: text("share_token")` to experiments table
- `GET /api/experiments/shared/:token` (public endpoint)
- "Share" button on ExperimentDetail → copies link to clipboard

#### Task 8: Deployment to Railway
Get a live URL. Deploy the app so you can send a link to potential users and say "try it." This is the moment the product becomes real.

---

## 5. What NOT to Build This Week

These are distractions right now:

- **21 CFR Part 11 compliance** — way too early, requires audit trails, e-signatures, validation documents. Park this for Series A.
- **Mobile app** — your users are at a bench with a laptop.
- **Real-time multiplayer** — you don't have team users yet.
- **Custom AI model fine-tuning** — Gemini 2.5 Flash with good prompts is good enough.
- **More chart types on dashboard** — the dashboard is fine. Focus on getting users, not pixels.

---

## 6. The Honest Summary

This is a real product. The code quality is solid. The idea is valid. The Synergy H1 parser and the Gemini analysis depth are genuine differentiators.

But you have **one showstopper bug** (no user_id isolation) that makes multi-user deployment unsafe right now.

Fix that. Add onboarding. Add PDF export. Deploy to Railway. Then go find 5 bench scientists and put it in their hands.

The product doesn't need to be perfect — it needs to be in front of users who feel the pain it solves.
