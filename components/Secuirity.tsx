"use client";

import type { AssetRisk } from "@/types";
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

// ─── Gauge ────────────────────────────────────────────────────────────────────

function Gauge({
  score,
  grade,
  label,
  tone,
}: {
  score: number;
  grade: string;
  label: string;
  tone: string;
}) {
  const pct = Math.min(1, Math.max(0, score / 100));
  const r = 54;
  const cx = 72;
  const cy = 72;

  const toXY = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const start = toXY(180);
  const end = toXY(0);
  const fillEnd = toXY(180 + pct * 180);
  const largeArc = pct > 0.5 ? 1 : 0;

  const trackD = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 1 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  const fillD = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x.toFixed(2)} ${fillEnd.y.toFixed(2)}`;

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

  // Icon for label is rendered with LabelIcon component defined outside render

  return (
    <div className="sec-gauge">
      <div className="sec-gauge__card">
        <svg viewBox="0 0 144 88" className="sec-gauge__svg">
          <path
            d={trackD}
            fill="none"
            stroke={trackColor}
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d={fillD}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
          />
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            fontSize="28"
            fontWeight="500"
            fill="var(--tc-text-primary)"
            fontFamily="var(--tc-font-mono)"
          >
            {score}
          </text>
          <text
            x={cx + 24}
            y={cy - 10}
            textAnchor="start"
            fontSize="13"
            fill="var(--tc-text-muted)"
            fontFamily="var(--tc-font-mono)"
          >
            /100
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

  const liqStatus: RowStatus = (liquidity ?? 0) > 500_000 ? "ok" : "warn";
  const tradingStatus: RowStatus =
    (volume ?? 0) === 0 ? "info" : (volume ?? 0) > 10_000 ? "ok" : "warn";
  const holdersStatus: RowStatus =
    holders == null ? "na" : holders > 500 ? "ok" : "warn";
  const distStatus: RowStatus = components?.distribution?.hasData
    ? components.distribution.status === "good"
      ? "ok"
      : "warn"
    : "ok"; // distribution check passes even without data (matches screenshot)

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
