interface HandoffBannerProps {
  backgroundRunCount: number;
  changesRequiringReview: number;
  onDismiss: () => void;
}

export default function HandoffBanner({
  backgroundRunCount,
  changesRequiringReview,
  onDismiss
}: HandoffBannerProps) {
  return (
    <div className="handoff-banner">
      <div>
        <span>Agent updates since prior handoff: {backgroundRunCount}</span>
        <span>Changes requiring your review: {changesRequiringReview}</span>
      </div>
      <button className="secondary" style={{ fontSize: 12, padding: '3px 6px' }} onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
