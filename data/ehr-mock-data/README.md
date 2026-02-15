# EHR Mock Data (CM Prototype)

## Purpose
Deterministic, blocker-centric mock data for prototype walkthroughs.

## Files
- `schema-v1.json`: canonical data contract.
- `reference-facilities.json`: facility capabilities + contacts.
- `reference-payers.json`: payer metadata + auth contact channels.
- `reference-staff.json`: staff lookup IDs.
- `reference-channels.json`: supported execution channels.
- `pt-01-delayed.json`: delayed case (auth + placement failure recovery).
- `pt-02-at-risk.json`: at-risk case (auth urgency + respiratory requirement).
- `pt-03-pending.json`: pending case (snooze/dismiss/task capture).
- `pt-04-on-track.json`: control case (no action needed).
- `pt-*-notes.md`: rationale and demo intent notes.

## UI Contract (high-level)
- Worklist row: high-signal chips + sub-tag + open action only.
- Patient detail: active blockers (collapsed by default) + recently resolved blockers.
- Blocker detail: nested steps, evidence summary (`Evidence: N sources`), and context-specific action cards.
- Action cards: explicit delegation CTA (`Have agent ...`) and optional background execution mode.
- Evidence drawer: metadata-only provenance view; no raw snippet rendering in default UI.

## Deterministic Demo
Each patient includes:
- `demo_playback`: click-by-click flow.
- `demo_state_snapshots`: T0/T1/T2 states for reproducible transitions.

## Prototype Runbook
- See `prototype-sequence.md` for modular demo execution (8/10/15 minute packs).
- Use module order dynamically; default pack is 10 minutes.

## Code Scaffold
- Frontend starter app: `../../prototype-app/`
- Run `npm run sync:data` inside `../../prototype-app` to refresh copied mock JSON files from this folder.

## Ranking Model (Prototype)
- Ranking is manual only (`rank_position` + `rank_reasons`).
- Criteria order:
  1. Active blocker
  2. Time pressure
  3. Extended LOS risk
- No numeric score calculation is used in this prototype.

## Validation Commands
```bash
for f in product/prototype-v1-2026-02-15/data/ehr-mock-data/*.json; do jq . "$f" >/dev/null && echo "valid: $f"; done

for f in product/prototype-v1-2026-02-15/data/ehr-mock-data/pt-0*-*.json; do
  echo "--- $f"
  jq -r '. as $r | [ .blockers.items[].blocker_id ] as $b |
    [ .proposed_actions.items[].dependencies[]? | split(":")[0] | split(".nested_steps")[0] ]
    | map(select(($b|index(.))==null))
    | if length==0 then "dependency blocker refs: ok" else "bad refs: " + (join(",")) end' "$f"
done

rg -n "priority_score" product/prototype-v1-2026-02-15/data/ehr-mock-data/schema-v1.json product/prototype-v1-2026-02-15/data/ehr-mock-data/pt-0*-*.json

for f in product/prototype-v1-2026-02-15/data/ehr-mock-data/pt-0*-*.json; do
  echo "--- $f"
  jq -r '.proposed_actions.items[]? | .action_id + ": " + .cta_primary' "$f"
done

for f in product/prototype-v1-2026-02-15/data/ehr-mock-data/pt-0*-*.json; do
  echo "--- $f"
  jq -r '.blockers.items[] | .blocker_id + " evidence_count=" + (.evidence_summary.source_count|tostring)' "$f"
done
```
