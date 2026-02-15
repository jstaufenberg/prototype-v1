# PT-02 At Risk Notes

## Why this patient exists
- Demonstrates broad insight surfacing plus one narrow execution loop.
- Shows parsed requirement extraction (respiratory-capable SNF) and urgent auth follow-up in the same case.
- Tests agent-permission UX (`Let agent ...`) with minimal button overload.

## What to show in demo
- Worklist row only: chips + sub-tag + `Open patient plan`.
- Patient detail: two collapsed blocker cards.
- Inside Placement blocker: nested steps (auto-draft packet -> send -> track -> choose).

## Key data choices
- `B-0201` (Auth deadline) is top urgency blocker with direct permission action.
- `B-0202` (Placement capability) contains referral process internally.
- `NS-0201` is `AGENT_AUTOMATIC` to show packet drafting is prerequisite automation.
- `A-0202` is CM permission boundary for outbound send.

## Value proposition mapping
- Detect: parsed insights from messy notes (`parsed_insights`).
- Prioritize: blocker severity + manual rank reasons.
- Propose: action cards with JTBD outcomes.
- Execute: explicit permission CTA + log updates.
- Update state: `demo_state_snapshots` T0/T1/T2.

## Where trust is built
- Source snippets shown for parsed requirement and urgency.
- Capability warning on Maplewood is visible before send.
- Permission microcopy clarifies: CM approves, agent executes.

## Deterministic playback
- `demo_playback` = click path.
- `demo_state_snapshots` = exact states for reproducible demo transitions.

## Reference wiring
- Uses shared references via `reference_data_links`:
  - `reference-facilities.json`
  - `reference-payers.json`
  - `reference-staff.json`
  - `reference-channels.json`
