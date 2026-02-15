import type { PatientRecord } from '../types/mockData';

interface ShiftStartSnapshotProps {
  patients: PatientRecord[];
  onGoToWorklist: () => void;
}

interface SnapshotEntry {
  id: string;
  name: string;
  age: number | null;
  room: string;
  item: string;
  metaLabel: 'Updated' | 'Due' | 'Count';
  metaValue: string;
}

function computeAge(dob?: string): number | null {
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

function formatDueLabel(value?: string | null): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function ShiftStartSnapshot({ patients, onGoToWorklist }: ShiftStartSnapshotProps) {
  const overnightChanges: SnapshotEntry[] = [];
  const dueToday: SnapshotEntry[] = [];
  const needsReview: SnapshotEntry[] = [];

  for (const patient of patients) {
    const name = patient.patient_profile.patient_name;
    const age = computeAge((patient.patient_profile as { dob?: string }).dob);
    const room = patient.patient_profile.current_location?.bed ?? 'Unknown';
    const bucket = patient.worklist_view_state.bucket_status;

    if (bucket === 'Delayed' || bucket === 'At Risk') {
      for (const blocker of patient.blockers.items) {
        if (blocker.status === 'ACTIVE' && blocker.due_by_local) {
          dueToday.push({
            id: `${patient.meta.patient_id}-${blocker.blocker_id}-due`,
            name,
            age,
            room,
            item: blocker.description,
            metaLabel: 'Due',
            metaValue: formatDueLabel(blocker.due_by_local)
          });
        }
      }
    }

    for (const blocker of patient.blockers.items) {
      if (blocker.status === 'RESOLVED') {
        overnightChanges.push({
          id: `${patient.meta.patient_id}-${blocker.blocker_id}-resolved`,
          name,
          age,
          room,
          item: blocker.description,
          metaLabel: 'Updated',
          metaValue: 'Resolved overnight'
        });
      }
    }

    const pendingActions = patient.proposed_actions.items.filter((a) => a.status === 'PROPOSED');
    if (pendingActions.length > 0 && (bucket === 'Delayed' || bucket === 'At Risk')) {
      needsReview.push({
        id: `${patient.meta.patient_id}-review`,
        name,
        age,
        room,
        item: 'Actions awaiting review',
        metaLabel: 'Count',
        metaValue: `${pendingActions.length}`
      });
    }
  }

  const flaggedCount = needsReview.length;

  const cards = [
    { title: 'Overnight changes', items: overnightChanges },
    { title: 'Due today', items: dueToday },
    { title: 'Needs review', items: needsReview }
  ].filter((card) => card.items.length > 0).slice(0, 3);

  const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <section className="snapshot-screen">
      <h2>Shift-start snapshot</h2>
      <p className="freshness">As of {timestamp}</p>

      {cards.length === 0 && (
        <p className="snapshot-empty">All quiet. No overnight changes, nothing due, nothing to review.</p>
      )}

      <div className="snapshot-cards">
        {cards.map((card) => (
          <div key={card.title} className="snapshot-card">
            <h3>{card.title}</h3>
            <div className="snapshot-entry-list">
              {card.items.slice(0, 3).map((entry) => (
                <article key={entry.id} className="snapshot-entry">
                  <p className="snapshot-entry-name">
                    {entry.name}, Age {entry.age ?? 'N/A'}, Room {entry.room}
                  </p>
                  <p className="snapshot-entry-line">
                    <span className="snapshot-entry-label">Item</span>
                    <span>{entry.item}</span>
                  </p>
                  <p className="snapshot-entry-line">
                    <span className="snapshot-entry-label">{entry.metaLabel}</span>
                    <span>{entry.metaValue}</span>
                  </p>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="snapshot-buttons">
        <button className="primary-action" onClick={onGoToWorklist}>Go to worklist</button>
        {flaggedCount > 0 && (
          <button onClick={onGoToWorklist}>Review flagged ({flaggedCount})</button>
        )}
      </div>
    </section>
  );
}
