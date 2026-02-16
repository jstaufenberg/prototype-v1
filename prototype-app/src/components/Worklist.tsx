import type { ActionStatus, BlockerStatus, ExecutionModeDefault, PatientRecord } from '../types/mockData';
import { groupChips } from '../utils/chipGrouping';
import WorklistCardTabs from './WorklistCardTabs';

interface WorklistProps {
  patients: PatientRecord[];
  activePatientId: string | null;
  stateByPatientId: Record<string, string>;
  actionStatusById: Record<string, ActionStatus>;
  blockerStatusById: Record<string, BlockerStatus>;
  executionModeByAction: Record<string, ExecutionModeDefault>;
  onSelectPatient: (patientId: string | null) => void;
  showHandoff?: boolean;
}

function getSnapshot(patient: PatientRecord, stateId: string) {
  return patient.demo_state_snapshots.find((snapshot) => snapshot.state_id === stateId);
}

function bucketRank(bucket: string) {
  if (bucket === 'Delayed') return 0;
  if (bucket === 'At Risk') return 1;
  if (bucket === 'Pending') return 2;
  return 3;
}

function bucketClass(bucket: string) {
  if (bucket === 'Delayed') return 'bucket-delayed';
  if (bucket === 'At Risk') return 'bucket-at-risk';
  if (bucket === 'Pending') return 'bucket-pending';
  return 'bucket-on-track';
}

function computeAge(dob?: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  const birthdayPassed = monthDelta > 0 || (monthDelta === 0 && today.getDate() >= birth.getDate());
  if (!birthdayPassed) age -= 1;
  return age >= 0 ? age : null;
}

function demographicToken(age: number | null, sex?: string | null): string {
  if (age == null) return sex ?? 'N/A';
  return `${age}${sex ?? ''}`;
}

function urgencyLabel(bucket: string, allText: string): string | null {
  const normalized = allText.toLowerCase();
  if (bucket === 'On Track' && normalized.includes('discharge')) return 'Discharge today';
  if (normalized.includes('overdue')) return 'Overdue';
  if (normalized.includes('deadline today') || normalized.includes('expires today') || normalized.includes('today')) {
    return 'Due today';
  }
  return null;
}

function losLine(actual: number, expected?: number): { label: string; delta: number | null } {
  if (!expected || expected <= 0) return { label: `LOS ${actual}d`, delta: null };
  const delta = actual - expected;
  const sign = delta > 0 ? '+' : '';
  return {
    label: `LOS ${actual}d / Exp ${expected}d (${sign}${delta}d)`,
    delta
  };
}

function deltaClass(delta: number | null): string {
  if (delta == null) return '';
  if (delta > 0) return 'los-over';
  if (delta < 0) return 'los-under';
  return 'los-even';
}

function formatWorklistTime(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function Worklist({
  patients,
  activePatientId,
  stateByPatientId,
  actionStatusById,
  blockerStatusById,
  executionModeByAction,
  onSelectPatient,
  showHandoff
}: WorklistProps) {
  const sorted = [...patients].sort((a, b) => {
    const stateA = getSnapshot(a, stateByPatientId[a.meta.patient_id]);
    const stateB = getSnapshot(b, stateByPatientId[b.meta.patient_id]);
    const bucketA = stateA?.worklist_state.bucket_status ?? a.worklist_view_state.bucket_status;
    const bucketB = stateB?.worklist_state.bucket_status ?? b.worklist_view_state.bucket_status;
    const bucketDelta = bucketRank(bucketA) - bucketRank(bucketB);
    if (bucketDelta !== 0) return bucketDelta;
    return (stateA?.worklist_state.rank_position ?? 99) - (stateB?.worklist_state.rank_position ?? 99);
  });

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
      <h2>Worklist</h2>
      <ul className="worklist" aria-label="Patient worklist">
        {sorted.map((patient) => {
          const stateId = stateByPatientId[patient.meta.patient_id];
          const snapshot = getSnapshot(patient, stateId);
          const isActive = activePatientId === patient.meta.patient_id;
          const bucket = snapshot?.worklist_state.bucket_status ?? patient.worklist_view_state.bucket_status;
          const age = computeAge(patient.patient_profile.dob);
          const sex = patient.patient_profile.sex ?? null;
          const bed = patient.patient_profile.current_location?.bed ?? 'Unknown';
          const groupedBlockers = groupChips(
            patient.worklist_view_state.status_chips,
            patient.worklist_view_state.sub_tags
          );
          const los = losLine(
            patient.worklist_view_state.los_day,
            patient.worklist_view_state.expected_los_day
          );
          const urgency = urgencyLabel(
            bucket,
            [...patient.worklist_view_state.status_chips, ...patient.worklist_view_state.sub_tags].join(' ')
          );

          return (
            <li
              key={patient.meta.patient_id}
              className={`worklist-row worklist-card ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'true' : undefined}
            >
              <div className="worklist-card-header">
                <strong className="worklist-patient-line">
                  {patient.patient_profile.patient_name} · {demographicToken(age, sex)} · {bed}
                </strong>
                <div className="worklist-badge-stack">
                  <span className={`bucket bucket-large ${bucketClass(bucket)}`}>{bucket}</span>
                  {urgency && <span className="worklist-urgency-badge">{urgency}</span>}
                </div>
              </div>

              <p className="worklist-context-line">
                <span className="worklist-mrn">{patient.patient_profile.mrn}</span>
                <span className="worklist-diagnosis" title={patient.patient_profile.primary_diagnosis}>
                  {patient.patient_profile.primary_diagnosis}
                </span>
              </p>

              <WorklistCardTabs
                patient={patient}
                groupedBlockers={groupedBlockers}
                losLabel={los.label}
                losDeltaClass={deltaClass(los.delta)}
                blockerStatusOverride={blockerStatusById}
                actionStatusById={actionStatusById}
                executionModeByAction={executionModeByAction}
                lastUpdatedLabel={formatWorklistTime(snapshot?.timestamp_local)}
              />

              <div className="worklist-actions">
                <button className="row-select-button" onClick={() => onSelectPatient(patient.meta.patient_id)}>
                  Select patient
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
