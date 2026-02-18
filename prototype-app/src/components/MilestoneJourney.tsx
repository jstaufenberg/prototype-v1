import { useEffect, useMemo, useRef, useState } from 'react';
import MilestoneNodeDrawer from './MilestoneNodeDrawer';
import {
  buildTimelineEntries,
  formatTimelineTimestamp,
  getTimelineReferenceMs,
  timelineStateLabel,
  type TimelineEntryState
} from '../utils/timelineModel';
import type { Blocker, BlockerStatus, PatientRecord } from '../types/mockData';

interface MilestoneJourneyProps {
  patient: PatientRecord;
  blockerStatusOverride: Record<string, BlockerStatus>;
  currentStateId: string;
  onFocusBlocker: (blockerId: string) => void;
}

function toneClass(state: TimelineEntryState): string {
  if (state === 'complete') return 'tone-complete';
  if (state === 'pending') return 'tone-pending';
  if (state === 'blocked') return 'tone-blocked';
  return 'tone-future';
}

export default function MilestoneJourney({
  patient,
  blockerStatusOverride,
  currentStateId,
  onFocusBlocker
}: MilestoneJourneyProps) {
  const timelineEntries = useMemo(
    () => buildTimelineEntries(patient, {
      blockerStatusOverride,
      currentStateId,
      sortMode: 'blocker-first',
      includeEncounterFallback: true
    }),
    [patient, blockerStatusOverride, currentStateId]
  );
  const timelineReferenceMs = useMemo(
    () => getTimelineReferenceMs(patient, currentStateId),
    [patient, currentStateId]
  );
  const completeCount = timelineEntries.filter((item) => item.kind === 'milestone' && item.state === 'complete').length;
  const activeBlockerCount = patient.blockers.items.filter(
    (item) => (blockerStatusOverride[item.blocker_id] ?? item.status) === 'ACTIVE'
  ).length;
  const hasReachedDischarge = timelineEntries.some(
    (item) =>
      item.kind === 'milestone' &&
      item.state === 'complete' &&
      /(physical departure|discharge completed)/i.test(item.label)
  ) && activeBlockerCount === 0;

  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const visibleEntries = useMemo(
    () => (showAll ? timelineEntries : timelineEntries.slice(0, 6)),
    [timelineEntries, showAll]
  );
  const hiddenCount = Math.max(timelineEntries.length - visibleEntries.length, 0);

  useEffect(() => {
    if (!isExpanded) return;
    if (visibleEntries.length === 0) {
      setSelectedEntryId(null);
      return;
    }
    const selectedStillVisible = selectedEntryId && visibleEntries.some((item) => item.id === selectedEntryId);
    if (!selectedStillVisible) {
      setSelectedEntryId(visibleEntries[0].id);
    }
  }, [isExpanded, visibleEntries, selectedEntryId]);

  const blockersById = useMemo<Record<string, Blocker>>(
    () => Object.fromEntries(patient.blockers.items.map((blocker) => [blocker.blocker_id, blocker])),
    [patient.blockers.items]
  );

  const selectedEntry = timelineEntries.find((item) => item.id === selectedEntryId) ?? null;
  return (
    <details
      className="milestone-journey-panel"
      onToggle={(event) => {
        const open = event.currentTarget.open;
        setIsExpanded(open);
        if (!open) setShowAll(false);
      }}
    >
      <summary>
        <span>Patient milestone journey</span>
        <span className="subtle">
          {completeCount} milestones complete
          <span className="sep-dot" aria-hidden="true"> · </span>
          {activeBlockerCount} active blockers
          <span className="sep-dot" aria-hidden="true"> · </span>
          {hasReachedDischarge ? 'Discharge reached' : 'Discharge not reached'}
        </span>
      </summary>

      <div className="milestone-journey-content">
        <p className="subtle milestone-node-affordance">Select a timeline row to inspect details and linked blockers.</p>

        <div className="detail-timeline-list" role="list" aria-label="Patient timeline">
          {visibleEntries.length === 0 ? (
            <p className="subtle">No timeline events captured for this patient yet.</p>
          ) : (
            visibleEntries.map((entry, index) => (
              <button
                key={entry.id}
                ref={(element) => {
                  buttonRefs.current[entry.id] = element;
                }}
                className={`detail-timeline-row ${toneClass(entry.state)}${selectedEntryId === entry.id ? ' is-selected' : ''}`}
                onClick={() => setSelectedEntryId(entry.id)}
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
                  event.preventDefault();
                  const direction = event.key === 'ArrowDown' ? 1 : -1;
                  const next = visibleEntries[index + direction];
                  if (!next) return;
                  buttonRefs.current[next.id]?.focus();
                  setSelectedEntryId(next.id);
                }}
              >
                <div className="detail-timeline-row-head">
                  <span className="detail-timeline-time">
                    {formatTimelineTimestamp(entry.timestampLocal, timelineReferenceMs)}
                  </span>
                  <span className={`milestone-status-chip ${toneClass(entry.state)}`}>
                    {timelineStateLabel(entry.state)}
                  </span>
                </div>
                <p className="detail-timeline-label">{entry.label}</p>
                <p className="detail-timeline-detail">{entry.detail}</p>
                <p className="detail-timeline-source subtle">{entry.sourceLabel}</p>
              </button>
            ))
          )}
        </div>
        {hiddenCount > 0 && (
          <button className="subchip-toggle" onClick={() => setShowAll(true)}>
            Show more timeline items ({hiddenCount} more)
          </button>
        )}
        {showAll && timelineEntries.length > 6 && (
          <button className="subchip-toggle" onClick={() => setShowAll(false)}>
            Show fewer timeline items
          </button>
        )}

        <MilestoneNodeDrawer
          entry={selectedEntry}
          blockersById={blockersById}
          onFocusBlocker={onFocusBlocker}
        />
      </div>
    </details>
  );
}
