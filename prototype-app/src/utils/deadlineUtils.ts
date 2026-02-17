import type { PatientRecord } from '../types/mockData';

/**
 * Returns the reference "now" for a patient — uses the scenario snapshot time
 * (meta.as_of_local) so deadlines display correctly relative to the scenario,
 * not the viewer's wall clock.
 */
export function scenarioNow(patient: PatientRecord): number {
  if (patient.meta.as_of_local) {
    const t = new Date(patient.meta.as_of_local).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return Date.now();
}

export type DeadlineProximity = 'overdue' | 'urgent' | 'soon' | 'today' | 'future' | null;

export interface DeadlineInfo {
  /** Formatted display string, e.g. "Auth by 15:00 (47 min)" */
  label: string;
  /** Short label for worklist card, e.g. "Auth by 15:00" */
  shortLabel: string;
  /** CSS class suffix: 'overdue' | 'urgent' | 'soon' | 'today' | 'future' */
  proximity: DeadlineProximity;
  /** Raw deadline timestamp in ms */
  deadlineMs: number;
}

/**
 * Computes the most urgent deadline across all active blockers and insurance auth.
 * Returns null if no deadlines exist.
 */
export function getMostUrgentDeadline(
  patient: PatientRecord,
  blockerStatusOverride?: Record<string, string>
): DeadlineInfo | null {
  const now = scenarioNow(patient);
  let earliest: { ms: number; raw: string; source: string } | null = null;

  // Check active blocker due_by_local
  for (const blocker of patient.blockers.items) {
    const status = blockerStatusOverride?.[blocker.blocker_id] ?? blocker.status;
    if (status !== 'ACTIVE') continue;
    if (!blocker.due_by_local) continue;
    const ms = new Date(blocker.due_by_local).getTime();
    if (Number.isNaN(ms)) continue;
    if (!earliest || ms < earliest.ms) {
      const desc = blocker.description;
      // Shorten description to a keyword: "Auth", "Placement", "MD", etc.
      const source = desc.length > 15 ? desc.split(/[\s-]/)[0] : desc;
      earliest = { ms, raw: blocker.due_by_local, source };
    }
  }

  // Check insurance auth deadline
  const authDeadline = patient.patient_profile.insurance.auth_deadline_local;
  if (authDeadline) {
    const ms = new Date(authDeadline).getTime();
    if (!Number.isNaN(ms) && (!earliest || ms < earliest.ms)) {
      earliest = { ms, raw: authDeadline, source: 'Auth' };
    }
  }

  if (!earliest) return null;

  return formatDeadline(earliest.ms, earliest.source, now);
}

/**
 * Format a single deadline relative to a reference time.
 */
export function formatDeadline(deadlineMs: number, source: string, nowMs: number): DeadlineInfo {
  const dueAt = new Date(deadlineMs);
  const clock = dueAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const diffMinutes = Math.round((deadlineMs - nowMs) / 60000);
  const absMinutes = Math.abs(diffMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;

  let proximity: DeadlineProximity;
  let relativeStr: string;

  if (diffMinutes < 0) {
    proximity = 'overdue';
    relativeStr = hours > 0
      ? `overdue ${hours}h${minutes ? ` ${minutes}m` : ''}`
      : `overdue ${absMinutes}m`;
  } else if (diffMinutes <= 60) {
    proximity = 'urgent';
    relativeStr = hours > 0 ? `${hours}h ${minutes}m` : `${diffMinutes}m`;
  } else if (diffMinutes <= 240) {
    proximity = 'soon';
    relativeStr = `${hours}h${minutes ? ` ${minutes}m` : ''}`;
  } else {
    // Check if same day
    const nowDate = new Date(nowMs);
    const dueDate = new Date(deadlineMs);
    if (nowDate.toDateString() === dueDate.toDateString()) {
      proximity = 'today';
      relativeStr = 'today';
    } else {
      proximity = 'future';
      const month = dueAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        label: `${source} by ${month}`,
        shortLabel: `${source} by ${month}`,
        proximity,
        deadlineMs
      };
    }
  }

  const label = proximity === 'overdue'
    ? `${source} by ${clock} (${relativeStr})`
    : `${source} by ${clock} (${relativeStr})`;

  return {
    label,
    shortLabel: `${source} by ${clock}`,
    proximity,
    deadlineMs
  };
}

/**
 * Format a blocker's due_by_local relative to the scenario time.
 * Returns null if no deadline.
 */
export function formatBlockerDeadline(
  dueByLocal: string | null | undefined,
  source: string,
  nowMs: number
): DeadlineInfo | null {
  if (!dueByLocal) return null;
  const ms = new Date(dueByLocal).getTime();
  if (Number.isNaN(ms)) return null;
  return formatDeadline(ms, source, nowMs);
}
