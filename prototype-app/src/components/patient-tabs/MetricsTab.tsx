import { useMemo } from 'react';
import type { ActionStatus, PatientRecord } from '../../types/mockData';

interface MetricsTabProps {
  patient: PatientRecord;
  actionStatusOverride: Record<string, ActionStatus>;
  blockerStatusOverride: Record<string, string>;
}

export default function MetricsTab({ patient, actionStatusOverride, blockerStatusOverride }: MetricsTabProps) {
  const los = patient.worklist_view_state.los_day;
  const expectedLos = patient.worklist_view_state.expected_los_day;
  const losDelta = expectedLos ? los - expectedLos : null;

  const blockerCounts = useMemo(() => {
    let active = 0;
    let resolved = 0;
    let redCount = 0;
    let orangeCount = 0;
    let yellowCount = 0;
    for (const blocker of patient.blockers.items) {
      const status = blockerStatusOverride[blocker.blocker_id] ?? blocker.status;
      if (status === 'ACTIVE') {
        active++;
        if (blocker.severity === 'RED') redCount++;
        else if (blocker.severity === 'ORANGE') orangeCount++;
        else yellowCount++;
      } else {
        resolved++;
      }
    }
    return { active, resolved, total: active + resolved, redCount, orangeCount, yellowCount };
  }, [patient.blockers.items, blockerStatusOverride]);

  const actionCounts = useMemo(() => {
    let executed = 0;
    let total = 0;
    let agentHandled = 0;
    for (const action of patient.proposed_actions.items) {
      total++;
      const status = actionStatusOverride[action.action_id] ?? action.status;
      if (status === 'EXECUTED') {
        executed++;
        if (action.execution_mode_default === 'BACKGROUND') agentHandled++;
      }
    }
    return { executed, total, agentHandled, cmHandled: executed - agentHandled };
  }, [patient.proposed_actions.items, actionStatusOverride]);

  const bucket = patient.worklist_view_state.bucket_status;

  return (
    <div className="metrics-grid">
      {/* LOS vs Expected */}
      <div className="metric-card">
        <div className="metric-card-header">
          <span className="metric-label">LOS vs Expected</span>
          <span className="metric-tag">Computed</span>
        </div>
        <div className="metric-value-row">
          <span className="metric-value">{los}d</span>
          {expectedLos && (
            <span className={`metric-trend ${losDelta && losDelta > 0 ? 'trend-negative' : 'trend-positive'}`}>
              / {expectedLos}d ({losDelta && losDelta > 0 ? '+' : ''}{losDelta}d)
            </span>
          )}
        </div>
        <p className="metric-context">
          {losDelta && losDelta > 0 ? `${losDelta} day(s) over expected length of stay` : 'Within expected length of stay'}
        </p>
      </div>

      {/* Active Blockers */}
      <div className="metric-card">
        <div className="metric-card-header">
          <span className="metric-label">Active Blockers</span>
          <span className="metric-tag">Computed</span>
        </div>
        <div className="metric-value-row">
          <span className="metric-value">{blockerCounts.active}</span>
        </div>
        <p className="metric-context">
          {blockerCounts.redCount > 0 && <span className="sev-dot sev-dot-red" />}
          {blockerCounts.orangeCount > 0 && <span className="sev-dot sev-dot-orange" />}
          {blockerCounts.yellowCount > 0 && <span className="sev-dot sev-dot-yellow" />}
          {blockerCounts.active === 0 ? 'No active blockers' : `${blockerCounts.redCount}R ${blockerCounts.orangeCount}O ${blockerCounts.yellowCount}Y`}
        </p>
      </div>

      {/* Blockers Resolved */}
      <div className="metric-card">
        <div className="metric-card-header">
          <span className="metric-label">Blockers Resolved</span>
          <span className="metric-tag">Computed</span>
        </div>
        <div className="metric-value-row">
          <span className="metric-value">{blockerCounts.resolved}/{blockerCounts.total}</span>
        </div>
        <p className="metric-context">
          {blockerCounts.total > 0
            ? `${Math.round((blockerCounts.resolved / blockerCounts.total) * 100)}% resolution rate`
            : 'No blockers recorded'}
        </p>
      </div>

      {/* Actions Completed */}
      <div className="metric-card">
        <div className="metric-card-header">
          <span className="metric-label">Actions Completed</span>
          <span className="metric-tag">Computed</span>
        </div>
        <div className="metric-value-row">
          <span className="metric-value">{actionCounts.executed}/{actionCounts.total}</span>
        </div>
        <p className="metric-context">
          {actionCounts.total > 0
            ? `${Math.round((actionCounts.executed / actionCounts.total) * 100)}% completion`
            : 'No actions proposed'}
        </p>
      </div>

      {/* Agent Effectiveness */}
      <div className="metric-card">
        <div className="metric-card-header">
          <span className="metric-label">Agent Effectiveness</span>
          <span className="metric-tag">Computed</span>
        </div>
        <div className="metric-value-row">
          <span className="metric-value">{actionCounts.agentHandled}</span>
          <span className="metric-trend">agent / {actionCounts.cmHandled} CM</span>
        </div>
        <p className="metric-context">
          {actionCounts.executed > 0
            ? `${Math.round((actionCounts.agentHandled / actionCounts.executed) * 100)}% handled by agents`
            : 'No actions executed yet'}
        </p>
      </div>

      {/* Time in Status */}
      <div className="metric-card">
        <div className="metric-card-header">
          <span className="metric-label">Time in Status</span>
          <span className="metric-tag">Computed</span>
        </div>
        <div className="metric-value-row">
          <span className="metric-value">{bucket}</span>
        </div>
        <p className="metric-context">Current triage status for this patient</p>
      </div>
    </div>
  );
}
