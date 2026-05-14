"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { OHLCVCandle, OHLCVTimeframe } from "@/hooks/useOHLCV";
import { fmtPrice } from "@/components/TokenCard";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChartType = "line" | "candlestick";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtVolTooltip(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtTooltipPrice(n: number): string {
  return fmtPrice(n);
}

// ─── Chart Type Toggle ────────────────────────────────────────────────────────

export function ChartTypeToggle({
  chartType,
  onChange,
}: {
  chartType: ChartType;
  onChange: (t: ChartType) => void;
}) {
  return (
    <div className="td-chart-type-toggle">
      <button
        className={`td-chart-type-btn ${chartType === "line" ? "td-chart-type-btn--active" : ""}`}
        onClick={() => onChange("line")}
        aria-pressed={chartType === "line"}
        title="Line chart"
      >
        {/* Line icon */}
        <svg viewBox="0 0 14 14" fill="none" width="13" height="13" aria-hidden>
          <polyline
            points="1,10 4,6 7,8 10,3 13,5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Line
      </button>
      <button
        className={`td-chart-type-btn ${chartType === "candlestick" ? "td-chart-type-btn--active" : ""}`}
        onClick={() => onChange("candlestick")}
        aria-pressed={chartType === "candlestick"}
        title="Candlestick chart"
      >
        {/* Candle icon */}
        <svg viewBox="0 0 14 14" fill="none" width="13" height="13" aria-hidden>
          <line x1="4" y1="1" x2="4" y2="3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="2.5" y="3" width="3" height="5" rx="0.5" fill="currentColor" />
          <line x1="4" y1="8" x2="4" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="10" y1="3" x2="10" y2="5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="8.5" y="5" width="3" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
          <line x1="10" y1="9" x2="10" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        Candles
      </button>
    </div>
  );
}

// ─── Tooltip state ────────────────────────────────────────────────────────────

interface TooltipState {
  x: number;
  y: number;
  candle: OHLCVCandle;
  visible: boolean;
}

// ─── Main chart ───────────────────────────────────────────────────────────────

const W = 800;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 32, left: 56 };

export function OHLCVChart({
  candles,
  isLoading,
  chartType = "line",
}: {
  candles: OHLCVCandle[];
  isLoading: boolean;
  chartType?: ChartType;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [animated, setAnimated] = useState(false);

  // Reset + trigger animation whenever data or chart type changes
  useEffect(() => {
    setAnimated(false);
    if (!isLoading && candles.length > 1) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimated(true));
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isLoading, candles.length, chartType]);

  // ── Derived geometry ───────────────────────────────────────────────────────
  const derived = useMemo(() => {
    const clean = (candles ?? []).filter(
      (c) =>
        c &&
        typeof c.close === "number" &&
        isFinite(c.close) &&
        typeof c.open === "number" &&
        isFinite(c.open),
    );
    if (clean.length < 2) return null;

    const iW = W - PAD.left - PAD.right;
    const iH = H - PAD.top - PAD.bottom;

    // Use high/low for Y range so candles fit properly
    const allHighs = clean.map((c) => c.high);
    const allLows = clean.map((c) => c.low);
    const minVal = Math.min(...allLows);
    const maxVal = Math.max(...allHighs);
    // Add 5% padding so wicks don't clip at the edges
    const padding = (maxVal - minVal) * 0.05 || 1;
    const lo = minVal - padding;
    const hi = maxVal + padding;
    const range = hi - lo;

    const xOf = (i: number) => PAD.left + (i / (clean.length - 1)) * iW;
    const yOf = (v: number) => PAD.top + (1 - (v - lo) / range) * iH;

    // ── Line chart geometry ──
    const pts = clean.map((c, i) => [xOf(i), yOf(c.close)] as [number, number]);
    const linePath = pts
      .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ");
    const last = pts[pts.length - 1];
    const areaPath = `${linePath} L ${last[0].toFixed(1)},${(H - PAD.bottom).toFixed(1)} L ${PAD.left},${(H - PAD.bottom).toFixed(1)} Z`;

    // ── Candle geometry ──
    // Body width: fill ~70% of the per-candle slot, min 2px, max 14px
    const slotW = iW / clean.length;
    const bodyW = Math.max(2, Math.min(14, slotW * 0.7));

    // ── Axis labels ──
    const steps = 4;
    const yLabels = Array.from({ length: steps + 1 }, (_, i) => ({
      y: PAD.top + (1 - i / steps) * iH,
      label: fmtTooltipPrice(lo + (hi - lo) * (i / steps)),
    }));

    const xCount = Math.min(6, clean.length);
    const xLabels = Array.from({ length: xCount }, (_, i) => {
      const idx = Math.round((i / (xCount - 1)) * (clean.length - 1));
      return {
        x: xOf(idx),
        label: new Date(clean[idx].time).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      };
    });

    const positive = clean[clean.length - 1].close >= clean[0].close;
    const pulsePt: [number, number] = [xOf(clean.length - 1), yOf(clean[clean.length - 1].close)];

    return { clean, linePath, areaPath, yLabels, xLabels, positive, pulsePt, pts, xOf, yOf, bodyW, iW };
  }, [candles]);

  // ── Pointer interaction ────────────────────────────────────────────────────
  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!derived || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = W / rect.width;
    const rawX = (e.clientX - rect.left) * scaleX;
    const clampedX = Math.max(PAD.left, Math.min(W - PAD.right, rawX));
    const ratio = (clampedX - PAD.left) / derived.iW;
    const idx = Math.round(ratio * (derived.clean.length - 1));
    const candle = derived.clean[Math.max(0, Math.min(idx, derived.clean.length - 1))];
    const px = derived.pts[Math.max(0, Math.min(idx, derived.pts.length - 1))];
    setTooltip({ x: px[0], y: derived.yOf(candle.close), candle, visible: true });
  }

  function handlePointerLeave() {
    setTooltip(null);
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="td-chart td-chart--loading">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="td-chart__svg"
          aria-hidden
        >
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

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!derived) {
    return (
      <div className="td-chart td-chart--empty">
        <svg viewBox="0 0 48 48" fill="none" width="40" height="40" className="td-chart__empty-icon">
          <rect x="4"  y="28" width="8"  height="14" rx="2" fill="var(--tc-border-hover)" />
          <rect x="16" y="18" width="8"  height="24" rx="2" fill="var(--tc-border-hover)" />
          <rect x="28" y="8"  width="8"  height="34" rx="2" fill="var(--tc-border-hover)" />
          <rect x="40" y="22" width="8"  height="20" rx="2" fill="var(--tc-border-hover)" />
          <path d="M6 10l10-6 10 8 10-8 10 6" stroke="var(--tc-border-hover)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="td-chart__empty-text">No price data available</span>
        <span className="td-chart__empty-pulse" aria-hidden />
      </div>
    );
  }

  const { linePath, areaPath, yLabels, xLabels, positive, pulsePt, clean, xOf, yOf, bodyW } = derived;
  const accentColor = positive ? "var(--tc-accent-up)" : "var(--tc-accent-down)";

  // Tooltip box sizing
  const ttW = chartType === "candlestick" ? 158 : 140;
  const ttH = chartType === "candlestick" ? 82 : 60;
  const ttX = tooltip
    ? Math.min(Math.max(tooltip.x - ttW / 2, PAD.left), W - PAD.right - ttW)
    : 0;
  const ttY = tooltip
    ? tooltip.y < H / 2
      ? tooltip.y + 16
      : tooltip.y - ttH - 8
    : 0;

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
            <stop offset="0%"   stopColor={accentColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
          {/* Clip path animates width for the draw-in effect */}
          <clipPath id="chartClip">
            <rect
              x={PAD.left}
              y={animated ? PAD.top - 4 : H - PAD.bottom}
              width={animated ? W - PAD.left - PAD.right : 0}
              height={animated ? H - PAD.top - PAD.bottom + 8 : 0}
              style={{
                transition: animated ? "all 1400ms cubic-bezier(0.22,1,0.36,1)" : "none",
              }}
            />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {yLabels.map(({ y }) => (
          <line
            key={y}
            x1={PAD.left} y1={y}
            x2={W - PAD.right} y2={y}
            stroke="var(--tc-divider)"
            strokeWidth="1"
          />
        ))}

        {/* ── LINE chart ───────────────────────────────────────────────── */}
        {chartType === "line" && (
          <g clipPath="url(#chartClip)">
            <path d={areaPath} fill="url(#chartGrad)" />
            <path
              d={linePath}
              fill="none"
              stroke={accentColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* ── CANDLESTICK chart ─────────────────────────────────────────── */}
        {chartType === "candlestick" && (
          <g clipPath="url(#chartClip)">
            {clean.map((c, i) => {
              const x = xOf(i);
              const isUp = c.close >= c.open;
              const col = isUp ? "var(--tc-accent-up)" : "var(--tc-accent-down)";
              const yH = yOf(c.high);
              const yL = yOf(c.low);
              const yBodyTop = Math.min(yOf(c.open), yOf(c.close));
              const bodyH = Math.max(1, Math.abs(yOf(c.close) - yOf(c.open)));

              return (
                <g key={i}>
                  {/* Wick */}
                  <line
                    x1={x} y1={yH}
                    x2={x} y2={yL}
                    stroke={col}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  {/* Body */}
                  <rect
                    x={x - bodyW / 2}
                    y={yBodyTop}
                    width={bodyW}
                    height={bodyH}
                    fill={isUp ? col : col}
                    fillOpacity={isUp ? 1 : 0.85}
                    rx="1"
                  />
                </g>
              );
            })}
          </g>
        )}

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

        {/* Pulse dot at last candle — line mode only, hidden when tooltip active */}
        {chartType === "line" && animated && !tooltip && (
          <g>
            <circle
              cx={pulsePt[0]} cy={pulsePt[1]}
              r="8"
              fill={accentColor}
              opacity="0"
              className="td-chart__pulse-ring"
            />
            <circle
              cx={pulsePt[0]} cy={pulsePt[1]}
              r="4"
              fill={accentColor}
              className="td-chart__pulse-dot"
            />
          </g>
        )}

        {/* Crosshair + tooltip */}
        {tooltip?.visible && (
          <g>
            {/* Vertical crosshair line */}
            <line
              x1={tooltip.x} y1={PAD.top}
              x2={tooltip.x} y2={H - PAD.bottom}
              stroke="var(--tc-text-muted)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            {/* Dot on close price */}
            <circle
              cx={tooltip.x} cy={tooltip.y}
              r="4"
              fill={accentColor}
              stroke="var(--tc-bg)"
              strokeWidth="2"
            />

            {/* Tooltip box */}
            <rect
              x={ttX} y={ttY}
              width={ttW} height={ttH}
              rx="6"
              fill="var(--tc-tooltip-bg)"
              stroke="var(--tc-tooltip-border)"
              strokeWidth="1"
            />
            {/* Date */}
            <text x={ttX + 10} y={ttY + 16} fontSize="9" fill="var(--tc-text-muted)" fontFamily="var(--tc-font-sans)">
              {new Date(tooltip.candle.time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </text>

            {chartType === "candlestick" ? (
              <>
                {/* O / H / L / C rows */}
                {(["Open", "High", "Low", "Close"] as const).map((label, i) => {
                  const key = label.toLowerCase() as "open" | "high" | "low" | "close";
                  const val = tooltip.candle[key];
                  const isClose = key === "close";
                  return (
                    <g key={label}>
                      <text
                        x={ttX + 10} y={ttY + 30 + i * 14}
                        fontSize="9" fill="var(--tc-text-muted)"
                        fontFamily="var(--tc-font-sans)"
                      >
                        {label}
                      </text>
                      <text
                        x={ttX + ttW - 10} y={ttY + 30 + i * 14}
                        fontSize={isClose ? 11 : 10}
                        fontWeight={isClose ? "600" : "400"}
                        fill={isClose ? accentColor : "var(--tc-text-primary)"}
                        fontFamily="var(--tc-font-mono)"
                        textAnchor="end"
                      >
                        {fmtTooltipPrice(val)}
                      </text>
                    </g>
                  );
                })}
              </>
            ) : (
              <>
                <text x={ttX + 10}       y={ttY + 32} fontSize="9"  fill="var(--tc-text-muted)"    fontFamily="var(--tc-font-sans)">Price</text>
                <text x={ttX + ttW - 10} y={ttY + 32} fontSize="11" fontWeight="600" fill="var(--tc-text-primary)" fontFamily="var(--tc-font-mono)" textAnchor="end">
                  {fmtTooltipPrice(tooltip.candle.close)}
                </text>
                <text x={ttX + 10}       y={ttY + 50} fontSize="9"  fill="var(--tc-text-muted)"    fontFamily="var(--tc-font-sans)">Volume</text>
                <text x={ttX + ttW - 10} y={ttY + 50} fontSize="11" fontWeight="600" fill={accentColor} fontFamily="var(--tc-font-mono)" textAnchor="end">
                  {fmtVolTooltip(tooltip.candle.volume)}
                </text>
              </>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── Chart controls (timeframe + chart-type toggle) ───────────────────────────

const TIMEFRAMES: OHLCVTimeframe[] = ["24H", "7D", "30D", "90D", "1Y"];

export function ChartControls({
  timeframe,
  onTimeframe,
  isLoading,
  chartType,
  onChartType,
}: {
  timeframe: OHLCVTimeframe;
  onTimeframe: (t: OHLCVTimeframe) => void;
  isLoading: boolean;
  chartType: ChartType;
  onChartType: (t: ChartType) => void;
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
            {isLoading && timeframe === t && (
              <span className="td-ctrl-btn__spinner" aria-hidden />
            )}
          </button>
        ))}
      </div>

      {/* Chart type toggle lives on the right of the controls bar */}
      <ChartTypeToggle chartType={chartType} onChange={onChartType} />
    </div>
  );
}