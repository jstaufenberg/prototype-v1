# PT-03 Pending Notes

## Why this patient exists
- Non-urgent "not ready" path.
- Tests snooze, dismiss, and task-capture behavior without forcing premature action.

## What to show in demo
- MD sign-off blocker: snooze vs escalate now.
- Family decision blocker: create follow-up task.
- Placement suggestion can be dismissed with reason.

## Key data choices
- `A-0301` uses snooze path to show timing control.
- `A-0302` creates task for handoff continuity.
- `A-0303` dismissal prevents noisy or unsafe premature execution.

## Value proposition mapping
- System supports restraint, not only automation.
- Maintains continuity across shifts by persisting tasks/reminders.

## Deterministic playback
- `T0`: both blockers active.
- `T1`: physician reminder snoozed + family task created.
- `T2`: referral suggestion dismissed as not ready.
