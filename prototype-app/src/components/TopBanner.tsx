export default function TopBanner() {
  return (
    <div className="top-banner">
      <div className="top-banner-left">
        <span className="top-banner-mark" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 10h4l2-6 4 12 2-6h4" />
          </svg>
        </span>
        <span className="top-banner-brand">MERIDIAN / CARE TRANSITIONS</span>
      </div>
      <div className="top-banner-right">
        Demonstration Prototype v1
      </div>
    </div>
  );
}
