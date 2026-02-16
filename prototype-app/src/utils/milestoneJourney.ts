import { formatSubchip } from './chipLanguage';
import type { BlockerStatus, MilestoneItem, MilestoneJourneyNode, PatientRecord } from '../types/mockData';

type Tone = 'COMPLETE' | 'PENDING' | 'BLOCKED' | 'FUTURE';

interface BuildMilestoneJourneyInput {
  patient: PatientRecord;
  blockerStatusOverride: Record<string, BlockerStatus>;
  currentStateId: string;
  recentlyChangedHours?: number;
}

interface BuildMilestoneJourneyOutput {
  nodes: MilestoneJourneyNode[];
  completeCount: number;
  activeBlockerCount: number;
  hasReachedDischarge: boolean;
}

const TERMINAL_LABELS = new Set(['physical departure', 'discharge completed']);
const TERMINAL_MILESTONE_IDS = new Set(['M-0212']);

function parseMs(value?: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function milestoneSortRank(label: string): number {
  const lower = label.toLowerCase();
  if (lower.includes('ed arrival') || lower.includes('ed to')) return 0;
  if (lower.includes('inpatient bed arrival') || lower.includes('bed arrival')) return 1;
  if (lower.includes('first attending')) return 2;
  if (lower.includes('disposition target')) return 3;
  if (lower.includes('medically') || lower.includes('fit for discharge')) return 4;
  if (lower.includes('discharge order')) return 5;
  if (lower.includes('physical departure') || lower.includes('discharge completed')) return 6;
  return 50;
}

function byMilestoneOrder(a: MilestoneItem, b: MilestoneItem) {
  const rankDelta = milestoneSortRank(a.label) - milestoneSortRank(b.label);
  if (rankDelta !== 0) return rankDelta;
  const aTs = parseMs(a.last_updated_local) ?? Number.MAX_SAFE_INTEGER;
  const bTs = parseMs(b.last_updated_local) ?? Number.MAX_SAFE_INTEGER;
  return aTs - bTs;
}

function baseToneFromStatus(status: MilestoneItem['status']): Tone {
  if (status === 'DONE') return 'COMPLETE';
  if (status === 'PENDING') return 'PENDING';
  return 'FUTURE';
}

function toneToLabel(tone: Tone): MilestoneJourneyNode['statusLabel'] {
  if (tone === 'COMPLETE') return 'Complete';
  if (tone === 'PENDING') return 'Pending';
  if (tone === 'BLOCKED') return 'Blocked';
  return 'Not started';
}

function segmentTone(previous: Tone, next: Tone): MilestoneJourneyNode['segmentBefore'] {
  if (previous === 'COMPLETE' && next === 'COMPLETE') return 'COMPLETE';
  if (previous === 'BLOCKED' || next === 'BLOCKED') return 'BLOCKED';
  if (previous === 'PENDING' || next === 'PENDING') return 'PENDING';
  return 'FUTURE';
}

function nearestScaffoldMilestoneId(scaffolds: MilestoneItem[], timestampLocal?: string | null): string | null {
  if (scaffolds.length === 0) return null;
  const ts = parseMs(timestampLocal);
  if (ts == null) return scaffolds[0].milestone_id;

  let bestId = scaffolds[0].milestone_id;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const milestone of scaffolds) {
    const mTs = parseMs(milestone.last_updated_local);
    if (mTs == null) continue;
    const distance = Math.abs(mTs - ts);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = milestone.milestone_id;
    }
  }
  return bestId;
}

function milestoneEvidenceItems(patient: PatientRecord, milestone: MilestoneItem) {
  const eventsById = new Map(patient.encounter_timeline.events.map((event) => [event.event_id, event]));
  return milestone.source_refs.map((ref) => {
    const event = eventsById.get(ref);
    if (event) {
      return {
        id: event.event_id,
        label: event.title,
        source: `Encounter ${event.event_type}`,
        timestamp: event.timestamp_local
      };
    }
    return {
      id: ref,
      label: ref,
      source: 'Clinical source',
      timestamp: milestone.last_updated_local
    };
  });
}

function blockerEvidenceItems(patient: PatientRecord, blockerId: string) {
  return patient.evidence_items.items
    .filter((item) => item.linked_to.blocker_ids.includes(blockerId))
    .map((item) => ({
      id: item.evidence_id,
      label: item.source_label,
      source: item.source_type,
      timestamp: item.timestamp_local
    }));
}

function uniqueEvidence(items: MilestoneJourneyNode['evidenceItems']) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function isTerminalDischargeMilestone(milestone: MilestoneItem) {
  const label = milestone.label.toLowerCase().trim();
  return TERMINAL_MILESTONE_IDS.has(milestone.milestone_id) || TERMINAL_LABELS.has(label);
}

export function buildMilestoneJourney({
  patient,
  blockerStatusOverride,
  currentStateId,
  recentlyChangedHours = 24
}: BuildMilestoneJourneyInput): BuildMilestoneJourneyOutput {
  const snapshotTime =
    patient.demo_state_snapshots.find((snapshot) => snapshot.state_id === currentStateId)?.timestamp_local ?? null;
  const nowMs = parseMs(snapshotTime) ?? Date.now();
  const recentWindowMs = Math.max(recentlyChangedHours, 1) * 60 * 60 * 1000;

  const blockers = patient.blockers.items.map((blocker) => ({
    ...blocker,
    effectiveStatus: blockerStatusOverride[blocker.blocker_id] ?? blocker.status
  }));
  const activeBlockers = blockers.filter((blocker) => blocker.effectiveStatus === 'ACTIVE');
  const resolvedBlockers = blockers.filter((blocker) => blocker.effectiveStatus === 'RESOLVED');

  const milestones = [...patient.milestones.items];
  const scaffoldMilestones = milestones.filter((m) => m.tier === 'SCAFFOLD').sort(byMilestoneOrder);
  const conditionalMilestones = milestones.filter(
    (m) => m.tier === 'CM_CRITICAL' || m.visibility === 'SURFACE_WHEN_BLOCKED'
  );

  const blockerIdsByMilestone = new Map<string, string[]>();
  for (const blocker of blockers) {
    for (const milestoneId of blocker.related_milestones ?? []) {
      const existing = blockerIdsByMilestone.get(milestoneId) ?? [];
      blockerIdsByMilestone.set(milestoneId, [...existing, blocker.blocker_id]);
    }
  }

  const includedConditional = conditionalMilestones.filter((milestone) => {
    const linkedBlockers = blockerIdsByMilestone.get(milestone.milestone_id) ?? [];
    const linkedToActive = linkedBlockers.some((id) => activeBlockers.some((b) => b.blocker_id === id));
    const updatedMs = parseMs(milestone.last_updated_local) ?? 0;
    const recentlyChanged = nowMs - updatedMs <= recentWindowMs;
    return linkedToActive || recentlyChanged;
  });

  const conditionalByAnchor = new Map<string, MilestoneItem[]>();
  for (const milestone of includedConditional) {
    const anchorId = nearestScaffoldMilestoneId(scaffoldMilestones, milestone.last_updated_local);
    if (!anchorId) continue;
    const existing = conditionalByAnchor.get(anchorId) ?? [];
    conditionalByAnchor.set(anchorId, [...existing, milestone]);
  }
  for (const [anchorId, list] of conditionalByAnchor.entries()) {
    conditionalByAnchor.set(
      anchorId,
      [...list].sort((a, b) => (parseMs(a.last_updated_local) ?? 0) - (parseMs(b.last_updated_local) ?? 0))
    );
  }

  const blockersByAnchor = new Map<string, typeof blockers>();
  for (const blocker of [...activeBlockers, ...resolvedBlockers]) {
    const explicitAnchor =
      (blocker.related_milestones ?? []).find((id) =>
        scaffoldMilestones.some((milestone) => milestone.milestone_id === id)
      ) ?? null;
    const fallbackAnchor = nearestScaffoldMilestoneId(
      scaffoldMilestones,
      blocker.surfaced_at_local ?? blocker.resolved_at_local
    );
    const anchorId = explicitAnchor ?? fallbackAnchor;
    if (!anchorId) continue;
    const existing = blockersByAnchor.get(anchorId) ?? [];
    blockersByAnchor.set(anchorId, [...existing, blocker]);
  }
  for (const [anchorId, list] of blockersByAnchor.entries()) {
    blockersByAnchor.set(
      anchorId,
      [...list].sort(
        (a, b) =>
          (parseMs(a.surfaced_at_local ?? a.resolved_at_local) ?? 0) -
          (parseMs(b.surfaced_at_local ?? b.resolved_at_local) ?? 0)
      )
    );
  }

  const nodes: MilestoneJourneyNode[] = [];

  for (const milestone of scaffoldMilestones) {
    const linkedBlockers = blockerIdsByMilestone.get(milestone.milestone_id) ?? [];
    const tone = baseToneFromStatus(milestone.status);
    const evidence = uniqueEvidence([
      ...milestoneEvidenceItems(patient, milestone),
      ...linkedBlockers.flatMap((id) => blockerEvidenceItems(patient, id))
    ]);

    nodes.push({
      id: `MS:${milestone.milestone_id}`,
      nodeType: 'MILESTONE',
      label: milestone.label,
      statusLabel: toneToLabel(tone),
      displayState: tone,
      statusTone: tone,
      isClickable: true,
      timestampLocal: milestone.last_updated_local,
      why: milestone.status_reason,
      chips: [],
      milestoneId: milestone.milestone_id,
      linkedBlockerIds: linkedBlockers,
      evidenceCount: evidence.length,
      evidenceItems: evidence,
      segmentBefore: 'NONE',
      segmentAfter: 'NONE'
    });

    const conditionalForAnchor = conditionalByAnchor.get(milestone.milestone_id) ?? [];
    for (const conditionalMilestone of conditionalForAnchor) {
      const linkedIds = blockerIdsByMilestone.get(conditionalMilestone.milestone_id) ?? [];
      const firstLinkedBlocker = linkedIds
        .map((id) => blockers.find((b) => b.blocker_id === id))
        .find((blocker): blocker is NonNullable<typeof blocker> => Boolean(blocker));
      const chips = [formatSubchip(`Status: ${conditionalMilestone.status_reason}`, conditionalMilestone.label)];
      if (firstLinkedBlocker?.due_by_local) {
        chips.push(formatSubchip(`Deadline: ${firstLinkedBlocker.due_by_local}`, conditionalMilestone.label));
      }
      if (firstLinkedBlocker?.summary_line) {
        chips.push(formatSubchip(firstLinkedBlocker.summary_line, conditionalMilestone.label));
      }
      const toneForConditional = baseToneFromStatus(conditionalMilestone.status);
      const evidence = uniqueEvidence([
        ...milestoneEvidenceItems(patient, conditionalMilestone),
        ...linkedIds.flatMap((id) => blockerEvidenceItems(patient, id))
      ]);

      nodes.push({
        id: `MS:${conditionalMilestone.milestone_id}`,
        nodeType: 'MILESTONE',
        label: conditionalMilestone.label,
        statusLabel: toneToLabel(toneForConditional),
        displayState: toneForConditional,
        statusTone: toneForConditional,
        isClickable: true,
        timestampLocal: conditionalMilestone.last_updated_local,
        why: conditionalMilestone.status_reason,
        chips: chips.slice(0, 3),
        milestoneId: conditionalMilestone.milestone_id,
        linkedBlockerIds: linkedIds,
        evidenceCount: evidence.length,
        evidenceItems: evidence,
        segmentBefore: 'NONE',
        segmentAfter: 'NONE'
      });
    }

    const blockersForAnchor = blockersByAnchor.get(milestone.milestone_id) ?? [];
    for (const blocker of blockersForAnchor) {
      const toneForBlocker: Tone = blocker.effectiveStatus === 'ACTIVE' ? 'BLOCKED' : 'COMPLETE';
      const blockerEvidence = uniqueEvidence(blockerEvidenceItems(patient, blocker.blocker_id));
      const chips: string[] = [];
      chips.push(`Blocker: ${blocker.description}`);
      if (blocker.due_by_local) chips.push(formatSubchip(`Deadline: ${blocker.due_by_local}`, blocker.description));
      if (blocker.summary_line) chips.push(formatSubchip(`Status: ${blocker.summary_line}`, blocker.description));

      nodes.push({
        id: `BL:${blocker.blocker_id}`,
        nodeType: 'BLOCKER',
        label: blocker.description,
        statusLabel: blocker.effectiveStatus === 'ACTIVE' ? 'Blocked' : 'Complete',
        displayState: toneForBlocker,
        statusTone: toneForBlocker,
        isClickable: true,
        timestampLocal: blocker.effectiveStatus === 'ACTIVE' ? blocker.surfaced_at_local : blocker.resolved_at_local,
        why: blocker.summary_line,
        chips,
        blockerId: blocker.blocker_id,
        linkedBlockerIds: [blocker.blocker_id],
        evidenceCount: blockerEvidence.length || blocker.evidence_summary.source_count,
        evidenceItems: blockerEvidence,
        segmentBefore: 'NONE',
        segmentAfter: 'NONE'
      });
    }
  }

  const terminalDone = scaffoldMilestones.some(
    (milestone) => isTerminalDischargeMilestone(milestone) && milestone.status === 'DONE'
  );
  const hasReachedDischarge = terminalDone && activeBlockers.length === 0;

  nodes.push({
    id: 'END:DISCHARGE',
    nodeType: 'ENDPOINT',
    label: 'Discharge',
    statusLabel: hasReachedDischarge ? 'Complete' : 'Not started',
    displayState: hasReachedDischarge ? 'COMPLETE' : 'FUTURE',
    statusTone: hasReachedDischarge ? 'COMPLETE' : 'FUTURE',
    isClickable: true,
    timestampLocal: hasReachedDischarge
      ? scaffoldMilestones.find((milestone) => isTerminalDischargeMilestone(milestone))?.last_updated_local ?? null
      : null,
    why: hasReachedDischarge
      ? 'Patient has physically departed.'
      : 'Final destination. Usually not reached while blockers remain.',
    chips: [],
    linkedBlockerIds: [],
    evidenceCount: 0,
    evidenceItems: [],
    segmentBefore: 'NONE',
    segmentAfter: 'NONE'
  });

  const deduped: MilestoneJourneyNode[] = [];
  const seen = new Set<string>();
  for (const node of nodes) {
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    deduped.push(node);
  }

  const firstBlockedIndex = deduped.findIndex((node) => node.displayState === 'BLOCKED');
  if (firstBlockedIndex >= 0) {
    for (let index = firstBlockedIndex + 1; index < deduped.length; index += 1) {
      const node = deduped[index];
      if (node.displayState === 'COMPLETE') {
        node.displayState = 'PENDING';
        node.statusTone = 'PENDING';
        node.statusLabel = 'Pending';
        node.isPostBlockerAdjusted = true;
        if (!node.why.toLowerCase().includes('blocked by active discharge barriers')) {
          node.why = `${node.why} Blocked by active discharge barriers.`;
        }
      }
    }
  }

  for (let index = 0; index < deduped.length; index += 1) {
    const current = deduped[index];
    const previous = deduped[index - 1];
    const next = deduped[index + 1];
    current.segmentBefore = previous
      ? segmentTone(previous.displayState, current.displayState)
      : 'NONE';
    current.segmentAfter = next
      ? segmentTone(current.displayState, next.displayState)
      : 'NONE';
  }

  const completeCount = deduped.filter(
    (node) => node.nodeType === 'MILESTONE' && node.displayState === 'COMPLETE'
  ).length;

  return {
    nodes: deduped,
    completeCount,
    activeBlockerCount: activeBlockers.length,
    hasReachedDischarge
  };
}
