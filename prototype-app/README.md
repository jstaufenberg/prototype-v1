# flowOS Prototype App (Code Scaffold)

This is a starter React + TypeScript UI scaffold wired to deterministic mock data.

## Purpose
- Start coding immediately against the latest blocker-centric prototype model.
- Keep the interaction model aligned with current decisions:
  - low-click worklist,
  - explicit delegation CTAs (`Have agent ...`),
  - manual ranking (`rank_position`, `rank_reasons`),
  - blocker-first detail view with nested steps,
  - evidence drawer metadata (no raw snippet rendering),
  - optional background execution mode per recommendation.

## Quick start
```bash
cd product/prototype-v1-2026-02-15/prototype-app
npm install
npm run dev
```

## Data source
This app uses copied JSON files in `src/mock-data/`.

To sync from canonical mock data:
```bash
npm run sync:data
```

Canonical data lives in:
- `../data/ehr-mock-data/`

## Included starter components
- `src/components/Worklist.tsx`
- `src/components/PatientDetail.tsx`
- `src/components/ActionModal.tsx`

## Current behavior
- Opens 4 patient scenarios.
- Shows blocker cards + evidence metadata + parsed insights + action cards.
- Supports one primary recommendation with collapsed secondary actions.
- Supports action execution mode (`One-time` / `Keep monitoring in background`).
- Uses confirmation CTA `Confirm and run`.
- Supports deterministic state switching (`T0/T1/T2`) per patient.

## Next build steps
1. Add proper global state management (instead of local component state).
2. Add routing + screen-level URL state.
3. Add richer nested-step UI and timeline visualization.
4. Add module-specific demo shortcuts from `prototype-sequence.md`.
