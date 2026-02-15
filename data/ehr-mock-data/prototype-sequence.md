# Prototype Sequence Runbook (v3, Modular, Non-Linear)

## Objective
Validate three things in live demos:
- CM usability and trust
- Exec-level operational clarity
- Internal build direction

## Audience lenses
- CM: Is this faster, clearer, and controllable?
- Hospital exec: Does this reduce avoidable delay and noisy work?
- Internal team: What is in scope next and what remains uncertain?

## Usage rules
- Modules are independent; reorder freely.
- Start state for all patients is `T0`.
- Open any patient first.
- Return to worklist after each module.

## Canonical start state
- `PT-01 @ T0`
- `PT-02 @ T0`
- `PT-03 @ T0`
- `PT-04 @ T0`

## Default 10-minute routes
- CM-first: `M1 -> M3 -> M5 -> M2 -> M4 -> M6`
- Exec-first: `M1 -> M2 -> M4 -> M6 -> Ranking recap`
- Internal-first: `M2 -> M3 -> M4 -> M5 -> M1 -> M6`

## Module catalog

## M1 Trust + Orientation
- Goal: show ranking, blockers, and evidence provenance are understandable.
- Primary: `PT-02 @ T0`
- Click path:
1. Open Worklist.
2. Open `PT-02`.
3. Read blocker labels + rank reason.
4. Open Patient Detail.
5. Open `View evidence` for one blocker.
- Success signal: reviewer can explain why this patient is prioritized and where the recommendation came from.

## M2 Urgent Action Delegation
- Goal: show CM delegates and agent executes.
- Primary: `PT-02 @ T0 -> T1` via `A-0201`
- Click path:
1. Open auth blocker.
2. Click `Have agent call BCBS now`.
3. Confirm modal: `Confirm and run`.
4. Show state update and action log.
- Success signal: clear delegation boundary with explicit execution.

## M3 Prerequisite Inside Blocker
- Goal: show packet prep/tracking inside blocker, not top-level noise.
- Primary: `PT-02 @ T1`
- Click path:
1. Expand placement blocker.
2. Review nested steps (`NS-0201..NS-0204`).
3. Trigger `Have agent send to 4 facilities`.
4. Open tracking state.
- Success signal: reviewer sees prerequisite -> execution -> tracking flow in one blocker context.

## M4 Failure Recovery + Channel Switch
- Goal: show no silent failure and clear next step.
- Primary: `PT-01 @ T0 -> T1` via `A-0102`
- Click path:
1. Open placement blocker.
2. Show failure state.
3. Click `Have agent resend to Maplewood via email`.
4. Confirm and show updated tracking.
- Success signal: failure becomes visible and recoverable in one step.

## M5 Controlled Restraint + Background Mode
- Goal: prove system supports defer/dismiss plus background loop controls.
- Primary: `PT-03 @ T0 -> T2`
- Click path:
1. Open `PT-03`.
2. Use snooze/dismiss secondary actions.
3. Set one recommendation to `Keep monitoring in background`.
4. Show policy: every 12h up to 72h, notify on change/failure.
5. Demonstrate pause option from failure/review context.
- Success signal: CM sees control without needing to micromanage every follow-up.

## M6 No-Op Control
- Goal: show system restraint and anti-alert-fatigue behavior.
- Primary: `PT-04 @ T0`
- Click path:
1. Open `PT-04`.
2. Show resolved blocker and no recommended action.
3. Return to queue.
- Success signal: reviewer sees that no unnecessary action is surfaced.

## Time packs

### 8-minute pack
- Sequence: `M1 -> M2 -> M4 -> M6`
- Target: 7:30 (hard cap 8:30)

### 10-minute pack
- Use one default route above.
- One audience-driven branch allowed.
- Target: 9:30 (hard cap 10:30)

### 15-minute pack
- Run all modules + one alternate branch replay.
- Include ranking and handoff recap.
- Target: 14:30 (hard cap 15:30)

## Branch map
| If asked... | Jump to module |
|---|---|
| How does it fail? | M4 |
| What if not ready yet? | M5 |
| How do we avoid alert fatigue? | M6 |
| Why trust this recommendation? | M1 |
| What does CM actually do vs agent? | M2 |

## Ranking explanation (prototype)
- Ranking is manual: `rank_position` + `rank_reasons`.
- No algorithmic score in this phase.
- Criteria order: blocker -> time pressure -> LOS risk.

## Presenter guardrails
### Do
- Use delegation language (`Have agent ...`).
- Keep worklist low-click (`Open patient plan`).
- Use evidence drawer when trust questions arise.
- Emphasize non-linear usage.

### Don’t
- Don’t imply backend automation is live.
- Don’t imply numeric scoring exists.
- Don’t force one patient order.
- Don’t read source snippets in UI (use metadata only).

## Fallback data pointers

### M1
- `pt-02-at-risk.json`
- `.worklist_view_state.rank_position`
- `.blockers.items[] | select(.blocker_id=="B-0202").evidence_summary`
- `.evidence_items.items[]`

### M2
- `pt-02-at-risk.json`
- `.proposed_actions.items[] | select(.action_id=="A-0201")`
- `.demo_state_snapshots[] | select(.state_id=="T1")`

### M3
- `pt-02-at-risk.json`
- `.blockers.items[] | select(.blocker_id=="B-0202").nested_steps`
- `.proposed_actions.items[] | select(.action_id=="A-0202")`

### M4
- `pt-01-delayed.json`
- `.proposed_actions.items[] | select(.action_id=="A-0102")`
- `.execution_log.entries[] | select(.related_action_id=="A-0102")`

### M5
- `pt-03-pending.json`
- `.proposed_actions.items[] | select(.action_id=="A-0301" or .action_id=="A-0302" or .action_id=="A-0303")`
- `.proposed_actions.items[].background_policy`

### M6
- `pt-04-on-track.json`
- `.proposed_actions.items`
- `.blockers.items[] | select(.blocker_id=="B-0401")`

## Validation checklist
- Every primary CTA begins with `Have agent`.
- Evidence drawer metadata exists for blockers and recommendations.
- Source snippets are not required for UI flow.
- Background mode can be enabled and paused.
- Modules run in at least two different non-linear orders.
