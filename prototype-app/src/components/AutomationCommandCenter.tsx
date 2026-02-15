import type { ActionStatus, ExecutionModeDefault, ProposedAction } from '../types/mockData';

export type AutomationStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'FAILED';

interface AutomationCommandCenterProps {
  actions: ProposedAction[];
  executionModeByAction: Record<string, ExecutionModeDefault>;
  actionStatusOverride: Record<string, ActionStatus>;
  automationStatusByAction: Record<string, AutomationStatus>;
  currentTimestamp?: string;
  onSetExecutionMode: (actionId: string, mode: ExecutionModeDefault) => void;
  onSetAutomationStatus: (actionId: string, status: AutomationStatus) => void;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function addHours(value?: string | null, hours = 0) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(parsed.getHours() + hours);
  return parsed.toISOString();
}

function computeAutomationStatus(
  action: ProposedAction,
  mode: ExecutionModeDefault,
  actionStatusOverride: Record<string, ActionStatus>,
  automationStatusByAction: Record<string, AutomationStatus>
): AutomationStatus {
  const actionStatus = actionStatusOverride[action.action_id];
  if (actionStatus === 'FAILED') return 'FAILED';
  if (automationStatusByAction[action.action_id]) return automationStatusByAction[action.action_id];
  return mode === 'BACKGROUND' ? 'RUNNING' : 'IDLE';
}

export default function AutomationCommandCenter({
  actions,
  executionModeByAction,
  actionStatusOverride,
  automationStatusByAction,
  currentTimestamp,
  onSetExecutionMode,
  onSetAutomationStatus
}: AutomationCommandCenterProps) {
  if (actions.length === 0) return null;

  return (
    <section className="automation-command-center">
      <h3>Automation Command Center</h3>
      <p className="subtle">Monitor and control background extraction, monitoring, and outreach for this patient.</p>

      <div className="automation-table">
        {actions.map((action) => {
          const mode = executionModeByAction[action.action_id] ?? action.execution_mode_default;
          const status = computeAutomationStatus(action, mode, actionStatusOverride, automationStatusByAction);
          const lastRun = formatDateTime(currentTimestamp);
          const nextRun =
            mode === 'BACKGROUND' && status === 'RUNNING'
              ? formatDateTime(addHours(currentTimestamp, action.background_policy.cadence_hours))
              : '-';

          return (
            <article key={action.action_id} className="automation-row">
              <div className="automation-main">
                <strong>{action.title}</strong>
                <p className="subtle">{action.cta_primary}</p>
              </div>

              <div className="automation-meta">
                <span>
                  <strong>Mode:</strong> {mode === 'BACKGROUND' ? 'Background' : 'One-time'}
                </span>
                <span>
                  <strong>Status:</strong> {status}
                </span>
                <span>
                  <strong>Last run:</strong> {lastRun}
                </span>
                <span>
                  <strong>Next run:</strong> {nextRun}
                </span>
              </div>

              <div className="automation-controls">
                {mode === 'ONE_TIME' ? (
                  <button
                    className="secondary"
                    onClick={() => {
                      onSetExecutionMode(action.action_id, 'BACKGROUND');
                      onSetAutomationStatus(action.action_id, 'RUNNING');
                    }}
                  >
                    Start
                  </button>
                ) : status === 'PAUSED' ? (
                  <button className="secondary" onClick={() => onSetAutomationStatus(action.action_id, 'RUNNING')}>
                    Resume
                  </button>
                ) : (
                  <button className="secondary" onClick={() => onSetAutomationStatus(action.action_id, 'PAUSED')}>
                    Pause
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
