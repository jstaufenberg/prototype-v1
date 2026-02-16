import type { PatientRecord } from '../types/mockData';

// WorklistCardTabs kept in codebase — used by patient detail views
// import WorklistCardTabs from './WorklistCardTabs';

interface WorklistProps {
  patients: PatientRecord[];
  activePatientId: string | null;
  stateByPatientId: Record<string, string>;
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

function authLabel(status?: string | null): { text: string; className: string } {
  if (!status || status === 'NOT_NEEDED') return { text: 'Auth: N/A', className: 'worklist-auth-na' };
  if (status === 'PENDING') return { text: 'Auth: Pending', className: 'worklist-auth-pending' };
  if (status === 'APPROVED') return { text: 'Auth: Approved', className: 'worklist-auth-approved' };
  if (status === 'DENIED') return { text: 'Auth: Denied', className: 'worklist-auth-denied' };
  return { text: `Auth: ${status}`, className: 'worklist-auth-na' };
}

export default function Worklist({
  patients,
  activePatientId,
  stateByPatientId,
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
      <h2>My Patients</h2>
      <ul className="worklist" aria-label="My Patients">
        {sorted.map((patient) => {
          const stateId = stateByPatientId[patient.meta.patient_id];
          const snapshot = getSnapshot(patient, stateId);
          const isActive = activePatientId === patient.meta.patient_id;
          const bucket = snapshot?.worklist_state.bucket_status ?? patient.worklist_view_state.bucket_status;
          const age = computeAge(patient.patient_profile.dob);
          const sex = patient.patient_profile.sex ?? null;
          const bed = patient.patient_profile.current_location?.bed ?? 'Unknown';
          const los = losLine(
            patient.worklist_view_state.los_day,
            patient.worklist_view_state.expected_los_day
          );
          const auth = authLabel(patient.patient_profile.insurance?.auth_status);
          const disposition = patient.patient_profile.disposition_target;
          const activeAgents = snapshot?.worklist_state.active_agents
            ?? patient.worklist_view_state.active_agents
            ?? [];
          const activeBlockerCount = patient.blockers.items.filter(
            (b) => b.status === 'ACTIVE'
          ).length;
          const topAction = patient.proposed_actions.items.find(
            (a) => a.status === 'PROPOSED'
          );

          return (
            <li
              key={patient.meta.patient_id}
              className={`worklist-row worklist-card ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'true' : undefined}
              onClick={() => onSelectPatient(patient.meta.patient_id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="worklist-card-header">
                <strong className="worklist-patient-line">
                  {patient.patient_profile.patient_name} · {demographicToken(age, sex)} · {bed}
                  {disposition && (
                    <span className="worklist-disposition-inline">&rarr; {disposition}</span>
                  )}
                </strong>
                <span className={`bucket bucket-large ${bucketClass(bucket)}`}>{bucket}</span>
                {activeBlockerCount > 0 && (
                  <span className="worklist-blocker-count">
                    {activeBlockerCount} blocker{activeBlockerCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <p className="worklist-context-line">
                <span className="worklist-mrn">{patient.patient_profile.mrn}</span>
                <span className="worklist-diagnosis" title={patient.patient_profile.primary_diagnosis}>
                  {patient.patient_profile.primary_diagnosis}
                </span>
              </p>

              <p className="worklist-ops-line">
                <span className={`worklist-los-inline ${deltaClass(los.delta)}`}>{los.label}</span>
                <span className="worklist-ops-sep">&middot;</span>
                <span className={auth.className}>{auth.text}</span>
              </p>

              {activeAgents.length > 0 && (
                <ul className="worklist-agent-list">
                  {activeAgents.map((a) => (
                    <li key={a.agent} className="worklist-agent-item">
                      <span className="worklist-agent-dot" />
                      <span className="worklist-agent-name">{a.agent}</span>
                      <span className="worklist-agent-activity">{a.activity}</span>
                    </li>
                  ))}
                </ul>
              )}

              {topAction && (
                <p className="worklist-next-step">
                  Next: {topAction.title}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
