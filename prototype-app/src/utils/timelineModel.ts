import type { BlockerStatus, MilestoneItem, PatientRecord } from '../types/mockData';

export type TimelineEntryKind = 'blocker' | 'decision' | 'milestone' | 'execution' | 'encounter';
export type TimelineEntryState = 'blocked' | 'pending' | 'complete' | 'neutral';
export type TimelineSortMode = 'blocker-first' | 'chronological';

export interface TimelineEvidenceItem {
  id: string;
  label: string;
  source: string;
  timestamp: string;
}

export interface TimelineEntry {
  id: string;
  kind: TimelineEntryKind;
  state: TimelineEntryState;
  label: string;
  detail: string;
  timestampLocal: string;
  sourceLabel: string;
  isMajor: boolean;
  blockerId?: string;
  linkedBlockerIds: string[];
  evidenceCount: number;
  evidenceItems: TimelineEvidenceItem[];
}

interface BuildTimelineEntriesOptions {
  blockerStatusOverride?: Record<string, BlockerStatus>;
  currentStateId?: string;
  sortMode?: TimelineSortMode;
  includeEncounterFallback?: boolean;
}

const DECISION_LABEL_RE = /(decision|sign[- ]?off|disposition|family|consent|capacity|target)/i;

function parseMs(value?: string | null): number {
  if (!value) return Number.MIN_SAFE_INTEGER;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MIN_SAFE_INTEGER : parsed;
}

function toClock(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function mapMilestoneState(status: MilestoneItem['status']): TimelineEntryState {
  if (status === 'DONE') return 'complete';
  if (status === 'PENDING') return 'pending';
  return 'neutral';
}

function mapExecutionState(value: string): TimelineEntryState {
  if (/failed|error|denied|rejected/i.test(value)) return 'blocked';
  if (/resolved|accepted|approved|completed|signed/i.test(value)) return 'complete';
  if (/pending|awaiting|retry/i.test(value)) return 'pending';
  return 'neutral';
}

function isDecisionMilestone(milestone: MilestoneItem): boolean {
  return milestone.tier === 'CM_CRITICAL' || milestone.changes_next_action || DECISION_LABEL_RE.test(milestone.label);
}

function uniqueEvidence(items: TimelineEvidenceItem[]): TimelineEvidenceItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function blockerEvidenceItems(patient: PatientRecord, blockerId: string): TimelineEvidenceItem[] {
  return patient.evidence_items.items
    .filter((item) => item.linked_to.blocker_ids.includes(blockerId))
    .map((item) => ({
      id: item.evidence_id,
      label: item.source_label,
      source: item.source_type,
      timestamp: item.timestamp_local
    }));
}

function mapMilestoneEvidence(
  patient: PatientRecord,
  milestone: MilestoneItem,
  linkedBlockerIds: string[]
): TimelineEvidenceItem[] {
  const eventsById = new Map(patient.encounter_timeline.events.map((event) => [event.event_id, event]));
  const milestoneItems = milestone.source_refs.map((sourceRef) => {
    const event = eventsById.get(sourceRef);
    if (event) {
      return {
        id: event.event_id,
        label: event.title,
        source: `Encounter ${event.event_type}`,
        timestamp: event.timestamp_local
      };
    }
    return {
      id: sourceRef,
      label: sourceRef,
      source: 'Clinical source',
      timestamp: milestone.last_updated_local
    };
  });

  const blockerItems = linkedBlockerIds.flatMap((blockerId) => blockerEvidenceItems(patient, blockerId));
  return uniqueEvidence([...milestoneItems, ...blockerItems]);
}

function resolveBlockerStatusMap(
  patient: PatientRecord,
  blockerStatusOverride: Record<string, BlockerStatus>,
  currentStateId?: string
): Record<string, BlockerStatus> {
  const snapshot = currentStateId
    ? patient.demo_state_snapshots.find((item) => item.state_id === currentStateId)
    : null;

  const snapshotStatusById: Record<string, BlockerStatus> = {};
  for (const item of snapshot?.blocker_statuses ?? []) {
    snapshotStatusById[item.blocker_id] = item.status;
  }

  const resolved: Record<string, BlockerStatus> = {};
  for (const blocker of patient.blockers.items) {
    resolved[blocker.blocker_id] =
      blockerStatusOverride[blocker.blocker_id] ??
      snapshotStatusById[blocker.blocker_id] ??
      blocker.status;
  }
  return resolved;
}

function blockerPriority(kind: TimelineEntryKind): number {
  if (kind === 'blocker') return 0;
  if (kind === 'decision') return 1;
  if (kind === 'milestone') return 2;
  if (kind === 'execution') return 3;
  return 4;
}

function entryCompare(a: TimelineEntry, b: TimelineEntry, sortMode: TimelineSortMode): number {
  if (sortMode === 'blocker-first') {
    const priorityDelta = blockerPriority(a.kind) - blockerPriority(b.kind);
    if (priorityDelta !== 0) return priorityDelta;
  }

  const timeDelta = parseMs(b.timestampLocal) - parseMs(a.timestampLocal);
  if (timeDelta !== 0) return timeDelta;
  return a.label.localeCompare(b.label);
}

export function getTimelineReferenceMs(patient: PatientRecord, currentStateId?: string): number {
  if (currentStateId) {
    const snapshot = patient.demo_state_snapshots.find((item) => item.state_id === currentStateId);
    const snapshotMs = parseMs(snapshot?.timestamp_local);
    if (snapshotMs !== Number.MIN_SAFE_INTEGER) return snapshotMs;
  }

  const asOf = parseMs(patient.meta.as_of_local);
  if (asOf !== Number.MIN_SAFE_INTEGER) return asOf;
  return Date.now();
}

export function formatTimelineTimestamp(value: string, referenceMs: number): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const reference = new Date(referenceMs);
  const sameDay = parsed.toDateString() === reference.toDateString();
  if (sameDay) return toClock(value);

  const day = parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${day} ${toClock(value)}`;
}

export function formatTimelineFullTimestamp(value?: string | null): string {
  if (!value) return 'Not yet updated';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export function timelineStateLabel(state: TimelineEntryState): string {
  if (state === 'blocked') return 'Blocked';
  if (state === 'complete') return 'Complete';
  if (state === 'pending') return 'Pending';
  return 'Info';
}

export function buildTimelineEntries(
  patient: PatientRecord,
  {
    blockerStatusOverride = {},
    currentStateId,
    sortMode = 'blocker-first',
    includeEncounterFallback = true
  }: BuildTimelineEntriesOptions = {}
): TimelineEntry[] {
  const resolvedBlockerStatus = resolveBlockerStatusMap(patient, blockerStatusOverride, currentStateId);

  const blockerIdsByMilestone = new Map<string, string[]>();
  for (const blocker of patient.blockers.items) {
    for (const milestoneId of blocker.related_milestones ?? []) {
      const current = blockerIdsByMilestone.get(milestoneId) ?? [];
      blockerIdsByMilestone.set(milestoneId, [...current, blocker.blocker_id]);
    }
  }

  const blockerEntries: TimelineEntry[] = patient.blockers.items.map((blocker) => {
    const status = resolvedBlockerStatus[blocker.blocker_id];
    const timestamp =
      status === 'RESOLVED'
        ? blocker.resolved_at_local ?? blocker.evidence_summary.last_evidence_update_local
        : blocker.surfaced_at_local ?? blocker.evidence_summary.last_evidence_update_local;

    const detail =
      blocker.summary_line ||
      (status === 'RESOLVED' ? 'Resolved discharge blocker.' : 'Active discharge blocker.');

    const evidence = uniqueEvidence(blockerEvidenceItems(patient, blocker.blocker_id));
    return {
      id: `BL:${blocker.blocker_id}`,
      kind: 'blocker',
      state: status === 'ACTIVE' ? 'blocked' : 'complete',
      label: blocker.description,
      detail,
      timestampLocal: timestamp,
      sourceLabel: 'Blocker',
      isMajor: true,
      blockerId: blocker.blocker_id,
      linkedBlockerIds: [blocker.blocker_id],
      evidenceCount: evidence.length || blocker.evidence_summary.source_count,
      evidenceItems: evidence
    };
  });

  const milestoneEntries: TimelineEntry[] = patient.milestones.items
    .filter((milestone) => milestone.tier === 'SCAFFOLD' || milestone.tier === 'CM_CRITICAL')
    .filter((milestone) => milestone.status !== 'NOT_NEEDED')
    .map((milestone) => {
      const linkedBlockerIds = blockerIdsByMilestone.get(milestone.milestone_id) ?? [];
      const evidence = mapMilestoneEvidence(patient, milestone, linkedBlockerIds);
      const kind: TimelineEntryKind = isDecisionMilestone(milestone) ? 'decision' : 'milestone';

      return {
        id: `MS:${milestone.milestone_id}`,
        kind,
        state: mapMilestoneState(milestone.status),
        label: milestone.label,
        detail: milestone.status_reason,
        timestampLocal: milestone.last_updated_local,
        sourceLabel: kind === 'decision' ? 'Decision milestone' : 'Milestone',
        isMajor: kind === 'decision' || milestone.display_emphasis === 'PROMINENT',
        linkedBlockerIds,
        evidenceCount: evidence.length,
        evidenceItems: evidence
      };
    });

  const executionEntries: TimelineEntry[] = (patient.execution_log?.entries ?? []).map((entry) => ({
    id: `EX:${entry.log_id}`,
    kind: 'execution',
    state: mapExecutionState(`${entry.event} ${entry.result}`),
    label: entry.event,
    detail: entry.result,
    timestampLocal: entry.timestamp_local,
    sourceLabel: `Execution (${entry.actor})`,
    isMajor: /failed|resolved|approved|accepted|denied|rejected|signed/i.test(`${entry.event} ${entry.result}`),
    linkedBlockerIds: [],
    evidenceCount: 0,
    evidenceItems: []
  }));

  let entries: TimelineEntry[] = [...blockerEntries, ...milestoneEntries, ...executionEntries];

  if (entries.length === 0 && includeEncounterFallback) {
    entries = patient.encounter_timeline.events.map((event) => ({
      id: `EV:${event.event_id}`,
      kind: 'encounter',
      state: 'neutral',
      label: event.title,
      detail: event.details,
      timestampLocal: event.timestamp_local,
      sourceLabel: `Encounter (${event.event_type})`,
      isMajor: true,
      linkedBlockerIds: [],
      evidenceCount: 0,
      evidenceItems: []
    }));
  }

  const deduped: TimelineEntry[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    deduped.push(entry);
  }

  return deduped.sort((a, b) => entryCompare(a, b, sortMode));
}
