import { useMemo, useState } from 'react';
import BlockerWorkspaceModal from './BlockerWorkspaceModal';
import { type AutomationStatus } from './BlockerAutomationPanel';
import MilestoneJourney from './MilestoneJourney';
import type {
  ActionStatus,
  BlockerStatus,
  ExecutionModeDefault,
  PatientRecord,
  ProposedAction
} from '../types/mockData';

interface PatientDetailProps {
  patient: PatientRecord;
  currentStateId: string;
  actionStatusOverride: Record<string, ActionStatus>;
  blockerStatusOverride: Record<string, BlockerStatus>;
  executionModeByAction: Record<string, ExecutionModeDefault>;
  onPrimaryAction: (action: ProposedAction, mode: ExecutionModeDefault) => void;
  onSecondaryAction: (action: ProposedAction) => void;
  onExecutionModeChange: (actionId: string, mode: ExecutionModeDefault) => void;
  onClose: () => void;
  showHandoff?: boolean;
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

export default function PatientDetail({
  patient,
  currentStateId,
  actionStatusOverride,
  blockerStatusOverride,
  executionModeByAction,
  onPrimaryAction,
  onSecondaryAction,
  onExecutionModeChange,
  onClose,
  showHandoff
}: PatientDetailProps) {
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

  const location = `${patient.patient_profile.current_location.unit} / ${patient.patient_profile.current_location.bed}`;

  return (
    <section className="panel">
      {showHandoff && (
        <div className="handoff-banner">
          <div>
            <span>Agent updates since prior handoff: 3</span>
            <span>Changes requiring your review: 2</span>
          </div>
          <span className="subtle">Handoff view</span>
        </div>
      )}

      <div className="detail-header">
        <h2>{patient.patient_profile.patient_name}</h2>
        <button className="detail-close" aria-label="Close patient panel" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="meta-grid">
        <span>MRN {patient.patient_profile.mrn}</span>
        <span>{location}</span>
        <span>{patient.patient_profile.insurance.payer_name}</span>
      </div>

      <MilestoneJourney
        patient={patient}
        blockerStatusOverride={blockerStatusOverride}
        currentStateId={currentStateId}
        onFocusBlocker={focusBlockerInView}
      />

      <div className="section-head">
        <h3>Active blockers</h3>
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
          <div className="inline-actions">
            <button className="primary-action" onClick={submitNewBlocker}>
              Save blocker
            </button>
            <button className="secondary" onClick={() => setShowAddBlockerForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {activeBlockers.length === 0 && localBlockers.length === 0 ? (
        <p className="subtle">No active blockers right now.</p>
      ) : (
        <ul className="blockers blockers-compact">
          {activeBlockers.map((blocker) => (
            <li
              key={blocker.blocker_id}
              id={`blocker-card-${blocker.blocker_id}`}
              className={`blocker ${severityClass(blocker.severity)} blocker-compact${focusedBlockerId === blocker.blocker_id ? ' blocker-focused' : ''}`}
            >
              <div className="blocker-compact-head">
                <strong>{blocker.description}</strong>
                <span className="subtle">{blocker.status}</span>
              </div>
              <p>{blocker.summary_line}</p>
              {formatDueLine(blocker.due_by_local) && (
                <p className="due-line">{formatDueLine(blocker.due_by_local)}</p>
              )}
              <p className="subtle">
                Evidence: {blocker.evidence_summary.source_count} sources · Last updated{' '}
                {blocker.evidence_summary.last_evidence_update_local}
              </p>
              <div className="inline-actions">
                <button className="primary-action" onClick={() => setWorkspaceBlockerId(blocker.blocker_id)}>
                  Open blocker workspace
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    setTaskDraftByBlocker((previous) => ({
                      ...previous,
                      [blocker.blocker_id]: previous[blocker.blocker_id] ?? ''
                    }))
                  }
                >
                  + Add blocker task
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
          ))}

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
    </section>
  );
}
