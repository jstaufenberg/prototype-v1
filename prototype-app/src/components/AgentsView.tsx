import { useMemo } from 'react';
import type { ActionStatus, BlockerStatus, ExecutionModeDefault, PatientRecord } from '../types/mockData';
import { buildWorklistAgentRows, type WorklistAgentRow } from '../utils/worklistAgents';

interface AgentsViewProps {
  patients: PatientRecord[];
  actionStatusById: Record<string, ActionStatus>;
  executionModeByAction: Record<string, ExecutionModeDefault>;
  blockerStatusById: Record<string, BlockerStatus>;
}

interface PatientAgentGroup {
  patientId: string;
  patientName: string;
  bed: string;
  agents: WorklistAgentRow[];
}

function stateChipClass(state: WorklistAgentRow['state']): string {
  if (state === 'Running') return 'agent-chip-running';
  if (state === 'Failed') return 'agent-chip-failed';
  if (state === 'Paused') return 'agent-chip-paused';
  return 'agent-chip-idle';
}

function formatTime(value?: string | null): string {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function AgentsView({
  patients,
  actionStatusById,
  executionModeByAction,
  blockerStatusById
}: AgentsViewProps) {
  const groups: PatientAgentGroup[] = useMemo(() => {
    return patients.map((patient) => ({
      patientId: patient.meta.patient_id,
      patientName: patient.patient_profile.patient_name,
      bed: patient.patient_profile.current_location.bed,
      agents: buildWorklistAgentRows(patient, actionStatusById, executionModeByAction, blockerStatusById)
    }));
  }, [patients, actionStatusById, executionModeByAction, blockerStatusById]);

  const totalAll = groups.reduce((sum, g) => sum + g.agents.length, 0);
  const totalRunning = groups.reduce((sum, g) => sum + g.agents.filter(a => a.state === 'Running').length, 0);
  const totalFailed = groups.reduce((sum, g) => sum + g.agents.filter(a => a.state === 'Failed').length, 0);

  return (
    <section className="view-single-pane">
      <div className="agents-summary">
        <div className="agents-stat">
          <span className="agents-stat-number">{totalAll}</span>
          <span className="agents-stat-label">Total Agents</span>
        </div>
        <div className="agents-stat">
          <span className="agents-stat-number agents-stat-running">{totalRunning}</span>
          <span className="agents-stat-label">Running</span>
        </div>
        <div className="agents-stat">
          <span className="agents-stat-number agents-stat-failed">{totalFailed}</span>
          <span className="agents-stat-label">Needs Attention</span>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.patientId} className="agents-patient-group">
          <h3 className="agents-patient-name">
            {group.patientName} <span className="subtle">({group.bed})</span>
          </h3>
          {group.agents.length === 0 ? (
            <p className="subtle">No active agents for this patient.</p>
          ) : (
            <div className="agents-table">
              {group.agents.map((agent) => (
                <div key={agent.actionId} className="agents-row">
                  <div className="agents-row-main">
                    <strong>{agent.name}</strong>
                    <span className={`chip ${stateChipClass(agent.state)}`}>{agent.state}</span>
                  </div>
                  <div className="agents-row-meta">
                    <span>Mode: {agent.mode}</span>
                    <span>Last run: {formatTime(agent.lastRun)}</span>
                    <span>Next run: {formatTime(agent.nextRun)}</span>
                  </div>
                  {agent.failureText && <p className="agents-row-failure">{agent.failureText}</p>}
                  <div className="agents-row-actions">
                    <button className="secondary" disabled>
                      {agent.state === 'Paused' ? 'Resume' : 'Pause'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
