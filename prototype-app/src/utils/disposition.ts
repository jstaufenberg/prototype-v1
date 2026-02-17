interface DispositionDisplay {
  destinationLabel: string;
  dependencyLabel: string | null;
}

function cleanToken(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function getDispositionDisplay(raw?: string | null): DispositionDisplay {
  if (!raw || !raw.trim()) {
    return { destinationLabel: 'TBD', dependencyLabel: null };
  }

  const normalized = raw.trim().replace(/\s+/g, ' ');
  const lower = normalized.toLowerCase();

  if (lower.includes('home health') && lower.includes('home')) {
    return { destinationLabel: 'Home', dependencyLabel: 'Home health required' };
  }

  if (lower.startsWith('home with ')) {
    const dependency = cleanToken(normalized.slice('home with '.length));
    return {
      destinationLabel: 'Home',
      dependencyLabel: dependency ? `${dependency} required` : null
    };
  }

  if (lower.startsWith('home w/')) {
    const dependency = cleanToken(normalized.slice('home w/'.length));
    return {
      destinationLabel: 'Home',
      dependencyLabel: dependency ? `${dependency} required` : null
    };
  }

  return { destinationLabel: normalized, dependencyLabel: null };
}
