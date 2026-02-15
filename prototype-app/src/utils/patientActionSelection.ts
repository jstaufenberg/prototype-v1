import type { Blocker, ProposedAction } from '../types/mockData';

export type SelectedActionState = { blockerId: string; actionId: string } | null;

function priorityRank(priority: 'HIGH' | 'MEDIUM' | 'LOW') {
  if (priority === 'HIGH') return 0;
  if (priority === 'MEDIUM') return 1;
  return 2;
}

function normalize(value: string) {
  return value.toLowerCase();
}

function looksLinkedByDependency(action: ProposedAction, blocker: Blocker): boolean {
  return action.dependencies.some((dependency) => normalize(dependency).includes(normalize(blocker.blocker_id)));
}

function looksLinkedByKeyword(action: ProposedAction, blocker: Blocker): boolean {
  const haystack = `${action.title} ${action.reason}`.toLowerCase();
  const blockerText = `${blocker.type} ${blocker.description} ${blocker.summary_line}`.toLowerCase();

  if (blockerText.includes('auth')) return /(auth|payer|insurance|appeal)/.test(haystack);
  if (blockerText.includes('placement') || blockerText.includes('facility')) {
    return /(placement|facility|snf|referral|outreach|bed|transport)/.test(haystack);
  }
  if (blockerText.includes('family')) return /family|decision/.test(haystack);
  if (blockerText.includes('sign')) return /sign|physician|md/.test(haystack);

  const fallbackTokens = blocker.summary_line
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/gi, '').toLowerCase())
    .filter((token) => token.length > 4)
    .slice(0, 3);
  return fallbackTokens.some((token) => haystack.includes(token));
}

export function actionsForBlocker(blocker: Blocker, actions: ProposedAction[]): ProposedAction[] {
  const linked = actions.filter((action) => looksLinkedByDependency(action, blocker));
  if (linked.length > 0) return linked.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  const keywordLinked = actions.filter((action) => looksLinkedByKeyword(action, blocker));
  if (keywordLinked.length > 0) {
    return keywordLinked.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  }

  return [...actions].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
}

export function findDefaultSelectedAction(
  blockers: Blocker[],
  actions: ProposedAction[]
): SelectedActionState {
  for (const blocker of blockers) {
    const candidates = actionsForBlocker(blocker, actions);
    if (candidates.length > 0) {
      return { blockerId: blocker.blocker_id, actionId: candidates[0].action_id };
    }
  }
  return null;
}
