"use client";

import type { AssetRisk } from "@/types/token.types";
import { fmtCompact } from "@/components/TokenCard";

function LabelIcon({ tone, color }: { tone: string; color: string }) {
  if (tone === "safe") {
    return (
      <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
        <circle cx="7" cy="7" r="6" stroke={color} strokeWidth="1.2" />
        <path
          d="M4 7l2 2 4-4"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 14 14" fill="currentColor" width="12" height="12">
      <path d="M7 1L13.928 13H0.072L7 1z" fill={color} opacity="0.9" />
      <path
        d="M7 5.5v3M7 10v.5"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Gauge({
  score,
  grade,
  label,
  tone,
}: {
  score: number;
  grade: string;
  label: string;
  tone: "safe" | "warning" | "danger";
}) {
  const pct = Math.min(1, Math.max(0, score / 100));
  const r = 48;
  const cx = 72;
  const cy = 72;

  // Gauge sweeps from left (180°) to right (0°) over the top
  // We compute in standard math angles: 180° = left, 0° = right
  const toXY = (deg: number) => ({
    x: cx + r * Math.cos((deg * Math.PI) / 180),
    y: cy - r * Math.sin((deg * Math.PI) / 180), // subtract because SVG y is flipped
  });

  const start = toXY(180); // left endpoint
  const end = toXY(0); // right endpoint
  const fillEnd = toXY(pct * 180); // 0% = left (180°→0°), 100% = right (0°)

  // In SVG arc: sweep-flag=1 = clockwise
  // Our arc goes left → over the top → right = clockwise in SVG coords
  const largeArc = pct > 0.5 ? 1 : 0;

  const trackD = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 1 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;

  const fillD =
    pct <= 0
      ? null
      : pct >= 1
        ? trackD
        : `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x.toFixed(2)} ${fillEnd.y.toFixed(2)}`;

  const color =
    tone === "safe"
      ? "var(--tc-accent-up)"
      : tone === "warning"
        ? "#f59e0b"
        : "var(--tc-accent-down)";

  const labelBg =
    tone === "safe"
      ? "rgba(22,163,74,0.1)"
      : tone === "warning"
        ? "rgba(245,158,11,0.1)"
        : "rgba(220,38,38,0.1)";

  const trackColor =
    tone === "safe"
      ? "rgba(22,163,74,0.12)"
      : tone === "warning"
        ? "rgba(245,158,11,0.12)"
        : "rgba(220,38,38,0.12)";

  return (
    <div className="sec-gauge">
      <div className="sec-gauge__card">
        <svg viewBox="0 0 144 86" className="sec-gauge__svg">
          {/* Track (full semicircle) */}
          <path
            d={trackD}
            fill="none"
            stroke={trackColor}
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Fill */}
          {fillD && (
            <path
              d={fillD}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
            />
          )}
          {/* Score */}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fontSize="26"
            fontWeight="500"
            fill="var(--tc-text-primary)"
            fontFamily="var(--tc-font-mono)"
          >
            {score}
          </text>
          {/* /100 */}
          <text
            x={cx + 22}
            y={cy - 8}
            textAnchor="start"
            fontSize="12"
            fill="var(--tc-text-muted)"
            fontFamily="var(--tc-font-mono)"
          >
            /100
          </text>
          {/* Grade */}
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
        <div
          className="sec-gauge__label"
          style={{ color, background: labelBg }}
        >
          <LabelIcon tone={tone} color={color} />
          {label}
        </div>
      </div>
    </div>
  );
}

// ─── Status icon ──────────────────────────────────────────────────────────────

type RowStatus = "ok" | "warn" | "info" | "na";

function StatusIcon({ status }: { status: RowStatus }) {
  if (status === "ok")
    return (
      <span className="sec-status sec-status--ok">
        <svg viewBox="0 0 14 14" fill="none" width="13" height="13">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
          <path
            d="M4 7l2 2 4-4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  if (status === "warn")
    return (
      <span className="sec-status sec-status--warn">
        <svg viewBox="0 0 14 14" fill="none" width="13" height="13">
          <path
            d="M7 1.5L13.124 12.5H0.876L7 1.5z"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="currentColor"
            fillOpacity="0.15"
          />
          <path
            d="M7 5.5v2.5M7 9.5v.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  if (status === "info")
    return (
      <span className="sec-status sec-status--info">
        <svg viewBox="0 0 14 14" fill="none" width="13" height="13">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
          <path
            d="M7 6v4M7 4.5v.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  return <span className="sec-status sec-status--na">—</span>;
}

// ─── Metric row ───────────────────────────────────────────────────────────────

function MetricRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: RowStatus;
}) {
  return (
    <div className="sec-row">
      <span className="sec-row__label">{label}</span>
      <span className="sec-row__value">{value}</span>
      <StatusIcon status={status} />
    </div>
  );
}

// ─── Helpers to derive RowStatus from AssetRiskComponent ─────────────────────

function componentStatus(
  components: AssetRisk["marketScore"]["components"],
  key: string,
): RowStatus {
  const c = components?.[key];
  if (!c || !c.hasData) return "na";
  if (c.status === "good") return "ok";
  if (c.status === "warning") return "warn";
  return "info";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface SecuritySectionProps {
  risk: AssetRisk;
  liquidity?: number | null;
  volume?: number | null;
  holders?: number | null;
}

export function SecuritySection({
  risk,
  liquidity,
  volume,
  holders,
}: SecuritySectionProps) {
  const { score, grade, label, tone, components } = risk.marketScore;

  // Derive statuses — prefer component data from API, fall back to value thresholds
  const liqStatus: RowStatus =
    componentStatus(components, "liquidity") !== "na"
      ? componentStatus(components, "liquidity")
      : (liquidity ?? 0) > 500_000
        ? "ok"
        : "warn";

  const tradingStatus: RowStatus =
    componentStatus(components, "trading") !== "na"
      ? componentStatus(components, "trading")
      : (volume ?? 0) === 0
        ? "info"
        : (volume ?? 0) > 10_000
          ? "ok"
          : "warn";

  const distStatus: RowStatus =
    componentStatus(components, "distribution") !== "na"
      ? componentStatus(components, "distribution")
      : "ok";

  const holdersStatus: RowStatus =
    componentStatus(components, "holders") !== "na"
      ? componentStatus(components, "holders")
      : holders == null
        ? "na"
        : holders > 500
          ? "ok"
          : "warn";

  return (
    <section className="td-section">
      <h2 className="td-section__title">Security</h2>
      <div className="sec-card">
        <div className="sec-metrics">
          <MetricRow
            label="Liquidity"
            value={fmtCompact(liquidity)}
            status={liqStatus}
          />
          <MetricRow
            label="Distribution"
            value={
              components?.distribution?.score != null
                ? `${components.distribution.score}/100`
                : "—"
            }
            status={distStatus}
          />
          <MetricRow
            label="Trading"
            value={volume != null ? fmtCompact(volume) : "—"}
            status={tradingStatus}
          />
          <MetricRow
            label="Holders"
            value={holders != null ? holders.toLocaleString() : "—"}
            status={holdersStatus}
          />
          <button className="sec-details-btn">See all details</button>
        </div>
        <Gauge score={score} grade={grade} label={label} tone={tone} />
      </div>
    </section>
  );
}
