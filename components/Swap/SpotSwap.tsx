"use client";

import { GearSixIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { useWallet, useBalance } from "@solana/connector";
import { useConnector } from "@solana/connector/react";
import { useSwapSettings, PROVIDER_META } from "@/context/SwapSettingsContext";
import { useSwapQuote } from "@/hooks/useSwapQuote";
import { useSwapExecute } from "@/hooks/useSwapExecute";
import { GoalModeCard } from "@/components/Strategy/GoalModeCard";

import { TokenLogo } from "./TokenLogo";
import { TokenSelect } from "./TokenSelect";
import { QuoteDetails } from "./QuoteDetails";
import { SettingsModal } from "./modals/SettingsModal";
import { WalletConnectModal } from "./modals/WalletConnectModal";
import { PerpSwap } from "./PerpSwap";
import {
  DEFAULT_INPUT_OPTIONS,
  SOL_MINT,
  USDC_MINT,
  type TokenOption,
} from "./constants";

interface SpotSwapProps {
  outputMint: string;
  outputSymbol?: string;
  outputName: string;
  outputLogo?: string;
}

export function SpotSwap({
  outputMint,
  outputSymbol,
  outputName,
  outputLogo,
}: SpotSwapProps) {
  const { isConnected } = useWallet();
  const connector = useConnector();
  const wallet = connector.account;
  const { settings } = useSwapSettings();
  const { tokens: walletTokens, solBalance } = useBalance({
    enabled: isConnected,
  });

  const [activeTab, setActiveTab] = useState<"spot" | "perp">("spot");
  const [showSettings, setShowSettings] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [inputAmount, setInputAmount] = useState("");
  const [inputToken, setInputToken] = useState<TokenOption>(() => {
    const preferred = DEFAULT_INPUT_OPTIONS.find(
      (t) => t.mint === USDC_MINT && t.mint !== outputMint,
    );
    return (
      preferred ??
      DEFAULT_INPUT_OPTIONS.find((t) => t.mint !== outputMint) ??
      DEFAULT_INPUT_OPTIONS[0]
    );
  });

  const safeInputToken =
    inputToken.mint === outputMint
      ? (DEFAULT_INPUT_OPTIONS.find((t) => t.mint !== outputMint) ??
        DEFAULT_INPUT_OPTIONS[0])
      : inputToken;

  const outputToken: TokenOption = {
    mint: outputMint,
    symbol: outputSymbol ?? outputName.slice(0, 6).toUpperCase(),
    name: outputName,
    logo: outputLogo,
  };

  const {
    quote,
    status: quoteStatus,
    error: quoteError,
  } = useSwapQuote(safeInputToken.mint, outputMint, inputAmount);

  const {
    swap,
    status: swapStatus,
    txSignature,
    error: swapError,
    reset,
  } = useSwapExecute();

  const inputBalance = walletTokens.find((t) => t.mint === safeInputToken.mint);
  const displayBalance =
    safeInputToken.mint === SOL_MINT
      ? (solBalance?.toFixed(4) ?? null)
      : (inputBalance?.formatted ?? null);

  function handleMax() {
    if (!displayBalance) return;
    const val =
      safeInputToken.mint === SOL_MINT
        ? Math.max(0, parseFloat(displayBalance) - 0.01).toFixed(4)
        : displayBalance;
    setInputAmount(val);
  }

  function handleFlip() {
    setInputAmount("");
    reset();
  }

  const handleSwap = useCallback(async () => {
    if (!quote) return;
    await swap(quote);
    if (swapStatus === "success") {
      setTimeout(() => {
        setInputAmount("");
        reset();
      }, 3500);
    }
  }, [quote, swap, swapStatus, reset]);

  const outDecimals =
    outputToken.symbol === "USDC" || outputToken.symbol === "USDT" ? 6 : 9;
  const outputDisplay = quote
    ? (Number(quote.outputAmount) / 10 ** outDecimals)
        .toFixed(6)
        .replace(/\.?0+$/, "")
    : "";

  const isExecuting = ["signing", "sending", "confirming"].includes(swapStatus);
  const canSwap =
    isConnected &&
    quoteStatus === "ready" &&
    !!quote &&
    parseFloat(inputAmount) > 0 &&
    !isExecuting;

  const swapBtnLabel = () => {
    if (swapStatus === "signing") return "Awaiting signature…";
    if (swapStatus === "sending") return "Sending…";
    if (swapStatus === "confirming") return "Confirming…";
    if (quoteStatus === "loading") return "Fetching quote…";
    if (!inputAmount || parseFloat(inputAmount) <= 0) return "Enter an amount";
    if (quoteStatus === "error") return "Retry quote";
    return (
      <>
        Swap {safeInputToken.symbol}
        <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
          <path
            d="M3 8h10M9 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {outputToken.symbol}
      </>
    );
  };

  const walletAddress = wallet ?? null;

  useEffect(() => {
    function onResumeGoalMode() {
      setActiveTab("spot");
      window.setTimeout(() => {
        const goalEl = document.querySelector(".sw-goal");
        if (goalEl instanceof HTMLElement) {
          goalEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 60);
    }

    window.addEventListener("resume-goal-mode", onResumeGoalMode);
    return () => window.removeEventListener("resume-goal-mode", onResumeGoalMode);
  }, []);

  return (
    <>
      {/* Portaled modals */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          activeTab={activeTab}
        />
      )}
      {showWalletModal && (
        <WalletConnectModal onClose={() => setShowWalletModal(false)} />
      )}

      <div className="sw-card">
        {/* ── Tab bar — gear always visible ── */}
        <div className="sw-tabs">
          {(["spot", "perp"] as const).map((tab) => (
            <button
              key={tab}
              className={`sw-tab ${activeTab === tab ? "sw-tab--active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "spot" ? (
                <>
                  <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
                    <path
                      d="M2 10l4-6 3 4 2-3 3 5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Spot
                </>
              ) : (
                <>
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
                  Perp
                </>
              )}
            </button>
          ))}

          {/* Gear — always visible, opens settings for whichever tab is active */}
          <button
            className={`sw-gear ${showSettings ? "sw-gear--active" : ""}`}
            onClick={() => setShowSettings((s) => !s)}
            aria-label="Settings"
          >
            {!showSettings && <span className="sw-gear__dot" aria-hidden />}
            <GearSixIcon size={19} />
          </button>
        </div>

        {/* ── Spot body ── */}
        {activeTab === "spot" && (
          <>
            <div className="sw-input-group">
              <div className="sw-input-hdr">
                <span className="sw-input-lbl">You pay</span>
                {isConnected && displayBalance && (
                  <button className="sw-bal-btn" onClick={handleMax}>
                    Bal: {parseFloat(displayBalance).toFixed(4)}{" "}
                    {safeInputToken.symbol}
                  </button>
                )}
              </div>
              <div className="sw-input-row">
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  className="sw-amount"
                  value={inputAmount}
                  onChange={(e) => {
                    setInputAmount(e.target.value);
                    reset();
                  }}
                />
                <TokenSelect
                  value={safeInputToken}
                  options={DEFAULT_INPUT_OPTIONS}
                  onChange={(t) => {
                    setInputToken(t);
                    reset();
                  }}
                  excludeMint={outputMint}
                />
              </div>
            </div>

            <div className="sw-flip-row">
              <div className="sw-divider" />
              <button
                className="sw-flip"
                onClick={handleFlip}
                aria-label="Reset"
              >
                <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                  <path
                    d="M4 2v12M4 14l-3-3M4 14l3-3M12 14V2M12 2l-3 3M12 2l3 3"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="sw-divider" />
            </div>

            <div className="sw-output-group">
              <div className="sw-input-hdr">
                <span className="sw-input-lbl">You receive</span>
                {quoteStatus === "loading" && (
                  <span className="sw-fetching">Fetching…</span>
                )}
              </div>
              <div className="sw-input-row">
                <span
                  className={`sw-amount sw-amount--out ${!outputDisplay ? "sw-amount--muted" : ""}`}
                >
                  {outputDisplay || "0.00"}
                </span>
                <div className="sw-token-fixed">
                  <TokenLogo
                    logo={outputToken.logo}
                    symbol={outputToken.symbol}
                    size={18}
                  />
                  <span className="sw-token-fixed__sym">
                    {outputToken.symbol}
                  </span>
                </div>
              </div>
            </div>

            {quoteStatus === "ready" && quote && (
              <QuoteDetails
                quote={quote}
                outputToken={outputToken}
                slippage={settings.slippage}
              />
            )}

            {settings.goalModeEnabled && (
              <GoalModeCard
                inputMint={safeInputToken.mint}
                outputMint={outputMint}
                outputSymbol={outputToken.symbol}
                inputAmount={inputAmount}
                quote={quote}
                onExecutePrimarySwap={async () => {
                  if (!quote) return null;
                  return swap(quote);
                }}
              />
            )}

            {(quoteError || swapError) && (
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
                {quoteError ?? swapError}
              </div>
            )}

            {swapStatus === "success" && txSignature && (
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
                Swap confirmed!{" "}
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

            <div className="mt-5">
              {!isConnected ? (
                <button
                  className="sw-connect-btn mt-4"
                  onClick={() => setShowWalletModal(true)}
                >
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
                  Connect Wallet to Swap
                </button>
              ) : (
                <button
                  className={`sw-swap-btn mt-4 ${isExecuting ? "sw-swap-btn--busy" : ""}`}
                  disabled={!canSwap}
                  onClick={handleSwap}
                >
                  {isExecuting && <span className="sw-spinner" aria-hidden />}
                  {swapBtnLabel()}
                </button>
              )}
            </div>

            <div className="sw-powered">
              <span>Powered by {PROVIDER_META[settings.provider].label}</span>
              {PROVIDER_META[settings.provider].badge && (
                <span className="sw-powered__badge">
                  {PROVIDER_META[settings.provider].badge}
                </span>
              )}
            </div>
          </>
        )}

        {/* ── Perp body ── */}
        {activeTab === "perp" && (
          <PerpSwap
            tokenSymbol={outputSymbol}
            tokenName={outputName}
            walletAddress={walletAddress}
            onConnectWallet={() => setShowWalletModal(true)}
          />
        )}
      </div>
    </>
  );
}
