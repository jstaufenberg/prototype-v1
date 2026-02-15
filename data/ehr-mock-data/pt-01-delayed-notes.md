# PT-01 Delayed Notes

## Why this patient exists
- Delayed case for failure recovery and fallback execution.
- Covers auth urgency + placement tracking + channel switch.

## What to show in demo
- Auth blocker and Placement blocker both active.
- Placement blocker includes delivery failure + duplicate outreach warning.
- CM authorizes agent to recover failed outreach and continue backup follow-up.

## Key data choices
- `A-0102` tests channel switch (fax failure -> email resend).
- `A-0103` tests controlled backup follow-up with duplicate warning context.
- Nested steps remain inside placement blocker to avoid timeline clutter.

## Value proposition mapping
- Reduces manual status chasing across payer + facilities.
- Demonstrates resilient execution: failure detected, recovery proposed, state updated.

## Deterministic playback
- `T0`: delayed with unresolved auth + outreach failure.
- `T1`: auth outreach approved and failure recovery executed.
- `T2`: lowered rank position after backup follow-up.
