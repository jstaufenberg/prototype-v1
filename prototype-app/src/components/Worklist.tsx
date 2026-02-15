import type { PatientRecord } from '../types/mockData';

interface WorklistProps {
  patients: PatientRecord[];
  activePatientId: string;
  stateByPatientId: Record<string, string>;
  onSelectPatient: (patientId: string) => void;
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

  const currentTimestamp = (() => {
    const activePatient = patients.find((p) => p.meta.patient_id === activePatientId);
    if (!activePatient) return null;
    const snapshot = getSnapshot(activePatient, stateByPatientId[activePatient.meta.patient_id]);
    return snapshot?.timestamp_local ?? null;
  })();

  return (
    <section className="panel">
      {showHandoff && (
        <div className="handoff-banner">
          <div>
            <span>Background runs since last shift: 3</span>
            <span>Changes requiring review: 2</span>
          </div>
          <span className="subtle">Handoff mode</span>
        </div>
      )}
      <h2>Worklist</h2>
      {currentTimestamp && <p className="freshness">As of {currentTimestamp}</p>}
      <p className="subtle">Low-click triage: open patient plan only.</p>
      <ul className="worklist" aria-label="Patient worklist">
        {sorted.map((patient) => {
          const stateId = stateByPatientId[patient.meta.patient_id];
          const snapshot = getSnapshot(patient, stateId);
          const isActive = activePatientId === patient.meta.patient_id;
          const bucket = snapshot?.worklist_state.bucket_status ?? patient.worklist_view_state.bucket_status;

          return (
            <li
              key={patient.meta.patient_id}
              className={`worklist-row ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'true' : undefined}
            >
              <div>
                <div className="row-head">
                  <span className="patient-id">{patient.meta.patient_id}</span>
                  <strong>{patient.patient_profile.patient_name}</strong>
                  <span className={`bucket ${bucketClass(bucket)}`}>{bucket}</span>
                </div>
                <div className="chips">
                  {patient.worklist_view_state.status_chips.map((chip) => (
                    <span key={chip} className="chip">
                      {chip}
                    </span>
                  ))}
                  {patient.worklist_view_state.sub_tags.map((tag) => (
                    <span key={tag} className="sub-tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="meta">
                  <span>Rank #{snapshot?.worklist_state.rank_position ?? patient.worklist_view_state.rank_position}</span>
                  <span>LOS Day {patient.worklist_view_state.los_day}</span>
                  <span>
                    {(snapshot?.worklist_state.rank_reasons ?? patient.worklist_view_state.rank_reasons)?.join(', ')}
                  </span>
                </div>
              </div>
              <button onClick={() => onSelectPatient(patient.meta.patient_id)}>Open patient plan</button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
