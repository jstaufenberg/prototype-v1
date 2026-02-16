import { useMemo, useState } from 'react';
import type { ActionStatus, ExecutionModeDefault, PatientRecord, ProposedAction } from '../../types/mockData';

interface AutomationTabProps {
  patient: PatientRecord;
  actionStatusOverride: Record<string, ActionStatus>;
  executionModeByAction: Record<string, ExecutionModeDefault>;
  onExecutionModeChange: (actionId: string, mode: ExecutionModeDefault) => void;
}

type AgentStatus = 'RUNNING' | 'PAUSED' | 'IDLE' | 'FAILED';

function agentStatusForAction(_action: ProposedAction, mode: ExecutionModeDefault, actionStatus: ActionStatus): AgentStatus {
  if (actionStatus === 'FAILED') return 'FAILED';
  if (mode !== 'BACKGROUND') return 'IDLE';
  if (actionStatus === 'EXECUTED' || actionStatus === 'DISMISSED') return 'IDLE';
  return 'RUNNING';
}

function agentStatusClass(status: AgentStatus) {
  if (status === 'RUNNING') return 'agent-running';
  if (status === 'FAILED') return 'agent-failed';
  if (status === 'PAUSED') return 'agent-paused';
  return 'agent-idle';
}

export default function AutomationTab({
  patient,
  actionStatusOverride,
  executionModeByAction,
  onExecutionModeChange
}: AutomationTabProps) {
  const [logExpanded, setLogExpanded] = useState(false);
  const [configExpanded, setConfigExpanded] = useState(false);

  const agentRows = useMemo(() => {
    return patient.proposed_actions.items.map((action) => {
      const mode = executionModeByAction[action.action_id] ?? action.execution_mode_default;
      const status = actionStatusOverride[action.action_id] ?? action.status;
      const agentStatus = agentStatusForAction(action, mode, status);
      return { action, mode, actionStatus: status, agentStatus };
    });
  }, [patient.proposed_actions.items, executionModeByAction, actionStatusOverride]);

  const runningCount = agentRows.filter((r) => r.agentStatus === 'RUNNING').length;

  const logEntries = patient.execution_log?.entries ?? [];
  const visibleLog = logExpanded ? logEntries : logEntries.slice(0, 3);

  return (
    <>
      {/* Active Monitoring */}
      <div className="section-head">
        <h3>Active Monitoring ({runningCount}/{agentRows.length})</h3>
      </div>

      {agentRows.length === 0 ? (
        <p className="subtle">No automations configured for this patient.</p>
      ) : (
        <ul className="automation-list">
          {agentRows.map(({ action, mode, agentStatus }) => (
            <li key={action.action_id} className="automation-row">
              <div className="automation-row-header">
                <strong>{action.title}</strong>
                <span className={`agent-status-chip ${agentStatusClass(agentStatus)}`}>{agentStatus}</span>
              </div>
              <div className="automation-row-meta">
                <span>Mode: {mode === 'BACKGROUND' ? 'Background' : 'One-time'}</span>
                {mode === 'BACKGROUND' && action.background_policy && (
                  <span>Every {action.background_policy.cadence_hours}h</span>
                )}
              </div>
              {agentStatus === 'FAILED' && (
                <p className="automation-failure">Last attempt failed. Check activity log for details.</p>
              )}
              <div className="automation-controls">
                {agentStatus === 'RUNNING' && (
                  <button className="secondary" onClick={() => onExecutionModeChange(action.action_id, 'ONE_TIME')}>
                    Pause
                  </button>
                )}
                {(agentStatus === 'IDLE' || agentStatus === 'PAUSED') && (
                  <button className="secondary" onClick={() => onExecutionModeChange(action.action_id, 'BACKGROUND')}>
                    {agentStatus === 'PAUSED' ? 'Resume' : 'Start'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Activity Log */}
      <div className="section-head">
        <h3>Activity Log ({logEntries.length})</h3>
        {logEntries.length > 3 && (
          <button className="secondary" onClick={() => setLogExpanded((prev) => !prev)}>
            {logExpanded ? 'Show less' : `Show all (${logEntries.length})`}
          </button>
        )}
      </div>

      {logEntries.length === 0 ? (
        <p className="subtle">No activity recorded yet.</p>
      ) : (
        <ul className="activity-log">
          {visibleLog.map((entry) => (
            <li key={entry.log_id} className="log-entry">
              <span className="log-time">{entry.timestamp_local.slice(11, 16)}</span>
              <span className={`log-actor log-actor-${entry.actor.toLowerCase()}`}>{entry.actor}</span>
              <span className="log-event">{entry.event}</span>
              <span className="log-result subtle">{entry.result}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Configure */}
      <div className="section-head">
        <h3>Configure</h3>
        <button className="secondary" onClick={() => setConfigExpanded((prev) => !prev)}>
          {configExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {configExpanded && (
        <div className="automation-config">
          {patient.proposed_actions.items.map((action) => {
            const mode = executionModeByAction[action.action_id] ?? action.execution_mode_default;
            return (
              <div key={action.action_id} className="config-row">
                <span className="config-action-title">{action.title}</span>
                <div className="config-mode-toggle">
                  <button
                    className={mode === 'ONE_TIME' ? 'mode-btn mode-active' : 'mode-btn'}
                    onClick={() => onExecutionModeChange(action.action_id, 'ONE_TIME')}
                  >
                    One-time
                  </button>
                  <button
                    className={mode === 'BACKGROUND' ? 'mode-btn mode-active' : 'mode-btn'}
                    onClick={() => onExecutionModeChange(action.action_id, 'BACKGROUND')}
                  >
                    Background
                  </button>
                </div>
                {mode === 'BACKGROUND' && action.background_policy && (
                  <div className="config-details subtle">
                    Every {action.background_policy.cadence_hours}h · Max {action.background_policy.max_duration_hours}h ·
                    Stops: {action.background_policy.stop_conditions.join(', ')}
                  </div>
                )}
              </div>
            );
          })}
          <button className="secondary" disabled title="Coming soon">
            + Set up new monitoring
          </button>
        </div>
      )}
    </>
  );
}
