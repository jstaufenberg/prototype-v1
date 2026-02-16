import { useEffect, useMemo, useRef } from 'react';
import BlockerAutomationPanel, { type AutomationStatus } from './BlockerAutomationPanel';
import ReferralTracking from './ReferralTracking';
import { actionsForBlocker } from '../utils/patientActionSelection';
import type {
  ActionStatus,
  Blocker,
  ExecutionModeDefault,
  PatientRecord,
  ProposedAction
} from '../types/mockData';

interface BlockerWorkspaceModalProps {
  patient: PatientRecord;
  blocker: Blocker;
  actionStatusOverride: Record<string, ActionStatus>;
  executionModeByAction: Record<string, ExecutionModeDefault>;
  automationStatusByAction: Record<string, AutomationStatus>;
  currentTimestamp?: string | null;
  onPrimaryAction: (action: ProposedAction, mode: ExecutionModeDefault) => void;
  onSecondaryAction: (action: ProposedAction) => void;
  onExecutionModeChange: (actionId: string, mode: ExecutionModeDefault) => void;
  onAutomationStatusChange: (actionId: string, status: AutomationStatus) => void;
  onClose: () => void;
}

function statusClass(status: ActionStatus) {
  if (status === 'EXECUTED') return 'status-executed';
  if (status === 'DISMISSED') return 'status-dismissed';
  if (status === 'SNOOZED') return 'status-snoozed';
  if (status === 'FAILED') return 'status-failed';
  return '';
}

export default function BlockerWorkspaceModal({
  patient,
  blocker,
  actionStatusOverride,
  executionModeByAction,
  automationStatusByAction,
  currentTimestamp,
  onPrimaryAction,
  onSecondaryAction,
  onExecutionModeChange,
  onAutomationStatusChange,
  onClose
}: BlockerWorkspaceModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    modalRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  const linkedEvidence = useMemo(
    () =>
      patient.evidence_items.items.filter((item) => item.linked_to.blocker_ids.includes(blocker.blocker_id)),
    [patient.evidence_items.items, blocker.blocker_id]
  );

  const evidenceIds = useMemo(() => new Set(linkedEvidence.map((item) => item.evidence_id)), [linkedEvidence]);

  const linkedInsights = useMemo(
    () =>
      patient.parsed_insights.items.filter((insight) =>
        (insight.evidence_refs ?? []).some((ref) => evidenceIds.has(ref))
      ),
    [patient.parsed_insights.items, evidenceIds]
  );

  const linkedActions = useMemo(
    () => actionsForBlocker(blocker, patient.proposed_actions.items),
    [blocker, patient.proposed_actions.items]
  );

  const primaryTrackingAction = linkedActions.find((action) => {
    const status = actionStatusOverride[action.action_id] ?? action.status;
    return status === 'PROPOSED' || status === 'SNOOZED';
  });

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="blocker-workspace-title">
      <div className="modal blocker-workspace-modal" ref={modalRef} tabIndex={-1}>
        <div className="blocker-workspace-head">
          <div>
            <h3 id="blocker-workspace-title">{blocker.description}</h3>
            <p className="subtle">
              Severity: {blocker.severity} · Status: {blocker.status}
            </p>
            <p className="subtle">
              Owner: {blocker.owner ?? 'Unassigned'}
              {blocker.due_by_local ? ` · Due by ${blocker.due_by_local}` : ''}
            </p>
          </div>
          <button className="detail-close" aria-label="Close blocker workspace" onClick={onClose}>
            ×
          </button>
        </div>

        <section className="blocker-workspace-section">
          <h4>Why this blocker matters</h4>
          <p>{blocker.summary_line}</p>
          {linkedInsights.length > 0 && (
            <ul className="insights">
              {linkedInsights.map((insight) => (
                <li key={insight.insight_id}>
                  <strong>{insight.title}</strong>
                  <p>{insight.value}</p>
                  <small>Confidence: {insight.confidence_label}</small>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="blocker-workspace-section">
          <h4>Evidence</h4>
          <p className="subtle">Evidence: {linkedEvidence.length || blocker.evidence_summary.source_count} sources</p>
          <details className="evidence-drawer">
            <summary>{blocker.evidence_summary.view_evidence_label}</summary>
            <ul>
              {linkedEvidence.map((item) => (
                <li key={item.evidence_id}>
                  {item.source_label} · {item.author_or_system} · {item.timestamp_local}
                </li>
              ))}
            </ul>
          </details>
        </section>

        <section className="blocker-workspace-section">
          <h4>Progress steps</h4>
          {blocker.nested_steps.length === 0 ? (
            <p className="subtle">No progress steps configured.</p>
          ) : (
            <ul className="nested-steps">
              {blocker.nested_steps.map((step) => (
                <li key={step.step_id}>
                  <span>{step.label}</span>
                  <span>{step.step_kind}</span>
                  <span>{step.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="blocker-workspace-section">
          <h4>Decisions and actions</h4>
          {linkedActions.length === 0 ? (
            <p className="subtle">No linked actions available.</p>
          ) : (
            <div className="blocker-workspace-actions">
              {linkedActions.map((action) => {
                const mode = executionModeByAction[action.action_id] ?? action.execution_mode_default;
                const status = actionStatusOverride[action.action_id] ?? action.status;
                const isRunnable = status === 'PROPOSED' || status === 'SNOOZED';

                return (
                  <article key={action.action_id} className="action-card">
                    <strong>{action.title}</strong>
                    <p>{action.reason}</p>
                    <p>
                      <span className={`status-badge ${statusClass(status)}`}>{status}</span>
                    </p>
                    <div className="action-mode">
                      <label htmlFor={`workspace-mode-${action.action_id}`}>Mode</label>
                      <select
                        id={`workspace-mode-${action.action_id}`}
                        value={mode}
                        onChange={(event) =>
                          onExecutionModeChange(
                            action.action_id,
                            event.target.value as ExecutionModeDefault
                          )
                        }
                      >
                        <option value="ONE_TIME">One-time</option>
                        <option value="BACKGROUND">Keep monitoring in background</option>
                      </select>
                    </div>
                    <div className="action-buttons">
                      <button
                        className="primary-action"
                        disabled={!isRunnable}
                        onClick={() => onPrimaryAction(action, mode)}
                      >
                        {action.cta_primary}
                      </button>
                      {action.cta_secondary && (
                        <button
                          className="secondary"
                          disabled={!isRunnable}
                          onClick={() => onSecondaryAction(action)}
                        >
                          {action.cta_secondary}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <ReferralTracking
            blocker={blocker}
            backgroundMode={
              Boolean(primaryTrackingAction) &&
              (executionModeByAction[primaryTrackingAction!.action_id] ??
                primaryTrackingAction!.execution_mode_default) === 'BACKGROUND'
            }
            primaryActionLabel={primaryTrackingAction?.cta_primary}
            onPrimaryAction={
              primaryTrackingAction
                ? () =>
                    onPrimaryAction(
                      primaryTrackingAction,
                      executionModeByAction[primaryTrackingAction.action_id] ??
                        primaryTrackingAction.execution_mode_default
                    )
                : undefined
            }
            secondaryActionLabel={primaryTrackingAction?.cta_secondary}
            onSecondaryAction={
              primaryTrackingAction?.cta_secondary
                ? () => onSecondaryAction(primaryTrackingAction)
                : undefined
            }
          />
        </section>

        <section className="blocker-workspace-section">
          <h4>Automation for this blocker</h4>
          <BlockerAutomationPanel
            actions={linkedActions}
            executionModeByAction={executionModeByAction}
            actionStatusOverride={actionStatusOverride}
            automationStatusByAction={automationStatusByAction}
            currentTimestamp={currentTimestamp}
            onExecutionModeChange={onExecutionModeChange}
            onAutomationStatusChange={onAutomationStatusChange}
          />
        </section>

        <section className="blocker-workspace-section">
          <h4>Activity log</h4>
          <ul className="blocker-activity-log">
            {blocker.nested_steps.map((step) => (
              <li key={`step-${step.step_id}`}>
                {step.last_updated_local ?? 'No timestamp'} · {step.label} · {step.status}
              </li>
            ))}
            {linkedActions.map((action) => (
              <li key={`action-${action.action_id}`}>
                {currentTimestamp ?? 'Current state'} · {action.title} ·{' '}
                {actionStatusOverride[action.action_id] ?? action.status}
              </li>
            ))}
          </ul>
        </section>

        <div className="modal-buttons modal-footer-sticky">
          <button className="secondary" onClick={onClose}>
            Close blocker workspace
          </button>
        </div>
      </div>
    </div>
  );
}
