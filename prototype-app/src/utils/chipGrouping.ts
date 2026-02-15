import { formatParentChip, formatSubchip, sortSubchipsForDisplay } from './chipLanguage';

export interface ChipGroup {
  chip: string;
  tags: string[];
}

interface RawGroup {
  rawChip: string;
  chip: string;
  tags: string[];
}

function chipMatcher(chip: string): RegExp {
  const value = chip.toLowerCase();
  if (value.includes('auth')) return /auth|payer|insurance|denial|appeal|deadline|expir/i;
  if (value.includes('placement') || value.includes('facility')) {
    return /snf|facility|placement|delivery|response|transport|bed|capable|referral/i;
  }
  if (value.includes('md') || value.includes('sign')) return /md|physician|sign/i;
  if (value.includes('family')) return /family|decision/i;
  if (value.includes('discharge')) return /discharge|teaching|instructions/i;
  return /.^/;
}

export function groupChips(statusChips: string[], subTags: string[]): ChipGroup[] {
  const used = new Set<number>();
  const groups: RawGroup[] = statusChips.map((rawChip) => ({
    rawChip,
    chip: formatParentChip(rawChip),
    tags: []
  }));

  groups.forEach((group) => {
    const matcher = chipMatcher(group.rawChip);
    subTags.forEach((tag, index) => {
      if (used.has(index)) return;
      if (matcher.test(tag)) {
        group.tags.push(tag);
        used.add(index);
      }
    });
  });

  const leftovers = subTags.filter((_, index) => !used.has(index));
  if (leftovers.length > 0) {
    if (groups.length === 0) {
      groups.push({ rawChip: 'Needs attention', chip: 'Needs Attention', tags: leftovers });
    } else {
      groups[0].tags.push(...leftovers);
    }
  }

  return groups.map((group) => {
    const formattedTags = group.tags.map((tag) => formatSubchip(tag, group.rawChip));
    return {
      chip: group.chip,
      tags: sortSubchipsForDisplay(formattedTags, group.rawChip)
    };
  });
}
