import { useMemo, useState } from 'react';
import type { ActionStatus, BlockerStatus, PatientRecord } from '../types/mockData';

interface PerformanceViewProps {
  patients: PatientRecord[];
  actionStatusById: Record<string, ActionStatus>;
  blockerStatusById: Record<string, BlockerStatus>;
}

interface MetricCard {
  label: string;
  value: string;
  trend?: string;
  trendDirection: 'positive' | 'negative' | 'neutral';
  description: string;
  dataLabel: 'Computed' | 'Illustrative';
}

/* ── Sub-tab definitions ── */

type PerfTab = 'my-metrics' | 'department';

const PERF_TABS: Array<{ id: PerfTab; label: string }> = [
  { id: 'my-metrics', label: 'My Metrics' },
  { id: 'department', label: 'Department' },
];

/* ── Agent activity summary (static, matches Oversight agent data) ── */

const AGENT_ACTIVITY_SUMMARY = [
  { label: 'note scans', count: 24 },
  { label: 'inbox checks', count: 38 },
  { label: 'emails sent', count: 6 },
  { label: 'calls made', count: 4 },
  { label: 'faxes sent', count: 3 },
  { label: 'auth checks', count: 9 },
  { label: 'tasks created', count: 7 },
];

export default function PerformanceView({ patients, actionStatusById, blockerStatusById }: PerformanceViewProps) {
  const [activeTab, setActiveTab] = useState<PerfTab>('my-metrics');

  /* ── My Metrics: hero ── */
  const myHero: MetricCard[] = useMemo(() => {
    const total = patients.length;
    const avgLos = patients.reduce((sum, p) => sum + p.worklist_view_state.los_day, 0) / total;
    const avgExpected = patients.reduce((sum, p) => sum + (p.worklist_view_state.expected_los_day ?? 0), 0) / total;
    const losDelta = avgLos - avgExpected;
    const totalBlockers = patients.reduce((sum, p) =>
      sum + p.blockers.items.filter(b => (blockerStatusById[b.blocker_id] ?? b.status) === 'ACTIVE').length, 0
    );

    return [
      {
        label: 'Time Saved by Agents',
        value: '3.2 hrs/day',
        trend: 'vs. manual baseline',
        trendDirection: 'positive' as const,
        description: 'CMs spend ~36% of time on admin tasks. Agents reduce status-chasing, phone, and fax work',
        dataLabel: 'Illustrative' as const,
      },
      {
        label: 'Avg LOS vs Expected',
        value: `${avgLos.toFixed(1)}d`,
        trend: losDelta > 0 ? `+${losDelta.toFixed(1)}d over expected` : 'On target',
        trendDirection: losDelta > 0 ? 'negative' as const : 'positive' as const,
        description: '#1 metric CMs are evaluated on. Each extra day = ~$2,883 in costs',
        dataLabel: 'Computed' as const,
      },
      {
        label: 'Active Blockers',
        value: `${totalBlockers}`,
        trend: `${(totalBlockers / total).toFixed(1)} per patient`,
        trendDirection: totalBlockers > total ? 'negative' as const : 'positive' as const,
        description: 'Unresolved discharge blockers across your caseload',
        dataLabel: 'Computed' as const,
      },
    ];
  }, [patients, blockerStatusById]);

  /* ── My Metrics: supporting ── */
  const mySupporting: MetricCard[] = useMemo(() => {
    const total = patients.length;
    const delayedCount = patients.filter(p => p.worklist_view_state.bucket_status === 'Delayed').length;
    const onTrackCount = patients.filter(p => p.worklist_view_state.bucket_status === 'On Track').length;
    const totalActions = patients.reduce((sum, p) => sum + p.proposed_actions.items.length, 0);
    const completedActions = patients.reduce((sum, p) =>
      sum + p.proposed_actions.items.filter(a => {
        const s = actionStatusById[a.action_id] ?? a.status;
        return s === 'EXECUTED' || s === 'APPROVED';
      }).length, 0
    );

    return [
      {
        label: 'Caseload',
        value: `${total} patients`,
        trend: `${delayedCount} delayed, ${onTrackCount} on track`,
        trendDirection: 'neutral' as const,
        description: 'Active patients on your worklist',
        dataLabel: 'Computed' as const,
      },
      {
        label: 'Agent Actions Completed',
        value: totalActions > 0 ? `${completedActions} of ${totalActions}` : 'N/A',
        trend: totalActions > 0 ? `${Math.round((completedActions / totalActions) * 100)}% completion rate` : undefined,
        trendDirection: 'neutral' as const,
        description: 'Agent-proposed actions approved or completed by you',
        dataLabel: 'Computed' as const,
      },
      {
        label: 'Discharge Before Noon',
        value: '68%',
        trend: 'Target: 75%',
        trendDirection: 'neutral' as const,
        description: 'Earlier discharges free beds for afternoon surgical admissions',
        dataLabel: 'Illustrative' as const,
      },
    ];
  }, [patients, actionStatusById]);

  /* ── Department: hero ── */
  const deptHero: MetricCard[] = useMemo(() => [
    {
      label: 'Avoidable Days',
      value: '12 this month',
      trend: '~$34,596 impact',
      trendDirection: 'negative' as const,
      description: '~$2,883 per avoidable day. Biggest dollar metric for hospital CFOs',
      dataLabel: 'Illustrative' as const,
    },
    {
      label: 'Denial Rate',
      value: '6.4%',
      trend: 'Industry avg: 11.8%',
      trendDirection: 'positive' as const,
      description: '$20B industry problem (AHA). ~$57 per denied claim in admin rework + revenue at risk',
      dataLabel: 'Illustrative' as const,
    },
    {
      label: 'CMS Penalty Exposure',
      value: '$142K/year',
      trend: 'Combined HRRP + HAC + VBP',
      trendDirection: 'negative' as const,
      description: 'Max potential: 6% of Medicare payments. A $200M Medicare hospital could face $12M/year',
      dataLabel: 'Illustrative' as const,
    },
  ], []);

  /* ── Department: supporting ── */
  const deptSupporting: MetricCard[] = useMemo(() => {
    const totalActions = patients.reduce((sum, p) => sum + p.proposed_actions.items.length, 0);
    const adoptedActions = patients.reduce((sum, p) =>
      sum + p.proposed_actions.items.filter(a => {
        const s = actionStatusById[a.action_id] ?? a.status;
        return s === 'EXECUTED' || s === 'APPROVED';
      }).length, 0
    );

    return [
      {
        label: '30-Day Readmission Rate',
        value: '8.2%',
        trend: 'Target: <10%',
        trendDirection: 'positive' as const,
        description: 'CMS penalizes up to 3% of ALL Medicare payments via HRRP. 78% of hospitals penalized',
        dataLabel: 'Illustrative' as const,
      },
      {
        label: 'Discharge Rate (7-day)',
        value: '82%',
        trend: '+4% from prior period',
        trendDirection: 'positive' as const,
        description: '5% ALOS reduction = ~37 additional beds equivalent without construction',
        dataLabel: 'Illustrative' as const,
      },
      {
        label: 'Agent Adoption',
        value: totalActions > 0 ? `${Math.round((adoptedActions / totalActions) * 100)}%` : 'N/A',
        trend: 'Target: \u226530%',
        trendDirection: 'neutral' as const,
        description: 'Proportion of agent-proposed actions approved or executed. Validation gate: \u226530%',
        dataLabel: 'Computed' as const,
      },
    ];
  }, [patients, actionStatusById]);

  const totalAgentRuns = AGENT_ACTIVITY_SUMMARY.reduce((sum, a) => sum + a.count, 0);

  return (
    <section className="view-single-pane performance-view">
      {/* ── Sub-tab navigation ── */}
      <nav className="detail-tabs" role="tablist" aria-label="Performance sections">
        {PERF_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`detail-tab ${activeTab === tab.id ? 'detail-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Tab content ── */}
      <div className="detail-tab-content">
        {/* My Metrics */}
        {activeTab === 'my-metrics' && (
          <div>
            <div className="perf-hero-row">
              {myHero.map((metric) => (
                <MetricCardComponent key={metric.label} metric={metric} hero />
              ))}
            </div>

            <div className="perf-agent-summary">
              <strong>{totalAgentRuns} agent runs today</strong>
              {' — '}
              {AGENT_ACTIVITY_SUMMARY.map((a, i) => (
                <span key={a.label}>
                  {a.count} {a.label}{i < AGENT_ACTIVITY_SUMMARY.length - 1 ? ' · ' : ''}
                </span>
              ))}
            </div>

            <div className="perf-grid">
              {mySupporting.map((metric) => (
                <MetricCardComponent key={metric.label} metric={metric} />
              ))}
            </div>
          </div>
        )}

        {/* Department */}
        {activeTab === 'department' && (
          <div>
            <div className="perf-hero-row">
              {deptHero.map((metric) => (
                <MetricCardComponent key={metric.label} metric={metric} hero />
              ))}
            </div>

            <div className="perf-grid">
              {deptSupporting.map((metric) => (
                <MetricCardComponent key={metric.label} metric={metric} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCardComponent({ metric, hero }: { metric: MetricCard; hero?: boolean }) {
  return (
    <div className={hero ? 'perf-hero-card' : 'perf-card'}>
      <div className="perf-card-top">
        <span className="perf-card-label">{metric.label}</span>
        <span className={`perf-data-label perf-data-${metric.dataLabel.toLowerCase()}`}>
          {metric.dataLabel}
        </span>
      </div>
      <p className="perf-card-value">{metric.value}</p>
      {metric.trend && (
        <p className={`perf-card-trend perf-trend-${metric.trendDirection}`}>
          {metric.trend}
        </p>
      )}
      <p className="perf-card-desc">{metric.description}</p>
    </div>
  );
}
