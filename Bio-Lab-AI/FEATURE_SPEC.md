# Lab Copilot — Complete Feature Specification
_Every feature. What exists, what's broken, what to build. Organized by module._

Legend: ✅ Built & working | ⚠️ Built but broken/incomplete | 🔴 Must fix before launch | 🟡 Build next (user-ready) | 🔵 Build after (growth) | 🟣 Long term (scale)

---

## MODULE 1 — Authentication & User Management

### What exists
| Feature | Status | Notes |
|---|---|---|
| Sign-in page | ✅ | Clerk, custom dark theme, branded logo |
| Sign-up page | ✅ | Clerk managed |
| Sign-out | ✅ | Sidebar dropdown, useClerk().signOut() |
| User profile display | ✅ | Name + avatar in sidebar via useUser() |
| Admin panel | ✅ | Email-gated page with admin-only routes |
| Protected routes | ✅ | requireAuth middleware on all /api routes |
| Clerk proxy middleware | ⚠️ | Replit-specific, must be removed |
| Admin email hardcoded | ⚠️ | dasu.srivanth@gmail.com in code, needs env var |
| **User data isolation** | 🔴 | **CRITICAL: No user_id on any table. All users see all data.** |

### What to build
| Feature | Priority | Detail |
|---|---|---|
| Add user_id to all tables | 🔴 | experiments, tasks, comments, templates, conversations — filter every query by getAuth(req).userId |
| Move admin email to env var | 🔴 | ADMIN_EMAIL=... in .env, not hardcoded |
| Team workspaces | 🔵 | Lab owner creates a workspace. Invite colleagues by email. Shared data within workspace. |
| Role-based access | 🔵 | Owner (full control), Editor (create/edit experiments), Viewer (read-only). Stored in DB. |
| Email invitations | 🔵 | Clerk-managed invite flow. Invited user gets email, clicks link, joins workspace. |
| User preferences | 🔵 | Default assay type, default instrument, preferred AI model, dark/light mode preference — saved per user. |
| Audit log | 🟣 | Every create/update/delete logged with user_id + timestamp. Required for GxP compliance later. |

---

## MODULE 2 — Experiment Management (Core)

### What exists
| Feature | Status | Notes |
|---|---|---|
| Create experiment | ✅ | Name, date, assay type, instrument, notes, status, file upload |
| Edit experiment | ✅ | Full update form, PUT endpoint |
| Delete experiment | ✅ | Confirmation dialog, DELETE endpoint |
| List experiments | ✅ | Animated table, sorted by created_at desc |
| Search experiments | ✅ | By name, live query param |
| Filter by status | ✅ | success / failed / in_progress / unknown chip filters |
| Experiment status | ✅ | Enum: success, failed, unknown, in_progress |
| File upload on create | ✅ | CSV or Excel, base64 encoded in request body |
| File name stored | ✅ | file_name column in DB |
| Raw data stored | ✅ | raw_data_json column, parsed JSON string |
| Notes field | ✅ | Plain text, displayed in detail view |
| Filter by assay type | ⚠️ | OpenAPI param exists but not wired in UI |

### What to build
| Feature | Priority | Detail |
|---|---|---|
| Filter by assay type in UI | 🟡 | Dropdown on ExperimentList. Already in OpenAPI spec and backend. Just needs frontend wiring. |
| Filter by instrument | 🟡 | Same pattern as assay type filter. |
| Filter by date range | 🟡 | Date picker (from / to). Add to ListExperimentsQueryParams. |
| Sort experiments | 🟡 | Sort by: date, name, status, created_at. Currently hardcoded to created_at desc. |
| Experiment tags/labels | 🔵 | Free-form tags (e.g. "batch-3", "high-priority", "failed-controls"). Many-to-many with experiments. Filterable. |
| Bulk delete | 🔵 | Checkbox select multiple experiments, delete all. |
| Experiment archiving | 🔵 | Archive instead of delete. Archived experiments hidden from main list but searchable. |
| Duplicate experiment | 🔵 | Copy an experiment's metadata and template as a new experiment. Useful for repeat runs. |
| Experiment version history | 🟣 | Track every change to an experiment record. View diffs. Required for GxP compliance. |
| File re-upload | 🔵 | Allow uploading a new data file to an existing experiment after creation. |
| Multiple files per experiment | 🟣 | Some assays produce multiple output files (e.g., multiple wavelengths). Support array of uploaded files. |
| Experiment number / ID | 🔵 | Human-readable experiment number: EXP-001, EXP-002. Auto-incremented per user/workspace. |

---

## MODULE 3 — Instrument Data Parsers

This is the core technical differentiator. Every parser added = new user segment unlocked.

### What exists
| Parser | Status | Notes |
|---|---|---|
| Synergy H1 / Gen5 Excel | ✅ | Parses 8×12 well matrix, metadata (plate name, date, protocol, wavelength, instrument), stats (mean, SD, CV%, min, max), well status (ok/blank/high/low) |
| Generic CSV | ✅ | Detects signal, condition, group columns. Computes per-group mean. |

### What to build
| Parser | Priority | Instrument | Format | Key data to extract |
|---|---|---|---|---|
| SpectraMax (Molecular Devices) | 🟡 | Most common plate reader after Synergy H1 | .xls, tab-delimited | Plate map, wavelength, read time, column/row labels |
| Tecan Spark / Infinite | 🟡 | Very common in European labs | .xlsx, CSV | Similar to Synergy H1 but different column layout |
| BMG Labtech CLARIOstar | 🟡 | Common in pharmaceutical labs | .csv, .txt | Multiple read modes, well map |
| Applied Biosystems qPCR (.eds) | 🔵 | Most common qPCR machine | .eds (ZIP with XML inside) | Ct values, efficiency, melt peaks, sample names |
| Bio-Rad CFX qPCR (.pcrd) | 🔵 | Second most common qPCR | .pcrd (SQLite) | Ct, Cq, efficiency, plate layout |
| Flow cytometer FCS 3.1 | 🟣 | BD, Beckman Coulter, Sony | .fcs (binary) | Event count, FSC/SSC, fluorescence channels |
| HPLC chromatography | 🟣 | Agilent, Waters, Shimadzu | .csv, .arw | Peak area, retention time, peak ID |
| Nanodrop (UV absorbance) | 🔵 | Most common for DNA/RNA/protein quantification | .tsv, .csv | A260, A280, A260/A280 ratio, concentration |
| Bioanalyzer / TapeStation | 🟣 | Agilent — RNA/DNA quality | .xml, .csv | RIN/DV200, peak sizes, concentration |
| Generic tab-delimited | 🟡 | Any instrument | .txt, .tsv | Auto-detect columns, numeric data extraction |
| Auto-detect parser | 🟡 | Any | Any | File uploaded → system tries all parsers → picks best match → shows confidence |

---

## MODULE 4 — Data Visualization

### What exists
| Visualization | Status | Notes |
|---|---|---|
| 96-well plate heatmap | ✅ | Color gradient by absorbance value. Well status badges (ok/blank/high/low). Stats summary grid (mean, SD, min, max). |
| Experiments over time (line chart) | ✅ | Dashboard. Recharts LineChart. X=date, Y=count. |
| Assay type breakdown (pie chart) | ✅ | Dashboard. Recharts PieChart, donut style. |
| Instrument usage (bar chart) | ✅ | Dashboard. Manual horizontal progress bars. |
| Activity timeline | ✅ | Dashboard. Last 5 runs with status icon + date. |
| Data summary (non-plate) | ✅ | Row count, column list, basic stats for generic CSV. |

### What to build
| Visualization | Priority | Detail |
|---|---|---|
| CV% color coding on heatmap | 🟡 | If CV% > 20% = red warning banner. If 10–20% = yellow. If <10% = green. Scientists immediately know if assay quality is acceptable. |
| Z-factor / Z'-factor display | 🟡 | Z' = 1 - (3(σ_pos + σ_neg) / |μ_pos - μ_neg|). Industry standard HTS assay quality metric. Show prominently on plate heatmap. < 0.5 = unacceptable, 0.5–1.0 = excellent. |
| Dose-response curve (4PL) | 🟡 | 4-parameter logistic curve fit on dose-response data. Display curve + data points. Show IC50/EC50 with 95% CI. Replaces GraphPad Prism for this workflow. |
| Well tooltip on hover | 🟡 | Hover any well in heatmap → show well ID, exact value, status, z-score. |
| Row/column averages on heatmap | 🟡 | Show row mean on right edge, column mean on bottom of plate heatmap. |
| Multi-experiment overlay | 🔵 | Plot 2–4 experiments on same chart. Compare results visually. |
| Time series per well | 🔵 | For kinetic assays — plot absorbance over time for selected wells. |
| Signal-to-background ratio | 🟡 | Auto-compute S/B = (mean positive control) / (mean negative control). Display on plate detail. |
| Success rate trend (line chart) | 🔵 | Dashboard. % success per week over time. Scientists want to see if their technique is improving. |
| Export chart as PNG | 🔵 | Download button on any chart. Use html2canvas or recharts built-in toBase64Image. |
| Replicate variability chart | 🔵 | For triplicate wells — show individual data points + mean bar. Identify outlier replicates. |
| Plate layout designer | 🟣 | Click wells to designate: positive control, negative control, blank, sample, standard. Used to define the plate map before running the assay. |

---

## MODULE 5 — AI Analysis Engine

This is the core intelligence of the product. Goal: AI that has access to all of a scientist's data and acts as a second brain.

### What exists
| Feature | Status | Notes |
|---|---|---|
| One-shot analyze | ✅ | POST /api/experiments/:id/analyze → Gemini JSON mode → summary + 3 next-experiment suggestions with confidence (low/medium/high) |
| Deep data analysis report | ✅ | POST /api/experiments/:id/data-analysis → SSE stream → 7 sections: summary, data quality, dose-response, causes, comparison, next 3 experiments, confidence + limitations |
| Experiment comparison | ✅ | POST /api/experiments/compare → SSE stream → A vs B, optional question |
| Per-experiment copilot chat | ✅ | POST /api/gemini/conversations/:id/messages → SSE stream. Full history in DB. |
| Ask Anything chat (UI) | ⚠️ | Component exists on dashboard. Calls /api/gemini/general-chat. Generic system prompt. NOT connected to experiment data. |
| AI model | 🔴 | Was using Replit Gemini proxy. Replit is gone. All AI is broken. |

### What to build
| Feature | Priority | Detail |
|---|---|---|
| **Replace AI model** | 🔴 | Option A: Anthropic Claude SDK (recommended — 200K context, best reasoning). Option B: @google/genai direct with GEMINI_API_KEY. Swap in artifacts/api-server. |
| **Wire Ask Anything to data** | 🟡 | On every /api/gemini/general-chat message, fetch user's last 30 experiment summaries from DB and inject into system prompt. This single change creates the "second brain" demo. |
| Focus question on analyze | 🟡 | UI already has focus_question field in AnalyzeExperimentBody. Wire the input field in ExperimentDetail to send it. |
| AI re-analyze with new data | 🟡 | Button: "Re-analyze" — runs analyze again, replaces old summary. Useful after editing experiment or uploading new file. |
| Cross-experiment queries | 🔵 | New endpoint: POST /api/ai/query → natural language question → AI searches all user experiments using vector similarity or structured DB query → returns answer with cited experiment IDs. |
| Experiment memory / embeddings | 🔵 | When an experiment is analyzed, generate an embedding of the summary. Store in pgvector. Power semantic search ("find experiments similar to this one"). |
| AI-generated protocol | 🔵 | From a recommendation: "Generate a full protocol for this next experiment." AI outputs step-by-step protocol based on suggestion + assay type. |
| Trend analysis | 🔵 | POST /api/ai/trends → AI looks at all experiments over time and identifies patterns: "Your ELISA CV% has been increasing over the past 3 weeks — possible reagent degradation." |
| Failure root cause | 🔵 | When experiment.status = 'failed', AI auto-generates a root cause hypothesis based on the plate data, notes, and comparison to previous successful runs. Shown as a banner on ExperimentDetail. |
| IC50 / EC50 calculation | 🟡 | Server-side 4PL curve fitting (use mathjs or a Python microservice). Return IC50, EC50, Hill slope, R² value. Display on plate detail alongside AI interpretation. |
| Z'-factor auto-analysis | 🟡 | Auto-compute Z' from positive/negative control wells (user designates which wells are which). AI flags if Z' < 0.5 with specific corrective suggestions. |
| Statistical comparison between runs | 🔵 | For two experiments with same assay: unpaired t-test, Cohen's d effect size. AI interprets the result. "The difference is statistically significant (p=0.003), suggesting a real effect." |
| Assay quality scoring | 🔵 | Composite score per experiment: CV% (weight 30%) + Z' (30%) + S/B ratio (20%) + outlier count (20%) = 0–100 quality score. Show on experiment card in list. |
| AI model selector | 🔵 | User can choose: Claude Sonnet, Claude Opus, GPT-4o. Different models for different use cases (speed vs. quality). |

---

## MODULE 6 — Lab Notebook & Documentation

### What exists
| Feature | Status | Notes |
|---|---|---|
| Notes field (plain text) | ✅ | Free-form textarea on experiment create/edit. Displayed with whitespace preserved in detail view. |
| AI summary display | ✅ | Rendered as markdown with react-markdown + remark-gfm. |
| File name display | ✅ | Shown in plate heatmap card header. |
| Status badge | ✅ | Color-coded: success=green, failed=red, in_progress=cyan, unknown=gray. |

### What to build
| Feature | Priority | Detail |
|---|---|---|
| PDF report export | 🟡 | GET /api/experiments/:id/report.pdf — generates PDF with: header (logo + experiment name), metadata table, plate heatmap as image, stats table, AI summary, next suggestions, comments. Use pdfkit or puppeteer. Download button on ExperimentDetail. |
| Rich text notes | 🔵 | Replace plain text notes with Tiptap or Plate editor. Support: bold, italic, headings, bullet lists, tables, inline images. Store as JSON. Render as HTML. |
| Protocol steps | 🔵 | Structured ordered list of protocol steps. Each step has: title, description, duration, notes. Separate from free-form notes. Template-linked (templates define default protocol steps). |
| File attachments | 🔵 | Upload arbitrary files to an experiment (photos of plates, SDS sheets, vendor CoA PDFs). Store in object storage (S3, Cloudflare R2). Display as attachment list. |
| Experiment timeline view | 🔵 | Chronological view of all activity on an experiment: created → file uploaded → analyzed → comments → tasks completed. |
| Print view | 🟡 | CSS @media print optimized layout. No sidebar, full content, printer-friendly. Interim solution before PDF export. |
| Export experiment as JSON | 🔵 | Full experiment data export (metadata + plate data + AI summary + tasks + comments) as structured JSON. For data portability. |
| Export all experiments as CSV | 🔵 | Bulk export: one row per experiment with key metadata + AI summary. Useful for reporting to PIs or management. |

---

## MODULE 7 — Experiment Templates

### What exists
| Feature | Status | Notes |
|---|---|---|
| Template CRUD | ✅ | Create/edit/delete via modal. Fields: name, assay_type, instrument, description, default_notes, expected_control_rule, expected_status_default, ai_prompt_hint. |
| Template schema | ✅ | experimentTemplates table in DB. Rich schema already designed. |
| Templates page | ✅ | Lists all templates with inline edit/delete. |
| No pre-built templates | ⚠️ | Page exists but completely empty for new users. |
| Not linked to experiment create | ⚠️ | No "Create from template" button anywhere. |

### What to build
| Feature | Priority | Detail |
|---|---|---|
| 5 pre-built seed templates | 🟡 | Seed on deploy: (1) ELISA — absorbance 450nm, Synergy H1; (2) MTT Cell Viability — 570nm, Synergy H1; (3) BCA Protein Quantification — 562nm, standard curve; (4) Bradford Assay — 595nm; (5) ATP Luminescence (CellTiter-Glo) — luminescence mode. Each with default_notes and ai_prompt_hint tailored to the assay. |
| "New from template" button | 🟡 | On TemplatesPage and on ExperimentList header: "New from template" → picker → pre-fills ExperimentForm with template values. |
| Template preview | 🔵 | Hover/click a template to see a preview card: what fields it fills, expected plate layout, ai_prompt_hint. |
| Protocol steps in templates | 🔵 | Template defines ordered protocol steps. When experiment is created from template, steps are copied in. |
| Community templates | 🟣 | Public template library. Scientists can publish their protocol templates. Others can import them. |
| AI-generated template | 🔵 | "Describe your assay" → AI generates a template with all fields pre-filled. |

---

## MODULE 8 — Tasks & Workflow

### What exists
| Feature | Status | Notes |
|---|---|---|
| Per-experiment tasks | ✅ | Title, description, owner_name, due_date, status (todo/in_progress/done), priority (low/medium/high). |
| Global tasks page | ✅ | Lists all tasks across all experiments. |
| Tasks from AI recommendations | ✅ | RecommendationActions component — approve a suggestion → creates a task from it. |
| Tasks CRUD API | ✅ | GET, POST, PUT, DELETE. |

### What to build
| Feature | Priority | Detail |
|---|---|---|
| Task due date reminders | 🔵 | Email notification day before due date. Use Resend or SendGrid. Requires team email on account. |
| Kanban view for tasks | 🔵 | Board view: Todo → In Progress → Done columns. Drag-and-drop (dnd-kit). Toggle between list view and board view. |
| Task assignments (team) | 🔵 | Assign a task to a specific team member. Only available once team workspaces are built. |
| Recurring tasks | 🟣 | Schedule weekly/monthly tasks: "Check reagent stock every Monday." |
| Task dependencies | 🟣 | Task B cannot start until Task A is complete. |
| Task completion rate metric | 🔵 | Dashboard card: "X% of tasks completed on time this month." |

---

## MODULE 9 — Comments & Collaboration

### What exists
| Feature | Status | Notes |
|---|---|---|
| Per-experiment comments | ✅ | author_name + content + timestamp. POST + DELETE. |
| Comments panel | ✅ | Tab in ExperimentDetail side panel. |

### What to build
| Feature | Priority | Detail |
|---|---|---|
| Comment edit | 🟡 | Allow editing a comment within X minutes of posting. PUT /api/comments/:id. |
| Threaded replies | 🔵 | Reply to a specific comment. parent_comment_id in schema. Indented display. |
| @mentions | 🔵 | Type @ to mention a team member. They get notified. Requires team feature. |
| Emoji reactions | 🔵 | 👍 ✅ ❓ on comments. Quick acknowledgment without full reply. |
| Comment on specific well | 🟣 | Click a well in the heatmap → add a note/comment pinned to that well. Stored with well_id reference. |

---

## MODULE 10 — Dashboard & Analytics

### What exists
| Feature | Status | Notes |
|---|---|---|
| Total experiments count | ✅ | Animated counter. |
| Success rate % | ✅ | (success count / total) × 100. |
| Failed count | ✅ | Count from by_status. |
| In-progress count | ✅ | Count from by_status. |
| Experiments over time (line chart) | ✅ | Last 30 days. X=date, Y=count. |
| Assay type breakdown (donut) | ✅ | Count per assay_type. |
| Recent experiments list | ✅ | Last 5, with status badge. |
| Activity timeline | ✅ | Last 5 runs with icon and date. |
| Instrument usage bars | ✅ | Count per instrument as progress bars. |
| Ask Anything widget | ⚠️ | UI exists. Not connected to experiment data. |
| "Personalized" badge | ⚠️ | Misleading — no user_id filter yet. |

### What to build
| Feature | Priority | Detail |
|---|---|---|
| Filter dashboard by user_id | 🔴 | After user isolation fix — all counts and charts filter to current user. "Personalized" badge becomes honest. |
| Success rate trend line | 🔵 | Line chart: % success per week over last 12 weeks. Shows if scientist is improving. |
| Average CV% trend | 🔵 | Line chart: mean CV% across all plate reader experiments per week. Tracks assay quality over time. |
| Assay quality scores | 🔵 | Bar chart: average quality score per assay type. "Your ELISAs score 82/100, your cell viability assays score 61/100." |
| Experiments by project/tag | 🔵 | Once tagging exists — breakdown by tag/project. |
| Quick-action shortcuts | 🟡 | Dashboard buttons: "New Experiment", "Upload Data File", "Run Analysis on latest". Reduce clicks for common actions. |
| Personalized greeting | 🟡 | "Good morning, Rup. You have 2 in-progress experiments." Uses useUser() name + time of day. Already partially done. |
| Summary email digest | 🔵 | Weekly email: experiments run, success rate, failed runs, tasks due. Sent every Monday. |

---

## MODULE 11 — Second Brain (Global AI Intelligence)

This module is the strategic north star. It transforms the product from an ELN into a lab intelligence platform.

### What exists
| Feature | Status | Notes |
|---|---|---|
| Per-experiment copilot chat | ✅ | SSE streaming, full history, context = one experiment |
| Ask Anything chat | ⚠️ | UI exists, generic system prompt, NOT connected to data |
| Experiment comparison (A vs B) | ✅ | Manual — scientist picks 2 experiments |

### What to build
| Feature | Priority | Detail |
|---|---|---|
| Wire Ask Anything to all experiments | 🟡 | System prompt injection: before every Ask Anything message, fetch user's last 30 experiments (id, name, date, assay_type, status, ai_summary snippet). AI can now answer "which of my experiments worked?" or "what were my last 3 ELISA results?" |
| Global conversation history | 🟡 | Ask Anything maintains conversation history (not just single Q&A). Multi-turn memory within session. Store in conversations table with no experiment_id. |
| Cross-experiment data queries | 🔵 | Natural language → structured DB query. "What's my average CV% for all ELISAs?" → AI generates SQL → backend executes → AI interprets result. |
| Experiment embeddings (pgvector) | 🔵 | On analyze, generate embedding of summary. Store in pgvector column. Enable semantic search: "find experiments similar to last week's failed ELISA." |
| Trend detection | 🔵 | Weekly background job: AI scans all experiments, detects patterns, generates insight cards. "Your CV% has increased 40% over the past 2 weeks — possible reagent degradation." Shown on dashboard. |
| Failure pattern recognition | 🔵 | AI analyzes all failed experiments. Groups by probable cause. "3 of your last 5 failures had CV% > 30% — likely pipetting inconsistency." |
| AI lab report (weekly) | 🔵 | Auto-generated weekly lab summary: runs completed, key results, successes, failures, recommendations. One-click PDF export. |
| Multi-experiment chat | 🔵 | Start a conversation about a specific group of experiments (same assay, same time period). AI has context on all selected experiments simultaneously. |
| Protocol recommendation engine | 🟣 | Based on all historical experiments, AI recommends optimal protocol parameters: "For your next MTT assay, based on your previous 12 runs, use 2,000 cells/well and 72h incubation." |

---

## MODULE 12 — Sharing & Export

### What exists
| Feature | Status | Notes |
|---|---|---|
| No sharing features | — | Fully private. No sharing links. |
| No export features | — | No PDF, no CSV export. |

### What to build
| Feature | Priority | Detail |
|---|---|---|
| Print-optimized CSS | 🟡 | @media print styles on ExperimentDetail. Hides sidebar, nav, action buttons. Shows full content. Free, 2 hours of work. |
| PDF export of experiment | 🟡 | GET /api/experiments/:id/report.pdf. Includes: experiment header, metadata table, plate heatmap image, stats, AI summary, next suggestions. Use puppeteer (headless Chrome renders the React page, captures as PDF). |
| CSV export of plate data | 🟡 | Download the parsed well data as CSV. Scientists can open in Excel for manual analysis. |
| Read-only share link | 🟡 | Generate a share_token (UUID) per experiment. GET /api/experiments/shared/:token returns experiment data without auth. Recipient sees ExperimentDetail in read-only mode. "Share" button on detail page copies link. |
| Embed chart | 🔵 | Generate an embeddable iframe snippet for a plate heatmap or chart. Paste into Notion, Confluence, lab website. |
| Export all data as ZIP | 🔵 | Download all experiments as ZIP: JSON for each experiment, plate data CSVs, AI summaries as text files. Data portability. |
| Bulk PDF report | 🟣 | Select multiple experiments → generate combined PDF report. Useful for regulatory submissions. |

---

## MODULE 13 — Billing & Monetization

### What exists
| Feature | Status | Notes |
|---|---|---|
| No billing | — | Fully free, no payment. |

### What to build
| Feature | Priority | Detail |
|---|---|---|
| Stripe integration | 🔵 | Stripe Checkout for subscription signup. Webhook for payment events (subscribed, failed, cancelled). |
| Free tier limits | 🔵 | Max 10 experiments, max 3 AI analyses per month. Enforced in backend middleware. |
| Scientist plan ($49/mo) | 🔵 | Unlimited experiments, unlimited AI analyses, PDF export, share links. |
| Lab plan ($149/mo) | 🔵 | Up to 5 users, shared workspace, shared templates, team tasks. |
| Team plan ($399/mo) | 🟣 | Up to 20 users, advanced analytics, priority support, SSO. |
| Usage metering | 🔵 | Count AI analysis calls per user per month. Show usage on account settings page. |
| Billing portal | 🔵 | Stripe Customer Portal — manage subscription, update card, download invoices. One line of code with Stripe. |
| Annual discount | 🔵 | Pay annually, get 2 months free. Stripe coupon. |

---

## MODULE 14 — Integrations & Instrument Connectivity

### What exists
| Feature | Status | Notes |
|---|---|---|
| File upload (manual) | ✅ | Scientists export from instrument, upload CSV/Excel. |
| Synergy H1 parse-on-upload | ✅ | Auto-parsed when file uploaded during experiment create. |

### What to build
| Feature | Priority | Detail |
|---|---|---|
| Drag-and-drop file upload | 🟡 | Drag files directly onto experiment create page or detail page. Better UX than file picker. |
| Folder watcher (desktop app) | 🟣 | Electron or CLI app that watches a folder. When Gen5 exports a file, auto-uploads to Lab Copilot. Eliminates manual upload step. |
| Email-to-upload | 🟣 | Unique email address per user. Attach data file to email → auto-imported as new experiment. |
| Instrument API connectors | 🟣 | Direct API to Agilent BioTek cloud (if instrument is connected). Auto-pull results after run. |
| Slack notifications | 🔵 | Post to a Slack channel when: analysis complete, task due, experiment fails. |
| Email notifications | 🔵 | Transactional emails: analysis done, task reminder, weekly digest. Use Resend. |
| Zapier / webhook | 🟣 | POST to a webhook URL on any event. Lets scientists connect to any other tool. |
| ELN data import | 🟣 | Import experiments from Benchling, SciNote, or Excel-based lab notebooks. Migration tool for switchers. |

---

## MODULE 15 — Developer Experience & Infrastructure

### What exists
| Feature | Status | Notes |
|---|---|---|
| pnpm monorepo | ✅ | Clean workspace structure |
| OpenAPI-first development | ✅ | openapi.yaml → codegen → typed hooks |
| Drizzle ORM | ✅ | Type-safe SQL |
| TypeScript end-to-end | ✅ | Strict types in frontend + backend |
| esbuild bundling | ✅ | Fast backend build |
| Vite frontend | ✅ | Fast HMR |
| pino logging | ✅ | Structured JSON logs |
| CLAUDE.md | ✅ | Created — Claude Code now understands the codebase |
| Replit-specific code | 🔴 | Must be removed: clerkProxyMiddleware, integrations-gemini-ai proxy |
| No tests | ⚠️ | Zero test coverage anywhere |
| No CI/CD | ⚠️ | No GitHub Actions, no auto-deploy |

### What to build
| Feature | Priority | Detail |
|---|---|---|
| Remove Replit dependencies | 🔴 | Delete clerkProxyMiddleware from app.ts. Replace integrations-gemini-ai with direct SDK. |
| Railway deployment | 🟡 | Dockerfile or Railway config. PostgreSQL plugin. Env vars. Auto-deploy on git push. |
| Environment setup docs | 🟡 | .env.example with all required vars. README.md with setup steps. |
| GitHub Actions CI | 🔵 | On PR: typecheck + build. On merge to main: auto-deploy to Railway. |
| Database migrations | 🔵 | Drizzle migrations (not just push). Needed for safe production schema changes. |
| Rate limiting | 🔵 | express-rate-limit on AI endpoints. Prevent abuse. |
| Error monitoring | 🔵 | Sentry integration. Capture unhandled errors in production. |
| API request logging | ✅ | pino-http already in place |
| Unit tests (backend) | 🔵 | Vitest. Test: parsers, AI prompt builders, auth middleware. |
| E2E tests | 🟣 | Playwright. Test: create experiment, upload file, run analysis, view result. |
| Health check endpoint | ✅ | /api/healthz already exists |

---

## Summary: Build Order for User-Ready Product

### 🔴 Fix immediately (app is broken without these)
1. Remove Replit Gemini proxy → replace with direct AI SDK
2. Add user_id to all tables → filter all queries

### 🟡 Build this week (product is usable after this)
3. Deploy to Railway
4. Wire Ask Anything to real experiment data
5. Onboarding empty state
6. Assay type + instrument filters in UI
7. Pre-built seed templates (5 common assays)
8. Print CSS / PDF export

### 🔵 Build next 4 weeks (product is competitive after this)
9. SpectraMax + Tecan parsers
10. IC50 / Z'-factor calculation
11. Read-only share link
12. Drag-and-drop upload
13. Cross-experiment AI queries
14. Stripe billing
15. Team workspace + invites

### 🟣 Long term (product is a platform)
16. qPCR parser (Applied Biosystems, Bio-Rad)
17. Vector embeddings + semantic search
18. Trend detection + failure pattern AI
19. Folder watcher for auto-import
20. Audit log + GxP compliance
21. Community templates
22. E2E test suite
