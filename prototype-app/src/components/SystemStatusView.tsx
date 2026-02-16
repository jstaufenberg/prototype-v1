import { useMemo } from 'react';
import type { ActionStatus, BlockerStatus, ExecutionModeDefault, PatientRecord } from '../types/mockData';
import { buildWorklistAgentRows, type WorklistAgentRow } from '../utils/worklistAgents';

interface SystemStatusViewProps {
  patients: PatientRecord[];
  actionStatusById: Record<string, ActionStatus>;
  executionModeByAction: Record<string, ExecutionModeDefault>;
  blockerStatusById: Record<string, BlockerStatus>;
}

// --- Mock inline constants ---

const EHR_CONNECTION = {
  system: 'Epic EHR',
  status: 'Connected' as const,
  lastSync: '2026-02-16T08:42:00',
  uptime: 99.97,
  apiVersion: 'FHIR R4',
  environment: 'Production'
};

interface DataFeedRow {
  sourceType: string;
  label: string;
  description: string;
  count: number;
  lastUpdate: string;
  status: 'Active' | 'Stale';
}

const DATA_FEED_LABELS: Record<string, { label: string; description: string }> = {
  adt_event: { label: 'ADT Feed', description: 'Admit/Discharge/Transfer events' },
  pt_note: { label: 'Clinical Notes', description: 'Physician, therapy, consult notes' },
  discharge_note: { label: 'Discharge Notes', description: 'CM and SW discharge planning' },
  order_event: { label: 'Orders', description: 'Discharge orders, consults, DME' },
  ur_system: { label: 'UR System', description: 'Utilization review, auth deadlines' },
  huddle_capture: { label: 'Huddle Capture', description: 'Rounding and team meeting notes' },
  payer_portal: { label: 'Payer Portal', description: 'Insurance auth status updates' },
  facility_email: { label: 'Facility Email', description: 'Post-acute facility responses' },
  cm_manual: { label: 'CM Manual Entry', description: 'Case manager observations & notes' }
};

// Supplementary mock rows for source types not in evidence_items
const SUPPLEMENTARY_FEEDS: DataFeedRow[] = [
  { sourceType: 'order_event', label: 'Orders', description: 'Discharge orders, consults, DME', count: 12, lastUpdate: '2026-02-16T08:41:00', status: 'Active' },
  { sourceType: 'ur_system', label: 'UR System', description: 'Utilization review, auth deadlines', count: 6, lastUpdate: '2026-02-16T07:55:00', status: 'Active' },
  { sourceType: 'huddle_capture', label: 'Huddle Capture', description: 'Rounding and team meeting notes', count: 3, lastUpdate: '2026-02-16T07:30:00', status: 'Active' }
];

interface PayerConnectionRow {
  payer: string;
  channel: string;
  status: 'Active' | 'Ready' | 'Down';
  lastCheck: string;
  notes: string;
}

interface FacilityChannelRow {
  channel: string;
  status: 'Active' | 'Ready' | 'Down';
  sent: number;
  delivered: number;
  responses: number;
  failed: number;
}

const FACILITY_CHANNELS: FacilityChannelRow[] = [
  { channel: 'Facility Email', status: 'Active', sent: 4, delivered: 4, responses: 2, failed: 0 },
  { channel: 'Facility Fax', status: 'Active', sent: 3, delivered: 2, responses: 1, failed: 1 },
  { channel: 'Facility Phone Agent', status: 'Ready', sent: 1, delivered: 1, responses: 1, failed: 0 }
];

interface EmailInboxRow {
  inbox: string;
  person: string;
  status: 'Active' | 'Paused';
  lastChecked: string;
  unprocessed: number;
}

const EMAIL_INBOXES: EmailInboxRow[] = [
  { inbox: 'a.rivera@memorial-mc.org', person: 'A. Rivera, RN', status: 'Active', lastChecked: '2026-02-16T08:40:00', unprocessed: 0 },
  { inbox: 'j.lin@memorial-mc.org', person: 'J. Lin, RN', status: 'Active', lastChecked: '2026-02-16T08:38:00', unprocessed: 1 }
];

// Keywords for classifying agents
const MONITORING_KEYWORDS = /monitor|check|track|follow.?up|review|keep|verify|backup|active|watch|poll/i;
const EXECUTIVE_KEYWORDS = /send|fax|call|submit|outreach|recover|get|start|request|notify|escalat/i;

// --- Helpers ---

function formatTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function statusDot(status: 'Active' | 'Ready' | 'Connected' | 'Down' | 'Stale' | 'Paused'): string {
  if (status === 'Active' || status === 'Connected' || status === 'Ready') return 'status-dot-green';
  if (status === 'Down') return 'status-dot-red';
  if (status === 'Stale') return 'status-dot-amber';
  return 'status-dot-amber';
}

function agentChipClass(state: WorklistAgentRow['state']): string {
  if (state === 'Running') return 'agent-chip-running';
  if (state === 'Failed') return 'agent-chip-failed';
  if (state === 'Paused') return 'agent-chip-paused';
  return 'agent-chip-idle';
}

function agentFormatTime(value?: string | null): string {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// --- Component ---

export default function SystemStatusView({
  patients,
  actionStatusById,
  executionModeByAction,
  blockerStatusById
}: SystemStatusViewProps) {

  // Build data feed rows from evidence_items (migrated from IntelView)
  const dataFeeds: DataFeedRow[] = useMemo(() => {
    const typeMap = new Map<string, { count: number; lastUpdate: string }>();
    for (const patient of patients) {
      for (const ev of patient.evidence_items.items) {
        const existing = typeMap.get(ev.source_type);
        if (!existing) {
          typeMap.set(ev.source_type, { count: 1, lastUpdate: ev.timestamp_local });
        } else {
          existing.count += 1;
          if (ev.timestamp_local > existing.lastUpdate) {
            existing.lastUpdate = ev.timestamp_local;
          }
        }
      }
    }

    const rows: DataFeedRow[] = [];
    for (const [sourceType, data] of typeMap.entries()) {
      const meta = DATA_FEED_LABELS[sourceType];
      const hoursSinceUpdate = (Date.now() - new Date(data.lastUpdate).getTime()) / (1000 * 60 * 60);
      rows.push({
        sourceType,
        label: meta?.label ?? sourceType.replace(/_/g, ' '),
        description: meta?.description ?? '',
        count: data.count,
        lastUpdate: data.lastUpdate,
        status: hoursSinceUpdate < 24 ? 'Active' : 'Stale'
      });
    }

    // Add supplementary mock feeds for source types not in evidence_items
    for (const supplement of SUPPLEMENTARY_FEEDS) {
      if (!typeMap.has(supplement.sourceType)) {
        rows.push(supplement);
      }
    }

    rows.sort((a, b) => b.count - a.count);
    return rows;
  }, [patients]);

  // Patient data feed summary
  const patientDataSummary = useMemo(() => {
    return patients.map((patient) => {
      const items = patient.evidence_items.items;
      const lastData = items.length > 0
        ? items.reduce((latest, item) => item.timestamp_local > latest ? item.timestamp_local : latest, items[0].timestamp_local)
        : '';
      return {
        patientId: patient.meta.patient_id,
        name: patient.patient_profile.patient_name,
        bed: patient.patient_profile.current_location.bed,
        sourceCount: items.length,
        lastData,
        status: 'Active' as const
      };
    });
  }, [patients]);

  // Payer connections derived from patient insurance data
  const payerConnections: PayerConnectionRow[] = useMemo(() => {
    const seen = new Set<string>();
    const rows: PayerConnectionRow[] = [];
    for (const patient of patients) {
      const ins = patient.patient_profile.insurance;
      const key = ins.payer_name;
      if (!seen.has(key)) {
        seen.add(key);
        const pendingCount = patients.filter(
          (p) => p.patient_profile.insurance.payer_name === key && p.patient_profile.insurance.auth_status !== 'Approved'
        ).length;
        rows.push({
          payer: key,
          channel: 'Portal',
          status: 'Active',
          lastCheck: '2026-02-16T08:30:00',
          notes: pendingCount > 0 ? `Auth pending for ${pendingCount} patient${pendingCount > 1 ? 's' : ''}` : 'No pending auths'
        });
        rows.push({
          payer: key,
          channel: 'Phone Agent',
          status: 'Ready',
          lastCheck: '',
          notes: 'Available for auth follow-up'
        });
      }
    }
    return rows;
  }, [patients]);

  // Agent pipeline: classify into monitoring vs executive
  const { monitoringAgents, executiveAgents } = useMemo(() => {
    const monitoring: Array<WorklistAgentRow & { patientName: string }> = [];
    const executive: Array<WorklistAgentRow & { patientName: string }> = [];

    for (const patient of patients) {
      const rows = buildWorklistAgentRows(patient, actionStatusById, executionModeByAction, blockerStatusById);
      for (const row of rows) {
        const extended = { ...row, patientName: patient.patient_profile.patient_name };
        if (EXECUTIVE_KEYWORDS.test(row.name)) {
          executive.push(extended);
        } else if (MONITORING_KEYWORDS.test(row.name)) {
          monitoring.push(extended);
        } else {
          monitoring.push(extended); // default to monitoring
        }
      }
    }

    return { monitoringAgents: monitoring, executiveAgents: executive };
  }, [patients, actionStatusById, executionModeByAction, blockerStatusById]);

  // Overall status
  const totalAgents = monitoringAgents.length + executiveAgents.length;
  const runningAgents = [...monitoringAgents, ...executiveAgents].filter((a) => a.state === 'Running').length;
  const failedAgents = [...monitoringAgents, ...executiveAgents].filter((a) => a.state === 'Failed').length;
  const hasIssues = failedAgents > 0 || EHR_CONNECTION.status !== 'Connected';
  const overallStatus = hasIssues ? 'Degraded' : 'All Systems Operational';
  const overallClass = hasIssues ? 'status-banner-amber' : 'status-banner-green';

  return (
    <section className="view-single-pane system-status-view">
      {/* Section A: Status Banner */}
      <div className={`system-status-banner ${overallClass}`}>
        <strong>{overallStatus}</strong>
        <div className="status-banner-chips">
          <span className="status-chip">EHR: {EHR_CONNECTION.status}</span>
          <span className="status-chip">Payers: {payerConnections.filter((p) => p.channel === 'Portal').length}/{payerConnections.filter((p) => p.channel === 'Portal').length} Active</span>
          <span className="status-chip">Email: {EMAIL_INBOXES.length}/{EMAIL_INBOXES.length} Active</span>
          <span className="status-chip">Agents: {runningAgents} Running{failedAgents > 0 ? `, ${failedAgents} Failed` : ''}</span>
        </div>
      </div>

      {/* Section B: Hospital Systems */}
      <div className="system-section">
        <h3>Hospital Systems</h3>
        <p className="subtle">Clinical data feeds from the electronic health record</p>

        <div className="ehr-connection-card">
          <div className="ehr-connection-head">
            <span className={`status-dot ${statusDot(EHR_CONNECTION.status)}`} />
            <strong>{EHR_CONNECTION.system}</strong>
            <span className="chip chip-accent">{EHR_CONNECTION.status}</span>
          </div>
          <div className="ehr-connection-meta">
            <span>Last sync: {formatTime(EHR_CONNECTION.lastSync)}</span>
            <span>Uptime: {EHR_CONNECTION.uptime}%</span>
            <span>{EHR_CONNECTION.apiVersion}</span>
            <span>{EHR_CONNECTION.environment}</span>
          </div>
        </div>

        <h4 className="system-sub-heading">Data Feeds</h4>
        <div className="system-table">
          <div className="system-table-header">
            <span>Source</span>
            <span>Description</span>
            <span>Items</span>
            <span>Last Update</span>
            <span>Status</span>
          </div>
          {dataFeeds.map((feed) => (
            <div key={feed.sourceType} className="system-table-row">
              <span>{feed.label}</span>
              <span className="subtle">{feed.description}</span>
              <span>{feed.count}</span>
              <span>{formatTime(feed.lastUpdate)}</span>
              <span className={`status-dot-inline ${statusDot(feed.status)}`}>{feed.status}</span>
            </div>
          ))}
        </div>

        <h4 className="system-sub-heading">Patient Data</h4>
        <div className="system-table">
          <div className="system-table-header">
            <span>Patient</span>
            <span>Status</span>
            <span>Sources</span>
            <span>Last Data</span>
          </div>
          {patientDataSummary.map((row) => (
            <div key={row.patientId} className="system-table-row">
              <span>{row.name} ({row.bed})</span>
              <span className={`status-dot-inline ${statusDot(row.status)}`}>{row.status}</span>
              <span>{row.sourceCount} items</span>
              <span>{row.lastData ? formatTime(row.lastData) : '--'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section C: Payer Connections */}
      <div className="system-section">
        <h3>Payer Connections</h3>
        <p className="subtle">Insurance authorization portals and phone lines</p>

        <div className="system-table">
          <div className="system-table-header">
            <span>Payer</span>
            <span>Channel</span>
            <span>Status</span>
            <span>Last Check</span>
            <span>Notes</span>
          </div>
          {payerConnections.map((row, index) => (
            <div key={`${row.payer}-${row.channel}-${index}`} className="system-table-row">
              <span>{row.payer}</span>
              <span>{row.channel}</span>
              <span className={`status-dot-inline ${statusDot(row.status)}`}>{row.status}</span>
              <span>{row.lastCheck ? formatTime(row.lastCheck) : '--'}</span>
              <span className="subtle">{row.notes}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section D: Facility Network Feeds */}
      <div className="system-section">
        <h3>Facility Network</h3>
        <p className="subtle">Post-acute facility communication channels</p>

        <div className="system-table">
          <div className="system-table-header">
            <span>Channel</span>
            <span>Status</span>
            <span>Sent</span>
            <span>Delivered</span>
            <span>Responses</span>
            <span>Failed</span>
          </div>
          {FACILITY_CHANNELS.map((row) => (
            <div key={row.channel} className="system-table-row">
              <span>{row.channel}</span>
              <span className={`status-dot-inline ${statusDot(row.status)}`}>{row.status}</span>
              <span>{row.sent}</span>
              <span>{row.delivered}</span>
              <span>{row.responses}</span>
              <span>{row.failed > 0 ? <strong className="text-red">{row.failed}</strong> : row.failed}</span>
            </div>
          ))}
        </div>

        <h4 className="system-sub-heading">Email Inbox Monitoring</h4>
        <div className="system-table">
          <div className="system-table-header">
            <span>Inbox</span>
            <span>Person</span>
            <span>Status</span>
            <span>Last Checked</span>
            <span>Unprocessed</span>
          </div>
          {EMAIL_INBOXES.map((row) => (
            <div key={row.inbox} className="system-table-row">
              <span className="monospace">{row.inbox}</span>
              <span>{row.person}</span>
              <span className={`status-dot-inline ${statusDot(row.status)}`}>{row.status}</span>
              <span>{row.lastChecked ? formatTime(row.lastChecked) : '--'}</span>
              <span>{row.unprocessed > 0 ? <strong>{row.unprocessed}</strong> : row.unprocessed}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section E: Agent Pipeline */}
      <div className="system-section">
        <h3>Agent Activity</h3>
        <p className="subtle">Monitoring agents surface findings that trigger executive agents to act</p>

        <div className="agent-pipeline">
          <div className="agent-pipeline-column">
            <h4 className="agent-pipeline-heading">Monitoring Agents</h4>
            <p className="subtle">Watch for changes and surface findings</p>
            {monitoringAgents.length === 0 ? (
              <p className="subtle">No monitoring agents active.</p>
            ) : (
              <div className="agent-pipeline-table">
                {monitoringAgents.map((agent) => (
                  <div key={agent.actionId} className="agent-pipeline-row">
                    <div className="agent-pipeline-row-head">
                      <strong>{agent.name}</strong>
                      <span className={`chip ${agentChipClass(agent.state)}`}>{agent.state}</span>
                    </div>
                    <div className="agent-pipeline-row-meta">
                      <span>{agent.patientName}</span>
                      <span>Last: {agentFormatTime(agent.lastRun)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="agent-pipeline-arrow" aria-hidden="true">
            <span className="pipeline-arrow-line" />
            <span className="pipeline-arrow-label">Findings trigger actions</span>
            <span className="pipeline-arrow-head">→</span>
          </div>

          <div className="agent-pipeline-column">
            <h4 className="agent-pipeline-heading">Executive Agents</h4>
            <p className="subtle">Take actions: calls, faxes, messages, submissions</p>
            {executiveAgents.length === 0 ? (
              <p className="subtle">No executive agents active.</p>
            ) : (
              <div className="agent-pipeline-table">
                {executiveAgents.map((agent) => (
                  <div key={agent.actionId} className="agent-pipeline-row">
                    <div className="agent-pipeline-row-head">
                      <strong>{agent.name}</strong>
                      <span className={`chip ${agentChipClass(agent.state)}`}>{agent.state}</span>
                    </div>
                    <div className="agent-pipeline-row-meta">
                      <span>{agent.patientName}</span>
                      <span>Last: {agentFormatTime(agent.lastRun)}</span>
                      {agent.failureText && <span className="text-red">{agent.failureText}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="agent-summary-stats">
          <span>{totalAgents} Total</span>
          <span>{runningAgents} Running</span>
          {failedAgents > 0 && <span className="text-red">{failedAgents} Failed</span>}
        </div>
      </div>
    </section>
  );
}
