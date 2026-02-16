import { useMemo } from 'react';
import type { PatientRecord } from '../types/mockData';

interface IntelViewProps {
  patients: PatientRecord[];
}

interface IntelCaptureItem {
  id: string;
  type: 'Huddle' | 'Call' | 'Note';
  text: string;
  patient: string;
  timestamp: string;
}

interface IntelSourceHealthRow {
  sourceType: string;
  label: string;
  count: number;
  lastUpdate: string;
  status: 'Active' | 'Stale';
}

interface AggregatedInsight {
  insightId: string;
  category: string;
  title: string;
  value: string;
  confidence: string;
  patientName: string;
  evidenceCount: number;
}

const DEMO_CAPTURES: IntelCaptureItem[] = [
  {
    id: 'cap-01',
    type: 'Huddle',
    text: 'Morning huddle — Dr. Okafor discussed Martha Chen\'s respiratory status. BiPAP requirement confirmed, limits placement options.',
    patient: 'Martha Chen',
    timestamp: '2026-02-14T07:30:00'
  },
  {
    id: 'cap-02',
    type: 'Call',
    text: 'Family call — Daughter confirmed preference for Sunrise Manor over Willowbrook due to proximity.',
    patient: 'Martha Chen',
    timestamp: '2026-02-14T09:15:00'
  },
  {
    id: 'cap-03',
    type: 'Note',
    text: 'Dr. Okonkwo wants one more day of monitoring before signing off on discharge for Dorothy Martinez.',
    patient: 'Dorothy Martinez',
    timestamp: '2026-02-14T08:00:00'
  }
];

function captureTypeClass(type: IntelCaptureItem['type']): string {
  if (type === 'Huddle') return 'chip-accent';
  if (type === 'Call') return '';
  return '';
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function confidenceClass(confidence: string): string {
  if (confidence === 'High') return 'chip-accent';
  return '';
}

export default function IntelView({ patients }: IntelViewProps) {
  const insights: AggregatedInsight[] = useMemo(() => {
    const all: AggregatedInsight[] = [];
    for (const patient of patients) {
      for (const insight of patient.parsed_insights.items) {
        const evidenceCount = insight.evidence_refs?.length ?? insight.source_snippets?.length ?? 0;
        all.push({
          insightId: insight.insight_id,
          category: insight.category,
          title: insight.title,
          value: insight.value,
          confidence: insight.confidence_label,
          patientName: patient.patient_profile.patient_name,
          evidenceCount
        });
      }
    }
    const order: Record<string, number> = { High: 0, Moderate: 1, Low: 2 };
    all.sort((a, b) => (order[a.confidence] ?? 9) - (order[b.confidence] ?? 9));
    return all;
  }, [patients]);

  const categories = useMemo(() => {
    const cats = new Map<string, AggregatedInsight[]>();
    for (const insight of insights) {
      const list = cats.get(insight.category) ?? [];
      list.push(insight);
      cats.set(insight.category, list);
    }
    return cats;
  }, [insights]);

  const sources: IntelSourceHealthRow[] = useMemo(() => {
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
    const labelMap: Record<string, string> = {
      adt_event: 'ADT Events',
      discharge_note: 'Discharge Notes',
      pt_note: 'Clinical Notes',
      payer_portal: 'Payer Portal',
      facility_email: 'Facility Email',
      cm_manual: 'CM Manual Entry'
    };
    const rows: IntelSourceHealthRow[] = [];
    for (const [sourceType, data] of typeMap.entries()) {
      const hoursSinceUpdate = (Date.now() - new Date(data.lastUpdate).getTime()) / (1000 * 60 * 60);
      rows.push({
        sourceType,
        label: labelMap[sourceType] ?? sourceType.replace(/_/g, ' '),
        count: data.count,
        lastUpdate: data.lastUpdate,
        status: hoursSinceUpdate < 24 ? 'Active' : 'Stale'
      });
    }
    rows.sort((a, b) => b.count - a.count);
    return rows;
  }, [patients]);

  return (
    <section className="view-single-pane">
      {/* Section 1: Capture */}
      <div className="intel-section">
        <h3>Capture</h3>
        <p className="subtle">Record conversations and observations. Information auto-attaches to the relevant patient and generates tasks.</p>
        <div className="intel-capture-actions">
          <button className="primary-action" disabled>Record Huddle</button>
          <button className="secondary" disabled>Add Note</button>
        </div>
        <p className="intel-demo-label">Demo: captures are not persisted in this prototype</p>

        <div className="intel-capture-list">
          {DEMO_CAPTURES.map((capture) => (
            <div key={capture.id} className="intel-capture-item">
              <div className="intel-capture-head">
                <span className={`chip ${captureTypeClass(capture.type)}`}>{capture.type}</span>
                <span className="subtle">{formatTimestamp(capture.timestamp)}</span>
                <span className="subtle">· {capture.patient}</span>
              </div>
              <p className="intel-capture-text">{capture.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: System Insights */}
      <div className="intel-section">
        <h3>System Insights</h3>
        <p className="subtle">{insights.length} insights surfaced from {sources.reduce((s, r) => s + r.count, 0)} evidence sources across {patients.length} patients.</p>

        {[...categories.entries()].map(([category, items]) => (
          <div key={category} className="intel-category">
            <h4>{category}</h4>
            <div className="intel-insight-list">
              {items.map((insight) => (
                <div key={insight.insightId} className="intel-insight-card">
                  <div className="intel-insight-head">
                    <strong>{insight.title}</strong>
                    <span className={`chip ${confidenceClass(insight.confidence)}`}>
                      {insight.confidence}
                    </span>
                  </div>
                  <p>{insight.value}</p>
                  <div className="intel-insight-meta">
                    <span>{insight.patientName}</span>
                    <span>{insight.evidenceCount} evidence source{insight.evidenceCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Section 3: Data Sources */}
      <div className="intel-section">
        <h3>Data Sources</h3>
        <p className="subtle">Where this information comes from.</p>
        <div className="intel-sources-table">
          <div className="intel-sources-header">
            <span>Source</span>
            <span>Items</span>
            <span>Last Update</span>
            <span>Status</span>
          </div>
          {sources.map((source) => (
            <div key={source.sourceType} className="intel-sources-row">
              <span>{source.label}</span>
              <span>{source.count}</span>
              <span>{formatTimestamp(source.lastUpdate)}</span>
              <span className={`chip ${source.status === 'Active' ? 'chip-accent' : ''}`}>
                {source.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
