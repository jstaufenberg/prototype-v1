import type { BlockerStatus, MilestoneItem, PatientRecord } from '../types/mockData';

export type WorklistTimelineItemType = 'milestone' | 'decision' | 'blocker' | 'execution';
export type WorklistTimelineItemState = 'complete' | 'pending' | 'blocked' | 'neutral';

export interface WorklistTimelineItem {
  id: string;
  timestampLocal: string;
  label: string;
  detail: string;
  type: WorklistTimelineItemType;
  emphasis: boolean;
  state: WorklistTimelineItemState;
}

const DECISION_RE = /(decision|sign-off|signoff|disposition|requires?|family|irf|snf)/i;
const MILESTONE_RE = /(admission|arrived|transfer|ward|medically|discharge order|physical departure|discharge)/i;

function parseMs(value?: string | null): number {
  if (!value) return Number.MIN_SAFE_INTEGER;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MIN_SAFE_INTEGER : parsed;
}

function isMajorMilestone(item: MilestoneItem): boolean {
  return item.tier === 'SCAFFOLD' && MILESTONE_RE.test(item.label);
}

function isMajorDecision(item: MilestoneItem): boolean {
  return item.tier === 'CM_CRITICAL' || DECISION_RE.test(item.label);
}

function stateFromMilestoneStatus(status: MilestoneItem['status']): WorklistTimelineItemState {
  if (status === 'DONE') return 'complete';
  if (status === 'PENDING') return 'pending';
  if (status === 'NOT_STARTED') return 'neutral';
  return 'neutral';
}

export function buildWorklistTimelineItems(
  patient: PatientRecord,
  blockerStatusOverride: Record<string, BlockerStatus>,
  maxItems = 6
): WorklistTimelineItem[] {
  const milestoneItems: WorklistTimelineItem[] = patient.milestones.items
    .filter((milestone) => isMajorMilestone(milestone) || isMajorDecision(milestone))
    .map((milestone) => ({
      id: `MS-${milestone.milestone_id}`,
      timestampLocal: milestone.last_updated_local,
      label: milestone.label,
      detail: milestone.status_reason,
      type: isMajorDecision(milestone) ? 'decision' : 'milestone',
      emphasis: isMajorMilestone(milestone) || isMajorDecision(milestone),
      state: stateFromMilestoneStatus(milestone.status)
    }));

  const blockerItems: WorklistTimelineItem[] = patient.blockers.items.map((blocker) => {
    const status = blockerStatusOverride[blocker.blocker_id] ?? blocker.status;
    const timestamp = status === 'RESOLVED' ? blocker.resolved_at_local : blocker.surfaced_at_local;
    return {
      id: `BL-${blocker.blocker_id}`,
      timestampLocal: timestamp ?? blocker.evidence_summary.last_evidence_update_local,
      label: blocker.description,
      detail: blocker.summary_line,
      type: 'blocker',
      emphasis: true,
      state: status === 'ACTIVE' ? 'blocked' : 'complete'
    };
  });

  const executionItems: WorklistTimelineItem[] = (patient.execution_log?.entries ?? []).map((entry) => ({
    id: `EX-${entry.log_id}`,
    timestampLocal: entry.timestamp_local,
    label: entry.event,
    detail: entry.result,
    type: 'execution',
    emphasis: /(failed|accepted|approved|declined|resolved|signed|decision)/i.test(
      `${entry.event} ${entry.result}`
    ),
    state: /failed|error/i.test(`${entry.event} ${entry.result}`)
      ? 'blocked'
      : /resolved|accepted|approved|completed|signed/i.test(`${entry.event} ${entry.result}`)
        ? 'complete'
        : 'neutral'
  }));

  return [...milestoneItems, ...blockerItems, ...executionItems]
    .sort((a, b) => parseMs(b.timestampLocal) - parseMs(a.timestampLocal))
    .slice(0, maxItems);
}
