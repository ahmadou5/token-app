"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Sparkline } from "@/components/Sparkline";
import type { AnyToken } from "@/hooks/useToken";

// ─── Safe string helpers ──────────────────────────────────────────────────────

function safeSlice(
  str: string | null | undefined,
  start: number,
  end?: number,
): string {
  if (!str || typeof str !== "string") return "";
  return str.slice(start, end);
}

function safeInitials(str: string | null | undefined): string {
  if (!str || typeof str !== "string" || str.length === 0) return "?";
  return str.slice(0, 2).toUpperCase();
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1000)
    return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(8)}`;
}

export function fmtCompact(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

// ─── Data extraction ──────────────────────────────────────────────────────────

export function extractToken(token: AnyToken) {
  const name = token.name ?? token.primaryVariant?.name ?? "Unknown";
  const symbol = token.symbol ?? token.primaryVariant?.symbol ?? "";
  const category = token.category ?? "";
  const imageUrl: string | null =
    "imageUrl" in token
      ? (token.imageUrl ?? token.primaryVariant?.market?.logoURI ?? null)
      : null;
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
  const assetId = token.assetId ?? "";
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
    assetId,
  };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

export function TokenAvatar({
  src,
  name,
  size = 40,
}: {
  src: string | null | undefined;
  name: string | null | undefined;
  size?: number;
}) {
  const safeName = name && typeof name === "string" ? name : "?";
  const initials = safeInitials(safeName);
  const style = { width: size, height: size, minWidth: size };

  if (src && typeof src === "string") {
    return (
      <div className="tc-avatar" style={style}>
        <img
          src={src}
          alt={safeName}
          className="tc-avatar__img"
          onError={(e) => {
            const img = e.currentTarget;
            img.style.display = "none";
            const parent = img.parentElement;
            if (parent) {
              parent.classList.add("tc-avatar--fallback");
              parent.textContent = initials;
            }
          }}
        />
      </div>
    );
  }
  return (
    <div className="tc-avatar tc-avatar--fallback" style={style}>
      {initials}
    </div>
  );
}

// ─── Trust badge ──────────────────────────────────────────────────────────────

export function TrustBadge({ tier }: { tier: string | null | undefined }) {
  if (!tier || typeof tier !== "string") return null;
  const cls =
    tier === "tier1"
      ? "tc-badge--t1"
      : tier === "tier2"
        ? "tc-badge--t2"
        : "tc-badge--t3";
  const label = tier === "tier1" ? "T1" : tier === "tier2" ? "T2" : "T3";
  return <span className={`tc-badge ${cls}`}>{label}</span>;
}

// ─── Change chip ──────────────────────────────────────────────────────────────

export function ChangeChip({
  value,
  size = "md",
}: {
  value: number | null | undefined;
  size?: "sm" | "md";
}) {
  if (value == null || isNaN(value))
    return <span className="tc-change tc-change--neutral">—</span>;
  const up = value >= 0;
  return (
    <span
      className={`tc-change ${up ? "tc-change--up" : "tc-change--dn"} ${size === "sm" ? "tc-change--sm" : ""}`}
    >
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

// ─── Sparkline — no fixed width, uses viewBox + preserveAspectRatio ──────────

function InlineSparkline({
  price,
  change24h,
}: {
  price: number | null;
  change24h: number | null;
}) {
  const data = useMemo(() => {
    if (!price || price <= 0) return [];
    const seed = change24h ?? 0;
    return Array.from({ length: 20 }, (_, i) => {
      const t = i / 19;
      return (
        price * (1 - seed / 100) +
        price * (seed / 100) * t +
        Math.sin(i * 0.8) * price * 0.005
      );
    });
  }, [price, change24h]);

  if (data.length < 2) return <div className="tc-spark-placeholder" />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 80;
  const H = 36;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${pts.join(" L ")}`;
  const areaD = `M 0,${H} L ${pts.join(" L ")} L ${W},${H} Z`;

  const up = (data[data.length - 1] ?? 0) >= (data[0] ?? 0);
  const color = up ? "var(--tc-accent-up)" : "var(--tc-accent-down)";
  const areaColor = up ? "var(--tc-accent-up-bg)" : "var(--tc-accent-down-bg)";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="tc-spark-svg"
      aria-hidden
    >
      <path d={areaD} fill={areaColor} opacity="0.6" />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── List header ──────────────────────────────────────────────────────────────

export function ListHeader() {
  return (
    <div className="tc-list-header">
      <span>Token</span>
      <span>7d</span>
      <span>Price</span>
      <span>24h</span>
      <span>Volume</span>
      <span>Liquidity</span>
      <span>Mkt Cap</span>
    </div>
  );
}

// ─── Grid card ────────────────────────────────────────────────────────────────

function GridCard({
  token,
  index,
  onClick,
}: {
  token: AnyToken;
  index: number;
  onClick: () => void;
}) {
  const d = useMemo(() => extractToken(token), [token]);

  return (
    <article
      className="tc-grid-card"
      style={{ animationDelay: `${Math.min(index * 35, 600)}ms` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className="tc-grid-card__header">
        <TokenAvatar src={d.imageUrl} name={d.name} />
        <div className="tc-grid-card__identity">
          <span className="tc-grid-card__name">{d.name}</span>
          {d.symbol && (
            <span className="tc-grid-card__symbol">${d.symbol}</span>
          )}
        </div>
        <TrustBadge tier={d.trustTier} />
      </div>

      {/* Price + sparkline row — sparkline is fluid, never forces card wider */}
      <div className="tc-grid-card__chart-row">
        <div className="tc-grid-card__price-col">
          <div className="tc-grid-card__price">{fmtPrice(d.price)}</div>
          <ChangeChip value={d.change24h} />
        </div>
        <div className="tc-grid-card__spark">
          <InlineSparkline price={d.price} change24h={d.change24h} />
        </div>
      </div>

      <div className="tc-grid-card__divider" />

      <div className="tc-grid-card__stats">
        <div className="tc-stat">
          <span className="tc-stat__label">Vol 24h</span>
          <span className="tc-stat__value">{fmtCompact(d.volume)}</span>
        </div>
        <div className="tc-stat">
          <span className="tc-stat__label">Liquidity</span>
          <span className="tc-stat__value">{fmtCompact(d.liquidity)}</span>
        </div>
        <div className="tc-stat">
          <span className="tc-stat__label">Mkt Cap</span>
          <span className="tc-stat__value">{fmtCompact(d.mcap)}</span>
        </div>
        <div className="tc-stat">
          <span className="tc-stat__label">1h</span>
          <span className="tc-stat__value">
            <ChangeChip value={d.change1h} size="sm" />
          </span>
        </div>
      </div>

      {d.category && (
        <div className="tc-grid-card__footer">
          <span className="tc-grid-card__cat">{d.category}</span>
          <svg className="tc-grid-card__arrow" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </article>
  );
}

// ─── List row ─────────────────────────────────────────────────────────────────

function ListRow({
  token,
  index,
  onClick,
}: {
  token: AnyToken;
  index: number;
  onClick: () => void;
}) {
  const d = useMemo(() => extractToken(token), [token]);

  const sparkData = useMemo(() => {
    if (!d.price || d.price <= 0) return [];
    const seed = d.change24h ?? 0;
    return Array.from({ length: 16 }, (_, i) => {
      const t = i / 15;
      return (
        d.price! * (1 - seed / 100) +
        d.price! * (seed / 100) * t +
        Math.sin(i * 0.9) * d.price! * 0.004
      );
    });
  }, [d.price, d.change24h]);

  return (
    <div
      className="tc-list-row"
      style={{ animationDelay: `${Math.min(index * 25, 500)}ms` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className="tc-list-row__identity">
        <TokenAvatar src={d.imageUrl} name={d.name} size={36} />
        <div>
          <div className="tc-list-row__name">{d.name}</div>
          {d.symbol && <div className="tc-list-row__symbol">${d.symbol}</div>}
        </div>
        <TrustBadge tier={d.trustTier} />
      </div>
      <div className="tc-list-row__spark">
        <Sparkline data={sparkData} width={72} height={28} />
      </div>
      <div className="tc-list-row__price">{fmtPrice(d.price)}</div>
      <div className="tc-list-row__change">
        <ChangeChip value={d.change24h} />
      </div>
      <div className="tc-list-row__vol">{fmtCompact(d.volume)}</div>
      <div className="tc-list-row__liq">{fmtCompact(d.liquidity)}</div>
      <div className="tc-list-row__mcap">{fmtCompact(d.mcap)}</div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export type ViewMode = "grid" | "list";

export interface TokenCardProps {
  token: AnyToken;
  index?: number;
  viewMode?: ViewMode;
  onClick?: (token: AnyToken) => void;
}

export function TokenCard({
  token,
  index = 0,
  viewMode = "grid",
  onClick,
}: TokenCardProps) {
  const router = useRouter();

  // Guard: skip rendering if token has no assetId
  if (!token || !token.assetId) return null;

  const handleClick = () => {
    if (onClick) onClick(token);
    else router.push(`/token/${token.assetId}`);
  };

  if (viewMode === "list")
    return <ListRow token={token} index={index} onClick={handleClick} />;
  return <GridCard token={token} index={index} onClick={handleClick} />;
}
