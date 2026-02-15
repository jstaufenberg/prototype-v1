# Prototype v1 Package (2026-02-15)

This folder contains the complete prototype v1.0 workspace, organized for design review, demo, and implementation.

## Structure
- `docs/`
  - `cm-prototype-simple-ui-spec.md` — canonical UX spec (source of truth)
  - `prototype-wireframe-checklist.md` — implementation checklist
  - `cm-prototype-decision-brief.md`
  - `cm-prototype-phase-0-spec.md`
- `data/ehr-mock-data/`
  - schema, patient JSON scenarios, reference data, runbook
- `wireframes/`
  - `discharge-wireframe.html`
  - `CM_prototype_journey_mapping (1).pdf`
- `prototype-app/`
  - React+TypeScript scaffold wired to mock data

## Primary entry points
1. UX spec: `docs/cm-prototype-simple-ui-spec.md`
2. Demo runbook: `data/ehr-mock-data/prototype-sequence.md`
3. Mock data contract: `data/ehr-mock-data/schema-v1.json`
4. App scaffold: `prototype-app/README.md`

## Quick start (app)
```bash
cd product/prototype-v1-2026-02-15/prototype-app
npm install
npm run sync:data
npm run dev
```

## Notes
- This package is for prototype v1.0 only.
- The prototype remains deterministic and frontend-first.
- Background agent behavior is simulated through UI state and mock data.
