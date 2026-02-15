# CM Prototype Phase 0 Spec (v2)

Last updated: 2026-02-13
Owner: Johannes + CTO
Status: Draft for CTO review

## 1. Product Thesis

Case managers are currently the human router across fragmented systems (EHR, phone, fax, pager, portal).  
flowOS should shift CM work from manual status-chasing to agent-supervision: the agent proposes and executes operational actions, and the CM approves or dismisses in context.

Positioning rationale (concise):
- Hospital operations behave like a dependency graph; isolated task automation misses system bottlenecks.
- This wedge improves system efficiency first (handoffs, sequencing, wait states), which is the software foundation for future physical-layer autonomy.
- CM discharge is a practical entry point: high measurable pain, lower regulatory load than clinical decision domains, lower capital requirement than hardware-first approaches, and relatively lower competitive density in agent-executed workflow.

Natural expansion path from this wedge:
- bed flow orchestration
- patient transport coordination
- room turnover orchestration
- time-critical delivery workflows

## 2. Methodology Note

This spec is derived from the CM prototype journey map (`J-00` to `J-18`) and supporting product docs (`flowOS-user-flow`, JTBD map, roadmap, engineering tasks).

Add for credibility before external sharing:
- Number of CMs observed/interviewed: `TBD`
- Setting(s): `TBD` (unit type, hospital context)
- Data collection mode: `TBD` (shadowing, interview, workflow replay, pilot logs)

Prototype mode (explicit for this phase):
- this phase uses a clickable mockup to validate flow accuracy and feature usefulness
- actions are simulated in UI (for example, approve marks action complete in prototype)
- no backend integration assumptions for this cycle (Epic/ADT/channel execution can be mocked)
- this phase does not claim production reliability, security hardening, or end-to-end delivery guarantees

## 3. Phase Goal and Scope Boundary

Primary success in this phase:
- validate flow accuracy
- validate pain truth (frequency + materiality)
- validate candidate response usefulness
- capture initial value quantification signals

Scope boundary:
- this phase tests real pain points and theoretical solution direction
- detailed product hypothesis testing is intentionally deferred to the next phase
- technical feasibility deep dive, complexity tradeoffs, sequencing, and full resource planning are finalized after validation results

## 4. Prioritization Framework

Each feature is scored using these criteria:
- Pain severity and frequency (from journey map)
- Validation value for flow/pain/response/value testing
- Technical feasibility risk (initial screen only in this phase)
- Build complexity, sequencing, and resource fit (finalized after validation pass)

Decision buckets:
- `Must Build`: required to test the thesis
- `Should Build`: valuable stretch if timeline allows
- `Deferred`: intentionally out of Phase 0

## 5. Must-Build Scope (Prototype)

### 5.1 Scope Summary

| Feature | Why it is in Core |
|---|---|
| `F-00` Shift-start snapshot | Enables immediate orientation and daily open behavior |
| `F-01` Ranked worklist + status/barrier chips | Establishes primary operating surface |
| `F-02` Auth risk flags + prompts | Directly addresses high-cost delay pattern |
| `F-03` Shared worklist continuity | Prevents handoff context loss and person-dependent state |
| `F-04` Task capture to agent ownership | Critical test of CM-to-agent delegation |
| `F-05` One-tap agent auth follow-up | Core approve/execute loop behavior |
| `F-06` Parallel referral send + tracking | Demonstrates operational compression vs manual serial work |
| `F-14` Worklist as handoff record (expansion) | Extends continuity coverage after `F-03` foundation |

### 5.2 Mini-Specs (Core Features)

#### F-00
- What it does: shows overnight deltas and top priorities at app open
- Tags: `E01 E02 E06 / T01 T10`
- Dependencies: `E00`, `E05`, baseline `E01`
- Key metric: time to first prioritized action
- Target: `< 5 min`
- Acceptance criteria:
  - summary strip visible within 2 sec of app open
  - overnight deltas reflected in worklist state
- Edge cases:
  - no overnight events
  - conflicting overnight updates from manual inputs

#### F-01
- What it does: urgency-ranked worklist with status and barrier chips
- Tags: `E01 E04 / T05 T10`
- Dependencies: `E05`, `E06`, `E04`
- Key metric: time to identify top 5 priorities
- Target: `< 60 sec`
- Acceptance criteria:
  - sorted list visible within 5 sec
  - top priorities identifiable without opening patient detail views
- Edge cases:
  - equal priority scores
  - missing barrier data

#### F-02
- What it does: detects auth risk windows and proposes follow-up
- Tags: `E06 E04 E03 / T04 T06 T07`
- Dependencies: `E05`, `E06`, `E03`
- Key metric: missed auth windows
- Target: `0 critical misses`
- Acceptance criteria:
  - high-risk auths surfaced >=24h before deadline
  - approval banner available from patient context
- Edge cases:
  - incomplete payer info
  - conflicting auth statuses from different sources

#### F-03
- What it does: keeps a persistent shared worklist as the handoff source of truth
- Tags: `E01 E02 E05 / T01 T02`
- Dependencies: `E01`, `E02`, `E05`
- Key metric: post-handoff context reconstruction time
- Target: incoming CM resumes without rebuilding context
- Acceptance criteria:
  - outgoing and incoming CMs see the same patient state and recent actions
  - handoff does not require reconstructing status from memory/paper
- Edge cases:
  - concurrent updates near handoff time
  - partial state updates across patients

#### F-04
- What it does: captures CM task and transitions ownership to agent
- Tags: `E09 E06 E03 / T19a`
- Dependencies: `E05`, `E06`, `E03`
- Key metric: task creation-to-first-agent-action latency
- Target: first proposed action `< 5 min`
- Acceptance criteria:
  - task capture `< 30 sec`
  - task appears in workstream within 1 sec
- Edge cases:
  - ambiguous task input
  - task conflicts with current planned actions

#### F-05
- What it does: one-tap approval for auth follow-up execution
- Tags: `E03 E07 / T07 T09`
- Dependencies: `E03`, `E07`, `E06`
- Key metric: approval rate and approve-to-send latency
- Target: approval flow confirmation `< 1 sec`
- Acceptance criteria:
  - banner shows action/channel/recipient clearly
  - one-tap approve with immediate confirmation feedback
- Edge cases:
  - send failure after approve
  - duplicate approve action attempts

#### F-06
- What it does: sends referrals in parallel and tracks state
- Tags: `E07 E03 E02 / T03 T07`
- Dependencies: `E07`, `E03`, `E02`
- Key metric: manual follow-up burden for referral confirmation
- Target: one approval triggers multi-target outreach
- Acceptance criteria:
  - per-target status visible (`sent`, `delivered`, `response`)
  - no separate confirmation calls needed for basic delivery verification
- Edge cases:
  - partial delivery success across targets
  - delayed or missing delivery receipts

#### F-14
- What it does: uses worklist as handoff source of truth
- Tags: `E01 E02 E05 / T01 T02`
- Dependencies: `E01`, `E02`, `E05`
- Key metric: post-handoff clarification loops
- Target: measurable reduction in clarification rework
- Acceptance criteria:
  - incoming CM resumes from single view without rebuilding context across systems
- Edge cases:
  - concurrent updates during handoff
  - mixed data freshness across patients

## 6. Deferred Scope (with Rationale)

| Feature | Defer reason |
|---|---|
| `F-08` Agent-assisted appeals | Valuable but not required to validate core approval-loop thesis |
| `F-10` Documentation acceleration | Important, but may distract from proving core operational wedge first |
| `F-11` Full delta intelligence | Useful, but can be a stretch after core loop proves stable |
| `F-12` Broad multi-vendor orchestration | Integration-heavy surface area; sequence after core channels stabilize |
| `F-13` Full inbound processing hardening | Strong value but integration and reliability complexity can slip schedule |
| `F-15` Full overnight continuity hardening | Keep basic continuity now; expand after core daytime loop is proven |
| `F-16` Expanded proactive patterning | Rule-based basics first; broader prediction later |
| `F-17` Full communication memory suite | Start with minimal timeline required for core loop validation |
| `F-18` End-state operating model expression | This is an outcome of successful core features, not an initial feature |

## 7. Dependency Map (Execution Order)

1. `E00` auth prerequisite
2. `E05` data model and patient state
3. `E01` worklist + `E02` workstream + `E04` barrier visibility
4. `E06` rule-based decision engine
5. `E03` approval flow
6. `E07` communication execution
7. `E09` task injection
8. handoff continuity hardening in `E01 + E02 + E05` (`F-03`, optional `F-14` expansion)

External dependency:
- `E08` ADT integration enhances automation but should not block initial prototype validation (manual data entry fallback required)

## 8. Open Risks and Questions

- ADT timing risk: what exact fallback operations are mandatory if feed is delayed?
- Channel risk: which execution channels are guaranteed in pilot (fax/email/page)?
- Trust risk: what dismiss-rate threshold indicates noise vs useful suggestions?
- Data quality risk: how are conflicting or stale statuses resolved in UI and agent logic?
- Scope risk: can we keep core scope stable after CTO review or do we need a strict freeze date?

## 9. Instrumentation (Required in Build)

Core events to implement during feature development:
- `banner_shown`, `approved`, `dismissed`, `time_to_approve`
- `action_sent`, `delivery_confirmed`, `delivery_failed`, `retry_count`
- `task_created`, `task_absorbed`, `time_to_first_agent_action`
- `session_open`, `session_duration`, `patients_reviewed`
- `handoff_opened`, `handoff_resume_without_clarification`

## 10. CTO Review Format

Collect feedback in 3 buckets only:
- Accuracy: are pain/response pairings operationally true?
- Scope: should any item move between Core/Deferred?
- Technical risk: which dependencies are likely to break timeline?

## 11. Explicit Non-Goals (Phase 0)

- Fully autonomous execution without CM approval
- Broad predictive ML rollout
- Enterprise supervisor dashboards
- Full integration coverage across all channels on day one
