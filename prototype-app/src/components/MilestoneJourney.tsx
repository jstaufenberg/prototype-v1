import { useEffect, useMemo, useRef, useState } from 'react';
import MilestoneNodeDrawer from './MilestoneNodeDrawer';
import { buildMilestoneJourney } from '../utils/milestoneJourney';
import type { Blocker, BlockerStatus, PatientRecord } from '../types/mockData';

interface MilestoneJourneyProps {
  patient: PatientRecord;
  blockerStatusOverride: Record<string, BlockerStatus>;
  currentStateId: string;
  onFocusBlocker: (blockerId: string) => void;
}

function toneClass(tone: string) {
  if (tone === 'COMPLETE') return 'tone-complete';
  if (tone === 'PENDING') return 'tone-pending';
  if (tone === 'BLOCKED') return 'tone-blocked';
  if (tone === 'FUTURE') return 'tone-future';
  return 'tone-none';
}

function statusIcon(statusTone: string, nodeType: string) {
  if (nodeType === 'ENDPOINT') return '◎';
  if (statusTone === 'COMPLETE') return '✓';
  if (statusTone === 'BLOCKED') return '!';
  if (statusTone === 'PENDING') return '•';
  return '○';
}

export default function MilestoneJourney({
  patient,
  blockerStatusOverride,
  currentStateId,
  onFocusBlocker
}: MilestoneJourneyProps) {
  const { nodes, completeCount, activeBlockerCount, hasReachedDischarge } = useMemo(
    () =>
      buildMilestoneJourney({
        patient,
        blockerStatusOverride,
        currentStateId,
        recentlyChangedHours: 24
      }),
    [patient, blockerStatusOverride, currentStateId]
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  const blockersById = useMemo<Record<string, Blocker>>(
    () => Object.fromEntries(patient.blockers.items.map((blocker) => [blocker.blocker_id, blocker])),
    [patient.blockers.items]
  );

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const summary = `${completeCount} milestones complete · ${activeBlockerCount} active blockers · ${
    hasReachedDischarge ? 'Discharge reached' : 'Discharge not reached'
  }`;

  return (
    <details className="milestone-journey-panel">
      <summary>
        <span>Patient milestone journey</span>
        <span className="subtle">{summary}</span>
      </summary>

      <div className="milestone-journey-content">
        <p className="subtle milestone-node-affordance">Select any milestone to view details below.</p>

        <div className="milestone-timeline-scroll">
          <ul className="milestone-timeline" role="listbox" aria-label="Patient milestone timeline">
            {nodes.map((node, index) => (
              <li
                key={node.id}
                className={`milestone-node ${selectedNodeId === node.id ? 'is-selected' : ''}`}
                aria-selected={selectedNodeId === node.id}
              >
                <div className="milestone-node-rail" aria-hidden="true">
                  <span
                    className={`milestone-segment milestone-segment-top ${toneClass(node.segmentBefore)}`}
                  />
                  <span className={`milestone-dot ${toneClass(node.statusTone)}`}>
                    {statusIcon(node.statusTone, node.nodeType)}
                  </span>
                  <span
                    className={`milestone-segment milestone-segment-bottom ${toneClass(node.segmentAfter)}`}
                  />
                </div>

                <button
                  ref={(element) => {
                    buttonRefs.current[node.id] = element;
                  }}
                  className="milestone-node-content"
                  disabled={!node.isClickable}
                  onClick={() => setSelectedNodeId(node.id)}
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
                    event.preventDefault();
                    const direction = event.key === 'ArrowRight' ? 1 : -1;
                    const nextIndex = index + direction;
                    if (nextIndex < 0 || nextIndex >= nodes.length) return;
                    const nextNode = nodes[nextIndex];
                    buttonRefs.current[nextNode.id]?.focus();
                    setSelectedNodeId(nextNode.id);
                  }}
                  role="option"
                  aria-selected={selectedNodeId === node.id}
                >
                  <div className="milestone-node-head">
                    <strong>{node.label}</strong>
                    <span className={`milestone-status-chip ${toneClass(node.statusTone)}`}>
                      {node.statusLabel}
                    </span>
                  </div>
                  {node.timestampLocal && <p className="subtle">Updated {node.timestampLocal.slice(11, 16)}</p>}
                  {node.chips.length > 0 && (
                    <div className="milestone-node-chips">
                      {node.chips.map((chip) => (
                        <span key={`${node.id}-${chip}`} className="sub-tag">
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <MilestoneNodeDrawer
          node={selectedNode}
          blockersById={blockersById}
          onFocusBlocker={onFocusBlocker}
        />
      </div>
    </details>
  );
}
