import { useEffect, useRef } from 'react';
import type { ProposedAction } from '../types/mockData';

interface FailureRecoveryModalProps {
  failureReason: string;
  recoveryAction: ProposedAction;
  hasActiveBackgroundLoop: boolean;
  onRecoveryAction: () => void;
  onPauseBackground: () => void;
  onDismiss: () => void;
}

export default function FailureRecoveryModal({
  failureReason,
  recoveryAction,
  hasActiveBackgroundLoop,
  onRecoveryAction,
  onPauseBackground,
  onDismiss
}: FailureRecoveryModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    modalRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onDismiss]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="failure-modal-title">
      <div className="modal" ref={modalRef} tabIndex={-1}>
        <h3 id="failure-modal-title">Delivery failure detected</h3>

        <div className="failure-reason">
          {failureReason}
        </div>

        <div className="recovery-action">
          <strong>{recoveryAction.title}</strong>
          <p>{recoveryAction.reason}</p>
        </div>

        <div className="modal-buttons" style={{ flexWrap: 'wrap' }}>
          <button className="primary-action" onClick={onRecoveryAction}>
            {recoveryAction.cta_primary}
          </button>
          {hasActiveBackgroundLoop && (
            <button className="secondary" onClick={onPauseBackground}>
              Pause background loop
            </button>
          )}
          <button className="secondary" onClick={onDismiss}>
            Dismiss for now
          </button>
        </div>
      </div>
    </div>
  );
}
