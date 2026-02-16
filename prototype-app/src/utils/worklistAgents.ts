import type {
  ActionStatus,
  BlockerStatus,
  ExecutionModeDefault,
  PatientRecord,
  ProposedAction
} from '../types/mockData';

export type WorklistAgentState = 'Running' | 'Paused' | 'Idle' | 'Failed';

export interface WorklistAgentRow {
  actionId: string;
  name: string;
  mode: 'One-time' | 'Background';
  state: WorklistAgentState;
  lastRun: string | null;
  nextRun: string | null;
  failureText?: string;
}

function parseMs(value?: string | null): number {
  if (!value) return Number.MIN_SAFE_INTEGER;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MIN_SAFE_INTEGER : parsed;
}

function latestActionLog(
  patient: PatientRecord,
  actionId: string
): { timestamp: string; result: string } | null {
  const matches = (patient.execution_log?.entries ?? [])
    .filter((entry) => entry.related_action_id === actionId)
    .sort((a, b) => parseMs(b.timestamp_local) - parseMs(a.timestamp_local));
  if (matches.length === 0) return null;
  return { timestamp: matches[0].timestamp_local, result: matches[0].result };
}

function actionIsBlockerLinked(
  action: ProposedAction,
  patient: PatientRecord,
  blockerStatusOverride: Record<string, BlockerStatus>
): boolean {
  const blockerIds = patient.blockers.items
    .filter((blocker) => (blockerStatusOverride[blocker.blocker_id] ?? blocker.status) === 'ACTIVE')
    .map((blocker) => blocker.blocker_id.toLowerCase());
  const dependencyText = action.dependencies.join(' ').toLowerCase();
  const actionText = `${action.title} ${action.reason}`.toLowerCase();

  if (blockerIds.some((blockerId) => dependencyText.includes(blockerId))) return true;
  return /(auth|payer|facility|placement|sign-off|signoff|family|transport|referral|outreach)/i.test(
    actionText
  );
}

function deriveState(status: ActionStatus, mode: ExecutionModeDefault): WorklistAgentState {
  if (status === 'FAILED') return 'Failed';
  if (mode === 'BACKGROUND') {
    if (status === 'DISMISSED') return 'Paused';
    if (status === 'EXECUTED' || status === 'PROPOSED' || status === 'SNOOZED') return 'Running';
  }
  return 'Idle';
}

function computeNextRun(
  mode: ExecutionModeDefault,
  state: WorklistAgentState,
  lastRun: string | null,
  cadenceHours: number
): string | null {
  if (mode !== 'BACKGROUND' || state !== 'Running') return null;
  if (!lastRun) return null;
  const parsed = new Date(lastRun);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(parsed.getHours() + cadenceHours);
  return parsed.toISOString();
}

export function buildWorklistAgentRows(
  patient: PatientRecord,
  actionStatusOverride: Record<string, ActionStatus>,
  executionModeByAction: Record<string, ExecutionModeDefault>,
  blockerStatusOverride: Record<string, BlockerStatus>
): WorklistAgentRow[] {
  return patient.proposed_actions.items
    .filter((action) => actionIsBlockerLinked(action, patient, blockerStatusOverride))
    .map((action) => {
      const status = actionStatusOverride[action.action_id] ?? action.status;
      const mode = executionModeByAction[action.action_id] ?? action.execution_mode_default;
      const modeLabel: WorklistAgentRow['mode'] = mode === 'BACKGROUND' ? 'Background' : 'One-time';
      const state = deriveState(status, mode);
      const log = latestActionLog(patient, action.action_id);
      const nextRun = computeNextRun(mode, state, log?.timestamp ?? null, action.background_policy.cadence_hours);
      const failureText =
        state === 'Failed' ? log?.result ?? 'Last run failed. See blocker workspace for details.' : undefined;

      return {
        actionId: action.action_id,
        name: action.title,
        mode: modeLabel,
        state,
        lastRun: log?.timestamp ?? null,
        nextRun,
        failureText
      };
    })
    .sort((a, b) => {
      const stateRank = (value: WorklistAgentState) => {
        if (value === 'Failed') return 0;
        if (value === 'Running') return 1;
        if (value === 'Paused') return 2;
        return 3;
      };
      const stateDelta = stateRank(a.state) - stateRank(b.state);
      if (stateDelta !== 0) return stateDelta;
      return a.name.localeCompare(b.name);
    });
}
