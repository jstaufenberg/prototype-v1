export default function TopBanner() {
  return (
    <div className="top-banner">
      <div className="top-banner-left">
        <span className="top-banner-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            {/* Two interlocking gears with arrows */}
            <path d="M13.5 4.5l.5-1.5h2l.5 1.5.9.4 1.3-.8 1.4 1.4-.8 1.3.4.9 1.5.5v2l-1.5.5-.4.9.8 1.3-1.4 1.4-1.3-.8-.9.4-.5 1.5h-2l-.5-1.5-.9-.4-1.3.8-1.4-1.4.8-1.3-.4-.9L8 10.5v-2l1.5-.5.4-.9-.8-1.3 1.4-1.4 1.3.8.9-.4zM14.5 7a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" />
            <path d="M21.5 16.5l.5-1.5h2l.5 1.5.9.4 1.3-.8 1.4 1.4-.8 1.3.4.9 1.5.5v2l-1.5.5-.4.9.8 1.3-1.4 1.4-1.3-.8-.9.4-.5 1.5h-2l-.5-1.5-.9-.4-1.3.8-1.4-1.4.8-1.3-.4-.9-1.5-.5v-2l1.5-.5.4-.9-.8-1.3 1.4-1.4 1.3.8.9-.4zM22.5 19a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" />
            {/* Arrows */}
            <path d="M6 5l-3 2.5L6 10M6 7.5H2.5" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M26 22l3 2.5-3 2.5M26 24.5h3.5" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="top-banner-brand">/ CARE TRANSITIONS</span>
      </div>
      <div className="top-banner-right">v1.0</div>
    </div>
  );
}
