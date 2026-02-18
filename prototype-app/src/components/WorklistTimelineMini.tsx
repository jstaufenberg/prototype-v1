import { useMemo, useState } from 'react';
import {
  formatTimelineTimestamp,
  type TimelineEntry,
  type TimelineEntryKind
} from '../utils/timelineModel';

interface WorklistTimelineMiniProps {
  entries: TimelineEntry[];
  referenceMs: number;
}

function TimelineIcon({ type }: { type: TimelineEntryKind }) {
  if (type === 'blocker') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3L4 7v5c0 5.2 3.4 8.7 8 10 4.6-1.3 8-4.8 8-10V7l-8-4z" />
        <path d="M8.5 12h7" />
      </svg>
    );
  }
  if (type === 'decision') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5h8v4H5zM13 15h6v4h-6zM13 5h6v4h-6zM5 15h8v4H5z" />
        <path d="M9 9v6m6-6v6" />
      </svg>
    );
  }
  if (type === 'execution') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 14h3l2-5 3 9 2-6h6" />
        <circle cx="19" cy="14" r="1.5" />
      </svg>
    );
  }
  if (type === 'encounter') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12h5l2-7 4 14 2-7h5" />
      <path d="M12 3v3M12 18v3" />
    </svg>
  );
}

export default function WorklistTimelineMini({ entries, referenceMs }: WorklistTimelineMiniProps) {
  const COLLAPSED_COUNT = 3;
  const MAX_EXPANDED = 12;
  const [showAll, setShowAll] = useState(false);

  const trimmedEntries = useMemo(() => entries.slice(0, MAX_EXPANDED), [entries]);
  const visible = useMemo(
    () => (showAll ? trimmedEntries : trimmedEntries.slice(0, COLLAPSED_COUNT)),
    [trimmedEntries, showAll]
  );
  const hiddenCount = Math.max(trimmedEntries.length - visible.length, 0);

  if (entries.length === 0) {
    return <p className="subtle">No major timeline changes captured.</p>;
  }

  return (
    <div className="mini-timeline">
      {visible.map((item) => (
        <article key={item.id} className={`mini-timeline-item state-${item.state}`}>
          <span className={`mono-icon timeline-icon type-${item.kind} state-${item.state}`}>
            <TimelineIcon type={item.kind} />
          </span>
          <div className="mini-timeline-copy">
            <p className="mini-timeline-time">{formatTimelineTimestamp(item.timestampLocal, referenceMs)}</p>
            <p className="mini-timeline-label">
              {item.label}
              {item.isMajor && <span className="mini-major-pill">Major</span>}
            </p>
            <p className="mini-timeline-detail">{item.detail}</p>
          </div>
        </article>
      ))}
      {hiddenCount > 0 && (
        <button className="subchip-toggle mini-show-all" onClick={() => setShowAll(true)}>
          Show all timeline events ({hiddenCount} more)
        </button>
      )}
      {showAll && trimmedEntries.length > COLLAPSED_COUNT && (
        <button className="subchip-toggle mini-show-all" onClick={() => setShowAll(false)}>
          Show fewer events
        </button>
      )}
      {entries.length > MAX_EXPANDED && (
        <p className="subtle">Showing latest {MAX_EXPANDED} events.</p>
      )}
    </div>
  );
}
