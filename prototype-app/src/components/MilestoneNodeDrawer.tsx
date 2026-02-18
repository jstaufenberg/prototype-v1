import { formatTimelineFullTimestamp, timelineStateLabel, type TimelineEntry } from '../utils/timelineModel';
import type { Blocker } from '../types/mockData';

interface MilestoneNodeDrawerProps {
  entry: TimelineEntry | null;
  blockersById: Record<string, Blocker>;
  onFocusBlocker: (blockerId: string) => void;
}

export default function MilestoneNodeDrawer({
  entry,
  blockersById,
  onFocusBlocker
}: MilestoneNodeDrawerProps) {
  if (!entry) {
    return (
      <section className="milestone-node-drawer milestone-node-drawer-empty" aria-live="polite">
        <h4>Timeline details</h4>
        <p className="subtle">Select a timeline row to view details.</p>
        <div className="milestone-drawer-skeleton" aria-hidden="true">
          <div className="shell-line shell-label" />
          <div className="shell-line shell-body" />
          <div className="shell-line shell-label" />
          <div className="shell-line shell-body short" />
          <div className="shell-line shell-label" />
          <div className="shell-line shell-body" />
        </div>
      </section>
    );
  }

  const linkedBlockers = entry.linkedBlockerIds
    .map((blockerId) => blockersById[blockerId])
    .filter((blocker): blocker is Blocker => Boolean(blocker));

  return (
    <section className="milestone-node-drawer" aria-live="polite">
      <h4>{entry.label}</h4>
      <p className="milestone-drawer-line">
        <span className="milestone-drawer-label">Why this item matters</span>
        <span>{entry.detail}</span>
      </p>
      <p className="milestone-drawer-line">
        <span className="milestone-drawer-label">Current state</span>
        <span>{timelineStateLabel(entry.state)}</span>
      </p>
      <p className="milestone-drawer-line">
        <span className="milestone-drawer-label">Last updated</span>
        <span>{formatTimelineFullTimestamp(entry.timestampLocal)}</span>
      </p>
      <p className="milestone-drawer-line">
        <span className="milestone-drawer-label">Source</span>
        <span>{entry.sourceLabel}</span>
      </p>
      <p className="milestone-drawer-line">
        <span className="milestone-drawer-label">Evidence</span>
        <span>{entry.evidenceCount} sources</span>
      </p>

      {linkedBlockers.length > 0 && (
        <div className="milestone-linked-blockers">
          <span className="milestone-drawer-label">Linked blockers</span>
          <div className="milestone-linked-blocker-list">
            {linkedBlockers.map((blocker) => (
              <button
                key={blocker.blocker_id}
                className="secondary"
                onClick={() => onFocusBlocker(blocker.blocker_id)}
              >
                Focus blocker: {blocker.description}
              </button>
            ))}
          </div>
        </div>
      )}

      {entry.evidenceItems.length > 0 && (
        <details className="milestone-evidence-drawer">
          <summary>View evidence</summary>
          <ul>
            {entry.evidenceItems.map((item) => (
              <li key={item.id}>
                {item.label} - {item.source} - {item.timestamp}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
