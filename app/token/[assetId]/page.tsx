"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { tokenRequest } from "@/lib/token";
import { useOHLCV, OHLCVInterval, OHLCVTimeframe } from "@/hooks/useOHLCV";
import {
  TokenAvatar,
  TrustBadge,
  ChangeChip,
  fmtPrice,
  fmtCompact,
} from "@/components/TokenCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { AssetRisk } from "@/types";
import { useTokens } from "@/hooks/useToken";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

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

  const { path, areaPath, yLabels, xLabels, minVal, maxVal } = useMemo(() => {
    if (!candles.length)
      return {
        path: "",
        areaPath: "",
        yLabels: [],
        xLabels: [],
        minVal: 0,
        maxVal: 0,
      };

    const closes = candles.map((c) => c.close);
    const minVal = Math.min(...closes);
    const maxVal = Math.max(...closes);
    const range = maxVal - minVal || 1;

    const iW = W - PAD.left - PAD.right;
    const iH = H - PAD.top - PAD.bottom;

    const pts = closes.map((v, i) => {
      const x = PAD.left + (i / (closes.length - 1)) * iW;
      const y = PAD.top + (1 - (v - minVal) / range) * iH;
      return [x, y] as [number, number];
    });

    const path = pts
      .map(
        ([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`,
      )
      .join(" ");
    const areaPath = `${path} L ${pts[pts.length - 1][0].toFixed(1)},${(H - PAD.bottom).toFixed(1)} L ${PAD.left},${(H - PAD.bottom).toFixed(1)} Z`;

    // Y axis labels
    const steps = 4;
    const yLabels = Array.from({ length: steps + 1 }, (_, i) => {
      const v = minVal + (maxVal - minVal) * (i / steps);
      const y = PAD.top + (1 - i / steps) * (H - PAD.top - PAD.bottom);
      return { y, label: fmtPrice(v) };
    });

    // X axis labels (evenly spaced, up to 6)
    const xCount = Math.min(6, candles.length);
    const xLabels = Array.from({ length: xCount }, (_, i) => {
      const idx = Math.round((i / (xCount - 1)) * (candles.length - 1));
      const c = candles[idx];
      const x = PAD.left + (idx / (candles.length - 1)) * iW;
      const d = new Date(c.time);
      const label = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return { x, label };
    });

    return { path, areaPath, yLabels, xLabels, minVal, maxVal };
  }, [candles]);

  const positive =
    candles.length >= 2 &&
    candles[candles.length - 1].close >= candles[0].close;
  const lineColor = positive ? "var(--tc-accent-up)" : "var(--tc-accent-down)";

  if (isLoading) {
    return (
      <div className="td-chart td-chart--loading">
        <div className="td-chart__shimmer" />
      </div>
    );
  }

  if (!candles.length) {
    return (
      <div className="td-chart td-chart--empty">
        <span>No chart data available</span>
      </div>
    );
  }

  return (
    <div className="td-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="td-chart__svg"
        aria-label="Price chart"
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
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

        {/* Area fill */}
        <path d={areaPath} fill="url(#chartGrad)" />

        {/* Price line */}
        <path
          d={path}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Y labels */}
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

        {/* X labels */}
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

// ─── Timeframe/Interval controls ──────────────────────────────────────────────

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

// ─── Security score gauge ─────────────────────────────────────────────────────

function SecurityGauge({
  score,
  grade,
  label,
}: {
  score: number;
  grade: string;
  label: string;
}) {
  const pct = score / 100;
  const r = 52;
  const cx = 70;
  const cy = 70;
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const totalArc = endAngle - startAngle;
  const filled = startAngle + pct * totalArc;

  const toXY = (angle: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  const start = toXY(startAngle);
  const end = toXY(endAngle);
  const filledEnd = toXY(filled);
  const largeArc = pct > 0.5 ? 1 : 0;

  const trackPath = `M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${end.x} ${end.y}`;
  const fillPath = `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${filledEnd.x} ${filledEnd.y}`;

  const color =
    score >= 80
      ? "var(--tc-accent-up)"
      : score >= 60
        ? "#f59e0b"
        : "var(--tc-accent-down)";

  return (
    <div className="td-gauge">
      <svg viewBox="0 0 140 80" className="td-gauge__svg">
        <path
          d={trackPath}
          fill="none"
          stroke="var(--tc-divider)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={fillPath}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
        />
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fontSize="22"
          fontWeight="500"
          fill="var(--tc-text-primary)"
          fontFamily="var(--tc-font-mono)"
        >
          {score}
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          fontSize="10"
          fill="var(--tc-text-muted)"
          fontFamily="var(--tc-font-sans)"
        >
          Grade {grade}
        </text>
      </svg>
      <span className="td-gauge__label">{label}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

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
  trustTier: string | null;
  description: string | null;
  website: string | null;
  twitter: string | null;
}

export default function TokenDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = use(params);
  const router = useRouter();

  const [pageData, setPageData] = useState<TokenPageData | null>(null);
  const [risk, setRisk] = useState<AssetRisk | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const { tokens } = useTokens();
  const {
    candles,
    isLoading: chartLoading,
    timeframe,
    interval,
    setTimeframe,
    setInterval,
  } = useOHLCV(assetId);

  useEffect(() => {
    async function load() {
      setIsLoadingPage(true);
      try {
        const raw = await tokenRequest.getAsset(assetId, true);
        const data = tokens.find((t) => t.assetId === assetId);
        // The full asset response with profile/risk/markets
        const r = raw;
        const market = r?.includes?.markets?.data?.markets[0] ?? null;
        const profile = r?.includes?.profile?.data ?? null;
        const riskData = r?.includes?.risk?.data ?? null;

        setPageData({
          name: r?.asset?.name ?? null,
          symbol: r?.asset?.symbol ?? null,
          category: r?.asset?.category ?? "",
          imageUrl: data?.imageUrl ?? null,
          price: profile?.price ?? null,
          change24h: profile?.priceChange24h ?? null,
          change1h: data?.stats?.priceChange1hPercent ?? null,
          volume: market?.volume24h ?? null,
          liquidity: market?.liquidity ?? null,
          mcap: profile?.marketCap ?? null,
          fdv: profile?.fdv ?? null,
          supply: profile?.totalSupply ?? null,
          trustTier: data?.primaryVariant?.trustTier ?? null,
          description: profile?.description ?? null,
          website: profile?.links.website ?? null,
          twitter: profile?.links.twitter ?? null,
        });

        if (riskData) setRisk(riskData);
      } catch (e) {
        console.error("Failed to load token detail", e);
      } finally {
        setIsLoadingPage(false);
      }
    }
    load();
  }, [assetId, tokens]);

  if (isLoadingPage) {
    return (
      <div className="td-page">
        <div className="td-topbar">
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
          <ThemeToggle />
        </div>
        <div className="td-loading">
          <div className="td-loading__spinner" />
          <span>Loading token data…</span>
        </div>
      </div>
    );
  }

  const d = pageData;
  const positive = (d?.change24h ?? 0) >= 0;

  return (
    <div className="td-page">
      {/* Top nav */}
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
          <span className="td-topbar__breadcrumb">/ {d?.name ?? assetId}</span>
        </div>
        <ThemeToggle />
      </div>

      <div className="td-layout">
        {/* ── Left / main column ── */}
        <div className="td-main">
          {/* Token header */}
          <div className="td-header">
            <TokenAvatar
              src={d?.imageUrl ?? null}
              name={d?.name ?? assetId}
              size={56}
            />
            <div className="td-header__info">
              <div className="td-header__row">
                <h1 className="td-header__name">{d?.name ?? assetId}</h1>
                <TrustBadge tier={d?.trustTier ?? null} />
              </div>
              <div className="td-header__meta">
                <span className="td-header__symbol">${d?.symbol}</span>
                {d?.category && (
                  <span className="td-header__cat">{d.category}</span>
                )}
              </div>
            </div>
            <div className="td-header__price-block">
              <div className="td-header__price">{fmtPrice(d?.price)}</div>
              <ChangeChip value={d?.change24h} />
            </div>
          </div>

          {/* Chart */}
          <div className="td-chart-section">
            <OHLCVChart candles={candles} isLoading={chartLoading} />
            <ChartControls
              timeframe={timeframe}
              interval={interval}
              onTimeframe={setTimeframe}
              onInterval={setInterval}
            />
          </div>

          {/* Stats grid */}
          <section className="td-section">
            <h2 className="td-section__title">Stats</h2>
            <div className="td-stats-grid">
              {[
                { label: "Market Cap", value: fmtCompact(d?.mcap) },
                { label: "Liquidity", value: fmtCompact(d?.liquidity) },
                { label: "24H Volume", value: fmtCompact(d?.volume) },
                {
                  label: "Supply",
                  value: d?.supply ? `${(d.supply / 1e6).toFixed(2)}M` : "—",
                },
                { label: "Price", value: fmtPrice(d?.price) },
                {
                  label: "24H Change",
                  value: fmtPct(d?.change24h),
                  colored: true,
                  val: d?.change24h,
                },
                { label: "FDV", value: fmtCompact(d?.fdv) },
                {
                  label: "1H Change",
                  value: fmtPct(d?.change1h),
                  colored: true,
                  val: d?.change1h,
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
        </div>

        {/* ── Right sidebar ── */}
        <aside className="td-sidebar">
          {/* About */}
          {d?.description && (
            <div className="td-card">
              <h3 className="td-card__title">About {d.name}</h3>
              <p className="td-card__desc">{d.description}</p>
            </div>
          )}

          {/* Security */}
          {risk && (
            <div className="td-card">
              <h3 className="td-card__title">Security</h3>
              <SecurityGauge
                score={risk.marketScore.score}
                grade={risk.marketScore.grade}
                label={risk.marketScore.label}
              />
              <div className="td-security-rows">
                {[
                  { label: "Liquidity", value: fmtCompact(d?.liquidity) },
                  { label: "Trading", value: fmtCompact(d?.volume) },
                ].map(({ label, value }) => (
                  <div key={label} className="td-security-row">
                    <span className="td-security-row__label">{label}</span>
                    <span className="td-security-row__value">{value}</span>
                    <svg
                      viewBox="0 0 12 12"
                      fill="none"
                      width="12"
                      height="12"
                      className="td-security-row__check"
                    >
                      <circle
                        cx="6"
                        cy="6"
                        r="5.5"
                        stroke="var(--tc-accent-up)"
                        strokeWidth="1"
                      />
                      <path
                        d="M3.5 6l2 2 3-3"
                        stroke="var(--tc-accent-up)"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {(d?.website || d?.twitter) && (
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
                    <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
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
                    Website
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
                      width="13"
                      height="13"
                    >
                      <path d="M12.6 2h2.2L9.9 7.3 15.6 14h-4.3l-3.5-4.5L3.7 14H1.5l5.3-5.7L1 2h4.4l3.2 4.1L12.6 2zm-.8 10.8h1.2L4.3 3.2H3l8.8 11.6z" />
                    </svg>
                    X / Twitter
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
