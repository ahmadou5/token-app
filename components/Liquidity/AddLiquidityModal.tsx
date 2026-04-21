"use client";

/**
 * AddLiquidityModal — unified routing modal
 *
 * Reads market.source → resolveProtocol() → renders the correct
 * sub-form and calls the correct hook.
 *
 * Protocol coverage:
 *   Raydium CLMM   → price range + ticks   (useRaydiumCLMM)
 *   Orca           → price range + ticks   (useOrcaWhirlpool)
 *   Meteora DLMM   → bin range + strategy  (useMeteoraDLMM)
 *   Meteora DAMM   → simple two-sided      (useMeteoraDynamicAMM)
 *   Pump AMM       → simple two-sided      (useMeteoraDynamicAMM)
 *   Stake Pool     → single-sided SOL      (useStakePoolDeposit)
 *   Sanctum        → single-sided SOL      (useStakePoolDeposit)
 */
export interface OrcaResult {
  signature: string;
  positionMint: string;
}

export interface OrcaHookState {
  status: OrcaStatus;
  error: string | null;
  result: OrcaResult | null;
  openPosition: (params: OrcaOpenPositionParams) => Promise<OrcaResult>;
  reset: () => void;
}

import { useState, useEffect, useRef, useCallback } from "react";
import type { MarketEntry } from "@/types/token.types";
import { resolveProtocol } from "@/lib/marketProtocol";
import { useRaydiumCLMM } from "@/hooks/useRaydiumClmm";
import {
  OrcaOpenPositionParams,
  OrcaStatus,
  useOrcaWhirlpool,
} from "@/hooks/useOrcaWhirlPool";
import { useMeteoraDLMM, useMeteoraDynamicAMM } from "@/hooks/useMeteoraDLMM";
import { useStakePoolDeposit } from "@/hooks/useStakePoolDeposit";
import {
  useCluster,
  useKitTransactionSigner,
  useSolanaClient,
  useWallet,
} from "@solana/connector";
import Image from "next/image";

// ── Wallet context stub (replace with your actual hook) ──────────────────────
function useWalletContext() {
  const { account } = useWallet();
  const { signer, ready: signerReady } = useKitTransactionSigner();
  const { client } = useSolanaClient();

  return {
    signer: signer ?? null,
    rpc: client?.rpc ?? null,
    rpcSubscriptions: client?.rpcSubscriptions ?? null,
    publicKey: account ?? null,
  };
}

// ── Tick math ─────────────────────────────────────────────────────────────────
function priceToTick(price: number): number {
  return Math.floor(Math.log(price) / Math.log(1.0001));
}
function snapTick(tick: number, spacing: number): number {
  return Math.round(tick / spacing) * spacing;
}
const TICK_SPACING = 64;

function toRaw(humanAmount: string, decimals: number): bigint {
  const n = parseFloat(humanAmount);
  if (isNaN(n) || n <= 0) return BigInt(0);
  return BigInt(Math.round(n * 10 ** decimals));
}

// ─── Sub-form: Concentrated Liquidity ────────────────────────────────────────
interface CLFormState {
  minPrice: string;
  maxPrice: string;
  amountA: string;
  amountB: string;
  slippage: string;
}

function CLForm({
  market,
  currentPrice,
  disabled,
  value,
  onChange,
}: {
  market: MarketEntry;
  currentPrice: number;
  disabled: boolean;
  value: CLFormState;
  onChange: (s: CLFormState) => void;
}) {
  const bSym = market.base?.symbol ?? "Token A";
  const qSym = market.quote?.symbol ?? "Token B";
  const set =
    (k: keyof CLFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [k]: e.target.value });
  return (
    <>
      <div className="alm-section">
        <p className="alm-label">
          Price Range ({qSym} per {bSym})
        </p>
        <div className="alm-range-row">
          {(["minPrice", "maxPrice"] as const).map((key, i) => (
            <div key={key} className="alm-range-field">
              <span className="alm-range-field__label">
                {i === 0 ? "Min" : "Max"}
              </span>
              <input
                className="alm-input"
                type="number"
                step="any"
                min="0"
                value={value[key]}
                onChange={set(key)}
                disabled={disabled}
                placeholder="0.0"
              />
              <span className="alm-range-field__tick">
                ≈ tick{" "}
                {snapTick(
                  priceToTick(parseFloat(value[key]) || 1),
                  TICK_SPACING,
                )}
              </span>
            </div>
          ))}
        </div>
        <div className="alm-presets">
          {[
            { label: "±10%", min: 0.9, max: 1.1 },
            { label: "±25%", min: 0.75, max: 1.25 },
            { label: "±50%", min: 0.5, max: 1.5 },
          ].map(({ label, min, max }) => (
            <button
              key={label}
              className="alm-preset-btn"
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...value,
                  minPrice: (currentPrice * min).toFixed(6),
                  maxPrice: (currentPrice * max).toFixed(6),
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="alm-section">
        <p className="alm-label">Deposit Amounts</p>
        {[
          { key: "amountA" as const, sym: bSym, icon: market.base?.icon },
          { key: "amountB" as const, sym: qSym, icon: market.quote?.icon },
        ].map(({ key, sym, icon }) => (
          <div
            key={key}
            className="alm-amount-field"
            style={key === "amountB" ? { marginTop: 8 } : {}}
          >
            <div className="alm-amount-field__token">
              {icon && (
                <img src={icon} alt={sym} className="alm-amount-field__icon" />
              )}
              <span>{sym}</span>
            </div>
            <input
              className="alm-input alm-input--amount"
              type="number"
              step="any"
              min="0"
              value={value[key]}
              onChange={set(key)}
              disabled={disabled}
              placeholder="0.00"
            />
          </div>
        ))}
      </div>
      <SlippageRow
        value={value.slippage}
        disabled={disabled}
        onChange={(s) => onChange({ ...value, slippage: s })}
      />
    </>
  );
}

// ─── Sub-form: Meteora DLMM ───────────────────────────────────────────────────
interface DLMMFormState {
  binRange: string;
  amountX: string;
  amountY: string;
  strategy: "spot" | "curve" | "bid_ask";
}

function DLMMForm({
  market,
  disabled,
  value,
  onChange,
}: {
  market: MarketEntry;
  disabled: boolean;
  value: DLMMFormState;
  onChange: (s: DLMMFormState) => void;
}) {
  const xSym = market.base?.symbol ?? "Token X";
  const ySym = market.quote?.symbol ?? "Token Y";
  return (
    <>
      <div className="alm-section">
        <p className="alm-label">Bin Range (each side of active bin)</p>
        <div className="alm-presets">
          {["5", "10", "20", "50"].map((v) => (
            <button
              key={v}
              className={`alm-preset-btn ${value.binRange === v ? "alm-preset-btn--active" : ""}`}
              disabled={disabled}
              onClick={() => onChange({ ...value, binRange: v })}
            >
              ±{v}
            </button>
          ))}
        </div>
        <input
          className="alm-input"
          type="number"
          step="1"
          min="1"
          value={value.binRange}
          onChange={(e) => onChange({ ...value, binRange: e.target.value })}
          disabled={disabled}
          style={{ marginTop: 8 }}
        />
      </div>
      <div className="alm-section">
        <p className="alm-label">Distribution Strategy</p>
        <div className="alm-presets">
          {(["spot", "curve", "bid_ask"] as const).map((s) => (
            <button
              key={s}
              className={`alm-preset-btn ${value.strategy === s ? "alm-preset-btn--active" : ""}`}
              disabled={disabled}
              onClick={() => onChange({ ...value, strategy: s })}
            >
              {s === "bid_ask"
                ? "Bid/Ask"
                : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="alm-section">
        <p className="alm-label">Deposit Amounts</p>
        {[
          { key: "amountX" as const, sym: xSym, icon: market.base?.icon },
          { key: "amountY" as const, sym: ySym, icon: market.quote?.icon },
        ].map(({ key, sym, icon }) => (
          <div
            key={key}
            className="alm-amount-field"
            style={key === "amountY" ? { marginTop: 8 } : {}}
          >
            <div className="alm-amount-field__token">
              {icon && (
                <img src={icon} alt={sym} className="alm-amount-field__icon" />
              )}
              <span>{sym}</span>
            </div>
            <input
              className="alm-input alm-input--amount"
              type="number"
              step="any"
              min="0"
              value={value[key]}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              disabled={disabled}
              placeholder="0.00"
            />
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Sub-form: Simple two-sided ───────────────────────────────────────────────
interface SimpleFormState {
  amountA: string;
  amountB: string;
  slippage: string;
}

function SimpleForm({
  market,
  disabled,
  value,
  onChange,
}: {
  market: MarketEntry;
  disabled: boolean;
  value: SimpleFormState;
  onChange: (s: SimpleFormState) => void;
}) {
  const bSym = market.base?.symbol ?? "Token A";
  const qSym = market.quote?.symbol ?? "Token B";
  return (
    <>
      <div className="alm-section">
        <p className="alm-label">Deposit Amounts</p>
        {[
          { key: "amountA" as const, sym: bSym, icon: market.base?.icon },
          { key: "amountB" as const, sym: qSym, icon: market.quote?.icon },
        ].map(({ key, sym, icon }) => (
          <div
            key={key}
            className="alm-amount-field"
            style={key === "amountB" ? { marginTop: 8 } : {}}
          >
            <div className="alm-amount-field__token">
              {icon && (
                <img src={icon} alt={sym} className="alm-amount-field__icon" />
              )}
              <span>{sym}</span>
            </div>
            <input
              className="alm-input alm-input--amount"
              type="number"
              step="any"
              min="0"
              value={value[key]}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              disabled={disabled}
              placeholder="0.00"
            />
          </div>
        ))}
      </div>
      <SlippageRow
        value={value.slippage}
        disabled={disabled}
        onChange={(s) => onChange({ ...value, slippage: s })}
      />
    </>
  );
}

// ─── Sub-form: Single-sided stake ─────────────────────────────────────────────
function StakeForm({
  market,
  disabled,
  value,
  onChange,
}: {
  market: MarketEntry;
  disabled: boolean;
  value: { amountSOL: string };
  onChange: (s: { amountSOL: string }) => void;
}) {
  const lstSym = market.base?.symbol ?? market.quote?.symbol ?? "LST";
  const lstIcon = market.base?.icon ?? market.quote?.icon;
  const rate = market.price ?? 1;
  const estimatedLST =
    parseFloat(value.amountSOL) > 0
      ? (parseFloat(value.amountSOL) / rate).toFixed(6)
      : null;
  return (
    <div className="alm-section">
      <p className="alm-label">Deposit SOL</p>
      <div className="alm-amount-field">
        <div className="alm-amount-field__token">
          <img
            src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
            alt="SOL"
            className="alm-amount-field__icon"
          />
          <span>SOL</span>
        </div>
        <input
          className="alm-input alm-input--amount"
          type="number"
          step="any"
          min="0"
          value={value.amountSOL}
          onChange={(e) => onChange({ amountSOL: e.target.value })}
          disabled={disabled}
          placeholder="0.00"
        />
      </div>
      {estimatedLST && (
        <div className="alm-stake-estimate">
          <span>You receive approximately</span>
          <span className="alm-stake-estimate__amount">
            {estimatedLST}
            {lstIcon && (
              <img
                src={lstIcon}
                alt={lstSym}
                className="alm-amount-field__icon"
                style={{ marginLeft: 4 }}
              />
            )}{" "}
            {lstSym}
          </span>
          <span className="alm-stake-estimate__rate">
            1 {lstSym} ≈ {rate.toFixed(4)} SOL
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Shared slippage ──────────────────────────────────────────────────────────
function SlippageRow({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="alm-section alm-section--row">
      <p className="alm-label">Slippage</p>
      <div className="alm-slip-row">
        {["0.5", "1", "2"].map((v) => (
          <button
            key={v}
            className={`alm-slip-btn ${value === v ? "alm-slip-btn--active" : ""}`}
            disabled={disabled}
            onClick={() => onChange(v)}
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
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
          <span className="alm-slip-pct">%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Success ──────────────────────────────────────────────────────────────────
function SuccessScreen({
  signature,
  positionMint,
  onClose,
}: {
  signature: string;
  positionMint?: string;
  onClose: () => void;
}) {
  return (
    <div className="alm-success">
      <div className="alm-success__icon">✓</div>
      <p className="alm-success__title">Transaction Confirmed!</p>
      <p className="alm-success__label">Transaction</p>
      <a
        className="alm-success__link"
        href={`https://solscan.io/tx/${signature}`}
        target="_blank"
        rel="noreferrer"
      >
        {signature.slice(0, 16)}…{signature.slice(-8)}
      </a>
      {positionMint && positionMint !== "unknown" && (
        <>
          <p className="alm-success__label" style={{ marginTop: 8 }}>
            Position NFT
          </p>
          <p className="alm-success__addr">{positionMint}</p>
        </>
      )}
      <button
        className="alm-btn alm-btn--primary alm-success__close"
        onClick={onClose}
      >
        Done
      </button>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  building: "Building transaction…",
  signing: "Waiting for signature…",
  sending: "Sending…",
  confirmed: "Confirmed!",
  error: "Failed",
};

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function AddLiquidityModal({
  market,
  onClose,
}: {
  market: MarketEntry;
  onClose: () => void;
}) {
  const protocol = resolveProtocol(market.source);
  const { signer, rpc, rpcSubscriptions, publicKey } = useWalletContext();
  const overlayRef = useRef<HTMLDivElement>(null);

  const clmm = useRaydiumCLMM();
  const orca = useOrcaWhirlpool();
  const dlmm = useMeteoraDLMM();
  const damm = useMeteoraDynamicAMM();
  const stake = useStakePoolDeposit();

  const currentPrice = market.price ?? 1;

  const [clState, setClState] = useState<CLFormState>({
    minPrice: (currentPrice * 0.8).toFixed(6),
    maxPrice: (currentPrice * 1.25).toFixed(6),
    amountA: "",
    amountB: "",
    slippage: "1",
  });
  const [dlmmState, setDlmmState] = useState<DLMMFormState>({
    binRange: "10",
    amountX: "",
    amountY: "",
    strategy: "spot",
  });
  const [simpleState, setSimpleState] = useState<SimpleFormState>({
    amountA: "",
    amountB: "",
    slippage: "1",
  });
  const [stakeState, setStakeState] = useState({ amountSOL: "" });
  const [validationError, setValidationError] = useState<string | null>(null);

  const activeHook = (() => {
    switch (protocol.kind) {
      case "raydium_clmm":
        return clmm;
      case "orca_whirlpool":
        return orca;
      case "meteora_dlmm":
        return dlmm;
      case "meteora_damm":
      case "pump_amm":
        return damm;
      case "stake_pool":
      case "sanctum":
        return stake;
      default:
        return null;
    }
  })();

  const status = activeHook?.status ?? "idle";
  const hookError = activeHook?.error ?? null;
  const hookResult = (activeHook?.result ?? null) as {
    signature: string;
    positionMint?: string;
  } | null;
  const busy = ["building", "signing", "sending"].includes(status);
  const done = status === "confirmed";

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(
    () => () => {
      activeHook?.reset?.();
    },
    [],
  );

  const handleSubmit = async () => {
    setValidationError(null);
    if (!signer || !rpc || !rpcSubscriptions || !publicKey) {
      setValidationError("Wallet not connected");
      return;
    }
    const baseCtx = { userPublicKey: publicKey, signer, rpc, rpcSubscriptions };
    const decimalsA = market.base?.decimals ?? 6;
    const decimalsB = market.quote?.decimals ?? 6;
    try {
      switch (protocol.kind) {
        case "raydium_clmm": {
          const min = parseFloat(clState.minPrice),
            max = parseFloat(clState.maxPrice);
          if (isNaN(min) || isNaN(max) || max <= min) {
            setValidationError("Invalid price range");
            return;
          }
          if (!clState.amountA) {
            setValidationError("Enter an amount");
            return;
          }
          await clmm.openPosition({
            ...baseCtx,
            poolId: market.address,
            tickLower: snapTick(priceToTick(min), TICK_SPACING),
            tickUpper: snapTick(priceToTick(max), TICK_SPACING),
            amountA: toRaw(clState.amountA, decimalsA),
            amountBMax: toRaw(clState.amountB, decimalsB),
            slippagePct: parseFloat(clState.slippage) || 1,
          });
          break;
        }
        case "orca_whirlpool": {
          const min = parseFloat(clState.minPrice),
            max = parseFloat(clState.maxPrice);
          if (isNaN(min) || isNaN(max) || max <= min) {
            setValidationError("Invalid price range");
            return;
          }
          if (!clState.amountA) {
            setValidationError("Enter an amount");
            return;
          }
          await orca.openPosition({
            ...baseCtx,
            poolAddress: market.address,
            tickLower: snapTick(priceToTick(min), TICK_SPACING),
            tickUpper: snapTick(priceToTick(max), TICK_SPACING),
            amountA: toRaw(clState.amountA, decimalsA),
            slippagePct: parseFloat(clState.slippage) || 1,
          });
          break;
        }
        case "meteora_dlmm": {
          if (!dlmmState.amountX && !dlmmState.amountY) {
            setValidationError("Enter at least one amount");
            return;
          }
          await dlmm.addLiquidity({
            ...baseCtx,
            poolAddress: market.address,
            binRange: parseInt(dlmmState.binRange) || 10,
            strategy: dlmmState.strategy,
            amountX: toRaw(dlmmState.amountX, decimalsA),
            amountY: toRaw(dlmmState.amountY, decimalsB),
          });
          break;
        }
        case "meteora_damm":
        case "pump_amm": {
          if (!simpleState.amountA || !simpleState.amountB) {
            setValidationError("Enter both amounts");
            return;
          }
          await damm.addLiquidity({
            ...baseCtx,
            poolAddress: market.address,
            amountA: toRaw(simpleState.amountA, decimalsA),
            amountB: toRaw(simpleState.amountB, decimalsB),
            slippagePct: parseFloat(simpleState.slippage) || 1,
          });
          break;
        }
        case "stake_pool":
        case "sanctum": {
          if (!stakeState.amountSOL || parseFloat(stakeState.amountSOL) <= 0) {
            setValidationError("Enter SOL amount");
            return;
          }
          await stake.deposit({
            ...baseCtx,
            poolAddress: market.address,
            lamports: BigInt(
              Math.round(parseFloat(stakeState.amountSOL) * 1e9),
            ),
          });
          break;
        }
      }
    } catch {
      /* error is in hook.error */
    }
  };

  const bSym = market.base?.symbol ?? "Token A";
  const qSym = market.quote?.symbol ?? "Token B";

  return (
    <div className="alm-overlay" ref={overlayRef}>
      <div className="alm-modal" role="dialog" aria-modal="true">
        {/* Header */}
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
              <p
                className="alm-header__source"
                style={{ color: protocol.color }}
              >
                {protocol.label}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a
              href={protocol.explorerUrl(market.address)}
              target="_blank"
              rel="noreferrer"
              className="alm-ext-link"
              title={`Open on ${protocol.label}`}
            >
              <svg viewBox="0 0 12 12" fill="none" width="13" height="13">
                <path
                  d="M2 10L10 2M10 2H5M10 2v5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
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
        </div>

        {/* Body */}
        {done && hookResult?.signature ? (
          <SuccessScreen
            signature={hookResult.signature}
            positionMint={hookResult?.positionMint}
            onClose={onClose}
          />
        ) : (
          <div className="alm-body">
            {(protocol.kind === "raydium_clmm" ||
              protocol.kind === "orca_whirlpool") && (
              <CLForm
                market={market}
                currentPrice={currentPrice}
                disabled={busy}
                value={clState}
                onChange={setClState}
              />
            )}
            {protocol.kind === "meteora_dlmm" && (
              <DLMMForm
                market={market}
                disabled={busy}
                value={dlmmState}
                onChange={setDlmmState}
              />
            )}
            {(protocol.kind === "meteora_damm" ||
              protocol.kind === "pump_amm") && (
              <SimpleForm
                market={market}
                disabled={busy}
                value={simpleState}
                onChange={setSimpleState}
              />
            )}
            {(protocol.kind === "stake_pool" ||
              protocol.kind === "sanctum") && (
              <StakeForm
                market={market}
                disabled={busy}
                value={stakeState}
                onChange={setStakeState}
              />
            )}
            {protocol.kind === "unsupported" && (
              <div className="alm-unsupported">
                <p>
                  Adding liquidity to <strong>{market.source}</strong> pools is
                  not yet supported.
                </p>
                <a
                  href={protocol.explorerUrl(market.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="alm-btn alm-btn--outline"
                >
                  Open on Explorer →
                </a>
              </div>
            )}
            {(validationError ?? hookError) && (
              <div className="alm-error">{validationError ?? hookError}</div>
            )}
            {busy && (
              <div className="alm-status">
                <span className="alm-status__dot" />
                {STATUS_LABELS[status] ?? status}
              </div>
            )}
            {protocol.canAddLiquidity && (
              <button
                className="alm-btn alm-btn--primary alm-btn--full"
                onClick={handleSubmit}
                disabled={busy}
                style={
                  protocol.color !== "#9945FF"
                    ? {
                        background: `linear-gradient(135deg, ${protocol.color} 0%, ${protocol.color}bb 100%)`,
                      }
                    : undefined
                }
              >
                {busy
                  ? (STATUS_LABELS[status] ?? "Processing…")
                  : `Add Liquidity`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
