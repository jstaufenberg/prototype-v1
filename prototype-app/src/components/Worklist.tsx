import { useMemo } from 'react';
import type { PatientRecord } from '../types/mockData';
import { getDispositionDisplay } from '../utils/disposition';
import { getMostUrgentDeadline, type DeadlineInfo } from '../utils/deadlineUtils';

interface WorklistProps {
  patients: PatientRecord[];
  activePatientId: string | null;
  stateByPatientId: Record<string, string>;
  onSelectPatient: (patientId: string | null) => void;
  showHandoff?: boolean;
}

function getSnapshot(patient: PatientRecord, stateId: string) {
  return patient.demo_state_snapshots.find((snapshot) => snapshot.state_id === stateId);
}

const BUCKET_ORDER = ['Needs Action', 'Watch', 'In Progress', 'On Track'] as const;

function bucketClass(bucket: string) {
  if (bucket === 'Needs Action') return 'bucket-needs-action';
  if (bucket === 'Watch') return 'bucket-watch';
  if (bucket === 'In Progress') return 'bucket-in-progress';
  return 'bucket-on-track';
}

function computeAge(dob?: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  const birthdayPassed = monthDelta > 0 || (monthDelta === 0 && today.getDate() >= birth.getDate());
  if (!birthdayPassed) age -= 1;
  return age >= 0 ? age : null;
}

function demographicToken(age: number | null, sex?: string | null): string {
  if (age == null) return sex ?? 'N/A';
  return `${age}${sex ?? ''}`;
}

interface PreparedCard {
  patient: PatientRecord;
  bucket: string;
  deadline: DeadlineInfo | null;
  decisionsNeeded: number;
  agentCount: number;
  agentFailCount: number;
  activeBlockerCount: number;
}

export default function Worklist({
  patients,
  activePatientId,
  stateByPatientId,
  onSelectPatient,
  showHandoff
}: WorklistProps) {
  // Pre-compute card data for all patients
  const cards: PreparedCard[] = useMemo(() =>
    patients.map((patient) => {
      const stateId = stateByPatientId[patient.meta.patient_id];
      const snapshot = getSnapshot(patient, stateId);
      const bucket = snapshot?.worklist_state.bucket_status ?? patient.worklist_view_state.bucket_status;
      const activeAgents = snapshot?.worklist_state.active_agents
        ?? patient.worklist_view_state.active_agents
        ?? [];
      const activeBlockerCount = patient.blockers.items.filter(
        (b) => b.status === 'ACTIVE'
      ).length;
      const decisionsNeeded = patient.proposed_actions.items.filter(
        (a) => a.status === 'PROPOSED'
      ).length;
      const deadline = getMostUrgentDeadline(patient);

      return {
        patient,
        bucket,
        deadline,
        decisionsNeeded,
        agentCount: activeAgents.length,
        agentFailCount: activeAgents.filter(a => a.status === 'error').length,
        activeBlockerCount
      };
    }),
    [patients, stateByPatientId]
  );

  // Group by bucket, sorted by deadline within each group
  const groups = useMemo(() => {
    const byBucket = new Map<string, PreparedCard[]>();
    for (const bucket of BUCKET_ORDER) byBucket.set(bucket, []);

    for (const card of cards) {
      const group = byBucket.get(card.bucket);
      if (group) group.push(card);
      else {
        // Unknown bucket — append to On Track
        byBucket.get('On Track')!.push(card);
      }
    }

    // Sort within each group: deadline first (nearest → farthest), then rank
    for (const [, group] of byBucket) {
      group.sort((a, b) => {
        const aMs = a.deadline?.deadlineMs ?? Infinity;
        const bMs = b.deadline?.deadlineMs ?? Infinity;
        if (aMs !== bMs) return aMs - bMs;
        return (a.patient.worklist_view_state.rank_position ?? 99)
          - (b.patient.worklist_view_state.rank_position ?? 99);
      });
    }

    return Array.from(byBucket.entries())
      .filter(([, group]) => group.length > 0)
      .map(([bucket, group]) => ({ bucket, cards: group }));
  }, [cards]);

  return (
    <section className="panel">
      {showHandoff && (
        <div className="handoff-banner">
          <div>
            <span>Agent updates since prior handoff: 3</span>
            <span>Changes requiring your review: 2</span>
          </div>
          <span className="subtle">Handoff view</span>
        </div>
      )}
      <h2>My Patients</h2>

      <div className="worklist" role="list" aria-label="My Patients">
        {groups.map(({ bucket, cards: groupCards }) => {
          const isOnTrack = bucket === 'On Track';

          return (
            <div key={bucket} className="worklist-group">
              <div className={`worklist-group-header ${bucketClass(bucket)}-header`}>
                <span className="worklist-group-label">{bucket}</span>
                <span className="worklist-group-count">{groupCards.length}</span>
              </div>

              <ul className="worklist-group-list">
                {groupCards.map((card) => {
                  const { patient, deadline, decisionsNeeded, agentCount, agentFailCount, activeBlockerCount } = card;
                  const isActive = activePatientId === patient.meta.patient_id;
                  const age = computeAge(patient.patient_profile.dob);
                  const sex = patient.patient_profile.sex ?? null;
                  const bed = patient.patient_profile.current_location?.bed ?? 'Unknown';
                  const disposition = getDispositionDisplay(patient.patient_profile.disposition_target);

                  if (isOnTrack) {
                    // Compact card for On Track patients
                    return (
                      <li
                        key={patient.meta.patient_id}
                        className={`worklist-row worklist-card worklist-card-compact ${isActive ? 'active' : ''}`}
                        aria-current={isActive ? 'true' : undefined}
                        onClick={() => onSelectPatient(patient.meta.patient_id)}
                        role="listitem"
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="worklist-compact-line">
                          <strong className="worklist-compact-name">
                            {patient.patient_profile.patient_name}
                          </strong>
                          <span className="worklist-compact-meta">
                            {bed}
                            <span className="sep-dot" aria-hidden="true"> · </span>
                            &rarr; {disposition.destinationLabel}
                            {disposition.dependencyLabel && (
                              <span className="disposition-dependency-tag">{disposition.dependencyLabel}</span>
                            )}
                          </span>
                        </div>
                      </li>
                    );
                  }

                  // Full card for Needs Action / Watch / In Progress
                  return (
                    <li
                      key={patient.meta.patient_id}
                      className={`worklist-row worklist-card ${isActive ? 'active' : ''}`}
                      aria-current={isActive ? 'true' : undefined}
                      onClick={() => onSelectPatient(patient.meta.patient_id)}
                      role="listitem"
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Line 1: Identity */}
                      <strong className="worklist-patient-line">
                        {patient.patient_profile.patient_name}
                        <span className="sep-dot" aria-hidden="true"> · </span>
                        {demographicToken(age, sex)}
                        <span className="sep-dot" aria-hidden="true"> · </span>
                        {bed}
                      </strong>

                      {/* Line 2: Goal + obstacles + deadline */}
                      <p className="worklist-disposition-line">
                        <span className="disposition-text">
                          &rarr; {disposition.destinationLabel}
                          {disposition.dependencyLabel && (
                            <span className="disposition-dependency-tag">{disposition.dependencyLabel}</span>
                          )}
                        </span>
                        <span className="sep-dot" aria-hidden="true"> · </span>
                        <span className={activeBlockerCount > 0 ? 'blocker-count-active' : 'blocker-count-zero'}>
                          {activeBlockerCount} blocker{activeBlockerCount !== 1 ? 's' : ''}
                        </span>
                        {deadline && (
                          <>
                            <span className="sep-dot" aria-hidden="true"> · </span>
                            <span className={`card-deadline deadline-${deadline.proximity}`}>
                              {deadline.shortLabel}
                            </span>
                          </>
                        )}
                      </p>

                      {/* Line 3: What needs the CM + system health */}
                      {(decisionsNeeded > 0 || agentCount > 0) && (
                        <p className="worklist-status-line">
                          {decisionsNeeded > 0 && (
                            <span className="decisions-needed">
                              {decisionsNeeded} decision{decisionsNeeded !== 1 ? 's' : ''} needed
                            </span>
                          )}
                          {decisionsNeeded > 0 && agentCount > 0 && (
                            <span className="sep-dot" aria-hidden="true"> · </span>
                          )}
                          {agentCount > 0 && (
                            <span className={agentFailCount > 0 ? 'agent-summary-error' : 'agent-summary-ok'}>
                              {agentFailCount > 0
                                ? `${agentFailCount} agent${agentFailCount !== 1 ? 's' : ''} failed`
                                : `${agentCount} agent${agentCount !== 1 ? 's' : ''} active`}
                            </span>
                          )}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
