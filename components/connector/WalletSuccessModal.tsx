"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/connector";
import { useTxModal } from "@/context/TxModalContext";

// ─── Action button ────────────────────────────────────────────────────────────

function ActionBtn({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button className="wsm-action-btn" onClick={onClick}>
      <span className="wsm-action-btn__icon">{icon}</span>
      <span className="wsm-action-btn__text">
        <span className="wsm-action-btn__label">{label}</span>
        <span className="wsm-action-btn__sub">{sub}</span>
      </span>
      <svg viewBox="0 0 14 14" fill="none" width="12" height="12" className="wsm-action-btn__arrow">
        <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WalletSuccessModal() {
  const { walletModalOpen, dismissWallet } = useTxModal();
  const { account } = useWallet();
  const router = useRouter();
  const backdropRef = useRef<HTMLDivElement>(null);

  // Keyboard close
  useEffect(() => {
    if (!walletModalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismissWallet();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [walletModalOpen, dismissWallet]);

  if (!walletModalOpen) return null;

  const truncated = account
    ? `${account.slice(0, 4)}…${account.slice(-4)}`
    : "";

  const navigate = (href: string) => {
    dismissWallet();
    router.push(href);
  };

  return (
    <div
      className="sw-modal-backdrop wsm-backdrop"
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) dismissWallet();
      }}
    >
      <div className="sw-modal wsm-modal" role="dialog" aria-modal="true" aria-label="Wallet connected">
        {/* Header */}
        <div className="wsm-header">
          {/* Animated connect icon */}
          <div className="wsm-icon">
            <svg viewBox="0 0 48 48" fill="none" width="40" height="40">
              <circle cx="24" cy="24" r="22" fill="var(--tc-accent-bg)" stroke="var(--tc-accent)" strokeWidth="1.5" className="wsm-icon__ring" />
              <path
                d="M14 26l7 7 13-13"
                stroke="var(--tc-accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="wsm-icon__check"
              />
            </svg>
          </div>
          <div className="wsm-header__text">
            <p className="wsm-title">Wallet Connected</p>
            <p className="wsm-address">{truncated}</p>
          </div>
          <button className="sw-modal__close" onClick={dismissWallet} aria-label="Close">
            <svg viewBox="0 0 14 14" fill="none" width="13" height="13">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="wsm-divider" />

        {/* Subtitle */}
        <p className="wsm-subtitle">What would you like to do?</p>

        {/* Actions */}
        <div className="wsm-actions">
          <ActionBtn
            icon={
              <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <rect x="2" y="5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
                <path d="M2 9h16" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="6" cy="13" r="1" fill="currentColor" />
              </svg>
            }
            label="View Portfolio"
            sub="Balances, positions & yield"
            onClick={() => {
              // Portfolio drawer — dispatch custom event, PortfolioDrawer listens
              dismissWallet();
              window.dispatchEvent(new CustomEvent("open-portfolio-drawer"));
            }}
          />
          <ActionBtn
            icon={
              <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            }
            label="Earn Yield"
            sub="Deposit stables, earn APY"
            onClick={() =>
              navigate(
                "/tokens/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
              )
            }
          />
          <ActionBtn
            icon={
              <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <path d="M10 2v16M2 10h16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <rect x="4" y="6" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            }
            label="Trade Perps"
            sub="Long & short with leverage"
            onClick={() =>
              navigate(
                "/tokens/So11111111111111111111111111111111111111112",
              )
            }
          />
          <ActionBtn
            icon={
              <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            }
            label="Stake SOL"
            sub="Earn ~7% APY with validators"
            onClick={() => navigate("/validators")}
          />
        </div>

        {/* Maybe later */}
        <button className="wsm-later" onClick={dismissWallet}>
          Maybe later
        </button>
      </div>
    </div>
  );
}

// ─── Auto-trigger on wallet connect ──────────────────────────────────────────
// Drop this hook in layout.tsx or a client wrapper that has access to both
// useWallet and useTxModal.

export function useWalletConnectModal() {
  const { isConnected, account } = useWallet();
  const { showWalletSuccessModal } = useTxModal();
  const prevConnected = useRef(false);

  useEffect(() => {
    if (isConnected && !prevConnected.current && account) {
      // Only show once per session per wallet
      const key = `wallet_connect_shown_${account}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        // Small delay so the wallet adapter UI settles first
        setTimeout(showWalletSuccessModal, 600);
      }
    }
    prevConnected.current = isConnected;
  }, [isConnected, account, showWalletSuccessModal]);
}