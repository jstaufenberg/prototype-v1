import { useMemo, useState } from 'react';
import type { ActionStatus, BlockerStatus, ExecutionModeDefault, PatientRecord } from '../types/mockData';
import { buildWorklistAgentRows, type WorklistAgentRow } from '../utils/worklistAgents';

interface SystemStatusViewProps {
  patients: PatientRecord[];
  actionStatusById: Record<string, ActionStatus>;
  executionModeByAction: Record<string, ExecutionModeDefault>;
  blockerStatusById: Record<string, BlockerStatus>;
}

/* ── Sub-tab definitions ── */

type StatusTab = 'activity-log' | 'capabilities' | 'active-agents';

const STATUS_TABS: Array<{ id: StatusTab; label: string }> = [
  { id: 'activity-log', label: 'Activity Log' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'active-agents', label: 'Active Agents' },
];

/* ── Activity feed types ── */

type FeedSource = 'EHR' | 'Payer' | 'Facility' | 'Email' | 'Team' | 'System';

interface FeedEntry {
  timestamp: string;
  source: FeedSource;
  description: string;
  patientName?: string;
  isFailure: boolean;
}

interface Issue {
  title: string;
  detail: string;
  timestamp: string;
  patientName?: string;
}

/* ── Source mapping ── */

function mapLogToSource(event: string, result: string): FeedSource {
  const text = `${event} ${result}`.toLowerCase();
  if (/fax|facility|referral|outreach|maplewood|sunrise|placement/.test(text)) return 'Facility';
  if (/auth|payer|uhc|bcbs|aetna|insurance|united/.test(text)) return 'Payer';
  if (/parsed|note|ehr|workup|clinical|discharge/.test(text)) return 'EHR';
  if (/huddle|team|family/.test(text)) return 'Team';
  if (/email|inbox/.test(text)) return 'Email';
  return 'System';
}

function mapEvidenceToSource(sourceType: string): FeedSource {
  switch (sourceType) {
    case 'adt_event': return 'EHR';
    case 'pt_note': return 'EHR';
    case 'discharge_note': return 'EHR';
    case 'cm_manual': return 'Team';
    case 'facility_email': return 'Facility';
    case 'payer_portal': return 'Payer';
    default: return 'System';
  }
}

/* ── Agent role classification ── */

type AgentRole = 'Authorization' | 'Outreach' | 'Monitoring';

const ROLE_DESCRIPTIONS: Record<AgentRole, string> = {
  Authorization: 'Tracking payer decisions, deadlines, and escalations',
  Outreach: 'Managing facility contacts, referral delivery, and family communication',
  Monitoring: 'Watching for stalls, maintaining backup options, and enforcing guardrails',
};

const AGENT_ROLES: AgentRole[] = ['Authorization', 'Outreach', 'Monitoring'];

function classifyAgentRole(actionTitle: string): AgentRole {
  const t = actionTitle.toLowerCase();
  if (/pause|prevent|stall|keep|track|watch|backup|monitor/.test(t)) return 'Monitoring';
  if (/auth|sign-off|signoff|decision|deadline|escalat|payer|approv/.test(t)) return 'Authorization';
  if (/outreach|send|fax|call|family|recover|placement/.test(t)) return 'Outreach';
  return 'Monitoring';
}

/* ── Capability cards ── */

interface CapabilityCard {
  name: string;
  status: 'Active' | 'Degraded' | 'Down';
  description: string;
  lastChecked: string;
  detail: string;
}

const STATIC_CAPABILITIES: CapabilityCard[] = [
  { name: 'Clinical Notes', status: 'Active', description: 'Can pull notes from Epic EHR', lastChecked: '2026-02-16T08:42:00', detail: '3 new notes found' },
  { name: 'Facility Outreach', status: 'Degraded', description: 'Can email & fax facilities', lastChecked: '2026-02-16T08:05:00', detail: '1 fax delivery failed' },
  { name: 'Inbox Monitoring', status: 'Active', description: 'Watching 2 CM inboxes for facility replies', lastChecked: '2026-02-16T08:40:00', detail: 'a.rivera, j.lin' },
  { name: 'Team Coordination', status: 'Active', description: 'Capturing huddle notes & updates', lastChecked: '2026-02-16T07:30:00', detail: '2 patient updates captured' },
];

/* ── Mock periodic checks ── */

const MOCK_PERIODIC_CHECKS: FeedEntry[] = [
  { timestamp: '2026-02-16T08:42:00', source: 'EHR', description: 'Scanned clinical notes — 3 new notes found', isFailure: false },
  { timestamp: '2026-02-16T08:40:00', source: 'Email', description: 'Checked a.rivera@memorial-mc.org — no new messages', isFailure: false },
  { timestamp: '2026-02-16T08:38:00', source: 'Email', description: 'Checked j.lin@memorial-mc.org — 1 new message from Sunrise Manor', isFailure: false },
  { timestamp: '2026-02-16T08:30:00', source: 'Payer', description: 'Checked UnitedHealthcare MA portal — auth still pending', patientName: 'Martha Chen', isFailure: false },
  { timestamp: '2026-02-16T08:28:00', source: 'Payer', description: 'Checked Aetna Medicare portal — no pending auths', isFailure: false },
  { timestamp: '2026-02-16T08:20:00', source: 'EHR', description: 'Processed discharge note', patientName: 'Patricia Davis', isFailure: false },
  { timestamp: '2026-02-16T08:05:00', source: 'Facility', description: 'Sent referral packet to 4 facilities', patientName: 'Patricia Davis', isFailure: false },
  { timestamp: '2026-02-16T07:30:00', source: 'Team', description: 'Processed morning huddle — 2 patient updates captured', isFailure: false },
];

const MOCK_FACILITY_ISSUES: Issue[] = [
  { title: 'Fax delivery to Maplewood Rehab failed', detail: 'Busy signal after 3 retry attempts', timestamp: '2026-02-14T07:05:00', patientName: 'Martha Chen' }
];

/* ── Helpers ── */

function formatTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function statusDotClass(status: 'Active' | 'Degraded' | 'Down'): string {
  if (status === 'Active') return 'status-dot-green';
  if (status === 'Degraded') return 'status-dot-amber';
  return 'status-dot-red';
}

function agentStateClass(state: WorklistAgentRow['state']): string {
  if (state === 'Running') return 'agent-running';
  if (state === 'Failed') return 'agent-failed';
  if (state === 'Paused') return 'agent-paused';
  return 'agent-idle';
}

/* ── Component ── */

export default function SystemStatusView({
  patients,
  actionStatusById,
  executionModeByAction,
  blockerStatusById
}: SystemStatusViewProps) {
  const [activeStatusTab, setActiveStatusTab] = useState<StatusTab>('activity-log');

  /* Issues */
  const issues = useMemo(() => {
    const result: Issue[] = [];
    for (const patient of patients) {
      const rows = buildWorklistAgentRows(patient, actionStatusById, executionModeByAction, blockerStatusById);
      for (const row of rows) {
        if (row.state === 'Failed') {
          result.push({
            title: `${row.name} failed`,
            detail: row.failureText ?? 'See patient workspace for details',
            timestamp: row.lastRun ?? '',
            patientName: patient.patient_profile.patient_name
          });
        }
      }
    }
    result.push(...MOCK_FACILITY_ISSUES);
    return result;
  }, [patients, actionStatusById, executionModeByAction, blockerStatusById]);

  /* Activity feed */
  const activityFeed = useMemo(() => {
    const entries: FeedEntry[] = [];
    for (const patient of patients) {
      for (const log of patient.execution_log?.entries ?? []) {
        entries.push({
          timestamp: log.timestamp_local,
          source: mapLogToSource(log.event, log.result),
          description: log.result,
          patientName: patient.patient_profile.patient_name,
          isFailure: /fail/i.test(log.event)
        });
      }
    }
    for (const patient of patients) {
      for (const ev of patient.evidence_items.items) {
        entries.push({
          timestamp: ev.timestamp_local,
          source: mapEvidenceToSource(ev.source_type),
          description: `Processed ${ev.source_label}`,
          patientName: patient.patient_profile.patient_name,
          isFailure: false
        });
      }
    }
    entries.push(...MOCK_PERIODIC_CHECKS);
    entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return entries;
  }, [patients]);

  /* Capability cards — inject dynamic payer names */
  const capabilities = useMemo(() => {
    const payerNames = [...new Set(patients.map((p) => p.patient_profile.insurance.payer_name))];
    const payerCard: CapabilityCard = {
      name: 'Payer Auth Portals',
      status: 'Active',
      description: `Can check auth on ${payerNames.join(', ')} portals`,
      lastChecked: '2026-02-16T08:30:00',
      detail: `${payerNames.length} payer${payerNames.length !== 1 ? 's' : ''} connected`,
    };
    return [STATIC_CAPABILITIES[0], payerCard, ...STATIC_CAPABILITIES.slice(1)];
  }, [patients]);

  /* Agent grouping by role */
  const agentsByRole = useMemo(() => {
    const groups: Record<AgentRole, Array<{ patientName: string; row: WorklistAgentRow }>> = {
      Authorization: [],
      Outreach: [],
      Monitoring: [],
    };
    for (const patient of patients) {
      const rows = buildWorklistAgentRows(patient, actionStatusById, executionModeByAction, blockerStatusById);
      for (const row of rows) {
        const role = classifyAgentRole(row.name);
        groups[role].push({ patientName: patient.patient_profile.patient_name, row });
      }
    }
    return groups;
  }, [patients, actionStatusById, executionModeByAction, blockerStatusById]);

  const allAgentRows = [...agentsByRole.Authorization, ...agentsByRole.Outreach, ...agentsByRole.Monitoring];
  const agentCounts = {
    running: allAgentRows.filter((a) => a.row.state === 'Running').length,
    paused: allAgentRows.filter((a) => a.row.state === 'Paused').length,
    failed: allAgentRows.filter((a) => a.row.state === 'Failed').length,
    idle: allAgentRows.filter((a) => a.row.state === 'Idle').length,
  };

  const hasIssues = issues.length > 0;
  const overallStatus = hasIssues ? 'Degraded' : 'All Systems Operational';
  const overallClass = hasIssues ? 'status-banner-amber' : 'status-banner-green';

  return (
    <section className="view-single-pane system-status-view">
      {/* ── Always-visible: Health banner ── */}
      <div className={`system-status-banner ${overallClass}`}>
        <strong>{overallStatus}</strong>
        <div className="status-banner-chips">
          <span className="status-chip">EHR: Connected</span>
          <span className="status-chip">Payers: {[...new Set(patients.map((p) => p.patient_profile.insurance.payer_name))].length}/{[...new Set(patients.map((p) => p.patient_profile.insurance.payer_name))].length}</span>
          <span className="status-chip">Inboxes: 2/2</span>
        </div>
      </div>

      {/* ── Always-visible: Issues (conditional) ── */}
      {hasIssues && (
        <div className="system-section">
          <h3>Issues</h3>
          {issues.map((issue, i) => (
            <div key={i} className="issue-card">
              <div className="issue-card-head">
                <span className="status-dot status-dot-red" />
                <strong>{issue.title}</strong>
              </div>
              <div className="issue-card-meta">
                <span>{issue.detail}</span>
                {issue.timestamp && <span>{formatTime(issue.timestamp)}</span>}
                {issue.patientName && <span>Related: {issue.patientName}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Sub-tab navigation ── */}
      <nav className="detail-tabs" role="tablist" aria-label="System status sections">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeStatusTab === tab.id}
            className={`detail-tab ${activeStatusTab === tab.id ? 'detail-tab-active' : ''}`}
            onClick={() => setActiveStatusTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Tab content ── */}
      <div className="detail-tab-content">
        {/* Activity Log */}
        {activeStatusTab === 'activity-log' && (
          <div>
            <div className="activity-feed-list">
              {activityFeed.map((entry, i) => (
                <div key={i} className={`activity-feed-entry${entry.isFailure ? ' activity-failure' : ''}`}>
                  <span className="activity-time">{formatTime(entry.timestamp)}</span>
                  <span className={`activity-source-chip activity-source-${entry.source.toLowerCase()}`}>
                    {entry.source}
                  </span>
                  <span className="activity-description">
                    {entry.description}
                    {entry.patientName && <span className="activity-patient"> — {entry.patientName}</span>}
                    {entry.isFailure && <span className="activity-warning"> ⚠</span>}
                  </span>
                </div>
              ))}
            </div>
            <p className="activity-feed-summary">{activityFeed.length} checks completed today</p>
          </div>
        )}

        {/* Capabilities */}
        {activeStatusTab === 'capabilities' && (
          <div className="network-grid">
            {capabilities.map((cap, i) => (
              <div key={i} className="network-card">
                <div className="network-card-header">
                  <strong>{cap.name}</strong>
                  <span className={`status-dot ${statusDotClass(cap.status)}`} />
                </div>
                <div className="network-card-body">
                  <p className={`status-dot-inline ${statusDotClass(cap.status)}`}>{cap.status}</p>
                  <p className="subtle">{cap.description}</p>
                  <p className="subtle">Last: {formatTime(cap.lastChecked)} · {cap.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active Agents */}
        {activeStatusTab === 'active-agents' && (
          <div>
            <div className="agents-summary-bar">
              <span><strong>{agentCounts.running}</strong> Running</span>
              <span><strong>{agentCounts.paused}</strong> Paused</span>
              <span><strong>{agentCounts.failed}</strong> Failed</span>
              <span><strong>{agentCounts.idle}</strong> Idle</span>
            </div>

            {AGENT_ROLES.map((role) => (
              <div key={role} className="system-section">
                <h3>{role} Agents</h3>
                <p className="subtle">{ROLE_DESCRIPTIONS[role]}</p>
                {agentsByRole[role].length === 0 ? (
                  <p className="subtle">No active agents in this role</p>
                ) : (
                  <div className="automation-list">
                    {agentsByRole[role].map((entry, i) => (
                      <div key={i} className="automation-row">
                        <div className="automation-row-header">
                          <div>
                            <strong>{entry.row.name}</strong>
                            <span className="subtle" style={{ marginLeft: 8 }}>{entry.patientName}</span>
                          </div>
                          <span className={`agent-status-chip ${agentStateClass(entry.row.state)}`}>
                            {entry.row.state}
                          </span>
                        </div>
                        <div className="automation-row-meta">
                          <span>Mode: {entry.row.mode}</span>
                          {entry.row.lastRun && <span>Last: {formatTime(entry.row.lastRun)}</span>}
                          {entry.row.nextRun && <span>Next: {formatTime(entry.row.nextRun)}</span>}
                        </div>
                        {entry.row.failureText && (
                          <p className="automation-failure">{entry.row.failureText}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
