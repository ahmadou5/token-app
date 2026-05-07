"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { GearSixIcon, CaretDown, Check, Info } from "@phosphor-icons/react";
import { useWallet, useBalance } from "@solana/connector";
import { useConnector } from "@solana/connector/react";
import {
  useSwapSettings,
  EARN_PROVIDER_META,
  EarnProvider,
} from "@/context/SwapSettingsContext";
import { useVaultQuote } from "@/hooks/useVaultQuote";
import { useEarnExecute } from "@/hooks/useEarnExecute";
import { useEarnPositions } from "@/hooks/useEarnPositions";
import { SettingsModal } from "../Swap/modals/SettingsModal";
import { WalletConnectModal } from "../Swap/modals/WalletConnectModal";

interface EarnVaultProps {
  mint: string | null;
  symbol: string | null;
}

const PROVIDER_ICONS: Record<EarnProvider, string> = {
  kamino: "https://kamino.com/favicon.ico",
  marginfi: "https://app.marginfi.com/favicon.ico",
  drift: "https://app.drift.trade/favicon.ico",
  jupiter: "https://jup.ag/favicon.ico",
};

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function EarnVault({ mint, symbol }: EarnVaultProps) {
  const { isConnected } = useWallet();
  const connector = useConnector();
  const wallet = connector.account;
  const { settings, setEarnProvider } = useSwapSettings();
  const { earnProvider } = settings;
  const providerMeta = EARN_PROVIDER_META[earnProvider];

  const { tokens: walletTokens } = useBalance({ enabled: isConnected });
  const tokenBalance = walletTokens.find((t) => t.mint === mint);
  const balanceUi = tokenBalance?.formatted ?? "0.00";

  const [activeAction, setActiveAction] = useState<"deposit" | "withdraw">(
    "deposit",
  );
  const [amount, setAmount] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [allAPYs, setAllAPYs] = useState<Record<EarnProvider, number | null>>({
    kamino: null,
    marginfi: null,
    drift: null,
    jupiter: null,
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  const { positions, load: loadPositions } = useEarnPositions();

  useEffect(() => {
    if (isConnected && wallet) {
      loadPositions(wallet);
    }
  }, [isConnected, wallet, loadPositions]);

  // Fetch APYs for all providers to show in dropdown
  useEffect(() => {
    async function fetchAllAPYs() {
      if (!symbol) return;
      try {
        const res = await fetch(`/api/yield/quote/all?symbol=${symbol}`);
        if (res.ok) {
          const data = await res.json();
          setAllAPYs(data.apyMap);
        }
      } catch (err) {
        console.error("Error fetching all APYs:", err);
      }
    }
    fetchAllAPYs();
  }, [symbol]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentPosition = useMemo(
    () => positions.find((p) => p.provider === earnProvider && p.mint === mint),
    [positions, earnProvider, mint],
  );

  const currentApy = asFiniteNumber(quote?.apy);
  const fallbackApy = asFiniteNumber(allAPYs[earnProvider]);
  const displayApy = currentApy ?? fallbackApy ?? 0;

  const {
    quote,
    transaction,
    executionAvailable,
    note,
    isLoading: isQuoteLoading,
    error: quoteError,
  } = useVaultQuote({
    provider: earnProvider,
    mint: mint ?? "",
    symbol: symbol ?? "",
    amountUi: amount,
    owner: wallet ?? undefined,
    action: activeAction,
  });

  const {
    execute,
    status: execStatus,
    error: execError,
    reset: resetExec,
  } = useEarnExecute();

  const handleMax = () => {
    if (activeAction === "deposit") {
      setAmount(balanceUi);
    } else if (currentPosition) {
      setAmount(currentPosition.amount.toString());
    }
  };

  const handleAction = async () => {
    if (!transaction) return;
    const sig = await execute(
      transaction,
      activeAction === "deposit" ? `Deposit ${symbol}` : `Withdraw ${symbol}`,
      symbol ?? "",
      amount,
    );
    if (sig) {
      try {
        await fetch("/api/yield/positions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet,
            provider: earnProvider,
            mint: mint ?? "",
            symbol: symbol ?? "",
            action: activeAction,
            amount: parseFloat(amount),
          }),
        });
      } catch {
        // Position persistence is best-effort and should not mask a successful tx.
      }
      setAmount("");
      if (wallet) loadPositions(wallet);
    }
  };

  const isExecuting = ["signing", "sending", "confirming"].includes(execStatus);
  const canSubmit =
    isConnected &&
    !!transaction &&
    executionAvailable &&
    !isExecuting &&
    parseFloat(amount) > 0;

  if (!isConnected) {
    return (
      <>
        {showWalletModal && (
          <WalletConnectModal onClose={() => setShowWalletModal(false)} />
        )}
        <div className="sw-card">
           <div className="sw-tabs">
            <div className="sw-tab sw-tab--active">
              <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              Earn Yield
            </div>
          </div>
          
          <div className="p-5 flex flex-col items-center text-center gap-4">
             <div className="w-12 h-12 rounded-full bg-[var(--tc-accent-bg)] flex items-center justify-center text-[var(--tc-accent)]">
                <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
             </div>
             <div className="flex flex-col gap-1">
                <h4 className="text-[15px] font-bold text-[var(--tc-text-primary)]">Deposit & Earn</h4>
                <p className="text-[12px] text-[var(--tc-text-muted)] leading-relaxed">
                  Earn automated yield on your {symbol} across top Solana protocols like Kamino and Jupiter.
                </p>
             </div>
             <button 
                className="sw-connect-btn w-full mt-2"
                onClick={() => setShowWalletModal(true)}
              >
                Connect Wallet to Start
              </button>
              <div className="flex items-center gap-3 mt-2 opacity-50 grayscale">
                <img src={PROVIDER_ICONS.kamino} className="w-4 h-4 rounded-full" alt="Kamino" />
                <img src={PROVIDER_ICONS.jupiter} className="w-4 h-4 rounded-full" alt="Jupiter" />
                <img src={PROVIDER_ICONS.drift} className="w-4 h-4 rounded-full" alt="Drift" />
              </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          activeTab="earn"
        />
      )}

      <div className="sw-card">
        {/* Header */}
        <div className="sw-tabs">
          <div className="sw-tab sw-tab--active">
            <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            Earn Yield
          </div>
          <div className="flex-1" />
          <button className="sw-gear" onClick={() => setShowSettings(true)}>
            <GearSixIcon size={19} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* APY Display */}
          <div className="sw-earn-card__apy-box">
            <span className="sw-earn-card__apy-label">Estimated APY</span>
            <div className="sw-earn-card__apy-value">
              {isQuoteLoading && !quote ? (
                <span className="animate-pulse opacity-50">...</span>
              ) : (
                `${displayApy.toFixed(2)}%`
              )}
            </div>
            <div className="sw-earn-card__provider-tag">
              <img src={PROVIDER_ICONS[earnProvider]} className="w-3 h-3 rounded-full mr-1" alt={earnProvider} />
              via {providerMeta.label}
            </div>
          </div>

          {/* Action Selector */}
          <div className="flex p-1 bg-[var(--tc-bg-muted)] rounded-xl gap-1">
            <button
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeAction === "deposit" ? "bg-[var(--tc-bg)] text-[var(--tc-text-primary)] shadow-sm" : "text-[var(--tc-text-muted)] hover:text-[var(--tc-text-secondary)]"}`}
              onClick={() => {
                setActiveAction("deposit");
                resetExec();
              }}
            >
              Deposit
            </button>
            {currentPosition && (
              <button
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeAction === "withdraw" ? "bg-[var(--tc-bg)] text-[var(--tc-text-primary)] shadow-sm" : "text-[var(--tc-text-muted)] hover:text-[var(--tc-text-secondary)]"}`}
                onClick={() => {
                  setActiveAction("withdraw");
                  resetExec();
                }}
              >
                Withdraw
              </button>
            )}
          </div>

          {/* Input Area */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-bold text-[var(--tc-text-muted)] uppercase tracking-wider">
                {activeAction === "deposit" ? "Supply" : "Unsupply"} Amount
              </span>
              <button className="text-[10px] font-bold text-[var(--tc-accent)] hover:opacity-80 transition-opacity" onClick={handleMax}>
                MAX: {activeAction === "deposit" ? balanceUi : (currentPosition?.amount ?? 0)}
              </button>
            </div>
            <div className="relative group">
              <input
                type="number"
                placeholder="0.00"
                className="sw-swap-input text-[18px] h-12"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  resetExec();
                }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[var(--tc-text-muted)]">
                {symbol}
              </span>
            </div>
          </div>

          {/* Strategy Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              className={`sw-swap-btn w-full flex items-center justify-between px-4 h-11 ${isDropdownOpen ? "bg-[var(--tc-bg-muted)] ring-1 ring-[var(--tc-border)]" : ""}`}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className="flex items-center gap-2">
                <img src={PROVIDER_ICONS[earnProvider]} className="w-5 h-5 rounded-full" alt={earnProvider} />
                <span className="text-[12px] font-bold text-[var(--tc-text-primary)]">{providerMeta.label}</span>
              </div>
              <CaretDown size={14} className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 right-0 bottom-[calc(100%+8px)] z-50 bg-[var(--tc-bg)] border border-[var(--tc-border)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="p-3 border-b border-[var(--tc-divider)] bg-[var(--tc-surface)]">
                   <h5 className="text-[10px] font-bold text-[var(--tc-text-muted)] uppercase tracking-widest">Yield Strategies</h5>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {(Object.keys(EARN_PROVIDER_META) as EarnProvider[]).map((p) => (
                    <button
                      key={p}
                      className="w-full flex items-center justify-between p-3 hover:bg-[var(--tc-bg-hover)] transition-colors group"
                      onClick={() => {
                        setEarnProvider(p);
                        setIsDropdownOpen(false);
                        resetExec();
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <img src={PROVIDER_ICONS[p]} className="w-6 h-6 rounded-full border border-[var(--tc-border)]" alt={p} />
                        <div className="flex flex-col items-start">
                          <span className="text-[12px] font-bold text-[var(--tc-text-primary)]">
                            {EARN_PROVIDER_META[p].label}
                          </span>
                          <span className="text-[10px] text-[var(--tc-text-muted)]">
                            {EARN_PROVIDER_META[p].description.split(".")[0]}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {allAPYs[p] !== null && (
                          <span className="text-[11px] font-mono font-bold text-[var(--tc-accent-up)]">
                            {(asFiniteNumber(allAPYs[p]) ?? 0).toFixed(2)}%
                          </span>
                        )}
                        {earnProvider === p && <Check size={14} className="text-[var(--tc-accent)]" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stats & Submit */}
          <div className="flex flex-col gap-3">
            {quote && parseFloat(amount) > 0 && !isQuoteLoading && (
              <div className="p-3 rounded-xl bg-[var(--tc-surface)] border border-[var(--tc-border)] flex flex-col gap-2">
                 <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[var(--tc-text-muted)] flex items-center gap-1">
                    Daily Estimate <Info size={12} />
                  </span>
                  <span className="font-bold text-[var(--tc-accent-up)] font-mono">
                    +${(asFiniteNumber(quote.dailyEarningsUsd) ?? 0).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[var(--tc-text-muted)]">Platform Fee</span>
                  <span className="font-bold text-[var(--tc-text-primary)]">{quote.protocolFeePercent}%</span>
                </div>
              </div>
            )}

            {(quoteError || execError) && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-500 flex gap-2">
                <Info size={14} className="shrink-0 mt-0.5" />
                {quoteError ?? execError}
              </div>
            )}
            {!quoteError && !execError && note && parseFloat(amount) > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-500 flex gap-2">
                <Info size={14} className="shrink-0 mt-0.5" />
                {note}
              </div>
            )}

            <button
              className={`sw-swap-btn w-full h-12 text-[14px] ${canSubmit ? "" : "opacity-50 grayscale pointer-events-none"}`}
              disabled={!canSubmit}
              onClick={handleAction}
            >
              {isExecuting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isExecuting
                ? "Processing..."
                : `${activeAction === "deposit" ? "Deposit" : "Withdraw"} ${symbol}`}
            </button>
          </div>
        </div>

        <div className="sw-powered">
          <span>Powered by {providerMeta.label}</span>
        </div>
      </div>
    </>
  );
}
