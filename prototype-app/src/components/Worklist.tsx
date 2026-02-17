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
  if (bucket === 'Needs Action') return 0;
  if (bucket === 'Watch') return 1;
  if (bucket === 'In Progress') return 2;
  return 3;
}

function bucketClass(bucket: string) {
  if (bucket === 'Needs Action') return 'bucket-needs-action';
  if (bucket === 'Watch') return 'bucket-watch';
  if (bucket === 'In Progress') return 'bucket-in-progress';
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
          const disposition = patient.patient_profile.disposition_target;
          const activeAgents = snapshot?.worklist_state.active_agents
            ?? patient.worklist_view_state.active_agents
            ?? [];
          const activeBlockerCount = patient.blockers.items.filter(
            (b) => b.status === 'ACTIVE'
          ).length;

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
                </strong>
                <span className={`bucket bucket-large ${bucketClass(bucket)}`}>{bucket}</span>
              </div>

              <p className="worklist-disposition-line">
                &rarr; {disposition || 'TBD'} &middot;{' '}
                <span className={activeBlockerCount > 0 ? 'blocker-count-active' : 'blocker-count-zero'}>
                  {activeBlockerCount} blocker{activeBlockerCount !== 1 ? 's' : ''}
                </span>
              </p>

              {activeAgents.length > 0 && (() => {
                const okCount = activeAgents.filter(a => !a.status || a.status === 'ok').length;
                const warnCount = activeAgents.filter(a => a.status === 'warning').length;
                const errorCount = activeAgents.filter(a => a.status === 'error').length;
                return (
                  <div className="worklist-agent-summary">
                    {okCount > 0 && (
                      <p className="agent-status-line">
                        <span className="agent-dot dot-ok" />
                        {okCount} agent{okCount > 1 ? 's' : ''} active
                      </p>
                    )}
                    {warnCount > 0 && (
                      <p className="agent-status-line agent-status-warning">
                        <span className="agent-dot dot-warning" />
                        {warnCount} agent{warnCount > 1 ? 's' : ''} issue
                      </p>
                    )}
                    {errorCount > 0 && (
                      <p className="agent-status-line agent-status-error">
                        <span className="agent-dot dot-error" />
                        {errorCount} agent{errorCount > 1 ? 's' : ''} failed
                      </p>
                    )}
                  </div>
                );
              })()}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
