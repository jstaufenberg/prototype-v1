import { useState } from 'react';
import type { PatientRecord } from '../types/mockData';
import StickyActionBar from './StickyActionBar';
import type { ChipGroup } from '../utils/chipGrouping';
import { groupChips } from '../utils/chipGrouping';

interface ShiftStartSnapshotProps {
  patients: PatientRecord[];
  lastActiveAt?: string | null;
  onGoToWorklist: () => void;
}

interface SnapshotEntry {
  id: string;
  header: string;
  bucket: string;
  chipGroups: ChipGroup[];
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
  bucket: string;
  chipGroups: ChipGroup[];
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

function bucketClass(bucket: string) {
  if (bucket === 'Delayed') return 'bucket-delayed';
  if (bucket === 'At Risk') return 'bucket-at-risk';
  if (bucket === 'Pending') return 'bucket-pending';
  return 'bucket-on-track';
}

export default function ShiftStartSnapshot({
  patients,
  lastActiveAt,
  onGoToWorklist
}: ShiftStartSnapshotProps) {
  const [expandedSubchips, setExpandedSubchips] = useState<Record<string, boolean>>({});
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
      bucket,
      chipGroups: groupChips([], []),
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
        status: 'Closed'
      }));
      return {
        id: `${entry.patientId}-overnight`,
        header: entry.header,
        bucket: entry.bucket,
        chipGroups: entry.chipGroups,
        reason: clipped(primary.description),
        when: latest > 0 ? `${formatClock(latest)} (overnight)` : 'Overnight',
        status: entry.overnightItems.length > 1 ? `${entry.overnightItems.length} changes closed` : 'Closed',
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
        status: 'Open item'
      }));
      return {
        id: `${entry.patientId}-due`,
        header: entry.header,
        bucket: entry.bucket,
        chipGroups: entry.chipGroups,
        reason: clipped(primary.description),
        when: formatWhenWithRelative(primary.dueAt, now),
        status: entry.dueItems.length > 1 ? `${entry.dueItems.length} open items` : '1 open item',
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
      bucket: entry.bucket,
      chipGroups: entry.chipGroups,
      reason: 'Actions awaiting review',
      when: 'Now',
      status: entry.reviewCount === 1 ? '1 open item' : `${entry.reviewCount} open items`,
      extraItems: []
    }));

  const cards: SnapshotCard[] = [
    {
      title: 'Since you were away',
      items: overnightEntries,
      itemCount: values.reduce((sum, entry) => sum + entry.overnightItems.length, 0),
      patientCount: overnightEntries.length
    },
    {
      title: 'Needs action today',
      items: dueEntries,
      itemCount: values.reduce((sum, entry) => sum + entry.dueItems.length, 0),
      patientCount: dueEntries.length
    },
    {
      title: 'Awaiting your review',
      items: reviewEntries,
      itemCount: values.reduce((sum, entry) => sum + entry.reviewCount, 0),
      patientCount: reviewEntries.length
    }
  ].filter((card) => card.items.length > 0).slice(0, 3);

  const flaggedCount = reviewEntries.length;

  const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const parsedLastActive = lastActiveAt ? new Date(lastActiveAt).getTime() : NaN;
  const gapHours = Number.isNaN(parsedLastActive) ? Infinity : (now - parsedLastActive) / 3600000;
  const contextPrefix = gapHours >= 8 ? 'Since your last shift' : 'Since your last check-in';
  const contextLine = `${contextPrefix} · Data current as of ${timestamp}`;

  return (
    <section className="snapshot-screen">
      <h2>What changed while you were away</h2>
      <p className="freshness">{contextLine}</p>
      <StickyActionBar
        primaryAction={<button className="primary-action" onClick={onGoToWorklist}>Go to worklist</button>}
        secondaryActions={
          flaggedCount > 0 ? <button onClick={onGoToWorklist}>Review flagged ({flaggedCount})</button> : undefined
        }
        stickyOffset={8}
        compact
      />
      <p className="chip-legend">
        Chips summarize blockers and key details.
      </p>

      {cards.length === 0 && (
        <p className="snapshot-empty">All quiet. No recent changes, no actions due, nothing awaiting review.</p>
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
                  <div className="snapshot-entry-head">
                    <p className="snapshot-entry-name">{entry.header}</p>
                    <span className={`bucket ${bucketClass(entry.bucket)}`}>{entry.bucket}</span>
                  </div>
                  {entry.chipGroups.length > 0 && (
                    <div className="snapshot-chip-stack blocker-stack">
                      {entry.chipGroups.map((group) => {
                        const toggleKey = `${entry.id}:${group.chip}`;
                        const expanded = expandedSubchips[toggleKey] ?? false;
                        const visibleTags = expanded ? group.tags : group.tags.slice(0, 1);
                        const hiddenCount = Math.max(group.tags.length - visibleTags.length, 0);

                        return (
                          <div key={`${entry.id}-${group.chip}`} className="blocker-line">
                            <span className="chip">{group.chip}</span>
                            {visibleTags.length > 0 && (
                              <div
                                className={`subchip-stack subchip-inline-list${expanded ? '' : ' subchip-collapsed-preview'}`}
                              >
                                {visibleTags.map((tag) => (
                                  <span key={`${entry.id}-${group.chip}-${tag}`} className="sub-tag">
                                    {tag}
                                  </span>
                                ))}
                                {hiddenCount > 0 && (
                                  <button
                                    className="subchip-toggle"
                                    aria-expanded={expanded}
                                    onClick={() =>
                                      setExpandedSubchips((prev) => ({ ...prev, [toggleKey]: true }))
                                    }
                                  >
                                    +{hiddenCount} more
                                  </button>
                                )}
                                {expanded && group.tags.length > 1 && (
                                  <button
                                    className="subchip-toggle"
                                    aria-expanded={expanded}
                                    onClick={() =>
                                      setExpandedSubchips((prev) => ({ ...prev, [toggleKey]: false }))
                                    }
                                  >
                                    Show less
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="snapshot-reason-list">
                    {[{ reason: entry.reason, when: entry.when, status: entry.status }, ...entry.extraItems].map(
                      (reasonItem, index, allReasons) => (
                        <div key={`${entry.id}-reason-${index}`} className="snapshot-reason-block">
                          {reasonItem.reason && (
                            <p className="snapshot-entry-line">
                              <span className="snapshot-entry-label">Why this matters</span>
                              <span>{reasonItem.reason}</span>
                            </p>
                          )}
                          <p className="snapshot-entry-line">
                            <span className="snapshot-entry-label">Action by</span>
                            <span>{reasonItem.when}</span>
                          </p>
                          <p className="snapshot-entry-line">
                            <span className="snapshot-entry-label">Current state</span>
                            <span>{reasonItem.status}</span>
                          </p>
                          {index < allReasons.length - 1 && <div className="snapshot-reason-separator" />}
                        </div>
                      )
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
