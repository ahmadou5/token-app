"use client";

import { SearchTrigger, SearchModal } from "@/components/SearcModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSearchStore } from "@/store/useSearchStore";
import { useConnector, useWallet } from "@solana/connector";
import Link from "next/link";
import { useState } from "react";
import { ConnectedPill, WalletConnectModal } from "../Swap";

export function Navbar() {
  const { searchOpen, setSearchOpen } = useSearchStore();
  const { isConnected } = useWallet();
  const connector = useConnector();
  const [showWalletModal, setShowWalletModal] = useState(false);

  return (
    <>
      {showWalletModal && (
        <WalletConnectModal onClose={() => setShowWalletModal(false)} />
      )}
      
      <nav className="tg-topbar liquid-glass">
        {/* Left: Logo & Brand */}
        <div className="tg-topbar__left">
          <Link href="/" className="tg-topbar__left" style={{ textDecoration: 'none', color: 'inherit' }}>
            <svg className="tg-topbar__logo" viewBox="0 0 20 20" fill="none">
              <circle
                cx="10"
                cy="10"
                r="8"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M6 10h8M10 6v8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="tg-topbar__brand">Check-it</span>
          </Link>
        </div>

        {/* Center: Search Trigger */}
        <div className="tg-topbar__center" style={{ display: 'flex', justifyContent: 'center' }}>
          <SearchTrigger
            onClick={() => setSearchOpen(true)}
            placeholder="Search tokens..."
          />
        </div>

        {/* Right: Actions */}
        <div className="tg-topbar__right">
          <Link href="/markets" className="hp-nav__link" style={{ marginRight: '8px' }}>
            Explore
          </Link>
          
          <div className="tg-topbar__actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isConnected ? (
              <ConnectedPill onDisconnect={() => connector.disconnect()} />
            ) : (
              <button 
                className="hp-btn-primary" 
                style={{ height: '36px', padding: '0 14px', fontSize: '13px', borderRadius: '40px' }}
                onClick={() => setShowWalletModal(true)}
              >
                Connect
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Modal lives at Navbar level — portal-like, covers full viewport */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
