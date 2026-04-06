"use client";

import { fmtPrice, fmtCompact } from "@/components/TokenCard";
import type { RawVariant } from "@/types/index";

// ─── VariantRow — fully typed, includes all market fields ─────────────────────

export interface VariantRow {
  variantId: string;
  name: string;
  symbol: string;
  mint: string;
  trustTier: string;
  // kind from API: "native" | "yield" | "spot" | "etf" | "leveraged"
  kind: string;
  tags: string[];
  issuer?: string;
  logoURI: string | null;
  // Market data — populated from API variant.market
  price: number | null;
  liquidity: number | null;
  volume24h: number | null;
  marketCap: number | null;
  change24h: number | null;
  change1h: number | null;
}

// ─── Builder — reads market data correctly ────────────────────────────────────

function safe(s: unknown, fallback = ""): string {
  return s && typeof s === "string" && s.length > 0 ? s : fallback;
}

export function buildVariantRow(
  v: RawVariant,
  assetName?: string | null,
  assetSymbol?: string | null,
): VariantRow | null {
  if (!v || typeof v !== "object") return null;
  const mint = safe(v.mint);
  if (!mint) return null;

  const m = v.market ?? null;

  return {
    variantId: safe(v.variantId, mint),
    name: safe(v.name ?? v.label ?? assetName),
    symbol: safe(v.symbol ?? assetSymbol),
    mint,
    trustTier: safe(v.trustTier, "unknown"),
    kind: safe(v.kind, "spot"),
    tags: Array.isArray(v.tags) ? v.tags : [],
    issuer: safe(v.issuer),
    logoURI: m?.logoURI ?? null,
    // ← market fields now correctly pulled
    price: m?.price ?? null,
    liquidity: m?.liquidity ?? null,
    volume24h: m?.volume24hUSD ?? null,
    marketCap: m?.marketCap ?? null,
    change24h: m?.priceChange24hPercent ?? null,
    change1h: m?.priceChange1hPercent ?? null,
  };
}

// ─── Flatten variantGroups → VariantRow[] ─────────────────────────────────────

export function flattenVariantGroups(
  variantGroups: {
    spot?: RawVariant[];
    yield?: RawVariant[];
    etf?: RawVariant[];
    leveraged?: RawVariant[];
  },
  assetName?: string | null,
  assetSymbol?: string | null,
): VariantRow[] {
  const all = [
    ...(variantGroups.spot ?? []),
    ...(variantGroups.yield ?? []),
    ...(variantGroups.etf ?? []),
    ...(variantGroups.leveraged ?? []),
  ];

  return all
    .map((v) => buildVariantRow(v, assetName, assetSymbol))
    .filter((r): r is VariantRow => r !== null);
}

// ─── Kind detection helpers ───────────────────────────────────────────────────
// API uses "native" for spot/wrapped, "yield" for LSTs

function isYieldVariant(row: VariantRow): boolean {
  const tags = row.tags ?? [];
  return (
    row.kind === "yield" ||
    row.kind === "lst" ||
    tags.some((t) => t.includes("lst") || t.includes("yield"))
  );
}

function isNativeVariant(row: VariantRow): boolean {
  return row.kind === "native" || row.kind === "spot";
}

// ─── Tag pill ─────────────────────────────────────────────────────────────────

function KindTag({ row }: { row: VariantRow }) {
  if (isNativeVariant(row))
    return <span className="varc-tag varc-tag--native">Native</span>;
  if (isYieldVariant(row))
    return <span className="varc-tag varc-tag--yield">Yield</span>;
  if (row.kind === "etf")
    return <span className="varc-tag varc-tag--etf">ETF</span>;
  return null;
}

// ─── Card row ─────────────────────────────────────────────────────────────────

function VarCard({ row }: { row: VariantRow }) {
  const sym = safe(row.symbol, "?");
  const name = safe(row.name, sym);
  const mint = safe(row.mint, "");
  const initials = sym.slice(0, 2).toUpperCase() || "??";
  const truncMint =
    mint.length > 12 ? `${mint.slice(0, 4)}…${mint.slice(-4)}` : mint;

  return (
    <div className="varc-card">
      {/* Left: avatar + identity */}
      <div className="varc-left">
        <div className="varc-avatar">
          {row.logoURI ? (
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
            <KindTag row={row} />
            {row.trustTier && (
              <span className="varc-tag varc-tag--tier">{row.trustTier}</span>
            )}
          </div>
          {truncMint && <div className="varc-mint">{truncMint}</div>}
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

// ─── Section ──────────────────────────────────────────────────────────────────

interface VariantsSectionProps {
  assetName?: string | null;
  variants: VariantRow[];
}

export function VariantsSection({ assetName, variants }: VariantsSectionProps) {
  if (!Array.isArray(variants) || variants.length === 0) return null;

  // Separate into groups for display
  const native = variants.filter(isNativeVariant);
  const yielded = variants.filter(isYieldVariant);
  const other = variants.filter(
    (r) => !isNativeVariant(r) && !isYieldVariant(r),
  );

  const groups = [
    { title: "Spot tokens", rows: native, count: native.length },
    { title: "Yield", rows: yielded, count: yielded.length },
    { title: "Other", rows: other, count: other.length },
  ].filter((g) => g.rows.length > 0);

  return (
    <section className="td-section">
      <h2 className="td-section__title">Variants</h2>
      {assetName && (
        <p className="td-section__sub">
          Token representations of {assetName} on Solana.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.title} className="varc-group">
          <div className="varc-group__header">
            <span className="varc-group__title">{group.title}</span>
            <span className="varc-group__count">
              {group.count} variant{group.count !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="varc-list">
            {group.rows.map((row, i) => (
              <VarCard key={`${row.mint}-${i}`} row={row} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
