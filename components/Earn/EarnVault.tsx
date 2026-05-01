"use client";

import { useState, useEffect, useMemo } from "react";
import { GearSixIcon } from "@phosphor-icons/react";
import { useWallet, useBalance } from "@solana/connector";
import { useConnector } from "@solana/connector/react";
import { useSwapSettings, EARN_PROVIDER_META } from "@/context/SwapSettingsContext";
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

  const [activeAction, setActiveAction] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const { positions, load: loadPositions } = useEarnPositions();
  
  useEffect(() => {
    if (isConnected && wallet) {
      loadPositions(wallet);
    }
  }, [isConnected, wallet, loadPositions]);

  const currentPosition = useMemo(() => 
    positions.find(p => p.provider === earnProvider && p.mint === mint),
  [positions, earnProvider, mint]);

  const { quote, transaction, isLoading: isQuoteLoading, error: quoteError } = useVaultQuote({
    provider: earnProvider,
    mint: mint ?? "",
    symbol: symbol ?? "",
    amountUi: amount,
    owner: wallet ?? undefined,
    action: activeAction,
  });

  const { execute, status: execStatus, error: execError, reset: resetExec } = useEarnExecute();

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
      amount
    );
    if (sig) {
      setAmount("");
      if (wallet) loadPositions(wallet);
    }
  };

  const isExecuting = ["signing", "sending", "confirming"].includes(execStatus);
  const canSubmit = isConnected && !!transaction && !isExecuting && parseFloat(amount) > 0;

  if (!isConnected) {
    return (
      <>
        {showWalletModal && <WalletConnectModal onClose={() => setShowWalletModal(false)} />}
        <div className="sw-card sw-earn-card">
          <div className="sw-tabs">
             <div className="sw-tab sw-tab--active">
                <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" />
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
                <circle cx="24" cy="24" r="18" stroke="var(--tc-accent)" strokeWidth="2" opacity="0.2" />
                <path d="M24 12v24M12 24h24" stroke="var(--tc-accent)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="sw-perp-connect__title">Earn yield on your {symbol}</p>
            <p className="sw-perp-connect__sub">
              Deposit your stables into {providerMeta.label} vaults to earn automated yield.
            </p>
            <button className="sw-connect-btn" onClick={() => setShowWalletModal(true)}>
              Connect Wallet
            </button>
            <p className="sw-perp-connect__powered">
              Powered by <span className="sw-perp-connect__badge">{providerMeta.label}</span>
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} activeTab="earn" />
      )}

      <div className="sw-card sw-earn-card">
        {/* Header */}
        <div className="sw-tabs">
          <div className="sw-tab sw-tab--active">
            <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            Earn
            {providerMeta.badge && (
              <span className="sw-earn-card__provider-badge">{providerMeta.label}</span>
            )}
          </div>
          <div className="flex-1" />
          <button className="sw-gear" onClick={() => setShowSettings(true)}>
            <GearSixIcon size={19} />
          </button>
        </div>

        <div className="sw-earn-card__body">
          {/* APY Display */}
          <div className="sw-earn-card__apy-box">
            <span className="sw-earn-card__apy-label">Current APY</span>
            <div className="sw-earn-card__apy-value">
              {isQuoteLoading ? "—" : `${quote?.apy ?? "0.00"}%`}
            </div>
            <div className="sw-earn-card__provider-tag">via {providerMeta.label}</div>
          </div>

          {/* Stats */}
          <div className="sw-earn-card__stats">
            <div className="sw-earn-card__stat">
              <span className="sw-earn-card__stat-label">Your deposit</span>
              <span className="sw-earn-card__stat-value">
                {currentPosition ? `${currentPosition.amount.toLocaleString()} ${symbol}` : "—"}
              </span>
            </div>
            <div className="sw-earn-card__stat">
              <span className="sw-earn-card__stat-label">Earned so far</span>
              <span className="sw-earn-card__stat-value sw-earn-card__stat-value--yield">
                {currentPosition ? `+$${currentPosition.yieldUsd.toFixed(2)}` : "—"}
              </span>
            </div>
          </div>

          {/* Action Tabs (Small) */}
          <div className="sw-earn-card__actions-tabs">
            <button 
              className={`sw-earn-card__action-tab ${activeAction === "deposit" ? "sw-earn-card__action-tab--active" : ""}`}
              onClick={() => { setActiveAction("deposit"); resetExec(); }}
            >
              Deposit
            </button>
            {currentPosition && (
              <button 
                className={`sw-earn-card__action-tab ${activeAction === "withdraw" ? "sw-earn-card__action-tab--active" : ""}`}
                onClick={() => { setActiveAction("withdraw"); resetExec(); }}
              >
                Withdraw
              </button>
            )}
          </div>

          {/* Input Row */}
          <div className="sw-perp-form__field">
            <div className="sw-perp-form__field-hdr">
              <span className="sw-perp-form__field-label">
                {activeAction === "deposit" ? "Deposit Amount" : "Withdraw Amount"}
              </span>
              <button className="sw-bal-btn" onClick={handleMax}>
                Max: {activeAction === "deposit" ? balanceUi : (currentPosition?.amount ?? 0)}
              </button>
            </div>
            <div className="sw-perp-form__input-row">
              <input
                type="number"
                placeholder="0.00"
                className="sw-perp-form__input"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); resetExec(); }}
              />
              <span className="sw-perp-form__input-token">{symbol}</span>
            </div>
          </div>

          {/* Quote Panel */}
          {quote && parseFloat(amount) > 0 && (
            <div className="sw-perp-quote">
              <div className="sw-perp-quote__row">
                <span>Estimated Daily</span>
                <span className="sw-perp-quote__val">${quote.dailyEarningsUsd.toFixed(4)}</span>
              </div>
              <div className="sw-perp-quote__row">
                <span>Protocol Fee</span>
                <span className="sw-perp-quote__val">{quote.protocolFeePercent}%</span>
              </div>
              <div className="sw-perp-quote__row">
                <span>Transaction Fee</span>
                <span className="sw-perp-quote__val">~0.00001 SOL</span>
              </div>
            </div>
          )}

          {isQuoteLoading && (
            <div className="sw-perp-quote-loading">
              <span className="sw-spinner sw-spinner--dark" aria-hidden />
              <span>Fetching quote…</span>
            </div>
          )}

          {/* Error */}
          {(quoteError || execError) && (
            <div className="sw-error">
               <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                <path d="M7 4.5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              {quoteError ?? execError}
            </div>
          )}

          {/* CTA */}
          <button
            className={`sw-swap-btn mt-4 ${isExecuting ? "sw-swap-btn--busy" : ""}`}
            disabled={!canSubmit}
            onClick={handleAction}
          >
            {isExecuting && <span className="sw-spinner" aria-hidden />}
            {isExecuting ? "Processing..." : `${activeAction === "deposit" ? "Deposit" : "Withdraw"} ${symbol}`}
          </button>
        </div>

        <div className="sw-powered">
          <span>Powered by {providerMeta.label}</span>
        </div>
      </div>
    </>
  );
}
