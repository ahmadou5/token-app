"use client";

import { useState, useEffect, useMemo } from "react";
import { Validator } from "@/hooks/useValidators";
import { useWallet, useBalance, useConnector } from "@solana/connector";
import { useStakeTransaction, StakePosition } from "@/hooks/useStakeTransaction";
import {
  Globe,
  CheckCircle,
  ClockCounterClockwise,
  ShieldCheck,
  Lightning,
} from "@phosphor-icons/react";
import { HistoryPoint } from "@/types/validator";
import { ConnectedPill } from "@/components/Swap";
import { useTokens } from "@/hooks/useToken";

interface ValidatorDetailContentProps {
  validator: Validator;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSol(sol: number): string {
  if (sol >= 1_000_000) return (sol / 1_000_000).toFixed(2) + "M";
  if (sol >= 1_000) return (sol / 1_000).toFixed(1) + "k";
  return sol.toFixed(0);
}

/**
 * Convert raw stakeHistory (lamport deltas per epoch) into cumulative SOL,
 * anchored so the LAST point equals currentStakeSol (the known true value).
 *
 * Strategy:
 *  1. Sum all deltas in lamports → totalDeltaLamports
 *  2. Starting point = currentStakeSol - totalDeltaLamports / 1e9
 *  3. Walk forward adding each delta
 *
 * This means the line always ends exactly at the validator's real active stake.
 */
function buildCumulative(
  history: HistoryPoint[],
  currentStakeSol: number,
): { epoch: number; value: number }[] {
  if (history.length === 0) return [];
  const totalDeltaSol = history.reduce((s, h) => s + h.value / 1e9, 0);
  let running = currentStakeSol - totalDeltaSol;
  return history.map((h) => {
    running += h.value / 1e9;
    return { epoch: h.epoch, value: Math.max(0, running) };
  });
}

// ─── Line / Area chart (cumulative total stake) ───────────────────────────────

function TotalStakeChart({
  data,
  animated,
}: {
  data: { epoch: number; value: number }[];
  animated: boolean;
}) {
  const W = 800;
  const H = 220;
  const PAD = { top: 16, right: 16, bottom: 32, left: 72 };

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
      label: formatSol(minVal + ((maxVal - minVal) * i) / steps),
    }));

    const xLabels = Array.from({ length: Math.min(5, data.length) }, (_, i) => {
      const idx = Math.round((i / 4) * (data.length - 1));
      return {
        x: PAD.left + (idx / (data.length - 1)) * iW,
        label: `Ep ${data[idx].epoch}`,
      };
    });

    return { path, areaPath, yLabels, xLabels, pulsePt: last };
  }, [data]);

  if (!derived) {
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
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="td-chart__svg">
        <defs>
          <linearGradient id="stakeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
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

// ─── Bar chart (epoch-by-epoch delegation flow) ───────────────────────────────

function FlowChart({ data }: { data: HistoryPoint[] }) {
  const W = 800;
  const H = 220;
  const PAD = { top: 16, right: 16, bottom: 32, left: 72 };

  const derived = useMemo(() => {
    if (data.length === 0) return null;
    const solValues = data.map((d) => d.value / 1e9);
    const maxVal = Math.max(...solValues) || 1;
    const iW = W - PAD.left - PAD.right;
    const iH = H - PAD.top - PAD.bottom;
    const slotW = iW / data.length;
    const barW = Math.max(4, slotW * 0.65);

    const bars = data.map((d, i) => {
      const sol = d.value / 1e9;
      const barH = Math.max(2, (sol / maxVal) * iH);
      const x = PAD.left + i * slotW + slotW * 0.175;
      return { x, barH, sol, epoch: d.epoch };
    });

    const steps = 4;
    const yLabels = Array.from({ length: steps + 1 }, (_, i) => ({
      y: PAD.top + (1 - i / steps) * iH,
      label: formatSol((maxVal * i) / steps),
    }));

    const xLabels = Array.from({ length: Math.min(5, data.length) }, (_, i) => {
      const idx = Math.round((i / 4) * (data.length - 1));
      return {
        x: PAD.left + idx * slotW + slotW / 2,
        label: `Ep ${data[idx].epoch}`,
      };
    });

    return { bars, barW, yLabels, xLabels, iH };
  }, [data]);

  if (!derived) {
    return (
      <div className="td-chart td-chart--loading" style={{ height: 220 }}>
        <div className="td-chart__shimmer" />
      </div>
    );
  }

  const { bars, barW, yLabels, xLabels, iH } = derived;

  return (
    <div className="td-chart" style={{ height: 220, position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="td-chart__svg">
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

        {bars.map(({ x, barH, epoch }) => (
          <rect
            key={epoch}
            x={x}
            y={PAD.top + iH - barH}
            width={barW}
            height={barH}
            rx="2"
            fill="var(--tc-accent)"
            opacity="0.72"
          />
        ))}

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
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ─── Combined chart wrapper with switcher ─────────────────────────────────────

function StakeChart({
  rawHistory,
  currentStakeSol,
}: {
  rawHistory: HistoryPoint[];
  currentStakeSol: number;
}) {
  const [view, setView] = useState<"total" | "flow">("total");
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (rawHistory.length > 1) {
      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => setAnimated(true)),
      );
      return () => cancelAnimationFrame(raf);
    }
  }, [rawHistory.length]);

  const cumulativeData = useMemo(
    () => buildCumulative(rawHistory, currentStakeSol),
    [rawHistory, currentStakeSol],
  );

  return (
    <>
      {/* Switcher row */}
      <div
        className="td-chart-controls"
        style={{ marginBottom: 10, flexWrap: "nowrap", alignItems: "center" }}
      >
        <div className="td-chart-controls__group">
          <button
            className={`td-ctrl-btn ${view === "total" ? "td-ctrl-btn--active" : ""}`}
            onClick={() => setView("total")}
          >
            Total Stake
          </button>
          <button
            className={`td-ctrl-btn ${view === "flow" ? "td-ctrl-btn--active" : ""}`}
            onClick={() => setView("flow")}
          >
            Epoch Flow
          </button>
        </div>

        {/* Live badge */}
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
            marginLeft: "auto",
            flexShrink: 0,
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

      {view === "total" ? (
        <TotalStakeChart data={cumulativeData} animated={animated} />
      ) : (
        <FlowChart data={rawHistory} />
      )}

      {/* Context note */}
      <p
        style={{
          margin: "6px 0 0",
          fontSize: 10,
          color: "var(--tc-text-muted)",
          fontStyle: "italic",
          lineHeight: 1.5,
        }}
      >
        {view === "total"
          ? "Cumulative stake anchored to current activated stake. Earlier epochs reconstructed from per-epoch delegation deltas."
          : "Per-epoch delegation flow in SOL. Spikes indicate large delegations or undelegations that epoch."}
      </p>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ValidatorDetailContent({ validator }: ValidatorDetailContentProps) {
  const { isConnected, account } = useWallet();
  const { solBalance } = useBalance({ enabled: isConnected });
  const { executeStakeAction, fetchActiveStakes, status } = useStakeTransaction();
    const connector = useConnector();
  const [amount, setAmount] = useState("");
  const [stakes, setStakes] = useState<StakePosition[]>([]);
  const [isLoadingStakes, setIsLoadingStakes] = useState(true);
  const { tokens } = useTokens();

  const solana = tokens.find((token) => token.assetId === 'solana');

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
    if (solBalance) setAmount(Math.max(0, solBalance - 0.01).toFixed(4));
  };

  const handleStake = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    await executeStakeAction("stake", {
      voteAccount: validator.votingPubkey,
      amountSOL: val,
    });
  };

  const handleUnstake = async (stakeAccount: string) =>
    executeStakeAction("deactivate", { stakeAccount });

  const handleWithdraw = async (stakeAccount: string, amt: number) =>
    executeStakeAction("withdraw", { stakeAccount, amountSOL: amt });

  const estimatedDaily = useMemo(() => {
    const val = parseFloat(amount) || 0;
    return (val * (validator.apy / 100)) / 365;
  }, [amount, validator.apy]);

  const isExecuting = ["loading", "signing", "sending", "confirming"].includes(status);
  const stakeHistory: HistoryPoint[] = validator.stakeHistory || [];

  // activatedStake is in SOL (from StakeWiz mapping which notes "appears to be in SOL already")
  const currentStakeSol = validator.activatedStake ?? validator.stake ?? 0;

  return (
    <div className="td-layout">
      {/* ══════════════════════════════
          LEFT — Main content
         ══════════════════════════════ */}
      <div>
        {/* Header */}
        <div className="td-header">
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
                onClick={() => navigator.clipboard.writeText(validator.votingPubkey)}
              >
                <span style={{ opacity: 0.5 }}>Vote:</span>
                {validator.votingPubkey.slice(0, 8)}…{validator.votingPubkey.slice(-8)}
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

        {/* Chart section */}
        <div className="td-chart-section">
          <div className="td-chart-label" style={{ marginBottom: 4 }}>
            <span className="td-chart-label__sym">Activated Stake</span>
            <span className="td-chart-label__price">{formatSol(currentStakeSol)}</span>
            <span className="td-chart-label__text">SOL</span>
          </div>

          <StakeChart rawHistory={stakeHistory} currentStakeSol={currentStakeSol} />
        </div>

        {/* About */}
        <div className="td-section">
          <h2 className="td-section__title">About Validator</h2>
          <div className="td-card">
            <div className="flex items-center ">
              <img className=" ml-1 mr-3 rounded-xl h-8 w-8" src={validator.avatar} />
 <p className="td-card__desc">
              {validator.description ||
                "This validator contributes to the security and decentralization of the Solana network by processing transactions and participating in consensus. They maintain high uptime and competitive APY for their delegators."}
            </p>
            </div>
           

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

              <div className="tc-stat">
                <span
                  className="tc-stat__label"
                  style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}
                >
                  <ShieldCheck size={13} />
                  Network Position
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--tc-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  Ranked{" "}
                  <strong style={{ color: "var(--tc-text-primary)" }}>
                    #{validator.rank}
                  </strong>{" "}
                  globally by stake weight. Contributing to network decentralization.
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
              {validator.uptime ? `${(validator.uptime * 100).toFixed(2)}%` : "99.99%"}
            </span>
          </div>
          <div className="td-stat-cell">
            <span className="td-stat-cell__label">City</span>
            <span className="td-stat-cell__value">{validator.city || "—"}</span>
          </div>
          <div className="td-stat-cell">
            <span className="td-stat-cell__label">Country</span>
            <span className="td-stat-cell__value">{validator.country || "International"}</span>
          </div>
          <div className="td-stat-cell" style={{ gridColumn: "span 2" }}>
            <span className="td-stat-cell__label">Data Center</span>
            <span className="td-stat-cell__value">
              {validator.dataCenter || "Global Infrastructure"}
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════
          RIGHT — Sidebar
         ══════════════════════════════ */}
      <div className="td-sidebar">
           <div className=" h-[54px] mb-[26px] bg-amber-0">
                    {isConnected && (
                      <div className="td-sidebar-pill">
                        <ConnectedPill onDisconnect={() => connector.disconnect()} />
                      </div>
                    )}
                  </div>
        <div className="sw-card">
          <div className="sw-tabs">
            <div className="sw-tab sw-tab--active">
              <Lightning size={12} weight="fill" />
              Native Staking
            </div>
          </div>

          <div
            style={{
              padding: "14px 14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {existingStake ? (
              <>
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
                    <span className="tc-change tc-change--up tc-change--sm">
                      {existingStake.status}
                    </span>
                  </div>
                  <span className="sw-amount sw-amount--out" style={{ display: "block" }}>
                    {existingStake.amount}
                    <span style={{ fontSize: 13, color: "var(--tc-text-muted)", marginLeft: 4 }}>
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
                      <span className="sw-token-fixed__sym"><img className="w-8 h-8 rounded-xl" src={solana?.imageUrl||''} alt={solana?.name} /></span>
                    </div>
                  </div>
                </div>

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
                      <div className="flex "><span className="sw-quote__provider ml-2 mr-2">{validator.name}</span><img className="w-5 h-5 rounded-full" src={validator.avatar} /></div>
                    </div>
                  </div>
                )}

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
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              {
                label: "APY",
                value: `${validator.apy.toFixed(2)}%`,
                color: "var(--tc-accent-up)",
              },
              { label: "Commission", value: `${validator.commission}%` },
              { label: "Rank", value: `#${validator.rank}` },
              {
                label: "Uptime",
                value: validator.uptime
                  ? `${(validator.uptime * 100).toFixed(1)}%`
                  : "99.9%",
              },
              {
                label: "Active Stake",
                value: formatSol(currentStakeSol) + " SOL",
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
                <span
                  className="tc-stat__label"
                  style={{ textTransform: "none", fontSize: 12 }}
                >
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