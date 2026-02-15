# PT-04 On Track Notes

## Why this patient exists
- Control case proving system restraint.
- Shows no unnecessary action proposals when there are no active CM blockers.

## What to show in demo
- Worklist row with On Track chip.
- Patient detail with recently resolved blocker only.
- No action cards rendered.

## Key data choices
- `proposed_actions.items` is intentionally empty.
- `B-0401` is resolved and shown as historical context.

## Value proposition mapping
- Prevents alert fatigue and preserves trust.
- Helps CM focus on truly blocked patients.

## Deterministic playback
- T0/T1/T2 remain stable with no action requirements.
