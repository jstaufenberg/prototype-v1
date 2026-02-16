import { useMemo, useState } from 'react';
import type { ActionStatus, BlockerStatus, ExecutionModeDefault, PatientRecord } from '../types/mockData';
import type { ChipGroup } from '../utils/chipGrouping';
import { buildWorklistTimelineItems } from '../utils/worklistTimeline';
import { buildWorklistAgentRows } from '../utils/worklistAgents';
import WorklistTimelineMini from './WorklistTimelineMini';
import WorklistAgentsMini from './WorklistAgentsMini';

export type WorklistCardTab = 'blockers' | 'timeline' | 'agents';

interface WorklistCardTabsProps {
  patient: PatientRecord;
  groupedBlockers: ChipGroup[];
  losLabel: string;
  losDeltaClass: string;
  blockerStatusOverride: Record<string, BlockerStatus>;
  actionStatusById: Record<string, ActionStatus>;
  executionModeByAction: Record<string, ExecutionModeDefault>;
  lastUpdatedLabel?: string | null;
}

function authClassLabel(raw?: string | null): string {
  if (!raw) return 'Unknown';
  return raw
    .toLowerCase()
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function BlockerIcon({ text }: { text: string }) {
  const lower = text.toLowerCase();
  if (lower.includes('auth') || lower.includes('insurance')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3L4 7v5c0 5.2 3.4 8.7 8 10 4.6-1.3 8-4.8 8-10V7l-8-4z" />
        <path d="M8.5 12h7" />
      </svg>
    );
  }
  if (lower.includes('placement') || lower.includes('facility') || lower.includes('snf')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20h16M5 20V6l7-3 7 3v14M9 20v-5h6v5M9 9h2M13 9h2M9 12h2M13 12h2" />
      </svg>
    );
  }
  if (lower.includes('deadline') || lower.includes('due') || lower.includes('today')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l9 5v10l-9 5-9-5V7l9-5z" />
      <path d="M9 12h6" />
    </svg>
  );
}

export default function WorklistCardTabs({
  patient,
  groupedBlockers,
  losLabel,
  losDeltaClass,
  blockerStatusOverride,
  actionStatusById,
  executionModeByAction,
  lastUpdatedLabel
}: WorklistCardTabsProps) {
  const [activeTab, setActiveTab] = useState<WorklistCardTab>('blockers');
  const [expandedParents, setExpandedParents] = useState(false);
  const [expandedSubchips, setExpandedSubchips] = useState<Record<string, boolean>>({});

  const timelineItems = useMemo(
    () => buildWorklistTimelineItems(patient, blockerStatusOverride, 32),
    [patient, blockerStatusOverride]
  );

  const agentRows = useMemo(
    () => buildWorklistAgentRows(patient, actionStatusById, executionModeByAction, blockerStatusOverride),
    [patient, actionStatusById, executionModeByAction, blockerStatusOverride]
  );

  const visibleParentCount = expandedParents ? groupedBlockers.length : 2;
  const visibleGroups = groupedBlockers.slice(0, visibleParentCount);
  const hiddenParentCount = Math.max(groupedBlockers.length - visibleGroups.length, 0);

  return (
    <div className="worklist-card-tabs">
      <div className="worklist-tab-strip" role="tablist" aria-label="Patient card views">
        <button
          role="tab"
          aria-selected={activeTab === 'blockers'}
          className={`worklist-tab ${activeTab === 'blockers' ? 'worklist-tab-active' : ''}`}
          onClick={() => setActiveTab('blockers')}
        >
          Blockers
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'timeline'}
          className={`worklist-tab ${activeTab === 'timeline' ? 'worklist-tab-active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'agents'}
          className={`worklist-tab ${activeTab === 'agents' ? 'worklist-tab-active' : ''}`}
          onClick={() => setActiveTab('agents')}
        >
          Active agents
        </button>
      </div>

      <div className="worklist-tab-panel">
        {activeTab === 'blockers' && (
          <div className="mini-blockers-layout">
            <div>
              <p className={`worklist-los-line ${losDeltaClass}`}>{losLabel}</p>
              <div className="blocker-stack">
                {visibleGroups.map((group) => {
                  const subchipKey = `${patient.meta.patient_id}:${group.chip}`;
                  const subchipExpanded = expandedSubchips[subchipKey] ?? false;
                  const visibleTags = subchipExpanded ? group.tags : group.tags.slice(0, 2);
                  const hiddenTagCount = Math.max(group.tags.length - visibleTags.length, 0);

                  return (
                    <div key={`${patient.meta.patient_id}-${group.chip}`} className="blocker-line">
                      <span className="chip">
                        <span className="mono-icon blocker-icon" aria-hidden="true">
                          <BlockerIcon text={group.chip} />
                        </span>
                        {group.chip}
                      </span>
                      {visibleTags.length > 0 && (
                        <div className="subchip-stack">
                          {visibleTags.map((tag) => (
                            <span key={`${group.chip}-${tag}`} className="sub-tag">
                              {tag}
                            </span>
                          ))}
                          {hiddenTagCount > 0 && (
                            <button
                              className="subchip-toggle"
                              aria-expanded={subchipExpanded}
                              onClick={() =>
                                setExpandedSubchips((previous) => ({ ...previous, [subchipKey]: true }))
                              }
                            >
                              +{hiddenTagCount} more
                            </button>
                          )}
                          {subchipExpanded && group.tags.length > 2 && (
                            <button
                              className="subchip-toggle"
                              aria-expanded={subchipExpanded}
                              onClick={() =>
                                setExpandedSubchips((previous) => ({ ...previous, [subchipKey]: false }))
                              }
                            >
                              Show less
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {hiddenParentCount > 0 && (
                  <button
                    className="subchip-toggle worklist-parent-toggle"
                    aria-expanded={expandedParents}
                    onClick={() => setExpandedParents(true)}
                  >
                    +{hiddenParentCount} more blockers
                  </button>
                )}
                {expandedParents && groupedBlockers.length > 2 && (
                  <button className="subchip-toggle worklist-parent-toggle" aria-expanded onClick={() => setExpandedParents(false)}>
                    Show fewer blockers
                  </button>
                )}
              </div>
            </div>
            <aside className="mini-context-rail">
              <p>
                <span className="subtle">Disposition</span>
                <br />
                {patient.patient_profile.disposition_target}
              </p>
              <p>
                <span className="subtle">Payer/auth class</span>
                <br />
                {authClassLabel(patient.patient_profile.insurance.auth_status)}
              </p>
              {lastUpdatedLabel && (
                <p>
                  <span className="subtle">Last update</span>
                  <br />
                  {lastUpdatedLabel}
                </p>
              )}
            </aside>
          </div>
        )}

        {activeTab === 'timeline' && <WorklistTimelineMini items={timelineItems} />}
        {activeTab === 'agents' && <WorklistAgentsMini agents={agentRows} />}
      </div>
    </div>
  );
}
