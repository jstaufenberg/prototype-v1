export type ChipType =
  | 'Requirement'
  | 'Dependency'
  | 'Deadline'
  | 'Status'
  | 'Failure'
  | 'Task'
  | 'Risk'
  | 'Owner'
  | 'Note';

const TYPE_ORDER: Record<ChipType, number> = {
  Requirement: 1,
  Dependency: 2,
  Deadline: 3,
  Status: 4,
  Failure: 5,
  Task: 6,
  Risk: 7,
  Owner: 8,
  Note: 9
};

const TYPE_PREFIX_REGEX =
  /^(Requirement|Dependency|Deadline|Status|Failure|Task|Risk|Owner|Note)\s*:\s*/i;

const ACRONYMS = new Set(['snf', 'irf', 'md', 'los', 'ehr', 'pt', 'ot', 'slp', 'iv']);

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function titleCaseWord(word: string): string {
  const raw = word.trim();
  if (!raw) return raw;

  if (ACRONYMS.has(raw.toLowerCase())) return raw.toUpperCase();
  if (/[A-Z]/.test(raw) && raw.toUpperCase() === raw) return raw;
  if (/^\d/.test(raw)) return raw;

  const lower = raw.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function titleCasePhrase(value: string): string {
  return normalizeWhitespace(value)
    .split(' ')
    .map((word) => titleCaseWord(word))
    .join(' ');
}

function sentenceCase(value: string): string {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return normalized;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function parseExistingPrefix(raw: string): ChipType | null {
  const match = normalizeWhitespace(raw).match(TYPE_PREFIX_REGEX);
  if (!match) return null;
  const candidate = match[1].toLowerCase();
  const mapped: Record<string, ChipType> = {
    requirement: 'Requirement',
    dependency: 'Dependency',
    deadline: 'Deadline',
    status: 'Status',
    failure: 'Failure',
    task: 'Task',
    risk: 'Risk',
    owner: 'Owner',
    note: 'Note'
  };
  return mapped[candidate] ?? null;
}

function stripExistingPrefix(raw: string): string {
  return normalizeWhitespace(raw).replace(TYPE_PREFIX_REGEX, '').trim();
}

export function formatParentChip(raw: string): string {
  return titleCasePhrase(raw);
}

export function classifySubchipType(raw: string, parent?: string): ChipType {
  const existingPrefix = parseExistingPrefix(raw);
  if (existingPrefix) return existingPrefix;

  const value = normalizeWhitespace(raw).toLowerCase();
  const parentValue = normalizeWhitespace(parent ?? '').toLowerCase();
  const combined = `${value} ${parentValue}`;

  if (/(failed|error|line busy|delivery failed|rejected|bounce)/.test(combined)) return 'Failure';
  if (/(due|deadline|expires|expiry|today|tomorrow|\b\d{1,2}:\d{2}\b)/.test(combined)) return 'Deadline';
  if (/(task|follow[- ]?up|call|resend|review|retry|check in)/.test(combined)) return 'Task';
  if (/(required|must|capable|support|clearance|needs?)/.test(combined)) return 'Requirement';
  if (/(awaiting|pending decision|waiting on|sign[- ]?off|depends on)/.test(combined)) return 'Dependency';
  if (/(risk|expiring|urgent|overdue|high priority)/.test(combined)) return 'Risk';
  if (/(no response|accepted|declined|submitted|in progress|queued|sent|open|closed)/.test(combined)) {
    return 'Status';
  }
  if (/(owner|assigned|case manager|cm|attending)/.test(combined)) return 'Owner';

  return 'Note';
}

export function formatSubchip(raw: string, _parent?: string): string {
  const stripped = stripExistingPrefix(raw);
  const body = sentenceCase(stripped || raw);
  return body;
}

export function sortSubchipsForDisplay(subchips: string[], parent?: string): string[] {
  return [...subchips].sort((a, b) => {
    const typeA = classifySubchipType(a, parent);
    const typeB = classifySubchipType(b, parent);
    const orderDelta = TYPE_ORDER[typeA] - TYPE_ORDER[typeB];
    if (orderDelta !== 0) return orderDelta;
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  });
}
