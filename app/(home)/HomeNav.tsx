"use client";

import { useState } from "react";
import Link from "next/link";
import { useConnector, useWallet } from "@solana/connector";
import { ConnectedPill } from "@/components/Swap/ConnectedPill";
import { WalletConnectModal } from "@/components/Swap/modals/WalletConnectModal";

export function HomeNav() {
  const { isConnected } = useWallet();
  const connector = useConnector();
  const [showWalletModal, setShowWalletModal] = useState(false);

  return (
    <>
      {showWalletModal && (
        <WalletConnectModal onClose={() => setShowWalletModal(false)} />
      )}
      <nav className="hp-nav">
        <div className="hp-nav__left">
          <Link href="/" className="hp-nav__logo">
            <svg viewBox="0 0 24 24" fill="none" width="32" height="32" style={{ color: 'var(--tc-accent)' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="hp-nav__logo-text">Check-it</span>
          </Link>
        </div>

        <div className="hp-nav__actions">
          <Link href="/markets" className="hp-nav__link">
            Explore Markets
          </Link>
          {isConnected ? (
            <ConnectedPill onDisconnect={() => connector.disconnect()} />
          ) : (
            <button 
              className="hp-btn-primary" 
              style={{ height: '38px', padding: '0 16px', fontSize: '13px' }}
              onClick={() => setShowWalletModal(true)}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
