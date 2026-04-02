"use client";

import { useMemo } from "react";
import type { AnyToken } from "@/hook/useToken"; // adjust path

// ─── Utility: format numbers ───────────────────────────────────────────────────

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1000)
    return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(8)}`;
}

function fmtCompact(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

// ─── Extract unified fields from AnyToken ─────────────────────────────────────

function extract(token: AnyToken) {
  // Both TokenAsset and SearchResult have these top-level fields:
  const name = token.name ?? token.primaryVariant?.name ?? "Unknown";
  const symbol = token.symbol ?? token.primaryVariant?.symbol ?? "?";
  const category = token.category ?? "";
  const imageUrl: string | null =
    "imageUrl" in token
      ? (token.imageUrl ?? token.primaryVariant?.market?.logoURI ?? null)
      : null;

  // Stats can live at top-level or inside primaryVariant.market
  const stats = token.stats ?? null;
  const market = token.primaryVariant?.market ?? null;

  const price = stats?.price ?? market?.price ?? null;
  const change24h =
    stats?.priceChange24hPercent ?? market?.priceChange24hPercent ?? null;
  const change1h =
    stats?.priceChange1hPercent ?? market?.priceChange1hPercent ?? null;
  const volume = stats?.volume24hUSD ?? market?.volume24hUSD ?? null;
  const liquidity = stats?.liquidity ?? market?.liquidity ?? null;
  const mcap = stats?.marketCap ?? market?.marketCap ?? null;
  const trustTier = token.primaryVariant?.trustTier ?? null;

  return {
    name,
    symbol,
    category,
    imageUrl,
    price,
    change24h,
    change1h,
    volume,
    liquidity,
    mcap,
    trustTier,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TrustBadge({ tier }: { tier: string | null }) {
  if (!tier) return null;
  const map: Record<string, { label: string; cls: string }> = {
    tier1: { label: "Tier 1", cls: "token-card__badge--tier1" },
    tier2: { label: "Tier 2", cls: "token-card__badge--tier2" },
    tier3: { label: "Tier 3", cls: "token-card__badge--tier3" },
  };
  const info = map[tier] ?? { label: tier, cls: "token-card__badge--default" };
  return <span className={`token-card__badge ${info.cls}`}>{info.label}</span>;
}

function ChangeChip({ value }: { value: number | null | undefined }) {
  if (value == null)
    return (
      <span className="token-card__change token-card__change--neutral">—</span>
    );
  const positive = value >= 0;
  return (
    <span
      className={`token-card__change ${positive ? "token-card__change--up" : "token-card__change--down"}`}
    >
      {positive ? "▲" : "▼"} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function TokenAvatar({ src, name }: { src: string | null; name: string }) {
  const initials = name.slice(0, 2).toUpperCase();
  if (src) {
    return (
      <div className="token-card__avatar">
        <img src={src} alt={name} className="token-card__avatar-img" />
      </div>
    );
  }
  return (
    <div className="token-card__avatar token-card__avatar--fallback">
      <span>{initials}</span>
    </div>
  );
}

// ─── Main TokenCard ───────────────────────────────────────────────────────────

export interface TokenCardProps {
  token: AnyToken;
  onClick?: (token: AnyToken) => void;
  /** Optional: which row index (for stagger animation) */
  index?: number;
}

export function TokenCard({ token, onClick, index = 0 }: TokenCardProps) {
  const d = useMemo(() => extract(token), [token]);

  return (
    <article
      className="token-card"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => onClick?.(token)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => e.key === "Enter" && onClick?.(token)}
    >
      {/* Header row */}
      <div className="token-card__header">
        <TokenAvatar src={d.imageUrl} name={d.name} />
        <div className="token-card__identity">
          <span className="token-card__name">{d.name}</span>
          <span className="token-card__symbol">${d.symbol}</span>
        </div>
        <TrustBadge tier={d.trustTier} />
      </div>

      {/* Price row */}
      <div className="token-card__price-row">
        <span className="token-card__price">{fmtPrice(d.price)}</span>
        <ChangeChip value={d.change24h} />
      </div>

      {/* Divider */}
      <div className="token-card__divider" />

      {/* Stats grid */}
      <div className="token-card__stats">
        <div className="token-card__stat">
          <span className="token-card__stat-label">Volume 24h</span>
          <span className="token-card__stat-value">{fmtCompact(d.volume)}</span>
        </div>
        <div className="token-card__stat">
          <span className="token-card__stat-label">Liquidity</span>
          <span className="token-card__stat-value">
            {fmtCompact(d.liquidity)}
          </span>
        </div>
        <div className="token-card__stat">
          <span className="token-card__stat-label">Mkt Cap</span>
          <span className="token-card__stat-value">{fmtCompact(d.mcap)}</span>
        </div>
        <div className="token-card__stat">
          <span className="token-card__stat-label">1h</span>
          <span className="token-card__stat-value">
            <ChangeChip value={d.change1h} />
          </span>
        </div>
      </div>

      {/* Category tag */}
      {d.category && (
        <div className="token-card__footer">
          <span className="token-card__category">{d.category}</span>
        </div>
      )}
    </article>
  );
}
