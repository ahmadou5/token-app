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

function safe(str: string | null | undefined, fallback = "?") {
  return str && typeof str === "string" && str.length > 0 ? str : fallback;
}

function VarCard({ row }: { row: VariantRow }) {
  const sym = safe(row.symbol, "?");
  const name = safe(row.name, sym);
  const mint = safe(row.mint, "");
  const initials = sym.slice(0, 2).toUpperCase();
  const truncMint =
    mint.length > 12 ? `${mint.slice(0, 4)}…${mint.slice(-4)}` : mint;
  const tags = Array.isArray(row.tags) ? row.tags : [];

  const isYield =
    row.kind === "yield" || tags.includes("yield") || tags.includes("lst");
  const isNative = !isYield;

  return (
    <div className="varc-card">
      <div className="varc-left">
        <div className="varc-avatar">
          {row.logoURI && typeof row.logoURI === "string" ? (
            <img
              src={row.logoURI}
              alt={sym}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const p = e.currentTarget.parentElement;
                if (p) p.textContent = initials;
              }}
            />
          ) : (
            initials
          )}
        </div>
        <div className="varc-identity">
          <div className="varc-identity__top">
            <strong className="varc-name">{name}</strong>
            <span className="varc-sym">{sym}</span>
            {isNative && (
              <span className="varc-tag varc-tag--native">Native</span>
            )}
            {isYield && <span className="varc-tag varc-tag--yield">Yield</span>}
            {row.trustTier && (
              <span className="varc-tag varc-tag--tier">{row.trustTier}</span>
            )}
          </div>
          {truncMint && <div className="varc-mint">{truncMint}</div>}
        </div>
      </div>
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
  if (!Array.isArray(variants) || variants.length === 0) return null;
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
          <VarCard key={`${row?.mint ?? i}-${i}`} row={row} />
        ))}
      </div>
    </section>
  );
}
