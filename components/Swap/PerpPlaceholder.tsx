"use client";

interface PerpPlaceholderProps {
  tokenSymbol?: string;
  tokenName: string;
}

export function PerpPlaceholder({
  tokenSymbol,
  tokenName,
}: PerpPlaceholderProps) {
  return (
    <div className="sw-perp">
      <div className="sw-perp__icon">
        <svg viewBox="0 0 48 48" fill="none" width="36" height="36">
          <rect
            x="4"
            y="20"
            width="40"
            height="8"
            rx="4"
            fill="var(--tc-accent)"
            opacity="0.1"
          />
          <path
            d="M4 24h40M24 8v32"
            stroke="var(--tc-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.4"
          />
          <circle cx="24" cy="24" r="5" fill="var(--tc-accent)" opacity="0.7" />
        </svg>
      </div>
      <p className="sw-perp__title">Perpetuals coming soon</p>
      <p className="sw-perp__sub">
        Long / short {tokenSymbol ?? tokenName} with leverage.
        <br />
        {`We're integrating perp protocols now.`}
      </p>
      <button className="sw-perp__notify">Notify me</button>
    </div>
  );
}
