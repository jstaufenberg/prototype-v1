import type { PatientRecord } from '../types/mockData';

interface ShiftStartSnapshotProps {
  patients: PatientRecord[];
  onGoToWorklist: () => void;
}

export default function ShiftStartSnapshot({ patients, onGoToWorklist }: ShiftStartSnapshotProps) {
  const overnightChanges: string[] = [];
  const dueToday: string[] = [];
  const needsReview: string[] = [];

  for (const patient of patients) {
    const name = patient.patient_profile.patient_name;
    const bucket = patient.worklist_view_state.bucket_status;

    if (bucket === 'Delayed' || bucket === 'At Risk') {
      for (const blocker of patient.blockers.items) {
        if (blocker.status === 'ACTIVE' && blocker.due_by_local) {
          dueToday.push(`${name}: ${blocker.description} (due ${blocker.due_by_local})`);
        }
      }
    }

    for (const blocker of patient.blockers.items) {
      if (blocker.status === 'RESOLVED') {
        overnightChanges.push(`${name}: ${blocker.description} — resolved`);
      }
    }

    const pendingActions = patient.proposed_actions.items.filter((a) => a.status === 'PROPOSED');
    if (pendingActions.length > 0 && (bucket === 'Delayed' || bucket === 'At Risk')) {
      needsReview.push(`${name}: ${pendingActions.length} action${pendingActions.length > 1 ? 's' : ''} awaiting review`);
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
            <ul>
              {card.items.slice(0, 3).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
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
