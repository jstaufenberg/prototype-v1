import { useMemo, useState } from 'react';
import BlockerWorkspaceModal from '../BlockerWorkspaceModal';
import { type AutomationStatus } from '../BlockerAutomationPanel';
import MilestoneJourney from '../MilestoneJourney';
import { actionsForBlocker } from '../../utils/patientActionSelection';
import type {
  ActionStatus,
  BlockerStatus,
  ExecutionModeDefault,
  PatientRecord,
  ProposedAction
} from '../../types/mockData';

interface BlockersTabProps {
  patient: PatientRecord;
  currentStateId: string;
  actionStatusOverride: Record<string, ActionStatus>;
  blockerStatusOverride: Record<string, BlockerStatus>;
  executionModeByAction: Record<string, ExecutionModeDefault>;
  onPrimaryAction: (action: ProposedAction, mode: ExecutionModeDefault) => void;
  onSecondaryAction: (action: ProposedAction) => void;
  onExecutionModeChange: (actionId: string, mode: ExecutionModeDefault) => void;
}

interface LocalBlocker {
  blocker_id: string;
  title: string;
  summary: string;
  created_at: string;
}

function severityClass(severity: string) {
  if (severity === 'RED') return 'sev-red';
  if (severity === 'ORANGE') return 'sev-orange';
  return 'sev-yellow';
}

function formatDueLine(value?: string | null): string | null {
  if (!value) return null;
  const dueAt = new Date(value);
  if (Number.isNaN(dueAt.getTime())) return `Action by ${value}`;

  const now = Date.now();
  const dueMs = dueAt.getTime();
  const diffMinutes = Math.round((dueMs - now) / 60000);
  const absMinutes = Math.abs(diffMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const clock = dueAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  if (diffMinutes >= 0) {
    if (hours > 0) return `Action by ${clock} (in ${hours}h${minutes ? ` ${minutes}m` : ''})`;
    return `Action by ${clock} (in ${minutes}m)`;
  }

  if (hours > 0) return `Action by ${clock} (overdue ${hours}h${minutes ? ` ${minutes}m` : ''})`;
  return `Action by ${clock} (overdue ${absMinutes}m)`;
}

function priorityClass(priority: string) {
  if (priority === 'HIGH') return 'priority-high';
  if (priority === 'MEDIUM') return 'priority-medium';
  return 'priority-low';
}

export default function BlockersTab({
  patient,
  currentStateId,
  actionStatusOverride,
  blockerStatusOverride,
  executionModeByAction,
  onPrimaryAction,
  onSecondaryAction,
  onExecutionModeChange
}: BlockersTabProps) {
  const [taskDraftByBlocker, setTaskDraftByBlocker] = useState<Record<string, string>>({});
  const [blockerTasks, setBlockerTasks] = useState<Record<string, string[]>>({});
  const [showAddBlockerForm, setShowAddBlockerForm] = useState(false);
  const [newBlockerTitle, setNewBlockerTitle] = useState('');
  const [newBlockerSummary, setNewBlockerSummary] = useState('');
  const [localBlockers, setLocalBlockers] = useState<LocalBlocker[]>([]);
  const [focusedBlockerId, setFocusedBlockerId] = useState<string | null>(null);
  const [workspaceBlockerId, setWorkspaceBlockerId] = useState<string | null>(null);
  const [automationStatusByAction, setAutomationStatusByAction] =
    useState<Record<string, AutomationStatus>>({});

  const currentSnapshot = useMemo(
    () => patient.demo_state_snapshots.find((snapshot) => snapshot.state_id === currentStateId),
    [patient.demo_state_snapshots, currentStateId]
  );

  const activeBlockers = useMemo(
    () =>
      patient.blockers.items.filter(
        (blocker) => (blockerStatusOverride[blocker.blocker_id] ?? blocker.status) === 'ACTIVE'
      ),
    [patient.blockers.items, blockerStatusOverride]
  );

  const resolvedBlockers = useMemo(
    () =>
      patient.blockers.items.filter(
        (blocker) => (blockerStatusOverride[blocker.blocker_id] ?? blocker.status) === 'RESOLVED'
      ),
    [patient.blockers.items, blockerStatusOverride]
  );

  const workspaceBlocker = useMemo(
    () =>
      workspaceBlockerId
        ? patient.blockers.items.find((blocker) => blocker.blocker_id === workspaceBlockerId) ?? null
        : null,
    [patient.blockers.items, workspaceBlockerId]
  );

  const submitNewBlocker = () => {
    const title = newBlockerTitle.trim();
    if (!title) return;
    const summary = newBlockerSummary.trim() || 'Added manually by case manager.';
    const next: LocalBlocker = {
      blocker_id: `LOCAL-${localBlockers.length + 1}`,
      title,
      summary,
      created_at: new Date().toISOString()
    };
    setLocalBlockers((previous) => [...previous, next]);
    setShowAddBlockerForm(false);
    setNewBlockerTitle('');
    setNewBlockerSummary('');
  };

  const submitBlockerTask = (blockerId: string) => {
    const draft = (taskDraftByBlocker[blockerId] ?? '').trim();
    if (!draft) return;
    setBlockerTasks((previous) => ({
      ...previous,
      [blockerId]: [...(previous[blockerId] ?? []), draft]
    }));
    setTaskDraftByBlocker((previous) => ({ ...previous, [blockerId]: '' }));
  };

  const focusBlockerInView = (blockerId: string) => {
    setFocusedBlockerId(blockerId);
    window.setTimeout(() => {
      document.getElementById(`blocker-card-${blockerId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 0);
  };

  return (
    <>
      {/* Milestone Journey */}
      <MilestoneJourney
        patient={patient}
        blockerStatusOverride={blockerStatusOverride}
        currentStateId={currentStateId}
        onFocusBlocker={focusBlockerInView}
      />

      {/* Active Blockers */}
      <div className="section-head">
        <h3>Blockers ({activeBlockers.length + localBlockers.length})</h3>
        <button className="secondary" onClick={() => setShowAddBlockerForm((previous) => !previous)}>
          + Add blocker
        </button>
      </div>

      {showAddBlockerForm && (
        <div className="add-blocker-form">
          <input
            type="text"
            value={newBlockerTitle}
            onChange={(event) => setNewBlockerTitle(event.target.value)}
            placeholder="Blocker title"
          />
          <input
            type="text"
            value={newBlockerSummary}
            onChange={(event) => setNewBlockerSummary(event.target.value)}
            placeholder="Summary / reason"
          />
          <div className="card-actions-footer">
            <button className="secondary" onClick={() => setShowAddBlockerForm(false)}>
              Cancel
            </button>
            <button className="primary-action" onClick={submitNewBlocker}>
              Save blocker
            </button>
          </div>
        </div>
      )}

      {activeBlockers.length === 0 && localBlockers.length === 0 ? (
        <p className="subtle">No active blockers right now.</p>
      ) : (
        <ul className="blockers blockers-compact">
          {activeBlockers.map((blocker) => {
            const relatedActions = actionsForBlocker(blocker, patient.proposed_actions.items);
            const agentActions = relatedActions.filter((a) => {
              const status = actionStatusOverride[a.action_id] ?? a.status;
              return status === 'APPROVED' || status === 'EXECUTED';
            });
            const cmDecisions = relatedActions.filter((a) => {
              const status = actionStatusOverride[a.action_id] ?? a.status;
              return status === 'PROPOSED';
            });

            return (
              <li
                key={blocker.blocker_id}
                id={`blocker-card-${blocker.blocker_id}`}
                className={`blocker ${severityClass(blocker.severity)} blocker-compact${focusedBlockerId === blocker.blocker_id ? ' blocker-focused' : ''}`}
              >
                <div className="blocker-compact-head">
                  <strong>{blocker.description}</strong>
                  <span className="subtle">{blocker.status}</span>
                </div>
                <p className="blocker-summary-text">{blocker.summary_line}</p>
                {formatDueLine(blocker.due_by_local) && (
                  <p className="due-line">{formatDueLine(blocker.due_by_local)}</p>
                )}

                {/* Inline agent status — what agents are doing about this blocker */}
                {agentActions.length > 0 && (
                  <div className="blocker-agent-status">
                    {agentActions.map((action) => {
                      const status = actionStatusOverride[action.action_id] ?? action.status;
                      const isExecuted = status === 'EXECUTED';
                      return (
                        <p key={action.action_id} className="blocker-agent-line">
                          <span className={`agent-dot ${isExecuted ? 'dot-ok' : 'dot-ok'}`} />
                          Agent: {action.title} ({isExecuted ? 'done' : 'active'})
                        </p>
                      );
                    })}
                  </div>
                )}

                {/* CM Decision — only if PROPOSED actions linked to this blocker */}
                {cmDecisions.length > 0 && (
                  <div className="blocker-cm-decision">
                    {cmDecisions.map((action) => {
                      const mode = executionModeByAction[action.action_id] ?? action.execution_mode_default;
                      return (
                        <div key={action.action_id} className="cm-decision-card">
                          <div className="cm-decision-header">
                            <strong>{action.title}</strong>
                            <span className={`priority-badge ${priorityClass(action.priority)}`}>{action.priority}</span>
                          </div>
                          <p className="cm-decision-reason">{action.reason}</p>
                          <div className="cm-decision-actions">
                            {action.cta_secondary && (
                              <button className="secondary" onClick={() => onSecondaryAction(action)}>
                                {action.cta_secondary}
                              </button>
                            )}
                            <button className="primary-action" onClick={() => onPrimaryAction(action, mode)}>
                              {action.cta_primary}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="subtle">
                  {blocker.evidence_summary.source_count} source{blocker.evidence_summary.source_count !== 1 ? 's' : ''} · Updated{' '}
                  {blocker.evidence_summary.last_evidence_update_local.slice(11, 16)}
                </p>
                <div className="card-actions-footer">
                  <button
                    className="secondary"
                    onClick={() =>
                      setTaskDraftByBlocker((previous) => ({
                        ...previous,
                        [blocker.blocker_id]: previous[blocker.blocker_id] ?? ''
                      }))
                    }
                  >
                    + Add task
                  </button>
                  <button className="primary-action" onClick={() => setWorkspaceBlockerId(blocker.blocker_id)}>
                    Open workspace
                  </button>
                </div>

                {taskDraftByBlocker[blocker.blocker_id] !== undefined && (
                  <div className="blocker-task-entry">
                    <input
                      type="text"
                      value={taskDraftByBlocker[blocker.blocker_id] ?? ''}
                      onChange={(event) =>
                        setTaskDraftByBlocker((previous) => ({
                          ...previous,
                          [blocker.blocker_id]: event.target.value
                        }))
                      }
                      placeholder="Add task linked to this blocker"
                    />
                    <button className="secondary" onClick={() => submitBlockerTask(blocker.blocker_id)}>
                      Save task
                    </button>
                  </div>
                )}

                {(blockerTasks[blocker.blocker_id] ?? []).length > 0 && (
                  <ul className="blocker-task-list">
                    {(blockerTasks[blocker.blocker_id] ?? []).map((task, index) => (
                      <li key={`${blocker.blocker_id}-task-${index}`}>{task}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}

          {localBlockers.map((blocker) => (
            <li key={blocker.blocker_id} className="blocker sev-yellow blocker-compact local-blocker">
              <div className="blocker-compact-head">
                <strong>{blocker.title}</strong>
                <span className="subtle">You added this</span>
              </div>
              <p>{blocker.summary}</p>
              <p className="subtle">
                Created{' '}
                {new Date(blocker.created_at).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Resolved Blockers */}
      {resolvedBlockers.length > 0 && (
        <details className="resolved-blockers-section">
          <summary className="resolved-blockers-toggle">
            Resolved ({resolvedBlockers.length})
          </summary>
          <ul className="blockers blockers-compact">
            {resolvedBlockers.map((blocker) => (
              <li
                key={blocker.blocker_id}
                className="blocker blocker-compact blocker-resolved"
              >
                <div className="blocker-compact-head">
                  <strong>{blocker.description}</strong>
                  <span className="subtle">RESOLVED</span>
                </div>
                <p className="blocker-summary-text">{blocker.summary_line}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      {workspaceBlocker && (
        <BlockerWorkspaceModal
          patient={patient}
          blocker={workspaceBlocker}
          actionStatusOverride={actionStatusOverride}
          executionModeByAction={executionModeByAction}
          automationStatusByAction={automationStatusByAction}
          currentTimestamp={currentSnapshot?.timestamp_local}
          onPrimaryAction={onPrimaryAction}
          onSecondaryAction={onSecondaryAction}
          onExecutionModeChange={onExecutionModeChange}
          onAutomationStatusChange={(actionId, status) =>
            setAutomationStatusByAction((previous) => ({ ...previous, [actionId]: status }))
          }
          onClose={() => setWorkspaceBlockerId(null)}
        />
      )}
    </>
  );
}
