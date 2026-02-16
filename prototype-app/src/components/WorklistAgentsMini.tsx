import type { WorklistAgentRow } from '../utils/worklistAgents';

interface WorklistAgentsMiniProps {
  agents: WorklistAgentRow[];
}

function formatClock(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function AgentIcon({ state }: { state: WorklistAgentRow['state'] }) {
  if (state === 'Running') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 14h3l2-5 3 9 2-6h6" />
        <circle cx="19" cy="14" r="1.5" />
      </svg>
    );
  }
  if (state === 'Paused') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="7" y="5" width="3" height="14" />
        <rect x="14" y="5" width="3" height="14" />
      </svg>
    );
  }
  if (state === 'Failed') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3L2.5 20h19L12 3z" />
        <path d="M12 9v5M12 17h.01" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

export default function WorklistAgentsMini({ agents }: WorklistAgentsMiniProps) {
  if (agents.length === 0) {
    return (
      <div className="mini-agents-empty">
        <p>No active monitoring for this patient.</p>
        <p className="subtle">Details and controls are in blocker workspace.</p>
      </div>
    );
  }

  return (
    <div className="mini-agents-list">
      {agents.map((agent) => (
        <article key={agent.actionId} className={`mini-agent-row state-${agent.state.toLowerCase()}`}>
          <span className={`mono-icon agent-icon state-${agent.state.toLowerCase()}`}>
            <AgentIcon state={agent.state} />
          </span>
          <div className="mini-agent-main">
            <p className="mini-agent-name">{agent.name}</p>
            <p className="mini-agent-meta">
              {agent.mode} · {agent.state}
            </p>
            <p className="mini-agent-meta">
              Last {formatClock(agent.lastRun)} · Next {formatClock(agent.nextRun)}
            </p>
            {agent.failureText && <p className="mini-agent-failure">{agent.failureText}</p>}
          </div>
        </article>
      ))}
    </div>
  );
}
