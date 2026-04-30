"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/connector";
import { useTxModal } from "@/context/TxModalContext";

// ─── Storage key — localStorage so it persists across sessions forever ────────
const STORAGE_KEY = "wallet_connect_toast_shown";

// ─── Main toast component ─────────────────────────────────────────────────────

export function WalletSuccessToast() {
  const { walletModalOpen, dismissWallet } = useTxModal();
  const { account } = useWallet();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  // Animate in when opened
  useEffect(() => {
    if (walletModalOpen) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
    }
  }, [walletModalOpen]);

  if (!walletModalOpen) return null;

  const truncated = account
    ? `${account.slice(0, 4)}…${account.slice(-4)}`
    : "";

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(dismissWallet, 260);
  };

  const navigate = (href: string) => {
    handleDismiss();
    router.push(href);
  };

  return (
    <div
      className={`wsm-toast ${visible ? "wsm-toast--visible" : ""}`}
      role="status"
      aria-live="polite"
    >
      {/* Header row */}
      <div className="wsm-toast__header">
        {/* Animated check icon */}
        <div className="wsm-toast__icon">
          <svg viewBox="0 0 32 32" fill="none" width="20" height="20">
            <circle
              cx="16" cy="16" r="15"
              fill="var(--tc-accent-up-bg)"
              stroke="var(--tc-accent-up)"
              strokeWidth="1.5"
            />
            <path
              d="M9 16l5 5 9-9"
              stroke="var(--tc-accent-up)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="wsm-toast__check-path"
            />
          </svg>
        </div>

        <div className="wsm-toast__title-group">
          <p className="wsm-toast__title">Wallet Connected</p>
          <p className="wsm-toast__addr">{truncated}</p>
        </div>

        <button
          className="wsm-toast__close"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
            <path
              d="M2 2l10 10M12 2L2 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Divider */}
      <div className="wsm-toast__divider" />

      {/* Action buttons */}
      <div className="wsm-toast__actions">
        <button
          className="wsm-toast__action-btn"
          onClick={() => {
            handleDismiss();
            window.dispatchEvent(new CustomEvent("open-portfolio-drawer"));
          }}
        >
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
            <rect x="1" y="4" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.3" />
            <path d="M1 8h14" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          Portfolio
        </button>

        <button
          className="wsm-toast__action-btn"
          onClick={() =>
            navigate("/tokens/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
          }
        >
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          Earn
        </button>

        <button
          className="wsm-toast__action-btn"
          onClick={() => navigate("/validators")}
        >
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Stake
        </button>
      </div>
    </div>
  );
}

// ─── Auto-trigger hook ────────────────────────────────────────────────────────
// Uses localStorage so it truly never shows again — not even after
// disconnect + reconnect or closing the browser.

export function useWalletConnectToast() {
  const { isConnected } = useWallet();
  const { showWalletSuccessModal } = useTxModal();
  const prevConnected = useRef(false);

  useEffect(() => {
    // Only fire on the false → true transition
    if (isConnected && !prevConnected.current) {
      // Check localStorage — if already shown once, never show again
      if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, "1");
        setTimeout(showWalletSuccessModal, 500);
      }
    }
    prevConnected.current = isConnected;
  }, [isConnected, showWalletSuccessModal]);
}