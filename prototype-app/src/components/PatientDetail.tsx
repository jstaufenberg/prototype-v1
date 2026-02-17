import { useState } from 'react';
import BlockersTab from './patient-tabs/BlockersTab';
import ActivityTab from './patient-tabs/ActivityTab';
import ContextTab from './patient-tabs/ContextTab';
import type {
  ActionStatus,
  BlockerStatus,
  ExecutionModeDefault,
  PatientRecord,
  ProposedAction
} from '../types/mockData';

type PatientTab = 'blockers' | 'activity' | 'context';

const PATIENT_TABS: Array<{ id: PatientTab; label: string }> = [
  { id: 'blockers', label: 'Blockers' },
  { id: 'activity', label: 'Activity' },
  { id: 'context', label: 'Context' },
];

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

function computeAge(dob?: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
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
  const [activeTab, setActiveTab] = useState<PatientTab>('blockers');

  const age = computeAge(patient.patient_profile.dob);
  const sex = patient.patient_profile.sex ?? '';
  const demo = age != null ? `${age}${sex}` : sex || 'N/A';
  const bed = patient.patient_profile.current_location.bed;
  const disposition = patient.patient_profile.disposition_target;
  const bucket = patient.worklist_view_state.bucket_status;
  const activeBlockerCount = patient.blockers.items.filter(
    (b) => (blockerStatusOverride[b.blocker_id] ?? b.status) === 'ACTIVE'
  ).length;

  const bucketClass = (() => {
    if (bucket === 'Needs Action') return 'bucket-needs-action';
    if (bucket === 'Watch') return 'bucket-watch';
    if (bucket === 'In Progress') return 'bucket-in-progress';
    return 'bucket-on-track';
  })();

  return (
    <section className="panel detail-panel">
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
        <div className="detail-identity">
          <h2 className="detail-patient-line">
            {patient.patient_profile.patient_name} &middot; {demo} &middot; {bed}
          </h2>
          <p className="detail-disposition-line">
            &rarr; {disposition || 'TBD'} &middot;{' '}
            <span className={activeBlockerCount > 0 ? 'blocker-count-active' : 'blocker-count-zero'}>
              {activeBlockerCount} blocker{activeBlockerCount !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <div className="detail-header-right">
          <span className={`bucket ${bucketClass}`}>{bucket}</span>
          <button className="detail-close" aria-label="Close patient panel" onClick={onClose}>
            ×
          </button>
        </div>
      </div>

      <nav className="detail-tabs" role="tablist" aria-label="Patient sections">
        {PATIENT_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`detail-tab ${activeTab === tab.id ? 'detail-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="detail-tab-content">
        {activeTab === 'blockers' && (
          <BlockersTab
            patient={patient}
            currentStateId={currentStateId}
            actionStatusOverride={actionStatusOverride}
            blockerStatusOverride={blockerStatusOverride}
            executionModeByAction={executionModeByAction}
            onPrimaryAction={onPrimaryAction}
            onSecondaryAction={onSecondaryAction}
            onExecutionModeChange={onExecutionModeChange}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityTab patient={patient} />
        )}

        {activeTab === 'context' && (
          <ContextTab patient={patient} />
        )}
      </div>
    </section>
  );
}
