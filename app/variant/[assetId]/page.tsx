"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOHLCV, type OHLCVTimeframe } from "@/hooks/useOHLCV";
import {
  TokenAvatar,
  ChangeChip,
  fmtPrice,
  fmtCompact,
} from "@/components/TokenCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SecuritySection } from "@/components/Secuirity";
import {
  VariantsSection,
  flattenVariantGroups,
  type VariantRow,
} from "@/components/Variant";
import { ExpandableDescription } from "@/components/ExpandableDescription";
import { BuyButton } from "@/components/BuyButton";
import { VariantPicker } from "@/components/VariantPicker";
import type { TokenAssetResponse } from "@/types/token.types";
import { tokenRequest } from "@/lib/token";
import type { AssetsResolveResponse } from "@/types";
import { useTokens } from "@/hooks/useToken";
import { SpotSwap } from "@/components/Swap/SpotSwap";
import { useConnector, useWallet } from "@solana/connector";
import { ConnectedPill } from "@/components/Swap";
import { EarnVault } from "@/components/Earn/EarnVault";
import { NativeStakeCard } from "@/components/Staking/NativeStakeCard";

function fmtPct(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtVolTooltip(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

// ─── OHLCV Chart ──────────────────────────────────────────────────────────────

interface TooltipState {
  x: number;
  y: number;
  price: number;
  volume: number;
  time: number;
  visible: boolean;
}

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

  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    x: 0,
    y: 0,
    price: 0,
    volume: 0,
    time: 0,
    visible: false,
  });
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!isLoading && candles.length > 1) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimated(true));
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isLoading, candles.length]); // Much simpler!

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

    const pts = clean.map(
      (c, i) =>
        [
          PAD.left + (i / (clean.length - 1)) * iW,
          PAD.top + (1 - (c.close - minVal) / range) * iH,
          c,
        ] as [number, number, typeof c],
    );

    const path = pts
      .map(
        ([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`,
      )
      .join(" ");

    const last = pts[pts.length - 1];
    const areaPath = `${path} L ${last[0].toFixed(1)},${(H - PAD.bottom).toFixed(1)} L ${PAD.left},${(H - PAD.bottom).toFixed(1)} Z`;

    // Approximate path length for stroke-dasharray animation
    const pathLen = pts.reduce((acc, pt, i) => {
      if (i === 0) return 0;
      const prev = pts[i - 1];
      return acc + Math.hypot(pt[0] - prev[0], pt[1] - prev[1]);
    }, 0);

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
    const pulsePt = pts[pts.length - 1];

    return {
      path,
      areaPath,
      pathLen,
      yLabels,
      xLabels,
      positive,
      pulsePt,
      pts,
      iW,
    };
  }, [candles]);

  // ── Tooltip mouse/touch handler ──────────────────────────────────────────
  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!derived || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = W / rect.width;
    const rawX = (e.clientX - rect.left) * scaleX;
    const clampedX = Math.max(PAD.left, Math.min(W - PAD.right, rawX));

    // Find nearest candle by x
    const iW = W - PAD.left - PAD.right;
    const ratio = (clampedX - PAD.left) / iW;
    const clean = (candles ?? []).filter(
      (c) => c && typeof c.close === "number" && isFinite(c.close),
    );
    const idx = Math.round(ratio * (clean.length - 1));
    const candle = clean[Math.max(0, Math.min(idx, clean.length - 1))];
    const pt = derived.pts[Math.max(0, Math.min(idx, derived.pts.length - 1))];

    setTooltip({
      x: pt[0],
      y: pt[1],
      price: candle.close,
      volume: candle.volume,
      time: candle.time,
      visible: true,
    });
  }

  function handlePointerLeave() {
    setTooltip((t) => ({ ...t, visible: false }));
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="td-chart td-chart--loading">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="td-chart__svg"
          aria-hidden
        >
          {/* Shimmering fake bars */}
          {Array.from({ length: 12 }).map((_, i) => {
            const bH = 40 + Math.sin(i * 1.3) * 30 + 50;
            const x = PAD.left + (i / 11) * (W - PAD.left - PAD.right);
            return (
              <rect
                key={i}
                x={x - 16}
                y={H - PAD.bottom - bH}
                width={28}
                height={bH}
                rx="4"
                fill="var(--tc-chart-skel)"
                className="td-chart__skel-bar"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            );
          })}
          {/* Shimmering wave line */}
          <polyline
            points={Array.from({ length: 20 }, (_, i) => {
              const x = PAD.left + (i / 19) * (W - PAD.left - PAD.right);
              const y = H / 2 + Math.sin(i * 0.8) * 24;
              return `${x},${y}`;
            }).join(" ")}
            fill="none"
            stroke="var(--tc-chart-skel)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="td-chart__skel-line"
          />
        </svg>
      </div>
    );
  }

  if (!derived) {
    return (
      <div className="td-chart td-chart--empty">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          width="40"
          height="40"
          className="td-chart__empty-icon"
        >
          <rect
            x="4"
            y="28"
            width="8"
            height="14"
            rx="2"
            fill="var(--tc-border-hover)"
          />
          <rect
            x="16"
            y="18"
            width="8"
            height="24"
            rx="2"
            fill="var(--tc-border-hover)"
          />
          <rect
            x="28"
            y="8"
            width="8"
            height="34"
            rx="2"
            fill="var(--tc-border-hover)"
          />
          <rect
            x="40"
            y="22"
            width="8"
            height="20"
            rx="2"
            fill="var(--tc-border-hover)"
          />
          <path
            d="M6 10l10-6 10 8 10-8 10 6"
            stroke="var(--tc-border-hover)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="td-chart__empty-text">No price data available</span>
        <span className="td-chart__empty-pulse" aria-hidden />
      </div>
    );
  }

  const { path, areaPath, pathLen, yLabels, xLabels, positive, pulsePt } =
    derived;
  const lineColor = positive ? "var(--tc-accent-up)" : "var(--tc-accent-down)";
  const pulseColor = positive ? "var(--tc-accent-up)" : "var(--tc-accent-down)";

  // Tooltip positioning — keep inside chart bounds in SVG coords
  const ttW = 140; // approximate tooltip width in SVG coords
  const ttX = Math.min(
    Math.max(tooltip.x - ttW / 2, PAD.left),
    W - PAD.right - ttW,
  );
  const ttY = tooltip.y < H / 2 ? tooltip.y + 16 : tooltip.y - 68;

  return (
    <div className="td-chart" style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="td-chart__svg"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{ cursor: "crosshair" }}
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
          <clipPath id="chartClip">
            <rect
              x={PAD.left}
              y={PAD.top - 4}
              width={animated ? W - PAD.left - PAD.right : 0}
              height={H - PAD.top - PAD.bottom + 8}
              style={{
                transition: animated
                  ? "width 900ms cubic-bezier(0.22,1,0.36,1)"
                  : "none",
              }}
            />
          </clipPath>
        </defs>

        {/* Grid lines */}
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

        {/* Area fill — clipped for draw animation */}
        <g clipPath="url(#chartClip)">
          <path d={areaPath} fill="url(#chartGrad)" />
        </g>

        {/* Line — clipped for draw animation */}
        <g clipPath="url(#chartClip)">
          <path
            d={path}
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Y-axis labels */}
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

        {/* X-axis labels */}
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

        {/* Pulse dot at last price — only shown when animated and tooltip not active */}
        {animated && !tooltip.visible && (
          <g>
            {/* Outer pulse ring */}
            <circle
              cx={pulsePt[0]}
              cy={pulsePt[1]}
              r="8"
              fill={pulseColor}
              opacity="0"
              className="td-chart__pulse-ring"
            />
            {/* Inner solid dot */}
            <circle
              cx={pulsePt[0]}
              cy={pulsePt[1]}
              r="4"
              fill={pulseColor}
              className="td-chart__pulse-dot"
            />
          </g>
        )}

        {/* Tooltip crosshair + data card */}
        {tooltip.visible && (
          <g>
            {/* Vertical hairline */}
            <line
              x1={tooltip.x}
              y1={PAD.top}
              x2={tooltip.x}
              y2={H - PAD.bottom}
              stroke="var(--tc-text-muted)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            {/* Dot on line */}
            <circle
              cx={tooltip.x}
              cy={tooltip.y}
              r="4"
              fill={lineColor}
              stroke="var(--tc-bg)"
              strokeWidth="2"
            />

            {/* Tooltip card */}
            <g>
              <rect
                x={ttX}
                y={ttY}
                width={ttW}
                height={60}
                rx="6"
                fill="var(--tc-tooltip-bg)"
                stroke="var(--tc-tooltip-border)"
                strokeWidth="1"
              />
              {/* Date */}
              <text
                x={ttX + 10}
                y={ttY + 16}
                fontSize="9"
                fill="var(--tc-text-muted)"
                fontFamily="var(--tc-font-sans)"
              >
                {new Date(tooltip.time).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </text>
              {/* Price label */}
              <text
                x={ttX + 10}
                y={ttY + 32}
                fontSize="9"
                fill="var(--tc-text-muted)"
                fontFamily="var(--tc-font-sans)"
              >
                Price
              </text>
              {/* Price value */}
              <text
                x={ttX + ttW - 10}
                y={ttY + 32}
                fontSize="11"
                fontWeight="600"
                fill="var(--tc-text-primary)"
                fontFamily="var(--tc-font-mono)"
                textAnchor="end"
              >
                {fmtPrice(tooltip.price)}
              </text>
              {/* Volume label */}
              <text
                x={ttX + 10}
                y={ttY + 50}
                fontSize="9"
                fill="var(--tc-text-muted)"
                fontFamily="var(--tc-font-sans)"
              >
                Volume
              </text>
              {/* Volume value */}
              <text
                x={ttX + ttW - 10}
                y={ttY + 50}
                fontSize="11"
                fontWeight="600"
                fill={lineColor}
                fontFamily="var(--tc-font-mono)"
                textAnchor="end"
              >
                {fmtVolTooltip(tooltip.volume)}
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── Chart controls — Timeframe only ─────────────────────────────────────────

const TIMEFRAMES: OHLCVTimeframe[] = ["24H", "7D", "30D", "90D", "1Y"];

function ChartControls({
  timeframe,
  onTimeframe,
  isLoading,
}: {
  timeframe: OHLCVTimeframe;
  onTimeframe: (t: OHLCVTimeframe) => void;
  isLoading: boolean;
}) {
  return (
    <div className="td-chart-controls">
      <div className="td-chart-controls__group">
        {TIMEFRAMES.map((t) => (
          <button
            key={t}
            className={`td-ctrl-btn ${timeframe === t ? "td-ctrl-btn--active" : ""}`}
            onClick={() => onTimeframe(t)}
            disabled={isLoading}
          >
            {t}
            {/* Show a tiny spinner inside the active button while loading */}
            {isLoading && timeframe === t && (
              <span className="td-ctrl-btn__spinner" aria-hidden />
            )}
          </button>
        ))}
      </div>
    </div>
  );
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
          </div>
          <div className="td-chart-section" style={{ marginBottom: 24 }}>
            <div className="td-chart td-chart--loading">
              <div className="td-chart__shimmer" />
            </div>
          </div>
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TokenDetailPage({
  params,
}: {
  params: Promise<{ assetId: string; mint: string }>;
}) {
  const { assetId, mint } = use(params);
  const router = useRouter();
  const { tokens } = useTokens();
  const { isConnected } = useWallet();
  const connector = useConnector();
  const [data, setData] = useState<TokenAssetResponse | null>(null);
  const [other, setOther] = useState<AssetsResolveResponse | null>(null);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<VariantRow | null>(
    null,
  );
  const [isLoadingPage, setLoading] = useState(true);
  //const fallbackToken = tokens.find((t) => t.primaryVariant?.variantId === mint) ?? null;

  const {
    candles,
    isLoading: chartLoading,
    timeframe,
    setTimeframe,
  } = useOHLCV(assetId);

  useEffect(() => {
    //setLoading(true);
    //setData(null);
    //setOther(null);
    //setVariants([]);

    let cancelled = false;

    async function load() {
      try {
        const [res, otherData] = await Promise.all([
          fetch(`/api/getToken?assetId=${assetId}`),
          tokenRequest.getAsset(assetId, true),
        ]);
        if (!res.ok) throw new Error(`Token API error: ${res.status}`);
        const json = await res.json();
        if (cancelled) return;

        // Standardized structure is { asset, includes }
        const assetData: TokenAssetResponse = json.asset || json;

        console.log("[VariantDetailPage] Loaded data:", { assetData, otherData });
        setData(assetData);
        setOther(otherData);

        const rows = flattenVariantGroups(
          assetData.variantGroups,
          assetData.name,
          assetData.symbol,
        );
        const currentRow = rows.find((r) => r.mint === mint);
        setSelectedVariant(currentRow ?? null);
        setVariants(rows);
      } catch (e) {
        console.error("[TokenDetailPage] Failed to load:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  if (isLoadingPage || !data) {
    return <PageSkeleton onBack={() => router.back()} />;
  }

  const profile = other?.includes?.profile?.data ?? null;
  const risk = other?.includes?.risk?.data ?? null;

  const price = profile?.price ?? data.stats.price ?? null;
  const change24h =
    profile?.priceChange24h ?? data.stats.priceChange24hPercent ?? null;
  const volume = profile?.volume24h ?? data.stats.volume24hUSD ?? null;
  const liquidity = data.stats.liquidity ?? null;
  const mcap = profile?.marketCap ?? data.stats.marketCap ?? null;
  const fdv = profile?.fdv ?? null;
  const supply = profile?.circulatingSupply ?? null;
  const totalSupply = profile?.totalSupply ?? null;
  const description = profile?.description ?? null;
  const website = profile?.links?.website ?? null;
  const twitter = profile?.links?.twitter ?? null;
  const reddit = profile?.links?.reddit ?? null;

  const currentMint = selectedVariant?.mint ?? null;
  const mintDisplay = currentMint
    ? `${currentMint.slice(0, 4)}…${currentMint.slice(-4)}`
    : null;

  const STABLE_SYMBOLS = [
    "USDC",
    "USDT",
    "USDG",
    "DAI",
    "USDS",
    "PYUSD",
    "FDUSD",
  ];
  const isStable = STABLE_SYMBOLS.includes(data.symbol?.toUpperCase() ?? "");
  const isNativeSOL =
    data.symbol?.toUpperCase() === "SOL" && !data.primaryVariant?.mint;

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
            Variants
          </button>
          <nav className="td-breadcrumb">
            <span className="td-breadcrumb__sep">›</span>
            <span className="td-breadcrumb__item">{data.name}</span>
            {selectedVariant?.symbol && (
              <>
                <span className="td-breadcrumb__sep">›</span>
                <span className="td-breadcrumb__item td-breadcrumb__item--mint">
                  ${selectedVariant.symbol}
                </span>
              </>
            )}
          </nav>
        </div>
        <ThemeToggle />
      </div>

      <div className="td-layout">
        <div className="td-main">
          {/* Header */}
          <div className="td-header">
            <TokenAvatar
              src={selectedVariant?.logoURI}
              name={selectedVariant?.name}
              size={52}
            />
            <div className="td-header__info">
              <div className="td-header__row">
                <h1 className="td-header__name">{data.name ?? assetId}</h1>
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
                {selectedVariant?.symbol && (
                  <span className="td-pill td-pill--sym">
                    ${selectedVariant?.symbol}
                  </span>
                )}
                {variants.length > 0 && (
                  <VariantPicker
                    variants={variants}
                    assetId={assetId}
                    currentMint={selectedVariant?.mint ?? undefined}
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
              {website && (
                <a
                  href={website}
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
              {twitter && (
                <a
                  href={`https://x.com/${twitter}`}
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
              <span className="td-chart-label__sym">{data.symbol}</span>
              <span className="td-chart-label__text"> price is currently</span>
              <div className="td-chart-label__price">{fmtPrice(price)}</div>
              <ChangeChip value={change24h} />
              <span className="td-chart-label__period"> 24h</span>
            </div>
            <OHLCVChart candles={candles} isLoading={chartLoading} />
            <ChartControls
              timeframe={timeframe}
              onTimeframe={setTimeframe}
              isLoading={chartLoading}
            />
          </div>

          {/* Stats */}
          <section className="td-section">
            <h2 className="td-section__title">Stats</h2>
            <div className="td-stats-grid">
              {[
                { label: "Market Cap", value: fmtCompact(mcap) },
                { label: "Liquidity", value: fmtCompact(liquidity) },
                { label: "24H Volume", value: fmtCompact(volume) },
                {
                  label: "Supply",
                  value: supply ? `${(supply / 1e6).toFixed(2)}M` : "—",
                },
                { label: "Price", value: fmtPrice(price) },
                {
                  label: "24H Change",
                  value: fmtPct(change24h),
                  colored: true,
                  val: change24h,
                },
                { label: "FDV", value: fmtCompact(fdv) },
                {
                  label: "Total Supply",
                  value: totalSupply
                    ? `${(totalSupply / 1e6).toFixed(2)}M`
                    : "—",
                },
              ].map(({ label, value, colored, val }) => (
                <div key={label} className="td-stat-cell">
                  <span className="td-stat-cell__label">{label}</span>
                  <span
                    className={`td-stat-cell__value ${colored ? (val != null && val >= 0 ? "td-stat-cell__value--up" : "td-stat-cell__value--dn") : ""}`}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {risk && (
            <SecuritySection
              risk={risk}
              liquidity={liquidity}
              volume={volume}
              holders={null}
            />
          )}

          {variants.length > 0 && (
            <VariantsSection
              assetName={data.name}
              assetId={assetId}
              variants={variants}
            />
          )}
        </div>

        {/* Sidebar */}
        <aside className="td-sidebar ">
          {/* Connected wallet pill lives in the tab bar */}
          <div className="h-[65px] py-1.5">
            {isConnected && (
              <ConnectedPill onDisconnect={() => connector.disconnect()} />
            )}
          </div>

          <div>
            <SpotSwap
              outputMint={currentMint ?? ""} // the token's primary mint address
              outputSymbol={data.symbol} // e.g. "SOL", "BONK"
              outputName={data.name} // e.g. "Bonk"
              outputLogo={data.imageUrl ?? undefined} // token logo from your existing data
            />
          </div>

          {isStable && (
            <div className="mt-6">
              <EarnVault mint={currentMint} symbol={data.symbol} />
            </div>
          )}

          {isNativeSOL && <NativeStakeCard />}

          {description && (
            <ExpandableDescription
              text={description}
              tokenName={data.name}
              maxChars={220}
            />
          )}

          {(website || twitter || reddit) && (
            <div className="td-card">
              <h3 className="td-card__title">Official links</h3>
              <div className="td-links">
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="td-link"
                  >
                    Website
                  </a>
                )}
                {reddit && (
                  <a
                    href={`https://reddit.com/r/${reddit}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="td-link"
                  >
                    Reddit
                  </a>
                )}
                {twitter && (
                  <a
                    href={`https://x.com/${twitter}`}
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
