# Prototype Wireframe Checklist (v3)

Last updated: 2026-02-15
Purpose: implementation checklist for the blocker-centric, trust-centered, background-capable prototype.
Precedence: use this checklist with `./cm-prototype-simple-ui-spec.md` as the implementation source of truth.

## 1) Canonical rules
- Worklist is triage-only; per-row action is only `Open patient plan`.
- Primary CTA uses `Have agent ...` grammar.
- Blockers are primary UI object and own rationale/evidence context.
- S2 execution model is `local selects, top runs`.
- Ranking uses `rank_position` + `rank_reasons` only.
- Render no backend codes in user-facing UI.
- Do not render source snippets in default UI.
- Do not render `PT-##` in user-facing UI.
- Keep `State view` in internal demo tools only.
- Parent chips and subchips must use the same language model in S0 and S1.
- Subchips must be typed (`Requirement:`, `Dependency:`, `Deadline:`, `Status:`, `Failure:`, `Task:`, `Risk:`, `Owner:`, `Note:`).

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
- [ ] Per-row identity + blocker labels + rank reason line
- [ ] Primary row button: `Open patient plan`
- [ ] No row-level approve/dismiss buttons
- [ ] Page-level freshness + refresh control
- [ ] Subchips render typed prefixes and deterministic order
- [ ] Legend text matches S0

### S2 Patient detail
- [ ] Active blockers collapsed by default
- [ ] Blocker card shows due-by + per-item freshness
- [ ] Collapsed blocker summary labels use typed chip language where applicable
- [ ] Blocker shows `Evidence: N sources` + `View evidence`
- [ ] Evidence drawer lists source metadata (not snippets)
- [ ] Nested steps shown only inside blocker detail
- [ ] Blocker-local rationale appears under `Why this blocker matters`
- [ ] No standalone `What the agent found` section
- [ ] No standalone `Recommended action` section
- [ ] Quick Action Center is sticky and always visible
- [ ] Blocker-local CTA is `Select action for Quick Action Center`
- [ ] Only Quick Action Center executes (`Have agent ...`)
- [ ] Execution mode controls visible (`One-time` / `Keep monitoring in background`)
- [ ] `+ Add blocker` available at active blockers header (local state only)
- [ ] `+ Add blocker task` available within blocker cards
- [ ] Resolved blockers are collapsed by default
- [ ] Automation Command Center renders mode/status/last-run/next-run + start/pause/resume
- [ ] Full patient journey panel exists and is collapsed by default

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
- [ ] `Open patient plan`
- [ ] `Select action for Quick Action Center`
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
- [ ] No backend codes shown in user-facing UI.
