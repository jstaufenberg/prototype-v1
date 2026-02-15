import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface StickyActionBarProps {
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  contextText?: string;
  stickyOffset?: number;
  compact?: boolean;
}

export default function StickyActionBar({
  primaryAction,
  secondaryActions,
  contextText,
  stickyOffset = 8,
  compact = false
}: StickyActionBarProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(entry.intersectionRatio < 1);
      },
      { threshold: [1] }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="sticky-action-sentinel" aria-hidden="true" />
      <section
        className={`sticky-action-bar${compact ? ' compact' : ''}${isStuck ? ' is-stuck' : ''}`}
        style={{ top: `${stickyOffset}px` }}
        aria-label="Persistent actions"
      >
        {contextText && <p className="sticky-action-context">{contextText}</p>}
        <div className="sticky-action-content">
          {primaryAction && <div className="sticky-action-primary">{primaryAction}</div>}
          {secondaryActions && <div className="sticky-action-secondary">{secondaryActions}</div>}
        </div>
      </section>
    </>
  );
}
