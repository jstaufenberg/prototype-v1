import type { Blocker } from '../types/mockData';

interface ReferralTrackingProps {
  blocker: Blocker;
  backgroundMode: boolean;
}

function stepStatusClass(status: string) {
  if (status === 'DONE') return 'referral-status-accepted';
  if (status === 'PENDING') return 'referral-status-pending';
  if (status === 'NOT_STARTED') return 'referral-status-sent';
  return 'referral-status-failed';
}

export default function ReferralTracking({ blocker, backgroundMode }: ReferralTrackingProps) {
  const trackingSteps = blocker.nested_steps.filter(
    (step) => step.step_kind === 'TRACKING' || step.step_kind === 'EXECUTION'
  );

  if (trackingSteps.length === 0) return null;

  return (
    <div className="referral-tracking">
      <h4>Referral tracking</h4>
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
          <div>
            {step.status === 'PENDING' && (
              <button className="secondary" style={{ fontSize: 12, padding: '3px 6px' }}>
                Retry
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
