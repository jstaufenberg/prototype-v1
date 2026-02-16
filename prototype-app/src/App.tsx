import { useEffect, useMemo, useState } from 'react';
import ActionModal from './components/ActionModal';
import FailureRecoveryModal from './components/FailureRecoveryModal';
import NetworkView from './components/NetworkView';
import SystemStatusView from './components/SystemStatusView';
import PatientDetail from './components/PatientDetail';
import PerformanceView from './components/PerformanceView';
import TopBanner from './components/TopBanner';
import Worklist from './components/Worklist';
import { defaultStateByPatientId, patients } from './data/patients';
import type { ActionStatus, BlockerStatus, ExecutionModeDefault, ProposedAction } from './types/mockData';

// ShiftStartSnapshot kept in codebase for future use — not rendered in default flow
// import ShiftStartSnapshot from './components/ShiftStartSnapshot';

type AppTab = 'my-patients' | 'system-status' | 'my-network' | 'performance';

const TAB_ITEMS: Array<{ id: AppTab; label: string }> = [
  { id: 'my-patients', label: 'My Patients' },
  { id: 'system-status', label: 'System Status' },
  { id: 'my-network', label: 'My Network' },
  { id: 'performance', label: 'Performance' },
];

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

function isDemoMode(): boolean {
  return new URLSearchParams(window.location.search).get('demo') === '1';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('my-patients');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [stateByPatientId, setStateByPatientId] = useState<Record<string, string>>(defaultStateByPatientId);
  const [actionStatusById, setActionStatusById] = useState<Record<string, ActionStatus>>({});
  const [blockerStatusById, setBlockerStatusById] = useState<Record<string, BlockerStatus>>({});
  const [executionModeByAction, setExecutionModeByAction] =
    useState<Record<string, ExecutionModeDefault>>(defaultExecutionModes);
  const [pendingModalAction, setPendingModalAction] = useState<PendingModalAction | null>(null);
  const [showHandoff, setShowHandoff] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);

  const selectedPatient = useMemo(
    () => (selectedPatientId ? patients.find((p) => p.meta.patient_id === selectedPatientId) ?? null : null),
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

  // Demo mode: keyboard shortcuts and console controls (only when ?demo=1)
  useEffect(() => {
    if (!isDemoMode()) return;

    (window as unknown as Record<string, unknown>).__meridianDemo = {
      applySnapshot,
      setShowHandoff,
      setShowFailureModal,
      stateByPatientId,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) return;
      if (e.key === 'H' || e.key === 'h') {
        e.preventDefault();
        setShowHandoff((prev) => !prev);
      }
      if (e.key === 'F' || e.key === 'f') {
        e.preventDefault();
        setShowFailureModal(true);
      }
      if ((e.key === '1' || e.key === '2' || e.key === '3') && selectedPatient) {
        e.preventDefault();
        applySnapshot(selectedPatient.meta.patient_id, `T${Number(e.key) - 1}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      delete (window as unknown as Record<string, unknown>).__meridianDemo;
    };
  });

  const handlePrimaryAction = (action: ProposedAction, mode: ExecutionModeDefault) => {
    setPendingModalAction({ action, mode });
  };

  const handleSecondaryAction = (action: ProposedAction) => {
    const text = action.cta_secondary?.toLowerCase() ?? '';
    const nextStatus: ActionStatus = text.includes('dismiss') ? 'DISMISSED' : 'SNOOZED';
    setActionStatusById((prev) => ({ ...prev, [action.action_id]: nextStatus }));
  };

  const confirmAction = () => {
    if (!pendingModalAction || !selectedPatient) return;

    const patientId = selectedPatient.meta.patient_id;
    setActionStatusById((prev) => ({ ...prev, [pendingModalAction.action.action_id]: 'EXECUTED' }));

    const currentStateId = stateByPatientId[patientId];
    const nextStateId = getNextStateId(patientId, currentStateId);
    if (nextStateId !== currentStateId) {
      applySnapshot(patientId, nextStateId);
    }

    setPendingModalAction(null);
  };

  const failureRecoveryAction = useMemo(() => {
    if (!selectedPatient) return null;
    return selectedPatient.proposed_actions.items.find(
      (a) => a.action_id === 'A-0102' && (actionStatusById[a.action_id] ?? a.status) === 'PROPOSED'
    ) ?? null;
  }, [selectedPatient, actionStatusById]);

  return (
    <>
      <TopBanner />
      <main>
        <header className="app-header">
          <h1>Care Transitions</h1>
          <p>Coordinating safe, timely discharges across your caseload</p>
        </header>

        <nav className="app-tabs" role="tablist" aria-label="Workspace sections">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`app-tab ${activeTab === tab.id ? 'app-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === 'my-patients' && (
          <div className="layout">
            <Worklist
              patients={patients}
              activePatientId={selectedPatient?.meta.patient_id ?? null}
              stateByPatientId={stateByPatientId}
              onSelectPatient={setSelectedPatientId}
              showHandoff={showHandoff}
            />

            {selectedPatient ? (
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
                onClose={() => setSelectedPatientId(null)}
                showHandoff={showHandoff}
              />
            ) : (
              <section className="panel detail-empty-panel" aria-label="No patient selected">
                <button className="detail-close" aria-label="Close patient panel" disabled>
                  ×
                </button>
                <h2>No patient selected</h2>
                <p className="subtle">Select a patient on the left to view plan and actions.</p>
                <div className="detail-empty-shell">
                  <div className="shell-line shell-title" />
                  <div className="shell-line shell-meta" />
                  <div className="shell-block">
                    <div className="shell-line shell-label" />
                    <div className="shell-line shell-body" />
                    <div className="shell-line shell-body" />
                  </div>
                  <div className="shell-block">
                    <div className="shell-line shell-label" />
                    <div className="shell-line shell-body" />
                    <div className="shell-line shell-body short" />
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'system-status' && (
          <SystemStatusView
            patients={patients}
            actionStatusById={actionStatusById}
            executionModeByAction={executionModeByAction}
            blockerStatusById={blockerStatusById}
          />
        )}

        {activeTab === 'my-network' && (
          <NetworkView />
        )}

        {activeTab === 'performance' && (
          <PerformanceView
            patients={patients}
            actionStatusById={actionStatusById}
            blockerStatusById={blockerStatusById}
          />
        )}

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
    </>
  );
}
