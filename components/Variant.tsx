"use client";

import { fmtPrice, fmtCompact } from "@/components/TokenCard";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Trust pill ───────────────────────────────────────────────────────────────

function TierPill({ tier }: { tier: string }) {
  const cls =
    tier === "tier1"
      ? "var-tier--t1"
      : tier === "tier2"
        ? "var-tier--t2"
        : "var-tier--t3";
  return <span className={`var-tier ${cls}`}>{tier}</span>;
}

// ─── Variant row ──────────────────────────────────────────────────────────────

function VarRow({ row }: { row: VariantRow }) {
  const initials = row.symbol?.slice(0, 2).toUpperCase() ?? "??";
  const truncMint = `${row.mint.slice(0, 4)}…${row.mint.slice(-4)}`;

  return (
    <div className="var-row">
      {/* Token identity */}
      <div className="var-col--token var-identity">
        <div className="var-avatar">
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
        <div className="var-identity__text">
          <div className="var-identity__name">
            <strong>{row.name}</strong>
            <span className="var-identity__sym">{row.symbol}</span>
          </div>
          <div className="var-identity__mint">{truncMint}</div>
        </div>
      </div>

      {/* Trust */}
      <div className="var-col--trust">
        <TierPill tier={row.trustTier} />
      </div>

      {/* Price */}
      <div className="var-col--price var-mono">{fmtPrice(row.price)}</div>

      {/* Liquidity */}
      <div className="var-col--liq var-mono">{fmtCompact(row.liquidity)}</div>

      {/* Volume */}
      <div className="var-col--vol var-mono">{fmtCompact(row.volume24h)}</div>
    </div>
  );
}

// ─── Sub-table ────────────────────────────────────────────────────────────────

function VariantTable({
  title,
  count,
  rows,
}: {
  title: string;
  count: number;
  rows: VariantRow[];
}) {
  if (!rows.length) return null;

  return (
    <div className="var-subtable">
      <div className="var-subtable__header">
        <h3 className="var-subtable__title">{title}</h3>
        <span className="var-subtable__count">
          {count} variant{count !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="var-table">
        {/* Table header */}
        <div className="var-thead">
          <span className="var-col--token">Token</span>
          <span className="var-col--trust">Trust</span>
          <span className="var-col--price">Price</span>
          <span className="var-col--liq">Liquidity</span>
          <span className="var-col--vol">24h Vol</span>
        </div>

        {/* Rows */}
        {rows.map((row, i) => (
          <VarRow key={`${row.mint}-${i}`} row={row} />
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface VariantsSectionProps {
  assetName?: string | null;
  variants: VariantRow[];
}

export function VariantsSection({ assetName, variants }: VariantsSectionProps) {
  if (!variants.length) return null;

  const spotRows = variants.filter(
    (v) => v.kind === "spot" || (!v.kind && !v.tags?.includes("yield")),
  );
  const yieldRows = variants.filter(
    (v) =>
      v.kind === "yield" ||
      v.tags?.includes("yield") ||
      v.tags?.includes("lst"),
  );

  return (
    <section className="td-section">
      <h2 className="td-section__title">Variants</h2>
      {assetName && (
        <p className="td-section__sub">
          Token representations of {assetName} on Solana.
        </p>
      )}

      {spotRows.length > 0 && (
        <VariantTable
          title="Spot tokens"
          count={spotRows.length}
          rows={spotRows}
        />
      )}

      {yieldRows.length > 0 && (
        <VariantTable title="Yield" count={yieldRows.length} rows={yieldRows} />
      )}
    </section>
  );
}
