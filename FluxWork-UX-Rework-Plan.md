# FluxWork — UI/UX Rework Plan

*Product analysis + redesign plan · 2026-07-22 · sources: Notion "Project Scope" + "Build Plan (Sprint Sub-tasks)", full code audit of `src/app` + `src/components`.*

> **TL;DR** — The activation funnel in the scope (signup → first billable entry → first invoice → upgrade) *is* the UX. Today every step of that funnel costs too many decisions: starting a timer takes 3–4 navigations, invoicing asks for setup before showing value, and configuration (clients, rates, templates) interrupts the flow instead of appearing when needed. The rework reduces the system to one mental model — **Track → Review → Invoice** — puts the timer one tap away from everywhere, makes every dollar amount actionable, and moves all configuration to the moment it's actually required. Complexity (rate resolution, snapshots, tax, gating) stays in the machine; the user only ever sees outcomes.

---

## 1 · Product frame

**The user.** A solo US freelancer. Not a project manager, not a team. They open FluxWork because money depends on it, not because they enjoy admin. The scope's non-functional requirements say most usage is on phones. Their tolerance for setup is near zero; their trust requirement for invoices is absolute.

**Jobs to be done, in priority order:**

1. *"Capture my working time without thinking about it."* — daily, dozens of times.
2. *"Know what I've earned and what's still unbilled."* — weekly glance.
3. *"Turn unbilled time into a correct invoice in a minute."* — monthly payoff.
4. *"Trust that a sent invoice never silently changes."* — permanent background contract.

**Why simplicity is a business requirement, not taste.** The scope commits to a 2-month traction window and a pre-committed go/no-go bar. Every extra decision in the first session lowers activation; every extra step before the first invoice lowers conversion. The funnel events already instrumented (`signup`, `activation`, `invoice_generated`, `upgrade`) are the scoreboard for this rework.

**North-star UX metrics:**

| Metric | Definition | Target |
|---|---|---|
| TTFT | signup → first tracked minute | **< 60 seconds** |
| TTFI | signup → first invoice generated (or previewed, on free) | < 1 session |
| Taps-to-timer | app open → timer running (returning user) | **≤ 2 taps** |
| Clicks-to-invoice | Today screen → downloadable invoice | ≤ 3 clicks |

---

## 2 · The operating model — how the user works with the system

Three rhythms, three very different frequencies. The UI must be organized around them — not around database tables.

**Daily loop (~95% of sessions, heavily mobile).** Open app → resume/start timer → work → stop. Occasionally: "I forgot to track — add 2 hours to X." Nothing else. This loop must never require navigation.

**Weekly review (one 5-minute session).** How much did I earn? What share was billable? Is anything ready to invoice? One screen, glanceable, no interaction required.

**Monthly billing (the payoff).** Unbilled amount per client → preview invoice → generate → download/send → mark paid. This is where the product proves its worth and where the paywall lives.

**The mental model taught by the UI: Track → Review → Invoice.** Clients, rates, tax, templates are *not* part of the model the user must hold — they are configuration the system requests **just-in-time**, inline, exactly once, at the moment they first matter (e.g. "Who is this invoice for?" at first invoice, not "Create a client" at signup).

**The system's promise, stated everywhere it can be:** *"If the timer ran, the invoice is right."*

---

## 3 · Current-state audit

### 3.1 What exists (code-verified)

Screens: Overview (`(app)/page.tsx`), Clients + detail, Project detail, Invoices + detail, Billing (subscription), plus login/welcome/reset-password (recently reworked — out of scope here). Persistent `RunningTimerBar` in the app layout; sidebar nav (Overview / Clients / Invoices / Billing + project list); `MobileBar` with a horizontally scrolling nav strip.

### 3.2 Strengths to keep

- **Earnings-first Overview hero** — already matches DG-2 ("earnings hero is focal").
- **Billable / non-billable semantic color pair** used consistently (gold/steel split bars).
- **No-client guard** on billable projects — right instinct, wrong delivery (see F6).
- **Zero-setup first-invoice CTA** with a real empty state on Invoices.
- **Token system** (`globals.css`) — the rework re-skins through tokens, no redesign of primitives needed.
- Server-authoritative timer that survives reload; rate snapshotting; tax math — the "complex functionality" half of the goal is already built and trustworthy.

### 3.3 Friction inventory

| # | Friction | Evidence | Cost |
|---|---|---|---|
| F1 | **Starting a timer takes 3–4 navigations** (Overview → project → find task row → Start). The ever-present timer bar is a *dead display* when idle — "No timer running" with no affordance. | `RunningTimerBar.tsx` idle branch; timers only on task rows in project detail | The single most frequent action in the product is the hardest; kills daily loop + activation |
| F2 | **First run demands the full object chain** — create project → open it → create task → start. No quick-create at the point of tracking. | `ProjectForm` on Overview header; `TaskForm` inside project detail | TTFT measured in minutes, not seconds |
| F3 | **Project detail is overloaded** — daily-use (tasks, timer, entries), rare-use (billing config), and dangerous (archive/delete) share one scroll. | `projects/[id]/page.tsx`: Tasks → Billing → Entries → admin footer | Daily loop pays a comprehension tax for monthly/never actions |
| F4 | **"Unbilled · ready to invoice" is a report, not a button.** The most motivating number in the product deep-links nowhere. | Overview secondary stats panel | Breaks the natural bridge from Review → Invoice |
| F5 | **Invoice generation front-loads decisions** — client + project + *template* pickers before any value is shown; no line-item preview before generating a money document. | `InvoiceGenerateForm` + `TemplateUploadForm` on `invoices/page.tsx` | Trust + conversion leak at the most valuable moment |
| F6 | **Warnings without fixes.** "⚠ No client" badges link to the project page, where the user must find the Billing section and understand the client→rate model. No inline client creation anywhere. | Overview table, project no-client panel | The user is told what's wrong, not handed the fix |
| F7 | **Mobile is a shrunken desktop.** Nav = scrolling strip under a top bar; timer controls not thumb-reachable; scope says mobile-first. | `MobileBar` in `Sidebar.tsx` | The 95%-frequency loop is worst on the most-used device |
| F8 | **Manual time entry is a timestamp form**, not "I worked 2h on X". | `ManualEntryForm` | Corrections (a daily need) feel like data entry |
| F9 | **Vocabulary drift** — "Billing" means the Paddle subscription page in the nav *and* the client/rate panel on a project; "§" glyph as invoice icon; mixed labels. | `SidebarNav`, project detail | Every ambiguous word is a micro-decision |
| F10 | **The free→paid wall is invisible until hit.** Limits (5/5, invoicing paid-only) are enforced server-side but never communicated ahead. | `plan.ts` gating; no plan meters in UI | Walls feel like bugs when they're surprises |

### 3.4 Scope divergences (decide, then enforce)

The code has quietly exceeded the MVP scope. Each divergence taxes every first-run user to serve a power user who doesn't exist yet:

- **D1 — Subtasks are implemented** (`TaskTree`, `parent_id`, "+ Subtask") — scope: *flat tasks only, subtasks = V2*.
- **D2 — Custom template upload is implemented** (`TemplateUploadForm` on the invoices screen) — scope: *built-in default only, uploads = V2*.
- **D3 — Week-over-week delta + sparkline** on Overview — scope deferred trends to V2. *(Harmless, glanceable, keep.)*

**Recommendation:** keep the code, **remove the entry points** for D1 and D2 (feature-flag or hide behind an "Advanced" disclosure). Re-enable post-traction as paid-tier "Advanced" features. Do not delete — the work is done and will be wanted in V2.

---

## 4 · Design principles — the simplicity contract

1. **One primary action per screen.** Everything else is visually quiet.
2. **The timer is the product.** Starting/stopping is one tap from any screen on any device — the timer bar is a *control*, never a status display.
3. **Defaults over decisions.** Anything can be created with just a name. Rates, clients, tax, colors — all defaulted, all editable later, all requested just-in-time.
4. **Show money, not mechanics.** The user sees outcomes ("$1,240 unbilled for Acme"); rate resolution, snapshots, tax math, gating stay under the hood. *This is the "complex functionality, simple communication" goal, operationalized.*
5. **Progressive disclosure.** Advanced surfaces (subtasks, templates, overrides) appear only after the core loop is mastered — or not at all in MVP.
6. **Every warning ships with its fix.** A blocked state always carries the one-tap action that unblocks it.
7. **Nothing feels destructive.** Everything is editable later — except invoices, which are immutable *and proudly say so* ("Rate locked at generation").

---

## 5 · Target information architecture

### Navigation (desktop sidebar / mobile bottom tabs)

```
Today        ← home; timer + today + week hero + actionable unbilled
Projects     ← list grouped by client; project detail lives here
Invoices     ← list + the invoice flow
More/Settings← Clients (management list), Plan (subscription), profile
```

- **Clients is demoted from top-level nav.** It is configuration, not a destination — reachable from More, and *creatable inline* wherever a client is first needed (project billing panel, invoice flow). Unbilled-per-client moves to Today, where it's actionable.
- **"Billing" (Paddle page) renames to "Plan"** — frees the word "billing" to mean client billing only (fixes F9).
- **Mobile:** bottom tab bar (Today · Projects · Invoices · More) with a **center floating Start/Stop button** — thumb-reachable, always present (fixes F7).

### The Start bar (keystone of the rework — fixes F1/F2)

The `RunningTimerBar` becomes a two-state **control**:

- **Idle:** `▶ Start working on…` — tapping opens a **quick-picker**: recent tasks first (one-tap resume), fuzzy search across tasks/projects, and an inline create row ("New task in ⟨project⟩" — typing a name is enough). Desktop: focusable via `Cmd/Ctrl+K`-style shortcut.
- **Running:** current task · project pill, live duration + live earnings (already built), Stop button, tap-to-switch (opens the same picker).

This collapses "create project → open → create task → start" into a single interaction and gives returning users a 1–2 tap daily loop.

---

## 6 · Key flows, redesigned

### Flow 1 — First run (target: timer running < 60s after signup)

1. Land on Today. One card, one input: **"What are you working on?"**
2. User types "Acme homepage" → Start. System silently creates project + task (defaults for everything else). Timer runs.
3. No client, no rate, no tax asked. After ≥1h billable exists, a single quiet nudge appears on Today: *"Set a rate to see what this time is worth → "*.

### Flow 2 — Daily tracking (returning user)

Open app → Start bar shows the last task → tap to resume. Switching tasks = open picker → pick another recent. Stop from anywhere. On mobile all of this is the floating center button.

### Flow 3 — Fix / log time manually

"Add time" quick action (Today + project detail): task picker + one smart field that accepts `2h`, `1:30`, or `9:30–11:00`, date defaults to today. No timestamp form on the primary path (fixes F8).

### Flow 4 — Invoice (the payoff; fixes F4/F5)

- **Entry points:** Today's Unbilled card lists per-client rows — `Acme · $1,240 · [Invoice →]` — and the Invoices tab.
- **Steps:** pick client (only clients *with unbilled time*, sorted by amount, pre-selected when coming from Today) → **preview**: line items, hours, rate, tax, total, period — clearly labeled *"Rates locked as of today"* → **Generate** → success state: `INV-007 ready · Download PDF · Download DOCX · Mark as sent`.
- **Template picker is removed from the primary path** (built-in default used silently — this *is* the scope's zero-setup story).
- **Free plan:** the preview is **fully visible**; the Generate button is the upgrade moment — *"Unlock invoicing — $9/mo"* → Paddle overlay → on success, generation proceeds without losing state. The paywall lands exactly at peak demonstrated value.

### Flow 5 — Just-in-time client setup (fixes F6)

The first time a billable project needs a client (at invoice preview, or via the no-client warning), an **inline mini-form** appears right there: name, email, hourly rate — three fields, no navigation. The warning badge everywhere becomes `⚠ No client · [Add client]` opening this same inline form.

### Flow 6 — Weekly review

The existing week hero stays (earnings, billable split, delta). Add at most one insight line. No interaction required; the screen answers "how am I doing?" in one glance.

---

## 7 · Screen-by-screen rework spec

| Screen | Changes | Priority |
|---|---|---|
| **Start bar + quick-picker** | New component replacing idle `RunningTimerBar` state; recents, search, inline task create; keyboard shortcut; mobile floating button | **P0** |
| **Today** (evolved Overview) | Add: today strip (tracked today + running task) above week hero; **actionable Unbilled card** (per-client rows with Invoice CTA); first-run "What are you working on?" card; trim projects table (split-bar column hidden on mobile) | **P0** |
| **Invoices** | Wizard-lite: client → preview → generate; remove template UI from primary path (hide `TemplateUploadForm` per D2); success state with next actions; keep list + plain-language statuses | **P0** |
| **Mobile shell** | Bottom tab bar + center Start button; timer state sticky; kill scrolling nav strip | **P0** |
| **Project detail** | Reorder into: header stats → Tasks & time (default view) → "Billing & client" as collapsed section/tab → archive/delete into a `⋯` overflow menu; hide "+ Subtask" (D1); inline client mini-form on the no-client warning | **P1** |
| **Clients** | Demote from top nav to More; keep management list; unbilled-per-client duplicated on Today where it's actionable | **P1** |
| **Plan** (renamed Billing) | Plan state, limits as meters ("4 of 5 free projects"), upgrade CTA; same meter surfaces inline on create actions near the limit | **P1** |
| **Auth / landing / emails** | Recently reworked — out of scope | — |

---

## 8 · Communication system

**One word per concept, everywhere** (UI, emails, empty states):

| Concept | Word | Never |
|---|---|---|
| Recording time | Track / Tracked | log, record, entry (in UI copy) |
| Money not yet invoiced | Unbilled | outstanding, ready-to-invoice, pending |
| Client billing setup | Rate, Client | billing (reserved), pricing |
| FluxWork subscription | Plan | billing, membership |
| The document | Invoice | bill, statement |

**Patterns:**

- **Money:** always with currency symbol, always monospace. Durations always `h:mm`.
- **Empty states** = the next step of the loop: one sentence + one button, nothing else. Each screen's empty state teaches Track → Review → Invoice.
- **Warnings:** `[what's blocked] + [one-tap fix]`. *"Can't invoice yet — this project has no client. [Add client]"* — never a bare badge.
- **Success:** state the result + offer the next action. *"Invoice INV-007 ready · Download PDF · Mark as sent."*
- **Trust lines:** invoice preview and detail both show *"Rates locked at generation — later rate changes never affect this invoice."* The strongest engineering guarantee in the product should be visible marketing.
- **Tone:** plain, second person, calm; no exclamation marks. The app is a competent accountant, not a cheerleader.

---

## 9 · Monetization UX

- **Predictable, never surprising** (fixes F10): plan meters in Plan page + inline counters near the limit ("4 of 5 free projects") so the wall is visible before it's hit.
- **The wall never discards work:** the block state shows what paid unlocks, the price, one button (Paddle overlay), and preserves whatever the user was doing.
- **Prime conversion moment:** the invoice-preview gate (Flow 4). Free users see the *exact* invoice they'd get — amount, lines, client — and unlock generation in one overlay. Measure `upgrade` conversions attributed to this surface.

---

## 10 · Roadmap

### Phase 1 — Activation (P0)
Start bar + quick-picker · first-run flow · Today restructure (today strip + actionable Unbilled) · invoice preview flow with paywall placement · mobile bottom nav + floating Start · hide D1/D2 entry points.
**Done when:** TTFT < 60s in a clean-account walkthrough; timer running in ≤2 taps as a returning user; invoice in ≤3 clicks from Today; every funnel transition (track → review → invoice → upgrade) has exactly one obvious CTA.

### Phase 2 — Comprehension (P1)
Project detail split + overflow admin · Clients demotion + inline mini-form everywhere · vocabulary sweep (rename Billing→Plan, unify terms) · plan meters · full empty-state pass.
**Done when:** no screen mixes daily-use with config/destructive actions; a client can be created without ever visiting the Clients page; the word "billing" appears only in client-billing contexts.

### Phase 3 — Post-traction (V2, only if the go/no-go passes)
Re-enable subtasks + custom templates as paid "Advanced" features · weekly email digest · richer review/reports.

*Each phase ends with a funnel measurement against the existing `analytics_events` and a re-run of the core-flow smoke tests.*

---

## 11 · Measurement plan

- **Funnel (already instrumented):** signup → activation rate, activation → invoice_generated rate, invoice → upgrade rate. Compare 2 weeks pre/post Phase 1.
- **One new event property:** `timer_started` with a `source` (`start_bar` | `task_row` | `first_run`) — one-line change, proves whether the Start bar wins.
- **Qualitative:** three first-run hallway tests (target: subject reaches a running timer unprompted in <60s).

---

*Execution note: all visual work continues to flow through the existing token system in `globals.css` — this plan changes structure, flows, and copy, not the design language.*
