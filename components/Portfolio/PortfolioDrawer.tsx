"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/connector";
import { usePortfolioDrawer } from "@/context/PortfolioDrawerContext";
import {
  usePortfolioData,
  type PortfolioToken,
  type PerpPosition,
  type StakePosition,
} from "@/hooks/usePortfolioData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtSol(n: number) {
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} SOL`;
}
function fmtDuration(from: string | null) {
  if (!from) return "—";
  const h = (Date.now() - new Date(from).getTime()) / 3_600_000;
  if (h < 1) return `${Math.floor(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}
function truncate(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="pf-skeleton-row">
      <div className="pf-skeleton pf-skeleton--circle" />
      <div className="pf-skeleton-row__lines">
        <div
          className="pf-skeleton pf-skeleton--line"
          style={{ width: "55%" }}
        />
        <div
          className="pf-skeleton pf-skeleton--line"
          style={{ width: "35%" }}
        />
      </div>
      <div className="pf-skeleton pf-skeleton--line" style={{ width: 52 }} />
    </div>
  );
}

// ─── Token avatar ─────────────────────────────────────────────────────────────

function TokenAvatar({
  logo,
  symbol,
  size = 32,
}: {
  logo?: string;
  symbol: string;
  size?: number;
}) {
  const [err, setErr] = useState(false);
  if (logo && !err) {
    return (
      <img
        src={logo}
        alt={symbol}
        width={size}
        height={size}
        className="pf-token-avatar pf-token-avatar--img"
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div
      className="pf-token-avatar pf-token-avatar--fallback"
      style={{ width: size, height: size }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  count,
  right,
}: {
  title: string;
  count?: number;
  right?: React.ReactNode;
}) {
  return (
    <div className="pf-section-header">
      <span className="pf-section-header__title">{title}</span>
      {count !== undefined && (
        <span className="pf-section-header__count">{count}</span>
      )}
      <span className="pf-section-header__line" />
      {right}
    </div>
  );
}

// ─── Token row ────────────────────────────────────────────────────────────────

function TokenRow({ token }: { token: PortfolioToken }) {
  return (
    <div className="pf-token-row">
      <TokenAvatar logo={token.logoUri} symbol={token.symbol} size={36} />
      <div className="pf-token-row__info">
        <span className="pf-token-row__symbol">{token.symbol}</span>
        <span className="pf-token-row__balance">
          {token.balance.toLocaleString("en-US", {
            maximumFractionDigits: token.isNative ? 4 : 2,
          })}
        </span>
      </div>
      <div className="pf-token-row__value">
        <span className="pf-token-row__usd">{fmtUsd(token.usdValue)}</span>
        {token.usdPrice > 0 && (
          <span className="pf-token-row__price">@{fmtUsd(token.usdPrice)}</span>
        )}
      </div>
    </div>
  );
}

// ─── Stable row ───────────────────────────────────────────────────────────────

function StableRow({
  token,
  onEarn,
}: {
  token: PortfolioToken;
  onEarn: () => void;
}) {
  return (
    <div className="pf-token-row">
      <TokenAvatar logo={token.logoUri} symbol={token.symbol} size={32} />
      <div className="pf-token-row__info">
        <span className="pf-token-row__symbol">{token.symbol}</span>
        <span className="pf-token-row__balance">{fmtUsd(token.usdValue)}</span>
      </div>
      <button className="pf-earn-btn" onClick={onEarn}>
        Earn
        <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
          <path
            d="M2 6h8M7 3l3 3-3 3"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

// ─── Perp position row ────────────────────────────────────────────────────────

function PerpRow({ pos }: { pos: PerpPosition }) {
  const isLong = pos.side === "long";
  return (
    <div className="pf-perp-row">
      <div className="pf-perp-row__left">
        <span className="pf-perp-row__market">{pos.symbol}-PERP</span>
        <span
          className={`pf-perp-row__side ${isLong ? "pf-perp-row__side--long" : "pf-perp-row__side--short"}`}
        >
          {isLong ? "▲" : "▼"} {pos.side}
        </span>
      </div>
      <div className="pf-perp-row__right">
        <span className="pf-perp-row__size">
          {pos.entrySize ? fmtUsd(pos.entrySize) : "—"}
        </span>
        <span className="pf-perp-row__meta">
          {pos.entryPrice ? `@$${pos.entryPrice.toLocaleString()}` : ""} ·{" "}
          {fmtDuration(pos.entryDate)}
        </span>
      </div>
    </div>
  );
}

// ─── Stake row ────────────────────────────────────────────────────────────────

function StakeRow({ pos }: { pos: StakePosition }) {
  const statusColor = {
    active: "var(--tc-accent-up)",
    activating: "var(--tc-text-muted)",
    deactivating: "#f59e0b",
    inactive: "var(--tc-text-muted)",
  }[pos.status];

  return (
    <div className="pf-stake-row">
      <div className="pf-stake-row__validator">
        <div className="pf-stake-row__validator-icon">
          <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
            <circle
              cx="8"
              cy="8"
              r="6.5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M5 8l2 2 4-4"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <p className="pf-stake-row__name">
            {pos.validatorName ?? truncate(pos.validatorVoteAccount)}
          </p>
          <p className="pf-stake-row__account">{truncate(pos.stakeAccount)}</p>
        </div>
      </div>
      <div className="pf-stake-row__right">
        <span className="pf-stake-row__amount">{fmtSol(pos.stakedSol)}</span>
        <span className="pf-stake-row__status" style={{ color: statusColor }}>
          ● {pos.status}
        </span>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  message,
  cta,
  onCta,
}: {
  message: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <div className="pf-empty">
      <p className="pf-empty__msg">{message}</p>
      {cta && onCta && (
        <button className="pf-empty__cta" onClick={onCta}>
          {cta}
        </button>
      )}
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="pf-copy-btn"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      aria-label="Copy address"
    >
      {copied ? (
        <svg viewBox="0 0 12 12" fill="none" width="11" height="11">
          <path
            d="M2 6l3 3 5-5"
            stroke="var(--tc-accent-up)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 12 12" fill="none" width="11" height="11">
          <rect
            x="4"
            y="1"
            width="7"
            height="8"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.1"
          />
          <rect
            x="1"
            y="4"
            width="7"
            height="8"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.1"
            fill="var(--tc-bg)"
          />
        </svg>
      )}
    </button>
  );
}

// ─── Main drawer ──────────────────────────────────────────────────────────────

export function PortfolioDrawer() {
  const { isOpen, close } = usePortfolioDrawer();
  const { account: wallet } = useWallet();
  const router = useRouter();
  const {
    tokens,
    stables,
    perpPositions,
    stakePositions,
    totalUsd,
    totalStablUsd,
    totalStakedSol,
    loading,
    refetch,
  } = usePortfolioData(wallet ?? null);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  // Refetch when opened
  useEffect(() => {
    if (isOpen && wallet) refetch();
  }, [isOpen, wallet]);

  const nonStableTokens = tokens.filter((t) => !t.isStable);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`pf-backdrop ${isOpen ? "pf-backdrop--visible" : ""}`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`pf-drawer ${isOpen ? "pf-drawer--open" : ""}`}
        aria-label="Portfolio"
        role="complementary"
      >
        {/* ── Header ── */}
        <div className="pf-drawer__header">
          <div className="pf-drawer__header-left">
            <div className="pf-drawer__wallet-info">
              <p className="pf-drawer__wallet-label">Portfolio</p>
              {wallet && (
                <div className="pf-drawer__wallet-addr">
                  <span className="pf-drawer__addr-text">
                    {truncate(wallet)}
                  </span>
                  <CopyBtn text={wallet} />
                </div>
              )}
            </div>
            {totalUsd > 0 && (
              <p className="pf-drawer__total-usd">{fmtUsd(totalUsd)}</p>
            )}
          </div>
          <button
            className="pf-drawer__close"
            onClick={close}
            aria-label="Close portfolio"
          >
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
              <path
                d="M2 2l12 12M14 2L2 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* ── Stats bar ── */}
        {!loading && totalUsd > 0 && (
          <div className="pf-stats-bar">
            <div className="pf-stat-chip">
              <span className="pf-stat-chip__label">Stables</span>
              <span className="pf-stat-chip__value">
                {fmtUsd(totalStablUsd)}
              </span>
            </div>
            <div className="pf-stat-chip">
              <span className="pf-stat-chip__label">Staked</span>
              <span className="pf-stat-chip__value">
                {fmtSol(totalStakedSol)}
              </span>
            </div>
            <div className="pf-stat-chip">
              <span className="pf-stat-chip__label">Positions</span>
              <span className="pf-stat-chip__value">
                {perpPositions.length}
              </span>
            </div>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div className="pf-drawer__body">
          {!wallet ? (
            <div className="pf-not-connected">
              <svg viewBox="0 0 48 48" fill="none" width="40" height="40">
                <rect
                  x="4"
                  y="14"
                  width="40"
                  height="26"
                  rx="5"
                  stroke="var(--tc-border-hover)"
                  strokeWidth="1.5"
                />
                <path
                  d="M4 22h40"
                  stroke="var(--tc-border-hover)"
                  strokeWidth="1.5"
                />
                <circle cx="12" cy="30" r="2" fill="var(--tc-border-hover)" />
              </svg>
              <p className="pf-not-connected__msg">
                Connect your wallet to view your portfolio
              </p>
            </div>
          ) : (
            <>
              {/* ── 1. Token Balances ── */}
              <section className="pf-section">
                <SectionHeader
                  title="Tokens"
                  count={loading ? undefined : nonStableTokens.length}
                />
                {loading ? (
                  [1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)
                ) : nonStableTokens.length === 0 ? (
                  <EmptyState message="No token balances found" />
                ) : (
                  nonStableTokens.map((t) => (
                    <TokenRow key={t.mint} token={t} />
                  ))
                )}
              </section>

              {/* ── 2. Stablecoins ── */}
              {(loading || stables.length > 0) && (
                <section className="pf-section">
                  <SectionHeader
                    title="Stables"
                    count={loading ? undefined : stables.length}
                    right={
                      !loading && stables.length > 0 ? (
                        <span className="pf-section-header__total">
                          {fmtUsd(totalStablUsd)}
                        </span>
                      ) : undefined
                    }
                  />
                  {loading
                    ? [1, 2].map((i) => <SkeletonRow key={i} />)
                    : stables.map((t) => (
                        <StableRow
                          key={t.mint}
                          token={t}
                          onEarn={() => {
                            close();
                            router.push(`/tokens/${t.mint}`);
                          }}
                        />
                      ))}
                </section>
              )}

              {/* ── 3. Open Perp Positions ── */}
              <section className="pf-section">
                <SectionHeader
                  title="Open Positions"
                  count={loading ? undefined : perpPositions.length}
                />
                {loading ? (
                  <SkeletonRow />
                ) : perpPositions.length === 0 ? (
                  <EmptyState message="No open positions this season" />
                ) : (
                  perpPositions.map((p) => (
                    <PerpRow key={p.positionId} pos={p} />
                  ))
                )}
              </section>

              {/* ── 4. Yield Positions (placeholder) ── */}
              <section className="pf-section">
                <SectionHeader title="Yield" />
                <div className="pf-yield-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                    <path
                      d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                      stroke="var(--tc-text-muted)"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <p className="pf-yield-placeholder__msg">
                    Connect a yield vault to see earnings
                  </p>
                  <button
                    className="pf-yield-placeholder__btn"
                    onClick={() => {
                      close();
                      router.push(
                        "/tokens/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                      );
                    }}
                  >
                    Explore vaults →
                  </button>
                </div>
              </section>

              {/* ── 5. Native Stake Positions ── */}
              <section className="pf-section">
                <SectionHeader
                  title="Staked SOL"
                  count={loading ? undefined : stakePositions.length}
                  right={
                    !loading && totalStakedSol > 0 ? (
                      <span className="pf-section-header__total">
                        {fmtSol(totalStakedSol)}
                      </span>
                    ) : undefined
                  }
                />
                {loading ? (
                  <SkeletonRow />
                ) : stakePositions.length === 0 ? (
                  <EmptyState
                    message="No active stake positions"
                    cta="Stake SOL →"
                    onCta={() => {
                      close();
                      router.push("/validators");
                    }}
                  />
                ) : (
                  stakePositions.map((p) => (
                    <StakeRow key={p.stakeAccount} pos={p} />
                  ))
                )}
              </section>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="pf-drawer__footer">
          <button
            className="pf-drawer__refresh"
            onClick={refetch}
            disabled={loading}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              width="13"
              height="13"
              className={loading ? "pf-spin" : ""}
            >
              <path
                d="M13.5 8A5.5 5.5 0 112.5 5.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <path
                d="M2.5 2v3.5H6"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <span className="pf-drawer__footer-note">Data via Helius</span>
        </div>
      </aside>
    </>
  );
}
