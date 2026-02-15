import type { PatientRecord } from '../types/mockData';

interface PlaybackStep {
  step: number;
  screen: string;
  what_cm_sees: string;
  cm_action: string;
  other_visible_options?: string[];
}

interface PatientJourneyPanelProps {
  patient: PatientRecord;
}

export default function PatientJourneyPanel({ patient }: PatientJourneyPanelProps) {
  const playback = ((patient as unknown as { demo_playback?: PlaybackStep[] }).demo_playback ?? []).slice();
  if (playback.length === 0) return null;

  return (
    <details className="patient-journey-panel">
      <summary>See full patient journey</summary>
      <ul className="journey-steps">
        {playback.map((step) => (
          <li key={`${step.step}-${step.screen}`}>
            <p>
              <strong>Step {step.step}</strong> · {step.screen}
            </p>
            <p>{step.what_cm_sees}</p>
            <p>
              <strong>CM action:</strong> {step.cm_action}
            </p>
            {step.other_visible_options && step.other_visible_options.length > 0 && (
              <p className="subtle">Other options: {step.other_visible_options.join(', ')}</p>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
