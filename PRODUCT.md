# TEMPO — Product & Design Context

## What it is
A time-tracking tool: **Project → Task → Subtask → Time entry**. Freelancers/studios track
billable-style time with live timers, manual entries, and per-project roll-ups. Harvest-like.

## Register
**Product** (design serves the task). The tool should disappear into the work. Bar = earned
familiarity: a user fluent in Linear / JIRA / Harvest should sit down and immediately know how
to navigate, create a project, add tasks, and track time — no puzzle-solving.

## Users & scene
Solo consultant or small studio, at a desk, tracking time across a handful of active projects.
They live in this app several times a day; speed of orientation and low friction matter more
than delight. Dark, low-glare canvas suits long working sessions.

## Design system
- **Theme:** dark canvas. Content surface `--paper` (#0b0b0c), panel/sidebar surface `--paper-2`
  (a step lighter) as the second neutral layer for nav/toolbars. Hairline `--line` borders.
- **Accent:** single signal vermilion `--accent` (#ff5023) — primary actions, current selection,
  and the running-timer state ONLY. Never decorative.
- **Type:** Geist Sans carries all UI (nav, buttons, labels, task names, headings). Geist Mono is
  reserved for **data**: timers, durations, KPI numbers, project codes. Fixed rem scale (not fluid).
  Sentence-case buttons and labels — no all-caps tracked eyebrows on every section.
- **Navigation:** persistent left sidebar (Overview, Projects, project list) + breadcrumbs. This is
  the primary fix for the current "hard to understand how to use it" problem.
- **Components:** consistent vocabulary — one `.btn` shape with default/hover/focus/active/disabled;
  labeled actions ("Start", "+ Subtask", "Delete") over cryptic icons. Empty states teach the flow.
- **Motion:** 150–250ms, conveys state only (timer pulse, hover, selection). Respect reduced-motion.

## Non-goals
No charts / analytics dashboards. No completion or billability toggles on tasks (removed). Keep it
lean: navigation clarity and labeled affordances over feature density.
