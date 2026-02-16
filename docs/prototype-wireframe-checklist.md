# Prototype Wireframe Checklist (v3)

Last updated: 2026-02-15
Purpose: implementation checklist for the blocker-centric, trust-centered, background-capable prototype.
Precedence: use this checklist with `./cm-prototype-simple-ui-spec.md` as the implementation source of truth.

## 1) Canonical rules
- Worklist is triage-only; per-row action is only `Select patient`.
- Primary CTA uses `Have agent ...` grammar.
- Blockers are primary UI object and own rationale/evidence context.
- S2 execution model is blocker-workspace based (no global patient action bar).
- Ranking uses `rank_position` + `rank_reasons` only.
- Render no backend codes in user-facing UI.
- Do not render source snippets in default UI.
- Do not render `PT-##` in user-facing UI.
- Keep `State view` in internal demo tools only.
- Parent chips and subchips must use the same language model in S0 and S1.
- Subchips must be plain-language, standalone facts (no typed prefixes).

## 2) Screen inventory
- `S0` Shift-start snapshot
- `S1` Worklist
- `S2` Patient detail
- `S3` Confirm modal
- `S4` Referral package + tracking
- `S5` Failure recovery modal
- `S6` Handoff continuity banner (S1/S2 variant)

## 3) Screen-level checklist

### S0 Shift-start snapshot
- [ ] Max 3 cards; max 3 rows/card
- [ ] Overnight + Due today + Needs review cards
- [ ] Page-level freshness (`As of [time]`)
- [ ] Buttons: `Go to worklist`, conditional `Review flagged (N)`
- [ ] Empty state: `All quiet` + single CTA
- [ ] Uses same parent chips and subchips as S1
- [ ] Per parent chip: show first subchip + inline `+N more` expansion
- [ ] Expanded subchips keep same visual weight (no inset mini-card)
- [ ] Legend text present for chip semantics

### S1 Worklist
- [ ] Re-entry behavior wired (`>=90`, `30–89`, `<30` min)
- [ ] Status chips: Delayed, Attention, Pending, On Track
- [ ] Queue ordering: Delayed -> Attention -> Pending -> On Track
- [ ] Per-row identity shows `Name · AgeSex · Bed`
- [ ] Per-row context shows MRN + primary diagnosis (single-line truncation)
- [ ] Each row has 3 tabs: `Blockers`, `Timeline`, `Active agents`
- [ ] Default active tab is `Blockers`
- [ ] Tab region is read-only (no run/start/pause controls)
- [ ] LOS line shows actual/expected/delta with fallback when expected is missing (inside `Blockers`)
- [ ] Primary row button: `Select patient`
- [ ] No row-level approve/dismiss buttons
- [ ] No top utility action bar (`Open selected patient plan`, `Clear selection`, timestamp strip)
- [ ] Parent chips are compact content-width pills (not stretched)
- [ ] Subchips render plain-language facts and deterministic order
- [ ] Max 2 parent chips default, with inline `+N more` expansion
- [ ] Max 2 subchips per parent default, with inline `+N more` expansion
- [ ] `Blockers` tab has context rail (disposition, payer/auth class, last update)
- [ ] `Timeline` tab shows latest 6 by default + inline `Show all timeline events`
- [ ] Major milestones/decisions are emphasized in `Timeline` tab
- [ ] `Active agents` tab shows read-only mode/state/last/next/failure
- [ ] On Track cards show positive confirmations only (no long negative lists)

### S2 Patient detail
- [ ] Patient header shows only name, MRN, location, payer, close X
- [ ] Patient milestone journey is the first section below identity
- [ ] Active blocker cards are compact in primary view
- [ ] No standalone `What the agent found` section
- [ ] No standalone `Recommended action` section
- [ ] No Quick Action Center in patient panel
- [ ] No top-level Automation Command Center in patient panel
- [ ] Blocker card CTA is `Open blocker workspace`
- [ ] `+ Add blocker` available at active blockers header (local state only)
- [ ] `+ Add blocker task` available within blocker cards
- [ ] Milestone journey is collapsed by default
- [ ] Milestone journey uses vertical progression (Admission top -> Discharge bottom)
- [ ] Core scaffold milestones always visible
- [ ] Conditional milestone markers only visible when blocker-linked or recently changed
- [ ] No complete milestone appears after first active blocker marker
- [ ] No color-legend explainer text appears in milestone section
- [ ] Milestone detail area is always visible with empty-state skeleton before selection
- [ ] Node click opens detail drawer with evidence metadata
- [ ] Drawer supports `Focus blocker` action for linked blockers
- [ ] Blocker workspace modal includes evidence, steps, decisions/actions, automation, activity log
- [ ] Automation controls are blocker-scoped (inside blocker workspace only)

### S3 Confirm modal
- [ ] Action, reason, target, microcopy shown
- [ ] Primary button: `Confirm and run`
- [ ] Secondary button: `Cancel`
- [ ] Background-mode summary shown when enabled

### S4 Referral package + tracking
- [ ] Required-field guardrails before send
- [ ] Editable packet fields
- [ ] Per-target tracking statuses
- [ ] Retry/channel-switch controls on actionable rows
- [ ] Background loop badge on no-response rows when enabled

### S5 Failure recovery
- [ ] Specific failure reason rendered
- [ ] Recommended recovery action rendered
- [ ] Recovery CTA uses `Have agent ...`
- [ ] `Pause background loop` shown only if loop active
- [ ] `Dismiss for now` available

### S6 Handoff continuity
- [ ] Handoff banner shows background runs count
- [ ] Handoff banner shows changes requiring review count
- [ ] Incoming CM sees same blockers/actions/tasks

### Internal demo tools
- [ ] `State view` selector is present only in internal demo tools
- [ ] Internal demo tools are collapsed by default

## 4) Button inventory
- [ ] `Go to worklist`
- [ ] `Review flagged (N)`
- [ ] `Select patient`
- [ ] `Open blocker workspace`
- [ ] `Have agent [verb] [target] [when]`
- [ ] `Snooze [what] to [time]`
- [ ] `Dismiss [what] suggestion`
- [ ] `Confirm and run`
- [ ] `Cancel`
- [ ] `Pause background loop`
- [ ] `Dismiss for now`

## 5) Data-binding checklist
- [ ] `worklist_view_state.rank_position`
- [ ] `worklist_view_state.rank_reasons`
- [ ] `blockers.items[].evidence_summary`
- [ ] `encounter_timeline.events[]`
- [ ] `milestones.items[]`
- [ ] `evidence_items.items[]`
- [ ] `parsed_insights.items[].confidence_label`
- [ ] `proposed_actions.items[].execution_mode_default`
- [ ] `proposed_actions.items[].background_policy`
- [ ] `demo_state_snapshots[]`

## 6) Demo module coverage checklist
- [ ] M1 Trust + orientation
- [ ] M2 Urgent action permission
- [ ] M3 Prerequisite inside blocker
- [ ] M4 Failure recovery + channel switch
- [ ] M5 Controlled restraint
- [ ] M6 No-op control

Reference: `../data/ehr-mock-data/prototype-sequence.md`

## 7) Exit criteria
- [ ] All 6 modules run in non-linear order.
- [ ] Every primary action begins with `Have agent`.
- [ ] Evidence drawer works for blockers and recommendations.
- [ ] Background mode can be enabled and paused.
- [ ] Background controls appear only in blocker workspace modal.
- [ ] No backend codes shown in user-facing UI.
