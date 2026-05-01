"use client";

import { useEffect, useRef, useState } from "react";
import { useTxModal } from "@/context/TxModalContext";

// ─── Animated checkmark SVG ───────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg viewBox="0 0 28 28" fill="none" width="28" height="28">
      <path
        d="M6 14l6 6 10-10"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="txm-check-path"
      />
    </svg>
  );
}

// ─── Animated X SVG ───────────────────────────────────────────────────────────

function ErrorIcon() {
  return (
    <svg viewBox="0 0 28 28" fill="none" width="28" height="28">
      <path
        d="M8 8l12 12"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="txm-x-path txm-x-path--1"
      />
      <path
        d="M20 8L8 20"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="txm-x-path txm-x-path--2"
      />
    </svg>
  );
}

// ─── Token amount pill ────────────────────────────────────────────────────────

function TokenPill({
  amount,
  symbol,
  logo,
}: {
  amount: string;
  symbol: string;
  logo?: string;
}) {
  return (
    <div className="txm-token-pill">
      {logo ? (
        <img
          src={logo}
          alt={symbol}
          className="txm-token-pill__logo"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span className="txm-token-pill__logo txm-token-pill__logo--fallback">
          {symbol[0]}
        </span>
      )}
      <span className="txm-token-pill__amount">{amount}</span>
      <span className="txm-token-pill__symbol">{symbol}</span>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ onComplete }: { onComplete: () => void }) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    // Trigger animation by forcing reflow then starting
    bar.style.width = "100%";
    bar.style.transition = "none";
    void bar.offsetWidth;
    bar.style.transition = "width 6s linear";
    bar.style.width = "0%";

    const timer = setTimeout(onComplete, 6000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="txm-progress-track">
      <div ref={barRef} className="txm-progress-bar" />
    </div>
  );
}

// ─── Main toast component ─────────────────────────────────────────────────────

export function TxToast() {
  const { txPayload, dismissTx } = useTxModal();
  const [visible, setVisible] = useState(false);

  // Animate in when payload arrives
  useEffect(() => {
    if (txPayload) {
      // Small delay so the element mounts before animating
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
    }
  }, [txPayload]);

  if (!txPayload) return null;

  const isSuccess = txPayload.status === "success";
  const solscanUrl = txPayload.txSignature
    ? `https://solscan.io/tx/${txPayload.txSignature}`
    : null;
  const explorerUrl = txPayload.txSignature
    ? `https://explorer.solana.com/tx/${txPayload.txSignature}`
    : null;

  const handleDismissAnimated = () => {
    setVisible(false);
    setTimeout(dismissTx, 260);
  };

  return (
    <div
      className={`txm-toast ${visible ? "txm-toast--visible" : ""}`}
      role="alert"
      aria-live="polite"
    >
      {/* Icon circle */}
      <div
        className={`txm-toast__icon ${isSuccess ? "txm-toast__icon--success" : "txm-toast__icon--error"}`}
      >
        {isSuccess ? <CheckIcon /> : <ErrorIcon />}
      </div>

      {/* Content */}
      <div className="txm-toast__body">
        <div className="txm-toast__header">
          <div className="txm-toast__title-group">
            <p className="txm-toast__title">{txPayload.action}</p>
            {txPayload.tokenAmount && txPayload.tokenSymbol && (
              <TokenPill
                amount={txPayload.tokenAmount}
                symbol={txPayload.tokenSymbol}
                logo={txPayload.tokenLogo}
              />
            )}
            {!isSuccess && txPayload.errorMessage && (
              <p className="txm-toast__error-msg">{txPayload.errorMessage}</p>
            )}
          </div>
          <button
            className="txm-toast__close"
            onClick={handleDismissAnimated}
            aria-label="Dismiss"
          >
            <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
              <path
                d="M2 2l10 10M12 2L2 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Action buttons */}
        <div className="txm-toast__actions">
          {isSuccess && solscanUrl && (
            <a
              href={solscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="txm-toast__btn"
            >
              View on Solscan
            </a>
          )}

          {isSuccess &&
            txPayload.secondaryCta &&
            (txPayload.secondaryCta.href ? (
              <a href={txPayload.secondaryCta.href} className="txm-toast__btn">
                {txPayload.secondaryCta.label}
              </a>
            ) : (
              <button
                className="txm-toast__btn"
                onClick={() => {
                  txPayload.secondaryCta?.onClick?.();
                  handleDismissAnimated();
                }}
              >
                {txPayload.secondaryCta.label}
              </button>
            ))}

          {/* Default secondary if none provided but we have a signature */}
          {isSuccess && !txPayload.secondaryCta && explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="txm-toast__btn"
            >
              View on Explorer
            </a>
          )}

          {!isSuccess && (
            <>
              {txPayload.onRetry && (
                <button
                  className="txm-toast__btn"
                  onClick={() => {
                    txPayload.onRetry?.();
                    handleDismissAnimated();
                  }}
                >
                  Try Again
                </button>
              )}
              <button
                className="txm-toast__btn"
                onClick={handleDismissAnimated}
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>

      {/* Auto-dismiss progress bar — success only */}
      {isSuccess && <ProgressBar onComplete={handleDismissAnimated} />}
    </div>
  );
}
