import type { PatientRecord } from '../types/mockData';

interface ShiftStartSnapshotProps {
  patients: PatientRecord[];
  onGoToWorklist: () => void;
}

interface SnapshotEntry {
  id: string;
  header: string;
  reason: string;
  when: string;
  status: string;
  extraItems: Array<{
    reason: string;
    when: string;
    status: string;
  }>;
}

interface SnapshotCard {
  title: string;
  items: SnapshotEntry[];
  itemCount: number;
  patientCount: number;
}

interface PatientAggregate {
  patientId: string;
  header: string;
  rankPosition: number;
  dueItems: Array<{ description: string; dueAt: number }>;
  overnightItems: Array<{ description: string; updatedAt: number | null }>;
  reviewCount: number;
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

function toTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatWhenWithRelative(timestamp: number, now: number): string {
  const diffMinutes = Math.round((timestamp - now) / 60000);
  const absMinutes = Math.abs(diffMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const timeText = formatClock(timestamp);

  if (diffMinutes >= 0) {
    if (hours > 0) return `${timeText} (in ${hours}h${minutes > 0 ? ` ${minutes}m` : ''})`;
    return `${timeText} (in ${minutes}m)`;
  }

  if (hours > 0) return `${timeText} (overdue ${hours}h${minutes > 0 ? ` ${minutes}m` : ''})`;
  return `${timeText} (overdue ${absMinutes}m)`;
}

function clipped(text: string, max = 92): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function demographicToken(age: number | null, sex?: string | null): string {
  if (age == null) return sex ?? 'N/A';
  return `${age}${sex ?? ''}`;
}

function makeHeader(name: string, age: number | null, sex: string | null | undefined, room: string): string {
  return `${name} · ${demographicToken(age, sex)} · ${room}`;
}

export default function ShiftStartSnapshot({ patients, onGoToWorklist }: ShiftStartSnapshotProps) {
  const aggregates = new Map<string, PatientAggregate>();
  const now = Date.now();

  for (const patient of patients) {
    const name = patient.patient_profile.patient_name;
    const age = computeAge(patient.patient_profile.dob);
    const sex = patient.patient_profile.sex ?? null;
    const room = patient.patient_profile.current_location?.bed ?? 'Unknown';
    const bucket = patient.worklist_view_state.bucket_status;
    const patientId = patient.meta.patient_id;

    const aggregate: PatientAggregate = aggregates.get(patientId) ?? {
      patientId,
      header: makeHeader(name, age, sex, room),
      rankPosition: patient.worklist_view_state.rank_position,
      dueItems: [],
      overnightItems: [],
      reviewCount: 0
    };

    if (bucket === 'Delayed' || bucket === 'At Risk') {
      for (const blocker of patient.blockers.items) {
        const dueAt = toTimestamp(blocker.due_by_local);
        if (blocker.status === 'ACTIVE' && dueAt != null) {
          aggregate.dueItems.push({
            description: blocker.description,
            dueAt
          });
        }
      }
    }

    for (const blocker of patient.blockers.items) {
      if (blocker.status === 'RESOLVED') {
        aggregate.overnightItems.push({
          description: blocker.description,
          updatedAt: toTimestamp(blocker.evidence_summary?.last_evidence_update_local)
        });
      }
    }

    const pendingActions = patient.proposed_actions.items.filter((a) => a.status === 'PROPOSED');
    if (pendingActions.length > 0 && (bucket === 'Delayed' || bucket === 'At Risk')) {
      aggregate.reviewCount = pendingActions.length;
    }

    aggregates.set(patientId, aggregate);
  }

  const values = Array.from(aggregates.values());

  const overnightEntries = values
    .filter((entry) => entry.overnightItems.length > 0)
    .sort((a, b) => {
      const aLatest = Math.max(...a.overnightItems.map((item) => item.updatedAt ?? 0));
      const bLatest = Math.max(...b.overnightItems.map((item) => item.updatedAt ?? 0));
      return bLatest - aLatest;
    })
    .map<SnapshotEntry>((entry) => {
      const sortedItems = [...entry.overnightItems].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      const latest = Math.max(...sortedItems.map((item) => item.updatedAt ?? 0));
      const primary = sortedItems[0];
      const extraItems = sortedItems.slice(1).map((item) => ({
        reason: clipped(item.description),
        when: item.updatedAt ? `${formatClock(item.updatedAt)} (overnight)` : 'Overnight',
        status: 'Resolved'
      }));
      return {
        id: `${entry.patientId}-overnight`,
        header: entry.header,
        reason: clipped(primary.description),
        when: latest > 0 ? `${formatClock(latest)} (overnight)` : 'Overnight',
        status: entry.overnightItems.length > 1 ? `${entry.overnightItems.length} changes resolved` : 'Resolved',
        extraItems
      };
    });

  const dueEntries = values
    .filter((entry) => entry.dueItems.length > 0)
    .sort((a, b) => Math.min(...a.dueItems.map((item) => item.dueAt)) - Math.min(...b.dueItems.map((item) => item.dueAt)))
    .map<SnapshotEntry>((entry) => {
      const sortedDueItems = [...entry.dueItems].sort((a, b) => a.dueAt - b.dueAt);
      const primary = sortedDueItems[0];
      const extraItems = sortedDueItems.slice(1).map((item) => ({
        reason: clipped(item.description),
        when: formatWhenWithRelative(item.dueAt, now),
        status: 'Due item'
      }));
      return {
        id: `${entry.patientId}-due`,
        header: entry.header,
        reason: clipped(primary.description),
        when: formatWhenWithRelative(primary.dueAt, now),
        status: entry.dueItems.length > 1 ? `${entry.dueItems.length} due items` : '1 due item',
        extraItems
      };
    });

  const reviewEntries = values
    .filter((entry) => entry.reviewCount > 0)
    .sort((a, b) => {
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return a.rankPosition - b.rankPosition;
    })
    .map<SnapshotEntry>((entry) => ({
      id: `${entry.patientId}-review`,
      header: entry.header,
      reason: 'Actions awaiting review',
      when: 'Now',
      status: `${entry.reviewCount} pending actions`,
      extraItems: []
    }));

  const cards: SnapshotCard[] = [
    {
      title: 'Overnight changes',
      items: overnightEntries,
      itemCount: values.reduce((sum, entry) => sum + entry.overnightItems.length, 0),
      patientCount: overnightEntries.length
    },
    {
      title: 'Due today',
      items: dueEntries,
      itemCount: values.reduce((sum, entry) => sum + entry.dueItems.length, 0),
      patientCount: dueEntries.length
    },
    {
      title: 'Needs review',
      items: reviewEntries,
      itemCount: values.reduce((sum, entry) => sum + entry.reviewCount, 0),
      patientCount: reviewEntries.length
    }
  ].filter((card) => card.items.length > 0).slice(0, 3);

  const flaggedCount = reviewEntries.length;

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
            <div className="snapshot-card-head">
              <h3>{card.title}</h3>
              <p className="snapshot-card-summary">{card.itemCount} items, {card.patientCount} patients</p>
            </div>
            <div className="snapshot-entry-list">
              {card.items.slice(0, 3).map((entry) => (
                <article key={entry.id} className="snapshot-entry">
                  <p className="snapshot-entry-name">{entry.header}</p>
                  <p className="snapshot-entry-line">
                    <span className="snapshot-entry-label">Reason</span>
                    <span>{entry.reason}</span>
                  </p>
                  <p className="snapshot-entry-line">
                    <span className="snapshot-entry-label">When</span>
                    <span>{entry.when}</span>
                  </p>
                  <p className="snapshot-entry-line">
                    <span className="snapshot-entry-label">Status</span>
                    <span>{entry.status}</span>
                  </p>
                  {entry.extraItems.length > 0 && (
                    <details className="snapshot-entry-details">
                      <summary>Other reasons: {entry.extraItems.length} (view all)</summary>
                      <div className="snapshot-extra-list">
                        {entry.extraItems.map((item, index) => (
                          <article key={`${entry.id}-extra-${index}`} className="snapshot-extra-item">
                            <p className="snapshot-entry-line">
                              <span className="snapshot-entry-label">Reason</span>
                              <span>{item.reason}</span>
                            </p>
                            <p className="snapshot-entry-line">
                              <span className="snapshot-entry-label">When</span>
                              <span>{item.when}</span>
                            </p>
                            <p className="snapshot-entry-line">
                              <span className="snapshot-entry-label">Status</span>
                              <span>{item.status}</span>
                            </p>
                          </article>
                        ))}
                      </div>
                    </details>
                  )}
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
