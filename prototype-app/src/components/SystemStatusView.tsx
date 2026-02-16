import { useMemo, useState } from 'react';
import type { ActionStatus, BlockerStatus, ExecutionModeDefault, PatientRecord } from '../types/mockData';

interface SystemStatusViewProps {
  patients: PatientRecord[];
  actionStatusById: Record<string, ActionStatus>;
  executionModeByAction: Record<string, ExecutionModeDefault>;
  blockerStatusById: Record<string, BlockerStatus>;
}

/* ── Sub-tab definitions ── */

type StatusTab = 'activity' | 'agents';

const STATUS_TABS: Array<{ id: StatusTab; label: string }> = [
  { id: 'activity', label: 'Activity' },
  { id: 'agents', label: 'Agents' },
];

/* ── Activity feed types ── */

type FeedSource = 'EHR' | 'Payer' | 'Facility' | 'Email' | 'Team' | 'System';
type FeedFilter = 'All' | 'Issues' | FeedSource;

const FILTER_OPTIONS: FeedFilter[] = ['All', 'Issues', 'EHR', 'Payer', 'Facility', 'Email', 'Team'];

interface FeedEntry {
  timestamp: string;
  source: FeedSource;
  description: string;
  patientName?: string;
  isFailure: boolean;
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
  { timestamp: '2026-02-16T08:30:00', source: 'Payer', description: 'Checked UnitedHealthcare MA portal — auth still pending', isFailure: false },
  { timestamp: '2026-02-16T08:28:00', source: 'Payer', description: 'Checked Aetna Medicare portal — no pending auths', isFailure: false },
  { timestamp: '2026-02-16T08:20:00', source: 'EHR', description: 'Processed discharge note', isFailure: false },
  { timestamp: '2026-02-16T08:05:00', source: 'Facility', description: 'Sent referral packet to 4 facilities', isFailure: false },
  { timestamp: '2026-02-16T07:30:00', source: 'Team', description: 'Processed morning huddle — 2 patient updates captured', isFailure: false },
  { timestamp: '2026-02-14T07:05:00', source: 'Facility', description: 'Fax to Maplewood Rehab failed — busy signal', isFailure: true },
];

/* ── Agent items ── */

interface AgentItem {
  name: string;
  description: string;
  status: 'Active' | 'Retrying' | 'Idle';
  detail: string;
  lastTime: string;
  retryTime?: string;
  schedule: string;
  nextRun?: string;
  runsToday: number;
}

const STATIC_AGENTS: AgentItem[] = [
  { name: 'Fax Delivery', description: 'Sends and tracks fax deliveries to facilities', status: 'Retrying', detail: 'Failed (busy signal)', lastTime: '2026-02-14T07:05:00', retryTime: '08:15', schedule: 'On demand', runsToday: 3 },
  { name: 'Clinical Notes', description: 'Scans EHR for new clinical notes and updates', status: 'Active', detail: '3 new notes found', lastTime: '2026-02-16T08:42:00', schedule: 'Every 30 min', nextRun: '09:12', runsToday: 24 },
  { name: 'Email Outreach', description: 'Sends and follows up on facility outreach emails', status: 'Active', detail: 'Resent facility outreach', lastTime: '2026-02-16T09:19:00', schedule: 'On demand', runsToday: 6 },
  { name: 'Phone Outreach', description: 'Tracks phone call follow-ups with payers and facilities', status: 'Active', detail: 'Auth follow-up call', lastTime: '2026-02-16T09:11:00', schedule: 'On demand', runsToday: 4 },
  { name: 'Inbox Monitor', description: 'Watches CM inboxes for incoming facility replies', status: 'Active', detail: '2 inboxes checked', lastTime: '2026-02-16T08:40:00', schedule: 'Every 15 min', nextRun: '08:55', runsToday: 38 },
  { name: 'Task Scheduler', description: 'Creates and schedules follow-up tasks', status: 'Active', detail: 'Family follow-up created', lastTime: '2026-02-16T09:10:00', schedule: 'Event-driven', runsToday: 7 },
  { name: 'Huddle Processing', description: 'Captures updates from team huddle notes', status: 'Active', detail: '2 updates captured', lastTime: '2026-02-16T07:30:00', schedule: 'Daily at 07:00', nextRun: 'Tomorrow 07:00', runsToday: 1 },
  { name: 'Deadline Tracking', description: 'Monitors authorization and placement deadlines', status: 'Active', detail: 'Auth deadline alert', lastTime: '2026-02-16T07:13:00', schedule: 'Every 60 min', nextRun: '08:13', runsToday: 8 },
  { name: 'Escalation Paging', description: 'Pages on-call staff when escalation is needed', status: 'Idle', detail: 'Escalation snoozed by CM', lastTime: '2026-02-16T09:08:00', schedule: 'Event-driven', runsToday: 2 },
];

/* ── Helpers ── */

function formatTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatTimeWithDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const time = parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const date = value.slice(0, 10);
  if (date === '2026-02-16') return time;
  const label = parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${label} ${time}`;
}

function agentStatusClass(status: AgentItem['status']): string {
  if (status === 'Active') return 'agent-running';
  if (status === 'Retrying') return 'agent-paused';
  return 'agent-idle';
}

const TRUNCATE_LIMIT = 12;

/* ── Component ── */

export default function SystemStatusView({
  patients,
  actionStatusById: _actionStatusById,
  executionModeByAction: _executionModeByAction,
  blockerStatusById: _blockerStatusById,
}: SystemStatusViewProps) {
  const [activeStatusTab, setActiveStatusTab] = useState<StatusTab>('activity');
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('All');
  const [showAll, setShowAll] = useState(false);

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
          isFailure: /fail/i.test(log.event),
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
          isFailure: false,
        });
      }
    }
    entries.push(...MOCK_PERIODIC_CHECKS);
    entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return entries;
  }, [patients]);

  /* Filtered feed */
  const filteredFeed = useMemo(() => {
    if (activeFilter === 'All') return activityFeed;
    if (activeFilter === 'Issues') return activityFeed.filter((e) => e.isFailure);
    return activityFeed.filter((e) => e.source === activeFilter);
  }, [activityFeed, activeFilter]);

  /* Date-grouped feed */
  const groupedFeed = useMemo(() => {
    const groups: Array<{ dateLabel: string; entries: FeedEntry[] }> = [];
    let currentDate = '';
    for (const entry of filteredFeed) {
      const date = entry.timestamp.slice(0, 10);
      if (date !== currentDate) {
        currentDate = date;
        const label =
          date === '2026-02-16'
            ? 'Today'
            : new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        groups.push({ dateLabel: label, entries: [] });
      }
      groups[groups.length - 1].entries.push(entry);
    }
    return groups;
  }, [filteredFeed]);

  const totalEntries = filteredFeed.length;

  /* Agents list — inject dynamic auth tracking payer names */
  const agents = useMemo(() => {
    const payerNames = [...new Set(patients.map((p) => p.patient_profile.insurance.payer_name))];
    const authAgent: AgentItem = {
      name: 'Auth Tracking',
      description: 'Monitors payer portals for authorization decisions',
      status: 'Active',
      detail: `Monitoring ${payerNames.length} payer portals`,
      lastTime: '2026-02-16T08:30:00',
      schedule: 'Every 60 min',
      nextRun: '09:30',
      runsToday: 9,
    };
    // Insert auth tracking after Clinical Notes (index 1)
    const result = [...STATIC_AGENTS];
    result.splice(2, 0, authAgent);
    // Sort: Retrying first, Active, Idle
    const order: Record<string, number> = { Retrying: 0, Active: 1, Idle: 2 };
    result.sort((a, b) => order[a.status] - order[b.status]);
    return result;
  }, [patients]);

  const agentCounts = useMemo(() => {
    const counts = { active: 0, retrying: 0, idle: 0 };
    for (const agent of agents) {
      if (agent.status === 'Active') counts.active++;
      else if (agent.status === 'Retrying') counts.retrying++;
      else counts.idle++;
    }
    return counts;
  }, [agents]);

  return (
    <section className="view-single-pane system-status-view">
      {/* ── Sub-tab navigation ── */}
      <nav className="detail-tabs" role="tablist" aria-label="Oversight sections">
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
        {/* Activity */}
        {activeStatusTab === 'activity' && (
          <div>
            {/* Filter chips */}
            <div className="activity-filter-bar">
              {FILTER_OPTIONS.map((filter) => (
                <button
                  key={filter}
                  className={`activity-filter-chip ${activeFilter === filter ? 'activity-filter-chip-active' : ''}`}
                  onClick={() => { setActiveFilter(filter); setShowAll(false); }}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Date-grouped feed */}
            <div className="activity-feed-list">
              {(() => {
                let rendered = 0;
                const limit = showAll ? Infinity : TRUNCATE_LIMIT;
                return groupedFeed.map((group) => {
                  if (rendered >= limit) return null;
                  const entriesToShow = group.entries.slice(0, limit - rendered);
                  rendered += entriesToShow.length;
                  return (
                    <div key={group.dateLabel}>
                      <div className="activity-date-separator">{group.dateLabel}</div>
                      {entriesToShow.map((entry, i) => (
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
                  );
                });
              })()}
            </div>

            {!showAll && totalEntries > TRUNCATE_LIMIT && (
              <button className="activity-show-all" onClick={() => setShowAll(true)}>
                Show all {totalEntries} entries
              </button>
            )}

            {showAll && totalEntries > TRUNCATE_LIMIT && (
              <button className="activity-show-all" onClick={() => setShowAll(false)}>
                Show less
              </button>
            )}
          </div>
        )}

        {/* Agents */}
        {activeStatusTab === 'agents' && (
          <div>
            <div className="agents-summary-line">
              <span><strong>{agentCounts.active}</strong> active</span>
              {agentCounts.retrying > 0 && <span><strong>{agentCounts.retrying}</strong> retrying</span>}
              <span><strong>{agentCounts.idle}</strong> idle</span>
            </div>

            <div className="agent-list">
              {agents.map((agent, i) => (
                <div key={i} className={`agent-row ${agent.status === 'Retrying' ? 'agent-row-retrying' : ''}`}>
                  <div className="agent-row-left">
                    <strong className="agent-row-name">{agent.name}</strong>
                    <span className="agent-row-desc">
                      {agent.description} · {agent.schedule}
                      {agent.nextRun && ` · Next: ${agent.nextRun}`}
                      {' · '}{agent.runsToday} {agent.runsToday === 1 ? 'run' : 'runs'} today
                    </span>
                  </div>
                  <span className="agent-row-detail">
                    {agent.status === 'Retrying'
                      ? `${agent.detail} · Retry at ${agent.retryTime}`
                      : agent.detail}
                  </span>
                  <span className="agent-row-time">{formatTimeWithDate(agent.lastTime)}</span>
                  <span className={`agent-status-chip ${agentStatusClass(agent.status)}`}>
                    {agent.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
