# BioLab Copilot — Master Plan
> Last updated: June 2026 | Status: App DOWN, zero customers, break starts now

---

## HONEST SITUATION ASSESSMENT

| Item | Status |
|------|--------|
| App live | ❌ Replit expired |
| Code exists | ✅ ZIP downloaded |
| Infrastructure accounts | ✅ Vercel, Neon, Render, GitHub |
| Gemini API key | ✅ Free tier (aistudio.google.com) |
| Paying customers | ❌ Zero |
| Customer conversations | ❌ Zero |
| Co-founder | ⚠️ Unreliable, solo for now |

**The only two jobs this break:** Get it live. Get it in front of humans.
Everything else is a distraction.

---

## WHAT YOU BUILT (Memory)

A biotech AI lab copilot for seed-stage startups (5–20 person labs).

**Features shipped:**
- Synergy H1 plate reader Excel import (BioTek Gen5 format)
- 96-well heatmap (green = good, yellow = borderline, red = failed)
- Experiment memory — stores all past runs, feeds history to AI
- Copilot chat — plain English questions answered with lab context
- Dashboard — success/fail tracking, experiment trends
- Suggestions tab — 3 next-experiment recommendations after every run
- Experiment comparison side-by-side

**Stack:**
- Frontend: React
- Backend: Python Flask
- AI: Gemini 2.0 Flash (free tier, 1,500 req/day)
- Database: Neon (PostgreSQL)
- Hosting: Vercel (frontend) + Render (backend)

---

## PRODUCT VISION

> **BioLab Copilot is the AI brain layer for the wet lab.**
> Every experiment a scientist runs generates data. Today, 90% of that data is analyzed manually, stored in scattered Excel files, and never connected to the next experiment. BioLab Copilot makes every piece of data useful — automatically.

**The 3-year picture:**
A scientist opens BioLab Copilot the same way they open Slack or Notion — it is the operating system for their lab's institutional knowledge. Every instrument feeds into it. Every failed experiment trains it. New scientists onboard instantly because the AI knows the lab's history.

**The moat:** Data network effect. The more experiments a lab logs, the smarter the suggestions become. After 6 months of real usage, switching costs are enormous.

**The wedge:** Plate reader analysis → land with one instrument, one pain → expand from there.

---

## USER PERSONAS

### Primary: "The Solo Scientist" (ICP — build for her first)
- Title: Research Scientist / Scientist II at seed/Series A biotech
- Company size: 5–25 people
- Pain: Spends 2–4 hours per experiment doing manual analysis in Excel
- Current tools: Excel, paper lab notebook, maybe Benchling
- Budget authority: Can expense $50–150/month without approval
- Key insight: She doesn't want a new notebook. She wants to stop doing analysis manually.

### Secondary: "The PI" (Unlock at Series A)
- Title: Head of Biology, VP R&D
- Pain: No visibility into team-wide experiment trends. New hires repeat experiments that already failed.
- Willing to pay: $200–500/month for team plan
- Trigger: A scientist on her team tells her about it

### Tertiary: "The CRO / Core Facility" (Long-term)
- Runs experiments for multiple clients
- Needs multi-tenant isolation, white-labeling, report generation for clients
- Revenue: $1,000–5,000/month per facility

---

## FULL PRODUCT FEATURE MAP

Features are organized by product area. Each has a priority tier (P1/P2/P3) and a build trigger (what must be true before you build it).

---

### AREA 1: DATA INGESTION (The On-Ramp)

These are the ways data gets into the system. The wider the on-ramp, the more scientists can use it.

**P1 — SHIP NOW (already built or near-done)**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| Gen5 Excel import | Parse BioTek plate reader exports | This is your wedge — ship it perfectly |
| Drag-and-drop upload | Drop file anywhere on the page | Removes friction, first impression matters |
| Import validation | Tell the user if their file format is wrong | Prevents confusion, builds trust |

**P2 — Build after 2+ customer requests**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| qPCR import (CFX format) | Bio-Rad CFX Manager .csv/.txt | Huge user base, adjacent to plate readers |
| QuantStudio import | Applied Biosystems .txt format | Covers the other major qPCR platform |
| Auto-detect instrument type | Read file header, auto-select parser | Reduces steps for the user |
| Multi-file batch upload | Upload 5 experiments at once | Saves time for labs running high-throughput |
| CSV / generic format | Any tabular data, user maps columns | Safety net for instruments not yet supported |

**P3 — Build after product-market fit**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| Benchling integration | Pull experiment data directly from Benchling via API | ELN integration removes double-entry |
| Tecan i-control import | Tecan plate reader format | Covers ~20% of the market not on BioTek |
| Agilent Seahorse import | Metabolic flux data | Specialized but high-value |
| Plate reader live connection | Direct instrument API via USB/serial bridge | Future: real-time data as experiment runs |

---

### AREA 2: ANALYSIS ENGINE (The Core Value)

This is what makes the product non-Excel. If this isn't better than Excel, nothing else matters.

**P1 — SHIP NOW**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| 96-well heatmap | Color-coded visual: green/yellow/red | Instant visual that replaces manual scanning |
| Z-factor / Z-prime calculation | HTS assay quality metric | Scientists need this for every screen |
| CV % per well | Coefficient of variation, flags outliers | Standard QC step, currently done manually |
| Mean / SD / SEM by group | Basic stats across replicates | Replaces the most common Excel formula work |
| Pass/fail threshold detection | Flag wells below user-defined cutoff | Direct replacement for manual Excel lookup |

**P2 — Build after 2+ customer requests**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| Dose-response curves | 4PL/3PL curve fitting, IC50/EC50 calculation | Critical for any drug discovery lab |
| Normalization tools | Normalize to positive/negative controls | Required for multi-plate experiments |
| Replicate grouping | Define which wells are replicates, auto-average | Reduces noise, required for good analysis |
| Plate layout editor | Define what's in each well (sample, control, blank) | Needed before analysis can be meaningful |
| Systematic error detection | Detect edge effects, row/column bias | Catches incubator/pipetting problems |
| Cross-plate comparison | Compare same condition across N plates | Required for HTS workflows |

**P3 — Build after product-market fit**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| Western blot image analysis | Upload gel image → AI identifies bands | Adjacent pain, different modality |
| Flow cytometry gating summary | Import FCS exports → visualize populations | Separate tool but same user |
| qPCR delta-delta CT | Auto-calculate gene expression fold change | Standard qPCR analysis, high demand |
| NGS summary dashboard | Import alignment/coverage stats | Bioinformatics adjacent |

---

### AREA 3: AI COPILOT (The Differentiation)

This is the feature that makes the product a category of one. No other lab tool has this.

**P1 — SHIP NOW**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| Plain English Q&A | "Which wells failed and why?" → AI answers using data | Core feature, make this excellent |
| Experiment context memory | Every past run is fed into AI context | The AI should know your lab's history |
| Post-run suggestions | 3 next-experiment ideas based on results | Replaces the 30-min "what do I try next?" conversation |
| Failure explanation | AI explains probable cause of failures | "Row A edge effect" vs "your compound is inactive" |

**P2 — Build after 2+ customer requests**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| Trend detection across runs | "You've had 3 consecutive edge-well failures" | Finds systematic problems humans miss |
| Protocol suggestion | "For this compound, MTT assay worked better in your past data" | Uses your own history against itself |
| Cross-experiment search | "When did we last test compound 14?" → returns run | Replaces Ctrl+F in 50 Excel files |
| AI-generated experiment summary | One paragraph summary of what happened and why | Copy-paste into lab notebook or email to PI |
| Anomaly alerts | "This run's Z-factor is the lowest you've seen in 30 days" | Proactive — doesn't wait to be asked |

**P3 — Build after meaningful usage (50+ experiments/user)**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| Lab-specific fine-tuning | Train on your data → suggestions become lab-specific | THE moat — makes switching cost unbearable |
| AI predicts likely IC50 range | Based on structural analogs in your history | Drug discovery labs will pay for this alone |
| Compound structure correlation | Link assay results to SMILES strings | Medicinal chemistry integration |
| Automated failure root cause | AI proposes ranked list of failure causes with evidence | Replaces a full troubleshooting conversation |

---

### AREA 4: EXPERIMENT MANAGEMENT (The Notebook)

This is the "keep using it every day" layer. Makes the product sticky.

**P1 — SHIP NOW**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| Experiment log | Every run is stored with date, name, results | Replaces the spiral notebook |
| Dashboard — success/fail trend | Visual over time | First thing a PI looks at |
| Side-by-side comparison | Compare two experiments | Already built — make it great |
| Basic search | Find an experiment by name or date | Necessary once they have >10 runs |

**P2 — Build after 2+ customer requests**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| Experiment tagging | Tag by compound, cell line, assay type | Organization as experiments pile up |
| Custom fields | Attach arbitrary metadata to a run | Different labs track different things |
| Plate layout templates | Save a layout and reuse it | Reduces setup time for recurring experiments |
| Experiment duplication | Clone a past run as a starting point | Common workflow: "repeat last week's experiment" |
| Calendar view | See experiments over time on a calendar | PIs love this for capacity planning |

**P3 — Future**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| Full ELN (Electronic Lab Notebook) | Protocols, SOPs, reagent lots, full audit trail | Competes with Benchling — only do if the data is there |
| Inventory tracking | Track reagent expiry, stock levels | Adjacent pain but out of scope now |

---

### AREA 5: REPORTS & OUTPUTS (The Shareable Layer)

Scientists don't work alone. They share results. Make sharing effortless.

**P1 — SHIP NOW**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| Export heatmap as PNG | Download well image for slides/reports | Researchers need this for every presentation |
| Export data as CSV | Download analysis output | Safety valve — they'll always want raw data |

**P2 — Build after 2+ customer requests**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| One-click PDF report | Heatmap + stats + AI summary in one PDF | Replaces the 45-minute PowerPoint assembly | 
| Shareable link | Generate a read-only link to an experiment | PI reviews without needing an account |
| Slide-ready summary | Export 3-slide deck: results, analysis, next steps | Removes PowerPoint prep from the workflow |

**P3 — Future**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| Auto-generated Methods section | AI drafts the methods paragraph from your logged protocol | Replaces copy-pasting from old papers |
| CRO report template | Formatted output per client for CROs | White-label use case |

---

### AREA 6: TEAM & COLLABORATION (The Expansion Layer)

This is how one user becomes a team, and $49/month becomes $249/month.

**P2 — Build when first solo user says "I want my teammate to see this"**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| Workspace invite | Invite a collaborator by email | Single-user ceiling is $50/month. Teams pay more. |
| Shared experiment library | Team sees all runs, not just their own | Prevents duplicate experiments |
| Well-level comments | Leave a comment on a specific well | Replaces "hey check A7 in the spreadsheet" Slack message |
| Role permissions | Admin / Scientist / Viewer roles | Required before selling to PIs |
| Activity feed | See who ran what experiment when | Team awareness layer |

**P3 — After team plan is working**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| Project folders | Group experiments by project | Required for multi-project labs |
| Slack / Teams notification | Notify team when an experiment is analyzed | Fits into existing workflow |
| Guest access | External collaborator (CRO, academic partner) | Opens B2B use case |

---

### AREA 7: PLATFORM & ADMINISTRATION (The Scale Layer)

Only matters after you have paying teams.

**P3 — Do not build until you have 3 paying teams**

| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| SSO / SAML | Enterprise sign-in | Required by any company with >50 employees |
| Audit log | Who did what, when | Required for regulated labs |
| Data export (full) | Complete data portability | Legal requirement in some markets |
| GMP-ready mode | 21 CFR Part 11 compliance features | Opens pharma / late-stage biotech market |
| Multi-site organizations | Different buildings, same account | Enterprise expansion |

---

## MONETIZATION PLAN

### Pricing Tiers (launch simple, expand later)

| Tier | Price | What's included | Target user |
|------|-------|-----------------|-------------|
| Free | $0 | 10 experiments/month, 1 user, basic analysis | Early adopter, validation |
| Solo | $49/month | Unlimited experiments, 1 user, full AI | Solo scientist |
| Lab | $149/month | Unlimited experiments, 5 users, team features | Small lab, post seed |
| Team | $399/month | Unlimited, 20 users, PDF reports, priority support | Series A lab |
| Enterprise | Custom | SSO, audit logs, GMP mode, dedicated support | Pharma / large biotech |

**Launch strategy:** Don't charge for the first 60 days. Get 10 users. Then flip the switch.

### Revenue milestones
- $0 → $1: One person pays. You are a company.
- $1 → $500/MRR: 10 solo users. Proof it's real.
- $500 → $5K/MRR: 2–3 lab plans. Series A labs paying.
- $5K → $50K/MRR: Team plans + expansion. Hire a PM.

---

## PHASE 1 — GET IT LIVE
### Timeline: Day 1–2 (Do this first, nothing else matters until done)

---

### DAY 1 — Deploy the App (4–6 hours)

**HOUR 1: Set up GitHub (30 min)**

1. Go to github.com → sign in or create account
2. Click "New repository" → name it `biolab-copilot` → Private → Create
3. On your computer, unzip the Replit ZIP file to a folder on your Desktop
4. Open terminal (or use Claude Code) in that folder and run:
```
git init
git add .
git commit -m "initial commit from replit"
git remote add origin https://github.com/YOUR_USERNAME/biolab-copilot.git
git push -u origin main
```
5. Verify: refresh GitHub — you should see all your files

**HOUR 2: Swap Gemini API (30 min)**

Your app currently uses either Gemini or Claude. Either way, confirm Gemini is set up:

1. Go to aistudio.google.com → sign in with Google
2. Click "Get API Key" → Create API key → Copy it
3. In your code, find every place that calls an AI API and make sure it points to Gemini
4. Paste this prompt into Claude Code:
```
My app uses an AI API for the chat/suggestions features. 
Replace all AI API calls with Google Gemini 2.0 Flash.
The model string is: gemini-2.0-flash
My API key will be stored as environment variable: GEMINI_API_KEY
Make sure all existing features still work.
```

**HOUR 3: Deploy Backend to Render (1 hour)**

1. Go to render.com → sign in → "New +" → "Web Service"
2. Connect your GitHub account → select `biolab-copilot` repo
3. Settings:
   - Name: `biolab-copilot-api`
   - Environment: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python app.py`
4. Add Environment Variables:
   - `GEMINI_API_KEY` = your Gemini key
   - `DATABASE_URL` = your Neon connection string (get from neon.tech dashboard)
5. Click Deploy → wait 3–5 minutes
6. Copy your Render URL (looks like: `biolab-copilot-api.onrender.com`)

**HOUR 4: Deploy Frontend to Vercel (30 min)**

1. Go to vercel.com → sign in → "Add New Project"
2. Import `biolab-copilot` from GitHub
3. Vercel auto-detects React — click Deploy
4. Add Environment Variable:
   - `REACT_APP_API_URL` = your Render backend URL from above
5. Click Deploy → wait 2 minutes
6. Vercel gives you a live URL like: `biolab-copilot.vercel.app`

**HOUR 5: Set Up Neon Database (30 min)**

1. Go to neon.tech → sign in → Create project → name it `biolab-copilot`
2. Copy the connection string from the dashboard
3. Add it to both Render (already done above) and locally as `DATABASE_URL`
4. Paste this into Claude Code:
```
Set up the PostgreSQL database schema for the app using our Neon database.
Create tables for: experiments, wells, chat_history, suggestions.
Run the migrations and confirm all tables are created.
```

**HOUR 6: Test Everything (1 hour)**

Open your Vercel URL in Chrome and test every feature:
- [ ] Upload a test Excel file (Gen5 format)
- [ ] Heatmap renders with colors
- [ ] Chat responds to "which wells failed?"
- [ ] Suggestions tab shows 3 recommendations
- [ ] Dashboard loads with data
- [ ] Experiment comparison works

If something breaks, paste the error into Claude Code and fix it.

**END OF DAY 1 CHECKPOINT:**
App is live at a public Vercel URL. All 6 features work. You can share the link.

---

### DAY 2 — Polish + Prep for Demo (2–3 hours)

**Morning (1 hour): Fix anything broken from Day 1 testing**

List of things to check:
- Does the heatmap color correctly on real data?
- Does AI chat have context from previous experiments?
- Do suggestions make sense for a plate reader experiment?
- Does the page load in under 3 seconds?

**Afternoon (1 hour): Record the Loom demo**

Go to loom.com (free) and record a 2-minute screen recording.

**Exact script for your Loom:**
```
"Hi — I built an AI lab copilot for biotech labs. 

[Screen: drag Excel file to upload]
You upload your Gen5 plate reader export — just drag and drop.

[Screen: heatmap appears]
Instantly you see which wells failed — red, yellow, green.

[Screen: chat box]
Then you ask it anything in plain English — I'll ask 
"which wells failed and why" — and it answers using 
your actual experiment data.

[Screen: suggestions tab]
It also generates your next 3 experiment suggestions 
based on what failed.

[Screen: dashboard]
And every experiment is stored — so the AI gets 
smarter the more you use it.

I'm looking for 3 biotech scientists to try this for free 
and give me brutal feedback. Link in the description."
```

Save the Loom link. You'll need it tomorrow.

**END OF DAY 2 CHECKPOINT:**
Live URL + 2-minute Loom demo link. Ready to show people.

---

## PHASE 2 — GET CUSTOMERS
### Timeline: Day 3–7 (Most important phase)

**This is the only thing that matters after the app is live.**
No new features. No redesigns. No "just one more thing."
Talk to humans.

---

### DAY 3 — Outreach (2 hours)

**Find 15 targets on LinkedIn:**

Search terms to use:
- "scientist biotech startup" 
- "research scientist seed stage"
- "wet lab scientist early stage"
- "assay development biotech"
- "cell biology startup"

Look for people who:
- Work at companies with 5–30 employees
- Have "scientist" or "researcher" in their title
- Are at Series A or earlier

**DM Template (copy this exactly):**
```
Hi [Name],

I built an AI copilot for biotech labs — it connects to 
plate reader data, auto-detects failed wells, and 
suggests next experiments based on your history.

Here's a 2-minute demo: [LOOM LINK]

I'm looking for 3–5 scientists to try it for free and 
tell me what's wrong with it. No sales pitch.

Would you have 20 minutes this week for brutal feedback?
```

Send this to 15 people. Target: 3 responses.

**Also post this on LinkedIn:**
```
I built something for biotech scientists. 

Problem: You upload your plate reader data to Excel. 
You manually look for failed wells. You write up your 
next experiment from memory.

What I built: Upload your Gen5 export → instant 
96-well heatmap → AI analyzes failures → suggests 
next 3 experiments.

Looking for 5 scientists at early-stage biotechs to 
try it free and tell me if it's useful.

Demo: [LOOM LINK]
DM me if interested.
```

---

### DAY 4 — Follow Up + First Conversations (2–3 hours)

**Check responses from Day 3 outreach.**

For anyone who replied positively, send:
```
Thanks for the interest! 

Here's the live app: [VERCEL URL]

You can try it with any Gen5 Excel export — or I can 
generate test data for you to try with.

Could we do a quick 20-minute call? I want to watch 
you use it and hear what's confusing or missing.

```

**While waiting for calls, do this:**
Post in these communities (free, high biotech density):
- reddit.com/r/labrats — post: "Built an AI tool for plate reader analysis — roasting welcome"
- Biotech LinkedIn groups — search "biotech startup scientists"
- Twitter/X — post the same LinkedIn copy

---

### DAY 5–7 — Run the Calls (1 hour each)

**For each conversation, use this exact script:**

Opening (2 min):
> "I'm not going to pitch you. I want to watch you use this and tell me what's broken."

Share your screen, show them the Vercel URL, and let THEM drive.

Then ask:
1. "What's your current workflow for analyzing plate reader data?"
2. "What do you do when a well fails — what's your process?"
3. "If you had to pay $50/month for this — would you? Why or why not?"
4. "What's the one thing that would make this 10x more useful?"

**After each call, write down:**
- Exact quote about their current workflow
- The specific thing they said was missing
- Whether they'd pay (yes / no / maybe + reason)
- Their biggest complaint

This is more valuable than any feature you could build.

---

## PHASE 3 — BUILD BASED ON FEEDBACK
### Timeline: Day 8+ (Only after 3 customer conversations)

**Do not touch these until you have customer quotes.**

Below is the full feature backlog ranked by likely customer value.
Build ONLY what customers confirmed they want.

---

### BUILD PRIORITY TIERS

**TIER 1 — Build if 2+ customers ask for it**

1. **Dose-response curves + IC50** — Any drug discovery lab needs this. High demand, high differentiation.
2. **Plate layout editor** — Scientists need to define what's in each well. Without this, analysis is incomplete.
3. **One-click PDF report** — Every scientist needs to share results. Removes 45 minutes of PowerPoint work.
4. **qPCR import (CFX / QuantStudio)** — Massive adjacent user base, same workflow pain.
5. **Failure pattern detection** — "Row A consistently fails" — catches systematic errors humans miss.
6. **Cross-experiment search** — Replaces Ctrl+F across 50 Excel files.

**TIER 2 — Build if customers specifically request it**

7. **Team workspace + invite** — When a solo user says "I want my teammate to see this", build this immediately. Unlocks $149/month plans.
8. **Shareable read-only link** — PI reviews without needing an account.
9. **Normalization tools** — Required for multi-plate, multi-condition experiments.
10. **Western blot image analysis** — Upload gel image, AI identifies bands. Adjacent pain, different modality.
11. **Trend detection across runs** — "Your Z-factor has been declining for 3 weeks" — proactive AI, not reactive.
12. **Slide-ready 3-slide export** — Removes PowerPoint prep entirely.

**TIER 3 — Long-term roadmap (Do NOT build now)**

- Lab-specific AI fine-tuning (after 50+ experiments/user)
- qPCR delta-delta CT analysis
- Flow cytometry gating summary
- Full ELN / Benchling integration
- SSO / SAML for enterprise
- GMP-ready mode (21 CFR Part 11)
- Robotic integration / automation triggers
- Multi-site enterprise features
- Drug discovery pipeline integration

---

## DAILY OPERATING RULES

These are non-negotiable while on this break:

1. **No new features before 3 customer conversations.** Every hour of building before that is a guess.

2. **Spend max 20% of time on code, 80% on talking to people.** You are not an engineer right now. You are a salesperson with a working demo.

3. **Write down every piece of feedback verbatim.** Not paraphrased. Exact words. You'll use these to decide what to build.

4. **One instrument, one user type, one problem.** The product is for seed-stage biotech scientists using plate readers. Do not expand scope until this is working.

5. **If co-founder isn't shipping, you are solo.** Plan as if you are 1 person. Anything that requires him to work is not on your critical path.

---

## DECISION GATES

**After Day 2:** Is the app live and does every feature work?
- YES → Move to outreach
- NO → Fix it before doing anything else

**After Day 5:** Have you had at least 1 real customer conversation?
- YES → Write down what they said, assess what to build
- NO → Double down on outreach. Post more, message more people

**After Day 7:** Do you have 3 conversations completed?
- YES → Pick the #1 feature they asked for and build only that
- NO → Something is wrong with the outreach or demo. Change the message.

**After Day 14:** Has anyone said "I would pay for this"?
- YES → Build a Stripe payment page. Charge $49/month.
- NO → The product doesn't solve a real pain yet. Go back to conversations.

**After $500 MRR:** Do you have 10 paying users?
- YES → Hire a part-time contractor to accelerate Tier 1 features
- NO → Price is wrong or ICP is wrong. Interview churned/non-converting users.

---

## METRICS TO TRACK (simple, in a Notes doc)

| Metric | Target by End of Break |
|--------|------------------------|
| LinkedIn DMs sent | 15 |
| Responses received | 3+ |
| Calls completed | 3 |
| People who saw the Loom | 20+ |
| People who tried the live app | 5+ |
| People who said "I'd pay" | 1+ |

---

## RESOURCES

- **Live app:** [your Vercel URL — fill this in after Day 1]
- **Loom demo:** [fill in after Day 2]
- **Gemini API:** aistudio.google.com
- **App code:** github.com/[your username]/biolab-copilot
- **Backend:** render.com dashboard
- **Database:** neon.tech dashboard
- **Frontend host:** vercel.com dashboard

---

## THE ONE RULE

> A working app with zero users is a hobby.
> A broken app with 3 paying customers is a company.
> 
> Your job this break: make it a company.

---
*Next prompt to send your advisor:*
> "Here's what I learned from [X] scientists. They said [specific pain]. They currently do [specific workaround]. They said they would/wouldn't pay because [reason]. What should I build first?"
