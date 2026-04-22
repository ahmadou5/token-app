"use client";

/**
 * AddLiquidityCard — inline card version (replaces modal)
 *
 * Renders as a card matching the swap card style (.sw-card).
 * Shown/hidden by the parent (MarketsSection) via state toggle.
 * No overlay, no fixed positioning — fully inline and mobile-friendly.
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

import { useState, useEffect, useCallback } from "react";
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
  useKitTransactionSigner,
  useSolanaClient,
  useWallet,
} from "@solana/connector";

// ── Wallet context ────────────────────────────────────────────────────────────
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

// ─── Sub-forms (same logic, card-native styling) ──────────────────────────────

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
      <div className="alc-section">
        <p className="alc-label">
          Price Range ({qSym}/{bSym})
        </p>
        <div className="alc-range-row">
          {(["minPrice", "maxPrice"] as const).map((key, i) => (
            <div key={key} className="alc-range-field">
              <span className="alc-range-field__label">
                {i === 0 ? "Min" : "Max"}
              </span>
              <input
                className="alc-input"
                type="number"
                step="any"
                min="0"
                value={value[key]}
                onChange={set(key)}
                disabled={disabled}
                placeholder="0.0"
              />
              <span className="alc-range-field__tick">
                ≈ tick{" "}
                {snapTick(
                  priceToTick(parseFloat(value[key]) || 1),
                  TICK_SPACING,
                )}
              </span>
            </div>
          ))}
        </div>
        <div className="alc-presets">
          {[
            { label: "±10%", min: 0.9, max: 1.1 },
            { label: "±25%", min: 0.75, max: 1.25 },
            { label: "±50%", min: 0.5, max: 1.5 },
          ].map(({ label, min, max }) => (
            <button
              key={label}
              className="alc-preset-btn"
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

      <div className="alc-section">
        <p className="alc-label">Deposit Amounts</p>
        {[
          { key: "amountA" as const, sym: bSym, icon: market.base?.icon },
          { key: "amountB" as const, sym: qSym, icon: market.quote?.icon },
        ].map(({ key, sym, icon }) => (
          <div
            key={key}
            className="alc-amount-field"
            style={key === "amountB" ? { marginTop: 8 } : {}}
          >
            <div className="alc-amount-field__token">
              {icon && (
                <img src={icon} alt={sym} className="alc-amount-field__icon" />
              )}
              <span>{sym}</span>
            </div>
            <input
              className="alc-input alc-input--amount"
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
      <div className="alc-section">
        <p className="alc-label">Bin Range (each side)</p>
        <div className="alc-presets">
          {["5", "10", "20", "50"].map((v) => (
            <button
              key={v}
              className={`alc-preset-btn ${value.binRange === v ? "alc-preset-btn--active" : ""}`}
              disabled={disabled}
              onClick={() => onChange({ ...value, binRange: v })}
            >
              ±{v}
            </button>
          ))}
        </div>
        <input
          className="alc-input"
          type="number"
          step="1"
          min="1"
          value={value.binRange}
          onChange={(e) => onChange({ ...value, binRange: e.target.value })}
          disabled={disabled}
          style={{ marginTop: 8 }}
        />
      </div>
      <div className="alc-section">
        <p className="alc-label">Strategy</p>
        <div className="alc-presets">
          {(["spot", "curve", "bid_ask"] as const).map((s) => (
            <button
              key={s}
              className={`alc-preset-btn ${value.strategy === s ? "alc-preset-btn--active" : ""}`}
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
      <div className="alc-section">
        <p className="alc-label">Deposit Amounts</p>
        {[
          { key: "amountX" as const, sym: xSym, icon: market.base?.icon },
          { key: "amountY" as const, sym: ySym, icon: market.quote?.icon },
        ].map(({ key, sym, icon }) => (
          <div
            key={key}
            className="alc-amount-field"
            style={key === "amountY" ? { marginTop: 8 } : {}}
          >
            <div className="alc-amount-field__token">
              {icon && (
                <img src={icon} alt={sym} className="alc-amount-field__icon" />
              )}
              <span>{sym}</span>
            </div>
            <input
              className="alc-input alc-input--amount"
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
      <div className="alc-section">
        <p className="alc-label">Deposit Amounts</p>
        {[
          { key: "amountA" as const, sym: bSym, icon: market.base?.icon },
          { key: "amountB" as const, sym: qSym, icon: market.quote?.icon },
        ].map(({ key, sym, icon }) => (
          <div
            key={key}
            className="alc-amount-field"
            style={key === "amountB" ? { marginTop: 8 } : {}}
          >
            <div className="alc-amount-field__token">
              {icon && (
                <img src={icon} alt={sym} className="alc-amount-field__icon" />
              )}
              <span>{sym}</span>
            </div>
            <input
              className="alc-input alc-input--amount"
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
    <div className="alc-section">
      <p className="alc-label">Deposit SOL</p>
      <div className="alc-amount-field">
        <div className="alc-amount-field__token">
          <img
            src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
            alt="SOL"
            className="alc-amount-field__icon"
          />
          <span>SOL</span>
        </div>
        <input
          className="alc-input alc-input--amount"
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
        <div className="alc-stake-estimate">
          <span>You receive ≈</span>
          <span className="alc-stake-estimate__amount">
            {estimatedLST}{" "}
            {lstIcon && (
              <img
                src={lstIcon}
                alt={lstSym}
                className="alc-amount-field__icon"
                style={{ marginLeft: 4 }}
              />
            )}{" "}
            {lstSym}
          </span>
          <span className="alc-stake-estimate__rate">
            1 {lstSym} ≈ {rate.toFixed(4)} SOL
          </span>
        </div>
      )}
    </div>
  );
}

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
    <div className="alc-section alc-section--row">
      <p className="alc-label">Slippage</p>
      <div className="alc-slip-row">
        {["0.5", "1", "2"].map((v) => (
          <button
            key={v}
            className={`alc-slip-btn ${value === v ? "alc-slip-btn--active" : ""}`}
            disabled={disabled}
            onClick={() => onChange(v)}
          >
            {v}%
          </button>
        ))}
        <div className="alc-slip-custom">
          <input
            className="alc-input alc-input--slip"
            type="number"
            step="0.1"
            min="0"
            max="50"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
          <span className="alc-slip-pct">%</span>
        </div>
      </div>
    </div>
  );
}

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
    <div className="alc-success">
      <div className="alc-success__icon">
        <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
          <path
            d="M5 12l5 5L19 7"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="alc-success__title">Transaction Confirmed!</p>
      <p className="alc-success__label">Transaction</p>
      <a
        className="alc-success__link"
        href={`https://solscan.io/tx/${signature}`}
        target="_blank"
        rel="noreferrer"
      >
        {signature.slice(0, 16)}…{signature.slice(-8)}
      </a>
      {positionMint && positionMint !== "unknown" && (
        <>
          <p className="alc-success__label" style={{ marginTop: 8 }}>
            Position NFT
          </p>
          <p className="alc-success__addr">{positionMint}</p>
        </>
      )}
      <button
        className="alc-btn alc-btn--primary alc-success__close"
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

// ─── Main Card Component ───────────────────────────────────────────────────────
export function AddLiquidityCard({
  market,
  onClose,
}: {
  market: MarketEntry;
  onClose: () => void;
}) {
  const protocol = resolveProtocol(market.source);
  const { signer, rpc, rpcSubscriptions, publicKey } = useWalletContext();

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
    <div className="alc-card">
      {/* Card header — mirrors sw-tabs style */}
      <div className="alc-card__header">
        <div className="alc-card__pair">
          <div className="alc-card__icons">
            {market.base?.icon && (
              <img
                src={market.base.icon}
                alt={bSym}
                className="alc-card__icon"
              />
            )}
            {market.quote?.icon && (
              <img
                src={market.quote.icon}
                alt={qSym}
                className="alc-card__icon alc-card__icon--offset"
              />
            )}
          </div>
          <div>
            <p className="alc-card__pair-name">
              {bSym} <span className="alc-card__slash">/</span> {qSym}
            </p>
            <p className="alc-card__source" style={{ color: protocol.color }}>
              {protocol.label}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <a
            href={protocol.explorerUrl(market.address)}
            target="_blank"
            rel="noreferrer"
            className="alc-icon-btn"
            title={`Open on ${protocol.label}`}
          >
            <svg viewBox="0 0 12 12" fill="none" width="12" height="12">
              <path
                d="M2 10L10 2M10 2H5M10 2v5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <button className="alc-icon-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
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
      <div className="alc-card__body">
        {done && hookResult?.signature ? (
          <SuccessScreen
            signature={hookResult.signature}
            positionMint={hookResult?.positionMint}
            onClose={onClose}
          />
        ) : (
          <>
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
              <div className="alc-unsupported">
                <p>
                  Adding liquidity to <strong>{market.source}</strong> is not
                  yet supported.
                </p>
                <a
                  href={protocol.explorerUrl(market.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="alc-btn alc-btn--outline"
                >
                  Open on Explorer →
                </a>
              </div>
            )}

            {(validationError ?? hookError) && (
              <div className="alc-error">{validationError ?? hookError}</div>
            )}
            {busy && (
              <div className="alc-status">
                <span className="alc-status__dot" />
                {STATUS_LABELS[status] ?? status}
              </div>
            )}
            {protocol.canAddLiquidity && (
              <button
                className="alc-btn alc-btn--primary alc-btn--full"
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
                  : "Add Liquidity"}
                {!busy && (
                  <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {busy && <span className="sw-spinner" aria-hidden />}
              </button>
            )}

            <div className="alc-powered">
              Powered by{" "}
              <span className="alc-powered__badge">{protocol.label}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
