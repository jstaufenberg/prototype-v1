import type { Blocker } from '../types/mockData';
import StickyActionBar from './StickyActionBar';

interface ReferralTrackingProps {
  blocker: Blocker;
  backgroundMode: boolean;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}

function stepStatusClass(status: string) {
  if (status === 'DONE') return 'referral-status-accepted';
  if (status === 'PENDING') return 'referral-status-pending';
  if (status === 'NOT_STARTED') return 'referral-status-sent';
  return 'referral-status-failed';
}

export default function ReferralTracking({
  blocker,
  backgroundMode,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction
}: ReferralTrackingProps) {
  const trackingSteps = blocker.nested_steps.filter(
    (step) => step.step_kind === 'TRACKING' || step.step_kind === 'EXECUTION'
  );

  if (trackingSteps.length === 0) return null;

  return (
    <div className="referral-tracking">
      <h4>Referral tracking</h4>
      <div className="panel-top-actions">
        <StickyActionBar
          stickyOffset={0}
          compact
          contextText="Referral actions"
          primaryAction={
            <button
              className="primary-action"
              onClick={onPrimaryAction}
              disabled={!onPrimaryAction}
            >
              {primaryActionLabel ?? 'Have agent send referral update now'}
            </button>
          }
          secondaryActions={
            secondaryActionLabel ? (
              <button className="secondary" onClick={onSecondaryAction} disabled={!onSecondaryAction}>
                {secondaryActionLabel}
              </button>
            ) : undefined
          }
        />
      </div>
      {backgroundMode && (
        <span className="auto-followup-badge">
          Auto follow-up: enabled (12h cadence, 72h max)
        </span>
      )}
      {trackingSteps.map((step) => (
        <div key={step.step_id} className="referral-row">
          <span>{step.label}</span>
          <span className={`referral-status ${stepStatusClass(step.status)}`}>
            {step.status}
          </span>
          <span className="subtle">{step.execution_mode}</span>
          <div />
        </div>
      ))}
    </div>
  );
}
