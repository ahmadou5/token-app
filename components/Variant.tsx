"use client";

import { fmtPrice, fmtCompact } from "@/components/TokenCard";

export interface VariantRow {
  name: string;
  symbol: string;
  mint: string;
  trustTier: string;
  price: number | null;
  liquidity: number | null;
  volume24h: number | null;
  kind: "spot" | "yield" | string;
  tags: string[];
  issuer?: string;
  logoURI?: string | null;
}

// ─── Card-style variant row (matches screenshot 2) ────────────────────────────

function VarCard({ row }: { row: VariantRow }) {
  const initials = row.symbol?.slice(0, 2).toUpperCase() ?? "??";
  const truncMint =
    row.mint.length > 12
      ? `${row.mint.slice(0, 4)}…${row.mint.slice(-4)}`
      : row.mint;

  const isYield =
    row.kind === "yield" ||
    row.tags?.includes("yield") ||
    row.tags?.includes("lst");
  const isNative = row.kind === "spot" && !isYield;

  return (
    <div className="varc-card">
      {/* Left: avatar + identity */}
      <div className="varc-left">
        <div className="varc-avatar">
          {row.logoURI ? (
            <img
              src={row.logoURI}
              alt={row.symbol}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                if (e.currentTarget.parentElement)
                  e.currentTarget.parentElement.textContent = initials;
              }}
            />
          ) : (
            initials
          )}
        </div>
        <div className="varc-identity">
          <div className="varc-identity__top">
            <strong className="varc-name">{row.name || row.symbol}</strong>
            <span className="varc-sym">{row.symbol}</span>
            {isNative && (
              <span className="varc-tag varc-tag--native">Native</span>
            )}
            {isYield && <span className="varc-tag varc-tag--yield">Yield</span>}
            <span className="varc-tag varc-tag--tier">{row.trustTier}</span>
          </div>
          <div className="varc-mint">{truncMint}</div>
        </div>
      </div>

      {/* Right: stats */}
      <div className="varc-stats">
        <div className="varc-stat">
          <span className="varc-stat__label">Price</span>
          <span className="varc-stat__value">{fmtPrice(row.price)}</span>
        </div>
        <div className="varc-stat">
          <span className="varc-stat__label">Liquidity</span>
          <span className="varc-stat__value">{fmtCompact(row.liquidity)}</span>
        </div>
        <div className="varc-stat">
          <span className="varc-stat__label">24h Vol</span>
          <span className="varc-stat__value">{fmtCompact(row.volume24h)}</span>
        </div>
      </div>
    </div>
  );
}

interface VariantsSectionProps {
  assetName?: string | null;
  variants: VariantRow[];
}

export function VariantsSection({ assetName, variants }: VariantsSectionProps) {
  if (!variants.length) return null;
  return (
    <section className="td-section">
      <h2 className="td-section__title">Variants</h2>
      {assetName && (
        <p className="td-section__sub">
          Token representations of {assetName} on Solana.
        </p>
      )}
      <div className="varc-list">
        {variants.map((row, i) => (
          <VarCard key={`${row.mint}-${i}`} row={row} />
        ))}
      </div>
    </section>
  );
}
