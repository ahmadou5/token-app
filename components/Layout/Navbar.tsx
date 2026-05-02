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
      <div className="tg-topbar">
        <div className="tg-topbar__left">
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
          <span className="tg-topbar__brand">Tokens</span>
        </div>

        <div className="tg-topbar__center">
          <SearchTrigger
            onClick={() => setSearchOpen(true)}
            placeholder="Find tokens..."
          />
        </div>
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
        <div className="tg-topbar__right">
          <ThemeToggle />
        </div>
      </div>

      {/* Modal lives at Navbar level — portal-like, covers full viewport */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
