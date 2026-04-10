"use client";

import { useEffect, useRef, useState } from "react";
import { useConnector } from "@solana/connector/react";

interface ConnectedPillProps {
  onDisconnect: () => void;
}

export function ConnectedPill({ onDisconnect }: ConnectedPillProps) {
  const { selectedAccount, selectedWallet, wallets } = useConnector();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!selectedAccount || !selectedWallet) return null;

  const shortAddr = `${selectedAccount.slice(0, 4)}…${selectedAccount.slice(-4)}`;
  const walletWithIcon = wallets.find(
    (w) => w.wallet.name === selectedWallet.name,
  );
  const icon = walletWithIcon?.wallet.icon || selectedWallet.icon;

  return (
    <div className="sw-connected-pill" ref={ref}>
      <button
        className="sw-connected-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {icon ? (
          <img
            src={icon}
            alt={selectedWallet.name}
            width={18}
            height={18}
            className="sw-connected-trigger__icon"
          />
        ) : (
          <span className="sw-connected-trigger__icon sw-connected-trigger__icon--fallback">
            <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
              <rect
                x="1"
                y="4"
                width="14"
                height="9"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path d="M12 9a1 1 0 110-2 1 1 0 010 2z" fill="currentColor" />
            </svg>
          </span>
        )}
        <span className="sw-connected-trigger__addr">{shortAddr}</span>
        <svg
          viewBox="0 0 10 6"
          fill="none"
          width="8"
          height="8"
          className={`sw-chev ${open ? "sw-chev--open" : ""}`}
        >
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="sw-connected-menu" role="menu">
          <div className="sw-connected-menu__info">
            <span className="sw-connected-menu__wallet">
              {selectedWallet.name}
            </span>
            <span className="sw-connected-menu__addr">{shortAddr}</span>
          </div>
          <div className="sw-connected-menu__divider" />
          <button
            className="sw-connected-menu__disconnect"
            role="menuitem"
            onClick={() => {
              onDisconnect();
              setOpen(false);
            }}
          >
            <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
              <path
                d="M5 7h7M9 4l3 3-3 3M7 2H3a1 1 0 00-1 1v8a1 1 0 001 1h4"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
