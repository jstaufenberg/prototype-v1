import { useMemo, useState } from 'react';
import AutomationCommandCenter, { type AutomationStatus } from './AutomationCommandCenter';
import MilestoneJourney from './MilestoneJourney';
import ReferralTracking from './ReferralTracking';
import StickyActionBar from './StickyActionBar';
import { formatSubchip } from '../utils/chipLanguage';
import {
  actionsForBlocker,
  findDefaultSelectedAction,
  type SelectedActionState
} from '../utils/patientActionSelection';
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

function priorityRank(priority: 'HIGH' | 'MEDIUM' | 'LOW') {
  if (priority === 'HIGH') return 0;
  if (priority === 'MEDIUM') return 1;
  return 2;
}

function statusBadgeClass(status: ActionStatus) {
  if (status === 'EXECUTED') return 'status-executed';
  if (status === 'DISMISSED') return 'status-dismissed';
  if (status === 'SNOOZED') return 'status-snoozed';
  if (status === 'FAILED') return 'status-failed';
  return '';
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
  const [openBlockerId, setOpenBlockerId] = useState<string | null>(null);
  const [selectedActionState, setSelectedActionState] = useState<SelectedActionState>(null);
  const [automationStatusByAction, setAutomationStatusByAction] =
    useState<Record<string, AutomationStatus>>({});
  const [taskDraftByBlocker, setTaskDraftByBlocker] = useState<Record<string, string>>({});
  const [blockerTasks, setBlockerTasks] = useState<Record<string, string[]>>({});
  const [showAddBlockerForm, setShowAddBlockerForm] = useState(false);
  const [newBlockerTitle, setNewBlockerTitle] = useState('');
  const [newBlockerSummary, setNewBlockerSummary] = useState('');
  const [localBlockers, setLocalBlockers] = useState<LocalBlocker[]>([]);

  const activeBlockers = useMemo(
    () =>
      patient.blockers.items.filter(
        (b) => (blockerStatusOverride[b.blocker_id] ?? b.status) === 'ACTIVE'
      ),
    [patient.blockers.items, blockerStatusOverride]
  );

  const resolvedBlockers = useMemo(
    () =>
      patient.blockers.items.filter(
        (b) => (blockerStatusOverride[b.blocker_id] ?? b.status) === 'RESOLVED'
      ),
    [patient.blockers.items, blockerStatusOverride]
  );

  const proposedActions = useMemo(() => {
    return patient.proposed_actions.items
      .filter((action) => {
        const status = actionStatusOverride[action.action_id] ?? action.status;
        return status === 'PROPOSED' || status === 'SNOOZED';
      })
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  }, [patient.proposed_actions.items, actionStatusOverride]);

  const blockerActionMap = useMemo(() => {
    const map = new Map<string, ProposedAction[]>();
    activeBlockers.forEach((blocker) => {
      map.set(blocker.blocker_id, actionsForBlocker(blocker, proposedActions));
    });
    return map;
  }, [activeBlockers, proposedActions]);

  const effectiveSelected = useMemo<SelectedActionState>(() => {
    if (!selectedActionState) return findDefaultSelectedAction(activeBlockers, proposedActions);

    const blockerExists = activeBlockers.some((blocker) => blocker.blocker_id === selectedActionState.blockerId);
    const actionExists = proposedActions.some((action) => action.action_id === selectedActionState.actionId);
    if (!blockerExists || !actionExists) {
      return findDefaultSelectedAction(activeBlockers, proposedActions);
    }
    return selectedActionState;
  }, [activeBlockers, proposedActions, selectedActionState]);

  const selectedAction = useMemo(
    () =>
      effectiveSelected
        ? proposedActions.find((action) => action.action_id === effectiveSelected.actionId) ?? null
        : null,
    [effectiveSelected, proposedActions]
  );

  const selectedBlocker = useMemo(
    () =>
      effectiveSelected
        ? activeBlockers.find((blocker) => blocker.blocker_id === effectiveSelected.blockerId) ?? null
        : null,
    [activeBlockers, effectiveSelected]
  );

  const selectedActionMode = selectedAction
    ? executionModeByAction[selectedAction.action_id] ?? selectedAction.execution_mode_default
    : 'ONE_TIME';

  const currentSnapshot = patient.demo_state_snapshots.find((s) => s.state_id === currentStateId);

  const recentlyActedActions = useMemo(() => {
    return patient.proposed_actions.items.filter((action) => {
      const status = actionStatusOverride[action.action_id];
      return status === 'EXECUTED' || status === 'DISMISSED' || status === 'SNOOZED';
    });
  }, [patient.proposed_actions.items, actionStatusOverride]);

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
    setLocalBlockers((prev) => [...prev, next]);
    setShowAddBlockerForm(false);
    setNewBlockerTitle('');
    setNewBlockerSummary('');
  };

  const submitBlockerTask = (blockerId: string) => {
    const draft = (taskDraftByBlocker[blockerId] ?? '').trim();
    if (!draft) return;
    setBlockerTasks((prev) => ({
      ...prev,
      [blockerId]: [...(prev[blockerId] ?? []), draft]
    }));
    setTaskDraftByBlocker((prev) => ({ ...prev, [blockerId]: '' }));
  };

  const focusBlockerInView = (blockerId: string) => {
    setOpenBlockerId(blockerId);
    const linkedActions = blockerActionMap.get(blockerId) ?? [];
    if (linkedActions[0]) {
      setSelectedActionState({ blockerId, actionId: linkedActions[0].action_id });
    }
    window.setTimeout(() => {
      document.getElementById(`blocker-card-${blockerId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 0);
  };

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
        <div className="detail-header-actions">
          <button className="detail-close" aria-label="Close patient panel" onClick={onClose}>
            ×
          </button>
        </div>
      </div>

      <div className="meta-grid">
        <span>MRN {patient.patient_profile.mrn}</span>
        <span>
          {patient.patient_profile.current_location.unit} / {patient.patient_profile.current_location.bed}
        </span>
        <span>{patient.patient_profile.insurance.payer_name}</span>
      </div>

      <div className="panel-top-actions">
        <StickyActionBar
          stickyOffset={0}
          compact
          contextText="Quick Action Center"
          primaryAction={
            selectedAction ? (
              <button
                className="primary-action"
                onClick={() => onPrimaryAction(selectedAction, selectedActionMode)}
              >
                {selectedAction.cta_primary}
              </button>
            ) : (
              <span className="subtle">Select a blocker action to run.</span>
            )
          }
          secondaryActions={
            selectedAction ? (
              <div className="quick-action-controls">
                <span>
                  <strong>Selected action:</strong> {selectedAction.title}
                </span>
                <span className="subtle">
                  Linked blocker: {selectedBlocker?.description ?? selectedBlocker?.blocker_id}
                </span>
                <label className="quick-action-mode" htmlFor={`quick-mode-${selectedAction.action_id}`}>
                  Mode
                  <select
                    id={`quick-mode-${selectedAction.action_id}`}
                    value={selectedActionMode}
                    onChange={(event) =>
                      onExecutionModeChange(
                        selectedAction.action_id,
                        event.target.value as ExecutionModeDefault
                      )
                    }
                  >
                    <option value="ONE_TIME">One-time</option>
                    <option value="BACKGROUND">Keep monitoring in background</option>
                  </select>
                </label>
                {selectedAction.cta_secondary && (
                  <button className="secondary" onClick={() => onSecondaryAction(selectedAction)}>
                    {selectedAction.cta_secondary}
                  </button>
                )}
              </div>
            ) : undefined
          }
        />
      </div>

      <div className="section-head">
        <h3>Active blockers</h3>
        <button className="secondary" onClick={() => setShowAddBlockerForm((prev) => !prev)}>
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

      <ul className="blockers">
        {activeBlockers.map((blocker) => {
          const isOpen = openBlockerId === blocker.blocker_id;
          const isSelectedBlocker = effectiveSelected?.blockerId === blocker.blocker_id;
          const linkedEvidence = patient.evidence_items.items.filter((e) =>
            e.linked_to.blocker_ids.includes(blocker.blocker_id)
          );
          const linkedInsights = patient.parsed_insights.items.filter((insight) => {
            const refs = insight.evidence_refs ?? [];
            return refs.some((ref) => linkedEvidence.some((ev) => ev.evidence_id === ref));
          });
          const linkedActions = blockerActionMap.get(blocker.blocker_id) ?? [];
          const selectedActionForBlocker = linkedActions.find(
            (action) => action.action_id === effectiveSelected?.actionId
          );

          return (
            <li
              key={blocker.blocker_id}
              id={`blocker-card-${blocker.blocker_id}`}
              className={`blocker ${severityClass(blocker.severity)}${isSelectedBlocker ? ' blocker-selected' : ''}`}
              aria-current={isSelectedBlocker ? 'true' : undefined}
            >
              <button
                className="blocker-toggle"
                aria-expanded={isOpen}
                onClick={() => {
                  setOpenBlockerId(isOpen ? null : blocker.blocker_id);
                  if (!selectedActionForBlocker && linkedActions[0]) {
                    setSelectedActionState({
                      blockerId: blocker.blocker_id,
                      actionId: linkedActions[0].action_id
                    });
                  }
                }}
              >
                <div>
                  <strong>{blocker.description}</strong>
                  <small>{blocker.summary_line}</small>
                  <div className="blocker-summary-chips">
                    {blocker.due_by_local && (
                      <span className="sub-tag">
                        {formatSubchip(`Deadline: ${blocker.due_by_local}`, blocker.description)}
                      </span>
                    )}
                    {blocker.summary_line && (
                      <span className="sub-tag">
                        {formatSubchip(`Status: ${blocker.summary_line}`, blocker.description)}
                      </span>
                    )}
                  </div>
                  <div className="blocker-meta">
                    <span>Evidence: {blocker.evidence_summary.source_count} sources</span>
                    <span>Last updated: {blocker.evidence_summary.last_evidence_update_local}</span>
                  </div>
                </div>
                <span>{isOpen ? 'Hide' : 'Show'}</span>
              </button>

              <div className="blocker-local-actions">
                {linkedActions.map((action) => (
                  <div key={action.action_id} className="blocker-local-action-row">
                    <button
                      className={`secondary${effectiveSelected?.actionId === action.action_id ? ' action-selected' : ''}`}
                      aria-selected={effectiveSelected?.actionId === action.action_id ? 'true' : 'false'}
                      onClick={() =>
                        setSelectedActionState({
                          blockerId: blocker.blocker_id,
                          actionId: action.action_id
                        })
                      }
                    >
                      {effectiveSelected?.actionId === action.action_id
                        ? 'Selected for Quick Action Center'
                        : 'Select action for Quick Action Center'}
                    </button>
                    <p className="subtle">{action.title}</p>
                  </div>
                ))}
              </div>

              <div className="inline-actions">
                <button className="secondary" onClick={() => setTaskDraftByBlocker((prev) => ({ ...prev, [blocker.blocker_id]: prev[blocker.blocker_id] ?? '' }))}>
                  + Add blocker task
                </button>
                {selectedActionForBlocker && (
                  <button
                    className="secondary"
                    onClick={() =>
                      setAutomationStatusByAction((prev) => ({
                        ...prev,
                        [selectedActionForBlocker.action_id]:
                          (prev[selectedActionForBlocker.action_id] ?? 'IDLE') === 'RUNNING'
                            ? 'PAUSED'
                            : 'RUNNING'
                      }))
                    }
                  >
                    {(automationStatusByAction[selectedActionForBlocker.action_id] ?? 'IDLE') === 'RUNNING'
                      ? 'Pause automation'
                      : 'Start automation'}
                  </button>
                )}
              </div>

              {taskDraftByBlocker[blocker.blocker_id] !== undefined && (
                <div className="blocker-task-entry">
                  <input
                    type="text"
                    value={taskDraftByBlocker[blocker.blocker_id] ?? ''}
                    onChange={(event) =>
                      setTaskDraftByBlocker((prev) => ({
                        ...prev,
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

              {isOpen && (
                <>
                  {linkedInsights.length > 0 && (
                    <div className="blocker-insights">
                      <h4>Why this blocker matters</h4>
                      <ul className="insights">
                        {linkedInsights.map((insight) => (
                          <li key={insight.insight_id}>
                            <strong>{insight.title}</strong>
                            <p>{insight.value}</p>
                            <small>Confidence: {insight.confidence_label}</small>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <details className="evidence-drawer">
                    <summary>{blocker.evidence_summary.view_evidence_label}</summary>
                    <ul>
                      {linkedEvidence.map((item) => (
                        <li key={item.evidence_id}>
                          {item.source_label} - {item.author_or_system} - {item.timestamp_local}
                        </li>
                      ))}
                    </ul>
                  </details>

                  {blocker.nested_steps.length > 0 && (
                    <ul className="nested-steps">
                      {blocker.nested_steps.map((step) => (
                        <li key={step.step_id}>
                          <span>{step.step_id}</span>
                          <span>{step.label}</span>
                          <span>{step.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <ReferralTracking
                    blocker={blocker}
                    backgroundMode={
                      Boolean(selectedActionForBlocker) &&
                      (executionModeByAction[selectedActionForBlocker!.action_id] ??
                        selectedActionForBlocker!.execution_mode_default) === 'BACKGROUND'
                    }
                    primaryActionLabel={selectedActionForBlocker?.cta_primary}
                    onPrimaryAction={
                      selectedActionForBlocker
                        ? () =>
                            setSelectedActionState({
                              blockerId: blocker.blocker_id,
                              actionId: selectedActionForBlocker.action_id
                            })
                        : undefined
                    }
                    secondaryActionLabel={selectedActionForBlocker?.cta_secondary}
                    onSecondaryAction={
                      selectedActionForBlocker?.cta_secondary
                        ? () => onSecondaryAction(selectedActionForBlocker)
                        : undefined
                    }
                  />
                </>
              )}
            </li>
          );
        })}

        {localBlockers.map((blocker) => (
          <li key={blocker.blocker_id} className="blocker sev-yellow local-blocker">
            <div className="blocker-toggle">
              <div>
                <strong>{blocker.title}</strong>
                <small>{blocker.summary}</small>
                <div className="blocker-summary-chips">
                  <span className="sub-tag">Source: You added this</span>
                  <span className="sub-tag">Created: {new Date(blocker.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                </div>
              </div>
              <span>Manual</span>
            </div>
          </li>
        ))}
      </ul>

      {resolvedBlockers.length > 0 && (
        <details className="resolved-blockers">
          <summary>Resolved blockers ({resolvedBlockers.length})</summary>
          <ul className="blockers" style={{ marginTop: 8 }}>
            {resolvedBlockers.map((blocker) => (
              <li key={blocker.blocker_id} className="resolved-blocker">
                <strong>{blocker.description}</strong>
                <p>{blocker.summary_line}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      <MilestoneJourney
        patient={patient}
        blockerStatusOverride={blockerStatusOverride}
        currentStateId={currentStateId}
        onFocusBlocker={focusBlockerInView}
      />

      <AutomationCommandCenter
        actions={patient.proposed_actions.items}
        executionModeByAction={executionModeByAction}
        actionStatusOverride={actionStatusOverride}
        automationStatusByAction={automationStatusByAction}
        currentTimestamp={currentSnapshot?.timestamp_local}
        onSetExecutionMode={onExecutionModeChange}
        onSetAutomationStatus={(actionId, status) =>
          setAutomationStatusByAction((prev) => ({ ...prev, [actionId]: status }))
        }
      />

      {recentlyActedActions.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <h3>Recent outcomes</h3>
          {recentlyActedActions.map((action) => {
            const status = actionStatusOverride[action.action_id]!;
            return (
              <p key={action.action_id} style={{ margin: '4px 0' }}>
                <span className={`status-badge ${statusBadgeClass(status)}`}>{status}</span>{' '}
                {action.title}
              </p>
            );
          })}
        </div>
      )}
    </section>
  );
}
