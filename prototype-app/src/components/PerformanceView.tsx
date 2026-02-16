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
  dataLabel: 'Computed' | 'Illustrative';
}

/* ── Sub-tab definitions ── */

type PerfTab = 'my-metrics' | 'department';

const PERF_TABS: Array<{ id: PerfTab; label: string }> = [
  { id: 'my-metrics', label: 'My Metrics' },
  { id: 'department', label: 'Department' },
];

export default function PerformanceView({ patients, actionStatusById, blockerStatusById }: PerformanceViewProps) {
  const [activeTab, setActiveTab] = useState<PerfTab>('my-metrics');

  /* ── My Metrics: hero ── */
  const myHero: MetricCard[] = useMemo(() => {
    const total = patients.length;
    const avgLos = patients.reduce((sum, p) => sum + p.worklist_view_state.los_day, 0) / total;

    return [
      {
        label: 'Time Saved by Agents',
        value: '3.2 hrs/day',
        trend: 'vs. manual baseline',
        trendDirection: 'positive' as const,
        dataLabel: 'Illustrative' as const,
      },
      {
        label: 'Avg LOS vs Expected',
        value: `${avgLos.toFixed(1)}d`,
        trend: 'Est. 0.3d saved by agents',
        trendDirection: 'positive' as const,
        dataLabel: 'Computed' as const,
      },
      {
        label: 'Active Blockers',
        value: `${patients.reduce((sum, p) => sum + p.blockers.items.filter(b => (blockerStatusById[b.blocker_id] ?? b.status) === 'ACTIVE').length, 0)}`,
        trend: '2 auto-resolved by agents',
        trendDirection: 'positive' as const,
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
        dataLabel: 'Computed' as const,
      },
      {
        label: 'Agent Actions',
        value: totalActions > 0 ? `${completedActions} of ${totalActions}` : 'N/A',
        trend: totalActions > 0 ? `${Math.round((completedActions / totalActions) * 100)}% completion rate` : undefined,
        trendDirection: 'neutral' as const,
        dataLabel: 'Computed' as const,
      },
      {
        label: 'Discharge Before Noon',
        value: '68%',
        trend: 'Target: 75%',
        trendDirection: 'neutral' as const,
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
      dataLabel: 'Illustrative' as const,
    },
    {
      label: 'Denial Rate',
      value: '6.4%',
      trend: 'Industry avg: 11.8%',
      trendDirection: 'positive' as const,
      dataLabel: 'Illustrative' as const,
    },
    {
      label: 'CMS Penalty Exposure',
      value: '$142K/year',
      trend: 'Combined HRRP + HAC + VBP',
      trendDirection: 'negative' as const,
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
        dataLabel: 'Illustrative' as const,
      },
      {
        label: 'Discharge Rate (7-day)',
        value: '82%',
        trend: '+4% from prior period',
        trendDirection: 'positive' as const,
        dataLabel: 'Illustrative' as const,
      },
      {
        label: 'Agent Adoption',
        value: totalActions > 0 ? `${Math.round((adoptedActions / totalActions) * 100)}%` : 'N/A',
        trend: 'Target: \u226530%',
        trendDirection: 'neutral' as const,
        dataLabel: 'Computed' as const,
      },
    ];
  }, [patients, actionStatusById]);

  return (
    <section className="view-single-pane performance-view">
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

      <div className="detail-tab-content">
        {activeTab === 'my-metrics' && (
          <div>
            <div className="perf-hero-row">
              {myHero.map((m) => <MetricCardComponent key={m.label} metric={m} hero />)}
            </div>
            <div className="perf-grid">
              {mySupporting.map((m) => <MetricCardComponent key={m.label} metric={m} />)}
            </div>
          </div>
        )}

        {activeTab === 'department' && (
          <div>
            <div className="perf-hero-row">
              {deptHero.map((m) => <MetricCardComponent key={m.label} metric={m} hero />)}
            </div>
            <div className="perf-grid">
              {deptSupporting.map((m) => <MetricCardComponent key={m.label} metric={m} />)}
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
    </div>
  );
}
