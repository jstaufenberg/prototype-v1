import { useMemo } from 'react';
import type { ActionStatus, BlockerStatus, ExecutionModeDefault, PatientRecord } from '../types/mockData';
import { buildWorklistAgentRows } from '../utils/worklistAgents';

interface SystemStatusViewProps {
  patients: PatientRecord[];
  actionStatusById: Record<string, ActionStatus>;
  executionModeByAction: Record<string, ExecutionModeDefault>;
  blockerStatusById: Record<string, BlockerStatus>;
}

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

/* ── Component ── */

export default function SystemStatusView({
  patients,
  actionStatusById,
  executionModeByAction,
  blockerStatusById
}: SystemStatusViewProps) {

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

  const hasIssues = issues.length > 0;
  const overallStatus = hasIssues ? 'Degraded' : 'All Systems Operational';
  const overallClass = hasIssues ? 'status-banner-amber' : 'status-banner-green';

  return (
    <section className="view-single-pane system-status-view">
      <div className={`system-status-banner ${overallClass}`}>
        <strong>{overallStatus}</strong>
        <div className="status-banner-chips">
          <span className="status-chip">EHR: Connected</span>
          <span className="status-chip">Payers: 2/2</span>
          <span className="status-chip">Inboxes: 2/2</span>
        </div>
      </div>

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

      <div className="system-section">
        <h3>Activity</h3>
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
    </section>
  );
}
