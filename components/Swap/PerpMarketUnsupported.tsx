"use client";

interface PerpMarketUnsupportedProps {
  tokenSymbol?: string;
  tokenName: string;
  supportedMarkets: string[];
}

export function PerpMarketUnsupported({
  tokenSymbol,
  tokenName,
  supportedMarkets,
}: PerpMarketUnsupportedProps) {
  const displayName = tokenSymbol ? `$${tokenSymbol}` : tokenName;

  return (
    <div className="sw-perp-unsupported">
      {/* Icon */}
      <div className="sw-perp-unsupported__icon" aria-hidden>
        <svg viewBox="0 0 48 48" fill="none" width="40" height="40">
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="var(--tc-border-hover)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <path
            d="M16 24h16M24 16v8"
            stroke="var(--tc-text-muted)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="24" cy="32" r="1.5" fill="var(--tc-text-muted)" />
        </svg>
      </div>

      {/* Copy */}
      <p className="sw-perp-unsupported__title">
        {displayName} perps not available
      </p>
      <p className="sw-perp-unsupported__sub">
        Adrena Protocol only supports perpetual trading for a select set of
        markets. {displayName} is not currently listed.
      </p>

      {/* Supported markets */}
      <div className="sw-perp-unsupported__markets">
        <span className="sw-perp-unsupported__markets-label">
          Supported markets
        </span>
        <div className="sw-perp-unsupported__chips">
          {supportedMarkets.map((m) => (
            <span key={m} className="sw-perp-unsupported__chip">
              {m}-PERP
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
