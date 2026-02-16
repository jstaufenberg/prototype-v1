import { useMemo, useRef, useState } from 'react';
import type { PatientRecord } from '../../types/mockData';

interface InsightsTabProps {
  patient: PatientRecord;
}

function confidenceClass(label: string) {
  if (label === 'High') return 'confidence-high';
  if (label === 'Moderate') return 'confidence-moderate';
  return 'confidence-low';
}

interface TimelineEntry {
  id: string;
  timestamp: string;
  type: 'event' | 'finding';
  title: string;
  detail: string;
  insightId?: string;
}

export default function InsightsTab({ patient }: InsightsTabProps) {
  const [expandedInsights, setExpandedInsights] = useState<Record<string, boolean>>({});
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const findingsRef = useRef<Record<string, HTMLElement | null>>({});

  const evidenceByInsight = useMemo(() => {
    const map: Record<string, typeof patient.evidence_items.items> = {};
    for (const item of patient.evidence_items.items) {
      for (const insightId of item.linked_to.insight_ids) {
        if (!map[insightId]) map[insightId] = [];
        map[insightId].push(item);
      }
    }
    return map;
  }, [patient.evidence_items.items]);

  const insightsByCategory = useMemo(() => {
    const map: Record<string, typeof patient.parsed_insights.items> = {};
    for (const insight of patient.parsed_insights.items) {
      const cat = insight.category;
      if (!map[cat]) map[cat] = [];
      map[cat].push(insight);
    }
    return map;
  }, [patient.parsed_insights.items]);

  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];

    for (const event of patient.encounter_timeline.events) {
      entries.push({
        id: event.event_id,
        timestamp: event.timestamp_local,
        type: 'event',
        title: event.title,
        detail: event.details
      });
    }

    for (const insight of patient.parsed_insights.items) {
      const evidenceItems = evidenceByInsight[insight.insight_id] ?? [];
      const latestTimestamp = evidenceItems.length > 0
        ? evidenceItems.reduce((latest, item) => item.timestamp_local > latest ? item.timestamp_local : latest, evidenceItems[0].timestamp_local)
        : '';
      if (latestTimestamp) {
        entries.push({
          id: insight.insight_id,
          timestamp: latestTimestamp,
          type: 'finding',
          title: insight.title,
          detail: insight.value,
          insightId: insight.insight_id
        });
      }
    }

    entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return entries;
  }, [patient.encounter_timeline.events, patient.parsed_insights.items, evidenceByInsight]);

  const toggleInsight = (insightId: string) => {
    setExpandedInsights((prev) => ({ ...prev, [insightId]: !prev[insightId] }));
  };

  const scrollToFinding = (insightId: string) => {
    setExpandedInsights((prev) => ({ ...prev, [insightId]: true }));
    window.setTimeout(() => {
      findingsRef.current[insightId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const visibleTimeline = timelineExpanded ? timeline : timeline.slice(0, 4);

  return (
    <>
      {/* Findings */}
      <div className="section-head">
        <h3>Findings ({patient.parsed_insights.items.length})</h3>
      </div>

      {Object.entries(insightsByCategory).map(([category, insights]) => (
        <div key={category} className="insight-category">
          <h4 className="insight-category-label">{category}</h4>
          {insights.map((insight) => {
            const evidence = evidenceByInsight[insight.insight_id] ?? [];
            const isExpanded = expandedInsights[insight.insight_id] ?? false;
            return (
              <div
                key={insight.insight_id}
                ref={(el) => { findingsRef.current[insight.insight_id] = el; }}
                className="insight-card"
              >
                <div className="insight-card-header" onClick={() => toggleInsight(insight.insight_id)}>
                  <strong>{insight.title}</strong>
                  <span className={`confidence-badge ${confidenceClass(insight.confidence_label)}`}>
                    {insight.confidence_label}
                  </span>
                </div>
                <p className="insight-value">{insight.value}</p>
                {insight.source_snippets && insight.source_snippets.length > 0 && (
                  <blockquote className="insight-snippet">
                    {insight.source_snippets[0]}
                  </blockquote>
                )}
                {evidence.length > 0 && (
                  <button className="expand-evidence-btn" onClick={() => toggleInsight(insight.insight_id)}>
                    {isExpanded ? 'Hide' : 'View'} evidence ({evidence.length})
                  </button>
                )}
                {isExpanded && evidence.length > 0 && (
                  <div className="insight-evidence">
                    {evidence.map((item) => (
                      <div key={item.evidence_id} className="evidence-row">
                        <span className="evidence-source">{item.source_label}</span>
                        <span className="evidence-author">{item.author_or_system}</span>
                        <span className="evidence-time">{item.timestamp_local.slice(0, 16).replace('T', ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {patient.parsed_insights.items.length === 0 && (
        <p className="subtle">No system findings for this patient yet.</p>
      )}

      {/* Timeline */}
      <div className="section-head">
        <h3>Timeline</h3>
        {timeline.length > 4 && (
          <button className="secondary" onClick={() => setTimelineExpanded((prev) => !prev)}>
            {timelineExpanded ? 'Show less' : `Show all (${timeline.length})`}
          </button>
        )}
      </div>

      <ul className="insight-timeline">
        {visibleTimeline.map((entry) => (
          <li key={entry.id} className="timeline-entry">
            <span className="timeline-time">{entry.timestamp.slice(11, 16)}</span>
            <span className={`timeline-type-chip timeline-type-${entry.type}`}>
              {entry.type === 'finding' ? 'Finding' : 'Event'}
            </span>
            {entry.type === 'finding' && entry.insightId ? (
              <button className="timeline-finding-link" onClick={() => scrollToFinding(entry.insightId!)}>
                {entry.title}
              </button>
            ) : (
              <span className="timeline-title">{entry.title}</span>
            )}
            <span className="timeline-detail">{entry.detail}</span>
          </li>
        ))}
      </ul>

      {timeline.length === 0 && (
        <p className="subtle">No timeline events recorded.</p>
      )}
    </>
  );
}
