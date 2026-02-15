import type { PatientRecord } from '../types/mockData';
import StickyActionBar from './StickyActionBar';

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

function formatWorklistTime(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function mapSubTags(statusChips: string[], subTags: string[]) {
  const used = new Set<number>();
  const grouped = statusChips.map((chip) => ({ chip, tags: [] as string[] }));

  const chipMatcher = (chip: string) => {
    const value = chip.toLowerCase();
    if (value.includes('auth')) return /auth|payer|insurance|denial|appeal/i;
    if (value.includes('placement') || value.includes('facility')) return /snf|facility|placement|delivery|response|transport|bed/i;
    if (value.includes('md') || value.includes('sign')) return /md|physician|sign/i;
    if (value.includes('family')) return /family|decision/i;
    return /.^/; // match nothing by default
  };

  grouped.forEach((group) => {
    const matcher = chipMatcher(group.chip);
    subTags.forEach((tag, idx) => {
      if (!used.has(idx) && matcher.test(tag)) {
        group.tags.push(tag);
        used.add(idx);
      }
    });
  });

  const leftovers = subTags.filter((_, idx) => !used.has(idx));
  if (leftovers.length > 0) {
    if (grouped.length === 0) grouped.push({ chip: 'Needs attention', tags: leftovers });
    else grouped[0].tags.push(...leftovers);
  }

  return grouped;
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
    if (activePatientId) {
      const activePatient = patients.find((p) => p.meta.patient_id === activePatientId);
      if (activePatient) {
        const activeSnapshot = getSnapshot(activePatient, stateByPatientId[activePatient.meta.patient_id]);
        if (activeSnapshot?.timestamp_local) return activeSnapshot.timestamp_local;
      }
    }

    const timestamps = patients
      .map((patient) => getSnapshot(patient, stateByPatientId[patient.meta.patient_id])?.timestamp_local)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return timestamps[0] ?? null;
  })();

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
      <StickyActionBar
        primaryAction={
          <button
            className="primary-action"
            disabled={!activePatientId}
            onClick={() => activePatientId && onSelectPatient(activePatientId)}
          >
            Open selected patient plan
          </button>
        }
        secondaryActions={
          activePatientId ? (
            <button className="secondary" onClick={() => onSelectPatient(null)}>
              Clear selection
            </button>
          ) : undefined
        }
        contextText={currentTimestamp ? `Data current as of ${formatWorklistTime(currentTimestamp)}` : undefined}
        stickyOffset={8}
        compact
      />
      <ul className="worklist" aria-label="Patient worklist">
        {sorted.map((patient) => {
          const stateId = stateByPatientId[patient.meta.patient_id];
          const snapshot = getSnapshot(patient, stateId);
          const isActive = activePatientId === patient.meta.patient_id;
          const bucket = snapshot?.worklist_state.bucket_status ?? patient.worklist_view_state.bucket_status;
          const age = computeAge(patient.patient_profile.dob);
          const sex = patient.patient_profile.sex ?? null;
          const bed = patient.patient_profile.current_location?.bed ?? 'Unknown';
          const groupedBlockers = mapSubTags(
            patient.worklist_view_state.status_chips,
            patient.worklist_view_state.sub_tags
          );

          return (
            <li
              key={patient.meta.patient_id}
              className={`worklist-row ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'true' : undefined}
            >
              <div>
                <div className="row-head">
                  <strong>
                    {patient.patient_profile.patient_name} · {demographicToken(age, sex)} · {bed}
                  </strong>
                  <span className={`bucket ${bucketClass(bucket)}`}>{bucket}</span>
                </div>
                <div className="blocker-stack">
                  {groupedBlockers.map((group) => (
                    <div key={group.chip} className="blocker-line">
                      <span className="chip">{group.chip}</span>
                      {group.tags.length > 0 && (
                        <div className="subchip-stack">
                          {group.tags.map((tag) => (
                            <span key={`${group.chip}-${tag}`} className="sub-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="meta">
                  <span>LOS Day {patient.worklist_view_state.los_day}</span>
                </div>
              </div>
              <button className="row-select-button" onClick={() => onSelectPatient(patient.meta.patient_id)}>
                Select patient
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
