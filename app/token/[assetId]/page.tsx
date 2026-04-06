"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useOHLCV,
  type OHLCVInterval,
  type OHLCVTimeframe,
} from "@/hooks/useOHLCV";
import {
  TokenAvatar,
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
import type { TokenAssetResponse, RawVariant } from "@/types/token.types";
import { tokenRequest } from "@/lib/token";
import { AssetsResolveResponse } from "@/types";

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

// ─── Build VariantRow from a RawVariant ───────────────────────────────────────

function buildVariantRow(
  v: RawVariant,
  assetName?: string | null,
  assetSymbol?: string | null,
): VariantRow | null {
  if (!v || typeof v !== "object") return null;
  const mint = safe(v.mint);
  if (!mint) return null;

  return {
    name: safe(v.label ?? assetName),
    symbol: safe(assetSymbol),
    mint,
    trustTier: safe(v.trustTier ?? "unknown"),
    price: null, // RawVariant has no market data — variants endpoint is lightweight
    liquidity: null,
    volume24h: null,
    kind: safe(v.kind ?? "spot"),
    tags: Array.isArray(v.tags) ? v.tags : [],
    issuer: safe(v.issuer),
    logoURI: null,
  };
}

// ─── Flatten variantGroups into a single VariantRow[] ────────────────────────

function flattenVariantGroups(data: TokenAssetResponse): VariantRow[] {
  const { variantGroups, name, symbol } = data;
  const rows: VariantRow[] = [];

  const allVariants = [
    ...variantGroups.spot,
    ...variantGroups.yield,
    ...variantGroups.etf,
    ...variantGroups.leveraged,
  ];

  for (const v of allVariants) {
    const row = buildVariantRow(v, name, symbol);
    if (row) rows.push(row);
  }

  return rows;
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
            <div
              className="td-skel td-skel--line"
              style={{ width: 100, height: 36, borderRadius: 20 }}
            />
          </div>
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TokenDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = use(params);
  const router = useRouter();

  const [data, setData] = useState<TokenAssetResponse | null>(null);
  const [other, setOther] = useState<AssetsResolveResponse | null>(null);
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
    setIsLoadingPage(true);
    setData(null);
    setVariants([]);

    let cancelled = false;

    async function load() {
      try {
        const [res, otherData] = await Promise.all([
          fetch(`/api/getToken?assetId=${assetId}`),
          tokenRequest.getAsset(assetId, true),
        ]);

        if (!res.ok) throw new Error(`Token API error: ${res.status}`);
        const json: TokenAssetResponse = await res.json();
        if (cancelled) return;
        console.log("Loaded token data:", { json, otherData });
        setOther(otherData);
        setData(json);
        setVariants(flattenVariantGroups(json));
      } catch (e) {
        console.error("[TokenDetailPage] Failed to load:", e);
      } finally {
        if (!cancelled) setIsLoadingPage(false);
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

  const profile = other?.includes.profile?.data;

  const risk = other?.includes.risk?.data;

  const price = profile?.price ?? data.stats.price ?? null;
  const change24h =
    profile?.priceChange24h ?? data.stats.priceChange24hPercent ?? null;
  const change1h = data.stats.priceChange1hPercent ?? null;
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

  const currentMint = data.primaryVariant?.mint ?? null;
  const mintDisplay = currentMint
    ? `${currentMint.slice(0, 4)}…${currentMint.slice(-4)}`
    : null;

  const imageUrl = data.imageUrl ?? null;

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
            <span className="td-breadcrumb__item">{data.name}</span>
            {data.symbol && (
              <>
                <span className="td-breadcrumb__sep">›</span>
                <span className="td-breadcrumb__item td-breadcrumb__item--mint">
                  ${data.symbol}
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
            <TokenAvatar src={imageUrl} name={data.name} size={52} />
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
                {data.symbol && (
                  <span className="td-pill td-pill--sym">${data.symbol}</span>
                )}
                {variants.length > 0 && (
                  <VariantPicker
                    variants={variants}
                    assetId={assetId}
                    currentMint={currentMint ?? undefined}
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

          {data.markets.length > 0 && (
            <MarketsSection markets={data.markets} total={data.marketsTotal} />
          )}

          {risk && (
            <SecuritySection
              risk={risk}
              liquidity={liquidity}
              volume={volume}
              holders={null}
            />
          )}

          {variants.length > 0 && (
            <VariantsSection assetName={data.name} variants={variants} />
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="td-sidebar">
          <BuyButton tokenName={data.name} tokenSymbol={data.symbol} />

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
