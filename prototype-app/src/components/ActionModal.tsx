import { useEffect, useRef } from 'react';
import type { ExecutionModeDefault, ProposedAction } from '../types/mockData';

interface ActionModalProps {
  action: ProposedAction;
  mode: ExecutionModeDefault;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ActionModal({ action, mode, onClose, onConfirm }: ActionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    modalRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
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
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal" ref={modalRef} tabIndex={-1}>
        <h3 id="modal-title">{action.title}</h3>
        <p className="why-now">Why now</p>
        <p>{action.reason}</p>
        <p className="subtle">{action.permission_microcopy}</p>

        <h4>Targets</h4>
        <ul>
          {action.target_entities.map((target) => (
            <li key={`${target.type}-${target.name}`}>
              {target.type}: {target.name}
              {target.contact ? ` (${target.contact})` : ''}
            </li>
          ))}
        </ul>

        {mode === 'BACKGROUND' && (
          <>
            <p className="subtle">
              After this run, agent will continue every {action.background_policy.cadence_hours}h until stop
              condition (max {action.background_policy.max_duration_hours}h).
            </p>
            {action.background_policy.stop_conditions.length > 0 && (
              <ul className="guardrails">
                {action.background_policy.stop_conditions.map((condition) => (
                  <li key={condition}>{condition}</li>
                ))}
              </ul>
            )}
          </>
        )}

        <div className="modal-buttons">
          <button className="primary-action" onClick={onConfirm}>Confirm and run</button>
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
