"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Validator } from "@/hooks/useValidators";
import { useWallet, useBalance } from "@solana/connector";
import { useStakeTransaction, StakePosition } from "@/hooks/useStakeTransaction";
import {
  Globe,
  CheckCircle,
  ClockCounterClockwise,
  ShieldCheck,
  Lightning,
} from "@phosphor-icons/react";
import { HistoryPoint } from "@/types/validator";

interface ValidatorDetailContentProps {
  validator: Validator;
}

// ─── Stake History Chart ───────────────────────────────────────────────────────

function StakeChart({
  data,
  isLoading,
}: {
  data: HistoryPoint[];
  isLoading: boolean;
}) {
  const W = 800;
  const H = 220;
  const PAD = { top: 16, right: 16, bottom: 32, left: 64 };
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!isLoading && data.length > 1) {
      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => setAnimated(true)),
      );
      return () => cancelAnimationFrame(raf);
    }
  }, [isLoading, data.length]);

  const derived = useMemo(() => {
    if (data.length < 2) return null;
    const values = data.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const iW = W - PAD.left - PAD.right;
    const iH = H - PAD.top - PAD.bottom;

    const pts = data.map(
      (d, i) =>
        [
          PAD.left + (i / (data.length - 1)) * iW,
          PAD.top + (1 - (d.value - minVal) / range) * iH,
        ] as [number, number],
    );

    const path = pts
      .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ");

    const last = pts[pts.length - 1];
    const areaPath = `${path} L ${last[0].toFixed(1)},${(H - PAD.bottom).toFixed(1)} L ${PAD.left},${(H - PAD.bottom).toFixed(1)} Z`;

    const steps = 4;
    const yLabels = Array.from({ length: steps + 1 }, (_, i) => ({
      y: PAD.top + (1 - i / steps) * iH,
      label: ((minVal + ((maxVal - minVal) * i) / steps) / 1e3).toFixed(1) + "k",
    }));

    const xLabels = Array.from({ length: Math.min(5, data.length) }, (_, i) => {
  const idx = Math.round((i / 4) * (data.length - 1));
  const pt = data[idx];
  const date = pt.timestamp
    ? new Date(pt.timestamp)          // string → Date directly, no arithmetic
    : new Date(pt.epoch * 1000);      // epoch (number) fallback
  return {
    x: PAD.left + (idx / (data.length - 1)) * iW,
    label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
});

    return { path, areaPath, yLabels, xLabels, pulsePt: last };
  }, [data]);

  if (isLoading || !derived) {
    return (
      <div className="td-chart td-chart--loading" style={{ height: 220 }}>
        <div className="td-chart__shimmer" />
      </div>
    );
  }

  const { path, areaPath, yLabels, xLabels, pulsePt } = derived;
  const lineColor = "var(--tc-accent)";

  return (
    <div className="td-chart" style={{ height: 220, position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="td-chart__svg"
      >
        <defs>
          <linearGradient id="stakeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
          <clipPath id="stakeClip">
            <rect
              x={PAD.left}
              y={0}
              width={animated ? W : 0}
              height={H}
              style={{ transition: "width 1.2s cubic-bezier(0.22,1,0.36,1)" }}
            />
          </clipPath>
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
            strokeDasharray="4,4"
          />
        ))}

        <g clipPath="url(#stakeClip)">
          <path d={areaPath} fill="url(#stakeGrad)" />
          <path
            d={path}
            fill="none"
            stroke={lineColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {yLabels.map(({ y, label }) => (
          <text
            key={y}
            x={PAD.left - 12}
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
          >
            {label}
          </text>
        ))}

        {animated && (
          <g>
            <circle
              cx={pulsePt[0]}
              cy={pulsePt[1]}
              r="14"
              fill={lineColor}
              opacity="0"
              className="td-chart__pulse-ring"
            />
            <circle
              cx={pulsePt[0]}
              cy={pulsePt[1]}
              r="4"
              fill={lineColor}
              className="td-chart__pulse-dot"
            />
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ValidatorDetailContent({ validator }: ValidatorDetailContentProps) {
  const { isConnected, account } = useWallet();
  const { solBalance } = useBalance({ enabled: isConnected });
  const { executeStakeAction, fetchActiveStakes, status } = useStakeTransaction();

  const [amount, setAmount] = useState("");
  const [stakes, setStakes] = useState<StakePosition[]>([]);
  const [isLoadingStakes, setIsLoadingStakes] = useState(true);

  useEffect(() => {
    if (isConnected && account) {
      fetchActiveStakes(account)
        .then(setStakes)
        .finally(() => setIsLoadingStakes(false));
    } else {
      setIsLoadingStakes(false);
    }
  }, [isConnected, account, fetchActiveStakes]);

  const existingStake = useMemo(
    () =>
      stakes.find(
        (s) =>
          s.validator === validator.name ||
          s.validator === validator.votingPubkey,
      ),
    [stakes, validator],
  );

  const handleMax = () => {
    if (solBalance) {
      setAmount(Math.max(0, solBalance - 0.01).toFixed(4));
    }
  };

  const handleStake = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    await executeStakeAction("stake", {
      voteAccount: validator.votingPubkey,
      amountSOL: val,
    });
  };

  const handleUnstake = async (stakeAccount: string) => {
    await executeStakeAction("deactivate", { stakeAccount });
  };

  const handleWithdraw = async (stakeAccount: string, amt: number) => {
    await executeStakeAction("withdraw", { stakeAccount, amountSOL: amt });
  };

  const estimatedDaily = useMemo(() => {
    const val = parseFloat(amount) || 0;
    return (val * (validator.apy / 100)) / 365;
  }, [amount, validator.apy]);

  const isExecuting = ["loading", "signing", "sending", "confirming"].includes(status);
  const stakeHistory = validator.stakeHistory || [];

  return (
    <div className="td-layout">
      {/* ══════════════════════
          LEFT — Main content
         ══════════════════════ */}
      <div>
        {/* Header */}
        <div className="td-header">
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            {validator.avatar ? (
              <img
                src={validator.avatar}
                alt={validator.name}
                className="tc-avatar"
                style={{ width: 72, height: 72, borderRadius: 16 }}
              />
            ) : (
              <div
                className="tc-avatar tc-avatar--fallback"
                style={{ width: 72, height: 72, borderRadius: 16, fontSize: 20 }}
              >
                {validator.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            {validator.status === "active" && (
              <div
                style={{
                  position: "absolute",
                  bottom: -4,
                  right: -4,
                  background: "var(--tc-accent-up)",
                  borderRadius: "50%",
                  padding: 3,
                  border: "2px solid var(--tc-bg)",
                  display: "flex",
                }}
              >
                <CheckCircle size={12} weight="fill" color="#fff" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="td-header__info">
            <div className="td-header__row">
              <h1 className="td-header__name">{validator.name}</h1>
              {validator.isJito && (
                <span className="tc-badge tc-badge--t1">Jito MEV</span>
              )}
            </div>
            <div className="td-header__pills">
              <button
                className="td-pill td-pill--mint"
                onClick={() =>
                  navigator.clipboard.writeText(validator.votingPubkey)
                }
              >
                <span style={{ opacity: 0.5 }}>Vote:</span>
                {validator.votingPubkey.slice(0, 8)}…
                {validator.votingPubkey.slice(-8)}
                <svg viewBox="0 0 16 16" fill="none" width="11" height="11" style={{ opacity: 0.4 }}>
                  <path d="M4 4h8v8H4z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M2 2h8v2H4v8H2z" fill="currentColor" opacity="0.3" />
                </svg>
              </button>
              {validator.website && (
                <a
                  href={validator.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="td-pill"
                >
                  <Globe size={12} />
                  Website
                </a>
              )}
            </div>
          </div>

          {/* Commission / APY — desktop only */}
          <div className="td-header__actions">
            <div className="tc-stat">
              <span className="tc-stat__label">Commission</span>
              <span className="tc-stat__value" style={{ fontSize: 18, fontWeight: 700 }}>
                {validator.commission}%
              </span>
            </div>
            <div
              style={{
                width: 1,
                height: 36,
                background: "var(--tc-divider)",
                margin: "0 12px",
              }}
            />
            <div className="tc-stat">
              <span className="tc-stat__label">Yield APY</span>
              <span
                className="tc-stat__value"
                style={{ fontSize: 18, fontWeight: 700, color: "var(--tc-accent-up)" }}
              >
                {validator.apy.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="td-chart-section">
          <div className="td-chart-label">
            <span className="td-chart-label__sym">Network Stake</span>
            <span className="td-chart-label__price">
              {(validator.stake / 1e3).toFixed(1)}k
            </span>
            <span className="td-chart-label__text">SOL</span>
            <span className="td-chart-label__period">Live History</span>
          </div>
          <div className="td-chart-controls">
            <div className="td-chart-controls__group">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--tc-border)",
                  background: "var(--tc-surface)",
                  fontSize: 11,
                  color: "var(--tc-text-muted)",
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--tc-accent)",
                    animation: "tgPulse 1.5s ease-in-out infinite",
                  }}
                />
                Live
              </div>
            </div>
          </div>
          <StakeChart data={stakeHistory} isLoading={false} />
        </div>

        {/* About */}
        <div className="td-section">
          <h2 className="td-section__title">About Validator</h2>
          <div className="td-card">
            <p className="td-card__desc">
              {validator.description ||
                "This validator contributes to the security and decentralization of the Solana network by processing transactions and participating in consensus. They maintain high uptime and competitive APY for their delegators."}
            </p>

            <div
              style={{
                marginTop: 20,
                paddingTop: 20,
                borderTop: "1px solid var(--tc-divider)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
              }}
            >
              {/* Epoch Credits */}
              <div className="tc-stat">
                <span
                  className="tc-stat__label"
                  style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}
                >
                  <ClockCounterClockwise size={13} />
                  Epoch Credits
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {validator.epochCredits && validator.epochCredits.length > 0 ? (
                    validator.epochCredits
                      .slice(-5)
                      .reverse()
                      .map((credits, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: "var(--tc-surface)",
                            border: "1px solid var(--tc-border)",
                            borderRadius: 8,
                            padding: "4px 8px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 9,
                              color: "var(--tc-text-muted)",
                              fontWeight: 600,
                              textTransform: "uppercase",
                            }}
                          >
                            {idx === 0 ? "NOW" : `E-${idx}`}
                          </span>
                          <span className="tc-stat__value" style={{ fontSize: 12 }}>
                            {(credits / 1000).toFixed(0)}k
                          </span>
                        </div>
                      ))
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--tc-text-muted)", fontStyle: "italic" }}>
                      Syncing…
                    </span>
                  )}
                </div>
              </div>

              {/* Network Position */}
              <div className="tc-stat">
                <span
                  className="tc-stat__label"
                  style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}
                >
                  <ShieldCheck size={13} />
                  Network Position
                </span>
                <p style={{ margin: 0, fontSize: 13, color: "var(--tc-text-secondary)", lineHeight: 1.6 }}>
                  Ranked{" "}
                  <strong style={{ color: "var(--tc-text-primary)" }}>
                    #{validator.rank}
                  </strong>{" "}
                  globally by stake weight. Contributing to network
                  decentralization.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="td-stats-grid">
          <div className="td-stat-cell">
            <span className="td-stat-cell__label">Version</span>
            <span className="td-stat-cell__value">{validator.version || "1.18.x"}</span>
          </div>
          <div className="td-stat-cell">
            <span className="td-stat-cell__label">Uptime</span>
            <span className="td-stat-cell__value">
              {validator.uptime
                ? `${(validator.uptime * 100).toFixed(2)}%`
                : "99.99%"}
            </span>
          </div>
          <div className="td-stat-cell">
            <span className="td-stat-cell__label">City</span>
            <span className="td-stat-cell__value">{validator.city || "—"}</span>
          </div>
          <div className="td-stat-cell">
            <span className="td-stat-cell__label">Country</span>
            <span className="td-stat-cell__value">
              {validator.country || "International"}
            </span>
          </div>
          <div className="td-stat-cell" style={{ gridColumn: "span 2" }}>
            <span className="td-stat-cell__label">Data Center</span>
            <span className="td-stat-cell__value">
              {validator.dataCenter || "Global Infrastructure"}
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════
          RIGHT — Sidebar
         ══════════════════════ */}
      <div className="td-sidebar">
        {/* Stake action card */}
        <div className="sw-card">
          {/* Tab bar */}
          <div className="sw-tabs">
            <div className="sw-tab sw-tab--active">
              <Lightning size={12} weight="fill" />
              Native Staking
            </div>
          </div>

          <div style={{ padding: "14px 14px 12px", display: "flex", flexDirection: "column", gap: 14 }}>
            {existingStake ? (
              <>
                {/* Existing stake */}
                <div
                  style={{
                    background: "var(--tc-surface)",
                    border: "1px solid var(--tc-border)",
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <span className="sw-input-lbl">Active Stake</span>
                    <span
                      className="tc-change tc-change--up tc-change--sm"
                    >
                      {existingStake.status}
                    </span>
                  </div>
                  <span
                    className="sw-amount sw-amount--out"
                    style={{ display: "block" }}
                  >
                    {existingStake.amount}
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--tc-text-muted)",
                        marginLeft: 4,
                      }}
                    >
                      SOL
                    </span>
                  </span>
                </div>

                {existingStake.status === "active" ? (
                  <button
                    className="sw-swap-btn"
                    style={{
                      width: "100%",
                      margin: 0,
                      background: "transparent",
                      border: "1.5px solid var(--tc-accent-down)",
                      color: "var(--tc-accent-down)",
                    }}
                    onClick={() => handleUnstake(existingStake.address)}
                    disabled={isExecuting}
                  >
                    {isExecuting ? "Processing…" : "Unstake SOL"}
                  </button>
                ) : (
                  <button
                    className={`sw-swap-btn ${isExecuting ? "sw-swap-btn--busy" : ""}`}
                    style={{ width: "100%", margin: 0 }}
                    onClick={() =>
                      handleWithdraw(existingStake.address, existingStake.amount)
                    }
                    disabled={isExecuting}
                  >
                    {isExecuting && <span className="sw-spinner" />}
                    {isExecuting ? "Processing…" : "Withdraw Funds"}
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Amount input */}
                <div className="sw-input-group" style={{ padding: 0 }}>
                  <div className="sw-input-hdr">
                    <span className="sw-input-lbl">Amount</span>
                    {isConnected && solBalance != null && (
                      <button className="sw-bal-btn" onClick={handleMax}>
                        MAX: {solBalance.toFixed(3)} SOL
                      </button>
                    )}
                  </div>
                  <div className="sw-input-row">
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      className="sw-amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <div className="sw-token-fixed">
                      <span className="sw-token-fixed__sym">SOL</span>
                    </div>
                  </div>
                </div>

                {/* Earnings estimate */}
                {parseFloat(amount) > 0 && (
                  <div className="sw-quote" style={{ margin: 0 }}>
                    <div className="sw-quote__row">
                      <span className="sw-quote__label">Est. daily earnings</span>
                      <span
                        className="sw-quote__val"
                        style={{ color: "var(--tc-accent-up)" }}
                      >
                        +{estimatedDaily.toFixed(4)} SOL
                      </span>
                    </div>
                    <div className="sw-quote__row">
                      <span className="sw-quote__label">APY</span>
                      <span
                        className="sw-quote__val"
                        style={{ color: "var(--tc-accent-up)" }}
                      >
                        {validator.apy.toFixed(2)}%
                      </span>
                    </div>
                    <div className="sw-quote__row sw-quote__row--provider">
                      <span className="sw-quote__label">Validator</span>
                      <span className="sw-quote__provider">{validator.name}</span>
                    </div>
                  </div>
                )}

                {/* Stake button */}
                <button
                  className={`sw-swap-btn ${isExecuting ? "sw-swap-btn--busy" : ""}`}
                  style={{ width: "100%", margin: 0 }}
                  disabled={!isConnected || isExecuting || !amount}
                  onClick={handleStake}
                >
                  {isExecuting && <span className="sw-spinner" />}
                  {!isConnected
                    ? "Connect Wallet"
                    : isExecuting
                      ? "Signing…"
                      : "Stake SOL"}
                </button>
              </>
            )}

            <p className="sw-powered" style={{ padding: 0, margin: 0 }}>
              Secured by Solana Native Staking
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="td-card">
          <h3 className="td-card__title">Node Metrics</h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {[
              { label: "APY", value: `${validator.apy.toFixed(2)}%`, color: "var(--tc-accent-up)" },
              { label: "Commission", value: `${validator.commission}%` },
              { label: "Rank", value: `#${validator.rank}` },
              {
                label: "Uptime",
                value: validator.uptime
                  ? `${(validator.uptime * 100).toFixed(1)}%`
                  : "99.9%",
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: 10,
                  borderBottom: "1px solid var(--tc-divider)",
                }}
              >
                <span className="tc-stat__label" style={{ textTransform: "none", fontSize: 12 }}>
                  {label}
                </span>
                <span
                  className="tc-stat__value"
                  style={{ color: color || "var(--tc-text-primary)", fontSize: 13 }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}