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
- Blockers are primary: details and steps live inside blocker cards.
- One primary recommendation at a time in patient detail.
- Additional recommendations stay collapsed under `Other possible actions (N)`.

### Language and copy
- Primary action grammar: `Have agent [verb] [target] [when]`.
- Confirmation CTA: `Confirm and run`.
- Secondary action grammar:
  - `Snooze [what] to [time]`
  - `Dismiss [what] suggestion`
- Never use generic `Approve`/`Dismiss` in primary path.

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
- rank line (plain-English reason)
- single row action: `Open patient plan`

Top controls:
- bucket chips: Delayed, Attention, Pending, On Track
- page-level freshness + refresh
- mini snapshot banner (30–89 min re-entry only)

### S2: Patient detail (`F-01`, `F-02`, `F-04`, `F-05`, `F-06`, `F-18`)
Goal: decide + delegate.

Shows:
- active blockers (collapsed by default)
- blocker due-by + evidence summary + per-item freshness
- nested steps inside blocker only
- insights with confidence labels (`High/Moderate/Low`)
- one recommended action card
- collapsed `Other possible actions (N)`

Action card controls:
- primary: `Have agent ...`
- secondary: snooze/dismiss phrasing
- execution mode selector:
  - `One-time` (default)
  - `Keep monitoring in background`

Background mode preset:
- `Follow up every 12h until response or 72h max`
- guardrails:
  - `Stop after acceptance/decline`
  - `Notify me only on change/failure`

Utility controls:
- `+ Add task`
- `Log external action`

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
- S2 shows one primary action card; others are collapsed.
- Background execution mode is visible and configurable per recommended action.
- Prototype runs non-linearly from any patient at `T0`.
