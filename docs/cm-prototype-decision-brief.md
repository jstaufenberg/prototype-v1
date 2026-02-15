# Case manager prototype mockup doc

Last updated: 2026-02-13  
Purpose: to define what the prototype mockup includes, what is deferred, and why.

## 1) Doc summary

This phase is a validation mockup only. 

We are testing three things:
- Is the mapped CM workflow operationally accurate?
- Are the pain points real, frequent, and material?
- Are the proposed feature responses useful enough to justify engineering build?

What this phase is not:
- production integration validation
- reliability/security hardening
- full technical planning for implementation
- Technical feasibility 

## 2) Why case managers? 

### 2.1 Core premise: hospitals are a type of dependency system

Hospital operations are not single tasks but they are dependency chains.
One delayed item (e.g. auth, referral response, physician sig -off, transport timing, other) blocks downstream steps.
So value comes from coordinating the chain, not just from speeding up one task.

Practical example:
- "Send referral fax faster" alone does not solve discharge delay if no one tracks response status, follows up, and reprioritizes next actions.
- The wedge must handle observe -> decide -> propose -> execute across the full chain.

### 2.2 Lesson from prior automation companies (e.g. Diligent)

Task-first automation may fail to compound / demonstrate attractive enough ROI because it:
- optimizes isolated actions without system awareness
- depends on humans to bridge handoff/context gaps (requirement for human 'touchpoints' remains)
- collects only narrow telemetry (immediate environment) rather than operational dependency data

Result: local efficiency gains, constrained to local maxmima, limited enterprise impact, weak strategic defensibility, limited access to hospital budgets.
This wedge avoids that trap by starting at the coordination layer where bottlenecks are created and resolved.

### 2.3 Why we think CM discharge is the right first domain

It is our selected first wedge because it combines:
- high frequency operational pain (daily, repeated, measurable)
- clear ownership (the CM sits at a high footfall cross-department coordination point)
- a very tractable regulatory profile (operational workflow support, not diagnosis/treatment decisioning)
- lower upfront capital (software validation before physical-layer spend)
- comparatively lower competitive density in agent-executed CM operations (we know of casera, and just a few others). Outside of this, there are well-resourced and entrenched incumbents (e.g. LeanTass). 

### 2.4 Why this wedge has stronger economic access

This approach naturally touches multiple budget narratives at once:
- labor: less manual status-chasing and fewer redundant outreach loops; can potentially cut FTEs
- non-labor operations: better throughput, fewer avoidable delay days
- flow/revenue: faster bed availability and reduced capacity leakage
- Clinical outcomes: attractive clinical outcomes with reduced LOS

Why we can access these budgets:
- the wedge sits where delays are coordinated, so impact can be shown in operational and financial terms, not just user productivity.
- outcomes map to metrics leaders already track (time-to-discharge, delay drivers, handoff reliability, avoidable day patterns). This is important. 

### 2.5 Why this wedge is a step along the road toward autonomy/robotics

The wedge generates the right data substrate:
- timing patterns
- dependency edges between tasks/teams
- handoff failure points
- intervention-outcome relationships

That data supports expansion from software coordination into autonomous dispatch, then robotics-enabled execution in adjacent wedges (bed flow, transport, room turnover, time-critical delivery).
We are building the system-level operating intelligence first, so later physical automation has context and prioritization, not just movement. A step toward "hospital as a graph". 

## 3) LucidChart journey map explanation

- `J-##` = journey step (what the CM does)
- `P-##` = pain at that step
- `F-##` = response feature to that pain

Each feature decision below links to specific journey/pain points on the chart (link here: https://lucid.app/lucidchart/9ca006b3-7b9f-4ea7-b38d-2c5906b13c7a/edit?viewport_loc=-2094%2C1048%2C1944%2C1080%2C0_0&invitationId=inv_36b55d84-935c-4786-801e-0632d7404c42) 

## 4) Journey anchors 

| Journey ID | Time | Step title |
|---|---|---|
| `J-00` | `07:00` | CM arrives |
| `J-01` | `07:05` | Census scan |
| `J-02` | `07:15` | Auth deadline check |
| `J-03` | `07:30` | Triage tracking |
| `J-04` | `08:00` | Morning huddle |
| `J-05` | `09:00` | Insurance calls |
| `J-06` | `09:30` | Fax referrals |
| `J-07` | `10:00` | Physician page + family call + payer portals |
| `J-08` | `10:30` | Auth denial and appeal |
| `J-09` | `11:00` | SNF placement calls |
| `J-10` | `12:00` | Documentation block |
| `J-11` | `13:00` | Afternoon huddle |
| `J-12` | `14:00` | DME + transport + home health calls |
| `J-13` | `15:30` | Fax machine check |
| `J-14` | `16:00` | Final rounds + handoff prep |
| `J-15` | `17:00` | End of shift / overnight gap |
| `J-16` | `All day` | Reactive workflow pattern |
| `J-17` | `All day` | No communication memory |
| `J-18` | `All day` | CM as human router |

## 5) Prototype scope v1.0 decisions to discuss

| Feature | Linked map | Decision | Rationale |
|---|---|---|---|
| `F-00` Shift-start snapshot with overnight deltas | `J-00 / P-00` | Include | Directly tests the shift-start orientation pain (today often 15-30 min). |
| `F-01` Ranked worklist with status and barrier chips | `J-01 / P-01` | Include | Core operating surface; without this, no meaningful workflow test. |
| `F-02` Rule-based auth risk flags + follow-up prompts | `J-02 / P-02` | Include | Targets a high-cost delay path with clear urgency behavior. |
| `F-03` Shared worklist as handoff source | `J-03 / P-03` | Include | Tests continuity and shared-state reliability at low mockup complexity. |
| `F-04` Task capture to agent ownership | `J-04 / P-04` | Include | Tests whether huddle-derived tasks can enter and persist in the workflow. |
| `F-05` One-tap agent auth follow-up | `J-05 / P-05` | Include | Tests approve-and-execute interaction against high phone/hold burden. |
| `F-06` Parallel referral send + tracking | `J-06 / P-06` | Include | Tests whether serial referral friction can be reduced in the workflow UI. |
| `F-18` Agent-first approve/dismiss operating model | `J-18 / P-18` | Include (principle) | This is the interaction model expressed through `F-05` and approval controls. |
| `F-07` Unified follow-up and escalation state | `J-07 / P-07` | Defer | Multi-party orchestration complexity before core loop usefulness is validated. |
| `F-08` Agent-assisted appeal package | `J-08 / P-08` | Defer | Workflow-heavy branch; not required for first mockup signal. |
| `F-09` Placement outreach/matching extension | `J-09 / P-09` | Defer | Overlaps `F-06` pattern; defer advanced placement logic. |
| `F-10` Auto-captured documentation history | `J-10 / P-10` | Defer | Valuable, but documentation output detail can distract from core interaction test. |
| `F-11` Real-time state deltas and catch-up | `J-11 / P-11` | Defer | Extension of core orientation model; not needed for first pass. |
| `F-12` Unified multi-vendor execution | `J-12 / P-12` | Defer | Broad process surface area; lower value density for first mockup cycle. |
| `F-13` Inbound response ingestion + barrier refresh | `J-13 / P-13` | Defer | Reliability/exception behavior is outside mockup scope assumptions. |
| `F-14` Worklist as handoff record (reporting layer) | `J-14 / P-14` | Defer | `F-03` already covers core continuity behavior for this phase. |
| `F-15` 24/7 follow-up continuity | `J-15 / P-15` | Defer | Depends on production-grade continuity assumptions excluded here. |
| `F-16` Proactive trigger rules (cross-cutting) | `J-16 / P-16` | Defer | Keep first mockup focused on concrete step-level interactions. |
| `F-17` Cross-channel communication history | `J-17 / P-17` | Defer | Important, but broader than minimum scope needed for first validation pass. |

## 6) Evidence which assists us in prioritizing

- CM status-chasing load is very substantial (commonly framed around 40-60% of workday in this workflow type).
- Phone/hold/fax burden is high (often around 3-4 hours/day in coordination heavy days).
- Referral workflows are still heavily fax mediated (major friction source).
- Prior auth delays/denials are common enough to be an operational priority. (We likely do not want to end up a PA company / product - too crowded / commoditized). 
- Huddles are high-volume and time-compressed, creating task capture loss risk.
- Shift handoff context loss is common when state is memory/paper-dependent.

## 7) Shared decisions needed to move forward

- Confirm include/defer cut line for this mockup.
- Confirm that `F-00` to `F-06` are sufficient to validate the core interaction model (any changes?)
- Confirm whether any deferred feature is required now for narrative or usability completeness.
- Confirm whether we should produce page-by-page interaction wireframes for each included feature before implementation planning (I can happily do this if helpful)


## 8) Outputs 

- final mockup feature list (include/defer)
- agreed narrative for why this wedge is the right first move, while keeping our ears open for better alternatives
- clear go/no-go on creating detailed wireframes for all included interactions
- 
