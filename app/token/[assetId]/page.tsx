"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { tokenRequest } from "@/lib/token";
import {
  useOHLCV,
  type OHLCVInterval,
  type OHLCVTimeframe,
} from "@/hooks/useOHLCV";
import {
  TokenAvatar,
  TrustBadge,
  ChangeChip,
  fmtPrice,
  fmtCompact,
} from "@/components/TokenCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MarketsSection } from "@/components/Market";
import { SecuritySection } from "@/components/Secuirity";
import { VariantsSection, type VariantRow } from "@/components/Variant";
import { ExpandableDescription } from "@/components/ExpandableDescription";
import { BuyButton } from "@/components/BuyButton";
import { VariantPicker } from "@/components/VariantPicker";
import type { AssetRisk, AssetMarket, AssetProfile } from "@/types";
import { useTokens } from "@/hooks/useToken";

function fmtPct(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function safe(s: unknown): string {
  return s && typeof s === "string" ? s : "";
}

// ─── OHLCV Chart ──────────────────────────────────────────────────────────────

function OHLCVChart({
  candles,
  isLoading,
}: {
  candles: { time: number; close: number; volume: number }[];
  isLoading: boolean;
}) {
  const W = 800;
  const H = 220;
  const PAD = { top: 16, right: 16, bottom: 32, left: 56 };

  const derived = useMemo(() => {
    const clean = (candles ?? []).filter(
      (c) => c && typeof c.close === "number" && isFinite(c.close),
    );
    if (clean.length < 2) return null;

    const closes = clean.map((c) => c.close);
    const minVal = Math.min(...closes);
    const maxVal = Math.max(...closes);
    const range = maxVal - minVal || 1;
    const iW = W - PAD.left - PAD.right;
    const iH = H - PAD.top - PAD.bottom;

    const pts = closes.map(
      (v, i) =>
        [
          PAD.left + (i / (closes.length - 1)) * iW,
          PAD.top + (1 - (v - minVal) / range) * iH,
        ] as [number, number],
    );

    const path = pts
      .map(
        ([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`,
      )
      .join(" ");
    const last = pts[pts.length - 1];
    const areaPath = `${path} L ${last[0].toFixed(1)},${(H - PAD.bottom).toFixed(1)} L ${PAD.left},${(H - PAD.bottom).toFixed(1)} Z`;

    const steps = 4;
    const yLabels = Array.from({ length: steps + 1 }, (_, i) => ({
      y: PAD.top + (1 - i / steps) * iH,
      label: fmtPrice(minVal + (maxVal - minVal) * (i / steps)),
    }));

    const xCount = Math.min(6, clean.length);
    const xLabels = Array.from({ length: xCount }, (_, i) => {
      const idx = Math.round((i / (xCount - 1)) * (clean.length - 1));
      return {
        x: PAD.left + (idx / (clean.length - 1)) * iW,
        label: new Date(clean[idx].time).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      };
    });

    const positive = closes[closes.length - 1] >= closes[0];
    return { path, areaPath, yLabels, xLabels, positive };
  }, [candles]);

  if (isLoading)
    return (
      <div className="td-chart td-chart--loading">
        <div className="td-chart__shimmer" />
      </div>
    );
  if (!derived)
    return (
      <div className="td-chart td-chart--empty">
        <span>No price data to display</span>
      </div>
    );

  const { path, areaPath, yLabels, xLabels, positive } = derived;
  const lineColor = positive ? "var(--tc-accent-up)" : "var(--tc-accent-down)";

  return (
    <div className="td-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="td-chart__svg"
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {yLabels.map(({ y }) => (
          <line
            key={y}
            x1={PAD.left}
            y1={y}
            x2={W - PAD.right}
            y2={y}
            stroke="var(--tc-divider)"
            strokeWidth="1"
          />
        ))}
        <path d={areaPath} fill="url(#chartGrad)" />
        <path
          d={path}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {yLabels.map(({ y, label }) => (
          <text
            key={y}
            x={PAD.left - 8}
            y={y + 4}
            textAnchor="end"
            fontSize="10"
            fill="var(--tc-text-muted)"
            fontFamily="var(--tc-font-mono)"
          >
            {label}
          </text>
        ))}
        {xLabels.map(({ x, label }) => (
          <text
            key={x}
            x={x}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            fill="var(--tc-text-muted)"
            fontFamily="var(--tc-font-sans)"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ─── Chart controls ───────────────────────────────────────────────────────────

const TIMEFRAMES: OHLCVTimeframe[] = ["24H", "7D", "30D", "90D", "1Y"];
const INTERVALS: OHLCVInterval[] = ["1H", "4H", "1D", "1W"];

function ChartControls({
  timeframe,
  interval,
  onTimeframe,
  onInterval,
}: {
  timeframe: OHLCVTimeframe;
  interval: OHLCVInterval;
  onTimeframe: (t: OHLCVTimeframe) => void;
  onInterval: (i: OHLCVInterval) => void;
}) {
  return (
    <div className="td-chart-controls">
      <div className="td-chart-controls__group">
        <span className="td-chart-controls__label">Timeframe</span>
        {TIMEFRAMES.map((t) => (
          <button
            key={t}
            className={`td-ctrl-btn ${timeframe === t ? "td-ctrl-btn--active" : ""}`}
            onClick={() => onTimeframe(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="td-chart-controls__group">
        <span className="td-chart-controls__label">Interval</span>
        {INTERVALS.map((i) => (
          <button
            key={i}
            className={`td-ctrl-btn ${interval === i ? "td-ctrl-btn--active" : ""}`}
            onClick={() => onInterval(i)}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Build VariantRow from any raw variant object ─────────────────────────────

interface RawVariant {
  mint?: string;
  variantId?: string;
  name?: string;
  label?: string;
  symbol?: string;
  trustTier?: string;
  market?: {
    price?: number | null;
    liquidity?: number | null;
    volume24hUSD?: number | null;
    volume24h?: number | null;
    logoURI?: string | null;
  };
  kind?: string;
  tags?: string[];
  issuer?: string;
}

function buildVariantRow(
  v: RawVariant,
  assetName?: string | null,
  assetSymbol?: string | null,
): VariantRow | null {
  if (!v || typeof v !== "object") return null;
  const mint = safe(v.mint ?? v.variantId);
  if (!mint) return null;

  return {
    name: safe(v.name ?? v.label ?? assetName),
    symbol: safe(v.symbol ?? assetSymbol),
    mint,
    trustTier: safe(v.trustTier ?? "unknown"),
    price: v.market?.price ?? null,
    liquidity: v.market?.liquidity ?? null,
    volume24h: v.market?.volume24hUSD ?? v.market?.volume24h ?? null,
    kind: safe(v.kind ?? "spot"),
    tags: Array.isArray(v.tags) ? v.tags : [],
    issuer: safe(v.issuer),
    logoURI: v.market?.logoURI ?? null,
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="td-page">
      <div className="td-topbar">
        <div className="td-topbar__left">
          <button className="td-back" onClick={onBack}>
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
              <path
                d="M10 3L5 8l5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Tokens
          </button>
        </div>
        <ThemeToggle />
      </div>
      <div className="td-skel-page">
        <div className="td-skel-page__main">
          {/* Header */}
          <div className="td-skel-row" style={{ marginBottom: 24 }}>
            <div
              className="td-skel td-skel--circle"
              style={{ width: 52, height: 52 }}
            />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                className="td-skel td-skel--line"
                style={{ width: "40%", height: 22 }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <div
                  className="td-skel td-skel--line"
                  style={{ width: 70, height: 22, borderRadius: 20 }}
                />
                <div
                  className="td-skel td-skel--line"
                  style={{ width: 100, height: 22, borderRadius: 20 }}
                />
              </div>
            </div>
            <div
              className="td-skel td-skel--line"
              style={{ width: 100, height: 36, borderRadius: 20 }}
            />
          </div>
          {/* Chart */}
          <div className="td-chart-section" style={{ marginBottom: 24 }}>
            <div className="td-chart td-chart--loading">
              <div className="td-chart__shimmer" />
            </div>
            <div
              className="td-chart-controls"
              style={{ marginTop: 16, gap: 6 }}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="td-skel td-skel--line"
                  style={{ width: 40, height: 28, borderRadius: 6 }}
                />
              ))}
            </div>
          </div>
          {/* Stats */}
          <div
            className="td-skel td-skel--line"
            style={{ width: 60, height: 18, marginBottom: 14 }}
          />
          <div className="td-stats-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="td-stat-cell">
                <div
                  className="td-skel td-skel--line"
                  style={{ width: "60%", height: 11, marginBottom: 6 }}
                />
                <div
                  className="td-skel td-skel--line"
                  style={{ width: "80%", height: 18 }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="td-skel-page__side">
          <div
            className="td-skel td-skel--line"
            style={{
              width: "100%",
              height: 44,
              borderRadius: 22,
              marginBottom: 16,
            }}
          />
          <div className="td-card">
            <div
              className="td-skel td-skel--line"
              style={{ width: "50%", height: 14, marginBottom: 12 }}
            />
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="td-skel td-skel--line"
                style={{ height: 13, marginBottom: 8 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page data ────────────────────────────────────────────────────────────────

interface TokenPageData {
  name: string | null;
  symbol: string | null;
  category: string;
  imageUrl: string | null;
  price: number | null;
  change24h: number | null;
  change1h: number | null;
  volume: number | null;
  liquidity: number | null;
  mcap: number | null;
  fdv: number | null;
  supply: number | null;
  totalSupply: number | null;
  holders: number | null;
  trustTier: string | null;
  description: string | null;
  website: string | null;
  twitter: string | null;
  reddit: string | null;
  currentMint: string | null;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TokenDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = use(params);
  const router = useRouter();
  const { tokens } = useTokens();

  const [pageData, setPageData] = useState<TokenPageData | null>(null);
  const [risk, setRisk] = useState<AssetRisk | null>(null);
  const [markets, setMarkets] = useState<AssetMarket[]>([]);
  const [marketsTotal, setMarketsTotal] = useState(0);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  const {
    candles,
    isLoading: chartLoading,
    timeframe,
    interval,
    setTimeframe,
    setInterval,
  } = useOHLCV(assetId);

  useEffect(() => {
    // Immediately reset — shows skeleton right away on navigation
    setIsLoadingPage(true);
    setPageData(null);
    setRisk(null);
    setMarkets([]);
    setVariants([]);

    let cancelled = false;

    async function load() {
      try {
        const raw = await tokenRequest.getAsset(assetId, true);
        if (cancelled) return;

        const curatedMatch = tokens.find((t) => t?.assetId === assetId);
        const marketsArr: AssetMarket[] =
          raw?.includes?.markets?.data?.markets ?? [];
        const market0 = marketsArr[0] ?? null;
        const profile: AssetProfile | null =
          raw?.includes?.profile?.data ?? null;
        const riskData: AssetRisk | null = raw?.includes?.risk?.data ?? null;

        const assetName = raw?.asset?.name ?? null;
        const assetSym = raw?.asset?.symbol ?? null;

        setPageData({
          name: assetName,
          symbol: assetSym,
          category: safe(raw?.asset?.category),
          imageUrl:
            (market0 as { base?: { icon?: string } })?.base?.icon ??
            curatedMatch?.imageUrl ??
            null,
          price: profile?.price ?? null,
          change24h: profile?.priceChange24h ?? null,
          change1h: curatedMatch?.stats?.priceChange1hPercent ?? null,
          volume: profile?.volume24h ?? null,
          liquidity: curatedMatch?.stats?.liquidity ?? null,
          mcap: profile?.marketCap ?? null,
          fdv: profile?.fdv ?? null,
          supply: profile?.circulatingSupply ?? null,
          totalSupply: profile?.totalSupply ?? null,
          holders: null,
          trustTier: curatedMatch?.primaryVariant?.trustTier ?? null,
          description: profile?.description ?? null,
          website: profile?.links?.website ?? null,
          twitter: profile?.links?.twitter ?? null,
          reddit: profile?.links?.reddit ?? null,
          currentMint: curatedMatch?.primaryVariant?.mint ?? null,
        });

        if (riskData) setRisk(riskData);
        setMarkets(marketsArr);
        setMarketsTotal(
          raw?.includes?.markets?.data?.total ?? marketsArr.length,
        );

        // ── Build variants list ──────────────────────────────────────────────
        // Priority order: full variants array from API > primaryVariant from curated
        const variantRows: VariantRow[] = [];

        // 1. Try to get variants from the full API response
        const rawVariants = Array.isArray(raw?.variant) ? raw.variant : [];

        if (Array.isArray(rawVariants) && rawVariants.length > 0) {
          for (const v of rawVariants) {
            const row = buildVariantRow(v, assetName, assetSym);
            if (row) variantRows.push(row);
          }
        }

        // 2. If no variants from API, use the curated primaryVariant as a fallback
        if (variantRows.length === 0 && curatedMatch?.primaryVariant) {
          const pv = curatedMatch.primaryVariant;
          const rawVariant: RawVariant = {
            mint: pv.mint,
            variantId: pv.variantId,
            name: pv.name ?? pv.label ?? assetName ?? undefined,
            label: pv.label,
            symbol: pv.symbol ?? assetSym ?? undefined,
            trustTier: pv.trustTier,
            market: pv.market
              ? {
                  price: pv.market.price,
                  liquidity: pv.market.liquidity,
                  volume24hUSD: pv.market.volume24hUSD,
                  volume24h: pv.market.volume24hUSD,
                  logoURI: pv.market.logoURI,
                }
              : undefined,
            kind: pv.kind,
            tags: pv.tags,
            issuer: pv.issuer,
          };
          const row = buildVariantRow(rawVariant, assetName, assetSym);
          if (row) variantRows.push(row);
        }

        setVariants(variantRows);
      } catch (e) {
        console.error("Failed to load token detail:", e);
      } finally {
        if (!cancelled) setIsLoadingPage(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [assetId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show full skeleton until data arrives
  if (isLoadingPage || !pageData) {
    return <PageSkeleton onBack={() => router.back()} />;
  }

  const d = pageData;
  const mintDisplay = d.currentMint
    ? `${d.currentMint.slice(0, 4)}…${d.currentMint.slice(-4)}`
    : null;

  return (
    <div className="td-page">
      {/* Topbar */}
      <div className="td-topbar">
        <div className="td-topbar__left">
          <button className="td-back" onClick={() => router.back()}>
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
              <path
                d="M10 3L5 8l5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Tokens
          </button>
          <nav className="td-breadcrumb">
            <span className="td-breadcrumb__sep">›</span>
            <span className="td-breadcrumb__item">{d.name}</span>
            {d.symbol && (
              <>
                <span className="td-breadcrumb__sep">›</span>
                <span className="td-breadcrumb__item td-breadcrumb__item--mint">
                  ${d.symbol}
                </span>
              </>
            )}
          </nav>
        </div>
        <ThemeToggle />
      </div>

      <div className="td-layout">
        {/* ── Main ── */}
        <div className="td-main">
          {/* Token header */}
          <div className="td-header">
            <TokenAvatar src={d.imageUrl} name={d.name} size={52} />
            <div className="td-header__info">
              <div className="td-header__row">
                <h1 className="td-header__name">{d.name ?? assetId}</h1>
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  width="15"
                  height="15"
                  className="td-header__verified"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="8"
                    fill="var(--tc-badge-t1-c)"
                    opacity="0.15"
                  />
                  <circle
                    cx="8"
                    cy="8"
                    r="7"
                    stroke="var(--tc-badge-t1-c)"
                    strokeWidth="1"
                  />
                  <path
                    d="M5 8l2 2 4-4"
                    stroke="var(--tc-badge-t1-c)"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="td-header__pills">
                {d.symbol && (
                  <span className="td-pill td-pill--sym">${d.symbol}</span>
                )}
                {variants.length > 0 && (
                  <VariantPicker
                    variants={variants}
                    assetId={assetId}
                    currentMint={d.currentMint ?? undefined}
                  />
                )}
                {mintDisplay && (
                  <span className="td-pill td-pill--mint">
                    <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
                      <rect
                        x="1"
                        y="1"
                        width="10"
                        height="10"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1"
                      />
                      <path
                        d="M3.5 6h5M6 3.5v5"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                      />
                    </svg>
                    {mintDisplay}
                  </span>
                )}
              </div>
            </div>
            <div className="td-header__actions">
              <button className="td-icon-btn" aria-label="Search">
                <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                  <circle
                    cx="6.5"
                    cy="6.5"
                    r="4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M10.5 10.5L14 14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              {d.website && (
                <a
                  href={d.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="td-icon-btn"
                  aria-label="Website"
                >
                  <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                    <circle
                      cx="8"
                      cy="8"
                      r="6.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M8 1.5C8 1.5 10.5 4 10.5 8s-2.5 6.5-2.5 6.5M8 1.5C8 1.5 5.5 4 5.5 8s2.5 6.5 2.5 6.5M1.5 8h13"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </a>
              )}
              {d.twitter && (
                <a
                  href={`https://x.com/${d.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="td-icon-btn"
                  aria-label="Twitter / X"
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    width="15"
                    height="15"
                  >
                    <path d="M12.6 2h2.2L9.9 7.3 15.6 14h-4.3l-3.5-4.5L3.7 14H1.5l5.3-5.7L1 2h4.4l3.2 4.1L12.6 2z" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="td-chart-section">
            <div className="td-chart-label">
              <span className="td-chart-label__sym">{d.symbol}</span>
              <span className="td-chart-label__text"> price is currently</span>
              <div className="td-chart-label__price">{fmtPrice(d.price)}</div>
              <ChangeChip value={d.change24h} />
              <span className="td-chart-label__period"> 24h</span>
            </div>
            <OHLCVChart candles={candles} isLoading={chartLoading} />
            <ChartControls
              timeframe={timeframe}
              interval={interval}
              onTimeframe={setTimeframe}
              onInterval={setInterval}
            />
          </div>

          {/* Stats */}
          <section className="td-section">
            <h2 className="td-section__title">Stats</h2>
            <div className="td-stats-grid">
              {[
                { label: "Market Cap", value: fmtCompact(d.mcap) },
                { label: "Liquidity", value: fmtCompact(d.liquidity) },
                { label: "24H Volume", value: fmtCompact(d.volume) },
                {
                  label: "Supply",
                  value: d.supply ? `${(d.supply / 1e6).toFixed(2)}M` : "—",
                },
                { label: "Price", value: fmtPrice(d.price) },
                {
                  label: "24H Change",
                  value: fmtPct(d.change24h),
                  colored: true,
                  val: d.change24h,
                },
                { label: "FDV", value: fmtCompact(d.fdv) },
                {
                  label: "Total Supply",
                  value: d.totalSupply
                    ? `${(d.totalSupply / 1e6).toFixed(2)}M`
                    : "—",
                },
              ].map(({ label, value, colored, val }) => (
                <div key={label} className="td-stat-cell">
                  <span className="td-stat-cell__label">{label}</span>
                  <span
                    className={`td-stat-cell__value ${
                      colored
                        ? val != null && val >= 0
                          ? "td-stat-cell__value--up"
                          : "td-stat-cell__value--dn"
                        : ""
                    }`}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {markets.length > 0 && (
            <MarketsSection markets={markets} total={marketsTotal} />
          )}

          {risk && (
            <SecuritySection
              risk={risk}
              liquidity={d.liquidity}
              volume={d.volume}
              holders={d.holders}
            />
          )}

          {variants.length > 0 && (
            <VariantsSection assetName={d.name} variants={variants} />
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="td-sidebar">
          <BuyButton tokenName={d.name} tokenSymbol={d.symbol} />

          {d.description && (
            <ExpandableDescription
              text={d.description}
              tokenName={d.name}
              maxChars={220}
            />
          )}

          {(d.website || d.twitter || d.reddit) && (
            <div className="td-card">
              <h3 className="td-card__title">Official links</h3>
              <div className="td-links">
                {d.website && (
                  <a
                    href={d.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="td-link"
                  >
                    Website
                  </a>
                )}
                {d.reddit && (
                  <a
                    href={`https://reddit.com/r/${d.reddit}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="td-link"
                  >
                    Reddit
                  </a>
                )}
                {d.twitter && (
                  <a
                    href={`https://x.com/${d.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="td-link"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      width="11"
                      height="11"
                    >
                      <path d="M12.6 2h2.2L9.9 7.3 15.6 14h-4.3l-3.5-4.5L3.7 14H1.5l5.3-5.7L1 2h4.4l3.2 4.1L12.6 2z" />
                    </svg>
                    X
                  </a>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
