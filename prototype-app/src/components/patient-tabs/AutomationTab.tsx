import { useMemo, useState } from 'react';
import type { ActionStatus, ExecutionModeDefault, PatientRecord, ProposedAction } from '../../types/mockData';

interface AutomationTabProps {
  patient: PatientRecord;
  actionStatusOverride: Record<string, ActionStatus>;
  executionModeByAction: Record<string, ExecutionModeDefault>;
  onExecutionModeChange: (actionId: string, mode: ExecutionModeDefault) => void;
}

type AgentStatus = 'RUNNING' | 'PAUSED' | 'IDLE' | 'FAILED';

type WizardStep = 1 | 2 | 3 | 4 | 'review';

interface WizardState {
  isOpen: boolean;
  step: WizardStep;
  actionType: string | null;
  description: string;
  method: string | null;
  cadenceHours: number;
  stopType: string | null;
  stopConditionText: string;
  maxDurationHours: number;
}

interface LocalAutomation {
  id: string;
  title: string;
  actionType: string;
  method: string;
  cadenceHours: number;
  stopCondition: string;
  status: 'RUNNING';
}

const ACTION_TYPES = [
  { value: 'MONITORING', label: 'Monitor a condition' },
  { value: 'OUTREACH', label: 'Send outreach' },
  { value: 'FINDING', label: 'Track a finding' },
  { value: 'TASK', label: 'Run a recurring task' }
];

const METHODS = [
  { value: 'CHECK_EHR', label: 'Check EHR' },
  { value: 'CALL_FACILITY', label: 'Call facility' },
  { value: 'SEND_FAX', label: 'Send fax' },
  { value: 'SEND_MESSAGE', label: 'Send message' },
  { value: 'REVIEW_NOTES', label: 'Review notes' }
];

const CADENCE_OPTIONS = [1, 2, 4, 8, 24];

const STOP_TYPES = [
  { value: 'CONDITION_MET', label: 'Condition is met' },
  { value: 'DURATION_REACHED', label: 'After a set time' },
  { value: 'MANUAL_STOP', label: 'Until I stop it' }
];

const INITIAL_WIZARD: WizardState = {
  isOpen: false,
  step: 1,
  actionType: null,
  description: '',
  method: null,
  cadenceHours: 4,
  stopType: null,
  stopConditionText: '',
  maxDurationHours: 24
};

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

function actionTypeLabel(value: string | null) {
  return ACTION_TYPES.find((t) => t.value === value)?.label ?? '___';
}

function methodLabel(value: string | null) {
  return METHODS.find((m) => m.value === value)?.label.toLowerCase() ?? '___';
}

function stopLabel(stopType: string | null, text: string, hours: number) {
  if (stopType === 'CONDITION_MET') return text || '___';
  if (stopType === 'DURATION_REACHED') return `${hours}h elapsed`;
  if (stopType === 'MANUAL_STOP') return 'I stop it';
  return '___';
}

export default function AutomationTab({
  patient,
  actionStatusOverride,
  executionModeByAction,
  onExecutionModeChange
}: AutomationTabProps) {
  const [logExpanded, setLogExpanded] = useState(false);
  const [configExpanded, setConfigExpanded] = useState(false);
  const [wizard, setWizard] = useState<WizardState>(INITIAL_WIZARD);
  const [localAutomations, setLocalAutomations] = useState<LocalAutomation[]>([]);

  const agentRows = useMemo(() => {
    return patient.proposed_actions.items.map((action) => {
      const mode = executionModeByAction[action.action_id] ?? action.execution_mode_default;
      const status = actionStatusOverride[action.action_id] ?? action.status;
      const agentStatus = agentStatusForAction(action, mode, status);
      return { action, mode, actionStatus: status, agentStatus };
    });
  }, [patient.proposed_actions.items, executionModeByAction, actionStatusOverride]);

  const totalCount = agentRows.length + localAutomations.length;
  const runningCount = agentRows.filter((r) => r.agentStatus === 'RUNNING').length + localAutomations.length;

  const logEntries = patient.execution_log?.entries ?? [];
  const visibleLog = logExpanded ? logEntries : logEntries.slice(0, 3);

  const updateWizard = (patch: Partial<WizardState>) => setWizard((prev) => ({ ...prev, ...patch }));

  const canAdvance = (step: WizardStep): boolean => {
    if (step === 1) return wizard.actionType !== null;
    if (step === 2) return wizard.description.trim() !== '' && wizard.method !== null;
    if (step === 3) return wizard.cadenceHours > 0;
    if (step === 4) {
      if (!wizard.stopType) return false;
      if (wizard.stopType === 'CONDITION_MET' && !wizard.stopConditionText.trim()) return false;
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (wizard.step === 'review') return;
    const next = wizard.step === 4 ? 'review' : ((wizard.step + 1) as WizardStep);
    updateWizard({ step: next });
  };

  const prevStep = () => {
    if (wizard.step === 1) return;
    const prev = wizard.step === 'review' ? 4 : ((wizard.step - 1) as WizardStep);
    updateWizard({ step: prev });
  };

  const createAutomation = () => {
    const auto: LocalAutomation = {
      id: `LOCAL-A-${localAutomations.length + 1}`,
      title: wizard.description.trim(),
      actionType: wizard.actionType ?? 'MONITORING',
      method: wizard.method ?? 'CHECK_EHR',
      cadenceHours: wizard.cadenceHours,
      stopCondition: stopLabel(wizard.stopType, wizard.stopConditionText, wizard.maxDurationHours),
      status: 'RUNNING'
    };
    setLocalAutomations((prev) => [...prev, auto]);
    setWizard(INITIAL_WIZARD);
  };

  const patientName = patient.patient_profile.patient_name;

  /* ── Sentence preview ── */
  const sentenceSlot = (filled: boolean, text: string) =>
    filled ? <span className="wizard-sentence-slot">{text}</span> : <span className="wizard-sentence-placeholder">{text}</span>;

  const renderSentence = () => (
    <div className="wizard-sentence">
      I want to {sentenceSlot(wizard.actionType !== null, actionTypeLabel(wizard.actionType).toLowerCase())}{' '}
      for {sentenceSlot(true, patientName)}{' '}
      by {sentenceSlot(wizard.method !== null, wizard.description.trim() ? `${methodLabel(wizard.method)} (${wizard.description.trim()})` : methodLabel(wizard.method))}{' '}
      every {sentenceSlot(wizard.step === 3 || wizard.step === 4 || wizard.step === 'review', `${wizard.cadenceHours}h`)}{' '}
      until {sentenceSlot(wizard.stopType !== null, stopLabel(wizard.stopType, wizard.stopConditionText, wizard.maxDurationHours))}
    </div>
  );

  return (
    <>
      {/* Active Monitoring */}
      <div className="section-head">
        <h3>Active Monitoring ({runningCount}/{totalCount})</h3>
      </div>

      {agentRows.length === 0 && localAutomations.length === 0 ? (
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

          {localAutomations.map((auto) => (
            <li key={auto.id} className="automation-row local-automation">
              <div className="automation-row-header">
                <strong>{auto.title}</strong>
                <span className="agent-status-chip agent-running">RUNNING</span>
              </div>
              <div className="automation-row-meta">
                <span>{actionTypeLabel(auto.actionType)}</span>
                <span>Every {auto.cadenceHours}h</span>
                <span>Until {auto.stopCondition}</span>
              </div>
              <p className="subtle">You created this</p>
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
                    Every {action.background_policy.cadence_hours}h
                    <span className="sep-dot" aria-hidden="true"> · </span>
                    Max {action.background_policy.max_duration_hours}h
                    <span className="sep-dot" aria-hidden="true"> · </span>
                    Stops: {action.background_policy.stop_conditions.join(', ')}
                  </div>
                )}
              </div>
            );
          })}

          {!wizard.isOpen ? (
            <button className="secondary" onClick={() => updateWizard({ isOpen: true, step: 1 })}>
              + Set up new automation
            </button>
          ) : (
            <div className="automation-wizard">
              <h4>New automation</h4>
              {renderSentence()}

              {/* Step 1: What */}
              {wizard.step === 1 && (
                <div className="wizard-step">
                  <span className="wizard-step-label">Step 1 — What do you want to automate?</span>
                  <div className="wizard-options">
                    {ACTION_TYPES.map((t) => (
                      <button
                        key={t.value}
                        className={`wizard-option ${wizard.actionType === t.value ? 'wizard-option-selected' : ''}`}
                        onClick={() => updateWizard({ actionType: t.value })}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: How */}
              {wizard.step === 2 && (
                <div className="wizard-step">
                  <span className="wizard-step-label">Step 2 — What specifically, and how?</span>
                  <input
                    className="wizard-input"
                    type="text"
                    value={wizard.description}
                    onChange={(e) => updateWizard({ description: e.target.value })}
                    placeholder="e.g., insurance auth status, bed availability, vital signs"
                  />
                  <div className="wizard-options">
                    {METHODS.map((m) => (
                      <button
                        key={m.value}
                        className={`wizard-option ${wizard.method === m.value ? 'wizard-option-selected' : ''}`}
                        onClick={() => updateWizard({ method: m.value })}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: When */}
              {wizard.step === 3 && (
                <div className="wizard-step">
                  <span className="wizard-step-label">Step 3 — How often?</span>
                  <div className="wizard-options">
                    {CADENCE_OPTIONS.map((h) => (
                      <button
                        key={h}
                        className={`wizard-option ${wizard.cadenceHours === h ? 'wizard-option-selected' : ''}`}
                        onClick={() => updateWizard({ cadenceHours: h })}
                      >
                        Every {h}h
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Until */}
              {wizard.step === 4 && (
                <div className="wizard-step">
                  <span className="wizard-step-label">Step 4 — When should it stop?</span>
                  <div className="wizard-options">
                    {STOP_TYPES.map((s) => (
                      <button
                        key={s.value}
                        className={`wizard-option ${wizard.stopType === s.value ? 'wizard-option-selected' : ''}`}
                        onClick={() => updateWizard({ stopType: s.value })}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {wizard.stopType === 'CONDITION_MET' && (
                    <input
                      className="wizard-input"
                      type="text"
                      value={wizard.stopConditionText}
                      onChange={(e) => updateWizard({ stopConditionText: e.target.value })}
                      placeholder="e.g., auth is approved, bed is confirmed"
                    />
                  )}
                  {wizard.stopType === 'DURATION_REACHED' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="subtle">Stop after</span>
                      <input
                        className="wizard-input"
                        type="number"
                        min={1}
                        style={{ width: 80 }}
                        value={wizard.maxDurationHours}
                        onChange={(e) => updateWizard({ maxDurationHours: Number(e.target.value) || 24 })}
                      />
                      <span className="subtle">hours</span>
                    </div>
                  )}
                </div>
              )}

              {/* Review */}
              {wizard.step === 'review' && (
                <div className="wizard-step">
                  <span className="wizard-step-label">Review</span>
                  <p>Confirm the automation above looks correct, then create it.</p>
                </div>
              )}

              {/* Navigation */}
              <div className="wizard-nav">
                <button className="secondary" onClick={() => {
                  if (wizard.step === 1) {
                    setWizard(INITIAL_WIZARD);
                  } else {
                    prevStep();
                  }
                }}>
                  {wizard.step === 1 ? 'Cancel' : 'Back'}
                </button>
                {wizard.step === 'review' ? (
                  <button className="primary-action" onClick={createAutomation}>
                    Create automation
                  </button>
                ) : (
                  <button
                    className="primary-action"
                    disabled={!canAdvance(wizard.step)}
                    onClick={nextStep}
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
