# CM Prototype UI Spec (v3)

Last updated: 2026-02-15
Purpose: canonical UI behavior for the current mock prototype.
Precedence: if this document conflicts with older roadmap/sprint/planning docs, this document wins for prototype implementation.

## 1) What this prototype is
- Clickable, deterministic prototype.
- Uses pre-baked mock EHR data and state transitions (`T0`, `T1`, `T2`).
- Tests flow credibility and feature value, not backend integrations.

## 2) Global rules

### Re-entry behavior
- `>= 90 min away`: open `S0` shift-start snapshot.
- `30–89 min away`: open `S1` with mini snapshot banner.
- `< 30 min away`: open `S1` directly.

### Interaction model
- Worklist is triage-only: row action is only `Open patient plan`.
- Blockers are the single source of truth for rationale and evidence.
- Patient detail is timeline-first:
  - patient identity
  - patient milestone journey
  - compact active blockers
- Blocker actions and automation are managed inside `Blocker Workspace` modal.
- `State view` control is internal-only (inside demo tools), not visible in patient UI.
- `PT-##` identifiers are not rendered in user-facing UI.

### Language and copy
- Primary action grammar: `Have agent [verb] [target] [when]`.
- Confirmation CTA: `Confirm and run`.
- Secondary action grammar:
  - `Snooze [what] to [time]`
  - `Dismiss [what] suggestion`
- Never use generic `Approve`/`Dismiss` in primary path.

### Chip language system
- Parent chips describe the blocker category (for example: `Auth Pending`, `Placement Needed`).
- Subchips always use typed labels: `Requirement:`, `Dependency:`, `Deadline:`, `Status:`, `Failure:`, `Task:`, `Risk:`, `Owner:`, `Note:`.
- S0 and S1 share the same chip wording and grouping logic.
- S0 uses subchip preview (`1 visible +N more`) with inline expansion; expanded tags keep equal visual weight.
- No orphan subchips: every subchip nests under a parent blocker chip.

### Provenance model
- No backend codes rendered in UI.
- No source snippets in default UI.
- Show compact provenance metadata:
  - `Evidence: N sources`
  - `Last updated: [time]`
  - `View evidence`
- `View evidence` opens a drawer with source metadata only.

### Freshness model
- `S0`, `S1`: page-level freshness.
- `S2`: per-item freshness on blockers and insights.

### Ranking model
- Manual ranking only: `rank_position` + `rank_reasons`.
- No numeric scoring in the prototype.
- Queue ordering: Delayed -> Attention -> Pending -> On Track.

## 3) Feature scope (prototype)
- `F-00` Shift-start snapshot
- `F-01` Worklist + blocker chips
- `F-02` Auth risk flags
- `F-03` Shared state handoff
- `F-04` Task capture
- `F-05` Agent-executed auth follow-up
- `F-06` Referral packet/send/tracking loop
- `F-18` Action control model

Out of scope:
- Live ADT/EHR/fax/payer integrations
- Production reliability/compliance infrastructure

## 4) Screens

### S0: Shift-start snapshot (`F-00`)
Goal: orient in under 10 seconds.

Shows:
- Overnight changes
- Due today
- Needs review
- Page-level `As of [time]`
- same blocker chips/subchips as S1
- compact legend: `Subchips show Requirement, Dependency, Deadline, Status, Failure, and Task details.`

Buttons:
- `Go to worklist`
- `Review flagged (N)` (only when flagged items exist)

Hard caps:
- max 3 cards
- max 3 rows per card

### S1: Worklist (`F-01`, `F-02`, `F-03`, `F-04`)
Goal: triage only.

Per row:
- identity + status label
- human-readable blocker labels
- typed subchips with explicit prefixes
- compact legend matches S0
- rank line (plain-English reason)
- single row action: `Open patient plan`

Top controls:
- bucket chips: Delayed, Attention, Pending, On Track
- page-level freshness + refresh
- mini snapshot banner (30–89 min re-entry only)

### S2: Patient detail (`F-01`, `F-02`, `F-04`, `F-05`, `F-06`, `F-18`)
Goal: decide + delegate.

Information order:
1. patient identity strip
2. Patient milestone journey (collapsed, at top)
3. active blockers (compact cards)

Shows:
- active blockers only in primary patient panel
- blocker title, summary, due/urgency, evidence count, last updated
- CTA per blocker: `Open blocker workspace`
- no standalone `What the agent found` section
- no standalone `Recommended action` section
- no Quick Action Center
- no top-level Automation Command Center

Utility controls:
- `+ Add blocker` (local-only prototype draft)
- `+ Add blocker task` (local blocker-scoped tasks)

Patient milestone journey:
- collapsed section directly below identity strip
- vertical line progression from admission (top) to discharge (bottom)
- hybrid density:
  - always show core scaffold milestones
  - show conditional milestone markers only when blocker-linked or recently changed
- node click opens compact detail drawer (why/current state/last updated/evidence/linked blocker)
- detail drawer is always visible and shows skeleton placeholder before selection
- discharge endpoint always visible in muted style until reached
- sequence sanity rule: no complete milestone renders after first active blocker marker

Blocker Workspace modal:
- full blocker details/actions/automation for one blocker at a time
- sections:
  - why this blocker matters
  - evidence metadata drawer
  - progress steps
  - decisions and actions
  - automation for this blocker
  - activity log

Automation location:
- automation setup/monitoring appears only inside Blocker Workspace modal

### S3: Confirm modal (`F-05`, `F-06`, `F-18`)
Goal: explicit handoff boundary.

Shows:
- what action runs
- why now
- who/what is contacted
- permission microcopy
- if background mode: continuation summary

Buttons:
- `Confirm and run`
- `Cancel`

### S4: Referral package + tracking (`F-06`)
Goal: packet quality + response tracking.

Package view:
- required-field guardrails
- editable fields for corrections
- send to selected facilities

Tracking view:
- per-target status timeline
- retry/channel-switch actions
- if background enabled: badge on no-response rows
  - `Auto follow-up: enabled (12h cadence, 72h max)`

### S5: Failure recovery (`F-06`)
Goal: no silent failure.

Shows:
- specific failure reason
- recommended recovery action

Buttons:
- context-specific `Have agent ...` recovery action
- `Pause background loop` (only if active)
- `Dismiss for now`

### S6: Handoff continuity (`F-03`)
Not separate UI; this is `S1 + S2` for next CM.

Handoff metadata banner:
- `Background runs since last shift: N`
- `Changes requiring review: N`

## 5) Data contract used by UI
From `../data/ehr-mock-data/schema-v1.json`:
- `worklist_view_state.rank_position`
- `worklist_view_state.rank_reasons`
- `blockers.items[]`
- `blockers.items[].evidence_summary`
- `blockers.items[].nested_steps[]`
- `encounter_timeline.events[]`
- `milestones.items[]`
- `evidence_items.items[]`
- `parsed_insights.items[]` (snippets retained for compatibility; do not render)
- `proposed_actions.items[]` including:
  - `cta_primary`
  - `cta_secondary`
  - `execution_mode_default`
  - `background_policy`
  - `permission_microcopy`
- `demo_state_snapshots[]`

## 6) Acceptance criteria
- Worklist row action is only `Open patient plan`.
- Every primary action CTA starts with `Have agent`.
- Confirm modal primary button is `Confirm and run`.
- Each active blocker shows `Evidence: N sources` + `View evidence`.
- Source snippets are not rendered in default UI.
- S2 has no Quick Action Center.
- S2 has no top-level Automation Command Center.
- Milestone journey appears as collapsed section with admission-to-discharge vertical line.
- Milestone journey has no color-legend text explainer.
- Milestone journey detail drawer is always visible with empty-state skeleton.
- Milestone journey node click opens drawer and can focus linked blocker.
- Blocker cards are compact and open Blocker Workspace modal for deep details/actions.
- Blocker automation controls are visible only inside Blocker Workspace modal.
- `State view` appears only in internal demo tools.
- `PT-##` is not rendered in user-facing screens.
- Prototype runs non-linearly from any patient at `T0`.
