"use client";

import { useState } from "react";
import {
  useSwapSettings,
  PERP_PROVIDER_META,
} from "@/context/SwapSettingsContext";
import { usePerpQuote } from "@/hooks/usePerpQuote";
import { usePerpExecute } from "@/hooks/usePerpExecute";
import { PerpQuoteDetails } from "./PerpQuoteDetails";
import { PerpMarketUnsupported } from "./PerpMarketUnsupported";

// ── Supported markets per provider ────────────────────────────────────────────

export const ADRENA_MARKETS = ["SOL", "BTC", "ETH", "BONK", "JTO"] as const;

// Flash Trade supports 11 markets — listing the ones matching common symbols
export const FLASH_MARKETS = [
  "SOL",
  "BTC",
  "ETH",
  "BONK",
  "JTO",
  "WIF",
  "PYTH",
  "JUP",
  "TNSR",
  "WEN",
  "BOME",
] as const;

type AdrenaMarket = (typeof ADRENA_MARKETS)[number];
type FlashMarket = (typeof FLASH_MARKETS)[number];

const LEVERAGE_MIN = 1;
const LEVERAGE_MAX = 50;

// ── Types ─────────────────────────────────────────────────────────────────────

interface PerpSwapProps {
  tokenSymbol?: string;
  tokenName: string;
  walletAddress: string | null;
  onConnectWallet: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSupportedMarket(
  symbol: string,
  provider: "adrena" | "flash",
): boolean {
  const upper = symbol.toUpperCase();
  if (provider === "adrena")
    return ADRENA_MARKETS.includes(upper as AdrenaMarket);
  return FLASH_MARKETS.includes(upper as FlashMarket);
}

function getCollateralToken(side: "long" | "short", market: string): string {
  return side === "short" ? "USDC" : market;
}

function getSupportedMarkets(provider: "adrena" | "flash"): string[] {
  return provider === "adrena" ? [...ADRENA_MARKETS] : [...FLASH_MARKETS];
}

// ── Leverage slider ───────────────────────────────────────────────────────────

function LeverageSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const presets = [2, 5, 10, 25, 50];
  const pct = ((value - LEVERAGE_MIN) / (LEVERAGE_MAX - LEVERAGE_MIN)) * 100;

  return (
    <div className="sw-perp-leverage">
      <div className="sw-perp-leverage__hdr">
        <span className="sw-perp-leverage__label">Leverage</span>
        <span className="sw-perp-leverage__value">{value}×</span>
      </div>
      <div className="sw-perp-leverage__track-wrap">
        <div className="sw-perp-leverage__fill" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={LEVERAGE_MIN}
          max={LEVERAGE_MAX}
          step={0.5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="sw-perp-leverage__range"
        />
      </div>
      <div className="sw-perp-leverage__presets">
        {presets.map((p) => (
          <button
            key={p}
            className={`sw-perp-leverage__preset ${value === p ? "sw-perp-leverage__preset--active" : ""}`}
            onClick={() => onChange(p)}
          >
            {p}×
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PerpSwap({
  tokenSymbol,
  tokenName,
  walletAddress,
  onConnectWallet,
}: PerpSwapProps) {
  const { settings } = useSwapSettings();
  const perpProvider = settings.perpProvider;

  const normalizedSymbol = tokenSymbol?.toUpperCase() ?? "";
  const isSupported = normalizedSymbol
    ? isSupportedMarket(normalizedSymbol, perpProvider)
    : false;

  const providerMeta = PERP_PROVIDER_META[perpProvider];

  // Form state
  const [side, setSide] = useState<"long" | "short">("long");
  const [collateral, setCollateral] = useState("");
  const [leverage, setLeverage] = useState(5);
  const [takeProfit, setTakeProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [showTpSl, setShowTpSl] = useState(false);

  const collateralToken = getCollateralToken(side, normalizedSymbol);
  const collateralNum = parseFloat(collateral) || 0;
  const positionSize = collateralNum * leverage;

  // Quote — provider-aware
  const {
    quote,
    transaction,
    status: quoteStatus,
    error: quoteError,
    refetch,
  } = usePerpQuote({
    wallet: walletAddress,
    market: normalizedSymbol,
    side,
    collateral: collateralNum,
    collateralToken,
    leverage,
    takeProfit: takeProfit || undefined,
    stopLoss: stopLoss || undefined,
    perpProvider,
  });

  // Execute hook (same for all providers — signs + sends base64 tx)
  const {
    open,
    status: execStatus,
    txSignature,
    error: execError,
    reset: resetExec,
  } = usePerpExecute();

  const handleOpen = async () => {
    if (!transaction) return;
    resetExec();
    const sig = await open(transaction);
    if (sig) {
      setTimeout(() => {
        setCollateral("");
        setTakeProfit("");
        setStopLoss("");
        refetch();
      }, 3000);
    }
  };

  const isExecuting = ["signing", "sending", "confirming"].includes(execStatus);
  const canOpen =
    !!walletAddress &&
    quoteStatus === "ready" &&
    !!quote &&
    !!transaction &&
    collateralNum > 0 &&
    !isExecuting;

  const btnLabel = () => {
    if (execStatus === "signing") return "Check wallet…";
    if (execStatus === "sending") return "Sending…";
    if (execStatus === "confirming") return "Confirming…";
    if (execStatus === "confirmed") return "✓ Position opened";
    if (quoteStatus === "loading") return "Fetching quote…";
    if (!collateral || collateralNum <= 0) return "Enter collateral";
    if (quoteStatus === "error") return "Retry quote";
    return `${side === "long" ? "▲ Open Long" : "▼ Open Short"} · ${normalizedSymbol}-PERP`;
  };

  // ── Unsupported market ────────────────────────────────────────────────────
  if (!isSupported) {
    return (
      <PerpMarketUnsupported
        tokenSymbol={tokenSymbol}
        tokenName={tokenName}
        supportedMarkets={getSupportedMarkets(perpProvider)}
        providerName={providerMeta.label}
      />
    );
  }

  // ── Not connected ─────────────────────────────────────────────────────────
  if (!walletAddress) {
    return (
      <div className="sw-perp-connect">
        <div className="sw-perp-connect__icon" aria-hidden>
          <svg viewBox="0 0 48 48" fill="none" width="36" height="36">
            <rect
              x="4"
              y="20"
              width="40"
              height="8"
              rx="4"
              fill="var(--tc-accent)"
              opacity="0.12"
            />
            <path
              d="M4 24h40M24 8v32"
              stroke="var(--tc-accent)"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.5"
            />
            <circle
              cx="24"
              cy="24"
              r="5"
              fill="var(--tc-accent)"
              opacity="0.8"
            />
          </svg>
        </div>
        <p className="sw-perp-connect__title">
          Trade {normalizedSymbol}-PERP with leverage
        </p>
        <p className="sw-perp-connect__sub">
          Long or short {normalizedSymbol} up to {LEVERAGE_MAX}× on{" "}
          {providerMeta.label}. Connect your wallet to get started.
        </p>
        <button className="sw-connect-btn" onClick={onConnectWallet}>
          <svg viewBox="0 0 20 20" fill="none" width="15" height="15">
            <path
              d="M17 10.5V14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M13 3h4m0 0v4m0-4L10 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Connect Wallet
        </button>
        <p className="sw-perp-connect__powered">
          Powered by{" "}
          <span className="sw-perp-connect__badge">{providerMeta.label}</span>
        </p>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <div className="sw-perp-form">
      {/* Market + provider label */}
      <div className="sw-perp-form__market">
        <span className="sw-perp-form__market-name">
          {normalizedSymbol}-PERP
        </span>
        <span
          className={`sw-perp-form__market-provider ${perpProvider === "flash" ? "sw-perp-form__market-provider--flash" : ""}`}
        >
          {providerMeta.label}
          {providerMeta.badge === "New" && (
            <span className="sw-perp-form__market-provider-new">New</span>
          )}
        </span>
      </div>

      {/* Long / Short toggle */}
      <div className="sw-perp-form__sides">
        {(["long", "short"] as const).map((s) => (
          <button
            key={s}
            className={`sw-perp-form__side ${
              side === s
                ? s === "long"
                  ? "sw-perp-form__side--long-active"
                  : "sw-perp-form__side--short-active"
                : "sw-perp-form__side--inactive"
            }`}
            onClick={() => setSide(s)}
          >
            <span className="sw-perp-form__side-arrow">
              {s === "long" ? "▲" : "▼"}
            </span>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Collateral input */}
      <div className="sw-perp-form__field">
        <div className="sw-perp-form__field-hdr">
          <span className="sw-perp-form__field-label">
            Collateral ({collateralToken})
          </span>
          {positionSize > 0 && (
            <span className="sw-perp-form__field-hint">
              Size: $
              {positionSize.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}
            </span>
          )}
        </div>
        <div className="sw-perp-form__input-row">
          <input
            type="number"
            min="0"
            step="1"
            placeholder="0.00"
            className="sw-perp-form__input"
            value={collateral}
            onChange={(e) => setCollateral(e.target.value)}
          />
          <span className="sw-perp-form__input-token">{collateralToken}</span>
        </div>
      </div>

      {/* Leverage */}
      <LeverageSlider value={leverage} onChange={setLeverage} />

      {/* TP / SL toggle */}
      <button
        className="sw-perp-form__tpsl-toggle"
        onClick={() => setShowTpSl((v) => !v)}
      >
        <svg
          viewBox="0 0 14 14"
          fill="none"
          width="11"
          height="11"
          style={{
            transform: showTpSl ? "rotate(180deg)" : "none",
            transition: "transform 160ms",
          }}
        >
          <path
            d="M2 5l5 4 5-4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {showTpSl ? "Hide" : "Add"} Take Profit / Stop Loss
      </button>

      {showTpSl && (
        <div className="sw-perp-form__tpsl">
          <div className="sw-perp-form__field">
            <label className="sw-perp-form__field-label sw-perp-form__field-label--tp">
              Take Profit (USDC)
            </label>
            <input
              type="number"
              placeholder="Optional"
              className="sw-perp-form__input sw-perp-form__input--tp"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
            />
          </div>
          <div className="sw-perp-form__field">
            <label className="sw-perp-form__field-label sw-perp-form__field-label--sl">
              Stop Loss (USDC)
            </label>
            <input
              type="number"
              placeholder="Optional"
              className="sw-perp-form__input sw-perp-form__input--sl"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Quote details */}
      {quoteStatus === "ready" && quote && (
        <PerpQuoteDetails
          quote={quote}
          positionSize={positionSize}
          side={side}
        />
      )}

      {/* Quote loading */}
      {quoteStatus === "loading" && (
        <div className="sw-perp-quote-loading">
          <span className="sw-spinner sw-spinner--dark" aria-hidden />
          <span>Fetching quote…</span>
        </div>
      )}

      {/* Errors */}
      {(quoteError || execError) && (
        <div className="sw-error">
          <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
            <circle
              cx="7"
              cy="7"
              r="6"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M7 4.5v3M7 9.5v.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          {quoteError ?? execError}
        </div>
      )}

      {/* Success */}
      {execStatus === "confirmed" && txSignature && (
        <div className="sw-success">
          <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
            <circle
              cx="7"
              cy="7"
              r="6"
              stroke="var(--tc-accent-up)"
              strokeWidth="1.2"
            />
            <path
              d="M4.5 7l2 2 3.5-4"
              stroke="var(--tc-accent-up)"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Position opened!{" "}
          <a
            href={`https://solscan.io/tx/${txSignature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="sw-success__link"
          >
            View tx ↗
          </a>
        </div>
      )}

      {/* CTA */}
      <button
        className={`sw-perp-form__btn ${
          side === "long"
            ? "sw-perp-form__btn--long"
            : "sw-perp-form__btn--short"
        } ${isExecuting || execStatus === "confirmed" ? "sw-perp-form__btn--busy" : ""}`}
        disabled={!canOpen}
        onClick={handleOpen}
      >
        {isExecuting && <span className="sw-spinner" aria-hidden />}
        {btnLabel()}
      </button>

      {/* Footer */}
      <p className="sw-perp-form__footer">
        Powered by{" "}
        <span className="sw-perp-form__footer-badge">{providerMeta.label}</span>{" "}
        · Quote refreshes automatically
      </p>
    </div>
  );
}
