"use client";

import { SearchTrigger, SearchModal } from "@/components/SearcModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AlertBellButton } from "@/components/Alerts/AlertBellButton";
import { AlertCenterModal } from "@/components/Alerts/AlertCenterModal";
import { useSearchStore } from "@/store/useSearchStore";
import { useConnector, useWallet } from "@solana/connector";
import Link from "next/link";
import { useState } from "react";
import { ConnectedPill, WalletConnectModal } from "../Swap";
import Logo from '@/assets/vela.png'
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
          <Link href="/" className="tg-topbar__logo-link">
            <img src={typeof Logo === 'string' ? Logo : (Logo as any).src} alt="VELA" className="h-12 w-12" />
            <span className="tg-topbar__brand tg-desktop-only">VELA</span>
          </Link>
        </div>

        {/* Center: Search Trigger (Desktop only) */}
        <div className="tg-topbar__center tg-desktop-only">
          <SearchTrigger
            onClick={() => setSearchOpen(true)}
            placeholder="Search tokens..."
          />
        </div>

        {/* Right: Actions */}
        <div className="tg-topbar__right">
          <div className="tg-topbar__actions">
            <Link href="/markets" className="hp-nav__link tg-desktop-only">
              Explore
            </Link>
            
            <div className="tg-mobile-only">
              <SearchTrigger onClick={() => setSearchOpen(true)} />
            </div>
            
            {isConnected ? (
              <ConnectedPill onDisconnect={() => connector.disconnect()} />
            ) : (
              <button 
                className="tg-btn-primary tg-nav-btn" 
                onClick={() => setShowWalletModal(true)}
              >
                Connect
              </button>
            )}
            <AlertBellButton />
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Modal lives at Navbar level — portal-like, covers full viewport */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AlertCenterModal />
    </>
  );
}
