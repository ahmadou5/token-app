"use client";

// ConnectedPill — adds "View Portfolio" to the dropdown
// This replaces your existing ConnectedPill component.
// The only change is the addition of the portfolio button in sw-connected-menu.

import { useRef, useState } from "react";
import { useWallet } from "@solana/connector";
import { useConnector } from "@solana/connector/react";
import { usePortfolioDrawer } from "@/context/PortfolioDrawerContext";

interface ConnectedPillProps {
  onDisconnect?: () => void;
}

export function ConnectedPill({ onDisconnect }: ConnectedPillProps) {
  const { account, isConnected } = useWallet();
  const connector = useConnector();
  const { open: openPortfolio } = usePortfolioDrawer();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (!isConnected || !account) return null;

  const truncated = `${account.slice(0, 4)}…${account.slice(-4)}`;

  const handleDisconnect = () => {
    setMenuOpen(false);
    onDisconnect?.();
    connector.disconnect();
  };

  return (
    <div className="sw-connected-pill" ref={ref}>
      <button
        className="sw-connected-trigger"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Wallet menu"
      >
        {/* Wallet icon */}
        <span className="sw-connected-trigger__icon--fallback">
          <svg viewBox="0 0 18 18" fill="none" width="13" height="13">
            <rect x="1" y="5" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M1 9h16" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="13.5" cy="13" r="1" fill="currentColor" />
          </svg>
        </span>
        <span className="sw-connected-trigger__addr">{truncated}</span>
        <svg
          viewBox="0 0 10 10"
          fill="none"
          width="8"
          height="8"
          style={{
            transform: menuOpen ? "rotate(180deg)" : "none",
            transition: "transform 160ms",
            color: "var(--tc-text-muted)",
          }}
        >
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {menuOpen && (
        <>
          {/* Click-away */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 49 }}
            onClick={() => setMenuOpen(false)}
          />
          <div className="sw-connected-menu" style={{ zIndex: 50 }}>
            {/* Wallet info */}
            <div className="sw-connected-menu__info">
              <span className="sw-connected-menu__wallet">Connected</span>
              <span className="sw-connected-menu__addr">{truncated}</span>
            </div>

            {/* ── Portfolio button ── */}
            <button
              className="sw-connected-menu__portfolio"
              onClick={() => {
                setMenuOpen(false);
                openPortfolio();
              }}
            >
              <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                <rect x="1" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.2" />
                <path d="M1 8.5h14" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              View Portfolio
            </button>

            <div className="sw-connected-menu__divider" />

            {/* Disconnect */}
            <button
              className="sw-connected-menu__disconnect"
              onClick={handleDisconnect}
            >
              <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                <path d="M10 8H2M2 8l3-3M2 8l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 5V3a1 1 0 011-1h3a1 1 0 011 1v10a1 1 0 01-1 1H9a1 1 0 01-1-1v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}