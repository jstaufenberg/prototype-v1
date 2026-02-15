import { useMemo, useState } from 'react';
import ReferralTracking from './ReferralTracking';
import StickyActionBar from './StickyActionBar';
import { formatSubchip } from '../utils/chipLanguage';
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
  onStateChange: (stateId: string) => void;
  onClose: () => void;
  showHandoff?: boolean;
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
  onStateChange,
  onClose,
  showHandoff
}: PatientDetailProps) {
  const [openBlockerId, setOpenBlockerId] = useState<string | null>(null);

  const evidenceById = useMemo(
    () => Object.fromEntries(patient.evidence_items.items.map((item) => [item.evidence_id, item])),
    [patient.evidence_items.items]
  );

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

  const recentlyActedActions = useMemo(() => {
    return patient.proposed_actions.items.filter((action) => {
      const status = actionStatusOverride[action.action_id];
      return status === 'EXECUTED' || status === 'DISMISSED' || status === 'SNOOZED';
    });
  }, [patient.proposed_actions.items, actionStatusOverride]);

  const proposedActions = useMemo(() => {
    return patient.proposed_actions.items
      .filter((action) => {
        const status = actionStatusOverride[action.action_id] ?? action.status;
        return status === 'PROPOSED' || status === 'SNOOZED';
      })
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  }, [patient.proposed_actions.items, actionStatusOverride]);

  const primaryAction = proposedActions[0] ?? null;
  const secondaryActions = proposedActions.slice(1);
  const primaryActionMode = primaryAction
    ? executionModeByAction[primaryAction.action_id] ?? primaryAction.execution_mode_default
    : 'ONE_TIME';
  const hasRecommendedAction = Boolean(primaryAction);

  const currentSnapshot = patient.demo_state_snapshots.find((s) => s.state_id === currentStateId);

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
          <span className="patient-id">{patient.meta.patient_id}</span>
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

      <div className="state-strip">
        <label htmlFor="state-select">State view</label>
        <select
          id="state-select"
          value={currentStateId}
          onChange={(event) => onStateChange(event.target.value)}
        >
          {patient.demo_state_snapshots.map((snapshot) => (
            <option key={snapshot.state_id} value={snapshot.state_id}>
              {snapshot.state_id} - {snapshot.label}
            </option>
          ))}
        </select>
        <span className="subtle">{currentSnapshot?.timestamp_local}</span>
      </div>
      <div className="panel-top-actions">
        <StickyActionBar
          stickyOffset={0}
          compact
          contextText="Recommended next action"
          primaryAction={
            hasRecommendedAction ? (
              <button
                className="primary-action"
                onClick={() => onPrimaryAction(primaryAction, primaryActionMode)}
              >
                {primaryAction.cta_primary}
              </button>
            ) : undefined
          }
          secondaryActions={
            hasRecommendedAction ? (
              <div className="inline-actions">
                {primaryAction.cta_secondary && (
                  <button className="secondary" onClick={() => onSecondaryAction(primaryAction)}>
                    {primaryAction.cta_secondary}
                  </button>
                )}
              </div>
            ) : (
              <span className="subtle">No action needed now.</span>
            )
          }
        />
      </div>

      <h3>Active blockers</h3>
      <ul className="blockers">
        {activeBlockers.map((blocker) => {
          const isOpen = openBlockerId === blocker.blocker_id;
          const linkedEvidence = patient.evidence_items.items.filter((e) =>
            e.linked_to.blocker_ids.includes(blocker.blocker_id)
          );

          return (
            <li key={blocker.blocker_id} className={`blocker ${severityClass(blocker.severity)}`}>
              <button
                className="blocker-toggle"
                aria-expanded={isOpen}
                onClick={() => setOpenBlockerId(isOpen ? null : blocker.blocker_id)}
              >
                <div>
                  <strong>{blocker.blocker_id}</strong>
                  <p>{blocker.description}</p>
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
                    <span>
                      Evidence: {blocker.evidence_summary.source_count} sources
                    </span>
                    <span>
                      Last updated: {blocker.evidence_summary.last_evidence_update_local}
                    </span>
                  </div>
                </div>
                <span>{isOpen ? 'Hide' : 'Show'}</span>
              </button>

              {isOpen && (
                <>
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
                    backgroundMode={primaryActionMode === 'BACKGROUND'}
                    primaryActionLabel={primaryAction?.cta_primary}
                    onPrimaryAction={
                      hasRecommendedAction
                        ? () => onPrimaryAction(primaryAction, primaryActionMode)
                        : undefined
                    }
                    secondaryActionLabel={primaryAction?.cta_secondary}
                    onSecondaryAction={
                      hasRecommendedAction && primaryAction?.cta_secondary
                        ? () => onSecondaryAction(primaryAction)
                        : undefined
                    }
                  />
                </>
              )}
            </li>
          );
        })}
      </ul>

      {resolvedBlockers.length > 0 && (
        <details className="resolved-blockers">
          <summary>Resolved blockers ({resolvedBlockers.length})</summary>
          <ul className="blockers" style={{ marginTop: 8 }}>
            {resolvedBlockers.map((blocker) => (
              <li key={blocker.blocker_id} className="resolved-blocker">
                <strong>{blocker.blocker_id}</strong>
                <p>{blocker.description}</p>
                <small>{blocker.summary_line}</small>
              </li>
            ))}
          </ul>
        </details>
      )}

      <h3>What the agent found</h3>
      <ul className="insights">
        {patient.parsed_insights.items.map((insight) => {
          const insightEvidence = (insight.evidence_refs ?? [])
            .map((id) => evidenceById[id])
            .filter(Boolean);

          return (
            <li key={insight.insight_id}>
              <strong>{insight.title}</strong>
              <p>{insight.value}</p>
              <small>{insight.confidence_label} confidence</small>
              {insightEvidence.length > 0 && (
                <details className="evidence-drawer">
                  <summary>View evidence ({insightEvidence.length})</summary>
                  <ul>
                    {insightEvidence.map((item) => (
                      <li key={item.evidence_id}>
                        {item.source_label} - {item.author_or_system} - {item.timestamp_local}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ul>

      {recentlyActedActions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
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

      <h3>Recommended action</h3>
      <ul className="actions">
        {!primaryAction && <li className="subtle">No action needed now.</li>}

        {primaryAction && (
          <li key={primaryAction.action_id} className="action-card">
            <div>
              <strong>{primaryAction.title}</strong>
              <p>{primaryAction.reason}</p>
              <small>{primaryAction.permission_microcopy}</small>
            </div>

            {(() => {
              const actionEvidence = patient.evidence_items.items.filter((item) =>
                item.linked_to.action_ids.includes(primaryAction.action_id)
              );
              return (
                <>
                  <p className="subtle">
                    Evidence: {actionEvidence.length} sources
                  </p>
                  {actionEvidence.length > 0 && (
                    <details className="evidence-drawer">
                      <summary>View evidence ({actionEvidence.length})</summary>
                      <ul>
                        {actionEvidence.map((item) => (
                          <li key={item.evidence_id}>
                            {item.source_label} - {item.author_or_system} - {item.timestamp_local}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              );
            })()}

            <div className="action-mode">
              <label htmlFor={`mode-${primaryAction.action_id}`}>Mode</label>
              <select
                id={`mode-${primaryAction.action_id}`}
                value={executionModeByAction[primaryAction.action_id] ?? primaryAction.execution_mode_default}
                onChange={(event) =>
                  onExecutionModeChange(
                    primaryAction.action_id,
                    event.target.value as ExecutionModeDefault
                  )
                }
              >
                <option value="ONE_TIME">One-time</option>
                <option value="BACKGROUND">Keep monitoring in background</option>
              </select>
            </div>

            {(executionModeByAction[primaryAction.action_id] ?? primaryAction.execution_mode_default) ===
              'BACKGROUND' && (
              <>
                <p className="subtle">
                  Background preset: every {primaryAction.background_policy.cadence_hours}h for up to{' '}
                  {primaryAction.background_policy.max_duration_hours}h. Notify on{' '}
                  {primaryAction.background_policy.notify_on.join(', ')}.
                </p>
                {primaryAction.background_policy.stop_conditions.length > 0 && (
                  <ul className="guardrails">
                    {primaryAction.background_policy.stop_conditions.map((condition) => (
                      <li key={condition}>{condition}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
            <p className="subtle">Use the sticky action bar to run or defer this action.</p>
          </li>
        )}
      </ul>

      {secondaryActions.length > 0 && (
        <details className="other-actions">
          <summary>Other possible actions ({secondaryActions.length})</summary>
          <ul className="actions">
            {secondaryActions.map((action) => (
              <li key={action.action_id} className="action-card secondary-card">
                <strong>{action.title}</strong>
                <p>{action.reason}</p>
                <button onClick={() => onPrimaryAction(action, executionModeByAction[action.action_id] ?? action.execution_mode_default)}>
                  {action.cta_primary}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
