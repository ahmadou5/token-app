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
import type { AssetRisk, AssetMarket, AssetProfile } from "@/types";
import { useTokens } from "@/hooks/useToken";

function fmtPct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
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

  const { path, areaPath, yLabels, xLabels } = useMemo(() => {
    if (!candles.length)
      return { path: "", areaPath: "", yLabels: [], xLabels: [] };
    const closes = candles.map((c) => c.close);
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
    const xCount = Math.min(6, candles.length);
    const xLabels = Array.from({ length: xCount }, (_, i) => {
      const idx = Math.round((i / (xCount - 1)) * (candles.length - 1));
      return {
        x: PAD.left + (idx / (candles.length - 1)) * iW,
        label: new Date(candles[idx].time).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      };
    });
    return { path, areaPath, yLabels, xLabels };
  }, [candles]);

  const positive =
    candles.length >= 2 &&
    candles[candles.length - 1].close >= candles[0].close;
  const lineColor = positive ? "var(--tc-accent-up)" : "var(--tc-accent-down)";

  if (isLoading)
    return (
      <div className="td-chart td-chart--loading">
        <div className="td-chart__shimmer" />
      </div>
    );
  if (!candles.length)
    return (
      <div className="td-chart td-chart--empty">
        <span>No chart data available</span>
      </div>
    );

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
  holders: number | null;
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
    async function load() {
      setIsLoadingPage(true);
      try {
        const raw = await tokenRequest.getAsset(assetId, true);
        const curatedMatch = tokens.find((t) => t.assetId === assetId);
        const market0 = raw?.includes?.markets?.data?.markets[0] ?? null;
        const profile: AssetProfile | null =
          raw?.includes?.profile?.data ?? null;
        const riskData: AssetRisk | null = raw?.includes?.risk?.data ?? null;
        const marketsData: AssetMarket[] =
          raw?.includes?.markets?.data?.markets ?? [];

        setPageData({
          name: raw?.asset?.name ?? null,
          symbol: raw?.asset?.symbol ?? null,
          category: raw?.asset?.category ?? "",
          imageUrl: market0?.base?.icon ?? curatedMatch?.imageUrl ?? null,
          price: profile?.price ?? null,
          change24h: profile?.priceChange24h ?? null,
          change1h: curatedMatch?.stats?.priceChange1hPercent ?? null,
          volume: market0?.volume24h ?? profile?.volume24h ?? null,
          liquidity: market0?.liquidity ?? null,
          mcap: profile?.marketCap ?? null,
          fdv: profile?.fdv ?? null,
          supply: profile?.totalSupply ?? null,
          holders: null,
          trustTier: curatedMatch?.primaryVariant?.trustTier ?? null,
          description: profile?.description ?? null,
          website: profile?.links?.website ?? null,
          twitter: profile?.links?.twitter ?? null,
        });

        if (riskData) setRisk(riskData);
        setMarkets(marketsData);
        setMarketsTotal(
          raw?.includes?.markets?.data?.total ?? marketsData.length,
        );

        const variantRows: VariantRow[] = [];
        if (curatedMatch?.primaryVariant) {
          const pv = curatedMatch.primaryVariant;
          variantRows.push({
            name: pv.name ?? pv.label ?? raw?.asset?.name ?? "",
            symbol: pv.symbol ?? raw?.asset?.symbol ?? "",
            mint: pv.mint,
            trustTier: pv.trustTier,
            price: pv.market?.price ?? null,
            liquidity: pv.market?.liquidity ?? null,
            volume24h: pv.market?.volume24hUSD ?? null,
            kind: pv.kind ?? "spot",
            tags: pv.tags ?? [],
            issuer: pv.issuer,
            logoURI: pv.market?.logoURI ?? null,
          });
        }
        setVariants(variantRows);
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

  return (
    <div className="td-page">
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
        <div className="td-main">
          {/* Header */}
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

          {/* Stats */}
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

          {markets.length > 0 && (
            <MarketsSection markets={markets} total={marketsTotal} />
          )}
          {risk && (
            <SecuritySection
              risk={risk}
              liquidity={d?.liquidity}
              volume={d?.volume}
              holders={d?.holders}
            />
          )}
          {variants.length > 0 && (
            <VariantsSection assetName={d?.name} variants={variants} />
          )}
        </div>

        {/* Sidebar */}
        <aside className="td-sidebar">
          {d?.description && (
            <div className="td-card">
              <h3 className="td-card__title">About {d.name}</h3>
              <p className="td-card__desc">{d.description}</p>
            </div>
          )}
          {risk && (
            <div className="td-card">
              <h3 className="td-card__title">Security score</h3>
              <div className="td-sidebar-score">
                <span className="td-sidebar-score__num">
                  {risk.marketScore.score}
                </span>
                <span className="td-sidebar-score__max">/100</span>
                <span className="td-sidebar-score__grade">
                  Grade {risk.marketScore.grade}
                </span>
              </div>
              <p className="td-sidebar-score__label">
                {risk.marketScore.label}
              </p>
            </div>
          )}
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
