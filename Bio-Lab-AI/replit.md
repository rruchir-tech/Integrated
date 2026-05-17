# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Full-stack AI lab assistant app ("Lab Copilot") with React+Vite frontend, Express backend, PostgreSQL, Gemini AI, and Clerk authentication.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- **Build**: esbuild (ESM bundle via `artifacts/api-server/build.mjs`)
- **AI**: Gemini via `@workspace/integrations-gemini-ai` (Replit AI Integrations proxy)
- **Frontend**: React + Vite, Wouter routing, TanStack Query, Recharts
- **Auth**: Clerk (Replit-managed, `@clerk/express` on server, `@clerk/react` on client)

## Artifacts

- `artifacts/api-server` — Express API server, port from `$PORT`, routes at `/api`
- `artifacts/lab-copilot` — React+Vite frontend, serves at `/`

## Key Files

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/db/src/schema/` — Drizzle schema: experiments, conversations, messages
- `artifacts/api-server/src/app.ts` — Express app with Clerk proxy + middleware wired in
- `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts` — Clerk proxy (copied from skill template)
- `artifacts/api-server/src/middlewares/requireAuth.ts` — `requireAuth` middleware using `getAuth(req)`
- `artifacts/api-server/src/routes/` — experiments.ts, gemini.ts (all protected via `requireAuth` in routes/index.ts)
- `artifacts/lab-copilot/src/App.tsx` — ClerkProvider setup, sign-in/sign-up pages, protected routes
- `artifacts/lab-copilot/src/pages/LandingPage.tsx` — Public landing page (shown when signed out)
- `artifacts/lab-copilot/src/components/layout/Layout.tsx` — Sidebar with user dropdown + sign-out
- `lib/api-client-react/src/generated/` — generated React Query hooks + Zod schemas

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Authentication (Clerk)

- **Management**: Replit-managed Clerk (provisioned via `setupClerkWhitelabelAuth()`)
- **Server**: `clerkMiddleware` + `clerkProxyMiddleware` in `app.ts`, all `/api` routes (except `/api/healthz`) protected with `requireAuth`
- **Client**: `ClerkProvider` wraps everything in `App.tsx`; routing via Wouter with `base={basePath}`
- **Routes**: `/` → public landing (shows dashboard redirect if signed in), `/sign-in/*?`, `/sign-up/*?`, all other routes guard with `<Show when="signed-in">`
- **Dev key behavior**: In dev, `VITE_CLERK_PUBLISHABLE_KEY` is used directly (bypasses `publishableKeyFromHost` to avoid unreachable `clerk.{dev-domain}`)
- **Appearance**: shadcn theme, dark mode colors matching app palette, branded flask logo at `public/logo.svg`
- **User profile**: `useUser()` hook in Layout sidebar; `useClerk().signOut()` for sign-out; no `<UserButton />`

## Database Schema

- `experiments` — id, name, date, assay_type, instrument, notes, status, file_name, raw_data_json, ai_summary, ai_next_experiments_json, conversation_id (FK), created_at, updated_at
- `conversations` — id, title, experiment_id (FK), created_at, updated_at
- `messages` — id, conversation_id (FK), role, content, created_at

## AI Features

- `POST /api/experiments/:id/analyze` — runs Gemini analysis, populates ai_summary + ai_next_experiments_json, creates a conversation
- `POST /api/gemini/conversations/:id/messages` — SSE streaming chat endpoint (text/event-stream)

## esbuild Note

`@google/*` is NOT in the external list in `build.mjs` so `@google/genai` gets bundled correctly. Only `@google-cloud/*` and `googleapis` are externalized.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
