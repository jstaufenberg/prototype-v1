import { useMemo, useState } from 'react';
import type { PatientRecord } from '../../types/mockData';

interface ActivityTabProps {
  patient: PatientRecord;
}

export default function ActivityTab({ patient }: ActivityTabProps) {
  const [logExpanded, setLogExpanded] = useState(false);
  const [actorFilter, setActorFilter] = useState<'all' | 'agent' | 'cm'>('all');

  const logEntries = patient.execution_log?.entries ?? [];

  const filteredLog = useMemo(() => {
    if (actorFilter === 'all') return logEntries;
    if (actorFilter === 'agent') return logEntries.filter((e) => e.actor.toLowerCase() === 'agent');
    return logEntries.filter((e) => e.actor.toLowerCase() !== 'agent');
  }, [logEntries, actorFilter]);

  const visibleLog = logExpanded ? filteredLog : filteredLog.slice(0, 5);

  const activeAgents = patient.worklist_view_state.active_agents ?? [];

  return (
    <>
      {/* Execution Log */}
      <div className="section-head">
        <h3>Execution Log ({filteredLog.length})</h3>
        <div className="log-filter-controls">
          <button
            className={`log-filter-btn ${actorFilter === 'all' ? 'log-filter-active' : ''}`}
            onClick={() => setActorFilter('all')}
          >
            All
          </button>
          <button
            className={`log-filter-btn ${actorFilter === 'agent' ? 'log-filter-active' : ''}`}
            onClick={() => setActorFilter('agent')}
          >
            Agent
          </button>
          <button
            className={`log-filter-btn ${actorFilter === 'cm' ? 'log-filter-active' : ''}`}
            onClick={() => setActorFilter('cm')}
          >
            CM
          </button>
        </div>
      </div>

      {filteredLog.length === 0 ? (
        <p className="subtle">No activity recorded yet.</p>
      ) : (
        <>
          <ul className="activity-log">
            {visibleLog.map((entry) => (
              <li key={entry.log_id} className="log-entry">
                <span className="log-time">{entry.timestamp_local.slice(11, 16)}</span>
                <span className={`log-actor log-actor-${entry.actor.toLowerCase()}`}>{entry.actor}</span>
                <span className="log-event">{entry.event}</span>
                <span className="log-result subtle">{entry.result}</span>
              </li>
            ))}
          </ul>
          {filteredLog.length > 5 && (
            <button className="secondary" onClick={() => setLogExpanded((prev) => !prev)}>
              {logExpanded ? 'Show less' : `Show all (${filteredLog.length})`}
            </button>
          )}
        </>
      )}

      {/* Agent Summary */}
      <div className="section-head">
        <h3>Active Agents ({activeAgents.length})</h3>
      </div>

      {activeAgents.length === 0 ? (
        <p className="subtle">No agents currently active.</p>
      ) : (
        <ul className="agent-summary-list">
          {activeAgents.map((agent, index) => (
            <li key={index} className="agent-summary-row">
              <span className={`agent-dot dot-${agent.status ?? 'ok'}`} />
              <strong>{agent.agent}</strong>
              <span className="subtle">{agent.activity}</span>
              {agent.status && agent.status !== 'ok' && (
                <span className={`agent-status-tag agent-status-${agent.status}`}>{agent.status}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
