import type { Blocker, MilestoneJourneyNode } from '../types/mockData';

interface MilestoneNodeDrawerProps {
  node: MilestoneJourneyNode | null;
  blockersById: Record<string, Blocker>;
  onFocusBlocker: (blockerId: string) => void;
}

export default function MilestoneNodeDrawer({
  node,
  blockersById,
  onFocusBlocker
}: MilestoneNodeDrawerProps) {
  if (!node) {
    return (
      <section className="milestone-node-drawer milestone-node-drawer-empty" aria-live="polite">
        <h4>Milestone details</h4>
        <p className="subtle">Select a milestone to view details.</p>
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

  const linkedBlockers = node.linkedBlockerIds
    .map((blockerId) => blockersById[blockerId])
    .filter((blocker): blocker is Blocker => Boolean(blocker));

  return (
    <section className="milestone-node-drawer" aria-live="polite">
      <h4>{node.label}</h4>
      <p className="milestone-drawer-line">
        <span className="milestone-drawer-label">Why this milestone matters</span>
        <span>{node.why}</span>
      </p>
      <p className="milestone-drawer-line">
        <span className="milestone-drawer-label">Current state</span>
        <span>
          {node.statusLabel}
          {node.isPostBlockerAdjusted ? ' (Blocked by active discharge barriers)' : ''}
        </span>
      </p>
      <p className="milestone-drawer-line">
        <span className="milestone-drawer-label">Last updated</span>
        <span>{node.timestampLocal ?? 'Not yet updated'}</span>
      </p>
      <p className="milestone-drawer-line">
        <span className="milestone-drawer-label">Evidence</span>
        <span>{node.evidenceCount} sources</span>
      </p>

      {linkedBlockers.length > 0 && (
        <div className="milestone-linked-blockers">
          <span className="milestone-drawer-label">Linked blocker</span>
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

      {node.evidenceItems.length > 0 && (
        <details className="milestone-evidence-drawer">
          <summary>View evidence</summary>
          <ul>
            {node.evidenceItems.map((item) => (
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
