import { useMemo, useState } from 'react';
import ActionModal from './components/ActionModal';
import FailureRecoveryModal from './components/FailureRecoveryModal';
import PatientDetail from './components/PatientDetail';
import ShiftStartSnapshot from './components/ShiftStartSnapshot';
import Worklist from './components/Worklist';
import { defaultStateByPatientId, patients } from './data/patients';
import type { ActionStatus, BlockerStatus, ExecutionModeDefault, ProposedAction } from './types/mockData';

type ViewMode = 'shift-start' | 'worklist';

interface PendingModalAction {
  action: ProposedAction;
  mode: ExecutionModeDefault;
}

function getNextStateId(patientId: string, currentStateId: string): string {
  const patient = patients.find((p) => p.meta.patient_id === patientId);
  if (!patient) return currentStateId;

  const states = patient.demo_state_snapshots.map((snapshot) => snapshot.state_id);
  const index = states.indexOf(currentStateId);
  if (index < 0 || index + 1 >= states.length) return currentStateId;
  return states[index + 1];
}

function defaultExecutionModes() {
  const map: Record<string, ExecutionModeDefault> = {};
  for (const patient of patients) {
    for (const action of patient.proposed_actions.items) {
      map[action.action_id] = action.execution_mode_default;
    }
  }
  return map;
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('worklist');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0].meta.patient_id);
  const [stateByPatientId, setStateByPatientId] = useState<Record<string, string>>(defaultStateByPatientId);
  const [actionStatusById, setActionStatusById] = useState<Record<string, ActionStatus>>({});
  const [blockerStatusById, setBlockerStatusById] = useState<Record<string, BlockerStatus>>({});
  const [executionModeByAction, setExecutionModeByAction] =
    useState<Record<string, ExecutionModeDefault>>(defaultExecutionModes);
  const [pendingModalAction, setPendingModalAction] = useState<PendingModalAction | null>(null);
  const [showHandoff, setShowHandoff] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.meta.patient_id === selectedPatientId) ?? patients[0],
    [selectedPatientId]
  );

  const applySnapshot = (patientId: string, stateId: string) => {
    const patient = patients.find((p) => p.meta.patient_id === patientId);
    if (!patient) return;

    const snapshot = patient.demo_state_snapshots.find((s) => s.state_id === stateId);
    if (!snapshot) return;

    setStateByPatientId((prev) => ({ ...prev, [patientId]: stateId }));

    setActionStatusById((prev) => {
      const next = { ...prev };
      for (const status of snapshot.action_statuses) {
        next[status.action_id] = status.status;
      }
      return next;
    });

    setBlockerStatusById((prev) => {
      const next = { ...prev };
      for (const status of snapshot.blocker_statuses) {
        next[status.blocker_id] = status.status;
      }
      return next;
    });
  };

  const handlePrimaryAction = (action: ProposedAction, mode: ExecutionModeDefault) => {
    setPendingModalAction({ action, mode });
  };

  const handleSecondaryAction = (action: ProposedAction) => {
    const text = action.cta_secondary?.toLowerCase() ?? '';
    const nextStatus: ActionStatus = text.includes('dismiss') ? 'DISMISSED' : 'SNOOZED';
    setActionStatusById((prev) => ({ ...prev, [action.action_id]: nextStatus }));
  };

  const confirmAction = () => {
    if (!pendingModalAction) return;

    const patientId = selectedPatient.meta.patient_id;
    setActionStatusById((prev) => ({ ...prev, [pendingModalAction.action.action_id]: 'EXECUTED' }));

    const currentStateId = stateByPatientId[patientId];
    const nextStateId = getNextStateId(patientId, currentStateId);
    if (nextStateId !== currentStateId) {
      applySnapshot(patientId, nextStateId);
    }

    setPendingModalAction(null);
  };

  // Find a failure recovery action for the current patient (PT-01 A-0102 channel switch)
  const failureRecoveryAction = useMemo(() => {
    return selectedPatient.proposed_actions.items.find(
      (a) => a.action_id === 'A-0102' && (actionStatusById[a.action_id] ?? a.status) === 'PROPOSED'
    ) ?? null;
  }, [selectedPatient, actionStatusById]);

  if (viewMode === 'shift-start') {
    return (
      <main>
        <header>
          <h1>Case Manager Prototype</h1>
          <p>Blocker-centric mock UI with evidence metadata and background-capable agent actions.</p>
        </header>
        <ShiftStartSnapshot
          patients={patients}
          onGoToWorklist={() => setViewMode('worklist')}
        />
      </main>
    );
  }

  return (
    <main>
      <header>
        <h1>Case Manager Prototype</h1>
        <p>Blocker-centric mock UI with evidence metadata and background-capable agent actions.</p>
      </header>

      <div className="demo-controls">
        <button onClick={() => setViewMode('shift-start')}>Show shift-start (S0)</button>
        <label>
          <input
            type="checkbox"
            checked={showHandoff}
            onChange={(e) => setShowHandoff(e.target.checked)}
          />
          Handoff mode (S6)
        </label>
        {failureRecoveryAction && (
          <button onClick={() => setShowFailureModal(true)}>Show failure recovery (S5)</button>
        )}
      </div>

      <div className="layout">
        <Worklist
          patients={patients}
          activePatientId={selectedPatient.meta.patient_id}
          stateByPatientId={stateByPatientId}
          onSelectPatient={setSelectedPatientId}
          showHandoff={showHandoff}
        />

        <PatientDetail
          patient={selectedPatient}
          currentStateId={stateByPatientId[selectedPatient.meta.patient_id]}
          actionStatusOverride={actionStatusById}
          blockerStatusOverride={blockerStatusById}
          executionModeByAction={executionModeByAction}
          onPrimaryAction={handlePrimaryAction}
          onSecondaryAction={handleSecondaryAction}
          onExecutionModeChange={(actionId, mode) =>
            setExecutionModeByAction((prev) => ({ ...prev, [actionId]: mode }))
          }
          onStateChange={(stateId) => applySnapshot(selectedPatient.meta.patient_id, stateId)}
          showHandoff={showHandoff}
        />
      </div>

      {pendingModalAction && (
        <ActionModal
          action={pendingModalAction.action}
          mode={pendingModalAction.mode}
          onClose={() => setPendingModalAction(null)}
          onConfirm={confirmAction}
        />
      )}

      {showFailureModal && failureRecoveryAction && (
        <FailureRecoveryModal
          failureReason="Fax delivery to Maplewood Rehab failed. Fax number 1-555-555-0194 returned busy signal after 3 retry attempts."
          recoveryAction={failureRecoveryAction}
          hasActiveBackgroundLoop={
            (executionModeByAction[failureRecoveryAction.action_id] ?? failureRecoveryAction.execution_mode_default) === 'BACKGROUND'
          }
          onRecoveryAction={() => {
            handlePrimaryAction(failureRecoveryAction, executionModeByAction[failureRecoveryAction.action_id] ?? failureRecoveryAction.execution_mode_default);
            setShowFailureModal(false);
          }}
          onPauseBackground={() => setShowFailureModal(false)}
          onDismiss={() => setShowFailureModal(false)}
        />
      )}
    </main>
  );
}
