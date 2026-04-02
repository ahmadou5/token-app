"use client";

import type { AssetRisk } from "@/types";
import { fmtCompact } from "@/components/TokenCard";

// ─── Gauge ────────────────────────────────────────────────────────────────────

function Gauge({
  score,
  grade,
  label,
}: {
  score: number;
  grade: string;
  label: string;
}) {
  const pct = Math.min(1, Math.max(0, score / 100));
  const r = 54;
  const cx = 72;
  const cy = 72;

  // Arc from 180° to 360° (bottom half excluded, top semicircle)
  const toXY = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const start = toXY(180);
  const end = toXY(0); // 0 deg = right = 360 deg equivalent
  const fillAngle = 180 + pct * 180;
  const fillEnd = toXY(fillAngle);
  const largeArc = pct > 0.5 ? 1 : 0;

  const trackD = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 1 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  const fillD = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x.toFixed(2)} ${fillEnd.y.toFixed(2)}`;

  const color =
    score >= 80
      ? "var(--tc-accent-up)"
      : score >= 60
        ? "#f59e0b"
        : "var(--tc-accent-down)";

  const dotColor =
    score >= 80 ? "#dcfce7" : score >= 60 ? "#fef3c7" : "#fee2e2";

  return (
    <div className="sec-gauge">
      <svg viewBox="0 0 144 88" className="sec-gauge__svg">
        {/* Track */}
        <path
          d={trackD}
          fill="none"
          stroke="var(--tc-divider)"
          strokeWidth="11"
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={fillD}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
        />

        {/* Score text */}
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
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontSize="10"
          fill="var(--tc-text-muted)"
          fontFamily="var(--tc-font-sans)"
        >
          Grade {grade}
        </text>
      </svg>

      {/* Label pill */}
      <div className="sec-gauge__label" style={{ color, background: dotColor }}>
        <span className="sec-gauge__dot" style={{ background: color }} />
        {label}
      </div>
    </div>
  );
}

// ─── Metric row ───────────────────────────────────────────────────────────────

function MetricRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "ok" | "warn" | "na";
}) {
  return (
    <div className="sec-row">
      <span className="sec-row__label">{label}</span>
      <span className="sec-row__value">{value}</span>
      <span className={`sec-row__icon sec-row__icon--${status}`}>
        {status === "ok" && (
          <svg viewBox="0 0 14 14" fill="none" width="14" height="14">
            <circle
              cx="7"
              cy="7"
              r="6.5"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path
              d="M4 7l2.5 2.5 3.5-4"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {status === "warn" && (
          <svg viewBox="0 0 14 14" fill="none" width="14" height="14">
            <circle
              cx="7"
              cy="7"
              r="6.5"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path
              d="M7 4v4M7 9.5v.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        )}
        {status === "na" && <span className="sec-row__dash">—</span>}
      </span>
    </div>
  );
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
  const { score, grade, label, components } = risk.marketScore;

  const liqStatus = (liquidity ?? 0) > 1_000_000 ? "ok" : "warn";
  const tradingStatus = (volume ?? 0) > 100_000 ? "ok" : "warn";
  const holdersStatus = (holders ?? 0) > 1000 ? "ok" : holders ? "warn" : "na";
  const distStatus = components?.distribution?.hasData
    ? components.distribution.status === "good"
      ? "ok"
      : "warn"
    : "na";

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
          <MetricRow label="Distribution" value="—" status={distStatus} />
          <MetricRow
            label="Trading"
            value={fmtCompact(volume)}
            status={tradingStatus}
          />
          <MetricRow
            label="Holders"
            value={holders != null ? holders.toLocaleString() : "—"}
            status={holdersStatus}
          />
          <button className="sec-details-btn">See all details</button>
        </div>

        <Gauge score={score} grade={grade} label={label} />
      </div>
    </section>
  );
}
