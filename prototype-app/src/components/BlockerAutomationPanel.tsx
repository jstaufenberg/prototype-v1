import type { ActionStatus, ExecutionModeDefault, ProposedAction } from '../types/mockData';

export type AutomationStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'FAILED';

interface BlockerAutomationPanelProps {
  actions: ProposedAction[];
  executionModeByAction: Record<string, ExecutionModeDefault>;
  actionStatusOverride: Record<string, ActionStatus>;
  automationStatusByAction: Record<string, AutomationStatus>;
  currentTimestamp?: string | null;
  onExecutionModeChange: (actionId: string, mode: ExecutionModeDefault) => void;
  onAutomationStatusChange: (actionId: string, status: AutomationStatus) => void;
}

function nextRunLabel(baseTimestamp: string | null | undefined, cadenceHours: number): string {
  if (!baseTimestamp) return 'Not scheduled';
  const parsed = new Date(baseTimestamp);
  if (Number.isNaN(parsed.getTime())) return 'Not scheduled';
  parsed.setHours(parsed.getHours() + cadenceHours);
  return parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function runControlLabel(status: AutomationStatus): string {
  if (status === 'RUNNING') return 'Pause';
  if (status === 'PAUSED') return 'Resume';
  return 'Start';
}

function nextAutomationStatus(status: AutomationStatus): AutomationStatus {
  if (status === 'RUNNING') return 'PAUSED';
  return 'RUNNING';
}

export default function BlockerAutomationPanel({
  actions,
  executionModeByAction,
  actionStatusOverride,
  automationStatusByAction,
  currentTimestamp,
  onExecutionModeChange,
  onAutomationStatusChange
}: BlockerAutomationPanelProps) {
  if (actions.length === 0) {
    return <p className="subtle">No automations available for this blocker yet.</p>;
  }

  return (
    <div className="blocker-automation-panel">
      {actions.map((action) => {
        const mode = executionModeByAction[action.action_id] ?? action.execution_mode_default;
        const status = automationStatusByAction[action.action_id] ?? 'IDLE';
        const actionStatus = actionStatusOverride[action.action_id] ?? action.status;
        const nextRun =
          mode === 'BACKGROUND' && status === 'RUNNING'
            ? nextRunLabel(currentTimestamp, action.background_policy.cadence_hours)
            : 'Not scheduled';

        return (
          <div key={action.action_id} className="blocker-automation-row">
            <strong>{action.title}</strong>
            <div className="blocker-automation-grid">
              <label>
                Mode
                <select
                  value={mode}
                  onChange={(event) =>
                    onExecutionModeChange(action.action_id, event.target.value as ExecutionModeDefault)
                  }
                >
                  <option value="ONE_TIME">One-time</option>
                  <option value="BACKGROUND">Keep monitoring in background</option>
                </select>
              </label>
              <p>
                <span className="subtle">Automation status</span>
                <br />
                {status}
              </p>
              <p>
                <span className="subtle">Action state</span>
                <br />
                {actionStatus}
              </p>
              <p>
                <span className="subtle">Next run</span>
                <br />
                {nextRun}
              </p>
            </div>
            <button
              className="secondary"
              onClick={() => onAutomationStatusChange(action.action_id, nextAutomationStatus(status))}
            >
              {runControlLabel(status)}
            </button>
          </div>
        );
      })}
    </div>
  );
}
