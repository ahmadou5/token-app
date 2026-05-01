"use client";

import { useState, useEffect, useMemo } from "react";
import { GearSixIcon } from "@phosphor-icons/react";
import { useWallet, useBalance } from "@solana/connector";
import { useConnector } from "@solana/connector/react";
import {
  useSwapSettings,
  EARN_PROVIDER_META,
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

export function EarnVault({ mint, symbol }: EarnVaultProps) {
  const { isConnected } = useWallet();
  const connector = useConnector();
  const wallet = connector.account;
  const { settings } = useSwapSettings();
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

  const { positions, load: loadPositions } = useEarnPositions();

  useEffect(() => {
    if (isConnected && wallet) {
      loadPositions(wallet);
    }
  }, [isConnected, wallet, loadPositions]);

  const currentPosition = useMemo(
    () => positions.find((p) => p.provider === earnProvider && p.mint === mint),
    [positions, earnProvider, mint],
  );

  const {
    quote,
    transaction,
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
      setAmount("");
      if (wallet) loadPositions(wallet);
    }
  };

  const isExecuting = ["signing", "sending", "confirming"].includes(execStatus);
  const canSubmit =
    isConnected && !!transaction && !isExecuting && parseFloat(amount) > 0;

  if (!isConnected) {
    return (
      <>
        {showWalletModal && (
          <WalletConnectModal onClose={() => setShowWalletModal(false)} />
        )}
        <div className="sw-card sw-earn-card">
          <div className="sw-tabs">
            <div className="sw-tab sw-tab--active">
              <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
                <path
                  d="M7 2v10M2 7h10"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
                <circle
                  cx="7"
                  cy="7"
                  r="2.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
              </svg>
              Earn
            </div>
            <div className="flex-1" />
            <button className="sw-gear" onClick={() => setShowSettings(true)}>
              <GearSixIcon size={19} />
            </button>
          </div>

          <div className="sw-perp-connect">
            <div className="sw-perp-connect__icon">
              <svg viewBox="0 0 48 48" fill="none" width="36" height="36">
                <circle
                  cx="24"
                  cy="24"
                  r="18"
                  stroke="var(--tc-accent)"
                  strokeWidth="2"
                  opacity="0.2"
                />
                <path
                  d="M24 12v24M12 24h24"
                  stroke="var(--tc-accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="sw-perp-connect__title">
              Earn yield on your {symbol}
            </p>
            <p className="sw-perp-connect__sub">
              Deposit your stables into {providerMeta.label} vaults to earn
              automated yield.
            </p>
            <button
              className="sw-connect-btn"
              onClick={() => setShowWalletModal(true)}
            >
              Connect Wallet
            </button>
            <p className="sw-perp-connect__powered">
              Powered by{" "}
              <span className="sw-perp-connect__badge">
                {providerMeta.label}
              </span>
            </p>
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

      <div className="td-card">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--tc-accent-bg)] flex items-center justify-center text-[var(--tc-accent)]">
              <svg viewBox="0 0 14 14" fill="none" width="16" height="16">
                <path
                  d="M7 2v10M2 7h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle
                  cx="7"
                  cy="7"
                  r="2.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <h3 className="text-[15px] font-bold text-[var(--tc-text-primary)]">Earn Yield</h3>
          </div>
          <button className="p-2 rounded-lg hover:bg-[var(--tc-bg-hover)] text-[var(--tc-text-muted)] transition-colors" onClick={() => setShowSettings(true)}>
            <GearSixIcon size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {/* APY Display */}
          <div className="bg-[var(--tc-bg-muted)] border border-[var(--tc-border)] rounded-2xl p-5 flex flex-col items-center gap-1 shadow-sm">
            <span className="text-[11px] font-bold text-[var(--tc-text-muted)] uppercase tracking-wider">Estimated APY</span>
            <div className="text-[36px] font-bold text-[var(--tc-accent-up)] font-mono leading-none py-1">
              {isQuoteLoading ? (
                <span className="animate-pulse opacity-50">...</span>
              ) : (
                `${quote?.apy ?? "0.00"}%`
              )}
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[10px] font-medium text-[var(--tc-text-secondary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--tc-accent)]" />
              via {providerMeta.label}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 p-3 rounded-xl border border-[var(--tc-border)] bg-[var(--tc-surface)]">
              <span className="text-[10px] font-bold text-[var(--tc-text-muted)] uppercase tracking-tight">Your Deposit</span>
              <span className="text-[13px] font-semibold text-[var(--tc-text-primary)] truncate">
                {currentPosition
                  ? `${currentPosition.amount.toLocaleString()} ${symbol}`
                  : "0.00"}
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-xl border border-[var(--tc-border)] bg-[var(--tc-surface)]">
              <span className="text-[10px] font-bold text-[var(--tc-text-muted)] uppercase tracking-tight">Total Earned</span>
              <span className="text-[13px] font-semibold text-[var(--tc-accent-up)]">
                {currentPosition
                  ? `+$${currentPosition.yieldUsd.toFixed(2)}`
                  : "—"}
              </span>
            </div>
          </div>

          {/* Action Area */}
          <div className="flex flex-col gap-3">
            <div className="flex p-1 bg-[var(--tc-bg-muted)] rounded-xl gap-1">
              <button
                className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all ${activeAction === "deposit" ? "bg-[var(--tc-bg)] text-[var(--tc-text-primary)] shadow-sm" : "text-[var(--tc-text-muted)] hover:text-[var(--tc-text-secondary)]"}`}
                onClick={() => {
                  setActiveAction("deposit");
                  resetExec();
                }}
              >
                Deposit
              </button>
              {currentPosition && (
                <button
                  className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all ${activeAction === "withdraw" ? "bg-[var(--tc-bg)] text-[var(--tc-text-primary)] shadow-sm" : "text-[var(--tc-text-muted)] hover:text-[var(--tc-text-secondary)]"}`}
                  onClick={() => {
                    setActiveAction("withdraw");
                    resetExec();
                  }}
                >
                  Withdraw
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[11px] font-bold text-[var(--tc-text-muted)] uppercase tracking-wider">
                  Amount
                </span>
                <button className="text-[11px] font-bold text-[var(--tc-accent)] hover:opacity-80 transition-opacity" onClick={handleMax}>
                  MAX: {activeAction === "deposit" ? balanceUi : (currentPosition?.amount ?? 0)}
                </button>
              </div>
              <div className="relative group">
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full h-12 pl-4 pr-16 rounded-xl bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[16px] font-mono text-[var(--tc-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--tc-accent)] focus:ring-opacity-20 transition-all group-hover:border-[var(--tc-border-hover)]"
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
          </div>

          {/* Quote & Submit */}
          <div className="flex flex-col gap-4">
            {quote && parseFloat(amount) > 0 && !isQuoteLoading && (
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-[var(--tc-accent-bg)] border border-[var(--tc-accent)] border-opacity-10">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[var(--tc-text-secondary)]">Daily Earnings</span>
                  <span className="font-bold text-[var(--tc-accent-up)]">${quote.dailyEarningsUsd.toFixed(4)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[var(--tc-text-secondary)]">Protocol Fee</span>
                  <span className="font-bold text-[var(--tc-text-primary)]">{quote.protocolFeePercent}%</span>
                </div>
              </div>
            )}

            {isQuoteLoading && parseFloat(amount) > 0 && (
              <div className="flex items-center justify-center gap-2 p-3 text-[11px] text-[var(--tc-text-muted)] animate-pulse">
                <div className="w-3 h-3 rounded-full border-2 border-[var(--tc-accent)] border-t-transparent animate-spin" />
                Fetching live quote...
              </div>
            )}

            {(quoteError || execError) && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-[11px] text-red-600 dark:text-red-400 flex gap-2">
                <svg viewBox="0 0 14 14" fill="none" width="14" height="14" className="shrink-0 mt-0.5">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M7 4.5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                {quoteError ?? execError}
              </div>
            )}

            <button
              className={`w-full h-12 rounded-2xl font-bold text-[14px] transition-all flex items-center justify-center gap-2 ${canSubmit ? "bg-[var(--tc-accent)] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5" : "bg-[var(--tc-bg-muted)] text-[var(--tc-text-muted)] cursor-not-allowed"}`}
              disabled={!canSubmit}
              onClick={handleAction}
            >
              {isExecuting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isExecuting
                ? "Processing Transaction..."
                : `${activeAction === "deposit" ? "Deposit" : "Withdraw"} ${symbol}`}
            </button>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--tc-divider)] flex items-center justify-center gap-1.5 opacity-50">
          <span className="text-[9px] font-bold text-[var(--tc-text-muted)] uppercase tracking-widest">Powered by</span>
          <span className="text-[10px] font-bold text-[var(--tc-text-primary)]">{providerMeta.label}</span>
        </div>
      </div>
    </>
  );
}
