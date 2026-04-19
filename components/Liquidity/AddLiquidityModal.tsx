"use client";

/**
 * AddLiquidityModal
 *
 * Opens a Raydium CLMM position for a specific market.
 * Consumes useRaydiumCLMM hook and uses Solana Kit signer / rpc
 * from your existing wallet/rpc context (adjust imports to match
 * your project's context hooks).
 *
 * Props:
 *   market   — the MarketEntry row the user clicked "Add Liquidity" on
 *   onClose  — dismiss callback
 *
 * Tick math:
 *   Raydium CLMM ticks = log(price) / log(1.0001).
 *   We expose a price-range UI and convert to ticks internally.
 */

import { useState, useEffect, useRef } from "react";
import type { MarketEntry } from "@/types/token.types";
import { useRaydiumCLMM, type CLMMStatus } from "@/hooks/useRaydiumClmm";
import {
  useKitTransactionSigner,
  useSolanaClient,
  useWallet,
} from "@solana/connector";

// ── Adjust these imports to your project's wallet / rpc context ──────────────
// e.g. import { useWalletKit } from "@/context/WalletKitContext";
// For now we read them from window globals so the file compiles standalone.
function useWalletContext() {
  const { account } = useWallet();
  const { signer, ready: signerReady } = useKitTransactionSigner();
  const { client } = useSolanaClient();

  return {
    signer: signerReady ? signer : null,
    rpc: client?.rpc ?? null,
    rpcSubscriptions: client?.rpcSubscriptions ?? null,
    publicKey: account,
  };
}
// ─────────────────────────────────────────────────────────────────────────────

interface AddLiquidityModalProps {
  market: MarketEntry;
  onClose: () => void;
}

/** price → CLMM tick (Raydium uses 1.0001 per tick) */
function priceToTick(price: number): number {
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

/** tick → price */
function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}

/** Round tick to nearest tick-spacing multiple */
function snapTick(tick: number, spacing: number): number {
  return Math.round(tick / spacing) * spacing;
}

const STATUS_LABEL: Record<CLMMStatus, string> = {
  idle: "",
  building: "Building transaction…",
  signing: "Waiting for signature…",
  sending: "Sending to network…",
  confirmed: "Position opened! 🎉",
  error: "Transaction failed",
};

const TICK_SPACING = 64; // Raydium CLMM default for standard pools

export function AddLiquidityModal({ market, onClose }: AddLiquidityModalProps) {
  const { signer, rpc, rpcSubscriptions, publicKey } = useWalletContext();
  const { openPosition, status, error, result, reset } = useRaydiumCLMM();

  // Estimate current price from pool if available, else default to 1
  const [currentPrice] = useState<number>(1);

  const [minPrice, setMinPrice] = useState<string>(
    (currentPrice * 0.8).toFixed(6),
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    (currentPrice * 1.25).toFixed(6),
  );
  const [amountA, setAmountA] = useState<string>("");
  const [amountB, setAmountB] = useState<string>("");
  const [slippage, setSlippage] = useState<string>("1");
  const [validationError, setValidationError] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on overlay click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.target === overlayRef.current) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Reset on unmount
  useEffect(() => () => reset(), [reset]);

  function validate(): boolean {
    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    const a = parseFloat(amountA);
    const b = parseFloat(amountB);
    const slip = parseFloat(slippage);

    if (isNaN(min) || min <= 0) {
      setValidationError("Min price must be a positive number");
      return false;
    }
    if (isNaN(max) || max <= min) {
      setValidationError("Max price must be greater than min price");
      return false;
    }
    if (isNaN(a) || a <= 0) {
      setValidationError(
        `${market.base?.symbol ?? "Token A"} amount must be > 0`,
      );
      return false;
    }
    if (isNaN(b) || b <= 0) {
      setValidationError(
        `${market.quote?.symbol ?? "Token B"} amount must be > 0`,
      );
      return false;
    }
    if (isNaN(slip) || slip < 0 || slip > 50) {
      setValidationError("Slippage must be between 0 and 50%");
      return false;
    }
    if (!signer || !rpc || !rpcSubscriptions || !publicKey) {
      setValidationError("Wallet not connected");
      return false;
    }
    setValidationError(null);
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;

    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    const slip = parseFloat(slippage);

    // Convert price range → ticks
    const tickLower = snapTick(priceToTick(min), TICK_SPACING);
    const tickUpper = snapTick(priceToTick(max), TICK_SPACING);

    // Convert human amounts → raw (assume 6 decimals for USDC-like tokens,
    // 9 for SOL-native tokens — adjust per your token decimals source)
    const decimalsA = market.base?.decimals ?? 6;
    const decimalsB = market.quote?.decimals ?? 6;
    const rawA = BigInt(Math.round(parseFloat(amountA) * 10 ** decimalsA));
    const rawB = BigInt(Math.round(parseFloat(amountB) * 10 ** decimalsB));

    await openPosition({
      poolId: market.address,
      tickLower,
      tickUpper,
      amountA: rawA,
      amountB: rawB,
      slippagePct: slip,
      userPublicKey: publicKey as string,
      signer,
      rpc,
      rpcSubscriptions,
    });
  }

  const busy =
    status === "building" || status === "signing" || status === "sending";
  const done = status === "confirmed";

  const bSym = market.base?.symbol ?? "Token A";
  const qSym = market.quote?.symbol ?? "Token B";

  return (
    <div className="alm-overlay" ref={overlayRef}>
      <div
        className="alm-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add Liquidity"
      >
        {/* ── Header ── */}
        <div className="alm-header">
          <div className="alm-header__left">
            <div className="alm-header__icons">
              {market.base?.icon && (
                <img
                  src={market.base.icon}
                  alt={bSym}
                  className="alm-header__icon"
                />
              )}
              {market.quote?.icon && (
                <img
                  src={market.quote.icon}
                  alt={qSym}
                  className="alm-header__icon alm-header__icon--offset"
                />
              )}
            </div>
            <div>
              <p className="alm-header__pair">
                {bSym} <span className="alm-header__slash">/</span> {qSym}
              </p>
              <p className="alm-header__source">
                Raydium CLMM · {market.source ?? "CLMM"}
              </p>
            </div>
          </div>
          <button className="alm-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 14 14" fill="none" width="14" height="14">
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        {done ? (
          <div className="alm-success">
            <div className="alm-success__icon">✓</div>
            <p className="alm-success__title">Position Opened!</p>
            {result && (
              <>
                <p className="alm-success__label">Transaction</p>
                <a
                  className="alm-success__link"
                  href={`https://solscan.io/tx/${result.signature}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {result.signature.slice(0, 16)}…{result.signature.slice(-8)}
                </a>
                {result.positionMint !== "unknown" && (
                  <>
                    <p className="alm-success__label" style={{ marginTop: 8 }}>
                      Position NFT
                    </p>
                    <p className="alm-success__addr">{result.positionMint}</p>
                  </>
                )}
              </>
            )}
            <button
              className="alm-btn alm-btn--primary alm-success__close"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <div className="alm-body">
            {/* Price Range */}
            <div className="alm-section">
              <p className="alm-label">
                Price Range ({qSym} per {bSym})
              </p>
              <div className="alm-range-row">
                <div className="alm-range-field">
                  <span className="alm-range-field__label">Min</span>
                  <input
                    className="alm-input"
                    type="number"
                    step="any"
                    min="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    disabled={busy}
                    placeholder="0.0"
                  />
                  <span className="alm-range-field__tick">
                    ≈ tick{" "}
                    {snapTick(
                      priceToTick(parseFloat(minPrice) || 1),
                      TICK_SPACING,
                    )}
                  </span>
                </div>
                <div className="alm-range-sep">—</div>
                <div className="alm-range-field">
                  <span className="alm-range-field__label">Max</span>
                  <input
                    className="alm-input"
                    type="number"
                    step="any"
                    min="0"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    disabled={busy}
                    placeholder="0.0"
                  />
                  <span className="alm-range-field__tick">
                    ≈ tick{" "}
                    {snapTick(
                      priceToTick(parseFloat(maxPrice) || 1),
                      TICK_SPACING,
                    )}
                  </span>
                </div>
              </div>

              {/* Quick range presets */}
              <div className="alm-presets">
                {[
                  { label: "±10%", min: 0.9, max: 1.1 },
                  { label: "±25%", min: 0.75, max: 1.25 },
                  { label: "±50%", min: 0.5, max: 1.5 },
                ].map(({ label, min, max }) => (
                  <button
                    key={label}
                    className="alm-preset-btn"
                    disabled={busy}
                    onClick={() => {
                      setMinPrice((currentPrice * min).toFixed(6));
                      setMaxPrice((currentPrice * max).toFixed(6));
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Deposit Amounts */}
            <div className="alm-section">
              <p className="alm-label">Deposit Amounts</p>
              <div className="alm-amount-field">
                <div className="alm-amount-field__token">
                  {market.base?.icon && (
                    <img
                      src={market.base.icon}
                      alt={bSym}
                      className="alm-amount-field__icon"
                    />
                  )}
                  <span>{bSym}</span>
                </div>
                <input
                  className="alm-input alm-input--amount"
                  type="number"
                  step="any"
                  min="0"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                  disabled={busy}
                  placeholder="0.00"
                />
              </div>
              <div className="alm-amount-field" style={{ marginTop: 8 }}>
                <div className="alm-amount-field__token">
                  {market.quote?.icon && (
                    <img
                      src={market.quote.icon}
                      alt={qSym}
                      className="alm-amount-field__icon"
                    />
                  )}
                  <span>{qSym}</span>
                </div>
                <input
                  className="alm-input alm-input--amount"
                  type="number"
                  step="any"
                  min="0"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                  disabled={busy}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Slippage */}
            <div className="alm-section alm-section--row">
              <p className="alm-label">Slippage Tolerance</p>
              <div className="alm-slip-row">
                {["0.5", "1", "2"].map((v) => (
                  <button
                    key={v}
                    className={`alm-slip-btn ${slippage === v ? "alm-slip-btn--active" : ""}`}
                    disabled={busy}
                    onClick={() => setSlippage(v)}
                  >
                    {v}%
                  </button>
                ))}
                <div className="alm-slip-custom">
                  <input
                    className="alm-input alm-input--slip"
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    disabled={busy}
                  />
                  <span className="alm-slip-pct">%</span>
                </div>
              </div>
            </div>

            {/* Errors */}
            {(validationError ?? error) && (
              <div className="alm-error">{validationError ?? error}</div>
            )}

            {/* Status bar */}
            {busy && (
              <div className="alm-status">
                <span className="alm-status__dot" />
                {STATUS_LABEL[status]}
              </div>
            )}

            {/* CTA */}
            <button
              className="alm-btn alm-btn--primary alm-btn--full"
              onClick={handleSubmit}
              disabled={busy}
            >
              {busy ? STATUS_LABEL[status] : "Add Liquidity"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
