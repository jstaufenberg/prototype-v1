import { formatSubchip } from './chipLanguage';
import type { BlockerStatus, MilestoneJourneyNode, MilestoneItem, PatientRecord } from '../types/mockData';

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

const RECENTLY_CHANGED_MS_DEFAULT = 24 * 60 * 60 * 1000;

function parseMs(value?: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function admissionRank(label: string): number {
  const lower = label.toLowerCase();
  if (lower.includes('ed arrival') || lower.includes('ed to')) return 0;
  if (lower.includes('inpatient bed arrival') || lower.includes('bed arrival')) return 1;
  if (lower.includes('first attending')) return 2;
  if (lower.includes('disposition target')) return 3;
  if (lower.includes('medically') || lower.includes('fit for discharge')) return 4;
  if (lower.includes('discharge order')) return 5;
  if (lower.includes('physical departure') || lower.includes('discharge')) return 6;
  return 50;
}

function milestoneTone(milestone: MilestoneItem): Tone {
  if (milestone.status === 'DONE') return 'COMPLETE';
  if (milestone.status === 'PENDING') return 'PENDING';
  if (milestone.status === 'NOT_STARTED') return 'FUTURE';
  return 'FUTURE';
}

function toneLabel(tone: Tone): MilestoneJourneyNode['statusLabel'] {
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

function nearestScaffoldMilestoneId(
  scaffolds: MilestoneItem[],
  timestampLocal?: string | null
): string | null {
  if (scaffolds.length === 0) return null;
  const ts = parseMs(timestampLocal);
  if (ts == null) return scaffolds[0].milestone_id;

  let best = scaffolds[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const milestone of scaffolds) {
    const mTs = parseMs(milestone.last_updated_local);
    if (mTs == null) continue;
    const distance = Math.abs(mTs - ts);
    if (distance < bestDistance) {
      best = milestone;
      bestDistance = distance;
    }
  }
  return best.milestone_id;
}

function milestoneEvidenceItems(patient: PatientRecord, milestone: MilestoneItem) {
  const eventsById = new Map(patient.encounter_timeline.events.map((event) => [event.event_id, event]));
  const items: MilestoneJourneyNode['evidenceItems'] = [];

  for (const ref of milestone.source_refs) {
    const event = eventsById.get(ref);
    if (event) {
      items.push({
        id: event.event_id,
        label: event.title,
        source: `Encounter ${event.event_type}`,
        timestamp: event.timestamp_local
      });
    } else {
      items.push({
        id: ref,
        label: ref,
        source: 'Clinical source',
        timestamp: milestone.last_updated_local
      });
    }
  }

  return items;
}

function blockerEvidenceItems(patient: PatientRecord, blockerId: string) {
  return patient.evidence_items.items
    .filter((evidence) => evidence.linked_to.blocker_ids.includes(blockerId))
    .map<MilestoneJourneyNode['evidenceItems'][number]>((evidence) => ({
      id: evidence.evidence_id,
      label: evidence.source_label,
      source: evidence.source_type,
      timestamp: evidence.timestamp_local
    }));
}

function uniqueEvidence(items: MilestoneJourneyNode['evidenceItems']) {
  const seen = new Set<string>();
  const out: MilestoneJourneyNode['evidenceItems'] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function byMilestoneOrder(a: MilestoneItem, b: MilestoneItem) {
  const rankDelta = admissionRank(a.label) - admissionRank(b.label);
  if (rankDelta !== 0) return rankDelta;
  const aTs = parseMs(a.last_updated_local) ?? Number.MAX_SAFE_INTEGER;
  const bTs = parseMs(b.last_updated_local) ?? Number.MAX_SAFE_INTEGER;
  return aTs - bTs;
}

function buildMilestoneNode(
  patient: PatientRecord,
  milestone: MilestoneItem,
  linkedBlockerIds: string[],
  chips: string[]
): MilestoneJourneyNode {
  const tone = milestoneTone(milestone);
  const evidence = uniqueEvidence([
    ...milestoneEvidenceItems(patient, milestone),
    ...linkedBlockerIds.flatMap((blockerId) => blockerEvidenceItems(patient, blockerId))
  ]);

  return {
    id: `MS:${milestone.milestone_id}`,
    nodeType: 'MILESTONE',
    label: milestone.label,
    statusLabel: toneLabel(tone),
    statusTone: tone,
    timestampLocal: milestone.last_updated_local,
    why: milestone.status_reason,
    chips,
    milestoneId: milestone.milestone_id,
    linkedBlockerIds,
    evidenceCount: evidence.length,
    evidenceItems: evidence,
    segmentBefore: 'NONE',
    segmentAfter: 'NONE'
  };
}

export function buildMilestoneJourney({
  patient,
  blockerStatusOverride,
  currentStateId,
  recentlyChangedHours = 24
}: BuildMilestoneJourneyInput): BuildMilestoneJourneyOutput {
  const snapshotTime =
    patient.demo_state_snapshots.find((snapshot) => snapshot.state_id === currentStateId)?.timestamp_local ??
    null;
  const nowMs = parseMs(snapshotTime) ?? Date.now();
  const recentWindowMs = Math.max(recentlyChangedHours, 1) * 60 * 60 * 1000;

  const blockers = patient.blockers.items.map((blocker) => ({
    ...blocker,
    effectiveStatus: blockerStatusOverride[blocker.blocker_id] ?? blocker.status
  }));

  const activeBlockers = blockers.filter((blocker) => blocker.effectiveStatus === 'ACTIVE');
  const resolvedBlockers = blockers.filter((blocker) => blocker.effectiveStatus === 'RESOLVED');

  const milestones = [...patient.milestones.items];
  const scaffoldMilestones = milestones.filter((milestone) => milestone.tier === 'SCAFFOLD').sort(byMilestoneOrder);
  const conditionalMilestones = milestones.filter((milestone) => milestone.tier !== 'SCAFFOLD' || milestone.visibility === 'SURFACE_WHEN_BLOCKED');

  const blockerIdsByMilestone = new Map<string, string[]>();
  for (const blocker of blockers) {
    for (const milestoneId of blocker.related_milestones ?? []) {
      const existing = blockerIdsByMilestone.get(milestoneId) ?? [];
      blockerIdsByMilestone.set(milestoneId, [...existing, blocker.blocker_id]);
    }
  }

  const includedConditional = conditionalMilestones.filter((milestone) => {
    const linkedIds = blockerIdsByMilestone.get(milestone.milestone_id) ?? [];
    const linkedActive = linkedIds.some((id) => activeBlockers.some((blocker) => blocker.blocker_id === id));
    const updatedMs = parseMs(milestone.last_updated_local) ?? 0;
    const recentlyChanged = nowMs - updatedMs <= (recentlyChangedHours <= 0 ? RECENTLY_CHANGED_MS_DEFAULT : recentWindowMs);
    return linkedActive || recentlyChanged;
  });

  const conditionalByAnchor = new Map<string, MilestoneItem[]>();
  for (const milestone of includedConditional) {
    const anchorId = nearestScaffoldMilestoneId(scaffoldMilestones, milestone.last_updated_local);
    if (!anchorId) continue;
    const existing = conditionalByAnchor.get(anchorId) ?? [];
    existing.push(milestone);
    conditionalByAnchor.set(anchorId, existing);
  }
  for (const [anchorId, items] of conditionalByAnchor.entries()) {
    items.sort((a, b) => (parseMs(a.last_updated_local) ?? 0) - (parseMs(b.last_updated_local) ?? 0));
    conditionalByAnchor.set(anchorId, items);
  }

  const blockersByAnchor = new Map<string, typeof blockers>();
  for (const blocker of [...activeBlockers, ...resolvedBlockers]) {
    const candidateMilestoneId =
      (blocker.related_milestones ?? []).find((milestoneId) =>
        scaffoldMilestones.some((milestone) => milestone.milestone_id === milestoneId)
      ) ?? nearestScaffoldMilestoneId(scaffoldMilestones, blocker.surfaced_at_local ?? blocker.resolved_at_local);
    if (!candidateMilestoneId) continue;
    const existing = blockersByAnchor.get(candidateMilestoneId) ?? [];
    existing.push(blocker);
    blockersByAnchor.set(candidateMilestoneId, existing);
  }
  for (const [anchorId, items] of blockersByAnchor.entries()) {
    items.sort((a, b) => {
      const aTs = parseMs(a.surfaced_at_local ?? a.resolved_at_local) ?? 0;
      const bTs = parseMs(b.surfaced_at_local ?? b.resolved_at_local) ?? 0;
      return aTs - bTs;
    });
    blockersByAnchor.set(anchorId, items);
  }

  const nodes: MilestoneJourneyNode[] = [];
  for (const milestone of scaffoldMilestones) {
    const linkedBlockers = blockerIdsByMilestone.get(milestone.milestone_id) ?? [];
    nodes.push(buildMilestoneNode(patient, milestone, linkedBlockers, []));

    const conditionalForAnchor = conditionalByAnchor.get(milestone.milestone_id) ?? [];
    for (const conditionalMilestone of conditionalForAnchor) {
      const linkedIds = blockerIdsByMilestone.get(conditionalMilestone.milestone_id) ?? [];
      const firstLinkedBlocker = linkedIds
        .map((id) => blockers.find((blocker) => blocker.blocker_id === id))
        .find((blocker): blocker is NonNullable<typeof blocker> => Boolean(blocker));
      const chips: string[] = [];
      chips.push(formatSubchip(`Status: ${conditionalMilestone.status_reason}`, conditionalMilestone.label));
      if (firstLinkedBlocker?.due_by_local) {
        chips.push(formatSubchip(`Deadline: ${firstLinkedBlocker.due_by_local}`, conditionalMilestone.label));
      }
      if (firstLinkedBlocker?.summary_line) {
        chips.push(formatSubchip(firstLinkedBlocker.summary_line, conditionalMilestone.label));
      }
      nodes.push(buildMilestoneNode(patient, conditionalMilestone, linkedIds, chips.slice(0, 3)));
    }

    const blockersForAnchor = blockersByAnchor.get(milestone.milestone_id) ?? [];
    for (const blocker of blockersForAnchor) {
      const blockerTone: Tone = blocker.effectiveStatus === 'ACTIVE' ? 'BLOCKED' : 'COMPLETE';
      const blockerEvidence = uniqueEvidence(blockerEvidenceItems(patient, blocker.blocker_id));
      const blockerChips = [`Blocker: ${blocker.description}`];
      if (blocker.due_by_local) blockerChips.push(formatSubchip(`Deadline: ${blocker.due_by_local}`));
      if (blocker.summary_line) blockerChips.push(formatSubchip(`Status: ${blocker.summary_line}`));

      nodes.push({
        id: `BL:${blocker.blocker_id}`,
        nodeType: 'BLOCKER',
        label: blocker.description,
        statusLabel: blocker.effectiveStatus === 'ACTIVE' ? 'Blocked' : 'Complete',
        statusTone: blockerTone,
        timestampLocal: blocker.effectiveStatus === 'ACTIVE' ? blocker.surfaced_at_local : blocker.resolved_at_local,
        why: blocker.summary_line,
        chips: blockerChips,
        blockerId: blocker.blocker_id,
        linkedBlockerIds: [blocker.blocker_id],
        evidenceCount: blockerEvidence.length || blocker.evidence_summary.source_count,
        evidenceItems: blockerEvidence,
        segmentBefore: 'NONE',
        segmentAfter: 'NONE'
      });
    }
  }

  const explicitDischargeDone = scaffoldMilestones.some(
    (milestone) =>
      (milestone.label.toLowerCase().includes('physical departure') ||
        milestone.label.toLowerCase().includes('discharge')) &&
      milestone.status === 'DONE'
  );

  nodes.push({
    id: 'END:DISCHARGE',
    nodeType: 'ENDPOINT',
    label: 'Discharge',
    statusLabel: explicitDischargeDone ? 'Complete' : 'Not started',
    statusTone: explicitDischargeDone ? 'COMPLETE' : 'FUTURE',
    timestampLocal: explicitDischargeDone
      ? scaffoldMilestones.find((milestone) => milestone.label.toLowerCase().includes('physical departure'))
          ?.last_updated_local ?? null
      : null,
    why: explicitDischargeDone
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

  for (let index = 0; index < deduped.length; index += 1) {
    const current = deduped[index];
    const previous = deduped[index - 1];
    const next = deduped[index + 1];
    current.segmentBefore = previous
      ? segmentTone(previous.statusTone as Tone, current.statusTone as Tone)
      : 'NONE';
    current.segmentAfter = next
      ? segmentTone(current.statusTone as Tone, next.statusTone as Tone)
      : 'NONE';
  }

  const completeCount = deduped.filter(
    (node) => node.nodeType === 'MILESTONE' && node.statusTone === 'COMPLETE'
  ).length;

  return {
    nodes: deduped,
    completeCount,
    activeBlockerCount: activeBlockers.length,
    hasReachedDischarge: explicitDischargeDone
  };
}
